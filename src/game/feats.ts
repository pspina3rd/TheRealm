/**
 * Board feats the hero's life counts, for hidden spells revealed by a
 * pattern (see `src/game/hidden.ts`): every cleared line with at least
 * `PURE_CELLS` crystals of one element (`pure.<element>`; stone just
 * doesn't count toward it), and every clear of `HASTED_LINES` or more lines
 * at once made while the enemy's haste speeds the pieces (`hastedClear`).
 * Counting is pure: `featsOfLock` reads one lock result, `recordFeats`
 * adds to the hero's tally.
 */
import type { LockResult } from '../core/board';
import { ELEMENT_OF_COLOR } from '../core/elements';
import type { CrystalColor } from '../core/pieces';
import type { FeatId } from '../data/types';
import type { Hero } from './hero';

/** Crystals of one element (of a line's 10 cells) that make the line pure. */
export const PURE_CELLS = 7;
/** Lines cleared at once under haste that count as a hasted clear. */
export const HASTED_LINES = 2;

/** Feat id → times done. Plain data so it can be saved as JSON. */
export type Feats = Partial<Record<FeatId, number>>;

/** The feats one locked piece achieved (a feat can appear more than once). */
export function featsOfLock(result: LockResult, hasted: boolean): FeatId[] {
  const feats = result.lines.flatMap((line): FeatId[] => {
    const color = (Object.keys(ELEMENT_OF_COLOR) as CrystalColor[]).find(
      (c) => (line[c] ?? 0) >= PURE_CELLS,
    );
    return color ? [`pure.${ELEMENT_OF_COLOR[color]}`] : [];
  });
  if (hasted && result.linesCleared >= HASTED_LINES) feats.push('hastedClear');
  return feats;
}

/** Adds each feat to the hero's lifetime tally. */
export function recordFeats(hero: Pick<Hero, 'feats'>, feats: readonly FeatId[]): void {
  for (const feat of feats) hero.feats[feat] = featCount(hero, feat) + 1;
}

/** How many times the hero has done `feat`. */
export function featCount(hero: Pick<Hero, 'feats'>, feat: FeatId): number {
  return hero.feats[feat] ?? 0;
}
