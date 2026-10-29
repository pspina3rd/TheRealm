import type { Battle } from '../battle/battle';
import { type EncounterDef, encounterOf } from '../data/encounters';
import { NPCS } from '../data/npcs';
import { ITEMS } from '../data/items';
import { SPELLS } from '../data/spells';
import { spellName } from './spells';
import { MENTORS } from '../data/mentors';
import type { ChallengeSpec, Reward } from '../data/types';
import type { GameState } from '../world/state';
import { attitudeOf, type Attitude } from './attitude';
import { completeLesson, lessonDifficulty, lessonSpec } from './lessons';
import { DUEL_PRICES, STAKES } from '../data/balance';
import { settle, settleHaggle } from './stakes';
import {
  assistOffered,
  beginTry,
  blockedReason,
  firstTry,
  recordOf,
  strainFor,
  regardOf,
  type StakesRules,
} from './stakes';

export type PendingAttempt =
  | {
      readonly kind: 'encounter';
      readonly id: string;
      readonly assisted: boolean;
      readonly try: number;
    }
  | {
      readonly kind: 'lesson';
      readonly spellId: string;
      readonly difficulty: number;
      readonly try: number;
    };

const M1_IDS = new Set(['elder', 'kid', 'farmer', 'stallKeeper', 'forager', 'guard']);

export interface StakesCard {
  readonly win: string;
  readonly rewards?: readonly Reward[];
  readonly great?: Reward;
  readonly regard?: {
    readonly current: number;
    readonly after: number;
    readonly warmer: Attitude | null;
  };
  readonly objective: string;
  readonly fail: string;
  readonly strain: number;
  readonly retry: string;
  readonly blockedReason: string | null;
  readonly assist?: { readonly mentorId: string; readonly label: string };
}
export interface BrowseOffer {
  readonly shopId: string;
  readonly priceMultiplier: number;
  readonly attitude: Attitude;
}

/** Only the approved M1 slice adopts the new state flow. */
export function flowFor(spec: ChallengeSpec): { id: string; rules: StakesRules } | null {
  if (spec.kind === 'lesson' && spec.mentorId === 'hazel') {
    return {
      id: `lesson:${spec.mentorId}:${spec.spellId}`,
      rules: {
        personId: spec.mentorId,
        retry: 'nowOnce',
        repeatable: false,
        threshold: false,
        strains: false,
      },
    };
  }
  if (spec.kind !== 'encounter' || !M1_IDS.has(spec.id)) return null;
  const def = encounterOf(spec.id);
  if (!def) return null;
  return {
    id: spec.id,
    rules: {
      personId: spec.id,
      retry: def.retry,
      repeatable: NPCS[spec.id]?.repeatable ?? false,
      threshold: !!def.assist,
      strains: true,
    },
  };
}

export function encounterSpec(
  state: GameState,
  id: string,
  assisted = false,
): Extract<ChallengeSpec, { kind: 'encounter' }> {
  return {
    kind: 'encounter',
    id,
    strain: strainFor(state, id, assisted),
    demo: firstTry(state, id),
    assisted,
  };
}

const RETRY = {
  now: 'Try again now.',
  nowOnce: 'One retry now; after that, win a monster fight before retrying.',
  wait: 'After a loss, win a monster fight before retrying.',
  day: 'One try per day. Rest at an inn to end the day.',
};

