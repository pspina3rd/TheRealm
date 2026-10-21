/**
 * Tile legend for map strings. Each character in a map row is one tile.
 * `sprite` is the key the renderer looks up in the sprite registry; `color`
 * is the placeholder fill used until real art is loaded.
 */
export interface TileDef {
  readonly name: string;
  readonly walkable: boolean;
  readonly sprite: string;
  readonly color: string;
}

export const TILES: Readonly<Record<string, TileDef>> = {
  // Overworld
  '.': { name: 'grass', walkable: true, sprite: 'tile.grass', color: '#4f9a4a' },
  ',': { name: 'flowers', walkable: true, sprite: 'tile.flowers', color: '#5aa652' },
  '=': { name: 'path', walkable: true, sprite: 'tile.path', color: '#c9a66b' },
  B: { name: 'bridge', walkable: true, sprite: 'tile.bridge', color: '#8b5a2b' },
  T: { name: 'tree', walkable: false, sprite: 'tile.tree', color: '#23562a' },
  '~': { name: 'water', walkable: false, sprite: 'tile.water', color: '#2f6fb5' },
  '^': { name: 'mountain', walkable: false, sprite: 'tile.mountain', color: '#6d6a72' },
  M: { name: 'village', walkable: true, sprite: 'tile.village', color: '#d9b26f' },
  W: { name: 'town', walkable: true, sprite: 'tile.town', color: '#e0c27a' },
  C: { name: 'cave', walkable: true, sprite: 'tile.cave', color: '#2a2433' },
  R: { name: 'ruins', walkable: true, sprite: 'tile.ruins', color: '#5d6b7a' },

  // Settlements
  h: { name: 'house', walkable: false, sprite: 'tile.house', color: '#9a5b3c' },
  D: { name: 'door', walkable: false, sprite: 'tile.door', color: '#5a3520' },
  f: { name: 'fence', walkable: false, sprite: 'tile.fence', color: '#a07a4a' },
  o: { name: 'cobblestone', walkable: true, sprite: 'tile.cobble', color: '#8e8a84' },
  '|': { name: 'counter', walkable: false, sprite: 'tile.counter', color: '#6e4526' },
  '#': { name: 'wall', walkable: false, sprite: 'tile.wall', color: '#4a4550' },

  // Dungeons
  X: { name: 'rock', walkable: false, sprite: 'tile.rock', color: '#1f1b29' },
  ':': { name: 'cave floor', walkable: true, sprite: 'tile.caveFloor', color: '#3e3852' },
  k: { name: 'crystal', walkable: false, sprite: 'tile.crystal', color: '#7fb6ff' },
  w: { name: 'pool', walkable: false, sprite: 'tile.pool', color: '#1d3f73' },
  '<': { name: 'stairs up', walkable: true, sprite: 'tile.stairsUp', color: '#7a7290' },
  '>': { name: 'stairs down', walkable: true, sprite: 'tile.stairsDown', color: '#14111c' },
};

/** Used for out-of-bounds lookups and unknown characters: solid and dark. */
export const VOID_TILE: TileDef = {
  name: 'void',
  walkable: false,
  sprite: 'tile.void',
  color: '#000000',
};

export function tileFor(char: string | undefined): TileDef {
  return (char !== undefined && TILES[char]) || VOID_TILE;
}
