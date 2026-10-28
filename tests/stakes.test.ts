/**
 * Stakes (docs/ENCOUNTER_DESIGN.md §3): regard, strain, the retry rules,
 * once-a-day replays, haggle prices and the inn night.
 */
import { describe, expect, it } from 'vitest';
import { STAKES } from '../src/data/balance';
import { buy } from '../src/game/shop';
import {
  assistOffered,
  beginTry,
  blockedReason,
  firstTry,
  innNight,
  leaveTown,
  priceChange,
  recordOf,
  regardOf,
  settle,
  settleHaggle,
  strainFor,
  type StakesRules,
} from '../src/game/stakes';
import { newGame, travel, type GameState } from '../src/world/state';

const townsfolk: StakesRules = {
  personId: 'elder',
  retry: 'now',
  repeatable: false,
  threshold: false,
  strains: true,
};
const threshold: StakesRules = { ...townsfolk, personId: 'guard', retry: 'wait', threshold: true };
const repeatable: StakesRules = { ...townsfolk, personId: 'farmer', repeatable: true };
const lesson: StakesRules = { ...townsfolk, personId: 'hazel', retry: 'nowOnce', strains: false };

function state(): GameState {
  return newGame();
}

describe('regard', () => {
  it('rises on a first win, falls on a fail, and stays within −2 to +2', () => {
    const s = state();
    expect(regardOf(s, 'elder')).toBe(0);
    expect(settle(s, 'elder', townsfolk, false)).toEqual([
      { kind: 'strain', level: 1 },
      { kind: 'regard', delta: -1, level: -1 },
    ]);
    settle(s, 'elder', townsfolk, false);
    expect(settle(s, 'elder', townsfolk, false)).toContainEqual({
      kind: 'regard',
      delta: 0,
      level: -2,
    });
    expect(regardOf(s, 'elder')).toBe(STAKES.regardMin);
    expect(settle(s, 'elder', townsfolk, true)).toEqual([{ kind: 'regard', delta: 1, level: -1 }]);
  });

  it('lets a repeat win restore regard up to the first win’s level, never above', () => {
    const s = state();
    settle(s, 'farmer', repeatable, true);
    expect(regardOf(s, 'farmer')).toBe(1);
    expect(settle(s, 'farmer', repeatable, true)).toEqual([]);
    expect(regardOf(s, 'farmer')).toBe(1);
    settle(s, 'farmer', repeatable, false);
    settle(s, 'farmer', repeatable, false);
    expect(regardOf(s, 'farmer')).toBe(-1);
    expect(settle(s, 'farmer', repeatable, true)).toEqual([{ kind: 'regard', delta: 1, level: 0 }]);
    settle(s, 'farmer', repeatable, true);
    settle(s, 'farmer', repeatable, true);
    expect(regardOf(s, 'farmer')).toBe(1);
  });

  it('gives no regard on an assisted win, and the assist clears strain', () => {
    const s = state();
    settle(s, 'guard', threshold, false);
    expect(strainFor(s, 'guard')).toBe(1);
    expect(strainFor(s, 'guard', true)).toBe(0);
    expect(settle(s, 'guard', threshold, true, true)).toEqual([]);
    expect(regardOf(s, 'guard')).toBe(-1);
  });

  it('moves nobody’s regard for a thing', () => {
    const s = state();
    expect(settle(s, 'sealedChest', { ...townsfolk, personId: null }, false)).toEqual([
      { kind: 'strain', level: 1 },
    ]);
    expect(s.regard).toEqual({});
  });
});

describe('strain', () => {
  it('adds a step per fail up to 2 (1 at thresholds); a win clears it', () => {
    const s = state();
    for (let i = 0; i < 3; i++) settle(s, 'elder', townsfolk, false);
    expect(recordOf(s, 'elder').strain).toBe(STAKES.strainMax);
    for (let i = 0; i < 3; i++) settle(s, 'guard', threshold, false);
    expect(recordOf(s, 'guard').strain).toBe(STAKES.thresholdStrainMax);
    settle(s, 'elder', townsfolk, true);
    expect(recordOf(s, 'elder')).toMatchObject({ strain: 0, fails: 0, wins: 1 });
  });

  it('never strains a lesson (its cost is the seal)', () => {
    const s = state();
    expect(settle(s, 'lesson.fire', lesson, false)).toEqual([
      { kind: 'regard', delta: -1, level: -1 },
    ]);
    expect(recordOf(s, 'lesson.fire').strain).toBe(0);
  });

  it('eases a step each night at an inn, which also ends the day', () => {
    const s = state();
    settle(s, 'elder', townsfolk, false);
    settle(s, 'elder', townsfolk, false);
    innNight(s);
    expect(s.day).toBe(1);
    expect(recordOf(s, 'elder').strain).toBe(1);
    innNight(s);
    innNight(s);
    expect(recordOf(s, 'elder').strain).toBe(0);
  });

  it('ends the day when the hero rests at an inn', () => {
    const s = state();
    s.hero.gil = 100;
    buy(s, 'innRest', 1);
    expect(s.day).toBe(1);
  });
});

