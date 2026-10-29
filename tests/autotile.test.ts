import { describe, expect, it } from 'vitest';
import { FULL_TILE, SHAPE_COUNT, blobTile } from '../src/ui/art/autotile';

/** Builds a neighbour predicate from a 3×3 picture ('#' = same terrain). */
const around =
  (rows: [string, string, string]) =>
  (dx: number, dy: number): boolean =>
    rows[dy + 1]![dx + 1] === '#';

describe('blobTile', () => {
  it('covers all 47 blob shapes', () => {
    expect(SHAPE_COUNT).toBe(47);
  });

  it('uses the full tile when surrounded', () => {
    expect(blobTile(() => true)).toEqual(FULL_TILE);
  });

  it('uses the isolated tile with no neighbours', () => {
    expect(blobTile(() => false)).toEqual([0, 3]);
  });

  it('picks end caps and straight runs', () => {
    expect(blobTile(around(['...', '.#.', '.#.']))).toEqual([0, 0]); // south only
    expect(blobTile(around(['.#.', '.#.', '.#.']))).toEqual([0, 1]); // vertical run
    expect(blobTile(around(['...', '###', '...']))).toEqual([2, 3]); // horizontal run
  });

  it('ignores a corner unless both adjacent edges match', () => {
    const withCorner = blobTile(around(['#..', '.#.', '...']));
    expect(withCorner).toEqual(blobTile(() => false));
  });

  it('distinguishes inner corners', () => {
    const missingNW = blobTile(around(['.##', '###', '###']));
    expect(missingNW).not.toEqual(FULL_TILE);
    expect(missingNW).not.toEqual(blobTile(around(['##.', '###', '###'])));
  });

  it('returns a tile for every possible neighbourhood', () => {
    for (let bits = 0; bits < 256; bits++) {
      const cells = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (bits >> i) & 1);
      // prettier-ignore
      const order: [number, number][] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
      expect(() =>
        blobTile((dx, dy) => cells[order.findIndex(([x, y]) => x === dx && y === dy)] === 1),
      ).not.toThrow();
    }
  });
});
