/**
 * Falling-block piece definitions.
 *
 * Each piece is a set of crystal cells of a single colour. Colours matter to
 * gameplay: barter challenges ask for crystals of specific colours, and each
 * colour is tied to a magic element.
 */

/** The seven crystal colours, one per piece shape. */
export const CRYSTAL_COLORS = ['cyan', 'gold', 'violet', 'green', 'red', 'blue', 'orange'] as const;
export type CrystalColor = (typeof CRYSTAL_COLORS)[number];

/**
 * A board cell: a crystal, an inert `stone` block (from enemy magic), a
 * `neutral` cell (inert: it never scores as any element, but clears with
 * its line like any other; Bean's soil ridges), or empty.
 */
export type Cell = CrystalColor | 'stone' | 'neutral' | null;

/** True for a crystal of an element (not stone, not neutral, not empty). */
export function isCrystal(cell: Cell): cell is CrystalColor {
  return cell !== null && cell !== 'stone' && cell !== 'neutral';
}

export type PieceName = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

/** A cell offset `[x, y]` relative to the piece origin. */
export type Offset = readonly [number, number];

export interface PieceDef {
  readonly name: PieceName;
  readonly color: CrystalColor;
  readonly cells: readonly Offset[];
}

export const PIECES: Readonly<Record<PieceName, PieceDef>> = {
  I: {
    name: 'I',
    color: 'cyan',
    cells: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  },
  O: {
    name: 'O',
    color: 'gold',
    cells: [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
  },
  T: {
    name: 'T',
    color: 'violet',
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  S: {
    name: 'S',
    color: 'green',
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
  },
  Z: {
    name: 'Z',
    color: 'red',
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
  J: {
    name: 'J',
    color: 'blue',
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  L: {
    name: 'L',
    color: 'orange',
    cells: [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
};

export const PIECE_NAMES = Object.keys(PIECES) as PieceName[];

/**
 * Rotates offsets 90° clockwise, then shifts them so the smallest x is 0.
 */
export function rotateClockwise(cells: readonly Offset[]): Offset[] {
  const maxY = Math.max(...cells.map(([, y]) => y));
  const rotated = cells.map(([x, y]): Offset => [maxY - y, x]);
  const minX = Math.min(...rotated.map(([x]) => x));
  return rotated.map(([x, y]): Offset => [x - minX, y]);
}
