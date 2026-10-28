/**
 * The encounter foundations on the board (docs/ENCOUNTER_DESIGN.md §2,
 * "they share four systems"): cell tags that move with their cells, narrow
 * boards, boards whose lines never clear, and controlled queues.
 */
import { describe, expect, it } from 'vitest';
import { Board, spawnColumn } from '../src/core/board';
import { PIECES, type PieceName } from '../src/core/pieces';
import { createRng } from '../src/core/rng';
import { place } from './helpers';

const board = (width = 10, height = 20): Board => new Board(createRng(7), width, height);

describe('cell tags', () => {
  it('loads tagged cells from an encounter legend, and mold as violet and green', () => {
    const b = board(6);
    b.loadRows(['mm..mm', 'mmPm.m'], { P: { cell: 'stone', tag: 'target' } });
    expect(b.grid[19]?.[2]).toBe('stone');
    expect(b.tagAt(2, 19)).toBe('target');
    expect(b.tagged('target')).toEqual([[2, 19]]);
    expect(new Set(b.grid[18]?.filter((c) => c !== null))).toEqual(new Set(['violet', 'green']));
    expect(b.grid[18]?.[2]).toBeNull();
    // Reloading clears old tags.
    b.loadRows(['######']);
    expect(b.countTag('target')).toBe(0);
  });

  it('ignores tags set off the board', () => {
    const b = board();
    b.setTag(-1, 0, 'target');
    b.setTag(10, 0, 'target');
    b.setTag(0, 99, 'target');
    expect(b.countTag('target')).toBe(0);
    expect(b.tagAt(0, 99)).toBeNull();
  });

  it('moves tags down with their cells when lines clear, and reports cleared tags', () => {
    const b = board();
    // Row 18 holds a tagged cap above row 19, which an I will complete.
    b.loadRows(['o.ooooooo.', 'ooooooooo.']);
    b.setTag(3, 18, 'protected');
    b.setTag(5, 19, 'hazard');
    b.setFixedQueue(['I', 'O']);
    b.spawn();
    const { result } = place(b, 1, 9);
    expect(result.linesCleared).toBe(1);
    expect(result.clearedTags).toEqual({ hazard: 1 });
    expect(result.clearedRows[0]?.tags[5]).toBe('hazard');
    expect(result.clearedRows[0]?.cells[0]).toBe('orange');
    // The cap fell one row with its cell.
    expect(b.tagAt(3, 19)).toBe('protected');
    expect(b.countTag('protected')).toBe(1);
  });

  it('untags a cell a piece locks into, and lists where the piece locked', () => {
    const b = board();
    b.setTag(0, 19, 'target');
    b.setFixedQueue(['O']);
    b.spawn();
    const { result } = place(b, 0, 0);
    expect(result.placed).toEqual(
      expect.arrayContaining([
        [0, 18],
        [1, 18],
        [0, 19],
        [1, 19],
      ]),
    );
    expect(b.tagAt(0, 19)).toBeNull();
  });

  it('pushes tags up with a pushed row and drops them with bottom rows', () => {
    const b = board();
    b.setTag(4, 19, 'spore');
    b.pushRow(['stone', null, 'violet'], ['target']);
    expect(b.tagAt(4, 18)).toBe('spore');
    expect(b.tagAt(0, 19)).toBe('target');
    expect(b.grid[19]).toEqual(['stone', null, 'violet', null, null, null, null, null, null, null]);
    b.addGarbage(1);
    expect(b.tagAt(4, 17)).toBe('spore');
    expect(b.tagAt(0, 18)).toBe('target');
    b.removeBottomRows(2);
    expect(b.tagAt(4, 19)).toBe('spore');
    expect(b.countTag('target')).toBe(0);
    b.reset();
    expect(b.countTag('spore')).toBe(0);
  });

  it('tops out when a pushed row shoves blocks off the top', () => {
    const b = board(4, 4);
    b.grid[0] = ['stone', null, null, null];
    b.pushRow(['stone']);
    expect(b.toppedOut).toBe(true);
  });

  it('finds the top of the stack', () => {
    const b = board();
    expect(b.stackTop()).toBe(20);
    b.loadRows(['#.........', '##########']);
    expect(b.stackTop()).toBe(18);
  });
});

describe('narrow boards and boards that never clear', () => {
  it('spawns centred on a narrow board', () => {
    expect(spawnColumn(10)).toBe(3);
    expect(spawnColumn(6)).toBe(1);
    expect(spawnColumn(3)).toBe(0);
    const b = board(6);
    b.setFixedQueue(['T']);
    b.spawn();
    expect(b.active?.x).toBe(1);
    expect(b.spawnX).toBe(1);
  });

  it('keeps full lines when clears are off', () => {
    const b = board();
    b.clearsEnabled = false;
    b.loadRows(['######.###']);
    b.setFixedQueue(['I', 'O']);
    b.spawn();
    const { result } = place(b, 1, 6);
    expect(result.linesCleared).toBe(0);
    expect(result.clearedRows).toEqual([]);
    expect(b.grid[19]?.every((c) => c !== null)).toBe(true);
  });
});

describe('controlled queues', () => {
  it('slots every supplied piece into every window', () => {
    const b = board();
    b.supply = { window: 3, pieces: ['S'] };
    const names = b.preview(30);
    for (let w = 0; w < 10; w++) expect(names.slice(w * 3, w * 3 + 3)).toContain('S');
  });

  it('guarantees two shapes per window and still fills the rest from the bag', () => {
    const b = board();
    b.supply = { window: 4, pieces: ['J', 'T'] };
    const names = b.preview(400);
    for (let w = 0; w < 100; w++) {
      const window = names.slice(w * 4, w * 4 + 4);
      expect(window).toContain('J');
      expect(window).toContain('T');
    }
    expect(new Set(names)).toEqual(new Set(Object.keys(PIECES) as PieceName[]));
  });

  it('fills a window with supplied pieces alone when it is no wider', () => {
    const b = board();
    b.supply = { window: 1, pieces: ['O', 'I'] };
    expect(b.preview(4)).toEqual(expect.arrayContaining(['O', 'I']));
  });
});
