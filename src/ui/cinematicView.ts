/**
 * Draws one moment of an illustrated story scene (see `src/game/cinematic.ts`) onto a 480 x 270
 * canvas, using the game's own sprites, ground tiles and standing-stone drawing.
 */
import {
  STONE_ORDER,
  actorPose,
  sample,
  type CinematicShot,
  type CinematicActor,
} from '../game/cinematic';
import type { MapDef } from '../world/map';
import type { Atlas } from './art/atlas';
import { isCreatureId, mapFrame } from './art/creatures';
import { ELEMENT_COLOR_OF } from './art/feedback';
import type { Region } from './art/images';
import { TILE, cellHash, planGround } from './art/themes';
import { drawStandingStone } from './standingStone';

export const STAGE_WIDTH = 480;
export const STAGE_HEIGHT = 270;
/**
 * Shots are staged on a 320 x 180 area (see `src/data/openingCinematic.ts`); the canvas shows that
 * area centred with this much more scenery around it, so large props such as the stones have room.
 */
const ORIGIN = { x: 80, y: 45 } as const;
/** The visible scenery, in staging coordinates. */
const VIEW = {
  left: -ORIGIN.x,
  top: -ORIGIN.y,
  right: STAGE_WIDTH - ORIGIN.x,
  bottom: STAGE_HEIGHT - ORIGIN.y,
} as const;

/**
 * The ground of each outdoor setting, as a small map in canvas tiles (15 x 9), so the game's own
 * ground art draws it: '.' grass, ',' flowers, '=' bare earth and path, with blended edges.
 */
const groundMap = (id: string, tiles: readonly string[]): MapDef => ({
  id,
  name: '',
  theme: 'outdoor',
  tiles,
  warps: [],
  entities: [],
});
const HILL_GROUND = groundMap('cinematic-hill', [
  '.,......,....,.',
  '....,.......,..',
  '.,..=======...,',
  '...=========...',
  '..,=========.,.',
  '....,..=..,....',
  '.,.....=.....,.',
  '...,...=..,....',
  '.......=......,',
]);
const MEADOW_GROUND = groundMap('cinematic-meadow', [
  '.,..,..,...,.,.',
  ',...,.,..,...,.',
  '..,....,..,..,.',
  '.,.,..,...,.,..',
  '..,..,.....,..,',
  ',..,...,.,...,.',
  '.,...,..,..,..,',
  '..,.,...,.,..,.',
  ',...,.,...,..,.',
]);

const BIRCH: Region = { image: 'story.birch', x: 0, y: 0, w: 64, h: 92 };
// The cottage, from the pack's village tiles.
/** One floorboard from the pack's bridge planks: a seam above an 8-pixel board, with dark ends. */
const FLOORBOARD: Region = { image: 'grasslands', x: 260, y: 428, w: 56, h: 10 };
const POST: Region = { image: 'village', x: 8, y: 690, w: 12, h: 32 };
const SKIRTING: Region = { image: 'village', x: 24, y: 758, w: 64, h: 10 };
const BRICKS: Region = { image: 'village', x: 24, y: 712, w: 40, h: 36 };
const WINDOW: Region = { image: 'village', x: 785, y: 146, w: 28, h: 32 };
const PLASTER = '#ffe1bf';
const FLOOR_SEAM = '#5a3a24';
const DOOR_SHUT: Region = { image: 'village', x: 0, y: 280, w: 32, h: 38 };
const DOOR_OPEN: Region = { image: 'village', x: 0, y: 466, w: 32, h: 38 };
const CHAIR: Region = { image: 'village', x: 0, y: 128, w: 32, h: 40 };
const BENCH: Region = { image: 'village', x: 64, y: 192, w: 64, h: 32 };
const FIREPLACE: Region = { image: 'story.fireplace', x: 0, y: 0, w: 96, h: 141 };
/** The fireplace sprite: its chimney breast and its hearth, which comes out onto the floor. */
const CHIMNEY_WIDTH = 64;
const HEARTH_DEPTH = 10;

