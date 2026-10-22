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
    description: 'Restore 4 mana to every element.',
    use: { mana: 4 },
  },
  phoenixFeather: {
    id: 'phoenixFeather',
    name: 'Phoenix Feather',
    kind: 'consumable',
    price: 30,
    description: 'Revives you with half HP if you fall in battle. Used automatically.',
  },
  fireTome: {
    id: 'fireTome',
    name: 'Tome of Fire',
    kind: 'consumable',
    price: 40,
    description: 'Read to learn Fire.',
    use: { learnSpell: 'fire' },
  },
  galeTome: {
    id: 'galeTome',
    name: 'Tome of Gale',
    kind: 'consumable',
    price: 60,
    description: 'Read to learn Gale (wind).',
    use: { learnSpell: 'gale' },
  },
  shadowTome: {
    id: 'shadowTome',
    name: 'Tome of Shadows',
    kind: 'consumable',
    price: 90,
    description: 'Read to learn Shadow Drain (arcane).',
    use: { learnSpell: 'shadow' },
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
    description: 'Fully restore HP and mana. You will wake here if you fall.',
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

  // Accessories: charms tilt which pieces fall, making their element more common.
  emberCharm: {
    id: 'emberCharm',
    name: 'Ember Charm',
    kind: 'accessory',
    price: 40,
    pieceBias: { fire: 1 },
    description: 'More fire (red) pieces fall.',
  },
  tideCharm: {
    id: 'tideCharm',
    name: 'Tide Charm',
    kind: 'accessory',
    price: 40,
    pieceBias: { water: 1 },
    description: 'More water (blue) pieces fall.',
  },
  stormCharm: {
    id: 'stormCharm',
    name: 'Storm Charm',
    kind: 'accessory',
    price: 50,
    pieceBias: { lightning: 1 },
    description: 'More lightning (gold) pieces fall.',
  },
  windCharm: {
    id: 'windCharm',
    name: 'Wind Charm',
    kind: 'accessory',
    price: 40,
    pieceBias: { wind: 1 },
    description: 'More wind (cyan) pieces fall.',
  },

  // Treasures: dropped by monsters and offered to NPCs.
  slimeGel: {
    id: 'slimeGel',
    name: 'Slime Gel',
    kind: 'treasure',
    price: 0,
    description: 'Sticky and faintly glowing.',
  },
  sporeCap: {
    id: 'sporeCap',
    name: 'Spore Cap',
    kind: 'treasure',
    price: 0,
    description: 'A springy red mushroom cap. The village elder has been asking for one.',
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
