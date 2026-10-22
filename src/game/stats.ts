/**
 * Stats and skill points. Every level gives the hero skill points; each
 * point buys one rank of a stat. Spending is permanent.
 *
 * Ranks add to the class's base numbers (see `derivedStats`); the rest of
 * the effects are read where they apply: gravity (Agility), the next-piece
 * preview and enemy intent (Insight), NPC attitude (Charm, see `src/game/attitude.ts`), drops and critical
 * strikes (Luck).
 */
import type { HeroClass } from '../data/classes';
import { STATS, STAT_IDS, type StatId, type StatRanks } from '../data/stats';

/** Skill points gained per hero level. */
export const SKILL_POINTS_PER_LEVEL = 2;
/** Skill points one stat rank costs. */
export const STAT_RANK_COST = 1;

/** Max HP per Vitality rank. */
export const VITALITY_HP = 6;
/** Fall slowdown per Agility rank (0.04 = pieces fall 4% slower). */
export const AGILITY_SLOWDOWN = 0.04;
/** Added to every item drop chance per Luck rank. */
export const LUCK_DROP_BONUS = 0.02;
/** Chance per Luck rank that a big clear's strike is critical. */
export const LUCK_CRIT_CHANCE = 0.03;
/** Fewest lines cleared at once that can crit. */
export const CRIT_MIN_LINES = 3;
/** Damage multiplier of a critical strike. */
export const CRIT_MULTIPLIER = 2;
/** Insight ranks that each show one more upcoming piece. */
export const INSIGHT_PREVIEW_RANKS: readonly number[] = [3, 6];
/** Insight rank that reveals the enemy's next move. */
export const INSIGHT_ENEMY_MOVE_RANK = 9;

/** Ranks the hero chooses before confirming, per stat. */
export type StatPlan = Partial<Record<StatId, number>>;

/** Every stat at rank 0, plus any given ranks. */
export function statRanks(ranks: Partial<StatRanks> = {}): StatRanks {
  return Object.fromEntries(STAT_IDS.map((id) => [id, ranks[id] ?? 0])) as StatRanks;
}

/** Max HP, mana capacity, attack and defence from the class, level and stat ranks. */
export function derivedStats(
  cls: HeroClass,
  level: number,
  ranks: Readonly<StatRanks>,
): { maxHp: number; manaCap: number; atk: number; def: number } {
  return {
    maxHp: cls.base.hp + cls.hpGrowth * (level - 1) + VITALITY_HP * ranks.vitality,
    manaCap: cls.base.mana + ranks.focus,
    atk: cls.base.atk + ranks.strength,
    def: cls.base.def + ranks.guard,
  };
}

/** Multiplier on the time between gravity steps (higher = slower pieces). */
export function fallMultiplier(agility: number): number {
  return 1 + AGILITY_SLOWDOWN * agility;
}

/** How many upcoming pieces the hero sees. */
export function previewCount(insight: number): number {
  return 1 + INSIGHT_PREVIEW_RANKS.filter((rank) => insight >= rank).length;
}

/** True when the hero can see the enemy's next move. */
export function seesEnemyMove(insight: number): boolean {
  return insight >= INSIGHT_ENEMY_MOVE_RANK;
}

/** Chance added to every item drop. */
export function dropBonus(luck: number): number {
  return LUCK_DROP_BONUS * luck;
}

/** Chance that a strike from clearing `lines` at once is critical. */
export function critChance(luck: number, lines: number): number {
  return lines >= CRIT_MIN_LINES ? LUCK_CRIT_CHANCE * luck : 0;
}

/** Skill points a plan costs. */
export function planCost(plan: StatPlan): number {
  return STAT_IDS.reduce((sum, id) => sum + (plan[id] ?? 0) * STAT_RANK_COST, 0);
}

/** True if the plan has room for one more rank of `stat`: points left and below its max rank. */
export function canRaise(
  ranks: Readonly<StatRanks>,
  points: number,
  plan: StatPlan,
  stat: StatId,
): boolean {
  return (
    planCost(plan) + STAT_RANK_COST <= points &&
    ranks[stat] + (plan[stat] ?? 0) < STATS[stat].maxRank
  );
}

/** True if every planned rank is a whole, non-negative number within its max and the hero can pay. */
export function isValidPlan(ranks: Readonly<StatRanks>, points: number, plan: StatPlan): boolean {
  return (
    STAT_IDS.every((id) => {
      const add = plan[id] ?? 0;
      return Number.isInteger(add) && add >= 0 && ranks[id] + add <= STATS[id].maxRank;
    }) && planCost(plan) <= points
  );
}

/** A copy of `plan` with one rank of `stat` added (+1) or taken back (−1), never below 0. */
export function adjustPlan(plan: StatPlan, stat: StatId, delta: 1 | -1): StatPlan {
  return { ...plan, [stat]: Math.max(0, (plan[stat] ?? 0) + delta) };
}