export function stakesCard(
  state: GameState,
  spec: ChallengeSpec,
  rewards: readonly Reward[],
): StakesCard {
  const flow = flowFor(spec);
  if (!flow) throw new Error('No M1 stakes for this challenge');
  const blocked = blockedReason(state, flow.id, flow.rules);
  const record = recordOf(state, flow.id);
  const blockedText =
    blocked === 'wait'
      ? 'Win a monster fight before trying again.'
      : blocked === 'day'
        ? 'Rest at an inn before trying again.'
        : null;
  if (spec.kind === 'lesson')
    return {
      win: `Learn or strengthen ${spellLabel(spec.spellId)}.`,
      objective: 'Break the mentor’s shield with the spell being taught, then win the fight.',
      fail: 'Regard falls. A spell you already know is sealed until you win its lesson or three monster fights. Only one spell can be sealed.',
      strain: 0,
      retry: RETRY.nowOnce,
      blockedReason: blockedText,
    };
  if (spec.kind !== 'encounter') throw new Error('Expected encounter');
  const def = encounterOf(spec.id);
  if (!def) throw new Error(`Unknown encounter: ${spec.id}`);
  const target =
    def.spec.verb === 'plant'
      ? def.spec.params.target + record.strain * def.spec.params.strainTarget
      : 0;
  const paidRewards = record.wins > 0 ? halfPay(rewards) : [...rewards];
  const rewardText = paidRewards
    .map((reward) => {
      switch (reward.kind) {
        case 'gil':
          return `${reward.amount} gil`;
        case 'item':
          return `${reward.count} ${ITEMS[reward.itemId]?.name ?? reward.itemId}`;
        case 'spell':
          return spellLabel(reward.spellId);
        case 'shop':
          return 'lower shop prices until you leave town (an Even keeps prices unchanged)';
        case 'flag':
          return reward.flag === 'cavePass' ? 'a pass into the caves' : 'story progress';
      }
    })
    .join(', ');
  const assist =
    assistOffered(state, flow.id, flow.rules) && def.assist
      ? {
          mentorId: def.assist.mentorId,
          label: `With ${MENTORS[def.assist.mentorId]?.name ?? def.assist.mentorId}’s help (gil kept; no bonus or regard).`,
        }
      : undefined;
  const person = NPCS[spec.id];
  const current = regardOf(state, spec.id);
  const peak = state.regardPeak[spec.id] ?? current;
  const after =
    record.wins === 0 || def.spec.verb === 'duel'
      ? Math.min(STAKES.regardMax, current + STAKES.regardWin)
      : Math.max(current, Math.min(peak, current + STAKES.regardRestore));
  const attitude = person ? attitudeOf(state.hero, person, current) : null;
  const next = person ? attitudeOf(state.hero, person, after) : null;
  return {
    win: `${def.spec.verb === 'duel' && !rewardText ? 'Lower shop prices until you leave town (an Even keeps prices unchanged). ' : ''}${rewardText ? rewardText + '. ' : ''}${def.world.win.text}.`,
    rewards: paidRewards,
    ...(def.great ? { great: def.great } : {}),
    regard: { current, after, warmer: next !== attitude ? next : null },
    objective: def.objective.replace('{target}', String(target)),
    fail:
      def.spec.verb === 'duel'
        ? `${def.failText}. Browse prices rise until you win a haggle or two days pass. ${def.strainText}; regard falls.`
        : `${def.failText}. ${def.strainText}; regard falls.`,
    strain: record.strain,
    retry:
      RETRY[def.retry] +
      (flow.rules.repeatable
        ? ' After a win, replay next day for half pay; regard can only recover.'
        : ''),
    blockedReason: blockedText,
    ...(assist ? { assist } : {}),
  };
}

const committed = new WeakSet<Battle>();
export function battleTryCommitted(battle: Battle): boolean {
  return committed.has(battle);
}

/** Called immediately before an actual post-demo player input, then saved by App. */
export function commitBattleTry(state: GameState, battle: Battle): boolean {
  if (committed.has(battle)) return true;
  if (battle.demoPlaying || battle.paused || battle.status !== 'ongoing') return false;
  const flow = flowFor(battle.spec);
  if (!flow) return true;
  if (state.pendingAttempt) return false;
  if (blockedReason(state, flow.id, flow.rules)) return false;
  if (
    battle.spec.kind === 'encounter' &&
    battle.spec.assisted &&
    !assistOffered(state, flow.id, flow.rules)
  )
    return false;
  beginTry(state, flow.id);
  if (battle.spec.kind === 'encounter' && battle.spec.assisted) {
    recordOf(state, flow.id).strain = 0;
  }
  state.pendingAttempt =
    battle.spec.kind === 'encounter'
      ? {
          kind: 'encounter',
          id: battle.spec.id,
          assisted: battle.spec.assisted,
          try: recordOf(state, flow.id).tries,
        }
      : battle.spec.kind === 'lesson'
        ? {
            kind: 'lesson',
            spellId: battle.spec.spellId,
            difficulty: battle.spec.difficulty,
            try: recordOf(state, flow.id).tries,
          }
        : null;
  committed.add(battle);
  battle.startPlay();
  return true;
}

