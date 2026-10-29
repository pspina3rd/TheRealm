/**
 * Stakes (docs/ENCOUNTER_DESIGN.md §3): what winning and failing an
 * encounter cost and give, and when it can be tried again.
 *
 * - **Regard**, per person, −2 to +2, is added to their attitude score. A
 *   first win gives +1; a fail −1; a repeat win restores 1, up to the level
 *   the first win reached. It moves prices, rewards and dialogue only,
 *   never difficulty, and it never makes anyone Hostile on its own (see
 *   `attitudeOf`).
 * - **Strain**, per encounter, 0–2 (1 at thresholds): each fail makes the
 *   next try harder by a step; a win clears it; a night at an inn eases it.
 * - **Retry rules**: Now (at once), Now once (then Wait), Wait (after the
 *   next won monster fight), Day (once a day; a day ends at an inn).
 *   Repeatables replay once a day after a win, for half pay and no regard.
 * - **Prices**: a won haggle discounts that shop until the hero leaves the
 *   town; a lost one marks it up (Browse included) until a haggle there is
 *   won or `STAKES.markupDays` days pass.
 */
import { STAKES } from '../data/balance';
import type { GameState } from '../world/state';
import type { Gain } from './rewards';

/** When an encounter can be tried again after a fail (§3.2). */
export type RetryRule = 'now' | 'nowOnce' | 'wait' | 'day';

/** What the save remembers of one encounter. */
export interface EncounterRecord {
  /** How much harder the next try is (0 to the encounter's cap). */
  strain: number;
  /** Fails since the last win. */
  fails: number;
  /** Wins ever. */
  wins: number;
  /** Tries committed (a first touch). The person's demo plays on the first. */
  tries: number;
  /** Wait: no retry until `victories` (monster wins) is past this. */
  waitPast: number | null;
  /** The day it was last played, and last won (once-a-day rules). */
  playedDay: number | null;
  wonDay: number | null;
}

/** A shop's price change from a haggle: a discount (this town only) or a markup (for days). */
export interface PriceChange {
  readonly multiplier: number;
  /** A discount holds on this map only; a markup everywhere the shop is. */
  readonly map: string | null;
  /** The day a markup began. */
  readonly day: number;
}

/** A fresh record: never tried. */
export function newRecord(): EncounterRecord {
  return {
    strain: 0,
    fails: 0,
    wins: 0,
    tries: 0,
    waitPast: null,
    playedDay: null,
    wonDay: null,
  };
}

/** The record of encounter `id` (a fresh one, unsaved, if it was never tried). */
export function recordOf(state: Pick<GameState, 'encounters'>, id: string): EncounterRecord {
  return state.encounters[id] ?? newRecord();
}

/** The stored record of `id`, created if needed. */
function stored(state: Pick<GameState, 'encounters'>, id: string): EncounterRecord {
  return (state.encounters[id] ??= newRecord());
}

/** Someone's regard for the hero, −2 to +2 (0 if never met in an encounter). */
export function regardOf(state: Pick<GameState, 'regard'>, personId: string): number {
  return state.regard[personId] ?? 0;
}

/** Moves regard by `delta`, within range; returns the change made. */
function shiftRegard(state: Pick<GameState, 'regard'>, personId: string, delta: number): number {
  const before = regardOf(state, personId);
  const after = Math.min(STAKES.regardMax, Math.max(STAKES.regardMin, before + delta));
  state.regard[personId] = after;
  return after - before;
}

/** How an encounter's stakes are set (from its definition, see `src/data/encounters.ts`). */
export interface StakesRules {
  /** The person whose regard moves (none for things and for assisted tries). */
  readonly personId: string | null;
  readonly retry: RetryRule;
  /** Replayable once a day after a win, at half pay and no regard. */
  readonly repeatable: boolean;
  /** A threshold: required, strain capped lower, the assist offered after fails. */
  readonly threshold: boolean;
  /** False for lessons, whose cost is the spell seal instead. */
  readonly strains: boolean;
}

/** Why an encounter can't be tried now, or null if it can. */
export type Blocked = 'wait' | 'day' | null;

/** Whether encounter `id` can be tried now (see the retry rules above). */
export function blockedReason(
  state: Pick<GameState, 'encounters' | 'victories' | 'day'>,
  id: string,
  rules: Pick<StakesRules, 'retry' | 'repeatable'>,
): Blocked {
  const record = recordOf(state, id);
  if (rules.retry === 'day' && record.playedDay === state.day) return 'day';
  if (rules.repeatable && record.wonDay === state.day) return 'day';
  if (record.waitPast !== null && state.victories <= record.waitPast) return 'wait';
  return null;
}

/** True when the next try of a threshold is offered the mentor's assist. */
export function assistOffered(
  state: Pick<GameState, 'encounters'>,
  id: string,
  rules: Pick<StakesRules, 'threshold'>,
): boolean {
  return rules.threshold && recordOf(state, id).fails >= STAKES.assistAfterFails;
}

/** The strain a try starts with: none when assisted (the assist clears it). */
export function strainFor(
  state: Pick<GameState, 'encounters'>,
  id: string,
  assisted = false,
): number {
  return assisted ? 0 : recordOf(state, id).strain;
}

