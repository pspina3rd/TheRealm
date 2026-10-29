/**
 * An encounter from offer to aftermath (docs/ENCOUNTER_DESIGN.md §3, §4):
 * the spec offered (strain, the person's demo, the assist), the Stakes card
 * shown before it (the win first, then the ask, the cost of failing and
 * the retry rule), and what a finished try does to the world.
 */
import type { Battle } from '../battle/battle';
import type { DuelChallenge } from '../battle/verbs/duel';
import { STAKES } from '../data/balance';
import type { EncounterDef } from '../data/encounters';
import { MENTORS } from '../data/mentors';
import type { ChallengeSpec, NpcDef, Reward } from '../data/types';
import type { GameState } from '../world/state';
import { ATTITUDE_PRICES, attitudeOf, type Attitude } from './attitude';
import type { Gain } from './rewards';
import {
  assistOffered,
  beginTry,
  blockedReason,
  firstTry,
  priceChange,
  recordOf,
  regardOf,
  settle,
  settleHaggle,
  strainFor,
  type Blocked,
  type HaggleGrade,
  type RetryRule,
  type StakesRules,
} from './stakes';

/** The stakes rules of a person's encounter. */
export function rulesFor(npc: NpcDef, def: EncounterDef): StakesRules {
  return {
    personId: npc.inanimate ? null : npc.id,
    retry: def.retry,
    repeatable: npc.repeatable,
    threshold: def.assist !== undefined,
    strains: true,
  };
}

/** The stakes record of a lesson for `spellId`. */
export function lessonKey(spellId: string): string {
  return `lesson.${spellId}`;
}

/**
 * A lesson's stakes (§6.3): retry Now once, then Wait; no strain (the seal
 * is the cost); regard only toward a mentor who lent the spell.
 */
export function lessonRules(mentorId: string | null): StakesRules {
  return {
    personId: mentorId,
    retry: 'nowOnce',
    repeatable: false,
    threshold: false,
    strains: false,
  };
}

/** The encounter as offered now: its strain, the demo on a first try, the assist if chosen. */
export function encounterSpec(
  state: GameState,
  def: EncounterDef,
  assisted = false,
): Extract<ChallengeSpec, { kind: 'encounter' }> {
  return {
    kind: 'encounter',
    id: def.id,
    strain: strainFor(state, def.id, assisted),
    demo: firstTry(state, def.id),
    assisted,
  };
}

/** The objective in the person's words, with the target at this strain filled in. */
export function objectiveText(def: EncounterDef, strain: number): string {
  const spec = def.spec;
  const target =
    spec.verb === 'plant' ? spec.params.target + strain * spec.params.strainTarget : null;
  return def.objective.replace('{target}', String(target));
}

/** The Stakes card (§3.1): what's at stake before the first piece, win first. */
export interface StakesCard {
  readonly title: string;
  /** The ask: the objective in the person's words. */
  readonly objective: string;
  readonly win: {
    readonly rewards: readonly Reward[];
    readonly extras: readonly Reward[];
    /** Added on a Great. */
    readonly great: Reward | null;
    /** Regard now, and what a win would make it. */
    readonly regard: number;
    readonly regardAfter: number;
    /** The attitude one more good turn would bring, when it is a step up. */
    readonly warmer: Attitude | null;
  };
  readonly fail: {
    /** How the world gets worse, in words. */
    readonly text: string;
    /** What a strain step does next time (none for a haggle, which marks the shop up instead). */
    readonly strainText: string | null;
    /** The person cools (regard −1). */
    readonly cools: boolean;
  };
  readonly retry: RetryRule;
  /** Replays once a day after a win, at half pay. */
  readonly repeatable: boolean;
  /** How much harder this try is (strain). */
  readonly strain: number;
  /** Why it can't be tried now, if so. */
  readonly blocked: Blocked;
  /** The mentor whose help is offered (a threshold after two fails), if any. */
  readonly assist: string | null;
}

/**
 * The card for `npc`'s encounter on these terms. Rewards are given by the
 * caller (`rewardsOnTerms`); a repeat win shows them at half pay.
 */
