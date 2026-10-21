import { describe, expect, it } from 'vitest';
import { describeSpec } from '../src/battle/describe';
import { makeBattle } from './helpers';

describe('describeSpec', () => {
  it('summarises every challenge kind', () => {
    expect(describeSpec({ kind: 'combat', enemyId: 'slime' })).toContain('clear lines to strike');
    expect(
      describeSpec({ kind: 'offering', itemId: 'wolfPelt', targetScore: 600, pieceLimit: 18 }),
    ).toBe(
      'Offering: score 600 points within 18 pieces to present your Wolf Pelt. You keep it if you fail.',
    );
    expect(describeSpec({ kind: 'barter', wants: { blue: 8, violet: 4 }, pieceLimit: 30 })).toBe(
      'Barter: clear 8 blue and 4 violet crystals within 30 pieces.',
    );
    expect(describeSpec({ kind: 'haggle', pieceLimit: 10, rivalIntervalMs: 2000 })).toContain(
      'over 10 pieces',
    );
    expect(describeSpec({ kind: 'puzzle', rows: [], queue: ['I', 'T'], linesToClear: 2 })).toBe(
      'Puzzle: clear 2 lines using only the 2 pieces given.',
    );
  });

  it('falls back to the raw id for unknown offering items', () => {
    expect(
      describeSpec({ kind: 'offering', itemId: 'mystery', targetScore: 1, pieceLimit: 1 }),
    ).toContain('your mystery');
  });

  it('opens every battle log with the rules', () => {
    const battle = makeBattle({ kind: 'haggle', pieceLimit: 3, rivalIntervalMs: 1000 });
    expect(battle.events.at(-1)?.text).toContain('Haggle:');
  });
});
