import {
  SURFACE_CENTER,
  SURFACE_SITES,
  SURFACE_STONES,
  STONE_ENCLOSURE_RADIUS,
  surfaceProvince,
} from './surfaceLayout';
import type { MonsterEntity } from '../world/map';

interface Point {
  readonly x: number;
  readonly y: number;
}
type TilePoint = readonly [number, number];
const homes = ['mossvale', 'redrockVillage', 'glasswaterVillage', 'thornwoodVillage'] as const;
const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const homeDistance = (p: Point) => Math.min(...homes.map((id) => distance(p, SURFACE_SITES[id])));

/** Regional wildlife belongs off the maintained roads, outside beginner hunting grounds. */
export function habitatPosition(
  preferred: TilePoint,
  province: string,
  grid: readonly (readonly string[])[],
  roads: readonly TilePoint[],
  occupied: readonly Point[],
): Point | null {
  for (let radius = 0; radius <= 56; radius++) {
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const p = { x: preferred[0] + dx, y: preferred[1] + dy };
        if (surfaceProvince(p.x, p.y)?.id !== province) continue;
        if (!['.', ',', 'T'].includes(grid[p.y]?.[p.x] ?? '')) continue;
        if (homeDistance(p) < 40 || occupied.some((q) => distance(p, q) < 6)) continue;
        if (roads.some(([x, y]) => Math.abs(x - p.x) + Math.abs(y - p.y) < 9)) continue;
        if (
          Math.hypot(p.x - SURFACE_CENTER.x, p.y - SURFACE_CENTER.y) <=
          STONE_ENCLOSURE_RADIUS + 2
        )
          continue;
        return p;
      }
  }
  return null;
}

/**
 * Visible, optional fights beside travelled roads. Population is fixed geography,
 * never a random encounter timer or a function of the player's current level.
 * Town exits and the sanctuary each have a reachable zero-spell hunting circuit.
 */
export function roadsideEncounters(
  grid: readonly (readonly string[])[],
  roads: readonly TilePoint[],
  reserved: readonly Point[],
): MonsterEntity[] {
  const monsters: MonsterEntity[] = [];
  const free = (p: Point) =>
    ['.', ',', 'T', 'o'].includes(grid[p.y]?.[p.x] ?? '') &&
    !reserved.some((q) => distance(p, q) < 5) &&
    !monsters.some((q) => distance(p, q) < 7) &&
    !Object.values(SURFACE_SITES).some((q) => distance(p, q) < 5) &&
    !SURFACE_STONES.some((q) => distance(p, q) < 3) &&
    Math.abs(Math.hypot(p.x - SURFACE_CENTER.x, p.y - SURFACE_CENTER.y) - STONE_ENCLOSURE_RADIUS) >
      4;
  const add = (id: string, origin: Point, enemyId: string, reach = 5): boolean => {
    for (let r = 0; r <= reach; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const p = { x: origin.x + dx, y: origin.y + dy };
          if (!free(p)) continue;
          monsters.push({ id, kind: 'monster', enemyId, ...p });
          return true;
        }
    return false;
  };
  // Five wins at 11 XP can earn the first level without seeking a regional foe.
  for (const home of homes) {
    const p = SURFACE_SITES[home];
    for (const [i, [dx, dy]] of [
      [5, 6],
      [-6, 12],
      [7, 18],
      [-8, 24],
      [3, 29],
    ].entries())
      add(`surface:home:${home}:${i}`, { x: p.x + (dx ?? 0), y: p.y + (dy ?? 0) }, 'slime');
  }
  // The north path is an enclosed sanctuary. Give that actual opening route
  // its own circuit too; it must not strand a new hero with one defeated slime.
  for (const [i, [x, y]] of [
    [115, 116],
    [117, 123],
    [120, 136],
    [129, 145],
    [139, 134],
  ].entries())
    add(`surface:stones:foe:${i}`, { x: x ?? 0, y: y ?? 0 }, 'slime', 3);
  const sampled: Point[] = [];
  for (const [x, y] of roads) {
    const p = { x, y };
    if (sampled.some((q) => distance(p, q) < 18) || monsters.some((q) => distance(p, q) < 12))
      continue;
    // No mobs on doors, bridges or the mountain enclosure. A side clearing
    // stays close enough to see from the road while leaving its middle open.
    if (grid[y]?.[x] !== '=' && grid[y]?.[x] !== 'o') continue;
    const nearHome = homeDistance(p);
    const sanctuary = Math.hypot(x - SURFACE_CENTER.x, y - SURFACE_CENTER.y) < 24;
    const enemyId = sanctuary || nearHome < 42 ? 'slime' : nearHome < 78 ? 'shroom' : 'goblin';
    if (add(`surface:road:${x}:${y}`, { x: x + 3, y: y + 3 }, enemyId, 4)) sampled.push(p);
  }
  return monsters;
}