export function stakesCard(
  state: GameState,
  npc: NpcDef,
  def: EncounterDef,
  terms: Attitude,
  rewards: { readonly base: readonly Reward[]; readonly extras: readonly Reward[] },
): StakesCard {
  const rules = rulesFor(npc, def);
  const record = recordOf(state, def.id);
  const regard = regardOf(state, npc.id);
  const repeat = rules.repeatable && record.wins > 0;
  const regardAfter = repeat || !rules.personId ? regard : Math.min(2, regard + 1);
  const next = attitudeOf(state.hero, npc, regard + 1);
  const assist = assistOffered(state, def.id, rules) ? (def.assist ?? null) : null;
  const strain = strainFor(state, def.id);
  return {
    title: def.title,
    objective: objectiveText(def, strain),
    win: {
      rewards: repeat ? halfPay(rewards.base) : rewards.base,
      extras: repeat ? halfPay(rewards.extras) : rewards.extras,
      great: def.great ?? null,
      regard,
      regardAfter,
      warmer: next !== terms && rules.personId ? next : null,
    },
    fail: {
      text: def.failText,
      strainText: def.spec.verb === 'duel' ? null : def.strainText,
      cools: rules.personId !== null,
    },
    retry: def.retry,
    repeatable: rules.repeatable,
    strain,
    blocked: blockedReason(state, def.id, rules),
    assist: assist ? (MENTORS[assist.mentorId]?.name ?? null) : null,
  };
}

/** Rewards at half pay (a repeat win): gil and counts halved, rounded down; nothing left is dropped. */
export function halfPay(rewards: readonly Reward[]): Reward[] {
  return rewards.flatMap((reward): Reward[] => {
    if (reward.kind === 'gil') {
      const amount = Math.floor(reward.amount * STAKES.repeatPay);
      return amount > 0 ? [{ ...reward, amount }] : [];
    }
    if (reward.kind === 'item') {
      const count = Math.floor(reward.count * STAKES.repeatPay);
      return count > 0 ? [{ ...reward, count }] : [];
    }
    return [reward];
  });
}

/** What a finished encounter try did. */
export interface EncounterOutcome {
  readonly won: boolean;
  /** Rewards earned (after half pay, the assist and a Great), to grant. */
  readonly rewards: readonly Reward[];
  /** Stakes moved: regard, strain, a haggle's price. */
  readonly gains: readonly Gain[];
  /** The first win: the person's next-step line follows their win line. */
  readonly firstWin: boolean;
  /** A haggle's band, and the shop it priced. */
  readonly grade: HaggleGrade | null;
  readonly shopId: string | null;
  readonly priceMultiplier: number;
}

/**
 * Settles a committed try (the hero touched the board): counts it, then
 * applies its stakes. A win pays the rewards (half on a repeat; an
 * assisted win keeps the gil but not the bonus item; a Great adds its
 * reward); a haggle prices the shop by its band.
 */
export function settleEncounter(
  state: GameState,
  npc: NpcDef,
  def: EncounterDef,
  battle: Battle,
  terms: Attitude,
  rewards: { readonly base: readonly Reward[]; readonly extras: readonly Reward[] },
): EncounterOutcome {
  const rules = rulesFor(npc, def);
  const spec = battle.spec;
  const assisted = spec.kind === 'encounter' && spec.assisted;
  const before = recordOf(state, def.id);
  const repeat = rules.repeatable && before.wins > 0;
  beginTry(state, def.id);
  if (def.spec.verb === 'duel') {
    const duel = battle.challenge as DuelChallenge;
    const grade = duel.grade;
    const shopId = npc.shop ?? null;
    const gains = settleHaggle(state, npc.id, shopId ?? npc.id, grade, duel.meter);
    const great = grade === 'great' && def.great ? [def.great] : [];
    return {
      won: grade !== 'fail',
      rewards: great,
      gains,
      firstWin: false,
      grade,
      shopId,
      priceMultiplier: ATTITUDE_PRICES[terms] * priceChange(state, shopId ?? npc.id),
    };
  }
  const won = battle.status === 'won';
  const gains = settle(state, def.id, rules, won, assisted);
  const great =
    won && def.great && (battle.challenge as { great?: boolean }).great === true ? [def.great] : [];
  const pay = repeat ? halfPay : (r: readonly Reward[]) => [...r];
  return {
    won,
    rewards: won ? [...pay(rewards.base), ...(assisted ? [] : pay(rewards.extras)), ...great] : [],
    gains,
    firstWin: won && before.wins === 0,
    grade: null,
    shopId: null,
    priceMultiplier: 1,
  };
}

/** The world prop an encounter shows now (§4): its win prop, its fail prop, or none yet. */
export function worldState(
  state: Pick<GameState, 'encounters'>,
  id: string,
): 'win' | 'fail' | null {
  const record = recordOf(state, id);
  if (record.fails > 0) return 'fail';
  return record.wins > 0 ? 'win' : null;
}

/**
 * The region each Sevenstones standing stone belongs to, and the encounter
 * whose win "fixes" it (§4: "each region fixed brightens its stone"). M1
 * builds the grove's: Wren's ring cleared.
 */
export const REGION_FIXES: Readonly<Record<string, string>> = { grove: 'forager' };

/** True once a region is fixed: its fixing encounter has been won. */
export function regionFixed(state: Pick<GameState, 'encounters'>, region: string): boolean {
  const id = REGION_FIXES[region];
  return id !== undefined && recordOf(state, id).wins > 0;
}
