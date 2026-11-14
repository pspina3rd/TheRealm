/** Isolated web opening playtest. Never migrates an ordinary campaign save. */
import { travel, type GameState } from '../world/state';
import { SURFACE_SITES } from '../data/surfaceLayout';

export const FERN_OPENING_PENDING = 'opening:fernWeb';
export const FERN_DAWN = 'opening:fernDawn';
/** The first road north of Mossvale; the sanctuary still has its separate Mossvale approach. */
export const FERN_DAWN_LOCATION = {
  map: 'overworld',
  x: SURFACE_SITES.mossvale.x,
  y: SURFACE_SITES.mossvale.y - 3,
} as const;

/** Both reading through and skipping commit the same outcome, once. No spells or equipment. */
export function finishFernOpening(state: GameState): boolean {
  if (state.hero.classId !== 'ranger' || state.flags.has(FERN_DAWN)) return false;
  state.flags.add(FERN_OPENING_PENDING);
  state.flags.add(FERN_DAWN);
  // The new sequence replaces these old interludes; do not replay the sleeping-house opening.
  state.flags.add('scene:opening');
  state.flags.add('scene:refusal');
  // Possession only: the old equippable Focus Stone would change piece odds, so do not award it.
  state.flags.add('fern:runeStone');
  state.day = Math.max(1, state.day);
  travel(state, FERN_DAWN_LOCATION);
  state.facing = 'up';
  return true;
}
