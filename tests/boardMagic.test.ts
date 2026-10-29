import { describe, expect, it } from 'vitest';
import {
  emptyMagic,
  position,
  resolveMagic,
  type MagicState,
  type Obstruction,
} from '../src/core/boardMagic';
const obstruction = (strength = 2): Obstruction => ({
  id: 'o',
  owner: 'npc',
  strength,
  anchored: true,
  sequence: [],
  step: 0,
  contacts: [],
});
function put(s: MagicState, x: number, y: number, o = obstruction()): void {
  s.grid[y]![x] = 'stone';
  s.obstructions[position(x, y)] = o;
}
describe('board magic resolution', () => {
  it('keeps a durable obstruction while ordinary cells clear, then collapses its last clear', () => {
    const s = emptyMagic(3, 4);
    s.grid[3] = ['red', 'stone', 'blue'];
    s.grid[2]![0] = 'green';
    put(s, 1, 3);
    const a = resolveMagic(s);
    expect(a.state.grid[3]).toEqual([null, 'stone', null]);
    expect(a.state.obstructions['1,3']?.strength).toBe(1);
    expect(a.state.grid[2]![0]).toBe('green');
    expect(a.collapsedRows).toEqual([]);
    a.state.grid[3]![0] = 'gold';
    a.state.grid[3]![2] = 'cyan';
    const b = resolveMagic(a.state);
    expect(b.state.grid[3]).toEqual(['green', null, null]);
    expect(b.collapsedRows).toEqual([3]);
    expect(b.completed[0]?.cells).toEqual(['gold', 'stone', 'cyan']);
  });
  it('never repeatedly damages an all-obstruction full row without a fresh completion', () => {
    const s = emptyMagic(1, 3);
    put(s, 0, 2, obstruction(3));
    const a = resolveMagic(s);
    expect(a.state.obstructions['0,2']?.strength).toBe(2);
    expect(resolveMagic(a.state).state.obstructions['0,2']?.strength).toBe(2);
  });
  it('selects gravity source rows but lets the squares fall fully with their tags', () => {
    const s = emptyMagic(4, 7);
    s.grid[2]![0] = 'red';
    s.tags[2]![0] = 'target';
    s.grid[1]![1] = 'blue';
    put(s, 2, 2);
    const a = resolveMagic(s, { spell: { element: 'earth', rank: 1, bottomRow: 2 } });
    expect(a.state.grid[6]![0]).toBe('red');
    expect(a.state.tags[6]![0]).toBe('target');
    expect(a.state.grid[1]![1]).toBe('blue');
    expect(a.state.grid[2]![2]).toBe('stone');
    expect(s.grid[2]![0]).toBe('red');
  });
  it('uses one/two row and one/two strike progression and neutral conversions', () => {
    const s = emptyMagic(4, 5);
    put(s, 0, 4, obstruction(3));
    put(s, 1, 3, { ...obstruction(3), id: 'other' });
    const a = resolveMagic(s, { spell: { element: 'lightning', rank: 3, bottomRow: 4 } });
    expect(a.state.obstructions['0,4']?.strength).toBe(1);
    expect(a.state.obstructions['1,3']?.strength).toBe(3);
    const b = resolveMagic(a.state, { spell: { element: 'nature', rank: 1, bottomRow: 4 } });
    expect(b.state.grid[4]![0]).toBe('neutral');
    expect(b.state.obstructions['0,4']).toBeUndefined();
  });
  it('burns normal cells while leaving enemy obstructions, and Ice earns no colored cells', () => {
    const s = emptyMagic(4, 4);
    s.grid[3]![0] = 'red';
    put(s, 1, 3);
    const a = resolveMagic(s, { spell: { element: 'fire', rank: 1, bottomRow: 3 } });
    expect(a.state.grid[3]).toEqual([null, 'stone', null, null]);
    const b = resolveMagic(a.state, { spell: { element: 'water', rank: 1, bottomRow: 3 } });
    expect(b.completed[0]?.cells).toEqual(['neutral', null, 'neutral', 'neutral']);
    expect(b.state.obstructions['1,3']?.strength).toBe(1);
  });
  it('moves a wind row once from its leading edge, respecting walls and anchors', () => {
    const s = emptyMagic(5, 4);
    s.grid[3] = ['red', 'blue', null, 'stone', null];
    put(s, 3, 3);
    const a = resolveMagic(s, { spell: { element: 'wind', rank: 1, bottomRow: 3, direction: 1 } });
    expect(a.state.grid[3]).toEqual([null, 'red', 'blue', 'stone', null]);
  });
  it('requires fresh sequential contacts and respects marked sides', () => {
    const s = emptyMagic(4, 5);
    put(s, 1, 3, {
      ...obstruction(3),
      sequence: [
        { color: 'red', sides: ['left'] },
        { color: 'red', sides: ['left'] },
      ],
    });
    s.grid[3]![0] = 'red';
    const a = resolveMagic(s);
    expect(a.state.obstructions['1,3']?.step).toBe(1);
    const b = resolveMagic(a.state);
    expect(b.state.obstructions['1,3']?.step).toBe(1);
    const c = resolveMagic(b.state, { fresh: [[0, 3]] });
    expect(c.state.obstructions['1,3']).toBeUndefined();
  });
  it('settles unanchored owner obstructions and applies temporary red contact substitution', () => {
    const s = emptyMagic(4, 6);
    put(s, 1, 2);
    const a = resolveMagic(s, { settleOwners: ['npc'] });
    expect(a.state.obstructions['1,5']?.anchored).toBe(false);
    put(s, 2, 3, {
      ...obstruction(),
      id: 'color',
      sequence: [{ color: 'green', sides: ['left'] }],
    });
    s.grid[3]![1] = 'red';
    const b = resolveMagic(s, { redOwners: ['npc'] });
    expect(b.state.obstructions['2,3']).toBeUndefined();
  });
});

import { Board } from '../src/core/board';
import { createRng } from '../src/core/rng';
it('actual board locks preserve obstruction state and correction restores strength and contact progress', () => {
  const board = new Board(createRng(1), 4, 8);
  board.magicEnabled = true;
  board.grid[7] = ['red', 'stone', 'blue', null];
  board.obstructions['1,7'] = obstruction(3);
  board.spawn();
  board.replaceActive('I', {
    x: 3,
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
  });
  const before = board.checkpointLock()!;
  const result = board.hardDrop().result;
  expect(result.linesCleared).toBe(1);
  expect(board.obstructions['1,7']?.strength).toBe(2);
  board.restoreLock(before);
  expect(board.obstructions['1,7']?.strength).toBe(3);
  expect(board.grid[7]).toEqual(['red', 'stone', 'blue', null]);
  board.pushRow(['red', null, null, null]);
  expect(board.obstructions['1,6']?.strength).toBe(3);
  board.removeBottomRows(1);
  expect(board.obstructions['1,7']?.strength).toBe(3);
});
