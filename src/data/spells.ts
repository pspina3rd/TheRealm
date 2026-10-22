import type { SpellDef } from './types';

/**
 * Every spell in the game, keyed by id. Each costs mana from specific
 * elemental pools, which you fill by clearing crystals of that element.
 */
export const SPELLS: Readonly<Record<string, SpellDef>> = {
  fire: {
    id: 'fire',
    name: 'Fire',
    element: 'fire',
    cost: { fire: 6 },
    description: 'Scorch the enemy.',
    effect: { kind: 'damage', power: 14 },
  },
  cure: {
    id: 'cure',
    name: 'Cure',
    element: 'nature',
    cost: { nature: 6 },
    description: 'Restore 20 HP.',
    effect: { kind: 'heal', amount: 20 },
  },
  quake: {
    id: 'quake',
    name: 'Quake',
    element: 'earth',
    cost: { earth: 6 },
    description: 'Shake loose the bottom two rows of the board.',
    effect: { kind: 'clearRows', rows: 2 },
  },
  gale: {
    id: 'gale',
    name: 'Gale',
    element: 'wind',
    cost: { wind: 6 },
    description: 'A cutting wind; your pieces fall slower for 5 pieces.',
    effect: { kind: 'tailwind', power: 10, pieces: 5 },
  },
  thunder: {
    id: 'thunder',
    name: 'Thunder',
    element: 'lightning',
    cost: { lightning: 8 },
    description: 'A bolt from above for strong damage.',
    effect: { kind: 'damage', power: 24 },
  },
  blizzard: {
    id: 'blizzard',
    name: 'Blizzard',
    element: 'water',
    cost: { water: 8 },
    description: 'Damage and freeze the enemy, delaying its next action by 3 pieces.',
    effect: { kind: 'freeze', power: 18, pieces: 3 },
  },
  shadow: {
    id: 'shadow',
    name: 'Shadow Drain',
    element: 'arcane',
    cost: { arcane: 8 },
    description: 'Steal life: damage the enemy and heal half of it.',
    effect: { kind: 'drain', power: 18 },
  },
  meteor: {
    id: 'meteor',
    name: 'Meteor',
    element: 'fire',
    cost: { fire: 6, earth: 6, arcane: 6 },
    description: 'Fire, stone and starlight: massive damage.',
    effect: { kind: 'damage', power: 58 },
  },
};

/** Spells a new hero knows. */
export const STARTING_SPELLS: readonly string[] = ['fire', 'cure'];
