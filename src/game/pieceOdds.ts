import { ELEMENTS, pieceOfElement } from '../core/elements';
import type { PieceName } from '../core/pieces';
import { ITEMS } from '../data/items';
import type { MapDef } from '../world/map';
import type { Hero } from './hero';

/** Copies of each piece per bag before any tilt. Two allows a −1 tilt without removing a shape. */
export const BASE_PIECE_WEIGHT = 2;
/** Every shape keeps at least one copy per bag, so no element ever disappears. */
export const MIN_PIECE_WEIGHT = 1;
/** Extra copies of the attuned element's piece. */
export const ATTUNEMENT_PIECE_BONUS = 1;

/**
 * How many copies of each piece go in every bag, from the area's tilt, the
 * hero's charm and the hero's attunement.
 */
export function pieceWeights(map: MapDef, hero: Hero): Record<PieceName, number> {
  const charm = hero.accessoryId ? ITEMS[hero.accessoryId]?.pieceBias : undefined;
  const weights = {} as Record<PieceName, number>;
  for (const element of ELEMENTS) {
    const tilt =
      (map.pieceBias?.[element] ?? 0) +
      (charm?.[element] ?? 0) +
      (hero.attunement === element ? ATTUNEMENT_PIECE_BONUS : 0);
    weights[pieceOfElement(element)] = Math.max(MIN_PIECE_WEIGHT, BASE_PIECE_WEIGHT + tilt);
  }
  return weights;
}
