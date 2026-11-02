import { required } from '../core/required';
import { HOMETOWNS } from './hometowns';
import type { MapDef } from '../world/map';

/** Reuse the same opening tasks and neighbors; vary the land and road into the world. */
export function withHometowns(base: Record<string, MapDef>): Record<string, MapDef> {
  const maps = { ...base };
  const village = required(maps.mossvale);
  for (const home of HOMETOWNS.slice(1)) {
    const tiles = village.tiles.map((row) => row.split(''));
    // Keep the shared village's doors, tasks and walkways. Its surroundings belong to its region.
    if (home.province === 'quarry') {
      for (const row of tiles)
        for (let x = 0; x < row.length; x++) if (row[x] === 'T') row[x] = '^';
    } else if (home.province === 'lake') {
      for (let y = 1; y < 25; y++) required(tiles[y])[31] = '~';
    }
    maps[home.map] = {
      ...village,
      id: home.map,
      name: home.name,
      theme: home.province === 'quarry' ? 'quarry' : home.province === 'lake' ? 'lake' : 'grove',
      tiles: tiles.map((row) => row.join('')),
      entities: village.entities.map((entity) => ({ ...entity, id: `${home.map}:${entity.id}` })),
      warps: village.warps.map((warp) => ({ ...warp, to: home.returnTo })),
    };
    const region = required(maps[home.region]);
    const land = region.tiles.map((row) => row.split(''));
    required(land[home.entrance[1]])[home.entrance[0]] = 'M';
    required(land[home.returnTo.y])[home.returnTo.x] = '.';
    maps[home.region] = {
      ...region,
      tiles: land.map((row) => row.join('')),
      warps: [
        ...region.warps,
        {
          x: home.entrance[0],
          y: home.entrance[1],
          to: { map: home.map, x: 17, y: 24 },
        },
      ],
    };
  }
  return maps;
}
