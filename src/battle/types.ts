import type { Board, LockResult } from '../core/board';
import type { Rng } from '../core/rng';
import type { Hero } from '../game/hero';

export type BattleStatus = 'ongoing' | 'won' | 'lost';

export type Tone = 'info' | 'good' | 'bad';

export interface BattleEvent {
  readonly text: string;
  readonly tone: Tone;
}

/** What the player is trying to do, for the battle HUD. */
export interface Objective {
  readonly label: string;
  readonly detail: string;
  /** Completion in [0, 1]. */
  readonly progress: number;
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
  log(text: string, tone?: Tone): void;
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
