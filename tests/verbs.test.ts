/**
 * The encounter verbs (docs/ENCOUNTER_DESIGN.md §2, §6): DIG + rising,
 * BUILD, PLANT, DUEL (scripted), CONTAIN + protect and CHARGE, each on its
 * M1 board.
 */
import { describe, expect, it } from 'vitest';
import type { Battle } from '../src/battle/battle';
import type { BuildChallenge } from '../src/battle/verbs/build';
import type { ChargeChallenge } from '../src/battle/verbs/charge';
import { pureElement } from '../src/battle/verbs/charge';
import type { ContainChallenge } from '../src/battle/verbs/contain';
import type { DigChallenge } from '../src/battle/verbs/dig';
import type { DuelChallenge } from '../src/battle/verbs/duel';
import { DEMO_SEND_MS, gradeOf, rowsSent } from '../src/battle/verbs/duel';
import { encounterDef } from '../src/battle/verbs';
import type { PlantChallenge } from '../src/battle/verbs/plant';
import type { Cell } from '../src/core/pieces';
import { landingOf, landingsOf } from '../src/core/landing';
import { DUEL_PRICES, ENCOUNTERS } from '../src/data/balance';
import { EMPTY_LOCK, makeBattle } from './helpers';

/** An encounter's battle, without the demo unless asked. */
function encounter(id: string, strain = 0, demo = false): Battle {
  return makeBattle({ kind: 'encounter', id, strain, demo, assisted: false });
}

/** Turns the falling piece `turns` times, moves its left edge to `x` and hard-drops it. */
function drop(battle: Battle, turns: number, x: number): void {
  for (let i = 0; i < turns; i++) battle.input('rotate');
  const piece = battle.board.active!;
  const target = x - Math.min(...piece.cells.map(([cx]) => cx));
  for (let i = 0; i < 12 && piece.x > target; i++) battle.input('left');
  for (let i = 0; i < 12 && piece.x < target; i++) battle.input('right');
  battle.input('hardDrop');
}

/** A row of `fill` with gaps at the given columns. */
const row = (width: number, gaps: readonly number[], fill: Cell = 'stone'): Cell[] =>
  Array.from({ length: width }, (_, x) => (gaps.includes(x) ? null : fill));

describe('encounter definitions', () => {
  it('rejects an unknown encounter', () => {
    expect(() =>
      encounterDef({ kind: 'encounter', id: 'nobody', strain: 0, demo: false, assisted: false }),
    ).toThrow('Unknown encounter');
  });
});

