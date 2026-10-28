/** Bounded diagnostic: paid fixture resources, genuinely won mentor lessons. */
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Battle } from '../../src/battle/battle';
import { createRng } from '../../src/core/rng';
import { CAMPAIGN_ENEMIES } from '../../src/data/campaignEnemies';
import { CAMPAIGN_SHOPS } from '../../src/data/campaignShops';
import { CLASSES } from '../../src/data/classes';
import { ITEMS } from '../../src/data/items';
import { MAPS } from '../../src/data/maps';
import { MENTORS } from '../../src/data/mentors';
import { SPELLS } from '../../src/data/spells';
import { resolveBattle } from '../../src/game/encounter';
import { gainXp, totalDefense } from '../../src/game/hero';
import { lessonsFor, lessonSpec, prepareLesson } from '../../src/game/lessons';
import { dualChance, pieceWeights } from '../../src/game/pieceOdds';
import { buy, priceFor } from '../../src/game/shop';
import { mentorPlace } from '../../src/world/mentors';
import { newGame } from '../../src/world/state';
import { investEarnedPoints } from './progression';
import { simulateBattle } from './simulate';

const enemies = ['lishal', 'malificat'] as const;
const paces = [1500, 2200] as const;

function fixture(enemyId: (typeof enemies)[number], classId: string, trained: boolean) {
  const enemy = CAMPAIGN_ENEMIES[enemyId]!;
  const state = newGame(classId);
  let fixtureXp = 0;
  while (state.hero.level < enemy.level) {
    fixtureXp += state.hero.nextXp;
    gainXp(state.hero, state.hero.nextXp);
  }
  const earned = state.hero.skillPoints;
  const spent = investEarnedPoints(state.hero);
  state.hero.gil = 600;
  let paid = 0;
  const purchase = (id: string) => {
    expect(CAMPAIGN_SHOPS.bellSupplies!.stock).toContain(id);
    paid += priceFor(ITEMS[id]!, 1);
    buy(state, id, 1);
  };
  purchase('flameBrand');
  purchase('forgePlate');
  const lessons: string[] = [];
  if (trained) {
    const primary = CLASSES[classId]!.spell;
    const weakness = enemyId === 'lishal' ? 'thunder' : 'fire';
    const targets = [primary, ...(primary === weakness ? [] : [weakness]), 'regen'];
    for (const [index, spellId] of targets.entries()) {
      const mentor = Object.values(MENTORS).find((m) => m.element === SPELLS[spellId]!.category)!;
      const stop = mentorPlace(mentor, state);
      // Independent fixture positioning only: does not establish a traversable route.
      state.mapId = stop.map;
      state.x = stop.x - 1;
      state.y = stop.y;
      const lesson = lessonsFor(state, mentor).find((candidate) => candidate.spellId === spellId);
      expect(lesson, `${classId}: ${spellId} must actually be offered`).toBeDefined();
      prepareLesson(state.hero);
      const battle = new Battle(
        lessonSpec(state, mentor.id, lesson!),
        state.hero,
        createRng(7919 + index),
        {
          weights: pieceWeights(MAPS[state.mapId]!, state.hero),
          dualChance: dualChance(state.hero),
        },
      );
      // No fixture consumables have been purchased; lessons use existing mana.
      const result = simulateBattle(battle, 'good', 1500, 600_000);
      lessons.push(
        `${spellId}:${lesson!.level}:${result.stopReason}:${(result.ms / 1000).toFixed(1)}s`,
      );
      if (battle.status !== 'ongoing') {
        resolveBattle(
          state,
          { id: `mentor:${mentor.id}`, kind: 'mentor', mentorId: mentor.id, x: stop.x, y: stop.y },
          battle,
          battle.rng,
        );
      }
      expect(result.won, lessons.join(', ')).toBe(true);
    }
  }
  for (const id of ['herb', 'herb', 'ether', 'innRest']) purchase(id);
  expect(spent + state.hero.skillPoints).toBe(earned);
  expect(state.hero.gil).toBe(600 - paid);
  expect(paid).toBe(524);
  expect(state.hero.items.herb).toBe(4);
  expect(state.hero.items.ether).toBe(2);
  return { state, spent, paid, fixtureXp, lessons };
}

describe.skipIf(!process.env.CAMPAIGN_PREPARED)('bounded mentor-prepared diagnostic', () => {
  it('compares baseline and genuine lesson preparation without asserting a balance band', () => {
    const snapshots: string[] = [];
    const lines = [
      '# Bounded mentor-prepared diagnostic results',
      '',
      'Seed 7919. Independent authored-level fixtures; 600 gil funding, 524 spent, production earned points.',
      '600-second cap means timeout/censored, never loss. Lesson policy: good bot, 1500ms, no purchased supplies.',
      '',
      '| Enemy | Class | Kit | Pace | Fixture XP | SP spent | Lessons (spell:level:outcome:seconds) | Spells | Outcome | Seconds | Pieces | HP left | Enemy HP left | Overflows |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ];
    for (const enemyId of enemies) {
      for (const classId of Object.keys(CLASSES)) {
        for (const trained of [false, true]) {
          const prepared = fixture(enemyId, classId, trained);
          snapshots.push(
            `| ${enemyId} | ${classId} | ${trained ? 'mentor' : 'starter'} | ${prepared.state.hero.maxHp} | ${totalDefense(prepared.state.hero)} | ${JSON.stringify(prepared.state.hero.mana)} |`,
          );
          for (const pace of paces) {
            const state = structuredClone(prepared.state);
            const map = Object.values(MAPS).find((m) =>
              m.entities.some((e) => e.kind === 'monster' && e.enemyId === enemyId),
            )!;
            const battle = new Battle({ kind: 'combat', enemyId }, state.hero, createRng(7919), {
              weights: pieceWeights(map, state.hero),
              dualChance: dualChance(state.hero),
            });
            const result = simulateBattle(battle, 'prepared', pace, 600_000);
            const spells = Object.entries(state.hero.spells)
              .map(([id, spell]) => `${id}:${spell.level}`)
              .join(',');
            lines.push(
              `| ${enemyId} | ${classId} | ${trained ? 'mentor' : 'starter'} | ${pace} | ${prepared.fixtureXp} | ${prepared.spent} | ${prepared.lessons.join(', ') || 'none'} | ${spells} | ${result.stopReason} | ${(result.ms / 1000).toFixed(1)} | ${result.pieces} | ${(result.hpLeft * 100).toFixed(0)}% | ${battle.combat!.enemyHp} | ${result.overflows} |`,
            );
          }
        }
      }
    }
    const report =
      [
        ...lines,
        '',
        '## Starting HP, defense and carried mana',
        '',
        '| Enemy | Class | Kit | Max HP (starts full) | Total defense | Mana |',
        '| --- | --- | --- | --- | --- | --- |',
        ...snapshots,
      ].join('\n') + '\n';
    process.stderr.write(report);
    if (process.env.CAMPAIGN_PREPARED_OUT) writeFileSync(process.env.CAMPAIGN_PREPARED_OUT, report);
  }, 120_000);
});
