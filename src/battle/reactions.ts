import type { CellTally, LockResult } from '../core/board';
import {
  colorOfElement,
  emptyCounts,
  pieceOfElement,
  type Element,
  type ElementCounts,
} from '../core/elements';
import type { PieceName } from '../core/pieces';
import {
  REACTION_IDS,
  REACTION_PARAMETERS as P,
  reactionAfter,
  type ReactionId,
} from '../data/reactions';
import type { EnemyDef } from '../data/types';
import { elementMultiplier, lineSurge } from './elemental';

/** Fight-local state. Persistent discoveries are deliberately separate. */
export interface ReactionState {
  readonly lock: number;
  readonly primer: { readonly element: Element; readonly piecesLeft: number } | null;
  readonly utilitiesUsed: readonly ReactionId[];
}

export function emptyReactionState(): ReactionState {
  return { lock: 0, primer: null, utilitiesUsed: [] };
}

export interface ReactionLine {
  /** Pre-collapse board coordinate; larger means nearer the bottom. */
  readonly row: number;
  readonly cells: CellTally;
}

export interface ReactionLock {
  /** Exactly one call per physical placement. Synthetic clears never age the window. */
  readonly source: 'lock' | 'auto' | 'manual' | 'weaving' | 'reaction';
  readonly mapId: string;
  readonly kind: 'combat' | 'lesson' | 'npc';
  readonly enabled: boolean;
  readonly lines: readonly ReactionLine[];
  readonly alignment?: Readonly<ElementCounts>;
}

export interface ReactionTrigger {
  readonly id: ReactionId;
  readonly name: string;
  readonly primer: Element;
  readonly element: Element;
  readonly row: number;
  /** All eligible successor-surge rows from this lock, bottom first. */
  readonly rows: readonly number[];
  /** Actual trigger-colour crystals, without alignment's surge-power bonus. */
  readonly crystals: number;
  readonly first: boolean;
}

export interface ReactionStep {
  readonly state: ReactionState;
  readonly reaction: ReactionTrigger | null;
}

/** Convert only the physical lock's own line tallies, not its emitted spell surges. */
export function reactionLines(result: Pick<LockResult, 'rows' | 'lines'>): ReactionLine[] {
  return result.lines.map((cells, index) => {
    const row = result.rows[index];
    if (row === undefined) throw new Error('Reaction line is missing its board row.');
    return { row, cells };
  });
}

/**
 * Freeze the previous lock's primer; choose the first eligible successor from
 * bottom to top. Other lines cannot create a same-lock chain. Without a
 * reaction the bottommost surge replaces the primer; an empty lock ages it.
 */
export function advanceReactions(state: ReactionState, input: ReactionLock): ReactionStep {
  if (input.source !== 'lock') return { state, reaction: null };
  const lock = state.lock + 1;
  if (!input.enabled || input.mapId === 'mossvale' || input.kind === 'npc')
    return { state: { ...state, lock, primer: null }, reaction: null };

  const alignment = input.alignment ?? emptyCounts();
  const surges = input.lines
    .map((line, index) => ({ ...line, index, surge: lineSurge(line.cells, alignment) }))
    .filter((line) => line.surge !== null)
    .sort((a, b) => b.row - a.row || a.index - b.index);
  const next = state.primer ? reactionAfter(state.primer.element) : null;
  const eligible =
    state.primer && state.primer.piecesLeft > 0 && next
      ? surges.filter((line) => line.surge?.element === next.trigger)
      : [];
  const selected = eligible[0];
  if (selected && next) {
    const first = !state.utilitiesUsed.includes(next.id);
    return {
      state: {
        lock,
        primer: { element: next.trigger, piecesLeft: P.windowPieces },
        utilitiesUsed: first ? [...state.utilitiesUsed, next.id] : [...state.utilitiesUsed],
      },
      reaction: {
        ...next,
        element: next.trigger,
        row: selected.row,
        rows: eligible.map((line) => line.row),
        crystals: eligible.reduce(
          (sum, line) => sum + (line.cells[colorOfElement(next.trigger)] ?? 0),
          0,
        ),
        first,
      },
    };
  }
  const bottom = surges[0]?.surge;
  const remaining = (state.primer?.piecesLeft ?? 0) - 1;
  return {
    state: {
      ...state,
      lock,
      primer: bottom
        ? { element: bottom.element, piecesLeft: P.windowPieces }
        : state.primer && remaining > 0
          ? { ...state.primer, piecesLeft: remaining }
          : null,
    },
    reaction: null,
  };
}

