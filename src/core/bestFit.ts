/**
 * Finds the best-fitting piece for a board: every shape, in every distinct
 * rotation, dropped straight down in every column, scored by a simple
 * heuristic. Used by mentors, who toss the hero the piece that fits best.
 * Deterministic: shapes, rotations and columns are tried in a fixed order
 * and only a strictly better score replaces the best so far.
 */
import type { Cell, Offset, PieceName } from './pieces';
import { PIECES, PIECE_NAMES, rotateClockwise } from './pieces';

/**
 * Heuristic weights: complete lines up; covered holes, total column height
 * and bumpiness (height differences between neighbours) down.
 */
export const FIT_WEIGHTS = { lines: 0.76, holes: -0.36, height: -0.51, bumpiness: -0.18 } as const;

/** A landing spot for a piece: its shape, rotation (cells), column and row, and score. */
export interface Placement {
  readonly name: PieceName;
  readonly cells: readonly Offset[];
  readonly x: number;
  readonly y: number;
  /** Full lines the placement completes. */
  readonly lines: number;
  readonly score: number;
}

/**
 * The distinct rotations of a shape, starting with its spawn orientation,
 * each shifted so its top-left cell offsets are 0.
 */
export function rotationsOf(name: PieceName): Offset[][] {
  const rotations: Offset[][] = [];
  const keys = new Set<string>();
  let cells: readonly Offset[] = PIECES[name].cells;
  for (let i = 0; i < 4; i++) {
    const minY = Math.min(...cells.map(([, cy]) => cy));
    const normalized = cells.map(([cx, cy]): Offset => [cx, cy - minY]);
    const key = JSON.stringify([...normalized].sort());
    if (!keys.has(key)) {
      keys.add(key);
      rotations.push(normalized);
    }
    cells = rotateClockwise(cells);
  }
  return rotations;
}

/** Heights of each column (0 for empty) and the holes under them. */
function surface(grid: readonly (readonly Cell[])[]): { heights: number[]; holes: number } {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const heights: number[] = [];
  let holes = 0;
  for (let x = 0; x < width; x++) {
    let top = height;
    for (let y = 0; y < height; y++) {
      if (grid[y]?.[x] !== null) {
        top = Math.min(top, y);
      } else if (top < y) holes++;
    }
    heights.push(height - top);
  }
  return { heights, holes };
}

/** Scores a grid after a placement that completed `lines` lines (already removed). */
export function scoreGrid(grid: readonly (readonly Cell[])[], lines: number): number {
  const { heights, holes } = surface(grid);
  const total = heights.reduce((sum, h) => sum + h, 0);
  const bumpiness = heights
    .slice(1)
    .reduce((sum, h, i) => sum + Math.abs(h - (heights[i] ?? 0)), 0);
  return (
    FIT_WEIGHTS.lines * lines +
    FIT_WEIGHTS.holes * holes +
    FIT_WEIGHTS.height * total +
    FIT_WEIGHTS.bumpiness * bumpiness
  );
}

function fits(grid: readonly (readonly Cell[])[], cells: readonly Offset[], x: number, y: number) {
  const width = grid[0]?.length ?? 0;
  return cells.every(([cx, cy]) => {
    const gx = x + cx;
    const gy = y + cy;
    return gx >= 0 && gx < width && gy < grid.length && (gy < 0 || grid[gy]?.[gx] === null);
  });
}

/** Where `cells` lands when dropped from the top in column `x`, or null if it can't enter. */
function dropRow(grid: readonly (readonly Cell[])[], cells: readonly Offset[], x: number) {
  if (!fits(grid, cells, x, 0)) return null;
  let y = 0;
  while (fits(grid, cells, x, y + 1)) y++;
  return y;
}

/** Places `cells` (as stone) and removes full lines. */
function settle(
  grid: readonly (readonly Cell[])[],
  cells: readonly Offset[],
  x: number,
  y: number,
) {
  const next = grid.map((row) => row.slice());
  for (const [cx, cy] of cells) {
    const row = next[y + cy];
    if (row) row[x + cx] = 'stone';
  }
  const kept = next.filter((row) => row.some((cell) => cell === null));
  const lines = next.length - kept.length;
  const width = grid[0]?.length ?? 0;
  const empty = Array.from({ length: lines }, () => Array<Cell>(width).fill(null));
  return { grid: [...empty, ...kept], lines };
}

/**
 * The best placement of any of `shapes` on `grid`, or null if none can
 * enter the board.
 */
export function bestPlacement(
  grid: readonly (readonly Cell[])[],
  shapes: readonly PieceName[] = PIECE_NAMES,
): Placement | null {
  const width = grid[0]?.length ?? 0;
  let best: Placement | null = null;
  for (const name of shapes) {
    for (const cells of rotationsOf(name)) {
      const span = Math.max(...cells.map(([cx]) => cx)) + 1;
      for (let x = 0; x + span <= width; x++) {
        const y = dropRow(grid, cells, x);
        if (y === null) continue;
        const after = settle(grid, cells, x, y);
        const score = scoreGrid(after.grid, after.lines);
        if (!best || score > best.score) best = { name, cells, x, y, lines: after.lines, score };
      }
    }
  }
  return best;
}
