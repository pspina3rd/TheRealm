import { describe, expect, it } from 'vitest';
import { CLASSES } from '../src/data/classes';
import { STATS, STAT_IDS } from '../src/data/stats';
import { createHero, gainXp, spendSkillPoints } from '../src/game/hero';
import {
  CRIT_MIN_LINES,
  VITALITY_HP,
  adjustPlan,
  canRaise,
  charmPriceMultiplier,
  critChance,
  derivedStats,
  dropBonus,
  fallMultiplier,
  isValidPlan,
  planCost,
  previewCount,
  seesEnemyMove,
  statRanks,
} from '../src/game/stats';

describe('stat definitions', () => {
  it('define every stat with a positive max rank', () => {
    expect(Object.keys(STATS)).toEqual([...STAT_IDS]);
    for (const id of STAT_IDS) {
      expect(STATS[id].id).toBe(id);
      expect(STATS[id].maxRank).toBeGreaterThan(0);
    }
  });

  it('give every class 4 starting ranks in two stats', () => {
    for (const cls of Object.values(CLASSES)) {
      const ranks = Object.values(cls.stats);
      expect(ranks, cls.id).toEqual([2, 2]);
    }
  });
});

describe('stat effects', () => {
  const knight = CLASSES.knight!;

  it('adds Vitality, Focus, Strength and Guard to the class base, plus HP per level', () => {
    expect(derivedStats(knight, 1, statRanks())).toEqual({
      maxHp: knight.base.hp,
      manaCap: knight.base.mana,
      atk: knight.base.atk,
      def: knight.base.def,
    });
    const ranks = statRanks({ vitality: 3, focus: 2, strength: 4, guard: 1 });
    expect(derivedStats(knight, 5, ranks)).toEqual({
      maxHp: knight.base.hp + 4 * knight.hpGrowth + 3 * VITALITY_HP,
      manaCap: knight.base.mana + 2,
      atk: knight.base.atk + 4,
      def: knight.base.def + 1,
    });
  });

  it('slows pieces 4% per Agility rank, at most 40%', () => {
    expect(fallMultiplier(0)).toBe(1);
    expect(fallMultiplier(5)).toBeCloseTo(1.2);
    expect(fallMultiplier(STATS.agility.maxRank)).toBeCloseTo(1.4);
  });

  it('shows more upcoming pieces at Insight 3 and 6, and the enemy move at 9', () => {
    expect([0, 2, 3, 5, 6, 9].map(previewCount)).toEqual([1, 1, 2, 2, 3, 3]);
    expect(seesEnemyMove(8)).toBe(false);
    expect(seesEnemyMove(9)).toBe(true);
  });

  it('takes 3% off prices per Charm rank, at most 30%', () => {
    expect(charmPriceMultiplier(0)).toBe(1);
    expect(charmPriceMultiplier(STATS.charm.maxRank)).toBeCloseTo(0.7);
  });

  it('adds 2% to drops per Luck rank and lets only big clears crit', () => {
    expect(dropBonus(5)).toBeCloseTo(0.1);
    expect(critChance(10, CRIT_MIN_LINES - 1)).toBe(0);
    expect(critChance(10, CRIT_MIN_LINES)).toBeCloseTo(0.3);
    expect(critChance(0, 4)).toBe(0);
  });
});

describe('skill plans', () => {
  const ranks = statRanks({ insight: 8 });

  it('cost 1 point per rank', () => {
    expect(planCost({})).toBe(0);
    expect(planCost({ vitality: 2, luck: 1 })).toBe(3);
  });

  it('can raise a stat only with points left and below its max rank', () => {
    expect(canRaise(ranks, 2, {}, 'vitality')).toBe(true);
    expect(canRaise(ranks, 2, { vitality: 2 }, 'luck')).toBe(false);
    expect(canRaise(ranks, 2, {}, 'insight')).toBe(true);
    expect(canRaise(ranks, 2, { insight: 1 }, 'insight')).toBe(false);
  });

  it('are valid only when affordable, whole, non-negative and within max ranks', () => {
    expect(isValidPlan(ranks, 2, { vitality: 2 })).toBe(true);
    expect(isValidPlan(ranks, 2, { vitality: 3 })).toBe(false);
    expect(isValidPlan(ranks, 2, { vitality: 1.5 })).toBe(false);
    expect(isValidPlan(ranks, 2, { vitality: -1, luck: 2 })).toBe(false);
    expect(isValidPlan(ranks, 2, { insight: 2 })).toBe(false);
  });

  it('are adjusted one rank at a time without changing the original, never below 0', () => {
    const plan = { guard: 1 };
    expect(adjustPlan(plan, 'guard', 1)).toEqual({ guard: 2 });
    expect(adjustPlan(plan, 'luck', -1)).toEqual({ guard: 1, luck: 0 });
    expect(plan).toEqual({ guard: 1 });
  });
});

describe('spending skill points', () => {
  const levelled = () => {
    const hero = createHero('knight');
    gainXp(hero, hero.nextXp); // level 2: 2 points
    return hero;
  };

  it('buys ranks and their effects for 1 point each', () => {
    const hero = levelled();
    const before = { ...hero, stats: { ...hero.stats } };
    expect(spendSkillPoints(hero, { strength: 1, focus: 1 })).toBe(true);
    expect(hero.skillPoints).toBe(0);
    expect(hero.stats.strength).toBe(before.stats.strength + 1);
    expect(hero.atk).toBe(before.atk + 1);
    expect(hero.manaCap).toBe(before.manaCap + 1);
  });

  it('adds new max HP to current HP', () => {
    const hero = levelled();
    hero.hp = 10;
    spendSkillPoints(hero, { vitality: 2 });
    expect(hero.hp).toBe(10 + 2 * VITALITY_HP);
    expect(hero.maxHp).toBe(CLASSES.knight!.base.hp + CLASSES.knight!.hpGrowth + 4 * VITALITY_HP);
  });

  it('lowers enemy damage with Guard', () => {
    const hero = levelled();
    spendSkillPoints(hero, { guard: 2 });
    expect(hero.def).toBe(CLASSES.knight!.base.def + 4);
  });

  it('refuses to overspend and changes nothing', () => {
    const hero = levelled();
    const before = structuredClone(hero);
    expect(spendSkillPoints(hero, { luck: 3 })).toBe(false);
    expect(hero).toEqual(before);
  });

  it('is permanent: ranks cannot be sold back for points', () => {
    const hero = levelled();
    spendSkillPoints(hero, { luck: 2 });
    expect(spendSkillPoints(hero, { luck: -2 })).toBe(false);
    expect(hero.stats.luck).toBe(2);
    expect(hero.skillPoints).toBe(0);
  });

  it('keeps unspent points for later', () => {
    const hero = levelled();
    spendSkillPoints(hero, { charm: 1 });
    gainXp(hero, hero.nextXp);
    expect(hero.skillPoints).toBe(3);
  });
});