/** Frame glyph data, derived from the element even for dual/recoloured shapes. */
export function reactionPrimer(state: ReactionState): {
  element: Element;
  successor: Element;
  shape: PieceName;
  piecesLeft: number;
} | null {
  if (!state.primer) return null;
  const successor = reactionAfter(state.primer.element).trigger;
  return { ...state.primer, successor, shape: pieceOfElement(successor) };
}

export interface ReactionProtection {
  readonly signature?: boolean;
  readonly thresholdDefining?: boolean;
  readonly protected?: boolean;
}

export interface ReactionCell extends ReactionProtection {
  readonly x: number;
  /** Remaining cell's post-clear coordinate. */
  readonly y: number;
  readonly stone?: boolean;
  readonly hazard?: boolean;
}

export interface ReactionHex extends ReactionProtection {
  readonly id: string;
  readonly kind: 'fog' | 'haste' | 'quicken' | 'seal';
  readonly appliedAt: number;
}

export interface ReactionContext {
  readonly enemy: EnemyDef;
  readonly shieldUp: boolean;
  readonly boardHeight: number;
  readonly cells?: readonly ReactionCell[];
  readonly hexes?: readonly ReactionHex[];
  /** All rows cleared by the physical lock, not just successor-surge rows. */
  readonly clearedRows: readonly number[];
  readonly enemyGaugeMs: number;
  readonly nextMove?: ReactionProtection;
  /** Trigger strike before elemental affinity; it has already been applied normally. */
  readonly strike: { readonly baseDamage: number; readonly multiplier: number };
}

type NoClearRewards = {
  readonly mana: false;
  readonly strike: false;
  readonly autoBudget: false;
  readonly reactions: false;
};

/** Intents only: no Board/Hero mutation, cast, gauge spending, or new AUTO budget. */
export type ReactionEffect =
  | {
      readonly kind: 'damage';
      readonly element: Element;
      readonly amount: number;
      readonly affinity: 'spell';
    }
  | {
      readonly kind: 'removeStones';
      readonly cells: readonly (readonly [number, number])[];
      readonly rewards: NoClearRewards;
    }
  | { readonly kind: 'clearBottomRow'; readonly row: number; readonly rewards: NoClearRewards }
  | { readonly kind: 'delayEnemy'; readonly ms: number; readonly floorMs: number }
  | {
      readonly kind: 'mana';
      readonly gained: Readonly<Partial<Record<Element, number>>>;
      readonly source: 'earnedTriggerClear';
    }
  | { readonly kind: 'heal'; readonly amount: number }
  | {
      readonly kind: 'removeHazards';
      readonly cells: readonly (readonly [number, number])[];
      readonly resetsCounter: false;
    }
  | { readonly kind: 'cleanseHex'; readonly id: string }
  | { readonly kind: 'tailwind'; readonly pieces: number; readonly cleansesOtherHexes: false };

const NO_REWARDS: NoClearRewards = {
  mana: false,
  strike: false,
  autoBudget: false,
  reactions: false,
};
const unprotected = (value: ReactionProtection): boolean =>
  !value.signature && !value.thresholdDefining && !value.protected;

/** Invert normal row collapse, preserving the source coordinates used for the ±1 cap. */
export function rowBeforeReaction(y: number, clearedRows: readonly number[]): number | null {
  const cleared = new Set(clearedRows);
  for (let old = y; old >= 0; old--)
    if (!cleared.has(old) && old + [...cleared].filter((row) => row > old).length === y) return old;
  return null;
}

