/** Native presentation consumes the same sprites and event-to-feedback mapping as web. */
import type { Battle } from '../battle/battle';
import { LessonChallenge } from '../battle/lesson';
import { heroClass } from '../game/hero';
import { seesEnemyMove } from '../game/stats';
import { NPCS } from '../data/npcs';
import { MENTORS } from '../data/mentors';
import { ENCOUNTER_DEFS } from '../data/encounters';
import { battleFrame, mapFrame, isCreatureId } from '../ui/art/creatures';
import { IMAGES, type Region } from '../ui/art/images';
import { feedbackFor } from '../ui/art/feedback';
import { effectFrame, effectDuration } from '../ui/art/vfx';
import { MOVE_ICONS, SPELL_KIND_ICONS, ELEMENT_ICONS } from '../ui/art/icons';

let serial = 0;
const clocks = new WeakMap<Battle, { id: string; ms: number; events: Map<number, number> }>();
function clock(battle: Battle) {
  let value = clocks.get(battle);
  if (!value) {
    value = { id: `native-battle-${++serial}`, ms: 0, events: new Map() };
    clocks.set(battle, value);
  }
  return value;
}
export function advanceNativePresentation(battle: Battle, ms: number): void {
  if (!battle.paused) clock(battle).ms += ms;
}
function regionSprite(region: Region | null) {
  return region
    ? { source: IMAGES[region.image].src, sx: region.x, sy: region.y, sw: region.w, sh: region.h }
    : null;
}
export function nativePresentation(battle: Battle) {
  const time = clock(battle);
  for (const { seq } of battle.events) if (!time.events.has(seq)) time.events.set(seq, time.ms);
  const feedback = battle.events.slice(-24).flatMap(({ seq, event }) => {
    const elapsedMs = time.ms - (time.events.get(seq) ?? time.ms);
    return feedbackFor(event).flatMap((item, index) => {
      if (
        battle.autoCastingEnabled &&
        ['lines', 'surge', 'autoSpell'].includes(event.kind) &&
        (item.kind === 'flashRows' ||
          item.kind === 'flashCells' ||
          ('target' in item && item.target === 'board'))
      )
        return [];
      const beatText =
        item.kind === 'beat' && battle.spec.kind === 'encounter'
          ? ENCOUNTER_DEFS[battle.spec.id]?.lines[item.beat]
          : undefined;
      const durationMs =
        item.kind === 'vfx'
          ? effectDuration(item.effect)
          : item.kind === 'banner' || item.kind === 'beat'
            ? 1300
            : item.kind === 'face'
              ? 1200
              : item.kind === 'defeat'
                ? 700
                : item.kind === 'toss'
                  ? 400
                  : item.kind === 'rush'
                    ? 320
                    : item.kind === 'icon'
                      ? item.target === 'board'
                        ? 900
                        : 800
                      : item.kind === 'flashRows'
                        ? 380
                        : item.kind === 'shake'
                          ? 320
                          : 1000;
      if (elapsedMs > durationMs) return [];
      const sprite = item.kind === 'vfx' ? regionSprite(effectFrame(item.effect, elapsedMs)) : null;
      const icon =
        'icon' in item
          ? item.icon
          : item.kind === 'face'
            ? ({ cheer: 'faceDevoted', wince: 'faceWary', alarm: 'faceHostile' } as const)[
                item.face
              ]
            : item.kind === 'toss'
              ? ELEMENT_ICONS[item.element]
              : undefined;
      return [
        {
          ...item,
          ...(beatText ? { text: beatText } : {}),
          id: seq * 100 + index,
          elapsedMs,
          durationMs,
          sprite,
          ...(icon ? { icon } : {}),
        },
      ];
    });
  });
  const combat = battle.combat;
  const lesson = battle.challenge instanceof LessonChallenge ? battle.challenge : null;
  const npc = battle.spec.kind === 'encounter' ? NPCS[battle.spec.id] : null;
  const opponent = combat?.enemy.sprite ?? npc?.sprite;
  const ally = lesson?.mentor ?? (battle.assist ? MENTORS[battle.assist.mentorId] : null);
  const statuses: { target: string; icon: string; count: number; name?: string; badge?: string }[] =
    [];
  if (combat) {
    for (const [kind, count, target] of [
      ['burn', combat.burn.pieces, 'enemy'],
      ['expose', combat.exposed, 'enemy'],
      ['mist', combat.mist, 'enemy'],
      ['regen', combat.regen.pieces, 'hero'],
      ['charge', combat.charge.clears, 'hero'],
    ] as const)
      if (count > 0) {
        const spec = SPELL_KIND_ICONS[kind];
        statuses.push({
          target,
          icon: spec.icon,
          count,
          name: kind,
          ...(spec.badge ? { badge: spec.badge } : {}),
        });
      }
    if (combat.ward > 0)
      statuses.push({ target: 'hero', icon: 'ward', count: combat.ward, name: 'Ward' });
  }
  const heroSprite = heroClass(battle.hero).sprite;
  return {
    battleID: time.id,
    visualTimeMs: time.ms,
    feedback,
    stage: {
      hero: isCreatureId(heroSprite)
        ? regionSprite(mapFrame(heroSprite, 'up', false, time.ms))
        : null,
      opponent:
        opponent && isCreatureId(opponent) ? regionSprite(battleFrame(opponent, time.ms)) : null,
      ally:
        ally && isCreatureId(ally.sprite)
          ? regionSprite(mapFrame(ally.sprite, 'up', false, time.ms))
          : null,
      enemyActionMs: combat?.actMs ?? 0,
      weakness: combat ? combat.weaknesses() : [],
      resistance: combat ? combat.resistances() : [],
      showMove: seesEnemyMove(battle.hero.stats.insight),
      moveIcon: combat ? MOVE_ICONS[combat.nextMove.kind].icon : null,
      shieldElement: lesson?.shield === 'up' ? lesson.shieldElement : null,
      tint: lesson?.mentor.element ?? null,
      allyElement: ally?.element ?? null,
      statuses,
      feedback,
    },
  };
}
