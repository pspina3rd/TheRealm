import type { Region } from './images';

/**
 * Standalone props drawn in the depth-sorted object layer (trees, houses,
 * rocks). Each is drawn with the bottom-centre of its region on the
 * bottom-centre of its anchor (one tile, or `width` tiles for wide props),
 * shifted by `offsetY` pixels.
 */
export interface ObjectArt {
  readonly region: Region;
  /** Footprint width in tiles; the sprite is centred over it. */
  readonly width?: number;
  readonly offsetY?: number;
}

const grass = (x: number, y: number, w: number, h: number): Region => ({
  image: 'grasslands',
  x,
  y,
  w,
  h,
});
const village = (x: number, y: number, w: number, h: number): Region => ({
  image: 'village',
  x,
  y,
  w,
  h,
});
const caves = (x: number, y: number, w: number, h: number): Region => ({
  image: 'caves',
  x,
  y,
  w,
  h,
});

export const OBJECTS = {
  // Overworld
  'tree.light': { region: grass(400, 516, 64, 92), offsetY: 4 },
  'tree.dark': { region: grass(4, 672, 56, 94), offsetY: 4 },
  'boulder.a': { region: grass(0, 258, 62, 62), offsetY: 6 },
  'boulder.b': { region: grass(64, 258, 62, 62), offsetY: 6 },
  'boulder.c': { region: grass(128, 258, 62, 62), offsetY: 6 },
  'cave.mouth': { region: grass(800, 348, 96, 66), offsetY: 2 },
  'ruins.arch': { region: grass(806, 578, 84, 62) },
  sign: { region: village(226, 110, 28, 48) },

  // Settlements (4-tile-wide houses sit on a 4×3 footprint)
  'house.red': { region: village(864, 292, 128, 220), width: 4 },
  'house.blue': { region: village(864, 708, 128, 156), width: 4 },
  'house.gray': { region: village(864, 868, 128, 156), width: 4 },
  door: { region: village(0, 280, 32, 38) },
  stall: { region: village(256, 160, 96, 32), width: 3 },
  well: { region: village(386, 164, 62, 88), width: 2 },

  // Caves
  'cave.rock.a': { region: caves(320, 32, 32, 30) },
  'cave.rock.b': { region: caves(352, 32, 32, 30) },
  'cave.rock.c': { region: caves(384, 32, 32, 30) },
  'cave.boulder': { region: caves(448, 34, 64, 62), offsetY: 4 },
  crystal: { region: caves(388, 394, 24, 54) },
  ladder: { region: caves(864, 332, 32, 72), offsetY: 8 },
} as const satisfies Record<string, ObjectArt>;

export type ObjectId = keyof typeof OBJECTS;