/** Decode a selected reaction after normal strike/surges, before any AUTO cast. */
export function reactionEffects(trigger: ReactionTrigger, ctx: ReactionContext): ReactionEffect[] {
  const effects: ReactionEffect[] = [];
  const damage = (amount: number, element: Element): void => {
    effects.push({
      kind: 'damage',
      element,
      amount: ctx.shieldUp
        ? 0
        : Math.max(0, Math.round(amount * elementMultiplier(ctx.enemy, element))),
      affinity: 'spell',
    });
  };
  const cells = ctx.cells ?? [];
  switch (trigger.id) {
    case 'conflagration': {
      damage(P.conflagration.baseDamage + P.conflagration.perCrystal * trigger.crystals, 'fire');
      if (trigger.first) {
        const stones = cells
          .filter((cell) => cell.stone && unprotected(cell))
          .sort((a, b) => a.y - b.y || a.x - b.x)
          .slice(0, P.conflagration.stones);
        effects.push({
          kind: 'removeStones',
          cells: stones.map((cell) => [cell.x, cell.y]),
          rewards: NO_REWARDS,
        });
      }
      break;
    }
    case 'eruption':
      damage(P.eruption.damage, 'earth');
      if (
        trigger.first &&
        !cells.some((cell) => cell.y === ctx.boardHeight - 1 && !unprotected(cell))
      )
        effects.push({ kind: 'clearBottomRow', row: ctx.boardHeight - 1, rewards: NO_REWARDS });
      break;
    case 'quagmire':
      if (trigger.first) {
        if (unprotected(ctx.nextMove ?? {})) {
          const ms = Math.max(
            0,
            Math.min(P.quagmire.delayMs, ctx.enemyGaugeMs - P.quagmire.gaugeFloorMs),
          );
          effects.push({ kind: 'delayEnemy', ms, floorMs: P.quagmire.gaugeFloorMs });
        }
      } else damage(P.quagmire.repeatDamage, 'water');
      break;
    case 'conduction': {
      const factor = trigger.first ? P.conduction.multiplier : P.conduction.repeatMultiplier;
      const current = ctx.strike.multiplier;
      const extra = Math.max(
        0,
        Math.min(P.conduction.totalMultiplierCap, current * factor) - current,
      );
      damage(ctx.strike.baseDamage * extra, 'lightning');
      break;
    }
    case 'overload':
      if (trigger.first)
        effects.push({
          kind: 'mana',
          gained: { lightning: P.overload.manaPerPool, arcane: P.overload.manaPerPool },
          source: 'earnedTriggerClear',
        });
      else damage(P.overload.repeatDamage, 'arcane');
      break;
    case 'witchbloom':
      effects.push({
        kind: 'heal',
        amount: trigger.first
          ? P.witchbloom.heal + P.witchbloom.perCrystal * trigger.crystals
          : P.witchbloom.repeatHeal,
      });
      if (trigger.first) {
        const hazards = cells
          .filter((cell) => {
            const old = rowBeforeReaction(cell.y, ctx.clearedRows);
            return (
              cell.hazard &&
              unprotected(cell) &&
              old !== null &&
              trigger.rows.some((row) => Math.abs(old - row) <= P.witchbloom.rowRadius)
            );
          })
          .sort((a, b) => b.y - a.y || a.x - b.x)
          .slice(0, P.witchbloom.tags);
        effects.push({
          kind: 'removeHazards',
          cells: hazards.map((cell) => [cell.x, cell.y]),
          resetsCounter: false,
        });
      }
      break;
    case 'seedstorm':
      if (trigger.first) {
        const oldest = (ctx.hexes ?? [])
          .filter(unprotected)
          .sort((a, b) => a.appliedAt - b.appliedAt || a.id.localeCompare(b.id))[0];
        if (oldest) effects.push({ kind: 'cleanseHex', id: oldest.id });
        effects.push({
          kind: 'tailwind',
          pieces: P.seedstorm.tailwindPieces,
          cleansesOtherHexes: false,
        });
      } else damage(P.seedstorm.repeatDamage, 'wind');
      break;
  }
  return effects;
}

/** Save-layer adapter shape only; battle windows and spent utilities never persist here. */
export interface ReactionDiscovery {
  readonly reactionsSeen: readonly ReactionId[];
}

export function sanitizeReactionDiscovery(value: unknown): ReactionDiscovery {
  const values = Array.isArray(value) ? value : [];
  return { reactionsSeen: REACTION_IDS.filter((id) => values.includes(id)) };
}

export function discoverReaction(seen: ReactionDiscovery, id: ReactionId): ReactionDiscovery {
  return sanitizeReactionDiscovery([...seen.reactionsSeen, id]);
}
