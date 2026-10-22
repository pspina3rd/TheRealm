import { describe, expect, it } from 'vitest';
import type { HaggleChallenge } from '../src/battle/haggle';
import { createRng } from '../src/core/rng';
import { CLASSES } from '../src/data/classes';
import { ENEMIES } from '../src/data/enemies';
import { ITEMS } from '../src/data/items';
import { MAPS } from '../src/data/maps';
import { NPCS } from '../src/data/npcs';
import { describeInteraction, npcCompletionFlag, resolveBattle } from '../src/game/encounter';
import { addItem, createHero, itemCount, learnSpell } from '../src/game/hero';
import { grantRewards } from '../src/game/rewards';
import { VITALITY_HP } from '../src/game/stats';
import {
  SAVE_KEY,
  deleteSave,
  deserialize,
  loadGame,
  saveGame,
  serialize,
  type KeyValueStore,
} from '../src/game/save';
import { buy, cannotBuyReason, priceFor } from '../src/game/shop';
import type { EntityDef } from '../src/world/map';
import { activeEntities, newGame, travel } from '../src/world/state';
import { enhancements } from '../src/game/spells';
import { knownSpells, makeBattle, setUpVerticalIClear } from './helpers';

const entity = (mapId: string, id: string): EntityDef => {
  const found = MAPS[mapId]?.entities.find((e) => e.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe('describeInteraction', () => {
  it('offers a fight for monsters', () => {
    const result = describeInteraction(newGame(), entity('overworld', 'ow-slime-1'));
    expect(result).toMatchObject({
      kind: 'challenge',
      title: 'Green Slime',
      spec: { kind: 'combat' },
    });
  });

  it('asks for the item before an offering can start', () => {
    const state = newGame();
    expect(describeInteraction(state, entity('mossvale', 'mv-elder'))).toMatchObject({
      kind: 'needsItem',
      itemId: 'sporeCap',
      sprite: NPCS.elder!.sprite,
    });
    addItem(state.hero, 'sporeCap');
    expect(describeInteraction(state, entity('mossvale', 'mv-elder'))).toMatchObject({
      kind: 'challenge',
      rewards: NPCS.elder!.rewards,
    });
  });

  it('shows done text once a one-time NPC is complete', () => {
    const state = newGame();
    state.flags.add(npcCompletionFlag(NPCS.kid!));
    expect(describeInteraction(state, entity('mossvale', 'mv-kid'))).toEqual({
      kind: 'message',
      title: 'Pip',
      sprite: NPCS.kid!.sprite,
      text: NPCS.kid!.doneText,
    });
  });

  it('rejects unknown entity references', () => {
    const state = newGame();
    expect(() =>
      describeInteraction(state, { id: 'x', kind: 'npc', npcId: 'nope', x: 0, y: 0 }),
    ).toThrow();
    expect(() =>
      describeInteraction(state, { id: 'x', kind: 'monster', enemyId: 'nope', x: 0, y: 0 }),
    ).toThrow();
  });
});

describe('resolveBattle', () => {
  it('awards spoils and removes the monster on victory', () => {
    const state = newGame();
    travel(state, { map: 'overworld', x: 5, y: 6 });
    const slime = entity('overworld', 'ow-slime-1');
    const battle = makeBattle({ kind: 'combat', enemyId: 'slime' }, state.hero);
    battle.combat!.enemyHp = 0;
    const gil = state.hero.gil;
    const result = resolveBattle(state, slime, battle, createRng(1));
    expect(result.won).toBe(true);
    expect(state.hero.gil).toBe(gil + ENEMIES.slime!.gil);
    expect(state.hero.xp).toBe(ENEMIES.slime!.xp);
    expect(activeEntities(state).some((e) => e.id === slime.id)).toBe(false);
  });

  it('reports XP, gil, drops and level-ups as gains', () => {
    const state = newGame();
    const wyrm = entity('caves2', 'c2-wyrm');
    const battle = makeBattle({ kind: 'combat', enemyId: 'moonWyrm' }, state.hero);
    battle.combat!.enemyHp = 0;
    const { gains, fell, speech } = resolveBattle(state, wyrm, battle, createRng(1));
    expect(gains).toEqual([
      { kind: 'xp', amount: ENEMIES.moonWyrm!.xp },
      { kind: 'gil', amount: ENEMIES.moonWyrm!.gil },
      { kind: 'item', itemId: 'phoenixFeather', count: 1 },
      { kind: 'level', level: state.hero.level, points: 2 * (state.hero.level - 1) },
    ]);
    expect(fell).toBe(false);
    expect(speech).toBeNull();
  });

  it('respawns the hero, restored but poorer, on defeat', () => {
    const state = newGame();
    travel(state, { map: 'overworld', x: 5, y: 6 });
    state.hero.gil = 41;
    state.hero.hp = 0;
    const battle = makeBattle({ kind: 'combat', enemyId: 'slime' }, state.hero);
    const result = resolveBattle(state, entity('overworld', 'ow-slime-1'), battle, createRng(1));
    expect(result.won).toBe(false);
    expect(result.fell).toBe(true);
    expect(result.gains).toEqual([{ kind: 'gil', amount: -20 }]);
    expect(state.hero.gil).toBe(21);
    expect(state.hero.hp).toBe(state.hero.maxHp);
    expect(state.mapId).toBe(state.respawn.map);
  });

  it('rejects a non-combat battle against a monster', () => {
    const state = newGame();
    const battle = makeBattle({ kind: 'haggle', pieceLimit: 1, rivalIntervalMs: 1 });
    expect(() =>
      resolveBattle(state, entity('overworld', 'ow-slime-1'), battle, createRng(1)),
    ).toThrow();
  });

  it('consumes the offering and grants a one-time reward', () => {
    const state = newGame();
    addItem(state.hero, 'sporeCap');
    const battle = makeBattle(NPCS.elder!.challenge, state.hero);
    setUpVerticalIClear(battle.board, 2);
    battle.input('hardDrop');
    expect(battle.status).toBe('won');
    const result = resolveBattle(state, entity('mossvale', 'mv-elder'), battle, createRng(1));
    expect(itemCount(state.hero, 'sporeCap')).toBe(0);
    expect(Object.keys(state.hero.spells)).toContain('quake');
    expect(state.flags.has('npc:elder')).toBe(true);
    expect(result.speech).toBe(NPCS.elder!.successText);
    expect(result.gains).toEqual([
      { kind: 'item', itemId: 'sporeCap', count: -1 },
      { kind: 'spell', spellId: 'quake' },
    ]);
  });

  it('keeps the item and gives no reward on failure', () => {
    const state = newGame();
    addItem(state.hero, 'sporeCap');
    const battle = makeBattle(NPCS.elder!.challenge, state.hero);
    battle.board.toppedOut = true;
    const result = resolveBattle(state, entity('mossvale', 'mv-elder'), battle, createRng(1));
    expect(result).toEqual({
      won: false,
      gains: [],
      speech: NPCS.elder!.failText,
      fell: false,
      shopId: null,
      priceMultiplier: 1,
    });
    expect(itemCount(state.hero, 'sporeCap')).toBe(1);
  });

  it('opens a shop at the haggled price', () => {
    const state = newGame();
    const battle = makeBattle(NPCS.merchant!.challenge, state.hero);
    (battle.challenge as HaggleChallenge).multiplier = 0.8;
    while (battle.status === 'ongoing') battle.input('hardDrop');
    const result = resolveBattle(state, entity('brightwater', 'bw-merchant'), battle, createRng(1));
    expect(result).toMatchObject({ won: true, shopId: 'brightwaterGeneral' });
    expect(result.priceMultiplier).toBeLessThanOrEqual(0.8);
    expect(state.flags.size).toBe(0); // repeatable: no completion flag
  });
});

describe('grantRewards', () => {
  it('applies each reward kind', () => {
    const state = newGame();
    const out = grantRewards(state.hero, state.flags, [
      { kind: 'gil', amount: 5 },
      { kind: 'item', itemId: 'ether', count: 2 },
      { kind: 'spell', spellId: 'meteor' },
      { kind: 'spell', spellId: 'cure' },
      { kind: 'flag', flag: 'test' },
      { kind: 'shop', shopId: 'brightwaterInn' },
    ]);
    expect(state.hero.gil).toBe(30);
    expect(itemCount(state.hero, 'ether')).toBe(3);
    expect(Object.keys(state.hero.spells)).toContain('meteor');
    expect(state.flags.has('test')).toBe(true);
    expect(out.shopId).toBe('brightwaterInn');
    // Already-known spells and hidden flags produce no gain.
    expect(out.gains).toEqual([
      { kind: 'gil', amount: 5 },
      { kind: 'item', itemId: 'ether', count: 2 },
      { kind: 'spell', spellId: 'meteor' },
    ]);
  });
});

describe('shop', () => {
  it('applies the haggle multiplier with a 1 gil minimum', () => {
    const hero = createHero('knight'); // no Charm
    expect(priceFor(hero, ITEMS.ironSword!, 0.5)).toBe(28);
    expect(priceFor(hero, ITEMS.herb!, 0.01)).toBe(1);
  });

  it('takes 3% off every price per Charm rank', () => {
    const hero = createHero('knight');
    hero.stats.charm = 5; // 15% off the 55 gil sword
    expect(priceFor(hero, ITEMS.ironSword!, 1)).toBe(47);
    expect(priceFor(hero, ITEMS.ironSword!, 0.5)).toBe(23);
  });

  it('charges a charming hero less', () => {
    const state = newGame('rogue'); // Charm 2: 6% off
    state.hero.gil = 100;
    buy(state, 'ironSword', 1);
    expect(state.hero.gil).toBe(100 - 52);
  });

  it('refuses purchases the hero cannot afford', () => {
    const state = newGame();
    state.hero.gil = 5;
    expect(cannotBuyReason(state, ITEMS.herb!, 1)).toBe('Not enough gil.');
    expect(() => buy(state, 'herb', 1)).toThrow('Not enough gil.');
    expect(() => buy(state, 'nope', 1)).toThrow('Unknown item');
  });

  it('adds consumables to the bag', () => {
    const state = newGame();
    expect(buy(state, 'herb', 1)).toContain('Bought Herb');
    expect(state.hero.gil).toBe(15);
    expect(itemCount(state.hero, 'herb')).toBe(3);
  });

  it('equips better gear and refuses duplicates', () => {
    const state = newGame();
    state.hero.gil = 500;
    expect(buy(state, 'ironSword', 1)).toContain('equipped');
    expect(state.hero.weaponId).toBe('ironSword');
    expect(cannotBuyReason(state, ITEMS.ironSword!, 1)).toBe('You already own one.');
    expect(buy(state, 'copperSword', 1)).not.toContain('equipped');
    expect(state.hero.weaponId).toBe('ironSword');
    expect(buy(state, 'crystalMail', 1)).toContain('equipped');
  });

  it('rests immediately and sets the respawn point at the inn', () => {
    const state = newGame();
    travel(state, { map: 'brightwater', x: 4, y: 12 });
    state.hero.hp = 1;
    expect(buy(state, 'innRest', 1)).toContain('fully restored');
    expect(state.hero.hp).toBe(state.hero.maxHp);
    expect(state.respawn).toEqual({ map: 'brightwater', x: 4, y: 12 });
    expect(itemCount(state.hero, 'innRest')).toBe(0);
  });
});

describe('save', () => {
  const memoryStore = (): KeyValueStore & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return {
      data,
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    };
  };

  it('round-trips game state', () => {
    const state = newGame();
    state.flags.add('cavePass');
    state.hero.gil = 99;
    state.cleared.add('ow-slime-1');
    const loaded = deserialize(serialize(state))!;
    expect(loaded.hero).toEqual(state.hero);
    expect(loaded.flags).toEqual(new Set(['cavePass']));
    // Temporary monster clears are not saved.
    expect(loaded.cleared.size).toBe(0);
  });

  it('rejects malformed or incompatible saves', () => {
    expect(deserialize('not json')).toBeNull();
    expect(deserialize('{}')).toBeNull();
    const data = JSON.parse(serialize(newGame()));
    expect(deserialize(JSON.stringify({ ...data, version: 999 }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...data, mapId: 'nowhere' }))).toBeNull();
  });

  it('defaults a missing facing direction', () => {
    const data = JSON.parse(serialize(newGame()));
    delete data.facing;
    expect(deserialize(JSON.stringify(data))?.facing).toBe('down');
  });

  it('saves, loads and deletes through a store', () => {
    const store = memoryStore();
    expect(loadGame(store)).toBeNull();
    expect(saveGame(store, newGame())).toBe(true);
    expect(store.data.has(SAVE_KEY)).toBe(true);
    expect(loadGame(store)?.mapId).toBe('mossvale');
    deleteSave(store);
    expect(loadGame(store)).toBeNull();
  });

  it('survives storage that throws', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    expect(saveGame(broken, newGame())).toBe(false);
    expect(loadGame(broken)).toBeNull();
    expect(() => deleteSave(broken)).not.toThrow();
  });
});

