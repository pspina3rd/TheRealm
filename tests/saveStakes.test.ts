import { learnSpell as learnFixtureSpell } from '../src/game/hero';
/**
 * Save version 10: the encounter stakes. Every older version loads with
 * its stakes at zero and nothing sealed; a version 10 save keeps them,
 * made safe.
 */
import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, deserialize, serialize } from '../src/game/save';
import { settle, settleHaggle, beginTry } from '../src/game/stakes';
import { newGame } from '../src/world/state';

const ZERO = { day: 0, regard: {}, regardPeak: {}, encounters: {}, prices: {} };

/** A save of a game with stakes in play, as `version` would have written it. */
function saveAt(version: number): Record<string, unknown> {
  const state = newGame('mage');
  state.day = 3;
  beginTry(state, 'elder');
  settle(
    state,
    'elder',
    { personId: 'elder', retry: 'now', repeatable: false, threshold: false, strains: true },
    false,
  );
  settleHaggle(state, 'stallKeeper', 'mossvaleStall', 'fail', 1.1);
  learnFixtureSpell(state.hero, 'shadow');
  state.hero.seal = { spellId: 'shadow', fights: 2 };
  const data = JSON.parse(serialize(state)) as Record<string, unknown>;
  const hero = data.hero as Record<string, unknown>;
  // Versions 6–9 stored lost lessons; none stored a seal.
  if (version < 10) {
    delete hero.seal;
    hero.failedLessons = { arcane: { spellId: 'shadow', level: 2 } };
  }
  return { ...data, version };
}

describe('save version 14 (committed tries and unified campaign stakes)', () => {
  it('is the current version', () => {
    expect(SAVE_VERSION).toBe(14);
  });

  for (let version = 1; version < 10; version++) {
    it(`loads a version ${version} save with every stake at zero and nothing sealed`, () => {
      const loaded = deserialize(JSON.stringify(saveAt(version)))!;
      expect(loaded, `version ${version}`).not.toBeNull();
      expect(loaded).toMatchObject(ZERO);
      expect(loaded.hero.seal).toBeNull();
      expect(loaded.hero).not.toHaveProperty('failedLessons');
    });
  }

  it.each([10, 11, SAVE_VERSION])('keeps version %i stakes and seal when upgraded', (version) => {
    const data = saveAt(version);
    const loaded = deserialize(JSON.stringify(data))!;
    expect(loaded.day).toBe(3);
    expect(loaded.regard).toEqual({ elder: -1, stallKeeper: -1 });
    expect(loaded.encounters.elder).toMatchObject({ strain: 1, fails: 1, tries: 1, playedDay: 3 });
    expect(loaded.prices.mossvaleStall).toEqual({ multiplier: 1.1, map: null, day: 3 });
    expect(loaded.hero.seal).toEqual({ spellId: 'shadow', fights: 2 });
    expect(JSON.parse(serialize(loaded))).toEqual({ ...data, version: SAVE_VERSION });
  });

  it.each([10, 11, SAVE_VERSION])(
    'sanitizes version %i stakes instead of refusing them',
    (version) => {
      const data = saveAt(version);
      data.day = -4;
      data.regard = { elder: 9, farmer: -9, pip: 'x', wren: 0.6 };
      data.regardPeak = 'nope';
      data.encounters = {
        elder: { strain: 7, fails: -1, wins: 2.4, tries: 'x', waitPast: 3, playedDay: 99 },
        bad: 'record',
      };
      data.prices = {
        a: { multiplier: 9, map: 'mossvale', day: 0 },
        b: { multiplier: 0.9, map: 'atlantis', day: 0 },
        c: { multiplier: 'x', map: null, day: 0 },
        d: 'nope',
      };
      (data.hero as Record<string, unknown>).seal = { spellId: 'shadow', fights: 99 };
      const loaded = deserialize(JSON.stringify(data))!;
      expect(loaded.day).toBe(0);
      expect(loaded.regard).toEqual({ elder: 2, farmer: -2, wren: 1 });
      expect(loaded.regardPeak).toEqual({});
      expect(loaded.encounters).toEqual({
        elder: {
          strain: 2,
          fails: 0,
          wins: 2,
          tries: 0,
          waitPast: 3,
          playedDay: null,
          wonDay: null,
        },
      });
      expect(loaded.prices).toEqual({ a: { multiplier: 1.3, map: 'mossvale', day: 0 } });
      expect(loaded.hero.seal).toEqual({ spellId: 'shadow', fights: 3 });
      (data.hero as Record<string, unknown>).seal = 'sealed';
      data.encounters = 'none';
      data.prices = null;
      const bare = deserialize(JSON.stringify(data))!;
      expect(bare.hero.seal).toBeNull();
      expect(bare.encounters).toEqual({});
      expect(bare.prices).toEqual({});
    },
  );
});
