/**
 * Plumbing for later milestones (the encounter addendum's M1 hooks), with
 * no gameplay of their own: one choke point for pushed rows, telegraphs as
 * data with a lead, the last two locks' surges, an event for new holes, a
 * neutral cell kind, and the sim's hero class.
 */
import { describe, expect, it } from 'vitest';
import type { Battle } from '../src/battle/battle';
import type { CombatChallenge } from '../src/battle/combat';
import type { RowPush } from '../src/battle/types';
import type { DigChallenge } from '../src/battle/verbs/dig';
import type { DuelChallenge } from '../src/battle/verbs/duel';
import { Board } from '../src/core/board';
import { elementsOf } from '../src/core/elements';
import { isCrystal } from '../src/core/pieces';
import { createRng } from '../src/core/rng';
import { TELEGRAPH_LEAD } from '../src/data/balance';
import { simHero } from './sim/encounters';
import { forceQueue, makeBattle, place, rowWithGaps } from './helpers';

/** Records every push, and fails if a row enters the board any other way. */
function watchPushes(battle: Battle): RowPush[] {
  const seen: RowPush[] = [];
  let inside = false;
  const push = battle.pushRows.bind(battle);
  battle.pushRows = (p, count) => {
    seen.push(p);
    inside = true;
    try {
      return push(p, count);
    } finally {
      inside = false;
    }
  };
  const board = battle.board;
  const raw = board.pushRow.bind(board);
  board.pushRow = (cells, tags) => {
    if (!inside) throw new Error('A row was pushed outside Battle.pushRows');
    raw(cells, tags);
  };
  return seen;
}

const encounter = (id: string) =>
  makeBattle({ kind: 'encounter', id, strain: 0, demo: false, assisted: false });

describe('Battle.pushRows: the one way rows enter the board', () => {
  it('takes every curse, rising row and merchant send, with its source', () => {
    const fight = makeBattle({ kind: 'combat', enemyId: 'goblin' });
    const seen = watchPushes(fight);
    const combat = fight.challenge as CombatChallenge;
    const curse = { kind: 'curse', name: 'Hex', rows: 2 } as const;
    combat.nextMove = curse;
    combat.update(combat.actMs);
    expect(seen).toEqual([{ source: 'curse', boss: false, owner: 'goblin' }]);
    expect(fight.board.grid[19]!.filter((c) => c === 'stone')).toHaveLength(9);

    const well = encounter('elder');
    const rising = watchPushes(well);
    (well.challenge as DigChallenge).untilRise = 1;
    well.input('hardDrop');
    expect(rising).toEqual([{ source: 'rising', fill: 'mold' }]);

    const stall = encounter('stallKeeper');
    const sends = watchPushes(stall);
    stall.input('rotate'); // the first touch
    stall.update(15_000);
    stall.input('hardDrop'); // arms the send…
    stall.input('hardDrop'); // …which lands after this lock
    expect(sends).toEqual([{ source: 'send' }]);
    expect((stall.challenge as DuelChallenge).meter).toBeGreaterThan(1);
  });

  it('makes mold or stone rows with one gap, and reports the rise', () => {
    const battle = makeBattle({ kind: 'combat', enemyId: 'slime' });
    expect(battle.pushRows({ source: 'tide' }, 0)).toBe(0);
    expect(battle.pushRows({ source: 'tug', fill: 'mold' }, 2)).toBe(2);
    for (const row of battle.board.grid.slice(18)) {
      expect(row.filter((c) => c === null)).toHaveLength(1);
      expect(row.every((c) => c === null || c === 'violet' || c === 'green')).toBe(true);
    }
    expect(battle.events.at(-1)?.event).toEqual({ kind: 'rise', rows: 2, source: 'tug' });
  });
});

describe('telegraphs as data', () => {
  it('carry how many pieces ahead they show', () => {
    const well = encounter('elder');
    const dig = well.challenge as DigChallenge;
    expect(dig.telegraphs()).toEqual([]);
    dig.untilRise = TELEGRAPH_LEAD;
    expect(dig.telegraphs()).toEqual([
      { kind: 'rows', what: 'rise', rows: 1, leadPieces: TELEGRAPH_LEAD },
    ]);
  });
});

describe('the last two locks’ surges', () => {
  it('keeps each lock’s surge elements, two locks deep', () => {
    const battle = makeBattle({ kind: 'combat', enemyId: 'slime' });
    const board = battle.board;
    board.grid[19] = rowWithGaps(10, [0], 'red');
    forceQueue(battle, ['I', 'O', 'O', 'O']);
    board.rotate();
    while (board.move(-1, 0));
    battle.input('hardDrop');
    expect(battle.recentSurges).toEqual([['fire']]);
    battle.input('hardDrop');
    battle.input('hardDrop');
    expect(battle.recentSurges).toEqual([[], []]);
  });
});

describe('the holes event', () => {
  it('fires with the count whenever a placement buries new holes', () => {
    const battle = makeBattle({ kind: 'combat', enemyId: 'slime' });
    battle.board.grid[19] = rowWithGaps(10, [3, 4, 5]);
    forceQueue(battle, ['I', 'O']);
    battle.input('hardDrop'); // a flat I over the three gaps
    expect(battle.events.map((e) => e.event)).toContainEqual({ kind: 'holes', count: 3 });
  });
});

describe('neutral cells', () => {
  it('are inert: never an element, but they clear with their line', () => {
    const board = new Board(createRng(1));
    board.loadRows(['xxxxxxxxx.']);
    expect(board.grid[19]![0]).toBe('neutral');
    expect(isCrystal('neutral')).toBe(false);
    expect(isCrystal('stone')).toBe(false);
    expect(isCrystal(null)).toBe(false);
    expect(isCrystal('red')).toBe(true);
    board.setFixedQueue(['I', 'O']);
    board.spawn();
    const { result } = place(board, 1, 9);
    expect(result.linesCleared).toBe(1);
    expect(result.clearedCells.neutral).toBe(9);
    expect(elementsOf(result.clearedCells).wind).toBe(1);
    expect(Object.values(elementsOf({ neutral: 9 })).every((n) => n === 0)).toBe(true);
    board.loadRows(['xxxx......']);
    expect(board.petrify(5)).toEqual([]);
  });
});

describe('the sim’s hero class', () => {
  it('plays a ranger unless asked for another class', () => {
    expect(simHero(1).classId).toBe('ranger');
    expect(simHero(3, 'mage')).toMatchObject({ classId: 'mage', level: 3 });
  });
});
