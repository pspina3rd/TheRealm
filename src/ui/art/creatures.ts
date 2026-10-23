import type { Direction } from '../../world/map';
import type { ImageId, Region } from './images';

/**
 * Animated characters and monsters. Data files refer to these by key
 * (`EnemyDef.sprite`, `NpcDef.sprite`, `HeroClass.sprite`).
 *
 * Three sheet formats are used:
 * - walker: 4 rows (down, left, right, up) × 4 walk frames, square frames
 *   (Fantasy Dreamland characters and overworld enemies)
 * - strip:  one row of idle frames (Pixel Battlers monsters)
 * - still:  a single image (props such as a chest)
 */
type Sheet =
  | { readonly kind: 'walker'; readonly image: ImageId; readonly frame: number }
  | {
      readonly kind: 'strip';
      readonly image: ImageId;
      readonly frame: number;
      readonly frames: number;
    }
  | { readonly kind: 'still'; readonly region: Region };

export interface CreatureArt {
  /** How it looks on the map. */
  readonly map: Sheet;
  /** How it looks beside the board in battle (defaults to `map`). */
  readonly battle?: Sheet;
  /** Size multiplier for the battle portrait. */
  readonly battleScale: number;
}

const DIRECTION_ROWS: Readonly<Record<Direction, number>> = { down: 0, left: 1, right: 2, up: 3 };
const WALK_FPS = 8;
const IDLE_FPS = 6;

const walker = (image: ImageId, frame = 48): Sheet => ({ kind: 'walker', image, frame });
const strip = (image: ImageId, frames = 8): Sheet => ({ kind: 'strip', image, frame: 64, frames });
const person = (image: ImageId): CreatureArt => ({ map: walker(image), battleScale: 3 });
/** Pixel Battlers strips are 64px; doubled they fill the portrait. */
const BATTLER_SCALE = 2;

