/**
 * Tile legend for map strings. Each character in a map row is one tile.
 * This decides movement only; how each tile looks depends on the map's
 * theme (see `src/ui/art/themes.ts`).
 */
export interface TileDef {
  readonly name: string;
  readonly walkable: boolean;
}

export const TILES: Readonly<Record<string, TileDef>> = {
  // Overworld
  '.': { name: 'grass', walkable: true },
  ',': { name: 'flowers', walkable: true },
  '=': { name: 'path', walkable: true },
  B: { name: 'bridge', walkable: true },
  T: { name: 'tree', walkable: false },
  '~': { name: 'water', walkable: false },
  '^': { name: 'mountain', walkable: false },
  M: { name: 'village', walkable: true },
  W: { name: 'town', walkable: true },
  C: { name: 'cave', walkable: true },
  R: { name: 'ruins', walkable: true },

  // Settlements
  h: { name: 'house', walkable: false },
  D: { name: 'door', walkable: false },
  f: { name: 'fence', walkable: false },
  o: { name: 'cobblestone', walkable: true },
  '|': { name: 'counter', walkable: false },
  '#': { name: 'wall', walkable: false },

  // Dungeons
  X: { name: 'rock', walkable: false },
  ':': { name: 'cave floor', walkable: true },
  k: { name: 'crystal', walkable: false },
  w: { name: 'pool', walkable: false },
  '<': { name: 'stairs up', walkable: true },
  '>': { name: 'stairs down', walkable: true },
};

/** Used for out-of-bounds lookups and unknown characters: solid and dark. */
export const VOID_TILE: TileDef = { name: 'void', walkable: false };

export function tileFor(char: string | undefined): TileDef {
  return (char !== undefined && TILES[char]) || VOID_TILE;
}
