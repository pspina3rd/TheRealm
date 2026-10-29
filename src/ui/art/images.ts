import { PROPS_SIZE } from './propAtlas';

/**
 * Every image the game draws, with its pixel size. Paths are relative to
 * `public/assets/`. Art is by ElvGames (see `public/assets/elvgames/LICENSE.txt`);
 * `tools/import_art.py` copies it in from the purchased packs.
 */
export const IMAGES = {
  ground: { src: 'elvgames/tiles/ground.png', width: 768, height: 640 },
  water: { src: 'elvgames/tiles/water.png', width: 800, height: 640 },
  grasslands: { src: 'elvgames/tiles/grasslands.png', width: 1024, height: 1024 },
  village: { src: 'elvgames/tiles/village.png', width: 1024, height: 1024 },
  caves: { src: 'elvgames/tiles/caves.png', width: 1024, height: 1024 },
  /** Recoloured ground terrains for the mentor regions (built by the import script). */
  ground2: { src: 'elvgames/tiles/ground2.png', width: 768, height: 256 },
  /** The animated water, recoloured as lava. */
  lava: { src: 'elvgames/tiles/lava.png', width: 800, height: 640 },
  /** Region props, packed by the import script (see `propAtlas.ts`). */
  props: { src: 'elvgames/tiles/props.png', ...PROPS_SIZE },
  // prettier-ignore
  ...characterImages(['002', '004', '005', '006', '007', '008', '012', '013', '014', '015',
    '016', '017', '018', '019', '020', '025', '026', '027', '031', '032', '033', '037', '038',
    '039', '040']),
  'enemy.001': { src: 'elvgames/enemies/001.png', width: 192, height: 240 },
  'enemy.001.large': { src: 'elvgames/enemies/001_large.png', width: 288, height: 360 },
  'enemy.009': { src: 'elvgames/enemies/009.png', width: 192, height: 240 },
  'enemy.009.large': { src: 'elvgames/enemies/009_large.png', width: 288, height: 360 },
  ...enemyImages(['017', '018', '024', '051', '052']),
  'battler.001C': { src: 'elvgames/battlers/001C.png', width: 512, height: 64 },
  'battler.004D': { src: 'elvgames/battlers/004D.png', width: 448, height: 64 },
  'battler.006C': { src: 'elvgames/battlers/006C.png', width: 512, height: 64 },
  'battler.011D': { src: 'elvgames/battlers/011D.png', width: 512, height: 64 },
  // prettier-ignore
  ...battlerImages(['003A', '017A', '018B', '018C', '022B', '022C', '025B', '029A', '030B',
    '031A', '031D', '035A', '036C']),
  'battler.023A': { src: 'elvgames/battlers/023A.png', width: 384, height: 64 },
  'battler.033D': { src: 'elvgames/battlers/033D.png', width: 384, height: 64 },
  'vfx.fire': { src: 'elvgames/vfx/fire.png', width: 192, height: 128 },
  'vfx.meteor': { src: 'elvgames/vfx/meteor.png', width: 192, height: 128 },
  'vfx.thunder': { src: 'elvgames/vfx/thunder.png', width: 192, height: 128 },
  'vfx.ice': { src: 'elvgames/vfx/ice.png', width: 192, height: 128 },
  'vfx.heal': { src: 'elvgames/vfx/heal.png', width: 192, height: 128 },
  'vfx.hit': { src: 'elvgames/vfx/hit.png', width: 192, height: 128 },
} as const satisfies Record<string, ImageInfo>;

export interface ImageInfo {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

export type ImageId = keyof typeof IMAGES;

/** A rectangle within one image. */
export interface Region {
  readonly image: ImageId;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

function enemyImages<const T extends string>(
  ids: readonly T[],
): Record<`enemy.${T}` | `enemy.${T}.large`, ImageInfo> {
  return Object.fromEntries(
    ids.flatMap((id) => [
      [`enemy.${id}`, { src: `elvgames/enemies/${id}.png`, width: 192, height: 240 }],
      [`enemy.${id}.large`, { src: `elvgames/enemies/${id}_large.png`, width: 288, height: 360 }],
    ]),
  ) as Record<`enemy.${T}` | `enemy.${T}.large`, ImageInfo>;
}

/** Pixel Battlers strips of eight 64px frames. */
function battlerImages<const T extends string>(
  ids: readonly T[],
): Record<`battler.${T}`, ImageInfo> {
  return Object.fromEntries(
    ids.map((id) => [
      `battler.${id}`,
      { src: `elvgames/battlers/${id}.png`, width: 512, height: 64 },
    ]),
  ) as Record<`battler.${T}`, ImageInfo>;
}

function characterImages<const T extends string>(
  ids: readonly T[],
): Record<`char.${T}`, ImageInfo> {
  return Object.fromEntries(
    ids.map((id) => [
      `char.${id}`,
      { src: `elvgames/characters/${id}.png`, width: 192, height: 192 },
    ]),
  ) as Record<`char.${T}`, ImageInfo>;
}
