import type { SpellDef, SpellEffect } from './types';

/**
 * Every spell in the game, keyed by id. Each costs mana from specific
 * elemental pools, which you fill by clearing crystals of that element.
 *
 * Each element's primary spell has four levels: power and healing grow
 * about ×1.6 a level, rows and pieces by about 1 every level or two, and
 * the cost +2 a level. The rules for levels
 * and enhancements live in `src/game/spells.ts`.
 */
export const SPELLS: Readonly<Record<string, SpellDef>> = {
  fire: {
    id: 'fire',
    category: 'fire',
    role: 'primary',
    levels: [
      { name: 'Fire', cost: { fire: 6 }, effect: { kind: 'damage', power: 14 } },
      { name: 'Blaze', cost: { fire: 8 }, effect: { kind: 'damage', power: 22 } },
      { name: 'Inferno', cost: { fire: 10 }, effect: { kind: 'damage', power: 36 } },
      { name: 'Cataclysm', cost: { fire: 12 }, effect: { kind: 'damage', power: 57 } },
    ],
  },
  blizzard: {
    id: 'blizzard',
    category: 'water',
    role: 'primary',
    levels: [
      { name: 'Blizzard', cost: { water: 8 }, effect: { kind: 'freeze', power: 18, pieces: 3 } },
      { name: 'Hailstorm', cost: { water: 10 }, effect: { kind: 'freeze', power: 29, pieces: 3 } },
      { name: 'Glacier', cost: { water: 12 }, effect: { kind: 'freeze', power: 46, pieces: 4 } },
      {
        name: 'Deep Winter',
        cost: { water: 14 },
        effect: { kind: 'freeze', power: 74, pieces: 4 },
      },
    ],
  },
  thunder: {
    id: 'thunder',
    category: 'lightning',
    role: 'primary',
    levels: [
      { name: 'Thunder', cost: { lightning: 8 }, effect: { kind: 'damage', power: 24 } },
      { name: 'Thunderclap', cost: { lightning: 10 }, effect: { kind: 'damage', power: 38 } },
      { name: 'Stormcall', cost: { lightning: 12 }, effect: { kind: 'damage', power: 61 } },
      { name: 'Skyfall', cost: { lightning: 14 }, effect: { kind: 'damage', power: 98 } },
    ],
  },
  cure: {
    id: 'cure',
    category: 'nature',
    role: 'primary',
    levels: [
      { name: 'Cure', cost: { nature: 6 }, effect: { kind: 'heal', amount: 20 } },
      { name: 'Mend', cost: { nature: 8 }, effect: { kind: 'heal', amount: 32 } },
      { name: 'Restore', cost: { nature: 10 }, effect: { kind: 'heal', amount: 51 } },
      { name: 'Rebirth', cost: { nature: 12 }, effect: { kind: 'heal', amount: 82 } },
    ],
  },
  quake: {
    id: 'quake',
    category: 'earth',
    role: 'primary',
    levels: [
      { name: 'Quake', cost: { earth: 6 }, effect: { kind: 'clearRows', rows: 2, power: 6 } },
      { name: 'Rockslide', cost: { earth: 8 }, effect: { kind: 'clearRows', rows: 3, power: 10 } },
      { name: 'Upheaval', cost: { earth: 10 }, effect: { kind: 'clearRows', rows: 3, power: 16 } },
      {
        name: 'Worldsplit',
        cost: { earth: 12 },
        effect: { kind: 'clearRows', rows: 4, power: 26 },
      },
    ],
  },
  shadow: {
    id: 'shadow',
    category: 'arcane',
    role: 'primary',
    levels: [
      {
        name: 'Shadow Drain',
        cost: { arcane: 8 },
        effect: { kind: 'drain', power: 18, share: 0.5 },
      },
      {
        name: 'Soul Siphon',
        cost: { arcane: 10 },
        effect: { kind: 'drain', power: 29, share: 0.5 },
      },
      {
        name: 'Night Feast',
        cost: { arcane: 12 },
        effect: { kind: 'drain', power: 46, share: 0.5 },
      },
      {
        name: 'Void Hunger',
        cost: { arcane: 14 },
        effect: { kind: 'drain', power: 74, share: 0.5 },
      },
    ],
  },
  gale: {
    id: 'gale',
    category: 'wind',
    role: 'primary',
    levels: [
      { name: 'Gale', cost: { wind: 6 }, effect: { kind: 'tailwind', power: 10, pieces: 5 } },
      { name: 'Squall', cost: { wind: 8 }, effect: { kind: 'tailwind', power: 16, pieces: 6 } },
      { name: 'Cyclone', cost: { wind: 10 }, effect: { kind: 'tailwind', power: 26, pieces: 7 } },
      { name: 'Hurricane', cost: { wind: 12 }, effect: { kind: 'tailwind', power: 41, pieces: 8 } },
    ],
  },
  // ------------------------------------------------------------ supports ---
  // One per element, single-level, taught by its mentor once the hero knows
  // the element's primary.
  kindle: {
    id: 'kindle',
    category: 'fire',
    role: 'support',
    requires: ['fire'],
    levels: [{ name: 'Kindle', cost: { fire: 5 }, effect: { kind: 'burn', power: 4, pieces: 5 } }],
  },
  mist: {
    id: 'mist',
    category: 'water',
    role: 'support',
    requires: ['blizzard'],
    levels: [{ name: 'Mist', cost: { water: 6 }, effect: { kind: 'mist', moves: 1 } }],
  },
  static: {
    id: 'static',
    category: 'lightning',
    role: 'support',
    requires: ['thunder'],
    levels: [
      { name: 'Static', cost: { lightning: 5 }, effect: { kind: 'charge', power: 6, clears: 3 } },
    ],
  },
  regen: {
    id: 'regen',
    category: 'nature',
    role: 'support',
    requires: ['cure'],
    levels: [
      { name: 'Regen', cost: { nature: 6 }, effect: { kind: 'regen', amount: 4, pieces: 5 } },
    ],
  },
  stoneskin: {
    id: 'stoneskin',
    category: 'earth',
    role: 'support',
    requires: ['quake'],
    levels: [{ name: 'Stoneskin', cost: { earth: 5 }, effect: { kind: 'ward', amount: 15 } }],
  },
  manaTap: {
    id: 'manaTap',
    category: 'arcane',
    role: 'support',
    requires: ['shadow'],
    levels: [{ name: 'Mana Tap', cost: { arcane: 4 }, effect: { kind: 'manaTap', amount: 2 } }],
  },
  gust: {
    id: 'gust',
    category: 'wind',
    role: 'support',
    requires: ['gale'],
    levels: [{ name: 'Gust', cost: { wind: 3 }, effect: { kind: 'swap' } }],
  },

  // -------------------------------------------------------------- combos ---
  // Know another element's primary, then a mentor teaches a spell of their
  // element that costs both elements' mana and builds both alignments.
  wildfire: {
    id: 'wildfire',
    category: 'fire',
    role: 'combo',
    elements: ['fire', 'wind'],
    requires: ['gale'],
    levels: [
      {
        name: 'Wildfire',
        cost: { fire: 4, wind: 4 },
        effect: { kind: 'tailwind', power: 28, pieces: 4 },
      },
    ],
  },
  springRain: {
    id: 'springRain',
    category: 'water',
    role: 'combo',
    elements: ['water', 'nature'],
    requires: ['cure'],
    levels: [
      { name: 'Spring Rain', cost: { water: 4, nature: 4 }, effect: { kind: 'heal', amount: 36 } },
    ],
  },
  stormSurge: {
    id: 'stormSurge',
    category: 'lightning',
    role: 'combo',
    elements: ['lightning', 'water'],
    requires: ['blizzard'],
    levels: [
      {
        name: 'Storm Surge',
        cost: { lightning: 4, water: 4 },
        effect: { kind: 'freeze', power: 28, pieces: 2 },
      },
    ],
  },
  bramble: {
    id: 'bramble',
    category: 'nature',
    role: 'combo',
    elements: ['nature', 'earth'],
    requires: ['quake'],
    levels: [
      {
        name: 'Bramble',
        cost: { nature: 4, earth: 4 },
        effect: { kind: 'clearRows', rows: 2, power: 12 },
      },
    ],
  },
  magma: {
    id: 'magma',
    category: 'earth',
    role: 'combo',
    elements: ['earth', 'fire'],
    requires: ['fire'],
    levels: [{ name: 'Magma', cost: { earth: 4, fire: 4 }, effect: { kind: 'damage', power: 34 } }],
  },
  voidBolt: {
    id: 'voidBolt',
    category: 'arcane',
    role: 'combo',
    elements: ['arcane', 'lightning'],
    requires: ['thunder'],
    levels: [
      {
        name: 'Void Bolt',
        cost: { arcane: 4, lightning: 4 },
        effect: { kind: 'drain', power: 28, share: 0.5 },
      },
    ],
  },
  moonwind: {
    id: 'moonwind',
    category: 'wind',
    role: 'combo',
    elements: ['wind', 'arcane'],
    requires: ['shadow'],
    levels: [
      { name: 'Moonwind', cost: { wind: 4, arcane: 4 }, effect: { kind: 'damage', power: 32 } },
    ],
  },
  meteor: {
    id: 'meteor',
    category: 'fire',
    role: 'combo',
    elements: ['fire', 'earth', 'arcane'],
    requires: ['quake', 'shadow'],
    levels: [
      {
        name: 'Meteor',
        cost: { fire: 6, earth: 6, arcane: 6 },
        effect: { kind: 'damage', power: 58 },
      },
    ],
  },

  // -------------------------------------------------------------- hidden ---
  // One per element, single-level. No list shows them until something the
  // hero does reveals them (`hidden`); then their element's mentor teaches
  // them. See `src/game/hidden.ts`.
  volcano: {
    id: 'volcano',
    category: 'fire',
    role: 'combo',
    elements: ['fire', 'earth'],
    hidden: { kind: 'alignment', needs: { fire: 4, earth: 4 } },
    levels: [
      {
        name: 'Volcano',
        cost: { fire: 6, earth: 6 },
        effect: { kind: 'clearRows', rows: 3, power: 40 },
      },
    ],
  },
  purify: {
    id: 'purify',
    category: 'water',
    role: 'support',
    hidden: { kind: 'quest', flag: 'shrineRestored' },
    levels: [{ name: 'Purify', cost: { water: 5 }, effect: { kind: 'purify' } }],
  },
  ballLightning: {
    id: 'ballLightning',
    category: 'lightning',
    role: 'support',
    hidden: { kind: 'pattern', feat: 'pure.lightning', count: 2 },
    levels: [
      {
        name: 'Ball Lightning',
        cost: { lightning: 6 },
        effect: { kind: 'resonate', power: 2, max: 40 },
      },
    ],
  },
  bloom: {
    id: 'bloom',
    category: 'nature',
    role: 'support',
    hidden: { kind: 'item', itemId: 'sporeCap' },
    levels: [
      { name: 'Bloom', cost: { nature: 7 }, effect: { kind: 'regen', amount: 6, pieces: 8 } },
    ],
  },
  faultLine: {
    id: 'faultLine',
    category: 'earth',
    role: 'support',
    hidden: { kind: 'stat', stat: 'insight', rank: 5 },
    levels: [{ name: 'Fault Line', cost: { earth: 5 }, effect: { kind: 'expose', pieces: 4 } }],
  },
  eclipse: {
    id: 'eclipse',
    category: 'arcane',
    role: 'support',
    hidden: { kind: 'item', itemId: 'moonShard' },
    levels: [
      { name: 'Eclipse', cost: { arcane: 9 }, effect: { kind: 'drain', power: 36, share: 1 } },
    ],
  },
  tempest: {
    id: 'tempest',
    category: 'wind',
    role: 'support',
    hidden: { kind: 'pattern', feat: 'hastedClear', count: 1 },
    levels: [
      {
        name: 'Tempest',
        cost: { wind: 7 },
        effect: { kind: 'tailwind', power: 34, pieces: 8 },
      },
    ],
  },
};

