import type { Region } from './images';
import { PROP_ATLAS } from './propAtlas';
import { BUILDING_FOOTPRINTS } from '../../world/buildings';

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
  /** Full assembled height when the roof needs a separate wall course below it. */
  readonly height?: number;
  /** Modular details, relative to the assembled sprite's top-left corner. */
  readonly details?: readonly ObjectDetail[];
  /** Clean source pieces when an atlas rectangle also contains a neighboring sprite. */
  readonly baseParts?: readonly ObjectDetail[];
}

export interface ObjectDetail {
  readonly region: Region;
  readonly x: number;
  readonly y: number;
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

/** A region prop from the packed props sheet (see `tools/import_art.py`). */
const prop = (name: keyof typeof PROP_ATLAS, width = 1, offsetY = 0): ObjectArt => {
  const [x, y, w, h] = PROP_ATLAS[name];
  return {
    region: { image: 'props', x, y, w, h },
    width: BUILDING_FOOTPRINTS[name]?.width ?? width,
    offsetY,
  };
};

const WINDOW = village(834, 18, 28, 28);
const ATTIC_WINDOW = WINDOW;
const FRONT_DOOR = village(0, 280, 32, 38);

/** The blue/gray source rectangles are roofs, not finished houses. */
function cottage(y: number): ObjectArt {
  return {
    region: village(864, y, 128, 156),
    width: BUILDING_FOOTPRINTS['house.blue']?.width ?? 4,
    height: 188,
    details: [
      { region: village(864, 464, 128, 32), x: 0, y: 156 },
      { region: village(864, 508, 128, 4), x: 0, y: 184 },
      { region: ATTIC_WINDOW, x: 50, y: 118 },
      { region: WINDOW, x: 20, y: 154 },
      { region: FRONT_DOOR, x: 64, y: 150 },
    ],
  };
}

function settlement(blue: boolean): ObjectArt {
  const gable = village(768, blue ? 192 : 128, 64, 64);
  return {
    // Only baseParts are drawn; region supplies the full composition bounds.
    region: village(768, 128, 160, 64),
    width: 5,
    height: 128,
    baseParts: [
      { region: gable, x: 48, y: 0 },
      { region: gable, x: 0, y: 32 },
      { region: gable, x: 96, y: 32 },
      { region: village(864, 464, 64, 16), x: 0, y: 96 },
      { region: village(864, 464, 64, 16), x: 96, y: 96 },
    ],
    details: [
      { region: FRONT_DOOR, x: 16, y: 74 },
      { region: FRONT_DOOR, x: 112, y: 74 },
      // Fence wings frame an open central street, not an individual house door.
      { region: village(224, 320, 32, 64), x: 32, y: 64 },
      { region: village(288, 320, 32, 64), x: 96, y: 64 },
      { region: village(226, 110, 28, 48), x: 132, y: 80 },
    ],
  };
}

/** The final atlas course is an alternate door, not another storey. */
function mushroomHouse(name: 'mush.house' | 'mush.house.blue'): ObjectArt {
  const art = prop(name, 6);
  return { ...art, region: { ...art.region, h: 170 } };
}

const tower = prop('tower', 3);
const [towerX, towerY] = PROP_ATLAS.tower;

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

  // A settlement symbol: several gabled homes behind an open, signposted gateway.
  // The central lane marks the town warp; this is a map symbol, not a house door.
  'settlement.red': settlement(false),
  'settlement.blue': settlement(true),

  // Settlements (4-tile-wide houses sit on a 4×3 footprint)
  'house.red': {
    region: village(864, 292, 128, 220),
    width: BUILDING_FOOTPRINTS['house.red']?.width ?? 4,
    baseParts: [
      { region: village(896, 292, 96, 32), x: 32, y: 0 },
      { region: village(864, 324, 128, 188), x: 0, y: 32 },
    ],
    details: [
      { region: ATTIC_WINDOW, x: 50, y: 118 },
      { region: WINDOW, x: 20, y: 174 },
      { region: WINDOW, x: 98, y: 174 },
      { region: FRONT_DOOR, x: 64, y: 182 },
    ],
  },
  'house.blue': cottage(708),
  'house.gray': cottage(868),
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

