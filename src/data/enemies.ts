import type { Element } from '../core/elements';
import type { EnemyDef, EnemyMove } from './types';

/** Every enemy in the game, keyed by id. */
export const ENEMIES: Readonly<Record<string, EnemyDef>> = {
  slime: {
    id: 'slime',
    name: 'Green Slime',
    level: 1,
    hp: 18,
    atk: 4,
    xp: 8,
    gil: 6,
    element: 'nature',
    actEvery: 4,
    moves: [{ kind: 'attack', name: 'Bounce', power: 1 }],
    drops: [{ itemId: 'slimeGel', chance: 0.5 }],
    sprite: 'enemy.slime',
    description: 'A wobbling blob of nature magic.',
  },
  shroom: {
    id: 'shroom',
    name: 'Spore Shroom',
    level: 2,
    hp: 26,
    atk: 6,
    xp: 12,
    gil: 9,
    element: 'nature',
    actEvery: 3,
    moves: [
      { kind: 'attack', name: 'Headbutt', power: 2 },
      { kind: 'attack', name: 'Headbutt', power: 2 },
      { kind: 'haste', name: 'Spore Cloud', pieces: 3 },
    ],
    drops: [{ itemId: 'sporeCap', chance: 0.25 }],
    sprite: 'enemy.shroom',
    description: 'A grumpy toadstool. Its spores make your crystals fall faster.',
  },
  goblin: {
    id: 'goblin',
    name: 'Goblin Scout',
    level: 3,
    hp: 32,
    atk: 7,
    xp: 16,
    gil: 14,
    element: 'earth',
    actEvery: 4,
    moves: [
      { kind: 'attack', name: 'Stab', power: 3 },
      { kind: 'curse', name: 'Rock Toss', rows: 1 },
    ],
    drops: [
      { itemId: 'goblinCharm', chance: 0.4 },
      { itemId: 'herb', chance: 0.3 },
    ],
    sprite: 'char.008',
    description: 'Throws rocks that pile stone onto your board.',
  },
  moonImp: {
    id: 'moonImp',
    name: 'Moon Imp',
    level: 3,
    hp: 30,
    atk: 8,
    xp: 22,
    gil: 10,
    element: 'arcane',
    actEvery: 3,
    moves: [
      { kind: 'attack', name: 'Swoop', power: 2 },
      { kind: 'drain', name: 'Leech Mana', mana: 3 },
    ],
    sprite: 'battler.moonImp',
    description: 'A winged imp that feeds on mana.',
  },
  shadeImp: {
    id: 'shadeImp',
    name: 'Shade Imp',
    level: 4,
    hp: 36,
    atk: 9,
    xp: 30,
    gil: 16,
    element: 'arcane',
    actEvery: 4,
    moves: [
      { kind: 'attack', name: 'Moonbeam', power: 5 },
      { kind: 'heal', name: 'Glimmer', amount: 10 },
      { kind: 'curse', name: 'Hex', rows: 1 },
    ],
    drops: [{ itemId: 'moonShard', chance: 0.5 }],
    sprite: 'battler.shadeImp',
    description: 'A shadowy imp that mends itself and hexes your board.',
  },
  brute: {
    id: 'brute',
    name: 'Cave Brute',
    level: 5,
    hp: 54,
    atk: 11,
    xp: 40,
    gil: 22,
    element: 'earth',
    actEvery: 5,
    moves: [
      { kind: 'attack', name: 'Slam', power: 6 },
      { kind: 'curse', name: 'Rubble', rows: 2 },
    ],
    drops: [{ itemId: 'ether', chance: 0.4 }],
    sprite: 'battler.brute',
    description: 'Slow, but buries your board in rubble.',
  },
  moonWyrm: {
    id: 'moonWyrm',
    name: 'Moon Wyrm',
    level: 7,
    hp: 260,
    atk: 15,
    xp: 120,
    gil: 60,
    element: 'arcane',
    extraResist: ['water'],
    actEvery: 3,
    enrage: { below: 0.5, actEvery: 2, curseRows: 3 },
    finale: true,
    moves: [
      { kind: 'attack', name: 'Lunar Breath', power: 8 },
      { kind: 'attack', name: 'Tail Sweep', power: 5 },
      { kind: 'curse', name: 'Crystal Tomb', rows: 2 },
      { kind: 'haste', name: 'Eclipse', pieces: 4 },
      { kind: 'drain', name: 'Moon Drain', mana: 4 },
    ],
    drops: [{ itemId: 'phoenixFeather', chance: 1 }],
    sprite: 'battler.wyrm',
    description: 'Guardian of the Moon Caves.',
  },

  ...wisps(),
};

/**
 * A wisp: the trial foe a mentor summons at home for a lesson, one of each
 * element, sharing the slime's sprite washed in the element's colour. These
 * are their difficulty 1 numbers; `lessonFoe` scales them up. They give no
 * spoils: the lesson is the reward.
 */
function wisp(id: string, name: string, element: Element, special: EnemyMove): EnemyDef {
  return {
    id,
    name,
    level: 2,
    hp: 24,
    atk: 4,
    xp: 0,
    gil: 0,
    element,
    actEvery: 5,
    moves: [{ kind: 'attack', name: 'Lash', power: 2 }, special],
    sprite: 'enemy.slime',
    tint: element,
    description: 'A wisp of raw mana, summoned for a lesson.',
  };
}

function wisps(): Record<string, EnemyDef> {
  const list = [
    wisp('emberWisp', 'Ember Wisp', 'fire', { kind: 'attack', name: 'Flare', power: 5 }),
    wisp('tideWisp', 'Tide Wisp', 'water', { kind: 'haste', name: 'Undertow', pieces: 2 }),
    wisp('sparkWisp', 'Spark Wisp', 'lightning', { kind: 'attack', name: 'Zap', power: 4 }),
    wisp('mossWisp', 'Moss Wisp', 'nature', { kind: 'heal', name: 'Bloom', amount: 8 }),
    wisp('stoneWisp', 'Stone Wisp', 'earth', { kind: 'curse', name: 'Pebbles', rows: 1 }),
    wisp('moonWisp', 'Moon Wisp', 'arcane', { kind: 'drain', name: 'Siphon', mana: 3 }),
    wisp('galeWisp', 'Gale Wisp', 'wind', { kind: 'haste', name: 'Gust', pieces: 2 }),
  ];
  return Object.fromEntries(list.map((enemy) => [enemy.id, enemy]));
}