describe('DIG + rising (Rowan’s well)', () => {
  it('lays the well out, six wide, the pipe tagged in row 1', () => {
    const battle = encounter('elder');
    const board = battle.board;
    expect(board.width).toBe(6);
    expect(board.tagged('target')).toEqual([[2, 19]]);
    const dig = battle.challenge as DigChallenge;
    expect(dig.rowsAbove()).toBe(4);
    expect(dig.objective()).toMatchObject({ counter: '4 rows to the pipe', piecesLeft: null });
    expect(dig.lipY).toBe(20 - ENCOUNTERS.elder.lip);
  });

  it('adds a debris row on top per strain step', () => {
    const dig = encounter('elder', 2).challenge as DigChallenge;
    expect(dig.rowsAbove()).toBe(6);
  });

  it('wins when the pipe’s row clears', () => {
    const battle = encounter('elder');
    const dig = battle.challenge as DigChallenge;
    dig.onLock({ ...EMPTY_LOCK, clearedTags: { target: 1 } });
    expect(dig.status()).toBe('won');
    expect(dig.objective()).toMatchObject({ counter: 'Clear!', progress: 1 });
  });

  it('loses when a cell locks over the lip, or on a top-out', () => {
    const battle = encounter('elder');
    const dig = battle.challenge as DigChallenge;
    dig.onLock({ ...EMPTY_LOCK, placed: [[0, dig.lipY - 1]] });
    expect(dig.status()).toBe('lost');
    const other = encounter('elder');
    other.board.toppedOut = true;
    expect(other.challenge.status()).toBe('lost');
  });

  it('pushes a mold row up every 6 pieces, sooner for each new buried hole, marked a piece ahead', () => {
    const battle = encounter('elder');
    const dig = battle.challenge as DigChallenge;
    expect(dig.untilRise).toBe(ENCOUNTERS.elder.risingEvery);
    dig.onLock({ ...EMPTY_LOCK, holesMade: 2 });
    expect(dig.untilRise).toBe(3);
    expect(dig.telegraphs()).toEqual([]);
    dig.onLock(EMPTY_LOCK);
    dig.onLock(EMPTY_LOCK);
    expect(dig.telegraphs()).toHaveLength(1);
    const target = battle.board.tagged('target')[0]!;
    dig.onLock(EMPTY_LOCK);
    expect(dig.untilRise).toBe(ENCOUNTERS.elder.risingEvery);
    // The pipe rose with its row.
    expect(battle.board.tagged('target')[0]).toEqual([target[0], target[1] - 1]);
    const kinds = battle.events.map((e) => e.event.kind);
    expect(kinds).toContain('rise');
    expect(battle.events.map((e) => e.event)).toContainEqual({ kind: 'beat', beat: 'hazard' });
    expect(dig.status()).toBe('ongoing');
  });

  it('loses when a rising row lifts the stack over the lip', () => {
    const battle = encounter('elder');
    const dig = battle.challenge as DigChallenge;
    battle.board.grid[dig.lipY] = row(6, [0]);
    dig.untilRise = 1;
    dig.onLock(EMPTY_LOCK);
    expect(dig.status()).toBe('lost');
  });

  it('counts no rows to a pipe that is gone', () => {
    const battle = encounter('elder');
    battle.board.loadRows(['mmmmm.']);
    expect((battle.challenge as DigChallenge).rowsAbove()).toBe(0);
  });

  it('hints toward the pipe: its row cleared wins, the lip loses, buried gaps cost', () => {
    const battle = encounter('elder');
    const dig = battle.challenge as DigChallenge;
    const board = battle.board;
    const landings = landingsOf(board, 'I');
    const scores = landings.map((l) => dig.hint(l));
    expect(Math.max(...scores)).toBeLessThan(1000);
    // A vertical I down the open gap at col 2–3 (row 6) is better than one lying over it.
    const down = landingOf(
      board,
      'I',
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
      2,
    )!;
    const over = landingOf(
      board,
      'I',
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
      ],
      1,
    )!;
    expect(dig.hint(down)).toBeGreaterThan(dig.hint(over));
    board.loadRows(['..', 'mmPmm.'], { P: { cell: 'stone', tag: 'target' } });
    const win = landingOf(
      board,
      'I',
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
      5,
    )!;
    expect(dig.hint(win)).toBe(1000);
    board.grid[dig.lipY] = row(6, [2, 3, 4, 5]);
    const high = landingOf(
      board,
      'O',
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
      -1,
    )!;
    expect(dig.hint(high)).toBe(-1000);
  });
});

