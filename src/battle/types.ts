import type { Board, CellTally, LockResult } from '../core/board';
import type { Element } from '../core/elements';
import type { PieceName } from '../core/pieces';
import type { EnemyMove, ElementAmounts } from '../data/types';
import type { Rng } from '../core/rng';
import type { Hero } from '../game/hero';

export type BattleStatus = 'ongoing' | 'won' | 'lost';

/**
 * Something that happened in a battle, for the screen to show (flashes,
 * effects, floating numbers). Events carry data, not text.
 */
export type BattleEvent =
  /** Lines cleared: their board rows (before collapsing) and contents. */
  | {
      readonly kind: 'lines';
      readonly rows: readonly number[];
      readonly lines: readonly CellTally[];
    }
  /** Mana gained from cleared crystals or effects. */
  | { readonly kind: 'mana'; readonly gained: ElementAmounts }
  /** A cleared line's strongest element fired. `row` is where the line was. */
  | {
      readonly kind: 'surge';
      readonly element: Element;
      readonly power: number;
      readonly row: number;
    }
  /** The enemy took damage. `affinity` says if the element was a weakness or resisted. */
  | {
      readonly kind: 'enemyHit';
      readonly amount: number;
      readonly element: Element | null;
      readonly affinity: 'weak' | 'resist' | null;
    }
  | { readonly kind: 'enemyDefeated' }
  /** The next strike is critical (Luck); the hit that follows is already doubled. */
  | { readonly kind: 'crit' }
  /** The enemy used a move (its name is shown as a banner, as in classic RPGs). */
  | { readonly kind: 'enemyMove'; readonly move: EnemyMove }
  /** The enemy's move fizzled in the hero's Mist. */
  | { readonly kind: 'fizzle'; readonly move: EnemyMove }
  /** A mentor tossed the hero a piece in their element's colour (a lesson). */
  | { readonly kind: 'toss'; readonly element: Element; readonly piece: PieceName }
  | { readonly kind: 'enemyHeal'; readonly amount: number }
  | { readonly kind: 'heroHit'; readonly amount: number }
  | { readonly kind: 'heroHeal'; readonly amount: number }
  /** The earth ward changed (`total` is the new size). */
  | { readonly kind: 'ward'; readonly total: number }
  | { readonly kind: 'chill' }
  | { readonly kind: 'tailwind'; readonly pieces: number }
  | { readonly kind: 'haste'; readonly pieces: number }
  | { readonly kind: 'curse'; readonly rows: number }
  | { readonly kind: 'drain'; readonly element: Element; readonly amount: number }
  | { readonly kind: 'spell'; readonly spellId: string }
  | { readonly kind: 'item'; readonly itemId: string }
  | { readonly kind: 'overflow' }
  | { readonly kind: 'revive' }
  /** A haggle price moved. */
  | { readonly kind: 'price'; readonly multiplier: number };

/** An event with its position in the battle, so the screen can play each one once. */
export interface NumberedEvent {
  readonly seq: number;
  readonly event: BattleEvent;
}

/** A count toward a goal, e.g. crystals collected or lines cleared. */
export interface Tally {
  readonly have: number;
  readonly want: number;
}

/** What the player is trying to do, as data for the battle screen to draw. */
export interface Objective {
  /** Short name for screen readers, e.g. "Barter crystals". */
  readonly label: string;
  /** Completion in [0, 1]. */
  readonly progress: number;
  /** Pieces left before the challenge ends, or null if unlimited. */
  readonly piecesLeft: number | null;
  /** Crystals wanted per element (barter). */
  readonly crystals?: readonly (Tally & { readonly element: Element })[];
  /** Points scored toward a target (offering). */
  readonly score?: Tally;
  /** Lines cleared toward a target (puzzle). */
  readonly lines?: Tally;
  /** Current price multiplier and its bounds (haggle). */
  readonly price?: { readonly value: number; readonly min: number; readonly max: number };
}

/** The parts of a running battle that challenge rules may read or change. */
export interface BattleContext {
  readonly board: Board;
  readonly hero: Hero;
  readonly rng: Rng;
  readonly score: number;
  /** Pieces remaining with doubled gravity (set by enemy haste). */
  hastePieces: number;
  /** Pieces remaining with slowed gravity (set by wind). */
  slowPieces: number;
  emit(event: BattleEvent): void;
}

/**
 * The rules layer of a battle. The `Battle` runner handles movement, gravity
 * and scoring; a challenge decides what clears mean and when the battle ends.
 */
export interface Challenge {
  /** Called after every piece locks. */
  onLock(result: LockResult): void;
  /** Called every frame while the battle is ongoing. */
  update(dtMs: number): void;
  status(): BattleStatus;
  objective(): Objective;
}

/** Pieces remaining before a piece-limited challenge runs out. */
export function piecesLeft(ctx: BattleContext, pieceLimit: number): number {
  return Math.max(0, pieceLimit - ctx.board.piecesPlaced);
}
