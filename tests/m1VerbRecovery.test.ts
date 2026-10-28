import { describe, expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import { createRng } from '../src/core/rng';
import { createHero } from '../src/game/hero';
import { dualChance } from '../src/game/pieceOdds';
import type { ContainChallenge } from '../src/battle/verbs/contain';
import { EMPTY_LOCK } from './helpers';

const make = (id: string, seed: number, strain = 0) => {
  const hero = createHero();
  return new Battle(
    { kind: 'encounter', id, strain, demo: true, assisted: false },
    hero,
    createRng(seed),
    { dualChance: dualChance(hero) },
  );
};

/** Fixed real-input replays, obtained before any board/rate retuning. */
const REPLAYS: readonly {
  id: string;
  seed: number;
  inputs: readonly (readonly [number, number])[];
}[] = [
  {
    id: 'elder',
    seed: 7932,
    inputs: [
      [1, 3],
      [0, 0],
      [1, 0],
      [0, 2],
      [1, -1],
      [3, 3],
      [1, 0],
      [2, 2],
      [1, -1],
      [1, 1],
      [0, 2],
      [0, -1],
      [1, -1],
      [1, 1],
      [1, 1],
      [3, 3],
      [3, 2],
      [1, 0],
      [0, 0],
      [3, 3],
      [1, -1],
      [1, 3],
    ],
  },
  {
    id: 'forager',
    seed: 15851,
    inputs: [
      [1, -2],
      [2, 4],
      [1, 1],
      [1, -3],
      [0, 4],
      [3, 5],
      [2, -1],
      [3, 3],
      [3, 2],
      [0, 3],
      [1, -2],
      [0, 0],
      [1, -1],
      [0, 1],
      [1, -1],
      [0, 0],
      [0, 4],
      [0, -3],
      [2, 1],
      [1, -3],
      [3, 4],
      [1, 0],
      [0, -3],
      [1, 2],
      [3, 3],
      [3, 5],
      [1, -1],
    ],
  },
];

describe('random-queue DIG and CONTAIN legal replay proofs', () => {
  for (const { id, seed, inputs } of REPLAYS) {
    it(`${id} has a recorded legal win with the real starter dual-piece chance`, () => {
      const battle = make(id, seed);
      for (let frame = 0; frame < 200 && battle.demoPlaying; frame++) battle.update(50);
      expect(battle.demoPlaying).toBe(false);
      for (const [turns, shift] of inputs) {
        expect(battle.status).toBe('ongoing');
        for (let turn = 0; turn < turns; turn++) battle.input('rotate');
        for (let move = 0; move < Math.abs(shift); move++)
          battle.input(shift < 0 ? 'left' : 'right');
        battle.update(2200);
        battle.input('hardDrop');
      }
      expect(battle.status).toBe('won');
      expect(battle.board.toppedOut).toBe(false);
      if (id === 'elder') expect(battle.board.countTag('target')).toBe(0);
      else expect(battle.board.countTag('hazard')).toBe(0);
    });
  }
});

describe('CONTAIN spread warnings', () => {
  it('never chains through a newly infected cell into an unmarked cap on the same tick', () => {
    const battle = make('forager', 1);
    const contain = battle.challenge as ContainChallenge;
    battle.board.loadRows(['RoC.......'], {
      R: { cell: 'orange', tag: 'hazard' },
      C: { cell: 'green', tag: 'protected' },
    });
    battle.rng.pick = <T>(items: readonly T[]): T => items[0]!;
    contain.untilSpread = 1;
    expect(contain.telegraphs()).toMatchObject([{ kind: 'cells', cells: [[1, 19]] }]);
    contain.onLock(EMPTY_LOCK);
    expect(battle.board.tagged('hazard')).toEqual([
      [0, 19],
      [1, 19],
    ]);
    expect(battle.board.tagAt(2, 19)).toBe('protected');
    expect(contain.dead).toBe(0);
    expect(battle.events.map(({ event }) => event)).toContainEqual({
      kind: 'spread',
      cells: [[1, 19]],
    });
  });

  it('still infects two distinct warned neighbours and kills a cap in direct reach', () => {
    const battle = make('forager', 1);
    const contain = battle.challenge as ContainChallenge;
    battle.board.loadRows(['oCRo......'], {
      R: { cell: 'orange', tag: 'hazard' },
      C: { cell: 'green', tag: 'protected' },
    });
    battle.rng.pick = <T>(items: readonly T[]): T => items[0]!;
    contain.untilSpread = 1;
    const warned = contain.frontier();
    contain.onLock(EMPTY_LOCK);
    const spread = battle.events.map(({ event }) => event).find((event) => event.kind === 'spread');
    expect(spread).toMatchObject({
      kind: 'spread',
      cells: [
        [3, 19],
        [1, 19],
      ],
    });
    expect(warned).toEqual([
      [3, 19],
      [1, 19],
    ]);
    expect(contain.dead).toBe(1);
    expect(battle.board.countTag('hazard')).toBe(3);
  });
});
