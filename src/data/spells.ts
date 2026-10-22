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
  meteor: {
    id: 'meteor',
    category: 'fire',
    role: 'combo',
    elements: ['fire', 'earth', 'arcane'],
    levels: [
      {
        name: 'Meteor',
        cost: { fire: 6, earth: 6, arcane: 6 },
        effect: { kind: 'damage', power: 58 },
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

/** What the Effect attribute adds per enhancement, by kind of spell. */
export const EFFECT_ENHANCEMENTS: Readonly<Record<SpellEffect['kind'], string>> = {
  damage: '+3 to its element’s line effect (burn, chain…)',
  heal: '+3 regrowth healing',
  clearRows: '+1 row at 1, 3 and 5 Effect',
  freeze: 'The enemy waits 1 more piece',
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