export const CREATURES = {
  // Heroes and townsfolk
  'char.002': person('char.002'),
  'char.004': person('char.004'),
  'char.005': person('char.005'),
  'char.008': person('char.008'),
  'char.015': person('char.015'),
  'char.016': person('char.016'),
  'char.019': person('char.019'),
  'char.020': person('char.020'),
  'char.025': person('char.025'),
  'char.026': person('char.026'),
  'char.031': person('char.031'),
  'char.032': person('char.032'),
  'char.037': person('char.037'),
  'char.038': person('char.038'),
  'char.039': person('char.039'),
  'char.040': person('char.040'),
  'char.006': person('char.006'),
  'char.007': person('char.007'),
  'char.012': person('char.012'),
  'char.013': person('char.013'),
  'char.014': person('char.014'),
  'char.017': person('char.017'),
  'char.018': person('char.018'),
  'char.027': person('char.027'),
  'char.033': person('char.033'),
  chest: {
    map: { kind: 'still', region: { image: 'caves', x: 642, y: 36, w: 28, h: 26 } },
    battleScale: 3,
  },

  // Overworld enemies (Fantasy Dreamland)
  'enemy.slime': {
    map: walker('enemy.001'),
    battle: walker('enemy.001.large', 72),
    battleScale: 2,
  },
  'enemy.shroom': {
    map: walker('enemy.009'),
    battle: walker('enemy.009.large', 72),
    battleScale: 2,
  },

  // Moon Caves monsters (Pixel Battlers)
  'battler.moonImp': { map: strip('battler.001C'), battleScale: BATTLER_SCALE },
  'battler.shadeImp': { map: strip('battler.004D', 7), battleScale: BATTLER_SCALE },
  'battler.brute': { map: strip('battler.011D'), battleScale: BATTLER_SCALE },
  'battler.wyrm': { map: strip('battler.006C'), battleScale: BATTLER_SCALE },

  // Mentor-region monsters: Fantasy Dreamland critters and Pixel Battlers
  'enemy.sproutling': {
    map: walker('enemy.024'),
    battle: walker('enemy.024.large', 72),
    battleScale: 2,
  },
  'enemy.drip': {
    map: walker('enemy.018'),
    battle: walker('enemy.018.large', 72),
    battleScale: 2,
  },
  'enemy.cinder': {
    map: walker('enemy.017'),
    battle: walker('enemy.017.large', 72),
    battleScale: 2,
  },
  'enemy.puffball': {
    map: walker('enemy.052'),
    battle: walker('enemy.052.large', 72),
    battleScale: 2,
  },
  'enemy.watcher': {
    map: walker('enemy.051'),
    battle: walker('enemy.051.large', 72),
    battleScale: 2,
  },
  'battler.leafSprite': { map: strip('battler.023A', 6), battleScale: BATTLER_SCALE },
  'battler.thornTroll': { map: strip('battler.017A'), battleScale: BATTLER_SCALE },
  'battler.lakeLurker': { map: strip('battler.018B'), battleScale: BATTLER_SCALE },
  'battler.tideOgre': { map: strip('battler.022B'), battleScale: BATTLER_SCALE },
  'battler.quarryHound': { map: strip('battler.018C'), battleScale: BATTLER_SCALE },
  'battler.stoneOgre': { map: strip('battler.022C'), battleScale: BATTLER_SCALE },
  'battler.forgeImp': { map: strip('battler.036C'), battleScale: BATTLER_SCALE },
  'battler.magmaDrake': { map: strip('battler.003A'), battleScale: BATTLER_SCALE },
  'battler.sparkPup': { map: strip('battler.029A'), battleScale: BATTLER_SCALE },
  'battler.stormGoblin': { map: strip('battler.025B'), battleScale: BATTLER_SCALE },
  'battler.thunderhide': { map: strip('battler.030B'), battleScale: BATTLER_SCALE },
  'battler.galeBat': { map: strip('battler.031D'), battleScale: BATTLER_SCALE },
  'battler.skyRam': { map: strip('battler.033D', 6), battleScale: BATTLER_SCALE },
  'battler.nightBat': { map: strip('battler.031A'), battleScale: BATTLER_SCALE },
  'battler.gloomToad': { map: strip('battler.035A'), battleScale: BATTLER_SCALE },
} as const satisfies Record<string, CreatureArt>;

export type CreatureId = keyof typeof CREATURES;

export function isCreatureId(key: string): key is CreatureId {
  return key in CREATURES;
}

/** True for big battle-strip monsters, which are scaled down on the map. */
export function isStripSprite(id: CreatureId): boolean {
  const art: CreatureArt = CREATURES[id];
  return art.map.kind === 'strip';
}

// prettier-ignore
function sheetFrame(sheet: Sheet, row: number, frameIndex: number): Region {
  switch (sheet.kind) {
    case 'walker':
      return { image: sheet.image, x: (frameIndex % 4) * sheet.frame, y: row * sheet.frame, w: sheet.frame, h: sheet.frame };
    case 'strip':
      return { image: sheet.image, x: (frameIndex % sheet.frames) * sheet.frame, y: 0, w: sheet.frame, h: sheet.frame };
    case 'still':
      return sheet.region;
  }
}

/**
 * The map frame for a creature facing `facing`. Walkers animate only while
 * `moving`; strips always play their idle loop.
 */
export function mapFrame(
  id: CreatureId,
  facing: Direction,
  moving: boolean,
  timeMs: number,
): Region {
  const sheet: Sheet = CREATURES[id].map;
  const fps = sheet.kind === 'walker' ? WALK_FPS : IDLE_FPS;
  const frame = sheet.kind === 'walker' && !moving ? 0 : Math.floor((timeMs / 1000) * fps);
  return sheetFrame(sheet, DIRECTION_ROWS[facing], frame);
}

/** The battle portrait frame: facing the player, gently animated. */
export function battleFrame(id: CreatureId, timeMs: number): Region {
  const art: CreatureArt = CREATURES[id];
  const sheet = art.battle ?? art.map;
  return sheetFrame(sheet, 0, Math.floor((timeMs / 1000) * IDLE_FPS));
}
