import {
  DIRECTION_DELTAS,
  tileAt,
  warpAt,
  warpStirs,
  type Direction,
  type EntityDef,
  type Location,
} from './map';
import { activeEntities, currentMap, type GameState } from './state';

/** The result of trying to take one step. */
export type StepResult =
  | { readonly kind: 'moved' }
  | { readonly kind: 'blocked' }
  | { readonly kind: 'locked'; readonly text: string }
  | { readonly kind: 'warp'; readonly to: Location }
  | { readonly kind: 'interact'; readonly entity: EntityDef };

/**
 * Attempts to move the hero one tile. Bumping into an entity starts an
 * interaction (always a battle of some kind); stepping on a warp travels.
 * Only `moved` changes the hero's position; the caller handles warps so it
 * can play a transition.
 */
export function step(state: GameState, direction: Direction): StepResult {
  state.facing = direction;
  const [dx, dy] = DIRECTION_DELTAS[direction];
  const x = state.x + dx;
  const y = state.y + dy;
  const map = currentMap(state);

  const entity = activeEntities(state).find((e) => e.x === x && e.y === y);
  if (entity) return { kind: 'interact', entity };

  if (!tileAt(map, x, y).walkable) return { kind: 'blocked' };

  const warp = warpAt(map, x, y);
  if (warp) {
    if (warp.requiresFlag && !state.flags.has(warp.requiresFlag)) {
      const text = warpStirs(warp, state.flags) ? warp.stirs?.text : warp.lockedText;
      return { kind: 'locked', text: text ?? 'The way is sealed.' };
    }
    return { kind: 'warp', to: warp.to };
  }

  state.x = x;
  state.y = y;
  return { kind: 'moved' };
}
