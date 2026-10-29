import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('produces different sequences for different seeds', () => {
    expect(createRng(1).next()).not.toEqual(createRng(2).next());
  });

  it('keeps next() in [0, 1) and int() in range', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const n = rng.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
      const k = rng.int(5);
      expect(Number.isInteger(k) && k >= 0 && k < 5).toBe(true);
    }
  });

  it('shuffle returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7];
    const output = createRng(3).shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect([...output].sort()).toEqual(input);
  });

  it('pick returns an element and rejects empty arrays', () => {
    const rng = createRng(9);
    expect(['a', 'b']).toContain(rng.pick(['a', 'b']));
    expect(() => rng.pick([])).toThrow();
  });
});
