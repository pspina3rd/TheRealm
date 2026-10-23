import { DIRECTION_DELTAS, mapHeight, mapWidth, tileAt, warpAt, type Direction } from './map';
import { activeEntities, currentMap, type GameState } from './state';

/**
 * How a tile can be entered on a tap-to-walk path: `open` tiles are walked
 * through, `stop` tiles (people, monsters, warps) only as the last step,
 * where the hero bumps into them, and `blocked` ones never.
 */
export type Passage = 'open' | 'stop' | 'blocked';

const ORDER: readonly Direction[] = ['up', 'down', 'left', 'right'];

/**
 * The shortest list of steps from `from` to `to` (breadth-first, four
 * directions), or null if there is no way there. Stop tiles end a path, so
 * only the target may be one; an empty list means the hero is already there.
 */
export function findPath(
  from: readonly [number, number],
  to: readonly [number, number],
  width: number,
  height: number,
  passage: (x: number, y: number) => Passage,
): Direction[] | null {
  const [tx, ty] = to;
  if (tx < 0 || ty < 0 || tx >= width || ty >= height) return null;
  if (passage(tx, ty) === 'blocked') return null;
  const key = (x: number, y: number): number => y * width + x;
  const came = new Map<number, { readonly prev: number; readonly dir: Direction }>();
  const start = key(from[0], from[1]);
  const goal = key(tx, ty);
  came.set(start, { prev: -1, dir: 'up' });
  const queue: number[] = [start];
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head] as number;
    if (at === goal) break;
    const x = at % width;
    const y = Math.floor(at / width);
    for (const dir of ORDER) {
      const [dx, dy] = DIRECTION_DELTAS[dir];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = key(nx, ny);
      if (came.has(next)) continue;
      const kind = passage(nx, ny);
      if (kind === 'blocked' || (kind === 'stop' && next !== goal)) continue;
      came.set(next, { prev: at, dir });
      queue.push(next);
    }
  }
  if (!came.has(goal)) return null;
  const steps: Direction[] = [];
  for (let at = goal; at !== start;) {
    const link = came.get(at) as { prev: number; dir: Direction };
    steps.push(link.dir);
    at = link.prev;
  }
  return steps.reverse();
}

/**
 * The tap-to-walk path on the current map from the hero to tile (x, y):
 * walkable tiles are open, entities and warps are stops (the walk ends by
 * bumping into them, which talks, fights or travels as a key step would).
 */
export function pathTo(state: GameState, x: number, y: number): Direction[] | null {
  const map = currentMap(state);
  const occupied = new Set(activeEntities(state).map((e) => `${e.x},${e.y}`));
  return findPath([state.x, state.y], [x, y], mapWidth(map), mapHeight(map), (px, py) => {
    if (occupied.has(`${px},${py}`)) return 'stop';
    if (!tileAt(map, px, py).walkable) return 'blocked';
    return warpAt(map, px, py) ? 'stop' : 'open';
  });
}
