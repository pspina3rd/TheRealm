import { scoreGrid } from '../core/bestFit';
import { landingsOf, type Landing, type LandingBoard } from '../core/landing';
import type { PieceName } from '../core/pieces';

/**
 * The best landing of any of `shapes` on the board: a tidy stacker's
 * judgement (`scoreGrid`) plus the challenge's placement hint. The
 * threshold assist tosses its shape (steered by the hint, §3.4); the sim's
 * bots plan with the same hint. Null if no shape can enter the board.
 */
export function steeredLanding(
  board: LandingBoard,
  shapes: readonly PieceName[],
  hint: ((landing: Landing) => number) | undefined,
): Landing | null {
  let best: { landing: Landing; score: number } | null = null;
  for (const name of shapes) {
    for (const landing of landingsOf(board, name)) {
      const score = scoreGrid(landing.grid, landing.lines) + (hint?.(landing) ?? 0);
      if (!best || score > best.score) best = { landing, score };
    }
  }
  return best?.landing ?? null;
}