/** Birches around the hilltop, outside the stones: base position on the stage. */
const BIRCHES: readonly (readonly [number, number])[] = [
  [-66, 62],
  [386, 62],
  [-60, 214],
  [380, 214],
  [36, 252],
  [284, 252],
];
/** The stones stand in a horseshoe on the hilltop, open toward the path up the hill. */
const RING = { x: 160, y: 120, rx: 200, ry: 74 } as const;
/** The cottage: the back wall meets the floor here; the door and fireplace stand on that line. */
const WALL_FOOT = 86;
const DOOR_X = 256;
const FIRE_X = 46;
const WINDOW_X = 168;
/** Where brick shows through the plaster, on the back wall. */
const BRICK_PATCHES: readonly (readonly [number, number])[] = [
  [-60, 8],
  [180, -20],
  [330, 20],
];

/**
 * Each stone's nudge from an even spacing along the back of the horseshoe, so they stand where they
 * fell rather than in a laid-out arc. Fixed, so every viewing matches.
 */
const STONE_SCATTER: readonly (readonly [number, number])[] = [
  [6, 10],
  [-8, -12],
  [4, 8],
  [10, -16],
  [-6, 6],
  [8, -6],
  [-4, 14],
];

/** Warm and cool light colours. */
const FIRELIGHT = '#ff9a48';
const LANTERN_LIGHT = '#ffd27a';
const MOONLIGHT = '#9fb4ff';

/**
 * Where each stone's base is: scattered round the back of the horseshoe, violet at the left end and
 * red at the right, back stones first so nearer ones overlap them.
 */
function stonePositions(): { x: number; y: number; index: number }[] {
  const last = STONE_ORDER.length - 1;
  const span = RING.rx * 0.95;
  return STONE_ORDER.map((_, index) => {
    const [dx, dy] = STONE_SCATTER[index] ?? [0, 0];
    const x = RING.x - span + (index * 2 * span) / last;
    const across = (x - RING.x) / RING.rx;
    return { x: x + dx, y: RING.y - RING.ry * Math.sqrt(1 - across * across) + dy, index };
  }).sort((a, b) => a.y - b.y);
}

