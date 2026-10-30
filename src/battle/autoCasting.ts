/** Deterministic line-driven scheduling. Seven primaries are automatic; advanced techniques and custom Weaving stay manual. */
import { required } from '../core/required';
import type { Hero } from '../game/hero';
import { alignmentOf } from '../game/alignment';
import { STANDARD_SPELLS, type CastPreview, type MagicCasting } from './magicCasting';
import type { MagicState } from '../core/boardMagic';

/** Existing elemental alignment is affinity; title breaks ties, then stable spell order. */
export function autoSpellOrder(hero: Hero, book = hero.spells): string[] {
  const affinity = alignmentOf(book);
  return Object.keys(STANDARD_SPELLS)
    .filter((id) => book[id])
    .sort((a, b) => {
      const ae = required(STANDARD_SPELLS[a]),
        be = required(STANDARD_SPELLS[b]);
      return (
        affinity[be] - affinity[ae] ||
        Number(be === hero.titleElement) - Number(ae === hero.titleElement)
      );
    });
}
function quality(state: MagicState): number {
  let holes = 0,
    height = 0;
  const width = state.grid[0]?.length ?? 0;
  for (let x = 0; x < width; x++) {
    let covered = false;
    for (let y = 0; y < state.grid.length; y++) {
      const cell = state.grid[y]?.[x];
      if (cell !== null && cell !== undefined) {
        covered = true;
        height += state.grid.length - y;
      } else if (covered) holes++;
    }
  }
  return -holes * 50 - height;
}
/** Prefer clears, obstruction damage/conversion, then improved stack shape. */
export function autoTarget(casting: MagicCasting, id: string): CastPreview | null {
  if (!STANDARD_SPELLS[id] || !casting.book()[id]) return null;
  if (id === 'shadow') {
    const preview = casting.preview(id, { bottomRow: 0, direction: 1 });
    return preview.reason ? null : preview;
  }
  const before = casting.board.magicState();
  const beforeQuality = quality(before);
  const strength = Object.values(before.obstructions).reduce((s, o) => s + o.strength, 0);
  let best: CastPreview | null = null,
    bestScore = 0;
  for (let row = casting.board.height - 1; row >= 0; row--) {
    for (const direction of id === 'gale' ? ([1, -1] as const) : ([1] as const)) {
      const p = casting.preview(id, { bottomRow: row, direction });
      if (
        p.reason === 'Not enough mana.' ||
        p.reason === 'This spell is sealed.' ||
        p.reason === 'Board magic is unavailable in this encounter.'
      )
        return null;
      if (p.reason) continue;
      const remaining = Object.values(p.resolution.state.obstructions).reduce(
        (s, o) => s + o.strength,
        0,
      );
      const score =
        p.resolution.completed.length * 10000 +
        (strength - remaining) * 1000 +
        quality(p.resolution.state) -
        beforeQuality;
      // Do not auto-shift a tidy stack into an equally good or worse shape.
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    }
  }
  return best;
}