describe('retry rules', () => {
  it('Now: retry at once', () => {
    const s = state();
    settle(s, 'elder', townsfolk, false);
    expect(blockedReason(s, 'elder', townsfolk)).toBeNull();
  });

  it('Wait: no retry until the next won monster fight', () => {
    const s = state();
    s.victories = 4;
    settle(s, 'guard', threshold, false);
    expect(blockedReason(s, 'guard', threshold)).toBe('wait');
    s.victories = 5;
    expect(blockedReason(s, 'guard', threshold)).toBeNull();
    settle(s, 'guard', threshold, true);
    expect(recordOf(s, 'guard').waitPast).toBeNull();
  });

  it('Now once, then Wait (lessons)', () => {
    const s = state();
    settle(s, 'lesson.fire', lesson, false);
    expect(blockedReason(s, 'lesson.fire', lesson)).toBeNull();
    settle(s, 'lesson.fire', lesson, false);
    expect(blockedReason(s, 'lesson.fire', lesson)).toBe('wait');
  });

  it('Day: once a day, win or lose (haggles)', () => {
    const s = state();
    const haggle: StakesRules = { ...townsfolk, retry: 'day' };
    expect(blockedReason(s, 'stallKeeper', haggle)).toBeNull();
    beginTry(s, 'stallKeeper');
    expect(blockedReason(s, 'stallKeeper', haggle)).toBe('day');
    innNight(s);
    expect(blockedReason(s, 'stallKeeper', haggle)).toBeNull();
  });

  it('replays a won repeatable once a day', () => {
    const s = state();
    beginTry(s, 'farmer');
    settle(s, 'farmer', repeatable, false);
    expect(blockedReason(s, 'farmer', repeatable)).toBeNull();
    settle(s, 'farmer', repeatable, true);
    expect(blockedReason(s, 'farmer', repeatable)).toBe('day');
    innNight(s);
    expect(blockedReason(s, 'farmer', repeatable)).toBeNull();
  });

  it('shows the demo only on the first try, and counts tries', () => {
    const s = state();
    expect(firstTry(s, 'elder')).toBe(true);
    beginTry(s, 'elder');
    expect(firstTry(s, 'elder')).toBe(false);
    expect(recordOf(s, 'elder')).toMatchObject({ tries: 1, playedDay: 0 });
  });

  it('offers a threshold’s assist after 2 fails, never a townsperson’s', () => {
    const s = state();
    settle(s, 'guard', threshold, false);
    expect(assistOffered(s, 'guard', threshold)).toBe(false);
    settle(s, 'guard', threshold, false);
    expect(assistOffered(s, 'guard', threshold)).toBe(true);
    settle(s, 'elder', townsfolk, false);
    settle(s, 'elder', townsfolk, false);
    expect(assistOffered(s, 'elder', townsfolk)).toBe(false);
  });
});

describe('haggle prices', () => {
  it('discounts the shop until the hero leaves the town, with regard +1 each win', () => {
    const s = state();
    expect(priceChange(s, 'mossvaleStall')).toBe(1);
    expect(settleHaggle(s, 'stallKeeper', 'mossvaleStall', 'win', 0.9)).toEqual([
      { kind: 'price', multiplier: 0.9 },
      { kind: 'regard', delta: 1, level: 1 },
    ]);
    expect(priceChange(s, 'mossvaleStall')).toBe(0.9);
    settleHaggle(s, 'stallKeeper', 'mossvaleStall', 'great', 0.8);
    expect(regardOf(s, 'stallKeeper')).toBe(2);
    expect(settleHaggle(s, 'stallKeeper', 'mossvaleStall', 'great', 0.8)).toEqual([
      { kind: 'price', multiplier: 0.8 },
    ]);
    travel(s, { map: 'overworld', x: 5, y: 6 });
    expect(priceChange(s, 'mossvaleStall')).toBe(1);
    expect(s.prices).toEqual({});
  });

  it('changes nothing on Even', () => {
    const s = state();
    expect(settleHaggle(s, 'stallKeeper', 'mossvaleStall', 'even', 1.02)).toEqual([]);
    expect(priceChange(s, 'mossvaleStall')).toBe(1);
  });

  it('marks the shop up after a fail until a haggle there is won or two days pass', () => {
    const s = state();
    expect(settleHaggle(s, 'stallKeeper', 'mossvaleStall', 'fail', 1.1)).toEqual([
      { kind: 'price', multiplier: 1.1 },
      { kind: 'regard', delta: -1, level: -1 },
    ]);
    // The markup follows the shop: leaving town keeps it.
    leaveTown(s, 'overworld');
    expect(priceChange(s, 'mossvaleStall')).toBe(1.1);
    innNight(s);
    expect(priceChange(s, 'mossvaleStall')).toBe(1.1);
    innNight(s);
    expect(priceChange(s, 'mossvaleStall')).toBe(1);
    expect(s.prices).toEqual({});
    settleHaggle(s, 'stallKeeper', 'mossvaleStall', 'fail', 1.1);
    settleHaggle(s, 'stallKeeper', 'mossvaleStall', 'win', 0.92);
    expect(priceChange(s, 'mossvaleStall')).toBe(0.92);
    // A day passing keeps a discount (it ends when the hero leaves town).
    innNight(s);
    innNight(s);
    expect(priceChange(s, 'mossvaleStall')).toBe(0.92);
  });
});
