import { describe, expect, it } from 'vitest';
import {
  CORRUPT_KEY,
  SAVE_KEY,
  deserialize,
  loadSave,
  saveGame,
  serialize,
  type KeyValueStore,
} from '../src/game/save';
import { START } from '../src/data/maps';
import { newGame } from '../src/world/state';

const data = () => JSON.parse(serialize(newGame()));
const load = (save: unknown) => deserialize(JSON.stringify(save));

const memoryStore = (entries: Record<string, string> = {}) => {
  const map = new Map(Object.entries(entries));
  const store: KeyValueStore = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
  return { store, map };
};

describe('save validation: structural garbage is rejected', () => {
  it.each(['not json', 'null', 'true', '7', '[]', '"save"', '{}'])(
    'rejects %s without throwing',
    (json) => {
      expect(deserialize(json)).toBeNull();
    },
  );

  it.each([
    ['hero', null],
    ['hero', []],
    ['mapId', 7],
    ['x', 'left'],
    ['flags', 'npc:sage'],
    ['version', 999],
  ])('rejects world field %s=%j', (field, value) => {
    expect(load({ ...data(), [field as string]: value })).toBeNull();
  });

  it.each([
    ['name', 7],
    ['level', 'one'],
    ['hp', null],
    ['gil', '25'],
    ['xp', undefined],
  ])('rejects a mistyped core hero field %s=%j', (field, value) => {
    const save = data();
    save.hero[field as string] = value;
    expect(load(save)).toBeNull();
  });

  it('rejects nonfinite numbers parsed from valid JSON', () => {
    const json = serialize(newGame()).replace('"gil":25', '"gil":1e999');
    expect(json).toContain('1e999');
    expect(deserialize(json)).toBeNull();
  });
});

describe('save validation: stale entries are repaired, not fatal', () => {
  it('drops a removed item and an unknown spell but keeps the rest', () => {
    const save = data();
    save.hero.items = { herb: 2, wolfPelt: 3, ether: 1.6, tent: 0 };
    save.hero.spells.unknownSpell = { level: 1, step: {}, kept: {} };
    save.hero.weaponId = 'wolfPelt';
    save.hero.armorId = 'herb';
    const hero = load(save)!.hero;
    expect(hero.items).toEqual({ herb: 2, ether: 2 });
    expect(Object.keys(hero.spells)).toEqual(Object.keys(data().hero.spells));
    expect([hero.weaponId, hero.armorId]).toEqual([null, null]);
  });

  it('clamps HP above the max and mana above the cap, and integerises numbers', () => {
    const save = data();
    save.hero.hp = 99999;
    save.hero.mana.fire = 999;
    save.hero.mana.wind = -4;
    save.hero.gil = 10.6;
    save.hero.level = 0;
    save.hero.xp = -1;
    save.hero.stats.vitality = 11.2;
    const hero = load(save)!.hero;
    expect(hero.hp).toBe(hero.maxHp);
    expect(hero.mana.fire).toBe(hero.manaCap);
    expect(hero.mana.wind).toBe(0);
    expect([hero.gil, hero.level, hero.xp, hero.stats.vitality]).toEqual([11, 1, 0, 10]);
  });

  it('defaults malformed enhancements, spell levels and stats, and refills missing mana', () => {
    const save = data();
    const id = 'gale';
    save.hero.spells[id] = { level: 999, step: { power: -1 }, kept: null };
    save.hero.stats = {};
    save.hero.mana = null;
    const hero = load(save)!.hero;
    expect(hero.spells[id]!.step).toEqual({ power: 0, efficiency: 0, effect: 0 });
    expect(hero.spells[id]!.kept).toEqual({ power: 0, efficiency: 0, effect: 0 });
    expect(hero.spells[id]!.level).toBeGreaterThanOrEqual(1);
    expect(Object.values(hero.stats).every((rank) => rank === 0)).toBe(true);
    expect(Object.values(hero.mana).every((n) => n === hero.manaCap)).toBe(true);
  });

  it('relearns the class spell when every saved spell is unknown', () => {
    const save = data();
    const classSpells = Object.keys(save.hero.spells);
    save.hero.spells = { goneSpell: { level: 1, step: {}, kept: {} } };
    expect(Object.keys(load(save)!.hero.spells)).toEqual(classSpells.slice(0, 1));
  });

  it('drops a seal on a spell the hero does not know, and unknown or negative feats', () => {
    const save = data();
    save.hero.seal = { spellId: 'meteor', fights: 2 };
    save.hero.feats = { hastedClear: -1, 'pure.fire': 2, hastedQuad: 'x', bogus: 4 };
    save.hero.titleElement = 'missingElement';
    const hero = load(save)!.hero;
    expect(hero.seal).toBeNull();
    expect(hero.feats).toEqual({ 'pure.fire': 2 });
    expect(hero.titleElement).not.toBe('missingElement');
  });

  it('repairs world fields: facing, flags, victories, position, talk', () => {
    const loaded = load({
      ...data(),
      facing: 'diagonal',
      flags: [1, 'npc:sage'],
      victories: -1,
      x: 2.5,
      talk: { a: 2, b: -1 },
    })!;
    expect(loaded.facing).toBe('down');
    expect(loaded.flags.has('npc:sage')).toBe(true);
    expect(loaded.victories).toBe(0);
    expect([loaded.mapId, loaded.x, loaded.y]).toEqual([START.map, START.x, START.y]);
    expect(loaded.talk).toEqual({ a: 2 });
  });

  it('falls back to the default class and the start for unknown ids', () => {
    const save = data();
    save.hero.classId = 'constructor';
    save.respawn = { map: 'constructor', x: 1, y: 1 };
    const loaded = load(save)!;
    expect(loaded.hero.classId).toBe('ranger');
    expect(loaded.respawn).toEqual(START);
  });

  it('round-trips valid heroes of every class unchanged', () => {
    for (const id of ['ranger', 'knight', 'mage', 'rogue']) {
      const state = newGame(id);
      expect(deserialize(serialize(state))?.hero).toEqual(state.hero);
    }
  });

  it('migrates before sanitising: an old version 1 save with a stale item still loads', () => {
    const save = data();
    const v4Fields = ['mana', 'manaCap', 'stats', 'skillPoints'];
    const hero = Object.fromEntries(
      Object.entries(save.hero).filter(([field]) => !v4Fields.includes(field)),
    );
    const old = {
      ...save,
      version: 1,
      mapId: 'caves1',
      x: 2,
      y: 2,
      flags: ['cavePass'],
      hero: { ...hero, mp: 5, maxMp: 15, items: { herb: 1, wolfPelt: 2 } },
    };
    delete old.talk;
    const loaded = load(old)!;
    expect(loaded.hero.mana.fire).toBe(5);
    // Past the Refusal it never saw, it still gets Rowan's Focus Stone.
    expect(loaded.hero.items).toEqual({ herb: 1, wellStone: 1 });
    // migrateFlags (the Cave Pass opens the new road) and migrateStory (visions seen).
    expect(
      ['ridgeCleared', 'peakGate', 'vision:1', 'vision:3'].every((f) => loaded.flags.has(f)),
    ).toBe(true);
    expect([loaded.mapId, loaded.x, loaded.y]).toEqual(['caves1', 2, 2]);
  });

  it('relocates a version-7 Sunken Ruins adventure without losing its earned progress', () => {
    const state = newGame('mage');
    state.hero.gil = 347;
    state.hero.items.moonShard = 2;
    state.flags = new Set(['wyrmBeaten', 'defeated:c2-wyrm', 'cavePass']);
    state.victories = 23;
    const save = JSON.parse(serialize(state));
    save.version = 7;
    save.mapId = 'sunkenRuins';
    save.x = 7;
    save.y = 10;
    save.respawn = { map: 'sunkenRuins', x: 7, y: 9 };
    delete save.talk;
    const loaded = load(save)!;
    expect([loaded.mapId, loaded.x, loaded.y]).toEqual(['overworld', 15, 19]);
    expect(loaded.hero).toEqual({
      ...state.hero,
      items: { ...state.hero.items, wellStone: 1 },
    });
    expect(loaded.victories).toBe(23);
    for (const flag of state.flags) expect(loaded.flags.has(flag)).toBe(true);
    expect(loaded.flags.has('vision:3')).toBe(true);
    expect(loaded.flags.has('scene:refusal')).toBe(true);
    expect(loaded.flags.has('ruinsOpen')).toBe(false);
    expect(loaded.respawn).toEqual(START);
    expect(loaded.talk).toEqual({});
  });

  it('preserves unfamiliar progress flags so later campaign steps survive saves', () => {
    const state = newGame();
    state.flags.add('campaign:future-step');
    expect(deserialize(serialize(state))!.flags.has('campaign:future-step')).toBe(true);
  });
});

