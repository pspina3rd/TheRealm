import { ELEMENTS, pieceOfElement } from '../core/elements';
import type { PieceName } from '../core/pieces';
import { ITEMS } from '../data/items';
import type { MapDef } from '../world/map';
import { extraPieces } from './alignment';
import { heroAlignment, type Hero } from './hero';

/** Copies of each piece per bag before any tilt. Two allows a −1 tilt without removing a shape. */
export const BASE_PIECE_WEIGHT = 2;
/** Every shape keeps at least one copy per bag, so no element ever disappears. */
export const MIN_PIECE_WEIGHT = 1;
/** Chance that a piece arrives dual (two elements) before any alignment… */
export const DUAL_BASE = 1 / 7;
/** …plus this much per element the hero has alignment `DUAL_ALIGNMENT` or more in… */
export const DUAL_PER_ELEMENT = 0.04;
export const DUAL_ALIGNMENT = 2;
/** …at most this much. */
export const DUAL_MAX = 1 / 3;

/**
 * The chance each random piece arrives dual (see `Board.dualChance`):
 * `DUAL_BASE + DUAL_PER_ELEMENT × (elements with alignment ≥ 2)`, capped
 * at `DUAL_MAX`. A hero who spreads across elements meets more mixed
 * pieces, and more chances to fill several pools at once.
 */
export function dualChance(hero: Pick<Hero, 'spells'>): number {
  const alignment = heroAlignment(hero);
  const spread = ELEMENTS.filter((e) => alignment[e] >= DUAL_ALIGNMENT).length;
  return Math.min(DUAL_MAX, DUAL_BASE + DUAL_PER_ELEMENT * spread);
}

/**
 * How many copies of each piece go in every bag, from the area's tilt, the
 * hero's charm and the hero's alignment.
 */
export function pieceWeights(map: MapDef, hero: Hero): Record<PieceName, number> {
  const charm = hero.accessoryId ? ITEMS[hero.accessoryId]?.pieceBias : undefined;
  const alignment = heroAlignment(hero);
  const weights = {} as Record<PieceName, number>;
  for (const element of ELEMENTS) {
    const tilt =
      (map.pieceBias?.[element] ?? 0) + (charm?.[element] ?? 0) + extraPieces(alignment[element]);
    weights[pieceOfElement(element)] = Math.max(MIN_PIECE_WEIGHT, BASE_PIECE_WEIGHT + tilt);
  }
  return weights;
}
