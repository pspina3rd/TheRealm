import { Battle } from '../src/battle/battle';
import { Board } from '../src/core/board';
import type { Cell, PieceName } from '../src/core/pieces';
import { createRng } from '../src/core/rng';
import type { ChallengeSpec } from '../src/data/types';
import { createHero, type Hero } from '../src/game/hero';
import { newKnownSpell, type KnownSpell } from '../src/game/spells';

/** Known-spell records for `ids`, each at level 1 with no enhancements. */
export function knownSpells(...ids: readonly string[]): Record<string, KnownSpell> {
  return Object.fromEntries(ids.map((id) => [id, newKnownSpell()]));
}

export const SEED = 1234;

/** A row of `fill` with empty cells at `gaps`. */
export function rowWithGaps(width: number, gaps: readonly number[], fill: Cell = 'stone'): Cell[] {
  return Array.from({ length: width }, (_, x) => (gaps.includes(x) ? null : fill));
}

/**
 * Prepares a board so that hard-dropping the active piece clears `lines`
 * rows of `fill`: each row has a gap in column 0, and the active piece is a
 * vertical I moved against the left wall. The board's queue is left empty,
 * so use `forceQueue` to continue playing afterwards.
 */
export function setUpVerticalIClear(board: Board, lines: number, fill: Cell = 'stone'): void {
  board.grid = Board.emptyGrid(board.width, board.height);
  for (let i = 0; i < lines; i++) {
    board.grid[board.height - 1 - i] = rowWithGaps(board.width, [0], fill);
  }
  board.setFixedQueue(['I']);
  board.spawn();
  board.rotate();
  while (board.move(-1, 0));
}

/** Rotates the active piece `turns` times, moves it so its left edge is at `x`, and hard-drops. */
export function place(board: Board, turns: number, x: number) {
  for (let i = 0; i < turns; i++) board.rotate();
  const piece = board.active;
  if (!piece) throw new Error('No active piece');
  const minX = Math.min(...piece.cells.map(([cx]) => cx));
  const target = x - minX;
  while (piece.x > target && board.move(-1, 0));
  while (piece.x < target && board.move(1, 0));
  if (piece.x !== target) throw new Error(`Could not move piece to x=${x}`);
  return board.hardDrop();
}

export function makeBattle(spec: ChallengeSpec, hero: Hero = createHero()): Battle {
  return new Battle(spec, hero, createRng(SEED));
}

/** Replaces a battle's upcoming pieces and respawns, keeping the grid. */
export function forceQueue(battle: Battle, names: readonly PieceName[]): void {
  battle.board.setFixedQueue(names);
  battle.board.active = null;
  battle.board.spawn();
}
