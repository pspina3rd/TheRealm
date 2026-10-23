import type { Element } from '../core/elements';
import type { EnemyDef, EnemyMove } from './types';

/** Every enemy in the game, keyed by id. */
export const ENEMIES: Readonly<Record<string, EnemyDef>> = {
  slime: {
    id: 'slime',
    name: 'Green Slime',
    level: 1,
    hp: 50,
    atk: 4,
    xp: 8,
    gil: 4,
    element: 'nature',
    actMs: 8500,
    moves: [
      { kind: 'attack', name: 'Bounce', power: 3 },
      { kind: 'attack', name: 'Bounce', power: 3 },
      { kind: 'petrify', name: 'Sticky Goo', cells: 3 },
    ],
    drops: [{ itemId: 'slimeGel', chance: 0.5 }],
    sprite: 'enemy.slime',
    description: 'A wobbling blob. Its goo hardens crystals into stone.',
  },
  shroom: {
    id: 'shroom',
    name: 'Spore Shroom',
    level: 2,
    hp: 70,
    atk: 5,
    xp: 12,
    gil: 6,
    element: 'nature',
    actMs: 7500,
    moves: [
      { kind: 'attack', name: 'Headbutt', power: 3 },
      { kind: 'attack', name: 'Headbutt', power: 3 },
      { kind: 'haste', name: 'Spore Cloud', pieces: 3 },
      { kind: 'fog', name: 'Spore Haze', pieces: 3 },
    ],
    drops: [{ itemId: 'sporeCap', chance: 0.15 }],
    sprite: 'enemy.shroom',
    description: 'A grumpy toadstool. Its spores speed your crystals and cloud your sight.',
  },
  goblin: {
    id: 'goblin',
    name: 'Goblin Scout',
    level: 3,
    hp: 80,
    atk: 5,
    xp: 16,
    gil: 10,
    element: 'earth',
    actMs: 8000,
    moves: [
      { kind: 'attack', name: 'Stab', power: 4 },
      { kind: 'attack', name: 'Stab', power: 4 },
      { kind: 'curse', name: 'Rock Toss', rows: 1 },
      { kind: 'seal', name: 'Stake', pieces: 3 },
    ],
    drops: [
      { itemId: 'goblinCharm', chance: 0.4 },
      { itemId: 'herb', chance: 0.3 },
    ],
    sprite: 'char.008',
    description: 'Throws rocks onto your board and stakes off a column.',
  },
  moonImp: {
    id: 'moonImp',
    name: 'Moon Imp',
    level: 3,
    hp: 85,
    atk: 10,
    xp: 22,
    gil: 10,
    element: 'arcane',
    actMs: 6000,
    moves: [
      { kind: 'attack', name: 'Swoop', power: 3 },
      { kind: 'drain', name: 'Leech Mana', mana: 4 },
      { kind: 'fog', name: 'Moon Dust', pieces: 3 },
      { kind: 'quicken', name: 'Flit', ms: 5000 },
    ],
    sprite: 'battler.moonImp',
    description: 'A winged imp that feeds on mana and dusts your eyes.',
  },
  shadeImp: {
    id: 'shadeImp',
    name: 'Shade Imp',
    level: 4,
    hp: 130,
    atk: 10,
    xp: 30,
    gil: 16,
    element: 'arcane',
    actMs: 7000,
    moves: [
      { kind: 'attack', name: 'Moonbeam', power: 5 },
      { kind: 'heal', name: 'Glimmer', amount: 12 },
      { kind: 'curse', name: 'Hex', rows: 1 },
      { kind: 'petrify', name: 'Gloom', cells: 4 },
    ],
    drops: [{ itemId: 'moonShard', chance: 0.3 }],
    sprite: 'battler.shadeImp',
    description: 'A shadowy imp that mends itself and turns your crystals to stone.',
  },
  brute: {
    id: 'brute',
    name: 'Cave Brute',
    level: 5,
    hp: 115,
    atk: 10,
    xp: 40,
    gil: 22,
    element: 'earth',
    actMs: 12500,
    moves: [
      { kind: 'attack', name: 'Slam', power: 8 },
      { kind: 'curse', name: 'Rubble', rows: 2 },
      { kind: 'seal', name: 'Boulder', pieces: 3 },
    ],
    drops: [{ itemId: 'ether', chance: 0.4 }],
    sprite: 'battler.brute',
    description: 'Slow, but buries your board in rubble and blocks a column with boulders.',
  },
  moonWyrm: {
    id: 'moonWyrm',
    name: 'Moon Wyrm',
    level: 7,
    hp: 420,
    atk: 13,
    xp: 120,
    gil: 60,
    element: 'arcane',
    extraResist: ['water'],
    actMs: 7000,
    enrage: { below: 0.5, actMs: 5000, curseRows: 3 },
    boss: true,
    finale: true,
    moves: [
      { kind: 'attack', name: 'Lunar Breath', power: 8 },
      { kind: 'attack', name: 'Tail Sweep', power: 5 },
      { kind: 'curse', name: 'Crystal Tomb', rows: 2 },
      { kind: 'haste', name: 'Eclipse', pieces: 4 },
      { kind: 'drain', name: 'Moon Drain', mana: 4 },
      { kind: 'fog', name: 'Moonfog', pieces: 4 },
      { kind: 'petrify', name: 'Starfall', cells: 6 },
      { kind: 'seal', name: 'Tidal Pull', pieces: 3 },
      { kind: 'quicken', name: 'Night Wind', ms: 6000 },
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
    hp: 50,
    atk: 4,
    xp: 0,
    gil: 0,
    element,
    actMs: 9000,
    moves: [{ kind: 'attack', name: 'Lash', power: 2 }, special],
    sprite: 'enemy.slime',
    tint: element,
    description: 'A wisp of raw mana, summoned for a lesson.',
  };
}

function wisps(): Record<string, EnemyDef> {
  const list = [
    wisp('emberWisp', 'Ember Wisp', 'fire', { kind: 'attack', name: 'Flare', power: 5 }),
    wisp('tideWisp', 'Tide Wisp', 'water', { kind: 'fog', name: 'Mistveil', pieces: 2 }),
    wisp('sparkWisp', 'Spark Wisp', 'lightning', { kind: 'attack', name: 'Zap', power: 4 }),
    wisp('mossWisp', 'Moss Wisp', 'nature', { kind: 'heal', name: 'Bloom', amount: 8 }),
    wisp('stoneWisp', 'Stone Wisp', 'earth', { kind: 'curse', name: 'Pebbles', rows: 1 }),
    wisp('moonWisp', 'Moon Wisp', 'arcane', { kind: 'drain', name: 'Siphon', mana: 3 }),
    wisp('galeWisp', 'Gale Wisp', 'wind', { kind: 'quicken', name: 'Gust', ms: 4000 }),
  ];
  return Object.fromEntries(list.map((enemy) => [enemy.id, enemy]));
}