describe('save compatibility', () => {
  it('gives saves from before hero classes the default class', () => {
    const data = JSON.parse(serialize(newGame()));
    delete data.hero.classId;
    expect(deserialize(JSON.stringify(data))?.hero.classId).toBe('ranger');
  });
});

/** Fields a hero gained in save version 4. */
const V4_FIELDS = ['stats', 'skillPoints'];

/**
 * A saved hero without `fields`, as an older version stored it: before
 * version 5, spells were a list of ids and nothing was locked.
 */
const without = (hero: Record<string, unknown>, fields: readonly string[]) => ({
  ...Object.fromEntries(
    Object.entries(hero).filter(([key]) => ![...fields, 'lockedCategories'].includes(key)),
  ),
  spells: Object.keys(hero.spells as object),
});

describe('save migration from version 1 (MP)', () => {
  const v1 = () => {
    const data = JSON.parse(serialize(newGame()));
    const hero = without(data.hero, [
      'mana',
      'manaCap',
      'titleElement',
      'accessoryId',
      ...V4_FIELDS,
    ]);
    return { ...data, version: 1, hero: { ...hero, mp: 5, maxMp: 15 } };
  };

  it('turns MP into elemental pools and adds the new fields', () => {
    const hero = deserialize(JSON.stringify(v1()))!.hero;
    expect(hero.manaCap).toBe(12); // recomputed from the class in version 4
    expect(hero.mana.fire).toBe(5);
    expect(hero.mana.wind).toBe(5);
    expect(hero.titleElement).toBe('wind');
    expect(hero.accessoryId).toBeNull();
    expect('mp' in hero).toBe(false);
  });

  it('uses defaults when MP is missing', () => {
    const data = v1();
    delete data.hero.mp;
    delete data.hero.maxMp;
    const hero = deserialize(JSON.stringify(data))!.hero;
    expect(hero.manaCap).toBe(12);
    expect(hero.mana.earth).toBe(12);
  });

  it('keeps current saves as they are', () => {
    const state = newGame('mage');
    state.hero.mana.fire = 3;
    const hero = deserialize(serialize(state))!.hero;
    expect(hero).toEqual(state.hero);
  });
});

