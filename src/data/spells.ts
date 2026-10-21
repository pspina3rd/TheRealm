import type { SpellDef } from './types';

/** Every spell in the game, keyed by id. Heroes learn spells through rewards. */
export const SPELLS: Readonly<Record<string, SpellDef>> = {
  fire: {
    id: 'fire',
    name: 'Fire',
    mpCost: 3,
    description: 'Scorch the enemy for modest damage.',
    effect: { kind: 'damage', power: 12 },
  },
  cure: {
    id: 'cure',
    name: 'Cure',
    mpCost: 4,
    description: 'Restore 18 HP.',
    effect: { kind: 'heal', amount: 18 },
  },
  quake: {
    id: 'quake',
    name: 'Quake',
    mpCost: 5,
    description: 'Shake loose the bottom two rows of the board.',
    effect: { kind: 'clearRows', rows: 2 },
  },
  thunder: {
    id: 'thunder',
    name: 'Thunder',
    mpCost: 5,
    description: 'A bolt from above for strong damage.',
    effect: { kind: 'damage', power: 23 },
  },
  blizzard: {
    id: 'blizzard',
    name: 'Blizzard',
    mpCost: 6,
    description: 'Damage and freeze the enemy, delaying its next action by 3 pieces.',
    effect: { kind: 'freeze', power: 18, pieces: 3 },
  },
  meteor: {
    id: 'meteor',
    name: 'Meteor',
    mpCost: 10,
    description: 'Call down the stars for massive damage.',
    effect: { kind: 'damage', power: 58 },
  },
};

/** Spells a new hero knows. */
export const STARTING_SPELLS: readonly string[] = ['fire', 'cure'];
