import type { Region } from './images';
import { PROP_ATLAS } from './propAtlas';

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

/** A region prop from the packed props sheet (see `tools/import_art.py`). */
const prop = (name: keyof typeof PROP_ATLAS, width = 1, offsetY = 0): ObjectArt => {
  const [x, y, w, h] = PROP_ATLAS[name];
  return { region: { image: 'props', x, y, w, h }, width, offsetY };
};

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

  // Mentor regions (props sheet)
  'forge.hall': prop('forge.hall', 7),
  'forge.furnace': prop('forge.furnace', 2),
  'forge.anvil': prop('forge.anvil'),
  'brazier': prop('brazier'),
  'torch': prop('torch'),
  'orb.blue': prop('orb.blue'),
  'orb.red': prop('orb.red'),
  tower: prop('tower', 3),
  'mush.house': prop('mush.house', 6),
  'mush.house.blue': prop('mush.house.blue', 6),
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
