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
  // prettier-ignore
  ...characterImages(['002', '004', '005', '008', '015', '016', '019', '020', '025', '026',
    '031', '032', '037', '038', '039', '040']),
  'enemy.001': { src: 'elvgames/enemies/001.png', width: 192, height: 240 },
  'enemy.001.large': { src: 'elvgames/enemies/001_large.png', width: 288, height: 360 },
  'enemy.009': { src: 'elvgames/enemies/009.png', width: 192, height: 240 },
  'enemy.009.large': { src: 'elvgames/enemies/009_large.png', width: 288, height: 360 },
  'battler.001C': { src: 'elvgames/battlers/001C.png', width: 512, height: 64 },
  'battler.004D': { src: 'elvgames/battlers/004D.png', width: 448, height: 64 },
  'battler.006C': { src: 'elvgames/battlers/006C.png', width: 512, height: 64 },
  'battler.011D': { src: 'elvgames/battlers/011D.png', width: 512, height: 64 },
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
