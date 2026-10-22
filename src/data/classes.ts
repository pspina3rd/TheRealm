import type { Element } from '../core/elements';

/** Starting stats and per-level growth for a hero class. */
export interface ClassStats {
  readonly hp: number;
  /** Capacity of each of the seven elemental mana pools. */
  readonly mana: number;
  readonly atk: number;
  readonly def: number;
}

export interface HeroClass {
  readonly id: string;
  readonly name: string;
  /** Default hero name for this class. */
  readonly heroName: string;
  readonly description: string;
  /** Creature key from `src/ui/art/creatures.ts`. */
  readonly sprite: string;
  readonly base: ClassStats;
  readonly growth: ClassStats;
  readonly gil: number;
}

/**
 * Playable classes. They differ only slightly, so any class can finish the
 * game; the choice shapes whether you lean on line clears, magic or gil.
 */
export const CLASSES: Readonly<Record<string, HeroClass>> = {
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    heroName: 'Fen',
    description: 'Balanced in every stat. A good first adventure.',
    sprite: 'char.026',
    base: { hp: 40, mana: 12, atk: 5, def: 1 },
    growth: { hp: 8, mana: 2, atk: 2, def: 1 },
    gil: 25,
  },
  knight: {
    id: 'knight',
    name: 'Knight',
    heroName: 'Brann',
    description: 'Tough and well armoured, with shallow mana pools.',
    sprite: 'char.019',
    base: { hp: 48, mana: 10, atk: 5, def: 3 },
    growth: { hp: 10, mana: 1, atk: 2, def: 2 },
    gil: 20,
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    heroName: 'Lyra',
    description: 'Deep mana pools for frequent spells, but fragile.',
    sprite: 'char.016',
    base: { hp: 34, mana: 16, atk: 4, def: 1 },
    growth: { hp: 6, mana: 3, atk: 2, def: 1 },
    gil: 25,
  },
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    heroName: 'Vex',
    description: 'Hits a little harder and starts with a fat purse.',
    sprite: 'char.004',
    base: { hp: 36, mana: 12, atk: 6, def: 1 },
    growth: { hp: 7, mana: 2, atk: 3, def: 1 },
    gil: 60,
  },
};

export const DEFAULT_CLASS = 'ranger';

/** Level at which a hero chooses an elemental attunement. */
export const ATTUNEMENT_LEVEL = 3;

/** Title prefix for each attunement, e.g. "Stone Knight". */
export const ATTUNEMENT_TITLES: Readonly<Record<Element, string>> = {
  fire: 'Ember',
  water: 'Tide',
  lightning: 'Storm',
  nature: 'Grove',
  earth: 'Stone',
  arcane: 'Arcane',
  wind: 'Gale',
};
