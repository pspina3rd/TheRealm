/**
 * How map tiles are drawn, per area theme. Map rows stay plain characters
 * (see `src/world/tiles.ts`); this module turns each character into ground
 * layers (with blended edges) and props.
 */
import type { MapDef, ThemeId } from '../../world/map';
import { mapHeight, mapWidth } from '../../world/map';
import { FULL_TILE, blobTile } from './autotile';
import type { ImageId, Region } from './images';
import { OBJECTS, type ObjectArt, type ObjectId } from './objects';

export const TILE = 32;

// ------------------------------------------------------------- terrains ---

type TerrainId =
  | 'grass'
  | 'path'
  | 'sand'
  | 'caveFloor'
  | 'water'
  | 'paleGrass'
  | 'sageGrass'
  | 'darkGrass'
  | 'darkSand'
  | 'ash'
  | 'frost'
  | 'moonGrass'
  | 'redEarth'
  | 'lava';

interface TerrainArt {
  readonly image: ImageId;
  /** Top-left tile of the 12×4 block in the sheet (for frame 0). */
  readonly block: readonly [number, number];
  /** Animation frames and their block offsets, for water. */
  readonly frames?: {
    readonly count: number;
    readonly fps: number;
    readonly origin: (f: number) => [number, number];
  };
}

/** Eight frames laid out two per row: 13 tiles apart horizontally, 5 vertically. */
const WATER_FRAMES = {
  count: 8,
  fps: 4,
  origin: (f: number): [number, number] => [(f % 2) * 13, 1 + Math.floor(f / 2) * 5],
};

const TERRAINS: Readonly<Record<TerrainId, TerrainArt>> = {
  grass: { image: 'ground', block: [0, 4] },
  path: { image: 'ground', block: [0, 8] },
  sand: { image: 'ground', block: [0, 12] },
  caveFloor: { image: 'ground', block: [12, 8] },
  water: { image: 'water', block: [0, 1], frames: WATER_FRAMES },
  // The mentor regions: the sheet's other grasses and sand, recoloured ground and lava.
  paleGrass: { image: 'ground', block: [0, 0] },
  sageGrass: { image: 'ground', block: [12, 0] },
  darkGrass: { image: 'ground', block: [12, 4] },
  darkSand: { image: 'ground', block: [12, 12] },
  ash: { image: 'ground2', block: [0, 0] },
  frost: { image: 'ground2', block: [12, 0] },
  moonGrass: { image: 'ground2', block: [0, 4] },
  redEarth: { image: 'ground2', block: [12, 4] },
  lava: { image: 'lava', block: [0, 1], frames: { ...WATER_FRAMES, fps: 3 } },
};

/** Ground layers are drawn in this order, so paths sit on grass and water edges overlap paths. */
const TERRAIN_ORDER: readonly TerrainId[] = [
  'grass',
  'paleGrass',
  'sageGrass',
  'darkGrass',
  'moonGrass',
  'frost',
  'ash',
  'redEarth',
  'sand',
  'darkSand',
  'caveFloor',
  'path',
  'water',
  'lava',
];

// --------------------------------------------------------------- recipes ---

interface TileRecipe {
  /** Autotiled ground layer for this cell. */
  readonly terrain?: TerrainId;
  /** Flat overlays; one is chosen per cell. */
  readonly decals?: readonly Region[];
  /** Prop drawn in the object layer; one is chosen per cell. */
  readonly objects?: readonly ObjectId[];
  /** Cave walls only get props where they border open floor. */
  readonly objectsNearFloorOnly?: boolean;
}

interface ThemeArt {
  readonly background: string;
  /** Terrain filling every cell beneath its own layers. */
  readonly base: TerrainId | null;
  readonly tiles: Readonly<Record<string, TileRecipe>>;
}

const cell = (image: ImageId, x: number, y: number): Region => ({ image, x, y, w: TILE, h: TILE });

const FLOWERS: readonly Region[] = [
  cell('grasslands', 256, 32),
  cell('grasslands', 288, 64),
  cell('grasslands', 320, 96),
  cell('grasslands', 384, 32),
  cell('grasslands', 384, 96),
];
const BRIDGE: readonly Region[] = [cell('grasslands', 272, 440)];
const FENCE: readonly Region[] = [{ image: 'village', x: 384, y: 322, w: 32, h: 28 }];
const TREES: readonly ObjectId[] = ['tree.light', 'tree.light', 'tree.dark'];