describe('BUILD (Pip’s tower)', () => {
  const pip = (strain = 0) => {
    const battle = encounter('kid', strain);
    return { battle, build: battle.challenge as BuildChallenge };
  };

  it('turns clears off, follows the authored queue and shows three pieces ahead', () => {
    const { battle, build } = pip();
    expect(battle.board.clearsEnabled).toBe(false);
    expect(battle.board.active?.name).toBe('O');
    expect(battle.upcoming).toEqual(['S', 'O', 'J']);
    expect(build.previews).toBe(3);
    expect(build.objective()).toMatchObject({ counter: '0/36 · cracks 0/3', piecesLeft: 11 });
    expect(build.inOutline(4, 19)).toBe(true);
    expect(build.inOutline(4, 11)).toBe(true);
    expect(build.inOutline(3, 19)).toBe(false);
    expect(build.inSpare(0, 15)).toBe(true);
    expect(build.inSpare(0, 14)).toBe(false);
  });

  it('is won by the worked solution (§6.1), with no cracks or wobbles', () => {
    const { battle, build } = pip();
    const solution: [number, number][] = [
      [0, 4], // O, cols 4–5
      [1, 1], // S upright in the box
      [0, 6], // O, cols 6–7
      [0, 4], // J spawn: bar row 3, nub row 4 col 4
      [2, 5], // J 180°: bar row 4 cols 5–7, nub row 3 col 7
      [1, 0], // Z upright on the S
      [0, 4], // I flat, row 5
      [0, 4], // I flat, row 6
      [0, 5], // L spawn: bar row 7 cols 5–7, nub row 8 col 7
      [2, 4], // L 180°: bar row 8 cols 4–6, nub row 7 col 4
      [0, 4], // I flat: the spinner
    ];
    for (const [turns, x] of solution) drop(battle, turns, x);
    expect(battle.status).toBe('won');
    expect(build.cracks).toBe(0);
    expect(build.wobbles).toBe(0);
  });

  it('counts a piece outside the tower and the box as a wobble; the second fails', () => {
    const { battle, build } = pip();
    drop(battle, 0, 8); // O at cols 8–9: outside both
    expect(build.wobbles).toBe(1);
    expect(battle.events.map((e) => e.event)).toContainEqual({ kind: 'beat', beat: 'hazard' });
    expect(battle.status).toBe('ongoing');
    drop(battle, 0, 7); // S partly outside
    expect(build.wobbles).toBe(2);
    expect(battle.status).toBe('lost');
  });

  it('counts covered gaps in the outline as cracks, past the limit fails', () => {
    const { battle, build } = pip();
    const board = battle.board;
    // A block over the whole tower's bottom row: four cracks.
    board.grid[18] = row(10, [0, 1, 2, 3, 8, 9]);
    expect(build.cracks).toBe(4);
    expect(battle.status).toBe('lost');
    board.grid[18] = row(10, [0, 1, 2, 3, 5, 6, 7, 8, 9]);
    expect(build.cracks).toBe(1);
  });

  it('starts with a pre-cracked cell per strain step', () => {
    expect(pip(1).build.cracks).toBe(1);
    expect(pip(2).build.objective().counter).toBe('0/36 · cracks 2/3');
  });

  it('loses when the queue runs out unfinished, or on a top-out', () => {
    const { battle } = pip();
    for (let i = 0; i < 11 && battle.status === 'ongoing'; i++) drop(battle, 0, 4);
    expect(battle.status).toBe('lost');
    const other = pip();
    other.battle.board.toppedOut = true;
    expect(other.build.status()).toBe('lost');
  });

  it('winces at a hole', () => {
    const { battle, build } = pip();
    build.onLock({ ...EMPTY_LOCK, holesMade: 1 });
    expect(battle.events.at(-1)?.event).toEqual({ kind: 'face', face: 'wince' });
  });

  it('hints toward filling the tower; a fatal crack or wobble scores worst', () => {
    const { battle, build } = pip();
    const board = battle.board;
    const tower = landingOf(
      board,
      'O',
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
      3,
    )!;
    const box = landingOf(
      board,
      'O',
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
      -1,
    )!;
    const outside = landingOf(
      board,
      'O',
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
      7,
    )!;
    expect(build.hint(tower)).toBe(36);
    expect(build.hint(box)).toBe(0);
    expect(build.hint(outside)).toBe(-90);
    build.wobbles = 1;
    expect(build.hint(outside)).toBe(-1000);
  });
});

