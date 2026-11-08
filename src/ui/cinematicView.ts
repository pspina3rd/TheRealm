/**
 * Draws one moment of an illustrated story scene (see `src/game/cinematic.ts`) onto a 320 x 180
 * canvas, using the game's own sprites, tiles and standing-stone drawing.
 */
import {
  STONE_ORDER,
  actorPose,
  sample,
  type CinematicShot,
  type CinematicActor,
} from '../game/cinematic';
import type { Atlas } from './art/atlas';
import { isCreatureId, mapFrame } from './art/creatures';
import type { Region } from './art/images';
import { PROP_ATLAS } from './art/propAtlas';
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

const GRASS: Region = { image: 'grasslands', x: 32, y: 0, w: 32, h: 32 };
const PATH: Region = { image: 'grasslands', x: 224, y: 0, w: 32, h: 32 };
const BIRCH: Region = { image: 'story.birch', x: 0, y: 0, w: 64, h: 92 };
const DOOR_SHUT: Region = { image: 'village', x: 0, y: 280, w: 32, h: 38 };
const DOOR_OPEN: Region = { image: 'village', x: 0, y: 466, w: 32, h: 38 };
const CHAIR: Region = { image: 'village', x: 0, y: 128, w: 32, h: 40 };
const BENCH: Region = { image: 'village', x: 64, y: 192, w: 64, h: 32 };
const [stoveX, stoveY, stoveW, stoveH] = PROP_ATLAS['forge.furnace'];
const STOVE: Region = { image: 'props', x: stoveX, y: stoveY, w: stoveW, h: stoveH };

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
/** The house: the back wall meets the floor here, and the door and stove stand on that line. */
const WALL_FOOT = 86;
const DOOR_X = 256;
const STOVE_X = 54;

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
    ctx.save();
    ctx.translate(ORIGIN.x, ORIGIN.y);
    if (shot.setting === 'house') this.drawHouse(shot, t, lights);
    else this.drawOutdoors(shot, t, lights);
    this.drawActors(shot.actors, t, lights);
    ctx.restore();
    if (shot.setting === 'memory') this.drawMemoryFrame();
    this.drawNight(sample(shot.darkness, t), lights);
    const fade = shot.fade ? sample(shot.fade, t) : 0;
    if (fade > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
      ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    }
  }

  private drawOutdoors(shot: CinematicShot, t: number, lights: Light[]): void {
    for (let y = VIEW.top - 19; y < VIEW.bottom; y += 32)
      for (let x = VIEW.left; x < VIEW.right; x += 32) this.atlas.draw(this.ctx, GRASS, x, y);
    if (shot.setting === 'hill') {
      for (let y = RING.y + 8; y < VIEW.bottom; y += 32) this.atlas.draw(this.ctx, PATH, 144, y);
      const stones = shot.stones;
      if (stones)
        for (const { x, y, index } of stonePositions()) {
          const light = sample(stones[index] ?? [], t);
          const element = STONE_ORDER[index] ?? 'arcane';
          drawStandingStone(this.ctx, this.atlas, x, y, element, light, t);
          if (light > 0) lights.push({ x, y: y - 34, radius: 40 * light });
        }
    }
    for (const [x, y] of BIRCHES) this.atlas.draw(this.ctx, BIRCH, x - 32, y - 88);
  }

  private drawHouse(shot: CinematicShot, t: number, lights: Light[]): void {
    const { ctx } = this;
    // Plaster wall with timber posts, and a plank floor.
    const width = VIEW.right - VIEW.left;
    ctx.fillStyle = '#e6cfa8';
    ctx.fillRect(VIEW.left, VIEW.top, width, WALL_FOOT - VIEW.top);
    ctx.fillStyle = '#6e4a2c';
    for (let x = VIEW.left; x < VIEW.right; x += 80)
      ctx.fillRect(x, VIEW.top, 6, WALL_FOOT - VIEW.top);
    ctx.fillRect(VIEW.left, WALL_FOOT - 4, width, 4);
    ctx.fillStyle = '#946a44';
    ctx.fillRect(VIEW.left, WALL_FOOT, width, VIEW.bottom - WALL_FOOT);
    ctx.fillStyle = '#7a5536';
    for (let y = WALL_FOOT + 10, row = 0; y < VIEW.bottom; y += 12, row++) {
      ctx.fillRect(VIEW.left, y, width, 1);
      for (let x = VIEW.left + (row % 2) * 24; x < VIEW.right; x += 48)
        ctx.fillRect(x, y - 11, 1, 11);
    }
    // Furniture against the back wall, the stove and its fire, and the door.
    this.atlas.draw(ctx, BENCH, 150, WALL_FOOT - 30);
    this.atlas.draw(ctx, STOVE, STOVE_X - 21, WALL_FOOT - 66, 42, 66);
    this.atlas.draw(ctx, CHAIR, 82, 92);
    lights.push({ x: STOVE_X, y: WALL_FOOT - 16, radius: 110 + 6 * Math.sin(t / 90) });
    const open = shot.door ? sample(shot.door, t) >= 0.5 : false;
    const shake = shot.doorShake ? sample(shot.doorShake, t) * Math.sin(t / 25) : 0;
    this.atlas.draw(ctx, open ? DOOR_OPEN : DOOR_SHUT, DOOR_X - 16 + shake, WALL_FOOT - 38);
  }

  private drawActors(actors: readonly CinematicActor[], t: number, lights: Light[]): void {
    const poses = actors
      .map((actor) => ({ actor, pose: actorPose(actor, t) }))
      .sort((a, b) => a.pose.y - b.pose.y);
    for (const { actor, pose } of poses) {
      if (!isCreatureId(actor.sprite)) throw new Error(`Unknown sprite ${actor.sprite}`);
      const frame = mapFrame(actor.sprite, pose.facing, pose.walking, t);
      this.atlas.draw(this.ctx, frame, Math.round(pose.x - 24), Math.round(pose.y - 46));
      if (actor.lantern) lights.push({ x: pose.x, y: pose.y - 14, radius: 52 });
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

  /** Night over everything, with soft holes where stones, the stove or a lantern give light. */
  private drawNight(darkness: number, lights: readonly Light[]): void {
    if (darkness <= 0) return;
    const night = this.night;
    night.globalCompositeOperation = 'source-over';
    night.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    night.fillStyle = `rgba(8, 12, 28, ${darkness})`;
    night.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    night.globalCompositeOperation = 'destination-out';
    for (const { x: sx, y: sy, radius } of lights) {
      const light = { x: sx + ORIGIN.x, y: sy + ORIGIN.y, radius };
      const glow = night.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
      glow.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      night.fillStyle = glow;
      night.fillRect(
        light.x - light.radius,
        light.y - light.radius,
        light.radius * 2,
        light.radius * 2,
      );
    }
    this.ctx.drawImage(night.canvas, 0, 0);
  }
}

interface Light {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

function required2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  return ctx;
}
