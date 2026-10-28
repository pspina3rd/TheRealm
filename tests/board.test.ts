import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH, Board } from '../src/core/board';
import { createRng } from '../src/core/rng';
import { place, rowWithGaps, setUpVerticalIClear } from './helpers';

const newBoard = (): Board => new Board(createRng(1));

describe('Board', () => {
  it('starts empty with standard dimensions', () => {
    const board = newBoard();
    expect(board.width).toBe(BOARD_WIDTH);
    expect(board.height).toBe(BOARD_HEIGHT);
    expect(board.filledCount()).toBe(0);
    expect(board.active).toBeNull();
  });

  it('spawns pieces from a 7-bag so each bag holds every shape once', () => {
    const board = newBoard();
    const names = new Set<string>();
    for (let i = 0; i < 7; i++) {
      board.spawn();
      names.add(board.active?.name ?? '');
    }
    expect(names.size).toBe(7);
  });

  it('preview shows upcoming pieces without consuming them', () => {
    const board = newBoard();
    const [next] = board.preview(1);
    board.spawn();
    expect(board.active?.name).toBe(next);
  });

  it('moves within walls and refuses to leave the board', () => {
    const board = newBoard();
    board.setFixedQueue(['O']);
    board.spawn();
    let moves = 0;
    while (board.move(-1, 0)) moves++;
    expect(moves).toBeGreaterThan(0);
    expect(board.move(-1, 0)).toBe(false);
    expect(Math.min(...(board.active?.cells.map(([x]) => x + (board.active?.x ?? 0)) ?? []))).toBe(
      0,
    );
  });

  it('does not rotate the O piece', () => {
    const board = newBoard();
    board.setFixedQueue(['O']);
    board.spawn();
    expect(board.rotate()).toBe(false);
  });

  it('kicks a rotation away from the wall', () => {
    const board = newBoard();
    board.setFixedQueue(['I']);
    board.spawn();
    board.rotate(); // vertical
    while (board.move(1, 0));
    expect(board.rotate()).toBe(true); // horizontal again, kicked left
    const xs = board.active?.cells.map(([x]) => x + (board.active?.x ?? 0)) ?? [];
    expect(Math.max(...xs)).toBeLessThan(BOARD_WIDTH);
  });

  it('refuses a rotation when no kick fits', () => {
    const board = newBoard();
    board.setFixedQueue(['I']);
    board.spawn();
    board.rotate();
    // Wall the vertical I in on both sides so the horizontal form cannot fit.
    for (let y = 0; y < 6; y++) {
      board.grid[y] = rowWithGaps(BOARD_WIDTH, [board.active?.x ?? 0]);
    }
    expect(board.rotate()).toBe(false);
  });

  it('hard-drops to the ghost row and locks', () => {
    const board = newBoard();
    board.setFixedQueue(['O', 'O']);
    board.spawn();
    const ghost = board.ghostY();
    const { distance, result } = board.hardDrop();
    expect(distance).toBe(ghost);
    expect(result.linesCleared).toBe(0);
    expect(board.filledCount()).toBe(4);
    expect(board.piecesPlaced).toBe(1);
    expect(board.active?.name).toBe('O');
  });

  it('clears full lines and tallies cleared cells by colour', () => {
    const board = newBoard();
    setUpVerticalIClear(board, 4, 'red');
    const { result } = board.hardDrop();
    expect(result.linesCleared).toBe(4);
    expect(result.clearedCells).toEqual({ red: 36, cyan: 4 });
    expect(board.filledCount()).toBe(0);
  });

  it('keeps rows above a clear and shifts them down', () => {
    const board = newBoard();
    setUpVerticalIClear(board, 1);
    board.grid[BOARD_HEIGHT - 2] = rowWithGaps(BOARD_WIDTH, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const { result } = board.hardDrop();
    expect(result.linesCleared).toBe(1);
    // The partial row (one stone at x=9) plus three I cells remain.
    expect(board.grid[BOARD_HEIGHT - 1]?.[9]).toBe('stone');
  });

  it('step() moves down until it locks', () => {
    const board = newBoard();
    board.setFixedQueue(['O']);
    board.spawn();
    let steps = 0;
    let result = board.step();
    while (!result) {
      steps++;
      result = board.step();
    }
    expect(steps).toBe(BOARD_HEIGHT - 2);
    expect(result.linesCleared).toBe(0);
  });

  it('tops out when the next piece cannot spawn', () => {
    const board = newBoard();
    board.grid[0] = rowWithGaps(BOARD_WIDTH, []);
    expect(board.spawn()).toBe(false);
    expect(board.toppedOut).toBe(true);
  });

  it('stops spawning when a fixed queue runs out, without topping out', () => {
    const board = newBoard();
    board.setFixedQueue(['O']);
    board.spawn();
    expect(board.piecesRemaining).toBe(1);
    board.hardDrop();
    expect(board.active).toBeNull();
    expect(board.toppedOut).toBe(false);
    expect(board.piecesRemaining).toBe(0);
  });

  it('locking with no active piece changes nothing', () => {
    const board = newBoard();
    expect(board.lock()).toEqual({
      linesCleared: 0,
      clearedCells: {},
      lines: [],
      rows: [],
      toppedOut: false,
      holesMade: 0,
      placed: [],
      clearedTags: {},
      clearedRows: [],
    });
    expect(board.piecesPlaced).toBe(0);
  });

  it('reports which rows were cleared', () => {
    const board = newBoard();
    setUpVerticalIClear(board, 2);
    expect(board.hardDrop().result.rows).toEqual([BOARD_HEIGHT - 2, BOARD_HEIGHT - 1]);
  });

  it('reports infinite pieces when the queue is random', () => {
    expect(newBoard().piecesRemaining).toBe(Infinity);
  });

  it('adds garbage rows with one gap each', () => {
    const board = newBoard();
    board.addGarbage(2);
    for (const row of board.grid.slice(-2)) {
      expect(row.filter((c) => c === null)).toHaveLength(1);
      expect(row.filter((c) => c === 'stone')).toHaveLength(BOARD_WIDTH - 1);
    }
    expect(board.toppedOut).toBe(false);
  });

  it('tops out when garbage pushes blocks off the top', () => {
    const board = newBoard();
    board.grid[0] = rowWithGaps(BOARD_WIDTH, [0]);
    board.addGarbage(1);
    expect(board.toppedOut).toBe(true);
  });

  it('lifts the active piece when garbage rises into it', () => {
    const board = newBoard();
    board.setFixedQueue(['O']);
    board.spawn();
    while (board.move(0, 1));
    board.addGarbage(1);
    expect(board.collides(0, 0)).toBe(false);
  });

  it('removes bottom rows and returns what was removed', () => {
    const board = newBoard();
    board.grid[BOARD_HEIGHT - 1] = rowWithGaps(BOARD_WIDTH, [0], 'blue');
    const tally = board.removeBottomRows(1);
    expect(tally).toEqual({ blue: 9 });
    expect(board.filledCount()).toBe(0);
  });

  it('loads text rows at the bottom of the board', () => {
    const board = newBoard();
    board.loadRows(['r.b', '#']);
    expect(board.grid[BOARD_HEIGHT - 2]?.slice(0, 3)).toEqual(['red', null, 'blue']);
    expect(board.grid[BOARD_HEIGHT - 1]?.[0]).toBe('stone');
    expect(board.grid[BOARD_HEIGHT - 1]?.[1]).toBeNull();
  });

  it('reset clears the board and spawns a new piece', () => {
    const board = newBoard();
    board.addGarbage(3);
    board.toppedOut = true;
    board.reset();
    expect(board.filledCount()).toBe(0);
    expect(board.toppedOut).toBe(false);
    expect(board.active).not.toBeNull();
  });

  it('places pieces at a requested column with the place() helper', () => {
    const board = newBoard();
    board.setFixedQueue(['O']);
    board.spawn();
    place(board, 0, 8);
    expect(board.grid[BOARD_HEIGHT - 1]?.[8]).toBe('gold');
    expect(board.grid[BOARD_HEIGHT - 1]?.[9]).toBe('gold');
  });
});

describe('Board piece replacement', () => {
  it('replaces the falling piece with a recoloured, turned shape that locks in that colour', () => {
    const board = new Board(createRng(1));
    board.spawn();
    expect(board.active?.recolored).toBe(false);
    expect(
      board.replaceActive('I', {
        color: 'red',
        cells: [
          [0, 0],
          [0, 1],
          [0, 2],
          [0, 3],
        ],
        x: 0,
      }),
    ).toBe(true);
    expect(board.active).toMatchObject({ name: 'I', color: 'red', recolored: true, x: 0, y: 0 });
    board.hardDrop();
    expect(board.grid.slice(16).map((row) => row[0])).toEqual(['red', 'red', 'red', 'red']);
  });

  it('keeps the falling piece when the replacement does not fit', () => {
    const board = new Board(createRng(1));
    board.spawn();
    const before = board.active;
    expect(board.replaceActive('I', { x: 8 })).toBe(false);
    expect(board.active).toBe(before);
  });

  it('swaps the falling piece with the next one in the queue', () => {
    const board = new Board(createRng(1));
    board.setFixedQueue(['T', 'O', 'I']);
    board.spawn();
    expect(board.swapWithNext()).toBe(true);
    expect(board.active?.name).toBe('O');
    expect(board.preview(2)).toEqual(['T', 'I']);
  });

  it('cannot swap without a next piece or an active one', () => {
    const board = new Board(createRng(1));
    expect(board.swapWithNext()).toBe(false);
    board.setFixedQueue(['T']);
    board.spawn();
    expect(board.swapWithNext()).toBe(false);
  });

  it('cannot swap when the next piece would not fit', () => {
    const board = new Board(createRng(1));
    board.setFixedQueue(['I', 'O']);
    board.spawn();
    board.grid[0] = rowWithGaps(10, [3, 4, 5, 6]);
    board.grid[1] = rowWithGaps(10, [3, 4, 5, 6]);
    board.grid[0]![4] = 'stone';
    expect(board.swapWithNext()).toBe(false);
    expect(board.active?.name).toBe('I');
  });
});
