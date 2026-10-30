import { describe, it, expect } from 'vitest';
import { emptyMagic, resolveMagic, type BoardElement } from '../src/core/boardMagic';
describe('spell animation trace follows actual board mutations', () => {
  const cases = (
    ['fire', 'water', 'lightning', 'nature', 'earth', 'wind'] as BoardElement[]
  ).flatMap((element) => [1, 2, 3, 4].map((rank) => ({ element, rank })));
  it.each(cases)(
    '$element level $rank traces exact cell destinations, conversions and removals',
    ({ element, rank }) => {
      const before = emptyMagic(6, 10);
      before.grid[3]![1] = 'red';
      before.grid[4]![1] = 'red';
      before.grid[8]![2] = 'stone';
      before.obstructions['2,8'] = {
        id: 'enemy:1',
        owner: 'enemy',
        strength: 3,
        anchored: true,
        sequence: [],
        step: 0,
        contacts: [],
      };
      before.grid[9] = ['blue', 'blue', null, 'blue', 'blue', 'blue'];
      const result = resolveMagic(before, {
        spell: { element, rank, bottomRow: 9, direction: 1 },
      });
      const rendered = emptyMagic(6, 10).grid,
        intermediate = emptyMagic(6, 10).grid;
      expect(result.visual).toBeDefined();
      for (const actor of result.visual ?? []) {
        if (actor.to && actor.after) rendered[actor.to[1]]![actor.to[0]] = actor.after;
        if (actor.effectAt && actor.effectCell)
          intermediate[actor.effectAt[1]]![actor.effectAt[0]] = actor.effectCell;
      }
      expect(rendered).toEqual(result.state.grid);
      expect(intermediate).toEqual(result.effectState?.grid);
    },
  );
});
