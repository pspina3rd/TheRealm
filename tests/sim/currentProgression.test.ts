import { writeFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { BOARD_SPELLS } from '../../src/battle/magicCasting';
import type { LessonChallenge } from '../../src/battle/lesson';
import type { BoardElement } from '../../src/core/boardMagic';
import { CLASSES } from '../../src/data/classes';
import { MAPS } from '../../src/data/maps';
import { MENTORS } from '../../src/data/mentors';
import {
  commitBattleTry,
  describeInteraction,
  reply,
  resolveBattle,
} from '../../src/game/encounter';
import { flowFor } from '../../src/game/encounterFlow';
import { gainXp, learnSpell } from '../../src/game/hero';
import { lessonSpec, prepareLesson } from '../../src/game/lessons';
import { newGame } from '../../src/world/state';
import { mentorEntities, mentorPlace } from '../../src/world/mentors';
import { enterMap, investEarnedPoints, progressionBattle, runCampaign } from './progression';
import { simulateBattle } from './simulate';

describe('current production progression rules', () => {
  it('selects a first-school preference without teaching another available school or opening its gate', () => {
    const result = runCampaign({ firstSchool: 'fire', route: ['grove'], battleLimitMs: 1 });
    expect(result.state.hero.spells).toEqual({});
    expect(result.state.flags.has('ridgeCleared')).toBe(false);
    expect(result.trace.some((entry) => entry.entityId.startsWith('mentor:'))).toBe(false);
  });
  it('matches combat, lesson and fixed-puzzle rollout settings', () => {
    const state = newGame('mage');
    state.flags.add('boardMagicEnabled');
    state.mapId = 'grove';
    const combat = progressionBattle(state, { kind: 'combat', enemyId: 'shroom' }, 11);
    expect(combat.board.magicEnabled).toBe(true);
    expect(combat.autoCastingEnabled).toBe(true);
    expect(combat.rule).not.toBeNull();
    const lesson = progressionBattle(
      state,
      {
        kind: 'lesson',
        mentorId: 'hazel',
        spellId: 'natureConvert',
        enemyId: 'mossWisp',
        difficulty: 1,
      },
      11,
    );
    expect(lesson.board.magicEnabled).toBe(true);
    expect(lesson.autoCastingEnabled).toBe(false);
    const puzzle = progressionBattle(
      state,
      { kind: 'puzzle', rows: ['....######'], queue: ['I'], linesToClear: 1 },
      11,
    );
    expect(puzzle.board.magicEnabled).toBe(false);
    expect(puzzle.autoCastingEnabled).toBe(false);
    expect(state.hero.spells).toEqual({});
  });

  it('invests in the actual chosen school instead of the class default and permits uneven plans', () => {
    const { hero } = newGame('knight');
    // This isolated spending test supplies known-school/earned-XP fixtures;
    // the opt-in sample below earns them from actual lesson/combat results.
    learnSpell(hero, 'fire');
    learnSpell(hero, 'blizzard');
    for (let i = 0; i < 4; i++) gainXp(hero, hero.nextXp);
    const before = hero.skillPoints;
    const spent = investEarnedPoints(hero, {
      spellPriority: ['unknown', 'blizzard'],
      statPriority: ['vitality'],
    });
    expect(spent + hero.skillPoints).toBe(before);
    expect(hero.spells.quake).toBeUndefined();
    expect(hero.spells.unknown).toBeUndefined();
    expect(Object.values(hero.spells.fire!.step)).toEqual([0, 0, 0]);
    expect(Object.values(hero.spells.blizzard!.step).some((n) => n > 0)).toBe(true);
    expect(hero.spells.blizzard!.level).toBe(1);
    expect(hero.stats.vitality).toBeGreaterThan(2);
    expect(hero.stats.strength).toBe(0);
    const other = newGame('knight').hero;
    learnSpell(other, 'fire');
    gainXp(other, other.nextXp);
    investEarnedPoints(other);
    expect(Object.values(other.spells.fire!.step).some((n) => n > 0)).toBe(true);
    expect(other.spells.quake).toBeUndefined();
  });
});

describe('paced current-rules simulator', () => {
  it('awaits automatic frames without sending piece input during animation', () => {
    const state = newGame();
    learnSpell(state.hero, 'fire');
    const battle = progressionBattle(state, { kind: 'combat', enemyId: 'slime' }, 7);
    // Lifecycle fixture only; resource-acquisition evidence is the separate matrix.
    state.hero.mana.fire = 12;
    battle.board.loadRows(['....r.....', '....rrrrrr']);
    battle.board.replaceActive('I', { x: 0 });
    battle.input('hardDrop');
    expect(battle.autoCastingBusy).toBe(true);
    const input = vi.spyOn(battle, 'input');
    // Main pacing: 500 ms target + 900 ms effect + 500 ms result.
    const result = simulateBattle(battle, 'spammer', 1500, 1900);
    expect(input).not.toHaveBeenCalled();
    expect(battle.autoCastingBusy).toBe(false);
    expect(result.ms).toBe(1900);
    expect(battle.autoCastCount).toBe(1);
  });
});

/** Map crossings are real unlocked warps; intermediate road encounters are omitted. */
function firstSchoolSample(
  classId: string,
  school: BoardElement,
  pace: number,
  diagnostics: unknown[],
) {
  const state = newGame(classId);
  state.flags.add('boardMagicEnabled');
  const rows: string[] = [];
  const gate = (mapId: string, npcId: string, flag: string): boolean => {
    if (!enterMap(state, mapId)) return false;
    const entity = MAPS[mapId]!.entities.find((e) => e.kind === 'npc' && e.npcId === npcId)!;
    for (let attempt = 0; attempt < 2 && !state.flags.has(flag); attempt++) {
      const offer = describeInteraction(state, entity);
      if (offer.kind !== 'challenge' || offer.canAccept === false) {
        rows.push(
          `| ${classId} | ${school} | ${pace} | gate ${npcId} | not-offered:${offer.kind} | 0 | ${state.hero.level} | 0 | ${state.hero.gil} | none |`,
        );
        return false;
      }
      if (offer.replies) reply(state, offer.replies, 'accept');
      const battle = progressionBattle(state, offer.spec, 401 + attempt);
      if (flowFor(offer.spec)) {
        while (battle.demoPlaying) battle.update(50);
        if (!commitBattleTry(state, battle)) return false;
        battle.input('left');
      }
      const result = simulateBattle(battle, 'spammer', pace, 90_000, { challengeAware: true });
      if (battle.status !== 'ongoing' && !battle.autoCastingBusy)
        resolveBattle(state, entity, battle, battle.rng, offer.terms);
      expect(state.hero.spells).toEqual({});
      rows.push(
        `| ${classId} | ${school} | ${pace} | gate ${npcId} try ${attempt + 1} | ${result.stopReason} | ${(result.ms / 1000).toFixed(1)} | ${state.hero.level} | 0 | ${state.hero.gil} | none |`,
      );
      if (result.stopReason === 'timeout') break;
    }
    return state.flags.has(flag);
  };
  // Earn prerequisite gates without acquiring any other school.
  if (['fire', 'wind', 'lightning'].includes(school)) {
    const ridge = gate('quarry', 'foreman', 'ridgeCleared');
    if (ridge && school !== 'fire') gate('forge', 'apprentice', 'peakGate');
  }
  const initialGil = state.hero.gil;
  const levelBeforeLesson = state.hero.level;
  const pointsBeforeLesson = state.hero.skillPoints;
  const mentor = Object.values(MENTORS).find((m) => m.element === school)!;
  const stop = mentorPlace(mentor, state);
  if (!enterMap(state, stop.map)) {
    rows.push(
      `| ${classId} | ${school} | ${pace} | mentor access | blocked | 0 | 1 | 0 | ${state.hero.gil} | none |`,
    );
    return rows;
  }
  const entity = mentorEntities(state).find((m) => m.mentorId === mentor.id)!;
  const offer = describeInteraction(state, entity);
  const id = Object.entries(BOARD_SPELLS).find(([, element]) => element === school)![0];
  const lesson = offer.kind === 'lessons' ? offer.lessons.find((l) => l.spellId === id) : undefined;
  expect(lesson, `${school} must be an actual offered first school`).toBeDefined();
  prepareLesson(state.hero);
  const beforeLesson = structuredClone(state);
  const spec = lessonSpec(state, mentor.id, lesson!);
  const battle = progressionBattle(state, spec, 7919);
  if (flowFor(spec)) {
    while (battle.demoPlaying) battle.update(50);
    expect(commitBattleTry(state, battle)).toBe(true);
    battle.input('left');
  }
  // Greedy one-piece lookahead bounds runtime; it is a defined bot, not a human.
  const trace: unknown[] = [];
  let elapsed = 0;
  let nextEvent = 0;
  let maxMana = 0;
  const counts: Record<string, number> = {};
  const capture = () => {
    maxMana = Math.max(maxMana, state.hero.mana[school]);
    for (const { seq, event } of battle.eventsSince(nextEvent)) {
      nextEvent = seq + 1;
      counts[event.kind] = (counts[event.kind] ?? 0) + 1;
      if (['shield', 'spell', 'heroHit', 'overflow', 'enemyMove', 'drain'].includes(event.kind))
        trace.push({
          ms: elapsed,
          event,
          hp: state.hero.hp,
          mana: state.hero.mana[school],
          enemyHp: battle.combat!.enemyHp,
        });
    }
  };
  const originalUpdate = battle.update.bind(battle);
  const updateSpy = ['wind', 'lightning'].includes(school)
    ? vi.spyOn(battle, 'update').mockImplementation((dt) => {
        capture();
        originalUpdate(dt);
        elapsed += dt;
        capture();
      })
    : undefined;
  const result = simulateBattle(battle, 'spammer', pace, 90_000);
  if (updateSpy) {
    capture();
    updateSpy.mockRestore();
    const challenge = battle.combat as LessonChallenge;
    const validTargets = [];
    for (let row = battle.board.height - 1; row >= 0; row--)
      for (const direction of school === 'wind' ? ([-1, 1] as const) : ([1] as const)) {
        const preview = battle.magicCasting.preview(id, { bottomRow: row, direction });
        if (!preview.reason && preview.resolution.changed) validTargets.push({ row, direction });
      }
    diagnostics.push({
      classId,
      school,
      outcome: result.stopReason,
      ms: result.ms,
      pieces: result.pieces,
      heroHp: state.hero.hp,
      maxHp: state.hero.maxHp,
      enemyId: challenge.enemy.id,
      enemyHp: challenge.enemyHp,
      shield: challenge.shield,
      finalMana: state.hero.mana[school],
      maxMana,
      cannotCastReason: challenge.cannotCastReason(id),
      validTargets,
      counts,
      trace,
    });
  }
  if (battle.status !== 'ongoing' && !battle.autoCastingBusy)
    resolveBattle(state, entity, battle, battle.rng);
  expect(state.hero.gil).toBe(initialGil);
  expect(state.hero.level).toBe(levelBeforeLesson);
  expect(state.hero.skillPoints).toBe(pointsBeforeLesson);
  expect(Object.keys(state.hero.spells)).toEqual(result.won ? [id] : []);
  rows.push(
    `| ${classId} | ${school} | ${pace} | lesson | ${result.stopReason} | ${(result.ms / 1000).toFixed(1)} | ${state.hero.level} | 0 | ${state.hero.gil} | ${Object.keys(state.hero.spells).join(',') || 'none'} |`,
  );
  if (!result.won && school === 'lightning' && process.env.CURRENT_RECOVERY) {
    const recoveryState = structuredClone(beforeLesson);
    const recovery = progressionBattle(recoveryState, spec, 7919);
    const herbsBefore = recoveryState.hero.items.herb ?? 0;
    const maxHerbs = Number(process.env.CURRENT_RECOVERY_MAX_HERBS ?? 1);
    if (![1, 2].includes(maxHerbs))
      throw new Error('Recovery comparison permits one or two carried Herbs');
    let herbsUsed = 0;
    const originalInput = recovery.input.bind(recovery);
    const inputSpy = vi.spyOn(recovery, 'input').mockImplementation((action) => {
      if (
        herbsUsed < maxHerbs &&
        recoveryState.hero.hp < recoveryState.hero.maxHp * 0.35 &&
        recovery.combat!.cannotUseItemReason('herb') === null
      ) {
        recovery.combat!.useItem('herb');
        herbsUsed++;
      }
      originalInput(action);
    });
    const recovered = simulateBattle(recovery, 'spammer', pace, 90_000);
    inputSpy.mockRestore();
    if (recovery.status !== 'ongoing' && !recovery.autoCastingBusy)
      resolveBattle(recoveryState, entity, recovery, recovery.rng);
    expect(herbsBefore - (recoveryState.hero.items.herb ?? 0)).toBe(herbsUsed);
    expect(Object.keys(recoveryState.hero.spells)).toEqual(recovered.won ? [id] : []);
    diagnostics.push({
      comparison: `same greedy bot with at most ${maxHerbs} carried Herbs below 35% HP, checked before piece input`,
      classId,
      school,
      outcome: recovered.stopReason,
      ms: recovered.ms,
      pieces: recovered.pieces,
      herbsUsed,
      herbsBefore,
      herbsAfter: recoveryState.hero.items.herb ?? 0,
      enemyHp: recovery.combat!.enemyHp,
      shield: (recovery.combat as LessonChallenge).shield,
      spellLearned: recoveryState.hero.spells[id]?.level ?? 0,
    });
  }
  if (!result.won) return rows;
  expect(enterMap(state, 'overworld')).toBe(true);
  // Three slimes and a shroom total 46 authored XP; level 2 costs 44.
  // Distinct placed encounters only: no repeated rewards or fixture XP.
  const slimes = MAPS.overworld!.entities.filter(
    (e) => e.kind === 'monster' && ['slime', 'shroom'].includes(e.enemyId),
  ).slice(0, 4);
  for (const [index, slime] of slimes.entries()) {
    if (slime.kind !== 'monster') throw new Error('Expected a slime');
    const fight = progressionBattle(
      state,
      { kind: 'combat', enemyId: slime.enemyId },
      7920 + index,
    );
    const outcome = simulateBattle(fight, 'spammer', pace, 90_000);
    if (fight.status !== 'ongoing' && !fight.autoCastingBusy)
      resolveBattle(state, slime, fight, fight.rng);
    const spent = investEarnedPoints(state.hero, {
      spellPriority: [id],
      statPriority: ['vitality'],
    });
    expect(state.hero.skillPoints).toBeGreaterThanOrEqual(0);
    expect(Object.keys(state.hero.spells)).toEqual([id]);
    if (outcome.stopReason !== 'timeout')
      expect(fight.autoCastingBusy, 'terminal cast frames must finish before resolution').toBe(
        false,
      );
    rows.push(
      `| ${classId} | ${school} | ${pace} | ${slime.enemyId} ${index + 1} (${fight.autoCastCount} auto casts) | ${outcome.stopReason} | ${(outcome.ms / 1000).toFixed(1)} | ${state.hero.level} | ${spent} | ${state.hero.gil} | ${id}:${state.hero.spells[id]!.level} (${Object.values(state.hero.spells[id]!.step).join('/')}) |`,
    );
    if (!outcome.won) break;
  }
  return rows;
}

describe.skipIf(!process.env.CURRENT_PROGRESSION)('bounded chosen-school/class sample', () => {
  it('earns each first school and records subsequent carried-resource combat honestly', () => {
    const diagnostics: unknown[] = [];
    const schools: readonly BoardElement[] = [
      'fire',
      'water',
      'earth',
      'wind',
      'lightning',
      'nature',
    ];
    const lines = [
      '# Bounded current-rules sample',
      '',
      'Seed 7919 for lessons, 7920–7923 for three distinct slimes and a shroom. 1500ms pace, 90-second reporting cap.',
      'Greedy one-piece bot; no fixture XP/gil/gear/spells/healing. Starting items are carried and not used.',
      'No intermediate road encounters. Foreman/Cinda prerequisite gates use at most two genuine zero-spell tries; unresolved access is reported, no gate flags granted.',
      '',
      '| Class | School | Pace | Stage | Outcome | Seconds | Level | SP spent | Gil | Spell (rank; power/efficiency/effect) |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ];
    const classIds = Object.keys(CLASSES).filter(
      (id) => !process.env.CURRENT_CLASSES || process.env.CURRENT_CLASSES.split(',').includes(id),
    );
    const chosenSchools = schools.filter(
      (school) =>
        !process.env.CURRENT_SCHOOLS || process.env.CURRENT_SCHOOLS.split(',').includes(school),
    );
    if (!classIds.length || !chosenSchools.length)
      throw new Error('Current progression filters must select existing classes and schools');
    for (const classId of classIds)
      for (const school of chosenSchools)
        lines.push(...firstSchoolSample(classId, school, 1500, diagnostics));
    const report = lines.join('\n') + '\n';
    process.stderr.write(report);
    if (process.env.CURRENT_PROGRESSION_OUT) {
      writeFileSync(process.env.CURRENT_PROGRESSION_OUT, report);
      writeFileSync(
        `${process.env.CURRENT_PROGRESSION_OUT}.diagnostics.json`,
        JSON.stringify(diagnostics, null, 2),
      );
    }
  }, 120_000);
});
