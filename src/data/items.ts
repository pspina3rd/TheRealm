import type { ItemDef } from './types';

/** Every item in the game, keyed by id. */
export const ITEMS: Readonly<Record<string, ItemDef>> = {
  // Consumables
  herb: {
    id: 'herb',
    name: 'Herb',
    kind: 'consumable',
    price: 10,
    description: 'Restore 20 HP.',
    use: { heal: 20 },
  },
  ether: {
    id: 'ether',
    name: 'Ether',
    kind: 'consumable',
    price: 14,
    description: 'Restore 8 MP.',
    use: { mp: 8 },
  },
  phoenixFeather: {
    id: 'phoenixFeather',
    name: 'Phoenix Feather',
    kind: 'consumable',
    price: 30,
    description: 'Revives you with half HP if you fall in battle. Used automatically.',
  },
  blizzardTome: {
    id: 'blizzardTome',
    name: 'Tome of Blizzard',
    kind: 'consumable',
    price: 0,
    description: 'Read to learn Blizzard.',
    use: { learnSpell: 'blizzard' },
  },

  // Services
  innRest: {
    id: 'innRest',
    name: "Night's Rest",
    kind: 'service',
    price: 10,
    description: 'Fully restore HP and MP. You will wake here if you fall.',
    use: { rest: true },
  },

  // Weapons
  copperSword: {
    id: 'copperSword',
    name: 'Copper Sword',
    kind: 'weapon',
    price: 22,
    atk: 3,
    description: 'Line clears hit 3 harder.',
  },
  ironSword: {
    id: 'ironSword',
    name: 'Iron Sword',
    kind: 'weapon',
    price: 55,
    atk: 7,
    description: 'Line clears hit 7 harder.',
  },
  knightBlade: {
    id: 'knightBlade',
    name: 'Knight Blade',
    kind: 'weapon',
    price: 105,
    atk: 12,
    description: 'Line clears hit 12 harder.',
  },

  // Armour
  apprenticeRobe: {
    id: 'apprenticeRobe',
    name: 'Apprentice Robe',
    kind: 'armor',
    price: 20,
    def: 2,
    description: 'Reduce damage taken by 2.',
  },
  crystalMail: {
    id: 'crystalMail',
    name: 'Crystal Mail',
    kind: 'armor',
    price: 65,
    def: 6,
    description: 'Reduce damage taken by 6.',
  },

  // Treasures: dropped by monsters and offered to NPCs.
  slimeGel: {
    id: 'slimeGel',
    name: 'Slime Gel',
    kind: 'treasure',
    price: 0,
    description: 'Sticky and faintly glowing.',
  },
  wolfPelt: {
    id: 'wolfPelt',
    name: 'Wolf Pelt',
    kind: 'treasure',
    price: 0,
    description: 'Thick grey fur. The village elder has been asking for one.',
  },
  goblinCharm: {
    id: 'goblinCharm',
    name: 'Goblin Charm',
    kind: 'treasure',
    price: 0,
    description: 'A crude trinket of bone and wire.',
  },
  moonShard: {
    id: 'moonShard',
    name: 'Moon Shard',
    kind: 'treasure',
    price: 0,
    description: 'A sliver of pale crystal from the Moon Caves.',
  },
};
