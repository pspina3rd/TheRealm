import { describe, expect, it } from 'vitest';
import type { BarterChallenge } from '../src/battle/barter';
import type { HaggleChallenge } from '../src/battle/haggle';
import { HAGGLE } from '../src/battle/haggle';
import { OfferingChallenge } from '../src/battle/offering';
import type { PuzzleChallenge } from '../src/battle/puzzle';
import { addItem, createHero } from '../src/game/hero';
import { forceQueue, makeBattle, setUpVerticalIClear } from './helpers';

describe('OfferingChallenge', () => {
  const heroWithPelt = () => {
    const hero = createHero();
    addItem(hero, 'wolfPelt');
    return hero;
  };
  const spec = { kind: 'offering', itemId: 'wolfPelt', targetScore: 500, pieceLimit: 3 } as const;

  it('requires the offered item', () => {
    expect(() => makeBattle(spec)).toThrow('Wolf Pelt');
  });

  it('wins once the target score is reached', () => {
    const battle = makeBattle(spec, heroWithPelt());
    setUpVerticalIClear(battle.board, 2); // 600 points
    battle.input('hardDrop');
    expect(battle.status).toBe('won');
    expect(battle.objective.progress).toBe(1);
  });

  it('loses when pieces run out first', () => {
    const battle = makeBattle(spec, heroWithPelt());
    for (let i = 0; i < 3; i++) battle.input('hardDrop');
    expect(battle.status).toBe('lost');
  });

  it('loses on top-out', () => {
    const battle = makeBattle(spec, heroWithPelt());
    battle.board.toppedOut = true;
    expect(battle.challenge.status()).toBe('lost');
  });

  it('shows score progress and pieces left', () => {
    const battle = makeBattle(spec, heroWithPelt());
    expect(battle.challenge).toBeInstanceOf(OfferingChallenge);
    expect(battle.objective.detail).toContain('3 pieces left');
  });
});

describe('BarterChallenge', () => {
  const spec = { kind: 'barter', wants: { red: 9, cyan: 1 }, pieceLimit: 2 } as const;

  it('collects cleared crystals by colour and wins when every want is met', () => {
    const battle = makeBattle(spec);
    setUpVerticalIClear(battle.board, 1, 'red');
    battle.input('hardDrop');
    const barter = battle.challenge as BarterChallenge;
    expect(barter.collected).toEqual({ red: 9, cyan: 1 });
    expect(battle.status).toBe('won');
  });

  it('is not satisfied by the wrong colours', () => {
    const battle = makeBattle(spec);
    setUpVerticalIClear(battle.board, 1, 'blue');
    battle.input('hardDrop');
    expect(battle.status).toBe('ongoing');
    expect(battle.objective.progress).toBeCloseTo(0.1);
    forceQueue(battle, ['O']);
    battle.input('hardDrop');
    expect(battle.status).toBe('lost');
  });

  it('lists each wanted colour in the objective', () => {
    expect(makeBattle(spec).objective.detail).toContain('red 0/9 · cyan 0/1');
  });

  it('loses on top-out', () => {
    const battle = makeBattle(spec);
    battle.board.toppedOut = true;
    expect(battle.challenge.status()).toBe('lost');
  });
});

describe('HaggleChallenge', () => {
  const spec = { kind: 'haggle', pieceLimit: 3, rivalIntervalMs: 1000 } as const;

  it('lowers the price when lines are cleared', () => {
    const battle = makeBattle(spec);
    setUpVerticalIClear(battle.board, 2);
    battle.input('hardDrop');
    expect((battle.challenge as HaggleChallenge).multiplier).toBe(
      HAGGLE.start - HAGGLE.dropPerClear[2]!,
    );
  });

  it('raises the price over time', () => {
    const battle = makeBattle(spec);
    battle.challenge.update(2500);
    expect((battle.challenge as HaggleChallenge).multiplier).toBeCloseTo(
      1 + 2 * HAGGLE.risePerTick,
    );
  });

  it('clamps the price between the minimum and maximum', () => {
    const battle = makeBattle(spec);
    const haggle = battle.challenge as HaggleChallenge;
    haggle.update(1000 * 100);
    expect(haggle.multiplier).toBe(HAGGLE.max);
    expect(battle.objective.progress).toBe(0);
    haggle.multiplier = HAGGLE.min;
    setUpVerticalIClear(battle.board, 4);
    battle.input('hardDrop');
    expect(haggle.multiplier).toBe(HAGGLE.min);
  });

  it('strikes the deal after the piece limit', () => {
    const battle = makeBattle(spec);
    for (let i = 0; i < 3; i++) battle.input('hardDrop');
    expect(battle.status).toBe('won');
  });

  it('fails if the board overflows', () => {
    const battle = makeBattle(spec);
    battle.board.toppedOut = true;
    expect(battle.challenge.status()).toBe('lost');
  });
});

describe('PuzzleChallenge', () => {
  const spec = {
    kind: 'puzzle',
    rows: ['.#########', '.#########'],
    queue: ['O', 'I'],
    linesToClear: 2,
  } as const;

  it('loads the preset rows and fixed queue', () => {
    const battle = makeBattle(spec);
    expect(battle.board.active?.name).toBe('O');
    expect(battle.board.filledCount()).toBe(18);
    expect(battle.objective.detail).toContain('2 pieces left');
  });

  it('wins when enough lines are cleared', () => {
    const battle = makeBattle(spec);
    battle.input('hardDrop'); // O sits harmlessly in the middle
    battle.input('rotate');
    while (battle.board.move(-1, 0));
    battle.input('hardDrop');
    expect((battle.challenge as PuzzleChallenge).linesCleared).toBe(2);
    expect(battle.status).toBe('won');
  });

  it('loses when the pieces run out', () => {
    const battle = makeBattle(spec);
    battle.input('hardDrop');
    battle.input('hardDrop');
    expect(battle.status).toBe('lost');
    expect(battle.objective.detail).toContain('0 pieces left');
  });

  it('loses on top-out', () => {
    const battle = makeBattle(spec);
    forceQueue(battle, ['I']);
    battle.board.toppedOut = true;
    expect(battle.challenge.status()).toBe('lost');
  });
});