describe('save migration from version 2 (attunement)', () => {
  const v2 = (attunement: string | null) => {
    const data = JSON.parse(serialize(newGame('knight')));
    const hero = without(data.hero, ['titleElement', ...V4_FIELDS]);
    return { ...data, version: 2, hero: { ...hero, attunement, spells: ['fire', 'cure'] } };
  };

  it('drops attunement, keeps its title and teaches the class spell', () => {
    const hero = deserialize(JSON.stringify(v2('fire')))!.hero;
    expect('attunement' in hero).toBe(false);
    expect(hero.titleElement).toBe('fire');
    expect(hero.spells).toEqual(knownSpells('quake', 'fire', 'cure'));
  });

  it('titles an unattuned hero by their class', () => {
    expect(deserialize(JSON.stringify(v2(null)))!.hero.titleElement).toBe('earth');
  });

  it('rejects unknown versions', () => {
    expect(deserialize(JSON.stringify({ ...v2(null), version: 99 }))).toBeNull();
  });
});

describe('save migration from version 3 (stats)', () => {
  /** A level 5 Knight as version 3 saved it, with the old automatic growth. */
  const v3 = () => {
    const data = JSON.parse(serialize(newGame('knight')));
    const hero = {
      ...without(data.hero, V4_FIELDS),
      level: 5,
      maxHp: 88,
      hp: 80,
      atk: 13,
      def: 11,
      manaCap: 14,
      mana: { ...data.hero.mana, fire: 14, water: 3 },
    };
    return { ...data, version: 3, hero };
  };

  it('gives the class spread and 2 unspent points per level gained', () => {
    const hero = deserialize(JSON.stringify(v3()))!.hero;
    expect(hero.stats).toEqual(createHero('knight').stats);
    expect(hero.skillPoints).toBe(8);
  });

  it('recomputes stats from the class with HP growth only', () => {
    const hero = deserialize(JSON.stringify(v3()))!.hero;
    const knight = CLASSES.knight!;
    expect(hero.maxHp).toBe(knight.base.hp + 4 * knight.hpGrowth + 2 * VITALITY_HP);
    expect([hero.manaCap, hero.atk, hero.def]).toEqual([
      knight.base.mana,
      knight.base.atk,
      knight.base.def + 2,
    ]);
  });

  it('keeps current HP and mana within the new caps', () => {
    const data = v3();
    data.hero.hp = 999;
    const hero = deserialize(JSON.stringify(data))!.hero;
    expect(hero.hp).toBe(hero.maxHp);
    expect(hero.mana.fire).toBe(hero.manaCap);
    expect(hero.mana.water).toBe(3);
  });

  it('keeps version 4 stats and points as saved', () => {
    const state = newGame('rogue');
    state.hero.skillPoints = 3;
    state.hero.stats.luck = 4;
    const data = JSON.parse(serialize(state));
    const v4 = { ...data, version: 4, hero: without(data.hero, []) };
    expect(deserialize(JSON.stringify(v4))!.hero).toEqual(state.hero);
  });
});

