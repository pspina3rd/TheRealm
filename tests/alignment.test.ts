import { describe, expect, it } from 'vitest';
import { ELEMENTS, emptyCounts } from '../src/core/elements';
import {
  ALIGNMENT_TITLES,
  MAX_EXTRA_PIECES,
  MAX_SURGE_MULTIPLIER,
  POINTS_PER_EXTRA_PIECE,
  alignmentOf,
  extraPieces,
  surgeMultiplier,
  titleElementFor,
} from '../src/game/alignment';
import { INNER_RING, starSpikes } from '../src/ui/art/alignmentStar';

describe('alignmentOf', () => {
  it('counts each known spell toward its element', () => {
    expect(alignmentOf(['fire', 'meteor', 'cure'])).toEqual({
      ...emptyCounts(),
      fire: 2,
      nature: 1,
    });
  });

  it('ignores unknown spell ids', () => {
    expect(alignmentOf(['nope'])).toEqual(emptyCounts());
  });
});

describe('alignment effects', () => {
  it('strengthen line effects by 10% a point, capped', () => {
    expect(surgeMultiplier(0)).toBe(1);
    expect(surgeMultiplier(5)).toBeCloseTo(1.5);
    expect(surgeMultiplier(50)).toBe(MAX_SURGE_MULTIPLIER);
  });

  it('add a piece per few points, capped', () => {
    expect(extraPieces(POINTS_PER_EXTRA_PIECE - 1)).toBe(0);
    expect(extraPieces(POINTS_PER_EXTRA_PIECE)).toBe(1);
    expect(extraPieces(99)).toBe(MAX_EXTRA_PIECES);
  });

  it('title every element', () => {
    expect(Object.keys(ALIGNMENT_TITLES).sort()).toEqual([...ELEMENTS].sort());
  });
});

describe('titleElementFor', () => {
  it('switches only when another element is strictly ahead', () => {
    const tied = { ...emptyCounts(), earth: 2, fire: 2 };
    expect(titleElementFor('earth', tied)).toBe('earth');
    expect(titleElementFor('earth', { ...tied, fire: 3 })).toBe('fire');
  });
});

describe('alignment star geometry', () => {
  const layout = { cx: 100, cy: 100, radius: 50 };

  it('has one spike per element, the first pointing straight up', () => {
    const spikes = starSpikes(emptyCounts(), layout);
    expect(spikes.map((s) => s.element)).toEqual([...ELEMENTS]);
    expect(spikes[0]!.tip.x).toBeCloseTo(100);
    expect(spikes[0]!.tip.y).toBeCloseTo(100 - 50 * INNER_RING);
  });

  it('grows spikes with alignment up to the full radius', () => {
    const spikes = starSpikes({ ...emptyCounts(), fire: 4, water: 2 }, layout);
    const length = (i: number) => Math.hypot(spikes[i]!.tip.x - 100, spikes[i]!.tip.y - 100);
    expect(length(0)).toBeCloseTo(50);
    expect(length(1)).toBeCloseTo(10 + 40 * 0.5);
  });

  it('rescales when an alignment passes the full scale', () => {
    const spikes = starSpikes({ ...emptyCounts(), fire: 8, water: 4 }, layout);
    const length = (i: number) => Math.hypot(spikes[i]!.tip.x - 100, spikes[i]!.tip.y - 100);
    expect(length(0)).toBeCloseTo(50);
    expect(length(1)).toBeCloseTo(10 + 40 * 0.5);
  });

  it('puts labels just past the full radius', () => {
    const [first] = starSpikes(emptyCounts(), { ...layout, labelGap: 10 });
    expect(first!.label.y).toBeCloseTo(100 - 60);
  });
});
