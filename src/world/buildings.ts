import type { MapDef } from './map';

/** Physical ground plans, independent of the taller roof artwork. */
export interface BuildingFootprint {
  /** Width used to anchor the artwork, including roof overhang. */
  readonly width: number;
  readonly depth: number;
  readonly insetLeft?: number;
  readonly insetRight?: number;
}

export const BUILDING_FOOTPRINTS: Readonly<Record<string, BuildingFootprint>> = {
  'house.red': { width: 4, depth: 3 },
  'house.blue': { width: 4, depth: 3 },
  'house.gray': { width: 4, depth: 3 },
  'forge.hall': { width: 7, depth: 4 },
  'mush.house': { width: 6, depth: 2, insetLeft: 1, insetRight: 1 },
  'mush.house.blue': { width: 6, depth: 2, insetLeft: 1, insetRight: 1 },
  hut: { width: 6, depth: 2, insetRight: 2 },
  tower: { width: 3, depth: 2 },
  'mine.beige': { width: 3, depth: 1 },
  'mine.blue': { width: 3, depth: 1 },
  'mine.dark': { width: 3, depth: 1 },
};

const cache = new WeakMap<MapDef, ReadonlySet<string>>();

/** Authored entrances remain usable; scenery never invents an interior or a warp. */
export function buildingBlocks(map: MapDef, x: number, y: number): boolean {
  let cells = cache.get(map);
  if (!cells) {
    const solid = new Set<string>();
    for (const decor of map.decor ?? []) {
      const plan = BUILDING_FOOTPRINTS[decor.object];
      if (!plan) continue;
      for (let dy = 0; dy < plan.depth; dy++)
        for (let dx = plan.insetLeft ?? 0; dx < plan.width - (plan.insetRight ?? 0); dx++)
          solid.add(`${decor.x + dx},${decor.y - dy}`);
    }
    for (const warp of map.warps) solid.delete(`${warp.x},${warp.y}`);
    cache.set(map, (cells = solid));
  }
  return cells.has(`${x},${y}`);
}