describe('PLANT (Bean’s herb beds)', () => {
  const bean = (strain = 0) => {
    const battle = encounter('farmer', strain);
    return { battle, plant: battle.challenge as PlantChallenge };
  };
  const cleared = (cells: Cell[], tags: ('ridge' | null)[] = []) => ({
    ...EMPTY_LOCK,
    linesCleared: 1,
    clearedRows: [{ cells, tags }],
  });

  it('lays soil ridges (neutral) in each furrow’s left column, and slots an S into every 3 pieces', () => {
    const { battle } = bean();
    for (const x of [0, 4, 8]) {
      expect(battle.board.grid[19]![x]).toBe('neutral');
      expect(battle.board.tagAt(x, 19)).toBe('ridge');
    }
    expect(battle.board.supply).toEqual({ window: 3, pieces: ['S'] });
  });

  it('scores green in furrows only: other colours, paths and ridges score nothing', () => {
    const { plant } = bean();
    const line: Cell[] = [
      'green',
      'green',
      'green',
      'green',
      'red',
      'green',
      'gold',
      'green',
      'neutral',
      'green',
    ];
    const tags = [null, null, null, null, null, null, null, null, 'ridge', null] as const;
    expect(plant.rowScore({ cells: line, tags: [...tags] })).toBe(4);
  });

  it('counts sprouts as lines clear, and ends at sundown: a win at 12, a Great at 16', () => {
    const { battle, plant } = bean();
    plant.onLock(cleared(Array<Cell>(10).fill('green')));
    expect(plant.score).toBe(6);
    expect(battle.events.at(-1)?.event).toEqual({ kind: 'beat', beat: 'hazard' });
    plant.onLock(EMPTY_LOCK);
    expect(plant.objective()).toMatchObject({ counter: 'Sprouts 6/12', progress: 0.5 });
    expect(plant.status()).toBe('ongoing');
    battle.board.piecesPlaced = ENCOUNTERS.farmer.pieceLimit;
    expect(plant.status()).toBe('lost');
    plant.score = 12;
    expect(plant.status()).toBe('won');
    expect(plant.great).toBe(false);
    plant.score = 16;
    expect(plant.great).toBe(true);
    battle.board.toppedOut = true;
    expect(plant.status()).toBe('lost');
  });

  it('asks two more sprouts per strain step', () => {
    expect(bean(2).plant.target).toBe(16);
  });

  it('hints toward green in the furrows, and scoring now', () => {
    const { battle, plant } = bean();
    const board = battle.board;
    const upright = [
      [1, 1],
      [1, 2],
      [0, 0],
      [0, 1],
    ] as const;
    const s = landingOf(board, 'S', upright, 0, ['green', 'green', 'green', 'green'])!;
    const z = landingOf(board, 'Z', upright, 0, ['red', 'red', 'red', 'red'])!;
    expect(plant.hint(s)).toBe(4);
    expect(plant.hint(z)).toBe(-6);
    board.grid[19] = [
      'neutral',
      null,
      'green',
      'green',
      'neutral',
      'green',
      'green',
      'green',
      'neutral',
      'green',
    ];
    const fill = landingOf(
      board,
      'I',
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
      1,
      ['green', 'green', 'green', 'green'],
    )!;
    expect(fill.lines).toBe(1);
    expect(plant.hint(fill)).toBeGreaterThan(8 * 3);
  });

  it('seats Bean’s demo S flush on the ridge', () => {
    const battle = encounter('farmer', 0, true);
    for (let i = 0; i < 60 && battle.demo; i++) battle.update(100);
    const grid = battle.board.grid;
    expect([grid[17]![0], grid[18]![0], grid[18]![1], grid[19]![1]]).toEqual([
      'green',
      'green',
      'green',
      'green',
    ]);
    expect(battle.board.holes()).toBe(0);
  });
});

