import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLASSES } from '../../src/data/classes';
import { MAPS } from '../../src/data/maps';
import { PIECE_NAMES } from '../../src/core/pieces';
import type { Resolution } from '../../src/game/encounter';
import { gainXp } from '../../src/game/hero';
import { pieceWeights } from '../../src/game/pieceOdds';
import { defeatedFlag, newGame, travel } from '../../src/world/state';
import {
  CAMPAIGN_PACES,
  campaignEncounters,
  investEarnedPoints,
  progressionBattle,
  purchaseSupplies,
  runCampaign,
} from './progression';

describe('attainable campaign resources', () => {
  it('starts with only the actual class resources and never invents a spell kit', () => {
    for (const classId of Object.keys(CLASSES)) {
      const { state, rows } = runCampaign({ classId, route: [] });
      expect(state).toEqual(newGame(classId));
      expect(rows).toEqual([]);
      expect(investEarnedPoints(state.hero)).toBe(0);
    }
  });

  it('charges earned points for enhancements and cannot upgrade spells without a lesson', () => {
    const { hero } = newGame('ranger');
    for (let i = 0; i < 4; i++) gainXp(hero, hero.nextXp);
    const earned = hero.skillPoints;
    const spent = investEarnedPoints(hero);
    expect(spent).toBeGreaterThan(0);
    expect(spent + hero.skillPoints).toBe(earned);
    expect(hero.spells.gale!.level).toBe(1);
    expect(Object.values(hero.spells.gale!.step).reduce((sum, n) => sum + n, 0)).toBeGreaterThan(0);
    expect(hero.skillPoints).toBeGreaterThanOrEqual(0);
    expect(investEarnedPoints(hero)).toBe(0);
  });

  it('cannot buy gear or replenish consumables beyond the available gil', () => {
    const state = newGame();
    const shop: Resolution = {
      won: true,
      gains: [],
      speech: null,
      fell: false,
      shopId: 'brightwaterGeneral',
      priceMultiplier: 1,
      attitude: 'neutral',
    };
    state.hero.gil = 0;
    state.hero.items = {};
    const items = { ...state.hero.items };
    expect(purchaseSupplies(state, shop)).toBe(0);
    expect(state.hero.items).toEqual(items);
    expect(state.hero.armorId).toBeNull();
    state.hero.gil = 14;
    const spent = purchaseSupplies(state, shop);
    expect(spent).toBeGreaterThan(0);
    expect(state.hero.gil).toBe(14 - spent);
    expect(state.hero.gil).toBeGreaterThanOrEqual(0);
    expect(state.hero.armorId).toBeNull();
  });

  it('uses a full region/charm/alignment-weighted bag instead of a synthetic even bag', () => {
    const state = newGame('mage');
    state.mapId = 'forge';
    const weights = pieceWeights(MAPS.forge!, state.hero);
    const size = Object.values(weights).reduce((sum, n) => sum + n, 0);
    const battle = progressionBattle(state, { kind: 'combat', enemyId: 'slime' }, 119);
    const pieces = [battle.board.active!.name, ...battle.board.preview(size - 1)];
    for (const name of PIECE_NAMES)
      expect(pieces.filter((p) => p === name).length, name).toBe(weights[name]);
    expect(new Set(Object.values(weights)).size).toBeGreaterThan(1);
  });

  it('records closed map gates instead of granting progress to reach later areas', () => {
    const { rows, state } = runCampaign({ route: ['peaks', 'caves1'] });
    expect(rows.every((row) => row.blocked)).toBe(true);
    expect(state.flags.size).toBe(0);
    expect(state.hero.level).toBe(1);
  });

  it('cannot reward a defeated boss again on repeat map visits', () => {
    const state = newGame();
    travel(state, { map: 'caves2', x: 2, y: 2 });
    const boss = MAPS.caves2!.entities.find((entity) => entity.kind === 'monster' && entity.boss)!;
    const ordinary = MAPS.caves2!.entities.find(
      (entity) => entity.kind === 'monster' && !entity.boss,
    )!;
    state.flags.add(defeatedFlag(boss.id));
    state.cleared.add(ordinary.id);
    expect(campaignEncounters(state).some((entity) => entity.id === boss.id)).toBe(false);
    expect(campaignEncounters(state).some((entity) => entity.id === ordinary.id)).toBe(false);
    travel(state, { map: 'caves1', x: 2, y: 2 });
    travel(state, { map: 'caves2', x: 2, y: 2 });
    expect(campaignEncounters(state).some((entity) => entity.id === boss.id)).toBe(false);
    expect(campaignEncounters(state).some((entity) => entity.id === ordinary.id)).toBe(true);
  });

  it('reports a timeout without granting victory rewards or applying a fake defeat', () => {
    const { rows, state } = runCampaign({ route: ['overworld'], battleLimitMs: 1 });
    expect(rows[0]!.timeouts).toBe(1);
    expect(rows[0]!.won).toBe(0);
    expect(rows[0]!.lost).toBe(0);
    expect(state.hero.gil).toBe(newGame().hero.gil);
    expect(state.victories).toBe(0);
  });
});

describe.skipIf(!process.env.SIM_PROGRESSION)('attainable progression report', () => {
  it('reports all classes and keyboard/touch pacing with carried resources', () => {
    const runs = Number(process.env.RUNS ?? 1);
    if (!Number.isInteger(runs) || runs <= 0) throw new Error('RUNS must be a positive integer');
    const lines = [
      '| Class | Pace ms | Seed | Area | Level in→out | Won/lost | Lessons won/tried | Seconds | HP | Gil | Spent | SP spent | Spells | Gear | Status |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ];
    for (const classId of Object.keys(CLASSES)) {
      for (const pace of CAMPAIGN_PACES) {
        for (let seed = 1; seed <= runs; seed++) {
          const { rows } = runCampaign({ classId, pace, seed });
          for (const row of rows) {
            lines.push(
              `| ${[
                classId,
                pace,
                seed,
                row.area,
                `${row.levelIn}→${row.levelOut}`,
                `${row.won}/${row.lost}`,
                `${row.lessonsWon}/${row.lessonsTried}`,
                row.seconds.toFixed(0),
                `${(row.hp * 100).toFixed(0)}%`,
                row.gil,
                row.spent,
                row.pointsSpent,
                row.spellLevels,
                row.gear || 'starter',
                row.blocked ? 'gate closed' : row.timeouts ? 'timed out' : 'attempted',
              ].join(' | ')} |`,
            );
          }
        }
      }
    }
    const report = lines.join('\n') + '\n';
    process.stderr.write(report);
    if (process.env.SIM_OUT) writeFileSync(process.env.SIM_OUT, report);
  }, 3_600_000);
});
