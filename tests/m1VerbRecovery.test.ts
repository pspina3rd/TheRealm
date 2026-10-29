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