describe('DUEL, scripted (Ordor’s stall)', () => {
  const ordor = (strain = 0, demo = false) => {
    const battle = encounter('stallKeeper', strain, demo);
    return { battle, duel: battle.challenge as DuelChallenge };
  };

  it('sends 1/2/4 rows for 2/3/4 lines, +1 back-to-back, nothing for singles', () => {
    expect([0, 1, 2, 3, 4, 5].map((n) => rowsSent(n, false))).toEqual([0, 0, 1, 2, 4, 4]);
    expect(rowsSent(2, true)).toBe(2);
    expect(rowsSent(1, true)).toBe(0);
  });

  it('bands the final price: Great ≤ 85%, Win ≤ 94%, Even ≤ 105%, Fail above', () => {
    expect([0.8, 0.85, 0.9, 0.94, 1, 1.05, 1.06].map(gradeOf)).toEqual([
      'great',
      'great',
      'win',
      'win',
      'even',
      'even',
      'fail',
    ]);
  });

  it('starts the meter 5 points worse per strain step', () => {
    expect(ordor().duel.meter).toBe(1);
    expect(ordor(2).duel.meter).toBe(1.1);
  });

  it('sends the demo counter-offer during the pre-roll; it lands after the first lock', () => {
    const { battle, duel } = ordor(0, true);
    battle.update(DEMO_SEND_MS - 100);
    expect(duel.pendingRows).toBe(0);
    battle.update(200);
    expect(duel.pendingRows).toBe(1);
    expect(duel.telegraphs()).toEqual([{ kind: 'rows', what: 'send', rows: 1, leadPieces: 1 }]);
    battle.input('hardDrop');
    expect(duel.pendingRows).toBe(0);
    expect(duel.meter).toBe(1.01);
    expect(battle.board.grid[19]!.filter((c) => c === 'stone')).toHaveLength(9);
  });

  it('runs the rival’s script: grows, clears, sends a telegraphed row that lands a piece later', () => {
    const { battle, duel } = ordor();
    duel.update(10_000);
    expect(duel.rivalRows).toBe(5);
    duel.update(5_000);
    expect(duel.pendingRows).toBe(1);
    expect(duel.telegraphs()).toEqual([]);
    battle.input('hardDrop'); // arms it
    expect(duel.telegraphs()).toHaveLength(1);
    battle.input('hardDrop'); // lands
    expect(duel.meter).toBeCloseTo(1.01);
    duel.update(5_000); // 20 s: grows again, clears 2
    expect(duel.rivalRows).toBe(4);
    expect(duel.objective()).toMatchObject({
      counter: '101% · 40s',
      rival: { rows: 4, top: 12, pending: 0, secondsLeft: 40 },
    });
  });

  it('pushes the rival up with big clears and lowers the price', () => {
    const { battle, duel } = ordor();
    duel.onLock({ ...EMPTY_LOCK, linesCleared: 2 });
    expect(duel.rivalRows).toBe(5);
    expect(duel.meter).toBeCloseTo(0.97);
    duel.onLock({ ...EMPTY_LOCK, linesCleared: 4 });
    expect(duel.rivalRows).toBe(10); // 4 + 1 back-to-back
    expect(battle.events.map((e) => e.event)).toContainEqual({ kind: 'sent', rows: 5 });
    duel.onLock({ ...EMPTY_LOCK, linesCleared: 1 });
    expect(battle.events.at(-1)?.event).toEqual({ kind: 'face', face: 'wince' });
  });

  it('sells when the rival tops out (at most 80%)', () => {
    const { duel } = ordor();
    duel.rivalRows = 10;
    duel.onLock({ ...EMPTY_LOCK, linesCleared: 3 });
    expect(duel.meter).toBe(DUEL_PRICES.sold);
    expect(duel.status()).toBe('won');
    expect(duel.grade).toBe('great');
    // Once over, nothing more moves it.
    duel.onLock({ ...EMPTY_LOCK, linesCleared: 4 });
    duel.update(60_000);
    expect(duel.meter).toBe(DUEL_PRICES.sold);
  });

  it('sells when the rival grows to the top on his own', () => {
    const { duel } = ordor();
    duel.rivalRows = 11;
    duel.update(10_000);
    expect(duel.status()).toBe('won');
  });

  it('ends at time: Even at about 104% for singles only', () => {
    const { duel } = ordor();
    for (let s = 0; s < 4; s++) {
      duel.update(15_000);
      duel.onLock({ ...EMPTY_LOCK, linesCleared: 1 });
      duel.onLock(EMPTY_LOCK);
    }
    expect(duel.status()).toBe('won');
    expect(duel.grade).toBe('even');
    expect(duel.meter).toBeCloseTo(1.03);
  });

  it('walks off at 115% or worse when the hero tops out', () => {
    const { duel } = ordor();
    duel.onLock({ ...EMPTY_LOCK, toppedOut: true });
    expect(duel.meter).toBe(DUEL_PRICES.walkOff);
    expect(duel.status()).toBe('lost');
    const other = ordor();
    for (let y = 1; y < 20; y++) other.battle.board.grid[y] = row(10, [y % 10]);
    other.battle.board.grid[0] = row(10, [0]);
    other.duel.update(15_000);
    other.duel.onLock(EMPTY_LOCK);
    other.duel.onLock(EMPTY_LOCK);
    expect(other.duel.status()).toBe('lost');
  });

  it('cancels pending rows first where the merchant allows it', () => {
    const { duel } = ordor();
    (duel as unknown as { params: { cancel: boolean } }).params = {
      ...ENCOUNTERS.stallKeeper,
      cancel: true,
    };
    duel.update(15_000);
    duel.update(15_000);
    expect(duel.pendingRows).toBe(2);
    duel.onLock({ ...EMPTY_LOCK, linesCleared: 3 }); // sends 2: both cancelled
    expect(duel.pendingRows).toBe(0);
    expect(duel.rivalRows).toBe(4 + 3 - 2);
    duel.onLock({ ...EMPTY_LOCK, linesCleared: 4 });
    expect(duel.rivalRows).toBe(10);
  });
});

