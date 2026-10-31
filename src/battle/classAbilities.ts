/**
 * Bounded, pure per-battle class ability state. These functions only return
 * decisions/intents; no Board, Battle, scoring, input or feature gate is changed.
 */
import { abilityClassId, type AbilityClassId } from '../game/classAbilities';

/** The integration owner supplies CLASS_ABILITIES from balance.ts when enabled. */
export interface ClassAbilityRules {
  readonly breeze: { readonly safePlacements: number; readonly maxGlass: number };
  readonly bulwark: { readonly earthCrystals: number; readonly protectedNpcPushes: number };
  readonly pickpocket: { readonly minLines: number; readonly cooldownPieces: number };
  readonly sight: { readonly leadPieces: number; readonly extraDarkRows: number };
}

export interface ClassAbilityScope {
  readonly classId: string;
  readonly awakened: boolean;
  readonly mapId: string;
  readonly encounter: 'combat' | 'lesson' | 'npc';
  /** Legacy authored puzzles map to LOCK, not standard. */
  readonly board: 'standard' | 'LOCK' | 'BUILD';
}

export interface ClassAbilityState {
  readonly classId: AbilityClassId | null;
  readonly active: boolean;
  readonly npcEncounter: boolean;
  readonly rules: ClassAbilityRules;
  readonly lastLockPiece: number;
  readonly safePlacements: number;
  readonly breezeCharged: boolean;
  readonly bulwarkCharged: boolean;
  readonly npcPushes: number;
  readonly npcBlocks: number;
  readonly pickpocketReadyAt: number;
  readonly npcCancels: number;
  readonly cancelledTelegraphs: readonly string[];
}

/** Every caller must disclose protections; missing metadata is not permission. */
export interface AbilityEventProtection {
  readonly signature: boolean;
  readonly thresholdDefining: boolean;
}

export interface PickpocketTelegraph extends AbilityEventProtection {
  readonly id: string;
  readonly pickable: boolean;
  /** Normal announcement on spawn N, unaffected by Mage's earlier reveal. */
  readonly windowStartPiece: number;
}

export interface ClassAbilityLock {
  /** Absolute battle placement number, starting at 1. */
  readonly piece: number;
  readonly linesCleared: number;
  /** New covered holes from this placement only, never all existing holes. */
  readonly holesMade: number;
  /** Orange crystal count in each cleared line; dual halves count by colour. */
  readonly earthCrystalsByLine: readonly number[];
  readonly telegraphs?: readonly PickpocketTelegraph[];
}

export type ClassAbilityIntent =
  | {
      /** Resolve within this placement transaction using its newly covered holes. */
      readonly kind: 'fillNewHolesWithGlass';
      readonly piece: number;
      readonly count: number;
    }
  | {
      /** Presentation only: use PushAbilityDecision.rows for the actual row count. */
      readonly kind: 'blockPushedRow';
      readonly source: string;
      readonly count: 1;
    }
  | {
      /** Cancel this one event; no sends, mana, or other reward is implied. */
      readonly kind: 'cancelTelegraphedEvent';
      readonly eventId: string;
    };

export interface LockAbilityDecision {
  readonly state: ClassAbilityState;
  readonly intents: readonly ClassAbilityIntent[];
}

export interface AbilityRowPush extends AbilityEventProtection {
  readonly source: string;
  readonly rows: number;
  readonly blockable: boolean;
}

export interface PushAbilityDecision extends LockAbilityDecision {
  readonly rows: number;
}

