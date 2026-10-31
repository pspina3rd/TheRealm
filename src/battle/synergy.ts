import type { Element } from '../core/elements';
import { JOINT_SPELLS, SYNERGY, isSynergyMentor } from '../data/synergy';
import type { SynergyMentorId, SynergyRuleId } from '../data/synergy';

/** Explicit opt-in; no save flag, ability awakening, or AUTO spell implies this. */
export type SynergyEncounter =
  | {
      readonly kind: 'lesson';
      readonly enabled: boolean;
      readonly mapId: string;
      readonly mentorId: string;
      readonly difficulty: number;
    }
  | { readonly kind: 'moon-wyrm' | 'threshold-assist' | 'allied-boss' | 'other' };

export interface SynergyState {
  readonly mentorId: SynergyMentorId;
  readonly difficulty: number;
  readonly meter: number;
  readonly used: boolean;
  readonly latestTossId: string | null;
}

/** null means this encounter cannot gain or cast synergy in M2a. */
export function createSynergy(encounter: SynergyEncounter): SynergyState | null {
  if (
    encounter.kind !== 'lesson' ||
    !encounter.enabled ||
    encounter.mapId === 'mossvale' ||
    !isSynergyMentor(encounter.mentorId) ||
    !Number.isSafeInteger(encounter.difficulty) ||
    encounter.difficulty < 1
  )
    return null;
  return {
    mentorId: encounter.mentorId,
    difficulty: encounter.difficulty,
    meter: 0,
    used: false,
    latestTossId: null,
  };
}

/** Track an actual replacement toss, using a fight-local identity, not its colour. */
export function noteSynergyToss(state: SynergyState, tossId: string): SynergyState {
  return state.used ? state : { ...state, latestTossId: tossId };
}

function gain(state: SynergyState, amount: number): SynergyState {
  return state.used || amount === 0
    ? state
    : { ...state, meter: Math.min(SYNERGY.maximum, state.meter + amount) };
}

export interface SynergyLock {
  /** One entry per cleared line that actually fired a surge, in line order. */
  readonly surges: readonly Element[];
  /** Cells from the same latest toss, aggregated across this lock's cleared rows. */
  readonly clearedToss?: { readonly tossId: string; readonly cells: number };
}

/** Call once per resolved lock. Colour alone never identifies a mentor's toss. */
export function gainSynergyFromLock(state: SynergyState, lock: SynergyLock): SynergyState {
  const element = JOINT_SPELLS[state.mentorId].element;
  const lines = lock.surges.filter((surge) => surge === element).length;
  const toss = lock.clearedToss;
  const helped =
    toss !== undefined &&
    state.latestTossId !== null &&
    toss.tossId === state.latestTossId &&
    Number.isSafeInteger(toss.cells) &&
    toss.cells >= SYNERGY.minimumTossCells;
  return gain(state, lines * SYNERGY.mentorSurge + (helped ? SYNERGY.latestTossLock : 0));
}

/** Call only for an actual reaction (not each surge); either side counts once. */
export function gainSynergyFromReaction(
  state: SynergyState,
  reaction: { readonly primer: Element; readonly trigger: Element },
): SynergyState {
  const element = JOINT_SPELLS[state.mentorId].element;
  return gain(
    state,
    reaction.primer === element || reaction.trigger === element ? SYNERGY.mentorReaction : 0,
  );
}

export interface SynergyCastContext {
  readonly source: 'portrait-tap' | 'auto' | 'spell-slot' | 'weaving';
  readonly shieldUp: boolean;
  /** False during pre-roll, pause, playback, or after the fight ends. */
  readonly canAct: boolean;
}

export type SynergyCastBlock =
  'unavailable' | 'manual-only' | 'inactive' | 'used' | 'shield' | 'charging';

export function synergyCastEligibility(
  state: SynergyState | null,
  context: SynergyCastContext,
): SynergyCastBlock | null {
  if (!state) return 'unavailable';
  if (context.source !== 'portrait-tap') return 'manual-only';
  if (!context.canAct) return 'inactive';
  if (state.used) return 'used';
  if (context.shieldUp) return 'shield';
  return state.meter < SYNERGY.maximum ? 'charging' : null;
}

export type SynergyIntent =
  | { readonly kind: 'damage'; readonly element: Element; readonly amount: number }
  | { readonly kind: 'gauge-cost'; readonly share: number }
  | {
      readonly kind: 'region-cleanse';
      readonly rule: SynergyRuleId;
      readonly maximumHazards: number;
      readonly delayPieces: number;
      readonly resetCounters: false;
      readonly affectSignatures: false;
    };

export type SynergyCastResult =
  | {
      readonly ok: false;
      readonly reason: SynergyCastBlock;
      readonly state: SynergyState | null;
      readonly intents: readonly [];
    }
  | { readonly ok: true; readonly state: SynergyState; readonly intents: readonly SynergyIntent[] };

/** Pure atomic transition. The adapter applies intents once; nothing here spends mana. */
export function castSynergy(
  state: SynergyState | null,
  context: SynergyCastContext,
): SynergyCastResult {
  const reason = synergyCastEligibility(state, context);
  if (reason || !state) return { ok: false, reason: reason ?? 'unavailable', state, intents: [] };
  const spell = JOINT_SPELLS[state.mentorId];
  return {
    ok: true,
    state: { ...state, meter: 0, used: true },
    intents: [
      {
        kind: 'damage',
        element: spell.element,
        amount: SYNERGY.baseDamage + SYNERGY.damagePerDifficulty * state.difficulty,
      },
      { kind: 'gauge-cost', share: SYNERGY.gaugeShare },
      {
        kind: 'region-cleanse',
        rule: spell.rule,
        maximumHazards: SYNERGY.hazardCap,
        delayPieces: SYNERGY.ruleDelayPieces,
        resetCounters: false,
        affectSignatures: false,
      },
    ],
  };
}
