import { required } from '../core/required';
import { HOMETOWNS, HOMETOWN_MAPS, hometownOf } from '../data/hometowns';
import type { MapDef } from './map';

const variants = new WeakMap<MapDef, Map<string, MapDef>>();

/** Other protagonists' alternate hometowns do not duplicate the familiar cast in this run. */
export function hometownMap(map: MapDef, flags: ReadonlySet<string>): MapDef {
  const home = hometownOf(flags);
  const cached = variants.get(map)?.get(home.map);
  if (cached) return cached;
  const remember = (variant: MapDef): MapDef => {
    if (!variants.has(map)) variants.set(map, new Map());
    required(variants.get(map)).set(home.map, variant);
    return variant;
  };
  if (HOMETOWN_MAPS.has(map.id) && map.id !== home.map) return remember({ ...map, entities: [] });
  const absent = HOMETOWNS.filter(
    (candidate) =>
      candidate.region === map.id && candidate.map !== home.map && candidate.map !== 'mossvale',
  );
  if (!absent.length) return remember(map);
  const tiles = map.tiles.map((row) => row.split(''));
  for (const candidate of absent) {
    const [x, y] = candidate.entrance;
    required(tiles[y])[x] =
      candidate.region === 'overworld' ? '.' : candidate.region === 'grove' ? 'T' : '^';
  }
  return remember({
    ...map,
    tiles: tiles.map((row) => row.join('')),
    warps: map.warps.filter(
      (warp) =>
        !HOMETOWN_MAPS.has(warp.to.map) || warp.to.map === home.map || warp.to.map === 'mossvale',
    ),
  });
}