function integer(value: number, min: number, max = Number.MAX_SAFE_INTEGER): boolean {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

/** Caps/protections cannot be relaxed accidentally through a tuning object. */
function validateRules(rules: ClassAbilityRules): void {
  if (
    !integer(rules.breeze.safePlacements, 1) ||
    !integer(rules.breeze.maxGlass, 0, 2) ||
    !integer(rules.bulwark.earthCrystals, 3) ||
    !integer(rules.bulwark.protectedNpcPushes, 2) ||
    !integer(rules.pickpocket.minLines, 3) ||
    !integer(rules.pickpocket.cooldownPieces, 10) ||
    !integer(rules.sight.leadPieces, 1, 2) ||
    !integer(rules.sight.extraDarkRows, 0, 1)
  ) {
    throw new Error('Class ability rules exceed the approved utility/protection bounds');
  }
}

/** A fresh battle never inherits a charge, streak, cooldown, or NPC allowance. */
export function createClassAbilityState(
  scope: ClassAbilityScope,
  rules: ClassAbilityRules,
): ClassAbilityState {
  validateRules(rules);
  const classId = abilityClassId(scope.classId);
  return {
    classId,
    active:
      classId !== null &&
      scope.awakened &&
      scope.mapId !== 'mossvale' &&
      scope.board === 'standard',
    npcEncounter: scope.encounter === 'npc',
    rules: {
      breeze: { ...rules.breeze },
      bulwark: { ...rules.bulwark },
      pickpocket: { ...rules.pickpocket },
      sight: { ...rules.sight },
    },
    lastLockPiece: 0,
    safePlacements: 0,
    breezeCharged: false,
    bulwarkCharged: false,
    npcPushes: 0,
    npcBlocks: 0,
    pickpocketReadyAt: 0,
    npcCancels: 0,
    cancelledTelegraphs: [],
  };
}

/** This does not widen for an early Mage reveal: only locks N and N+1 count. */
export function insidePickpocketWindow(event: PickpocketTelegraph, piece: number): boolean {
  return (
    integer(piece, 1) &&
    integer(event.windowStartPiece, 1) &&
    piece >= event.windowStartPiece &&
    piece <= event.windowStartPiece + 1
  );
}

/** Consume the one authoritative per-placement holes event and cleared-line tallies. */
export function onClassAbilityLock(
  state: ClassAbilityState,
  lock: ClassAbilityLock,
): LockAbilityDecision {
  if (
    !state.active ||
    !integer(lock.piece, 1) ||
    lock.piece <= state.lastLockPiece ||
    !integer(lock.linesCleared, 0) ||
    !integer(lock.holesMade, 0)
  )
    return { state, intents: [] };
  state = { ...state, lastLockPiece: lock.piece };
  if (state.classId === 'ranger') {
    const holes = integer(lock.holesMade, 0) ? lock.holesMade : 0;
    if (holes > 0) {
      const count = state.breezeCharged ? Math.min(holes, state.rules.breeze.maxGlass) : 0;
      return {
        state: { ...state, safePlacements: 0, breezeCharged: false },
        intents: count > 0 ? [{ kind: 'fillNewHolesWithGlass', piece: lock.piece, count }] : [],
      };
    }
    const safePlacements = Math.min(state.rules.breeze.safePlacements, state.safePlacements + 1);
    return {
      state: {
        ...state,
        safePlacements,
        breezeCharged: state.breezeCharged || safePlacements >= state.rules.breeze.safePlacements,
      },
      intents: [],
    };
  }
  if (state.classId === 'knight') {
    const earnsCharge = lock.earthCrystalsByLine
      .slice(0, lock.linesCleared)
      .some((crystals) => integer(crystals, state.rules.bulwark.earthCrystals));
    return {
      state: earnsCharge ? { ...state, bulwarkCharged: true } : state,
      intents: [],
    };
  }
  if (
    state.classId !== 'rogue' ||
    lock.linesCleared < state.rules.pickpocket.minLines ||
    lock.piece < state.pickpocketReadyAt ||
    (state.npcEncounter && state.npcCancels >= 1)
  ) {
    return { state, intents: [] };
  }
  const eligible = (lock.telegraphs ?? []).filter(
    (event) =>
      event.id !== '' &&
      event.pickable === true &&
      event.signature === false &&
      event.thresholdDefining === false &&
      !state.cancelledTelegraphs.includes(event.id) &&
      insidePickpocketWindow(event, lock.piece),
  );
  // Earliest resolution wins; equal windows keep the caller's stable order.
  const event = eligible.reduce<PickpocketTelegraph | undefined>(
    (first, next) => (!first || next.windowStartPiece < first.windowStartPiece ? next : first),
    undefined,
  );
  if (!event) return { state, intents: [] };
  return {
    state: {
      ...state,
      pickpocketReadyAt: lock.piece + state.rules.pickpocket.cooldownPieces,
      npcCancels: state.npcCancels + (state.npcEncounter ? 1 : 0),
      cancelledTelegraphs: [...state.cancelledTelegraphs, event.id],
    },
    intents: [{ kind: 'cancelTelegraphedEvent', eventId: event.id }],
  };
}

/** First two positive NPC push calls are protected, even if a call pushes several rows. */
export function onClassAbilityPush(
  state: ClassAbilityState,
  push: AbilityRowPush,
): PushAbilityDecision {
  const rows = integer(push.rows, 0) ? push.rows : 0;
  if (!state.active || state.classId !== 'knight' || rows === 0) {
    return { state, rows, intents: [] };
  }
  const next = { ...state, npcPushes: state.npcPushes + (state.npcEncounter ? 1 : 0) };
  const protectedNpcPush =
    state.npcEncounter && next.npcPushes <= state.rules.bulwark.protectedNpcPushes;
  if (
    !state.bulwarkCharged ||
    push.blockable !== true ||
    push.signature !== false ||
    push.thresholdDefining !== false ||
    protectedNpcPush ||
    (state.npcEncounter && state.npcBlocks >= 1)
  ) {
    return { state: next, rows, intents: [] };
  }
  return {
    state: {
      ...next,
      bulwarkCharged: false,
      npcBlocks: state.npcBlocks + (state.npcEncounter ? 1 : 0),
    },
    rows: rows - 1,
    intents: [{ kind: 'blockPushedRow', source: push.source, count: 1 }],
  };
}

export interface ArcaneSightIntent {
  /** Display lead only; the event's normal Pickpocket window is unchanged. */
  readonly leadPieces: number;
  readonly exactContainSpread: boolean;
  readonly extraDarkRows: number;
}

/** Read-only visibility guidance. It does not change input or hazard scheduling. */
export function classAbilitySight(
  state: ClassAbilityState,
  placementRelevant: boolean,
  normalLeadPieces = 1,
): ArcaneSightIntent {
  const active = state.active && state.classId === 'mage';
  return {
    leadPieces:
      active && placementRelevant
        ? Math.max(normalLeadPieces, state.rules.sight.leadPieces)
        : normalLeadPieces,
    exactContainSpread: active,
    extraDarkRows: active ? state.rules.sight.extraDarkRows : 0,
  };
}