const OUTDOOR_TILES: Readonly<Record<string, TileRecipe>> = {
  ',': { decals: FLOWERS },
  '=': { terrain: 'path' },
  B: { terrain: 'water', decals: BRIDGE },
  T: { objects: TREES },
  '~': { terrain: 'water' },
  '^': { objects: ['boulder.a', 'boulder.b', 'boulder.c'] },
  M: { terrain: 'path', objects: ['house.red'] },
  W: { terrain: 'path', objects: ['house.blue'] },
  C: { terrain: 'path', objects: ['cave.mouth'] },
  R: { terrain: 'path', objects: ['ruins.arch'] },
};

const variants = <P extends string>(prefix: P, count = 4) =>
  Array.from({ length: count }, (_, i) => `${prefix}.${i + 1}`) as ObjectId[];

/**
 * A mentor region: its own ground, path, trees (`T`) and rocks (`^`) over
 * the outdoor legend; `o` is a plaza or shore, `~` water (or lava), `#` a wall
 * of rocks, `C` a cave mouth and `k` a crystal.
 */
function region(
  background: string,
  base: TerrainId,
  path: TerrainId,
  trees: readonly ObjectId[],
  rocks: readonly ObjectId[],
  extra: Readonly<Record<string, TileRecipe>> = {},
): ThemeArt {
  return {
    background,
    base,
    tiles: {
      ...OUTDOOR_TILES,
      '=': { terrain: path },
      o: { terrain: 'sand' },
      T: { objects: trees },
      '^': { objects: rocks },
      '#': { objects: rocks },
      k: { terrain: path, objects: ['crystal'] },
      ...extra,
    },
  };
}

export const THEMES: Readonly<Record<ThemeId, ThemeArt>> = {
  outdoor: { background: '#3f8f4a', base: 'grass', tiles: OUTDOOR_TILES },
  town: {
    background: '#3f8f4a',
    base: 'grass',
    tiles: {
      ...OUTDOOR_TILES,
      o: { terrain: 'sand' },
      f: { decals: FENCE },
      '#': { objects: TREES },
    },
  },
  grove: region(
    '#2b5a33',
    'darkGrass',
    'path',
    ['tree.green.a', 'tree.green.b', 'tree.green.a'],
    ['tree.green.round'],
  ),
  lake: region('#3f8f4a', 'grass', 'path', ['tree.blue.a', 'tree.blue.b'], variants('rock.blue')),
  quarry: region(
    '#7a4a35',
    'redEarth',
    'darkSand',
    variants('spire.beige'),
    variants('rock.orange'),
    { o: { terrain: 'path' }, ',': {} },
  ),
  forge: region(
    '#3b3430',
    'ash',
    'caveFloor',
    ['tree.red.a', 'tree.red.b'],
    variants('rock.dark'),
    {
      '~': { terrain: 'lava' },
      B: { terrain: 'lava', decals: BRIDGE },
      o: { terrain: 'caveFloor' },
      ',': {},
    },
  ),
  peaks: region('#8f97a8', 'frost', 'path', variants('spire.blue'), variants('rock.blue'), {
    ',': {},
  }),
  cliffs: region(
    '#9fb35a',
    'paleGrass',
    'sand',
    ['tree.green.round', 'tree.green.a'],
    variants('rock.beige'),
    { o: { terrain: 'path' } },
  ),
  ruins: region(
    '#4d3f63',
    'moonGrass',
    'darkSand',
    ['tree.purple.a', 'tree.purple.b'],
    variants('rock.dark'),
    { ',': {}, o: { terrain: 'caveFloor' }, ':': { terrain: 'sageGrass' } },
  ),
  cave: {
    background: '#1d1714',
    base: null,
    tiles: {
      X: {
        objects: ['cave.rock.a', 'cave.rock.b', 'cave.rock.c', 'cave.boulder'],
        objectsNearFloorOnly: true,
      },
      ':': { terrain: 'caveFloor' },
      k: { terrain: 'caveFloor', objects: ['crystal'] },
      w: { terrain: 'water' },
      '<': { terrain: 'caveFloor', objects: ['ladder'] },
      '>': { terrain: 'caveFloor', objects: ['ladder'] },
    },
  },
};

