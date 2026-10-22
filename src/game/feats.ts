/**
 * Board feats the hero's life counts, for hidden spells revealed by a
 * pattern (see `src/game/hidden.ts`): every cleared line made of one
 * element alone (`pure.<element>`; stone spoils it), and every four-line
 * clear made while the enemy's haste speeds the pieces (`hastedQuad`).
 * Counting is pure: `featsOfLock` reads one lock result, `recordFeats`
 * adds to the hero's tally.
 */
import type { LockResult } from '../core/board';
import { ELEMENT_OF_COLOR } from '../core/elements';
import type { CrystalColor } from '../core/pieces';
import type { FeatId } from '../data/types';
import type { Hero } from './hero';

/** Lines cleared at once that make a quad. */
export const QUAD_LINES = 4;

/** Feat id → times done. Plain data so it can be saved as JSON. */
export type Feats = Partial<Record<FeatId, number>>;

/** The feats one locked piece achieved (a feat can appear more than once). */
export function featsOfLock(result: LockResult, hasted: boolean): FeatId[] {
  const feats = result.lines.flatMap((line): FeatId[] => {
    const cells = Object.keys(line).filter((cell) => (line[cell as CrystalColor] ?? 0) > 0);
    const [only] = cells;
    return cells.length === 1 && only !== 'stone'
      ? [`pure.${ELEMENT_OF_COLOR[only as CrystalColor]}`]
      : [];
  });
  if (hasted && result.linesCleared >= QUAD_LINES) feats.push('hastedQuad');
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
