/**
 * "Blob" autotiling for the Fantasy Dreamland terrain sheets.
 *
 * Each terrain in the sheets is a 12×4 block of 32px tiles covering every
 * combination of matching neighbours (47 shapes plus an empty tile). This
 * module picks the right tile for a cell from which of its eight neighbours
 * share its terrain.
 */

/** Neighbour bits. A corner only counts when both edges beside it also match. */
const NW = 1;
const N = 2;
const NE = 4;
const W = 8;
const E = 16;
const SW = 32;
const S = 64;
const SE = 128;

/**
 * The block layout, decoded from the key printed in the tile sheets. Each
 * entry lists a tile's 3×3 neighbourhood row by row (NW N NE / W C E /
 * SW S SE); `R` marks a matching neighbour.
 */
// prettier-ignore
const LAYOUT: readonly (readonly string[])[] = [
  ['....R..R.', '....RR.R.', '...RRR.R.', '...RR..R.', 'RR.RRR.R.', '...RRR.RR',
   '...RRRRR.', '.RRRRR.R.', '....RR.RR', '.R.RRRRRR', '...RRRRRR', '...RR.RR.'],
  ['.R..R..R.', '.R..RR.R.', '.R.RRR.R.', '.R.RR..R.', '.R..RR.RR', '.RRRRRRRR',
   'RR.RRRRRR', '.R.RR.RR.', '.RR.RR.RR', '.RRRRRRR.', '.........', 'RR.RRRRR.'],
  ['.R..R....', '.R..RR...', '.R.RRR...', '.R.RR....', '.RR.RR.R.', 'RRRRRR.RR',
   'RRRRRRRR.', 'RR.RR..R.', '.RRRRR.RR', 'RRRRRRRRR', 'RR.RRR.RR', 'RR.RR.RR.'],
  ['....R....', '....RR...', '...RRR...', '...RR....', '.R.RRRRR.', '.RRRRR...',
   'RR.RRR...', '.R.RRR.RR', '.RR.RR...', 'RRRRRR...', 'RRRRRR.R.', 'RR.RR....'],
];

/** Pattern cell order → neighbour bit (the centre, index 4, is not a neighbour). */
const CELL_BITS = [NW, N, NE, W, 0, E, SW, S, SE] as const;

function patternMask(pattern: string): number {
  return [...pattern].reduce(
    (mask, cell, i) => (cell === 'R' ? mask | (CELL_BITS[i] ?? 0) : mask),
    0,
  );
}

/** Neighbour mask → `[column, row]` within a 12×4 terrain block. */
const TILE_FOR_MASK = new Map<number, readonly [number, number]>();
LAYOUT.forEach((row, r) =>
  row.forEach((pattern, c) => {
    if (pattern.includes('R')) TILE_FOR_MASK.set(patternMask(pattern), [c, r]);
  }),
);

/** The block tile for a cell fully surrounded by its own terrain. */
export const FULL_TILE: readonly [number, number] = [9, 2];

/**
 * Returns the `[column, row]` within a terrain block for a cell, given a
 * predicate telling whether the neighbour at `(dx, dy)` has the same terrain.
 */
export function blobTile(matches: (dx: number, dy: number) => boolean): readonly [number, number] {
  const n = matches(0, -1);
  const s = matches(0, 1);
  const w = matches(-1, 0);
  const e = matches(1, 0);
  let mask = (n ? N : 0) | (s ? S : 0) | (w ? W : 0) | (e ? E : 0);
  if (n && w && matches(-1, -1)) mask |= NW;
  if (n && e && matches(1, -1)) mask |= NE;
  if (s && w && matches(-1, 1)) mask |= SW;
  if (s && e && matches(1, 1)) mask |= SE;
  const tile = TILE_FOR_MASK.get(mask);
  if (!tile) throw new Error(`No autotile for neighbour mask ${mask}`);
  return tile;
}

/** Number of distinct shapes in the layout (for tests). */
export const SHAPE_COUNT = TILE_FOR_MASK.size;
