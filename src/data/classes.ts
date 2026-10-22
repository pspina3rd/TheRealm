import type { Element } from '../core/elements';
import type { StatRanks } from './stats';

/** A class's base numbers, before stat ranks. */
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
  /** The element the class starts aligned to. */
  readonly element: Element;
  /** The class's first spell, a level 1 spell of its element. */
  readonly spell: string;
  /** Base numbers; stat ranks add to these (see `derivedStats`). */
  readonly base: ClassStats;
  /** Max HP gained automatically per level; everything else comes from skill points. */
  readonly hpGrowth: number;
  /** Stat ranks the class starts with. */
  readonly stats: Partial<StatRanks>;
  readonly gil: number;
}

/**
 * Playable classes. They differ only slightly, so any class can finish the
 * game; the choice shapes whether you lean on line clears, magic or gil.
 * Each starts with 4 stat ranks; bases are set so starting totals match
 * the classes before stats existed.
 */
export const CLASSES: Readonly<Record<string, HeroClass>> = {
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    heroName: 'Fen',
    description: 'Quick and lucky: slower pieces and better drops. A good first adventure.',
    sprite: 'char.026',
    element: 'wind',
    spell: 'gale',
    base: { hp: 40, mana: 12, atk: 5, def: 1 },
    hpGrowth: 8,
    stats: { agility: 2, luck: 2 },
    gil: 25,
  },
  knight: {
    id: 'knight',
    name: 'Knight',
    heroName: 'Brann',
    description: 'Tough and well armoured, with shallow mana pools.',
    sprite: 'char.019',
    element: 'earth',
    spell: 'quake',
    base: { hp: 36, mana: 10, atk: 5, def: 1 },
    hpGrowth: 10,
    stats: { vitality: 2, guard: 2 },
    gil: 20,
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    heroName: 'Lyra',
    description: 'Deep mana pools and keen insight, but fragile.',
    sprite: 'char.016',
    element: 'arcane',
    spell: 'shadow',
    base: { hp: 34, mana: 14, atk: 4, def: 1 },
    hpGrowth: 6,
    stats: { focus: 2, insight: 2 },
    gil: 25,
  },
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    heroName: 'Vex',
    description: 'Hits harder, pays less in shops and starts with a fat purse.',
    sprite: 'char.004',
    element: 'lightning',
    spell: 'thunder',
    base: { hp: 36, mana: 12, atk: 4, def: 1 },
    hpGrowth: 7,
    stats: { strength: 2, charm: 2 },
    gil: 60,
  },
};

export const DEFAULT_CLASS = 'ranger';