function spellLabel(id: string): string {
  const spell = SPELLS[id];
  return spell ? spellName(spell) : id;
}

/** Accept only authored M1 descriptors tied to a recorded committed try. */
export function validPendingAttempt(value: unknown, state: GameState): PendingAttempt | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const pending = value as Record<string, unknown>;
  if (!Number.isSafeInteger(pending.try) || Number(pending.try) < 1) return null;
  let clean: PendingAttempt;
  let id: string;
  if (
    pending.kind === 'encounter' &&
    typeof pending.id === 'string' &&
    M1_IDS.has(pending.id) &&
    typeof pending.assisted === 'boolean'
  ) {
    const def = encounterOf(pending.id);
    if (!def || (pending.assisted && !def.assist)) return null;
    clean = {
      kind: 'encounter',
      id: pending.id,
      assisted: pending.assisted,
      try: Number(pending.try),
    };
    id = pending.id;
  } else if (pending.kind === 'lesson' && typeof pending.spellId === 'string') {
    const spell = SPELLS[pending.spellId];
    const mentor = MENTORS.hazel;
    if (
      !spell ||
      !mentor ||
      spell.category !== mentor.element ||
      pending.difficulty !==
        lessonDifficulty(spell, (state.hero.spells[pending.spellId]?.level ?? 0) + 1)
    )
      return null;
    clean = {
      kind: 'lesson',
      spellId: pending.spellId,
      difficulty: Number(pending.difficulty),
      try: Number(pending.try),
    };
    id = `lesson:hazel:${pending.spellId}`;
  } else return null;
  const attempt = recordOf(state, id);
  return attempt.tries === clean.try && attempt.playedDay === state.day ? clean : null;
}

/** A loaded committed try was abandoned: apply its ordinary give-up cost once. */
export function abandonPendingAttempt(state: GameState): void {
  const pending = state.pendingAttempt;
  if (!pending) return;
  state.pendingAttempt = null;
  if (pending.kind === 'encounter') {
    const spec = encounterSpec(state, pending.id, pending.assisted);
    const flow = flowFor(spec);
    if (!flow) return;
    const npc = NPCS[pending.id];
    const shop = npc?.rewards.find((reward) => reward.kind === 'shop');
    const shopId = npc?.shop ?? (shop?.kind === 'shop' ? shop.shopId : null);
    if (pending.id === 'stallKeeper' && shopId) {
      settleHaggle(state, pending.id, shopId, 'fail', DUEL_PRICES.walkOff);
    } else settle(state, flow.id, flow.rules, false, pending.assisted);
    return;
  }
  const spec = lessonSpec(state, 'hazel', {
    spellId: pending.spellId,
    level: (state.hero.spells[pending.spellId]?.level ?? 0) + 1,
    difficulty: pending.difficulty,
  });
  const flow = flowFor(spec);
  if (!flow) return;
  completeLesson(state.hero, spec, false);
  settle(state, flow.id, flow.rules, false);
}

/** The objective with its strain-dependent target, shared by board presentation. */
export function objectiveText(def: EncounterDef, strain: number): string {
  const target =
    def.spec.verb === 'plant'
      ? def.spec.params.target + strain * def.spec.params.strainTarget
      : null;
  return def.objective.replace('{target}', String(target));
}

export function worldState(
  state: Pick<GameState, 'encounters'>,
  id: string,
): 'win' | 'fail' | null {
  const record = recordOf(state, id);
  if (record.fails > 0) return 'fail';
  return record.wins > 0 ? 'win' : null;
}

export const REGION_FIXES: Readonly<Record<string, string>> = { grove: 'forager' };
export function regionFixed(state: Pick<GameState, 'encounters'>, region: string): boolean {
  const id = REGION_FIXES[region];
  return id !== undefined && recordOf(state, id).wins > 0;
}

/** Repeat rewards halve gil and item counts, without granting zero-sized rewards. */
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

/** Compatibility name for the M1 Hazel lesson record; later mentors retain legacy flow. */
export function lessonKey(spellId: string): string {
  return `lesson:hazel:${spellId}`;
}
