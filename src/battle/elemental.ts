/**
 * Elemental rules for combat: what each cleared line triggers, and how
 * enemy weaknesses and resistances scale damage.
 */
import type { CellTally } from '../core/board';
import {
  ELEMENTS,
  dominantElement,
  elementsOf,
  type Element,
  type ElementCounts,
} from '../core/elements';
import type { EnemyDef } from '../data/types';

/** A line needs at least this many crystals of one element to trigger its effect. */
export const SURGE_THRESHOLD = 3;
/** Effects of the hero's attuned element are this much stronger. */
export const ATTUNED_SURGE_BONUS = 1.5;
/** Damage multipliers against weak and resistant enemies. */
export const WEAK_MULTIPLIER = 1.5;
export const RESIST_MULTIPLIER = 0.5;
/** Strike damage added (or removed) per cleared crystal an enemy is weak to (or resists). */
export const WEAK_CRYSTAL_BONUS = 2;
export const RESIST_CRYSTAL_PENALTY = 1;

/** What a cleared line's strongest element does. */
export const SURGE_DESCRIPTIONS: Readonly<Record<Element, string>> = {
  fire: 'Burn: extra damage',
  water: 'Chill: the enemy acts a piece later',
  lightning: 'Chain: extra damage, multiplied by lines cleared together',
  nature: 'Regrowth: heal HP',
  earth: 'Ward: a shield that absorbs hits',
  arcane: 'Surge: mana to every element',
  wind: 'Tailwind: pieces fall slower; cancels haste',
};

/** The effect a single cleared line triggers. */
export interface LineSurge {
  readonly element: Element;
  /** Crystals of that element in the line, boosted by attunement. */
  readonly power: number;
}

/**
 * The surge for one cleared line: its strongest element, if it has at least
 * `SURGE_THRESHOLD` crystals. Purer lines give more power.
 */
export function lineSurge(line: CellTally, attunement: Element | null): LineSurge | null {
  const top = dominantElement(elementsOf(line));
  if (!top || top.count < SURGE_THRESHOLD) return null;
  const bonus = top.element === attunement ? ATTUNED_SURGE_BONUS : 1;
  return { element: top.element, power: Math.floor(top.count * bonus) };
}

/** How hard an element hits this enemy. */
export function elementMultiplier(enemy: EnemyDef, element: Element): number {
  if (enemy.weak.includes(element)) return WEAK_MULTIPLIER;
  if (enemy.resist.includes(element)) return RESIST_MULTIPLIER;
  return 1;
}

/**
 * Bonus (or penalty) strike damage from the elements of the cleared
 * crystals: +2 per crystal the enemy is weak to, −1 per crystal it resists.
 */
export function crystalAffinity(enemy: EnemyDef, counts: Readonly<ElementCounts>): number {
  return ELEMENTS.reduce((sum, element) => {
    if (enemy.weak.includes(element)) return sum + counts[element] * WEAK_CRYSTAL_BONUS;
    if (enemy.resist.includes(element)) return sum - counts[element] * RESIST_CRYSTAL_PENALTY;
    return sum;
  }, 0);
}
