import { describe, expect, it } from 'vitest';
import { gravityInterval, lineClearPoints } from '../src/core/scoring';

describe('scoring', () => {
  it('rewards multi-line clears more than single clears', () => {
    expect(lineClearPoints(0)).toBe(0);
    expect(lineClearPoints(1)).toBe(200);
    expect(lineClearPoints(2)).toBe(600);
    expect(lineClearPoints(4)).toBe(2000);
  });

  it('speeds gravity up with level and caps it', () => {
    expect(gravityInterval(1)).toBe(720);
    expect(gravityInterval(2)).toBe(675);
    expect(gravityInterval(7)).toBe(450);
    expect(gravityInterval(13)).toBe(330);
    expect(gravityInterval(100)).toBe(120);
    expect(gravityInterval(0)).toBe(720);
  });
});
