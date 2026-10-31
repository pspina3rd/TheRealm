/**
 * The skill screen's plan: stat ranks and spell enhancements chosen
 * together from one pool of skill points, checked together and spent at
 * once (`spendSkillPoints` in `hero.ts`). Stat rules are in `stats.ts`,
 * spell rules in `spells.ts`.
 */
import { ENHANCEMENT_IDS, SPELLS, type EnhancementId } from '../data/spells';
import type { StatId } from '../data/stats';
import type { Hero } from './hero';
import {
  canAddEnhancement,
  fitsStep,
  knownSpell,
  levelStep,
  enhancements,
  type Enhancements,
} from './spells';
import { adjustPlan, canRaise, isValidPlan, planCost, type StatPlan } from './stats';

/** Stat ranks and spell enhancements staged on the skill screen. */
export interface SkillPlan {
  readonly stats: StatPlan;
  /** Spell id → enhancements per attribute. */
  readonly spells: Readonly<Record<string, Partial<Enhancements>>>;
}

/** Nothing chosen yet. */
export const EMPTY_PLAN: SkillPlan = { stats: {}, spells: {} };

type PlanHero = Pick<Hero, 'stats' | 'skillPoints' | 'spells'>;

/** A known spell with a level still to gain, and the step toward it; null otherwise. */
function enhanceable(hero: Pick<Hero, 'spells'>, spellId: string) {
  const spell = SPELLS[spellId];
  const known = knownSpell(hero, spellId);
  const step = spell && known && levelStep(spell, known.level);
  return step ? { spell, known, step } : null;
}

/** Skill points the planned enhancements cost: each at its spell's current step price. */
export function enhancementCost(hero: Pick<Hero, 'spells'>, plan: SkillPlan): number {
  let total = 0;
  for (const [spellId, staged] of Object.entries(plan.spells)) {
    const count = ENHANCEMENT_IDS.reduce((sum, id) => sum + (staged[id] ?? 0), 0);
    total += count * (enhanceable(hero, spellId)?.step.cost ?? 0);
  }
  return total;
}

/** Skill points the whole plan costs. */
export function skillPlanCost(hero: Pick<Hero, 'spells'>, plan: SkillPlan): number {
  return planCost(plan.stats) + enhancementCost(hero, plan);
}

/** True if the plan has room for one more rank of `stat`. */
export function canRaiseStat(hero: PlanHero, plan: SkillPlan, stat: StatId): boolean {
  return canRaise(hero.stats, hero.skillPoints - enhancementCost(hero, plan), plan.stats, stat);
}

/**
 * True if the plan has room for one more `attribute` on `spellId`: the
 * hero knows it, the step allows it and the
 * points cover its price.
 */
export function canEnhance(
  hero: PlanHero,
  plan: SkillPlan,
  spellId: string,
  attribute: EnhancementId,
): boolean {
  const target = enhanceable(hero, spellId);
  return (
    !!target &&
    canAddEnhancement(target.spell, target.known, plan.spells[spellId] ?? {}, attribute) &&
    skillPlanCost(hero, plan) + target.step.cost <= hero.skillPoints
  );
}

/**
 * True if every part of the plan is allowed and the hero can pay for all
 * of it: valid stat ranks, and enhancements only on known spells
 * that stay within their step.
 */
export function isValidSkillPlan(hero: PlanHero, plan: SkillPlan): boolean {
  const spellsOk = Object.entries(plan.spells).every(([spellId, staged]) => {
    const target = enhanceable(hero, spellId);
    if (!target) return Object.values(staged).every((count) => count === 0);
    const { known, step } = target;
    const counts = enhancements(
      Object.fromEntries(ENHANCEMENT_IDS.map((id) => [id, known.step[id] + (staged[id] ?? 0)])),
    );
    const staging = ENHANCEMENT_IDS.every((id) => (staged[id] ?? 0) >= 0);

    return staging && fitsStep(step, counts);
  });
  return (
    spellsOk &&
    isValidPlan(hero.stats, hero.skillPoints, plan.stats) &&
    skillPlanCost(hero, plan) <= hero.skillPoints
  );
}

/** A copy of `plan` with one rank of `stat` added (+1) or taken back (−1), never below 0. */
export function adjustStat(plan: SkillPlan, stat: StatId, delta: 1 | -1): SkillPlan {
  return { ...plan, stats: adjustPlan(plan.stats, stat, delta) };
}

/** A copy of `plan` with one `attribute` enhancement added or taken back, never below 0. */
export function adjustEnhancement(
  plan: SkillPlan,
  spellId: string,
  attribute: EnhancementId,
  delta: 1 | -1,
): SkillPlan {
  const staged = plan.spells[spellId] ?? {};
  return {
    ...plan,
    spells: {
      ...plan.spells,
      [spellId]: { ...staged, [attribute]: Math.max(0, (staged[attribute] ?? 0) + delta) },
    },
  };
}

/** Fire's Power/Effect are training, not immediate burn bonuses. Keep their
 * persisted counts and prices, but present one reversible training control. */
export function fireTrainingAttribute(
  hero: Pick<Hero, 'spells'>,
  plan: SkillPlan,
  delta: 1 | -1,
): EnhancementId | null {
  const known = knownSpell(hero, 'fire');
  if (!known) return null;
  const staged = plan.spells.fire ?? {};
  const attributes = ['power', 'effect'] as const;
  const spell = SPELLS.fire;
  const step = spell && levelStep(spell, known.level);
  if (!spell || !step) return null;
  if (delta < 0) {
    const stagedAttributes = [...attributes].reverse().filter((id) => (staged[id] ?? 0) > 0);
    return (
      stagedAttributes.find((id) => known.step[id] + (staged[id] ?? 0) > step.each) ??
      stagedAttributes[0] ??
      null
    );
  }
  return (
    [...attributes]
      .sort((a, b) => known.step[a] + (staged[a] ?? 0) - known.step[b] - (staged[b] ?? 0))
      .find((id) => canAddEnhancement(spell, known, staged, id)) ?? null
  );
}