export class CinematicView {
  private readonly ctx: CanvasRenderingContext2D;
  /** Off-screen layer for the night, so light sources can be cut out of it. */
  private readonly night: CanvasRenderingContext2D;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly atlas: Atlas,
  ) {
    canvas.width = STAGE_WIDTH;
    canvas.height = STAGE_HEIGHT;
    this.ctx = required2d(canvas);
    this.ctx.imageSmoothingEnabled = false;
    const layer = document.createElement('canvas');
    layer.width = STAGE_WIDTH;
    layer.height = STAGE_HEIGHT;
    this.night = required2d(layer);
  }

  /** Draws `shot` as it looks `t` milliseconds in. */
  draw(shot: CinematicShot, t: number): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    const lights: Light[] = [];
    if (shot.setting !== 'house')
      this.drawGround(shot.setting === 'hill' ? HILL_GROUND : MEADOW_GROUND, t);
    ctx.save();
    ctx.translate(ORIGIN.x, ORIGIN.y);
    if (shot.setting === 'house') this.drawHouse(shot, t, lights);
    else this.drawOutdoors(shot, t, lights);
    this.drawActors(shot.actors, t, lights);
    ctx.restore();
    if (shot.setting === 'memory') this.drawMemoryFrame();
    const darkness = sample(shot.darkness, t);
    this.drawNight(darkness, lights);
    this.drawLightColour(darkness, lights);
    const fade = shot.fade ? sample(shot.fade, t) : 0;
    if (fade > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
      ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    }
  }

  /** Grass, flowers and paths, drawn by the game's own ground art from a small map. */
  private drawGround(map: MapDef, t: number): void {
    map.tiles.forEach((row, y) => {
      for (let x = 0; x < row.length; x++)
        for (const layer of planGround(map, x, y, t))
          this.atlas.draw(this.ctx, layer, x * TILE, y * TILE);
    });
  }

  private drawOutdoors(shot: CinematicShot, t: number, lights: Light[]): void {
    const stones = shot.setting === 'hill' ? shot.stones : undefined;
    if (stones)
      for (const { x, y, index } of stonePositions()) {
        const light = sample(stones[index] ?? [], t);
        const element = STONE_ORDER[index] ?? 'arcane';
        drawStandingStone(this.ctx, this.atlas, x, y, element, light, t);
        if (light > 0)
          lights.push({ x, y: y - 30, radius: 48 * light, colour: ELEMENT_COLOR_OF[element] });
      }
    for (const [x, y] of BIRCHES) this.atlas.draw(this.ctx, BIRCH, x - 32, y - 88);
  }

  private drawHouse(shot: CinematicShot, t: number, lights: Light[]): void {
    const { ctx } = this;
    // Plaster wall framed in timber, brick showing through in places, on a stone skirting.
    ctx.fillStyle = PLASTER;
    ctx.fillRect(VIEW.left, VIEW.top, VIEW.right - VIEW.left, WALL_FOOT - VIEW.top);
    for (const [x, y] of BRICK_PATCHES) this.atlas.draw(ctx, BRICKS, x, y);
    const behindFireplace = (x: number): boolean =>
      x + POST.w > FIRE_X - FIREPLACE.w / 2 && x < FIRE_X + FIREPLACE.w / 2;
    for (let x = VIEW.left + 8; x < VIEW.right; x += 96)
      if (!behindFireplace(x))
        for (let y = VIEW.top; y < WALL_FOOT; y += POST.h) this.atlas.draw(ctx, POST, x, y);
    for (let x = VIEW.left; x < VIEW.right; x += SKIRTING.w)
      this.atlas.draw(ctx, SKIRTING, x, WALL_FOOT - SKIRTING.h);
    // Floorboards across the room, their joints staggered from row to row.
    ctx.fillStyle = FLOOR_SEAM;
    ctx.fillRect(VIEW.left, WALL_FOOT, VIEW.right - VIEW.left, VIEW.bottom - WALL_FOOT);
    for (let y = WALL_FOOT, row = 0; y < VIEW.bottom; y += FLOORBOARD.h, row++) {
      const stagger = Math.floor(cellHash(row, 7) * FLOORBOARD.w);
      for (let x = VIEW.left - stagger; x < VIEW.right; x += FLOORBOARD.w)
        this.atlas.draw(ctx, FLOORBOARD, x, y);
    }
    // The window, the bench, the fireplace, the chair and the door.
    this.atlas.draw(ctx, WINDOW, WINDOW_X - WINDOW.w / 2, 20);
    lights.push({ x: WINDOW_X, y: 36, radius: 40, colour: MOONLIGHT, strength: 0.5 });
    this.atlas.draw(ctx, BENCH, 150, WALL_FOOT - 30);
    this.drawFireplace();
    this.atlas.draw(ctx, CHAIR, 82, 92);
    const flicker = 6 * Math.sin(t / 90) + 3 * Math.sin(t / 37);
    lights.push({ x: FIRE_X, y: WALL_FOOT - 18, radius: 110 + flicker, colour: FIRELIGHT });
    const open = shot.door ? sample(shot.door, t) >= 0.5 : false;
    const shake = shot.doorShake ? sample(shot.doorShake, t) * Math.sin(t / 25) : 0;
    this.atlas.draw(ctx, open ? DOOR_OPEN : DOOR_SHUT, DOOR_X - 16 + shake, WALL_FOOT - 38);
  }

  /**
   * The fireplace stands out from the wall: its chimney breast and firebox cast a soft shadow on the
   * plaster to their right, and its hearth comes out onto the floorboards.
   */
  private drawFireplace(): void {
    const { ctx } = this;
    const left = FIRE_X - FIREPLACE.w / 2;
    const top = WALL_FOOT + HEARTH_DEPTH - FIREPLACE.h;
    const mantel = WALL_FOOT - 64;
    ctx.fillStyle = 'rgba(40, 24, 16, 0.22)';
    ctx.fillRect(FIRE_X + CHIMNEY_WIDTH / 2, top, 6, mantel - top);
    ctx.fillRect(left + FIREPLACE.w, mantel, 6, WALL_FOOT - mantel);
    this.atlas.draw(ctx, FIREPLACE, left, top);
  }

  private drawActors(actors: readonly CinematicActor[], t: number, lights: Light[]): void {
    const { ctx } = this;
    const poses = actors
      .map((actor) => ({ actor, pose: actorPose(actor, t) }))
      .sort((a, b) => a.pose.y - b.pose.y);
    for (const { actor, pose } of poses) {
      if (!isCreatureId(actor.sprite)) throw new Error(`Unknown sprite ${actor.sprite}`);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(pose.x, pose.y - 2, 9, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      const frame = mapFrame(actor.sprite, pose.facing, pose.walking, t);
      this.atlas.draw(ctx, frame, Math.round(pose.x - 24), Math.round(pose.y - 46));
      if (actor.lantern)
        lights.push({ x: pose.x, y: pose.y - 14, radius: 60, colour: LANTERN_LIGHT });
    }
  }

  /** A warm, faded frame around a remembered scene. */
  private drawMemoryFrame(): void {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(255, 196, 120, 0.18)';
    ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    const cx = STAGE_WIDTH / 2;
    const cy = STAGE_HEIGHT / 2;
    const vignette = ctx.createRadialGradient(cx, cy, 75, cx, cy, 285);
    vignette.addColorStop(0, 'rgba(60, 40, 20, 0)');
    vignette.addColorStop(1, 'rgba(60, 40, 20, 0.85)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
  }

  /** Night over everything, with soft holes where stones, the fire or a lantern give light. */
  private drawNight(darkness: number, lights: readonly Light[]): void {
    if (darkness <= 0) return;
    const night = this.night;
    night.globalCompositeOperation = 'source-over';
    night.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    night.fillStyle = `rgba(8, 12, 28, ${darkness})`;
    night.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    night.globalCompositeOperation = 'destination-out';
    for (const light of lights) {
      const { x, y, radius } = onCanvas(light);
      const glow = night.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, `rgba(0, 0, 0, ${0.85 * (light.strength ?? 1)})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      night.fillStyle = glow;
      night.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    this.ctx.drawImage(night.canvas, 0, 0);
  }

  /** Each light tints what it falls on with its own colour, more strongly the darker the night. */
  private drawLightColour(darkness: number, lights: readonly Light[]): void {
    if (darkness <= 0) return;
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const light of lights) {
      const { x, y, radius } = onCanvas(light);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const alpha = Math.round(255 * 0.15 * darkness * (light.strength ?? 1));
      glow.addColorStop(0, `${light.colour}${alpha.toString(16).padStart(2, '0')}`);
      glow.addColorStop(1, `${light.colour}00`);
      ctx.fillStyle = glow;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    ctx.restore();
  }
}

interface Light {
  /** Position and reach in staging coordinates. */
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  /** The light's colour, as #rrggbb. */
  readonly colour: string;
  /** How strongly it lights its surroundings, 1 by default. */
  readonly strength?: number;
}

/** A light's position on the canvas. */
function onCanvas(light: Light): { x: number; y: number; radius: number } {
  return { x: light.x + ORIGIN.x, y: light.y + ORIGIN.y, radius: light.radius };
}

function required2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  return ctx;
}
