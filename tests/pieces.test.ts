import { describe, expect, it } from 'vitest';
import { PIECES, PIECE_NAMES, rotateClockwise, type Offset } from '../src/core/pieces';

const normalize = (cells: readonly Offset[]): string =>
  cells
    .map(([x, y]) => `${x},${y}`)
    .sort()
    .join(' ');

describe('pieces', () => {
  it('defines seven four-cell pieces with distinct colours', () => {
    expect(PIECE_NAMES).toHaveLength(7);
    for (const name of PIECE_NAMES) expect(PIECES[name].cells).toHaveLength(4);
    expect(new Set(PIECE_NAMES.map((n) => PIECES[n].color)).size).toBe(7);
  });

  it('rotating four times returns to the original shape', () => {
    for (const name of PIECE_NAMES) {
      let cells: readonly Offset[] = PIECES[name].cells;
      for (let i = 0; i < 4; i++) cells = rotateClockwise(cells);
      const shift = (c: readonly Offset[]) => {
        const minX = Math.min(...c.map(([x]) => x));
        const minY = Math.min(...c.map(([, y]) => y));
        return normalize(c.map(([x, y]): Offset => [x - minX, y - minY]));
      };
      expect(shift(cells)).toBe(shift(PIECES[name].cells));
    }
  });

  it('turns a horizontal I vertical', () => {
    const xs = new Set(rotateClockwise(PIECES.I.cells).map(([x]) => x));
    expect(xs.size).toBe(1);
  });
});