describe('CONTAIN + protect (Wren’s mushroom ring)', () => {
  const wren = (strain = 0) => {
    const battle = encounter('forager', strain);
    return { battle, contain: battle.challenge as ContainChallenge };
  };

  it('lays five rows of litter, two rot sources and three young caps', () => {
    const { battle, contain } = wren();
    expect(battle.board.countTag('hazard')).toBe(2);
    expect(contain.alive).toBe(3);
    expect(contain.objective()).toMatchObject({ counter: 'Rot 2 · caps 3/3', piecesLeft: 30 });
    expect(contain.frontier()).toHaveLength(4);
  });

  it('starts with three more rot per strain step, never on a cap', () => {
    const { battle, contain } = wren(2);
    expect(battle.board.countTag('hazard')).toBe(8);
    expect(contain.dead).toBe(0);
  });

  it('spreads every 4 pieces into crystals beside it (marked a piece ahead)', () => {
    const { battle, contain } = wren();
    for (let i = 0; i < 3; i++) contain.onLock(EMPTY_LOCK);
    expect(contain.telegraphs()).toEqual([
      { kind: 'cells', what: 'spread', cells: contain.frontier(), leadPieces: 1 },
    ]);
    contain.onLock(EMPTY_LOCK);
    expect(battle.board.countTag('hazard')).toBe(4);
    expect(contain.telegraphs()).toEqual([]);
    expect(battle.events.map((e) => e.event.kind)).toContain('spread');
  });

  it('kills a cap the rot reaches; two dead fails', () => {
    const { battle, contain } = wren();
    const board = battle.board;
    board.loadRows(['Cx', 'RC'], {
      R: { cell: 'orange', tag: 'hazard' },
      C: { cell: 'green', tag: 'protected' },
    });
    contain.untilSpread = 1;
    contain.onLock(EMPTY_LOCK);
    expect(contain.dead).toBe(2);
    expect(contain.status()).toBe('lost');
    expect(battle.events.map((e) => e.event.kind)).toContain('lost');
  });

  it('stops spreading when nothing is left to take', () => {
    const { battle, contain } = wren();
    battle.board.loadRows(['R.........'], { R: { cell: 'orange', tag: 'hazard' } });
    contain.untilSpread = 1;
    contain.onLock(EMPTY_LOCK);
    expect(battle.board.countTag('hazard')).toBe(1);
  });

  it('picks caps cleared with their row, and wins once the rot is gone with two saved', () => {
    const { battle, contain } = wren();
    contain.onLock({ ...EMPTY_LOCK, clearedTags: { protected: 1 } });
    expect(contain.picked).toBe(1);
    expect(battle.events.map((e) => e.event.kind)).toContain('saved');
    battle.board.loadRows(['Cn'], { C: { cell: 'green', tag: 'protected' } });
    expect(contain.status()).toBe('won');
    expect(contain.great).toBe(false);
    contain.picked = 2;
    expect(contain.great).toBe(true);
    expect(contain.objective().progress).toBe(1);
  });

  it('loses when the pieces run out, or on a top-out', () => {
    const { battle, contain } = wren();
    battle.board.piecesPlaced = 30;
    expect(contain.status()).toBe('lost');
    battle.board.piecesPlaced = 0;
    battle.board.toppedOut = true;
    expect(contain.status()).toBe('lost');
    contain.onLock(EMPTY_LOCK);
    expect(contain.untilSpread).toBe(4);
  });

  it('hints toward clearing rot and picking caps, away from feeding the rot', () => {
    const { battle, contain } = wren();
    const board = battle.board;
    const landings = landingsOf(board, 'I');
    expect(landings.length).toBeGreaterThan(0);
    board.loadRows(['RRRRRRRRR.', 'C.........'], {
      R: { cell: 'orange', tag: 'hazard' },
      C: { cell: 'green', tag: 'protected' },
    });
    const clear = landingOf(
      board,
      'I',
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
      9,
    )!;
    expect(clear.lines).toBe(1);
    expect(contain.hint(clear)).toBeGreaterThan(0);
    board.loadRows(['Cooooooo..', 'oooooooooR'], {
      R: { cell: 'orange', tag: 'hazard' },
      C: { cell: 'green', tag: 'protected' },
    });
    const pick = landingOf(
      board,
      'O',
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
      7,
    )!;
    expect(contain.hint(pick)).toBeGreaterThan(0);
  });
});