describe('loadSave', () => {
  it('reports no save and a readable save', () => {
    expect(loadSave(memoryStore().store)).toEqual({
      state: null,
      corrupt: false,
      backupKey: null,
    });
    const { store } = memoryStore({ [SAVE_KEY]: serialize(newGame()) });
    expect(loadSave(store).state?.mapId).toBe('mossvale');
  });

  it('backs up an unreadable save, and the next autosave leaves the backup alone', () => {
    const { store, map } = memoryStore({ [SAVE_KEY]: '{"version":8,"hero":' });
    expect(loadSave(store)).toEqual({ state: null, corrupt: true, backupKey: CORRUPT_KEY });
    expect(map.get(CORRUPT_KEY)).toBe('{"version":8,"hero":');
    expect(saveGame(store, newGame())).toBe(true);
    expect(map.get(CORRUPT_KEY)).toBe('{"version":8,"hero":');
    expect(loadSave(store).state).not.toBeNull();
  });

  it('keeps an earlier, different backup and stores the newer one beside it', () => {
    const { store, map } = memoryStore({ [SAVE_KEY]: 'newer', [CORRUPT_KEY]: 'older' });
    expect(loadSave(store, 42).backupKey).toBe(`${CORRUPT_KEY}.42`);
    expect([map.get(CORRUPT_KEY), map.get(`${CORRUPT_KEY}.42`)]).toEqual(['older', 'newer']);
    // Reloading the same unreadable save again reuses the first backup.
    map.set(SAVE_KEY, 'older');
    expect(loadSave(store).backupKey).toBe(CORRUPT_KEY);
  });

  it('keeps distinct backups made at the same timestamp and reuses matching copies', () => {
    const { store, map } = memoryStore({
      [SAVE_KEY]: 'third',
      [CORRUPT_KEY]: 'first',
      [`${CORRUPT_KEY}.42`]: 'second',
    });
    expect(loadSave(store, 42).backupKey).toBe(`${CORRUPT_KEY}.42.1`);
    expect(map.get(CORRUPT_KEY)).toBe('first');
    expect(map.get(`${CORRUPT_KEY}.42`)).toBe('second');
    expect(map.get(`${CORRUPT_KEY}.42.1`)).toBe('third');
    expect(loadSave(store, 42).backupKey).toBe(`${CORRUPT_KEY}.42.1`);
  });

  it('says so when the backup itself cannot be written', () => {
    const store: KeyValueStore = {
      getItem: () => 'garbage',
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => undefined,
    };
    expect(loadSave(store)).toEqual({ state: null, corrupt: true, backupKey: null });
  });
});