/** True when the next try is the first: the person shows how (their demo). */
export function firstTry(state: Pick<GameState, 'encounters'>, id: string): boolean {
  return recordOf(state, id).tries === 0;
}

/** The hero committed to a try (their first touch): counted, and the day noted. */
export function beginTry(state: Pick<GameState, 'encounters' | 'day'>, id: string): void {
  const record = stored(state, id);
  record.tries++;
  record.playedDay = state.day;
}

/**
 * Applies a finished try's stakes and returns what changed, for the
 * results screen. A win clears strain and any wait, counts the win and
 * moves regard (+1 on the first, a restore after); an assisted win moves
 * none. A fail adds strain (unless the encounter has none), lowers regard
 * and starts a wait under Wait (or under Now once, from the second fail).
 */
export function settle(
  state: Pick<GameState, 'encounters' | 'regard' | 'regardPeak' | 'victories' | 'day'>,
  id: string,
  rules: StakesRules,
  won: boolean,
  assisted = false,
): Gain[] {
  const record = stored(state, id);
  const gains: Gain[] = [];
  const person = assisted ? null : rules.personId;
  if (won) {
    const first = record.wins === 0;
    record.wins++;
    record.fails = 0;
    record.strain = 0;
    record.waitPast = null;
    record.wonDay = state.day;
    if (person) {
      const peak = state.regardPeak[person];
      const moved = first
        ? shiftRegard(state, person, STAKES.regardWin)
        : peak !== undefined && regardOf(state, person) < peak
          ? shiftRegard(
              state,
              person,
              Math.min(STAKES.regardRestore, peak - regardOf(state, person)),
            )
          : 0;
      if (first) state.regardPeak[person] = regardOf(state, person);
      if (moved !== 0) gains.push(regardGain(state, person, moved));
    }
    return gains;
  }
  record.fails++;
  if (rules.strains) {
    const cap = rules.threshold ? STAKES.thresholdStrainMax : STAKES.strainMax;
    record.strain = Math.min(cap, record.strain + 1);
    gains.push({ kind: 'strain', level: record.strain });
  }
  if (rules.retry === 'wait' || (rules.retry === 'nowOnce' && record.fails >= 2)) {
    record.waitPast = state.victories;
  }
  if (person) {
    const moved = shiftRegard(state, person, STAKES.regardFail);
    gains.push(regardGain(state, person, moved));
  }
  return gains;
}

function regardGain(state: Pick<GameState, 'regard'>, person: string, delta: number): Gain {
  return { kind: 'regard', delta, level: regardOf(state, person) };
}

/** A haggle's outcome band (§6.1): the meter's final price decides it. */
export type HaggleGrade = 'great' | 'win' | 'even' | 'fail';

/**
 * Applies a haggle (a once-a-day DUEL at a merchant): a Great or a Win
 * discounts the shop at the final price until the hero leaves this town,
 * lifts any markup there and moves regard +1 every time; Even changes
 * nothing; a Fail marks the shop up at the final price (Browse included)
 * and lowers regard. Returns what changed.
 */
export function settleHaggle(
  state: Pick<GameState, 'encounters' | 'regard' | 'prices' | 'day' | 'mapId'>,
  personId: string,
  shopId: string,
  grade: HaggleGrade,
  multiplier: number,
): Gain[] {
  const record = stored(state, personId);
  if (grade === 'even') return [];
  if (grade === 'fail') {
    record.fails++;
    state.prices[shopId] = { multiplier, map: null, day: state.day };
    const moved = shiftRegard(state, personId, STAKES.regardFail);
    return [{ kind: 'price', multiplier }, regardGain(state, personId, moved)];
  }
  record.wins++;
  record.fails = 0;
  record.wonDay = state.day;
  state.prices[shopId] = { multiplier, map: state.mapId, day: state.day };
  const moved = shiftRegard(state, personId, STAKES.regardWin);
  return [
    { kind: 'price', multiplier },
    ...(moved !== 0 ? [regardGain(state, personId, moved)] : []),
  ];
}

/**
 * A shop's haggle multiplier now: a discount while the hero is still in
 * the town it was won in, a markup until it expires; 1 otherwise.
 */
export function priceChange(
  state: Pick<GameState, 'prices' | 'day' | 'mapId'>,
  shopId: string,
): number {
  const change = state.prices[shopId];
  if (!change) return 1;
  if (change.map !== null) return change.map === state.mapId ? change.multiplier : 1;
  return state.day < change.day + STAKES.markupDays ? change.multiplier : 1;
}

/** Leaving a town ends its discounts (markups stay until they expire). */
export function leaveTown(state: Pick<GameState, 'prices'>, mapId: string): void {
  state.prices = Object.fromEntries(
    Object.entries(state.prices).filter(
      ([, change]) => change.map === null || change.map === mapId,
    ),
  );
}

/**
 * A night at an inn: the day ends, every encounter's strain eases a step
 * and expired markups lapse.
 */
export function innNight(state: Pick<GameState, 'encounters' | 'prices' | 'day'>): void {
  state.day++;
  for (const record of Object.values(state.encounters)) {
    record.strain = Math.max(0, record.strain - STAKES.innRelief);
  }
  state.prices = Object.fromEntries(
    Object.entries(state.prices).filter(
      ([, change]) => change.map !== null || state.day < change.day + STAKES.markupDays,
    ),
  );
}