  // Mentor regions (props sheet)
  'forge.hall': {
    ...prop('forge.hall', 7),
    details: [
      { region: WINDOW, x: 28, y: 170 },
      { region: WINDOW, x: 166, y: 170 },
    ],
  },
  'forge.furnace': prop('forge.furnace', 2),
  'forge.anvil': prop('forge.anvil'),
  brazier: prop('brazier'),
  torch: prop('torch'),
  'orb.blue': prop('orb.blue'),
  'orb.red': prop('orb.red'),
  tower: {
    ...tower,
    details: [
      // These source courses contain alternate door tiles. Only the ground floor is an entrance.
      ...[0, 64].flatMap((y): ObjectDetail[] =>
        [0, 24, 48, 72].map((x) => ({
          region: { image: 'props', x: towerX, y: towerY + y, w: 24, h: 64 },
          x,
          y,
        })),
      ),
      { region: ATTIC_WINDOW, x: 34, y: 22 },
      { region: WINDOW, x: 34, y: 86 },
    ],
  },
  'mush.house': mushroomHouse('mush.house'),
  'mush.house.blue': mushroomHouse('mush.house.blue'),
  'mush.tree.red': prop('mush.tree.red', 3),
  'mush.tree.blue': prop('mush.tree.blue', 3),
  'tree.green.a': prop('tree.green.a', 1, 4),
  'tree.green.b': prop('tree.green.b', 1, 4),
  'tree.green.round': prop('tree.green.round', 1, 6),
  'tree.blue.a': prop('tree.blue.a', 1, 4),
  'tree.blue.b': prop('tree.blue.b', 1, 4),
  'tree.blue.round': prop('tree.blue.round', 1, 6),
  'tree.red.a': prop('tree.red.a', 1, 4),
  'tree.red.b': prop('tree.red.b', 1, 4),
  'tree.red.round': prop('tree.red.round', 1, 6),
  'tree.purple.a': prop('tree.purple.a', 1, 4),
  'tree.purple.b': prop('tree.purple.b', 1, 4),
  'tree.purple.round': prop('tree.purple.round', 1, 6),
  'rock.beige.1': prop('rock.beige.1', 1, -1),
  'rock.beige.2': prop('rock.beige.2', 1, -1),
  'rock.beige.3': prop('rock.beige.3', 1, -1),
  'rock.beige.4': prop('rock.beige.4', 1, -1),
  'rock.blue.1': prop('rock.blue.1', 1, -1),
  'rock.blue.2': prop('rock.blue.2', 1, -1),
  'rock.blue.3': prop('rock.blue.3', 1, -1),
  'rock.blue.4': prop('rock.blue.4', 1, -1),
  'rock.dark.1': prop('rock.dark.1', 1, -1),
  'rock.dark.2': prop('rock.dark.2', 1, -1),
  'rock.dark.3': prop('rock.dark.3', 1, -1),
  'rock.dark.4': prop('rock.dark.4', 1, -1),
  'rock.orange.1': prop('rock.orange.1', 1, -1),
  'rock.orange.2': prop('rock.orange.2', 1, -1),
  'rock.orange.3': prop('rock.orange.3', 1, -1),
  'rock.orange.4': prop('rock.orange.4', 1, -1),
  'spire.beige.1': prop('spire.beige.1', 1, 2),
  'spire.beige.2': prop('spire.beige.2', 1, 2),
  'spire.beige.3': prop('spire.beige.3', 1, 2),
  'spire.beige.4': prop('spire.beige.4', 1, 2),
  'mine.beige': prop('mine.beige', 3),
  'spire.blue.1': prop('spire.blue.1', 1, 2),
  'spire.blue.2': prop('spire.blue.2', 1, 2),
  'spire.blue.3': prop('spire.blue.3', 1, 2),
  'spire.blue.4': prop('spire.blue.4', 1, 2),
  'mine.blue': prop('mine.blue', 3),
  'spire.dark.1': prop('spire.dark.1', 1, 2),
  'spire.dark.2': prop('spire.dark.2', 1, 2),
  'spire.dark.3': prop('spire.dark.3', 1, 2),
  'spire.dark.4': prop('spire.dark.4', 1, 2),
  'mine.dark': prop('mine.dark', 3),
  hut: prop('hut', 6),
  dock: prop('dock', 3),
  'mesa.orange': prop('mesa.orange', 4),
  barrels: prop('barrels', 2),
} as const satisfies Record<string, ObjectArt>;

export type ObjectId = keyof typeof OBJECTS;
