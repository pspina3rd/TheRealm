import { scoreGrid } from '../core/bestFit';
import { landingsOf, type Landing, type LandingBoard } from '../core/landing';
import type { Cell, PieceName } from '../core/pieces';

/** A piece already on its way: its shape and its cells' colours. */
export interface ComingPiece {
  readonly name: PieceName;
  readonly colors: readonly Cell[];
}

/**
 * The best landing of any of `shapes` on the board: a tidy stacker's
 * judgement (`scoreGrid`) plus the challenge's placement hint. The
 * threshold assist tosses its shape (steered by the hint, §3.4); the sim's
 * bots plan with the same hint. Null if no shape can enter the board, or
 * if `coming` (the piece the bag already dealt) does at least as well: the
 * mentor only swaps a piece for a better one, so the assist never hurts.
 */
export function steeredLanding(
  board: LandingBoard,
  shapes: readonly PieceName[],
  hint: ((landing: Landing) => number) | undefined,
  coming?: ComingPiece,
): Landing | null {
  const value = (landing: Landing): number =>
    scoreGrid(landing.grid, landing.lines) + (hint?.(landing) ?? 0);
  let best: { landing: Landing; score: number } | null = null;
  for (const name of shapes) {
    for (const landing of landingsOf(board, name)) {
      const score = value(landing);
      if (!best || score > best.score) best = { landing, score };
    }
  }
  if (best && coming) {
    const kept = Math.max(-Infinity, ...landingsOf(board, coming.name, coming.colors).map(value));
    if (kept >= best.score) return null;
  }
  return best?.landing ?? null;
}
