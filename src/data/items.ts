import type { ItemDef } from './types';

/** Every item in the game, keyed by id. */
export const ITEMS: Readonly<Record<string, ItemDef>> = {
  // Consumables
  herb: {
    id: 'herb',
    name: 'Herb',
    kind: 'consumable',
    price: 10,
    description: 'Restore 35% of your max HP.',
    use: { heal: 0.35 },
  },
  ether: {
    id: 'ether',
    name: 'Ether',
    kind: 'consumable',
    price: 14,
    description: 'In battle: for 3 pieces, cleared crystals give double mana.',
    use: { manaBoost: 3 },
  },
  phoenixFeather: {
    id: 'phoenixFeather',
    name: 'Phoenix Feather',
    kind: 'consumable',
    price: 30,
    description:
      'Revives you with 35% of your HP if you fall in battle. Used automatically; counts as one of the fight’s 2 item uses.',
  },
  // Spell tomes are no longer sold (mentors teach spells); old saves may still hold them.
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
    description: 'Fully restore HP. You will wake here if you fall.',
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
    price: 80,
    atk: 7,
    description: 'Line clears hit 7 harder.',
  },
  smithHammer: {
    id: 'smithHammer',
    name: "Hilda's Hammer",
    kind: 'weapon',
    price: 75,
    atk: 9,
    description: 'Forged for her own hand. Line clears hit 9 harder.',
  },
  knightBlade: {
    id: 'knightBlade',
    name: 'Knight Blade',
    kind: 'weapon',
    price: 150,
    atk: 12,
    description: 'Line clears hit 12 harder.',
  },
  flameBrand: {
    id: 'flameBrand',
    name: 'Flame Brand',
    kind: 'weapon',
    price: 260,
    atk: 17,
    description: 'Forged in Emberforge. Line clears hit 17 harder.',
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
    price: 90,
    def: 6,
    description: 'Reduce damage taken by 6.',
  },
  forgePlate: {
    id: 'forgePlate',
    name: 'Forge Plate',
    kind: 'armor',
    price: 220,
    def: 10,
    description: 'Emberforge steel. Reduce damage taken by 10.',
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
  groveCharm: {
    id: 'groveCharm',
    name: 'Grove Charm',
    kind: 'accessory',
    price: 40,
    pieceBias: { nature: 1 },
    description: 'Braided from the first sprouts. More nature (green) pieces fall.',
  },
  wellStone: {
    id: 'wellStone',
    name: 'Well Stone',
    kind: 'accessory',
    price: 40,
    pieceBias: { earth: 1 },
    description: 'From the first dig of the Mossvale well. More earth (orange) pieces fall.',
  },
  moonCharm: {
    id: 'moonCharm',
    name: 'Moon Charm',
    kind: 'accessory',
    price: 50,
    pieceBias: { arcane: 1 },
    description: 'A carved Moon Shard. More arcane (violet) pieces fall.',
  },

  // Treasures: dropped by monsters and offered to NPCs. Never stocked; their price is
  // what selling one is based on.
  slimeGel: {
    id: 'slimeGel',
    name: 'Slime Gel',
    kind: 'treasure',
    price: 6,
    description: 'Sticky and faintly glowing.',
  },
  sporeCap: {
    id: 'sporeCap',
    name: 'Spore Cap',
    kind: 'treasure',
    price: 10,
    description: 'A springy red mushroom cap. Hazel, the grove mentor, would know its use.',
  },
  goblinCharm: {
    id: 'goblinCharm',
    name: 'Goblin Charm',
    kind: 'treasure',
    price: 20,
    description: 'A crude trinket of bone and wire.',
  },
  moonShard: {
    id: 'moonShard',
    name: 'Moon Shard',
    kind: 'treasure',
    price: 20,
    description: 'A sliver of pale crystal from the Moon Caves.',
  },
};
