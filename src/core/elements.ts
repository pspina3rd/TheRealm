/**
 * The seven elements. Every piece shape has one, shown by its crystal
 * colour: clearing crystals fills that element's mana, and each cleared
 * line triggers the effect of its strongest element.
 */
import type { CellTally } from './board';
import { PIECES, type CrystalColor, type PieceName } from './pieces';

export const ELEMENTS = [
  'fire',
  'water',
  'lightning',
  'nature',
  'earth',
  'arcane',
  'wind',
] as const;
export type Element = (typeof ELEMENTS)[number];

/** Which element each crystal colour carries. */
export const ELEMENT_OF_COLOR: Readonly<Record<CrystalColor, Element>> = {
  red: 'fire',
  blue: 'water',
  gold: 'lightning',
  green: 'nature',
  orange: 'earth',
  violet: 'arcane',
  cyan: 'wind',
};

export const ELEMENT_NAMES: Readonly<Record<Element, string>> = {
  fire: 'Fire',
  water: 'Water',
  lightning: 'Lightning',
  nature: 'Nature',
  earth: 'Earth',
  arcane: 'Arcane',
  wind: 'Wind',
};

/** The piece shape that carries each element. */
export function pieceOfElement(element: Element): PieceName {
  const piece = Object.values(PIECES).find((p) => ELEMENT_OF_COLOR[p.color] === element);
  if (!piece) throw new Error(`No piece for ${element}`);
  return piece.name;
}

/** A count per element, e.g. mana pools or crystals in a line. */
export type ElementCounts = Record<Element, number>;

export function emptyCounts(value = 0): ElementCounts {
  return Object.fromEntries(ELEMENTS.map((e) => [e, value])) as ElementCounts;
}

/** Converts a colour tally (from cleared cells) into element counts. Stone counts as nothing. */
export function elementsOf(tally: CellTally): ElementCounts {
  const counts = emptyCounts();
  for (const [color, count] of Object.entries(tally)) {
    if (color !== 'stone') counts[ELEMENT_OF_COLOR[color as CrystalColor]] += count ?? 0;
  }
  return counts;
}

/**
 * The element with the most crystals, and how many. Ties go to the element
 * listed first in `ELEMENTS`. Returns null when there are no crystals.
 */
export function dominantElement(
  counts: Readonly<ElementCounts>,
): { element: Element; count: number } | null {
  let best: { element: Element; count: number } | null = null;
  for (const element of ELEMENTS) {
    if (counts[element] > (best?.count ?? 0)) best = { element, count: counts[element] };
  }
  return best;
}
