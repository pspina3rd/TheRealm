import { describe, expect, it } from 'vitest';
import { Board } from '../src/core/board';
import { bestPlacement, rotationsOf, scoreGrid } from '../src/core/bestFit';
import { colorOfElement } from '../src/core/elements';
import { createRng } from '../src/core/rng';
import { SEED } from './helpers';

const board = (rows: string[]): Board => {
  const b = new Board(createRng(SEED));
  b.loadRows(rows);
  return b;
};

describe('bestPlacement', () => {
  it('picks a placement that completes a line', () => {
    // A row missing its last four cells: only a flat I finishes it.
    const best = bestPlacement(board(['######....']).grid);
    expect(best).toMatchObject({ name: 'I', x: 6, lines: 1 });
  });

  it('fills a well with a vertical I for four lines', () => {
    const rows = Array.from({ length: 4 }, () => '#########.');
    const best = bestPlacement(board(rows).grid);
    expect(best).toMatchObject({ name: 'I', x: 9, lines: 4 });
  });

  it('prefers a flat landing to one that leaves holes on an empty board', () => {
    const best = bestPlacement(board([]).grid)!;
    const after = board([]);
    expect(after.replaceActive(best.name, { cells: best.cells, x: best.x })).toBe(false); // no active piece yet
    after.spawn();
    expect(after.replaceActive(best.name, { cells: best.cells, x: best.x })).toBe(true);
    after.hardDrop();
    const holes = after.grid.some((row, y) =>
      row.some((cell, x) => cell === null && after.grid.slice(0, y).some((r) => r[x] !== null)),
    );
    expect(holes).toBe(false);
  });

  it('is deterministic', () => {
    const rows = ['##..#..###', '#.####.###'];
    expect(bestPlacement(board(rows).grid)).toEqual(bestPlacement(board(rows).grid));
  });

  it('can be limited to some shapes', () => {
    expect(bestPlacement(board([]).grid, ['O'])?.name).toBe('O');
  });

  it('returns null when nothing can enter the board', () => {
    const full = Array.from({ length: 20 }, () => '#########.');
    full[0] = '##########';
    expect(bestPlacement(board(full).grid)).toBeNull();
  });
});

describe('heuristic', () => {
  it('lists each distinct rotation once', () => {
    expect(rotationsOf('I')).toHaveLength(2);
    expect(rotationsOf('T')).toHaveLength(4);
    expect(rotationsOf('S')).toHaveLength(2);
  });

  it('rewards lines and punishes holes, height and bumps', () => {
    const empty = board([]).grid;
    const flat = board(['##........']).grid;
    const tall = board(['#.........', '#.........']).grid;
    const holed = board(['##........', '.#........']).grid;
    expect(scoreGrid(empty, 1)).toBeGreaterThan(scoreGrid(empty, 0));
    expect(scoreGrid(empty, 0)).toBeGreaterThan(scoreGrid(flat, 0));
    expect(scoreGrid(flat, 0)).toBeGreaterThan(scoreGrid(tall, 0));
    expect(scoreGrid(board(['##........', '##........']).grid, 0)).toBeGreaterThan(
      scoreGrid(holed, 0),
    );
  });
});

describe('colorOfElement', () => {
  it('gives the crystal colour of each element', () => {
    expect(colorOfElement('fire')).toBe('red');
    expect(colorOfElement('wind')).toBe('cyan');
  });
});