describe('CHARGE (Vale’s ward lamps)', () => {
  const vale = (strain = 0) => {
    const battle = encounter('guard', strain);
    return { battle, charge: battle.challenge as ChargeChallenge };
  };
  const line = (color: Cell, count: number): Cell[] =>
    Array.from({ length: 10 }, (_, x) => (x < count ? color : 'orange'));
  const clears = (...rows: Cell[][]) => ({
    ...EMPTY_LOCK,
    linesCleared: rows.length,
    clearedRows: rows.map((cells) => ({ cells, tags: [] })),
  });

  it('knows a pure line: 7 of 10 in one element', () => {
    expect(pureElement(line('blue', 7), ['water', 'arcane'], 7)).toBe('water');
    expect(pureElement(line('blue', 6), ['water', 'arcane'], 7)).toBeNull();
  });

  it('lights the next lamp of a pure line’s element, and a pure line of a lit element does nothing', () => {
    const { battle, charge } = vale();
    expect(battle.board.supply).toEqual({ window: 4, pieces: ['J', 'T'] });
    charge.onLock(clears(line('blue', 7), line('blue', 8), line('blue', 9)));
    expect(charge.lit).toEqual([0, 1]);
    charge.onLock(clears(line('violet', 7), line('red', 9)));
    expect(charge.objective()).toMatchObject({
      counter: 'Lamps 3/4',
      lamps: [
        { element: 'water', lit: true },
        { element: 'water', lit: true },
        { element: 'arcane', lit: true },
        { element: 'arcane', lit: false },
      ],
    });
    charge.onLock(clears(line('violet', 10)));
    expect(charge.status()).toBe('won');
  });

  it('snuffs the oldest lamp every 14 pieces, flickering one piece ahead', () => {
    const { battle, charge } = vale();
    charge.onLock(clears(line('blue', 7)));
    for (let i = 0; i < 12; i++) charge.onLock(EMPTY_LOCK);
    expect(charge.telegraphs()).toEqual([{ kind: 'lamp', index: 0, leadPieces: 1 }]);
    charge.onLock(EMPTY_LOCK);
    expect(charge.lit).toEqual([]);
    expect(battle.events.map((e) => e.event)).toContainEqual({
      kind: 'lamp',
      index: 0,
      lit: false,
    });
    expect(charge.telegraphs()).toEqual([]);
    // Nothing lit: the wind blows past.
    for (let i = 0; i < 14; i++) charge.onLock(EMPTY_LOCK);
    expect(charge.lit).toEqual([]);
  });

  it('adds a lamp under strain, and loses when the pieces run out or on a top-out', () => {
    const { battle, charge } = vale(1);
    expect(charge.lamps).toHaveLength(5);
    battle.board.piecesPlaced = 36;
    expect(charge.status()).toBe('lost');
    battle.board.piecesPlaced = 0;
    battle.board.toppedOut = true;
    expect(charge.status()).toBe('lost');
  });

  it('hints toward pure lines: a lamp lit counts most, mixed colours cost', () => {
    const { battle, charge } = vale();
    const board = battle.board;
    board.grid[19] = ['blue', 'blue', 'blue', 'blue', 'blue', 'blue', null, 'red', 'red', 'red'];
    const lamp = landingOf(
      board,
      'I',
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
      6,
      ['blue', 'blue', 'blue', 'blue'],
    )!;
    expect(lamp.lines).toBe(1);
    expect(charge.hint(lamp)).toBeGreaterThan(30);
    board.grid[19] = ['blue', 'blue', 'blue', 'blue', 'blue', 'violet', null, 'red', 'red', 'red'];
    const waste = landingOf(
      board,
      'I',
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
      6,
      ['cyan', 'cyan', 'cyan', 'cyan'],
    )!;
    expect(charge.hint(waste)).toBeLessThan(0);
    board.grid[19] = row(10, [9], 'blue');
    board.grid[18] = ['violet', 'violet', 'blue', 'red', 'red', 'red', 'red', null, null, null];
    const dirty = landingOf(
      board,
      'O',
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
      7,
      ['red', 'red', 'red', 'red'],
    )!;
    expect(charge.hint(dirty)).toBeLessThan(charge.hint(lamp));
  });
});
