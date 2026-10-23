import { describe, expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import { Board, DUAL_SPLIT, cellColors } from '../src/core/board';
import { ELEMENT_OF_COLOR, colorOfElement, relatedTo } from '../src/core/elements';
import { PIECES, PIECE_NAMES, type Offset } from '../src/core/pieces';
import { createRng } from '../src/core/rng';
import { featsOfLock } from '../src/game/feats';
import { createHero } from '../src/game/hero';
import { DUAL_BASE, DUAL_MAX, DUAL_PER_ELEMENT, dualChance } from '../src/game/pieceOdds';
import { lineSurge } from '../src/battle/elemental';
import { emptyCounts } from '../src/core/elements';
import { forceQueue, knownSpells, rowWithGaps } from './helpers';

const touching = (cells: readonly Offset[]): boolean => {
  const [a, b] = cells;
  return !!a && !!b && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
};

describe('dual pieces', () => {
  it('split every shape two and two, in touching halves (the T by its wings)', () => {
    for (const name of PIECE_NAMES) {
      const split = DUAL_SPLIT[name];
      const cells = PIECES[name].cells;
      const second = cells.filter((_, i) => split[i]);
      const own = cells.filter((_, i) => !split[i]);
      expect(second, name).toHaveLength(2);
      if (name === 'T') {
        expect(second).toEqual([
          [0, 1],
          [2, 1],
        ]);
      } else {
        expect(touching(second), name).toBe(true);
        expect(touching(own), name).toBe(true);
      }
    }
  });

  it('colours each cell: two-tone when dual, plain otherwise', () => {
    expect(cellColors({ name: 'Z', second: null })).toEqual(['red', 'red', 'red', 'red']);
    expect(cellColors({ name: 'Z', second: 'gold' })).toEqual(['red', 'red', 'gold', 'gold']);
  });

  it('draws the second colour from a related element, at the board’s chance', () => {
    const board = new Board(createRng(5));
    board.dualChance = 1;
    for (const piece of board.previewPieces(30)) {
      const own = ELEMENT_OF_COLOR[PIECES[piece.name].color];
      expect(relatedTo(own).map(colorOfElement)).toContain(piece.second);
    }
    const plain = new Board(createRng(5));
    expect(plain.previewPieces(30).every((p) => p.second === null)).toBe(true);
    // No chance means no extra rolls: the same seed gives the same shapes.
    expect(plain.preview(30)).toEqual(new Board(createRng(5)).preview(30));
  });

  it('never makes fixed-queue (puzzle) pieces dual', () => {
    const board = new Board(createRng(1));
    board.dualChance = 1;
    board.setFixedQueue(['I', 'O']);
    expect(board.previewPieces(2)).toEqual([
      { name: 'I', second: null },
      { name: 'O', second: null },
    ]);
  });

  it('spawns the queued split, keeps each cell’s colour through rotation, and locks per cell', () => {
    const board = new Board(createRng(9));
    board.dualChance = 1;
    const [next] = board.previewPieces(1);
    board.spawn();
    const piece = board.active!;
    expect(piece.second).toBe(next!.second);
    expect(piece.colors).toEqual(cellColors(next!));
    const before = piece.cells.map((c, i) => [c, piece.colors[i]]);
    board.rotate();
    // Same colour list, each still on the cell it started on (rotated).
    expect(board.active!.colors).toEqual(before.map(([, color]) => color));
    const active = board.active!;
    const y = board.ghostY();
    const landed = active.cells.map(([cx, cy]) => [active.x + cx, y + cy] as const);
    board.hardDrop();
    expect(landed.map(([gx, gy]) => board.grid[gy]![gx])).toEqual(piece.colors);
  });

  it('keeps a dual split through a Gust swap; a toss goes back plain', () => {
    const board = new Board(createRng(3));
    board.dualChance = 1;
    board.spawn();
    const first = board.active!;
    const [queued] = board.previewPieces(1);
    expect(board.swapWithNext()).toBe(true);
    expect(board.active!.second).toBe(queued!.second);
    expect(board.previewPieces(1)[0]).toEqual({ name: first.name, second: first.second });
    board.replaceActive('T', { color: 'red' });
    expect(board.active!.colors).toEqual(['red', 'red', 'red', 'red']);
    board.swapWithNext();
    expect(board.previewPieces(1)[0]).toEqual({ name: 'T', second: null });
  });

  it('gives each crystal its own element’s mana', () => {
    const battle = new Battle({ kind: 'combat', enemyId: 'shroom' }, createHero(), createRng(1));
    const board = battle.board;
    board.grid = Board.emptyGrid(board.width, board.height);
    for (let i = 0; i < 4; i++) board.grid[board.height - 1 - i] = rowWithGaps(10, [0], 'stone');
    forceQueue(battle, ['I']);
    board.replaceActive('I', { second: 'red' });
    board.rotate();
    while (board.move(-1, 0));
    battle.input('hardDrop');
    // Four lines: ×2 mana per crystal, two cyan (wind) and two red (fire).
    expect(battle.hero.mana.wind).toBe(4);
    expect(battle.hero.mana.fire).toBe(4);
  });

  it('makes pure lines and surges a colour-placement puzzle', () => {
    const line = { red: 7, gold: 3 };
    expect(
      featsOfLock(
        {
          linesCleared: 1,
          clearedCells: line,
          lines: [line],
          rows: [19],
          toppedOut: false,
          holesMade: 0,
        },
        false,
      ),
    ).toEqual(['pure.fire']);
    const split = { red: 6, gold: 4 };
    expect(
      featsOfLock(
        {
          linesCleared: 1,
          clearedCells: split,
          lines: [split],
          rows: [19],
          toppedOut: false,
          holesMade: 0,
        },
        false,
      ),
    ).toEqual([]);
    expect(lineSurge(split, emptyCounts())).toEqual({ element: 'fire', power: 6 });
  });

  it('arrive more often as the hero’s alignment spreads, up to a cap', () => {
    expect(dualChance(createHero())).toBe(DUAL_BASE);
    const spread = { spells: { ...knownSpells('fire', 'blizzard'), fire: { level: 2 } } } as never;
    expect(dualChance(spread)).toBeCloseTo(DUAL_BASE + DUAL_PER_ELEMENT);
    const all = {
      spells: Object.fromEntries(
        ['fire', 'blizzard', 'thunder', 'cure', 'quake', 'shadow', 'gale'].map((id) => [
          id,
          { level: 3 },
        ]),
      ),
    } as never;
    expect(dualChance(all)).toBe(DUAL_MAX);
  });

  it('shows two-tone pieces in the battle preview, and nothing in fog', () => {
    const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, createHero(), createRng(2), {
      dualChance: 1,
    });
    expect(battle.upcomingPieces.every((p) => p.second !== null)).toBe(true);
    expect(battle.upcoming).toEqual(battle.upcomingPieces.map((p) => p.name));
    battle.fogPieces = 1;
    expect(battle.upcomingPieces).toEqual([]);
  });
});
