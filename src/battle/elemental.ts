/**
 * Elemental rules for combat: what each cleared line triggers, and how
 * enemy weaknesses and resistances scale damage.
 */
import type { CellTally } from '../core/board';
import {
  ELEMENTS,
  STRONG_AGAINST,
  dominantElement,
  elementsOf,
  weakTo,
  type Element,
  type ElementCounts,
} from '../core/elements';
import type { EnemyDef } from '../data/types';
import { surgeMultiplier } from '../game/alignment';
import {
  WEAK_MULTIPLIER,
  RESIST_MULTIPLIER,
  WEAK_CRYSTAL_BONUS,
  BOSS_WEAKNESS_SHARE,
  RESIST_CRYSTAL_PENALTY,
} from '../data/balance';
export {
  WEAK_MULTIPLIER,
  RESIST_MULTIPLIER,
  WEAK_CRYSTAL_BONUS,
  BOSS_WEAKNESS_SHARE,
  RESIST_CRYSTAL_PENALTY,
} from '../data/balance';

/** A line needs at least this many crystals of one element to trigger its effect. */
export const SURGE_THRESHOLD = 3;

/** How hard a weakness hits `enemy`: less for bosses. */
export function weakMultiplier(enemy: Pick<EnemyDef, 'boss'>): number {
  return enemy.boss ? 1 + (WEAK_MULTIPLIER - 1) * BOSS_WEAKNESS_SHARE : WEAK_MULTIPLIER;
}

/** The strike bonus share for crystals `enemy` is weak to: less for bosses. */
export function weakCrystalBonus(enemy: Pick<EnemyDef, 'boss'>): number {
  return enemy.boss ? WEAK_CRYSTAL_BONUS * BOSS_WEAKNESS_SHARE : WEAK_CRYSTAL_BONUS;
}

/** What a cleared line's strongest element does. */
export const SURGE_DESCRIPTIONS: Readonly<Record<Element, string>> = {
  fire: 'Burn: extra damage',
  water: "Chill: pushes the enemy's action gauge back",
  lightning: 'Chain: extra damage, multiplied by lines cleared together',
  nature: 'Regrowth: heal HP',
  earth: 'Ward: a shield that absorbs hits',
  arcane: 'Surge: mana to every element',
  wind: 'Tailwind: pieces fall slower; cancels haste',
};

/** The effect a single cleared line triggers. */
export interface LineSurge {
  readonly element: Element;
  /** Crystals of that element in the line, boosted by the hero's alignment in it. */
  readonly power: number;
}

/**
 * The surge for one cleared line: its strongest element, if it has at least
 * `SURGE_THRESHOLD` crystals. Purer lines give more power.
 */
export function lineSurge(line: CellTally, alignment: Readonly<ElementCounts>): LineSurge | null {
  const top = dominantElement(elementsOf(line));
  if (!top || top.count < SURGE_THRESHOLD) return null;
  return {
    element: top.element,
    power: Math.floor(top.count * surgeMultiplier(alignment[top.element])),
  };
}

/** Elements that hit this enemy harder: the ones strong against its element. */
export function weaknessesOf(enemy: EnemyDef): Element[] {
  return weakTo(enemy.element);
}

/**
 * Elements that hit this enemy softer: its own, the two its element beats,
 * and any extra resistance a boss has.
 */
export function resistancesOf(enemy: EnemyDef): Element[] {
  const resists = new Set([enemy.element, ...STRONG_AGAINST[enemy.element]]);
  for (const element of enemy.extraResist ?? []) resists.add(element);
  return ELEMENTS.filter((element) => resists.has(element));
}

/** How hard an element hits this enemy. */
export function elementMultiplier(enemy: EnemyDef, element: Element): number {
  if (weaknessesOf(enemy).includes(element)) return weakMultiplier(enemy);
  if (resistancesOf(enemy).includes(element)) return RESIST_MULTIPLIER;
  return 1;
}

/**
 * The strike multiplier from the elements of `cells` cleared cells:
 * 1 + 0.5 × (share the enemy is weak to) − 0.25 × (share it resists).
 * Stone counts as neither.
 */
export function crystalAffinity(
  enemy: EnemyDef,
  counts: Readonly<ElementCounts>,
  cells: number,
): number {
  if (cells <= 0) return 1;
  return ELEMENTS.reduce((sum, element) => {
    const multiplier = elementMultiplier(enemy, element);
    const share = counts[element] / cells;
    if (multiplier > 1) return sum + share * weakCrystalBonus(enemy);
    if (multiplier < 1) return sum - share * RESIST_CRYSTAL_PENALTY;
    return sum;
  }, 1);
}
