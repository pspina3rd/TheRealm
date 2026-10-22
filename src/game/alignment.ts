/**
 * Alignment: how deeply the hero knows each element. It is earned by
 * learning spells, never chosen, and it only goes up.
 *
 * - An element's alignment is the total level of the hero's spells in it.
 *   Spells have no levels yet, so each known spell counts as level 1.
 * - It strengthens that element's line effects, adds its pieces to the bag
 *   and gives the hero a title from their strongest element.
 */
import { ELEMENTS, emptyCounts, type Element, type ElementCounts } from '../core/elements';
import { SPELLS } from '../data/spells';

/** Line effects grow by this fraction per alignment point… */
export const SURGE_BONUS_PER_POINT = 0.1;
/** …up to this multiplier. */
export const MAX_SURGE_MULTIPLIER = 2;
/** Each this many alignment points add one copy of the element's piece to every bag… */
export const POINTS_PER_EXTRA_PIECE = 4;
/** …up to this many extra copies. */
export const MAX_EXTRA_PIECES = 2;

/** Title prefix for the hero's strongest element, e.g. "Stone Knight". */
export const ALIGNMENT_TITLES: Readonly<Record<Element, string>> = {
  fire: 'Ember',
  water: 'Tide',
  lightning: 'Storm',
  nature: 'Grove',
  earth: 'Stone',
  arcane: 'Arcane',
  wind: 'Gale',
};

/** Alignment per element from the spells the hero knows. Unknown spell ids count for nothing. */
export function alignmentOf(spellIds: readonly string[]): ElementCounts {
  const alignment = emptyCounts();
  for (const id of spellIds) {
    const spell = SPELLS[id];
    if (spell) alignment[spell.element] += 1;
  }
  return alignment;
}

/** How much stronger an element's line effects are at this alignment. */
export function surgeMultiplier(points: number): number {
  return Math.min(MAX_SURGE_MULTIPLIER, 1 + SURGE_BONUS_PER_POINT * points);
}

/** Extra copies of an element's piece per bag at this alignment. */
export function extraPieces(points: number): number {
  return Math.min(MAX_EXTRA_PIECES, Math.floor(points / POINTS_PER_EXTRA_PIECE));
}

/**
 * The element the hero's title comes from: the strongest alignment. On a
 * tie the current title is kept, so a title only changes when another
 * element pulls ahead.
 */
export function titleElementFor(current: Element, alignment: Readonly<ElementCounts>): Element {
  return ELEMENTS.reduce(
    (best, element) => (alignment[element] > alignment[best] ? element : best),
    current,
  );
}
