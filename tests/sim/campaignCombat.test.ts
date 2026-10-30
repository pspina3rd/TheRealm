/**
 * Preliminary synthetic encounter viability, not an attainable campaign run.
 * CAMPAIGN_COMBAT=1 runs the complete class/pace matrix and writes its report.
 */
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Battle } from '../../src/battle/battle';
import { createRng } from '../../src/core/rng';
import { CLASSES } from '../../src/data/classes';
import { CAMPAIGN_ENEMIES } from '../../src/data/campaignEnemies';
import { CAMPAIGN_SHOPS } from '../../src/data/campaignShops';
import { MAPS } from '../../src/data/maps';
import type { EnemyDef } from '../../src/data/types';
import { gainXp } from '../../src/game/hero';
import { dualChance, pieceWeights } from '../../src/game/pieceOdds';
import { buy, priceFor } from '../../src/game/shop';
import { ITEMS } from '../../src/data/items';
import { newGame } from '../../src/world/state';
import { investEarnedPoints } from './progression';
import { simulateBattle, type FightResult } from './simulate';

const FIXTURE_GIL = 600;
const PACES = [1500, 2200] as const;

interface Purchase {
  readonly itemId: string;
  readonly cost: number;
}

/** Paid equipment and small supply reserves; no free or full mentor kit. */
function fixture(enemy: EnemyDef, classId: string) {
  const state = newGame(classId);
  while (state.hero.level < enemy.level) gainXp(state.hero, state.hero.nextXp);
  const earnedPoints = state.hero.skillPoints;
  const spentPoints = investEarnedPoints(state.hero);
  state.hero.gil = FIXTURE_GIL;
  const late = enemy.level >= 17;
  const shop = CAMPAIGN_SHOPS[late ? 'bellSupplies' : 'archiveSupplies']!;
  const purchases: Purchase[] = [];
  for (const itemId of [
    late ? 'flameBrand' : 'ironSword',
    late ? 'forgePlate' : 'crystalMail',
    'herb',
    'herb',
    'ether',
    'innRest',
  ]) {
    if (!shop.stock.includes(itemId)) throw new Error(`${shop.id} does not stock ${itemId}`);
    const cost = priceFor(ITEMS[itemId]!, 1);
    buy(state, itemId, 1);
    purchases.push({ itemId, cost });
  }
  return { state, earnedPoints, spentPoints, purchases };
}

interface Cell extends FightResult {
  readonly enemyId: string;
  readonly classId: string;
  readonly level: number;
  readonly pace: number;
  readonly gilSpent: number;
  readonly pointsSpent: number;
  readonly weapon: string | null;
  readonly armor: string | null;
}

function runCell(enemy: EnemyDef, classId: string, pace: number): Cell {
  const prepared = fixture(enemy, classId);
  const { state } = prepared;
  const map = Object.values(MAPS).find((area) =>
    area.entities.some((entity) => entity.kind === 'monster' && entity.enemyId === enemy.id),
  );
  if (!map) throw new Error(`No campaign map places ${enemy.id}`);
  const battle = new Battle({ kind: 'combat', enemyId: enemy.id }, state.hero, createRng(7919), {
    weights: pieceWeights(map, state.hero),
    dualChance: dualChance(state.hero),
  });
  const result = simulateBattle(battle, 'prepared', pace, 180_000);
  return {
    ...result,
    enemyId: enemy.id,
    classId,
    level: enemy.level,
    pace,
    gilSpent: prepared.purchases.reduce((sum, purchase) => sum + purchase.cost, 0),
    pointsSpent: prepared.spentPoints,
    weapon: state.hero.weaponId,
    armor: state.hero.armorId,
  };
}

describe('second-half encounter fixture integrity', () => {
  it('uses only earned skill points and records every paid preparation', () => {
    const enemy = CAMPAIGN_ENEMIES.malificat!;
    for (const classId of Object.keys(CLASSES)) {
      const prepared = fixture(enemy, classId);
      expect(prepared.spentPoints + prepared.state.hero.skillPoints).toBe(prepared.earnedPoints);
      expect(prepared.state.hero.gil).toBe(
        FIXTURE_GIL - prepared.purchases.reduce((sum, purchase) => sum + purchase.cost, 0),
      );
      expect(prepared.state.hero.gil).toBeGreaterThanOrEqual(0);
      expect(Object.keys(prepared.state.hero.spells).sort()).toEqual([]);
      expect(Object.values(prepared.state.hero.spells).every((spell) => spell.level === 1)).toBe(
        true,
      );
    }
  });
});

describe.skipIf(!process.env.CAMPAIGN_COMBAT)('second-half synthetic combat matrix', () => {
  it('exposes encounters with no winning class or pace in the preliminary sample', () => {
    const cells: Cell[] = [];
    for (const enemy of Object.values(CAMPAIGN_ENEMIES))
      for (const classId of Object.keys(CLASSES))
        for (const pace of PACES) cells.push(runCell(enemy, classId, pace));

    const rows = [
      '# Second-half synthetic encounter benchmark',
      '',
      'One seed (7919) per cell, independently prepared at the enemy authored level. ',
      '600 fixture gil; production skill spending; paid tier gear, 2 Herbs, 1 Ether, and inn rest. ',
      'Starting class primary plus Cure only, no mentor kit. This is not an attainable campaign or a win-rate estimate.',
      '',
      '| Enemy | Class | Level | Pace ms | Gil spent | SP spent | Gear | Outcome | Seconds | Pieces | HP left | Overflows |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      ...cells.map(
        (cell) =>
          `| ${cell.enemyId} | ${cell.classId} | ${cell.level} | ${cell.pace} | ${cell.gilSpent} | ${cell.pointsSpent} | ${cell.weapon}/${cell.armor} | ${cell.stopReason} | ${(cell.ms / 1000).toFixed(1)} | ${cell.pieces} | ${(cell.hpLeft * 100).toFixed(0)}% | ${cell.overflows} |`,
      ),
      '',
    ];
    const report = rows.join('\n');
    process.stderr.write(report);
    if (process.env.CAMPAIGN_COMBAT_OUT) writeFileSync(process.env.CAMPAIGN_COMBAT_OUT, report);

    // A 180-second reporting budget censors long fights; it is never a game
    // deadline or evidence of a gameplay loss. Keep those outcomes in the report.
    for (const enemy of Object.values(CAMPAIGN_ENEMIES)) {
      const group = cells.filter((cell) => cell.enemyId === enemy.id);
      expect(
        group.some((cell) => cell.won),
        `${enemy.id}: no class/pace won`,
      ).toBe(true);
    }
  }, 60_000);
});
