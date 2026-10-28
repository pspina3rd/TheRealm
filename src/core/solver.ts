/**
 * The feasibility gate's tools (docs/ENCOUNTER_DESIGN.md §9 M0): a solver
 * for authored queues, which counts the solution classes of a board and a
 * fixed queue by drop-only placements, and a shape-fit check, which says
 * whether a zone can be tiled by drops of its wanted shape alone.
 */
import { landingsOf, type Landing, type LandingBoard } from './landing';
import type { Cell, PieceName } from './pieces';

/** How a solver search judges placements. */
export interface SolveRules {
  /** True when the board (after the last piece) is a solution. */
  readonly solved: (board: LandingBoard) => boolean;
  /** True when a landing can never lead to a solution (a fatal crack, a second wobble…). */
  readonly dead: (landing: Landing, path: readonly Landing[]) => boolean;
  /**
   * What makes two solutions the same, from the solved board (e.g. the
   * tower's picture, ignoring the toy box); by default the whole board.
   */
  readonly classOf?: (board: LandingBoard) => string;
}

export interface SolveResult {
  /** Distinct solution classes found (up to the cap). */
  readonly classes: readonly string[];
  /** One solution's placements, in queue order, or null if there is none. */
  readonly first: readonly Landing[] | null;
  /** Board states searched. */
  readonly searched: number;
}

const gridKey = (grid: readonly (readonly Cell[])[]): string =>
  grid.map((row) => row.map((c) => (c === null ? '.' : c[0])).join('')).join('/');

/**
 * Every way to place `queue` on `board` by drops (each rotation, each
 * column), depth first, skipping dead landings and states already seen.
 * Stops once `cap` solution classes are found.
 */
export function solveQueue(
  board: LandingBoard,
  queue: readonly PieceName[],
  rules: SolveRules,
  cap = 10,
): SolveResult {
  const classes = new Set<string>();
  const seen = new Set<string>();
  let first: Landing[] | null = null;
  let searched = 0;
  const classOf = rules.classOf ?? ((b: LandingBoard) => gridKey(b.grid));
  const search = (at: LandingBoard, index: number, path: Landing[]): void => {
    if (classes.size >= cap) return;
    const name = queue[index];
    if (name === undefined) {
      if (rules.solved(at)) {
        classes.add(classOf(at));
        first ??= path.slice();
      }
      return;
    }
    for (const landing of landingsOf(at, name)) {
      if (rules.dead(landing, path)) continue;
      const key = `${index}|${gridKey(landing.grid)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      searched++;
      const next: LandingBoard = { ...at, grid: landing.grid, tags: landing.tags };
      path.push(landing);
      search(next, index + 1, path);
      path.pop();
    }
  };
  search(board, 0, []);
  return { classes: [...classes], first, searched };
}

/**
 * True when drops of `shape` alone can fill a zone `width` columns wide
 * from its floor up to `rows` rows high (counted above any floor cells
 * already there, such as Bean's soil ridge, given in `floor` as column →
 * height). Pieces may poke above the zone's top row but not out of its
 * sides (§2, "fit the zone to the shape").
 */
export function shapeFits(
  shape: PieceName,
  width: number,
  rows: number,
  floor: Readonly<Record<number, number>> = {},
): boolean {
  const height = rows + 4;
  const grid: Cell[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ((floor[x] ?? 0) > height - 1 - y ? 'neutral' : null)),
  );
  const zone = (g: readonly (readonly Cell[])[]): boolean =>
    g.slice(height - rows).every((row) => row.every((c) => c !== null));
  const seen = new Set<string>();
  const board = (g: Cell[][]): LandingBoard => ({
    grid: g,
    tags: g.map((row) => row.map(() => null)),
    width,
    height,
    clearsEnabled: false,
  });
  const holes = (g: readonly (readonly Cell[])[]): boolean => {
    for (let x = 0; x < width; x++) {
      let covered = false;
      for (const row of g) {
        if (row[x] !== null) covered = true;
        else if (covered) return true;
      }
    }
    return false;
  };
  const search = (g: Cell[][], depth: number): boolean => {
    if (zone(g)) return true;
    if (depth > (width * rows) / 4 + 2) return false;
    for (const landing of landingsOf(board(g), shape)) {
      if (holes(landing.grid)) continue;
      const key = gridKey(landing.grid);
      if (seen.has(key)) continue;
      seen.add(key);
      if (search(landing.grid, depth + 1)) return true;
    }
    return false;
  };
  return search(grid, 0);
}