describe('save migration from version 4 (spell levels)', () => {
  const v4 = (spells: string[]) => {
    const data = JSON.parse(serialize(newGame('mage')));
    return { ...data, version: 4, hero: { ...without(data.hero, []), spells } };
  };

  it('turns the spell list into level 1 spells with no enhancements, in order', () => {
    const hero = deserialize(JSON.stringify(v4(['shadow', 'cure', 'fire'])))!.hero;
    expect(hero.spells).toEqual(knownSpells('shadow', 'cure', 'fire'));
    expect(Object.keys(hero.spells)).toEqual(['shadow', 'cure', 'fire']);
    expect(hero.lockedCategories).toEqual([]);
  });

  it('keeps version 5 levels, enhancements and locks as saved', () => {
    const state = newGame('mage');
    state.hero.spells.shadow = {
      level: 2,
      step: enhancements({ power: 1 }),
      kept: enhancements({ power: 1, efficiency: 1, effect: 1 }),
    };
    state.hero.lockedCategories = ['arcane'];
    expect(deserialize(serialize(state))!.hero).toEqual(state.hero);
  });
});

describe('shopping for charms and tomes', () => {
  it('puts on a charm if none is worn, but does not swap one out', () => {
    const state = newGame();
    state.hero.gil = 500;
    expect(buy(state, 'emberCharm', 1)).toContain('equipped');
    expect(state.hero.accessoryId).toBe('emberCharm');
    expect(buy(state, 'tideCharm', 1)).not.toContain('equipped');
    expect(state.hero.accessoryId).toBe('emberCharm');
    expect(cannotBuyReason(state, ITEMS.emberCharm!, 1)).toBe('You already own one.');
  });

  it('refuses tomes for spells already known or already carried', () => {
    const state = newGame();
    state.hero.gil = 500;
    buy(state, 'fireTome', 1);
    expect(cannotBuyReason(state, ITEMS.fireTome!, 1)).toBe('You already have this spell.');
    expect(cannotBuyReason(state, ITEMS.galeTome!, 1)).toBe('You already have this spell.');
    learnSpell(state.hero, 'shadow');
    expect(cannotBuyReason(state, ITEMS.shadowTome!, 1)).toBe('You already have this spell.');
  });
});