// -------------------------------------------------------------- planning ---

/** Stable pseudo-random number in [0, 1) for a cell, so variants don't flicker. */
export function cellHash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function pick<T>(items: readonly T[], x: number, y: number): T | undefined {
  return items[Math.floor(cellHash(x, y) * items.length)];
}

function recipeAt(map: MapDef, x: number, y: number): TileRecipe {
  return THEMES[map.theme].tiles[map.tiles[y]?.[x] ?? ''] ?? {};
}

function inBounds(map: MapDef, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < mapWidth(map) && y < mapHeight(map);
}

function terrainRegion(
  terrain: TerrainId,
  tile: readonly [number, number],
  timeMs: number,
): Region {
  const art = TERRAINS[terrain];
  const [bx, by] = art.frames
    ? art.frames.origin(Math.floor((timeMs / 1000) * art.frames.fps) % art.frames.count)
    : art.block;
  return cell(art.image, (bx + tile[0]) * TILE, (by + tile[1]) * TILE);
}

/**
 * The ground layers for one cell, bottom to top. Off-map neighbours count
 * as matching so terrain runs cleanly off the edge of the map.
 */
export function planGround(map: MapDef, x: number, y: number, timeMs = 0): Region[] {
  const theme = THEMES[map.theme];
  const recipe = recipeAt(map, x, y);
  const layers: Region[] = [];
  if (theme.base) layers.push(terrainRegion(theme.base, FULL_TILE, timeMs));
  for (const terrain of TERRAIN_ORDER) {
    if (recipe.terrain !== terrain || terrain === theme.base) continue;
    const matches = (dx: number, dy: number): boolean =>
      !inBounds(map, x + dx, y + dy) || recipeAt(map, x + dx, y + dy).terrain === terrain;
    layers.push(terrainRegion(terrain, blobTile(matches), timeMs));
  }
  const decal = recipe.decals && pick(recipe.decals, x, y);
  if (decal) layers.push(decal);
  return layers;
}

/** A prop placed in pixel space, sorted by `sortY` (its baseline) for depth. */
export interface PlacedObject {
  readonly region: Region;
  readonly px: number;
  readonly py: number;
  readonly sortY: number;
}

/** Places `art` with its bottom centre on the bottom centre of a `tiles`-wide footprint at (x, y). */
export function placeObject(
  art: ObjectArt,
  x: number,
  y: number,
  tiles = art.width ?? 1,
): PlacedObject {
  const { region } = art;
  const bottom = (y + 1) * TILE + (art.offsetY ?? 0);
  return {
    region,
    px: Math.round(x * TILE + (tiles * TILE - region.w) / 2),
    py: bottom - region.h,
    sortY: (y + 1) * TILE,
  };
}

function nearFloor(map: MapDef, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (inBounds(map, x + dx, y + dy) && recipeAt(map, x + dx, y + dy).terrain) return true;
    }
  }
  return false;
}

/** Every static prop on the map: tile props plus the map's decor list. */
export function planObjects(map: MapDef): PlacedObject[] {
  const placed: PlacedObject[] = [];
  for (let y = 0; y < mapHeight(map); y++) {
    for (let x = 0; x < mapWidth(map); x++) {
      const recipe = recipeAt(map, x, y);
      if (!recipe.objects || (recipe.objectsNearFloorOnly && !nearFloor(map, x, y))) continue;
      const id = pick(recipe.objects, x, y);
      if (id) placed.push(placeObject(OBJECTS[id], x, y, 1));
    }
  }
  for (const decor of map.decor ?? []) {
    const art: ObjectArt | undefined = OBJECTS[decor.object as ObjectId];
    if (!art) throw new Error(`Unknown decor "${decor.object}" on ${map.id}`);
    // Decor sits in front of tile props on the same row (e.g. a door on a house).
    const placedDecor = placeObject(art, decor.x, decor.y);
    placed.push({ ...placedDecor, sortY: placedDecor.sortY + 0.5 });
  }
  return placed.sort((a, b) => a.sortY - b.sortY);
}

/** The colour behind everything, for cells with no ground (cave walls). */
export function backgroundFor(map: MapDef): string {
  return THEMES[map.theme].background;
}
