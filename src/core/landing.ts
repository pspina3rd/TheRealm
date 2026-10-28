/**
 * Where a piece would land, and what the board would look like after, for
 * anything that plans placements: the mentor's toss and the threshold
 * assist (steered by a challenge's placement hint), the sim's bots and the
 * solver for authored queues. Pieces drop straight down (no slides or
 * spins under an overhang), as a player's drag-and-drop does.
 */
import type { Board, CellTag, ClearedRow } from './board';
import { rotationsOf } from './bestFit';
import type { Cell, Offset, PieceName } from './pieces';

/** A grid of cells, top row first. */
export type Grid = readonly (readonly Cell[])[];
/** A grid of tags, index-matched to a `Grid`. */
export type TagGrid = readonly (readonly (CellTag | null)[])[];

/** A drop-only landing of a piece and the board after it. */
export interface Landing {
  readonly name: PieceName;
  /** The rotation (cell offsets, top-left at 0). */
  readonly cells: readonly Offset[];
  /** The column of the piece's left edge, and the row of its origin where it landed. */
  readonly x: number;
  readonly y: number;
  /** The grid and tags after the lock and any clears. */
  readonly grid: Cell[][];
  readonly tags: (CellTag | null)[][];
  readonly lines: number;
  readonly clearedRows: readonly ClearedRow[];
  /** Where the piece's cells locked, as [x, y], before clears. */
  readonly placed: readonly (readonly [number, number])[];
}

/** The parts of a board a landing needs. */
export type LandingBoard = Pick<Board, 'grid' | 'tags' | 'width' | 'height' | 'clearsEnabled'> & {
  readonly seal?: Board['seal'];
};

function fits(
  board: LandingBoard,
  grid: Grid,
  cells: readonly Offset[],
  x: number,
  y: number,
): boolean {
  return cells.every(([cx, cy]) => {
    const gx = x + cx;
    const gy = y + cy;
    if (gx < 0 || gx >= board.width || gy >= board.height || gx === board.seal?.column)
      return false;
    return gy < 0 || grid[gy]?.[gx] === null;
  });
}

/**
 * The landing of `cells` (a rotation of `name`) dropped from the top at
 * column `x`, coloured `color` cell by cell, or null if it can't enter there.
 */
export function landingOf(
  board: LandingBoard,
  name: PieceName,
  cells: readonly Offset[],
  x: number,
  colors: readonly Cell[] = cells.map(() => 'stone'),
): Landing | null {
  if (!fits(board, board.grid, cells, x, 0)) return null;
  let y = 0;
  while (fits(board, board.grid, cells, x, y + 1)) y++;
  const grid = board.grid.map((row) => row.slice());
  const tags = board.tags.map((row) => row.slice());
  const placed: [number, number][] = [];
  cells.forEach(([cx, cy], i) => {
    const row = grid[y + cy];
    if (!row) return;
    row[x + cx] = colors[i] ?? 'stone';
    (tags[y + cy] as (CellTag | null)[])[x + cx] = null;
    placed.push([x + cx, y + cy]);
  });
  if (!board.clearsEnabled) return { name, cells, x, y, grid, tags, lines: 0, clearedRows: [], placed };
  const full = grid.map((row) => row.every((cell) => cell !== null));
  const clearedRows: ClearedRow[] = [];
  full.forEach((isFull, i) => {
    if (isFull) clearedRows.push({ cells: grid[i] as Cell[], tags: tags[i] as (CellTag | null)[] });
  });
  const lines = clearedRows.length;
  const width = board.width;
  return {
    name,
    cells,
    x,
    y,
    grid: [
      ...Array.from({ length: lines }, () => Array<Cell>(width).fill(null)),
      ...grid.filter((_, i) => !full[i]),
    ],
    tags: [
      ...Array.from({ length: lines }, () => Array<CellTag | null>(width).fill(null)),
      ...tags.filter((_, i) => !full[i]),
    ],
    lines,
    clearedRows,
    placed,
  };
}

/** Every drop-only landing of `name` on the board, each rotation in each column. */
export function landingsOf(
  board: LandingBoard,
  name: PieceName,
  colorsOf: (cells: readonly Offset[]) => readonly Cell[] = (cells) => cells.map(() => 'stone'),
): Landing[] {
  const out: Landing[] = [];
  for (const cells of rotationsOf(name)) {
    const span = Math.max(...cells.map(([cx]) => cx)) + 1;
    for (let x = 0; x + span <= board.width; x++) {
      const landing = landingOf(board, name, cells, x, colorsOf(cells));
      if (landing) out.push(landing);
    }
  }
  return out;
}

/** The board after a landing, as a `LandingBoard` to plan the next piece on. */
export function afterLanding(board: LandingBoard, landing: Landing): LandingBoard {
  return {
    grid: landing.grid,
    tags: landing.tags,
    width: board.width,
    height: board.height,
    clearsEnabled: board.clearsEnabled,
    seal: board.seal ?? null,
  };
}