/** Spells every new hero knows, on top of their class's own spell. */
export const STARTING_SPELLS: readonly string[] = ['cure'];

// ---------------------------------------------------------- enhancements ---

/** The three attributes of a levelled spell, each enhanced with skill points. */
export const ENHANCEMENT_IDS = ['power', 'efficiency', 'effect'] as const;

export type EnhancementId = (typeof ENHANCEMENT_IDS)[number];

export interface EnhancementDef {
  readonly id: EnhancementId;
  readonly name: string;
  /** What one enhancement does, as a short tooltip. */
  readonly description: string;
}

/** Attribute definitions; the numbers live in `src/game/spells.ts`. */
export const ENHANCEMENTS: Readonly<Record<EnhancementId, EnhancementDef>> = {
  power: { id: 'power', name: 'Power', description: '+20% of the base damage or healing' },
  efficiency: {
    id: 'efficiency',
    name: 'Efficiency',
    description: '−1 mana from each element (never below 1)',
  },
  effect: { id: 'effect', name: 'Effect', description: 'A stronger side effect' },
};

/**
 * What the Effect attribute adds per enhancement, for the kinds of spell
 * that have levels (supports and combos have one level, so none to enhance).
 */
export const EFFECT_ENHANCEMENTS: Readonly<Partial<Record<SpellEffect['kind'], string>>> = {
  damage: '+3 to its element’s line effect (burn, chain…)',
  heal: '+3 regrowth healing',
  clearRows: '+1 row at 1, 3 and 5 Effect',
  freeze: "Pushes the enemy's gauge back 1.5 s more",
  tailwind: '1 more slow piece',
  drain: 'Heals 10% more of the damage (up to all of it)',
};

/**
 * What a spell needs to become ready for its next level, from level 1 up:
 * `each` enhancements of every attribute plus `any` of your choice, at
 * `cost` skill points each. A spell at the last level has no step.
 */
export interface LevelStep {
  readonly each: number;
  readonly any: number;
  readonly cost: number;
}

export const LEVEL_STEPS: readonly LevelStep[] = [
  { each: 1, any: 0, cost: 2 },
  { each: 1, any: 1, cost: 3 },
  { each: 1, any: 2, cost: 4 },
];
