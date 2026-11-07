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
import { ELEMENT_COLOR_OF } from './art/feedback';
import type { Region } from './art/images';
import { PROP_ATLAS } from './art/propAtlas';
import { drawStandingStone } from './standingStone';

export const STAGE_WIDTH = 320;
export const STAGE_HEIGHT = 180;

const GRASS: Region = { image: 'grasslands', x: 32, y: 0, w: 32, h: 32 };
const PATH: Region = { image: 'grasslands', x: 224, y: 0, w: 32, h: 32 };
const BIRCH: Region = { image: 'story.birch', x: 0, y: 0, w: 48, h: 104 };
const DOOR_SHUT: Region = { image: 'village', x: 0, y: 280, w: 32, h: 38 };
const DOOR_OPEN: Region = { image: 'village', x: 0, y: 466, w: 32, h: 38 };
const CHAIR: Region = { image: 'village', x: 0, y: 128, w: 32, h: 40 };
const BENCH: Region = { image: 'village', x: 64, y: 192, w: 64, h: 32 };
const [stoveX, stoveY, stoveW, stoveH] = PROP_ATLAS['forge.furnace'];
const STOVE: Region = { image: 'props', x: stoveX, y: stoveY, w: stoveW, h: stoveH };

/** Birches lining the path up the hill: base position on the stage. */
const BIRCHES: readonly (readonly [number, number])[] = [
  [34, 112],
  [286, 108],
  [70, 152],
  [252, 150],
  [102, 196],
  [222, 194],
];
/** The ring of stones on the hilltop, seen from the path. */
const RING = { x: 160, y: 58, rx: 74, ry: 20 } as const;
/** The house: the back wall meets the floor here, and the door and stove stand on that line. */
const WALL_FOOT = 86;
const DOOR_X = 256;
const STOVE_X = 54;

/** Where each stone's base is, back of the ring first so nearer stones overlap it. */
function stonePositions(): { x: number; y: number; index: number }[] {
  return STONE_ORDER.map((_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / STONE_ORDER.length;
    return {
      x: RING.x + Math.cos(angle) * RING.rx,
      y: RING.y + Math.sin(angle) * RING.ry,
      index,
    };
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
    if (shot.setting === 'house') this.drawHouse(shot, t, lights);
    else this.drawOutdoors(shot, t, lights);
    this.drawActors(shot.actors, t, lights);
    if (shot.setting === 'memory') this.drawMemoryFrame();
    this.drawNight(sample(shot.darkness, t), lights);
    const fade = shot.fade ? sample(shot.fade, t) : 0;
    if (fade > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
      ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    }
  }

  private drawOutdoors(shot: CinematicShot, t: number, lights: Light[]): void {
    for (let y = 0; y < STAGE_HEIGHT; y += 32)
      for (let x = 0; x < STAGE_WIDTH; x += 32) this.atlas.draw(this.ctx, GRASS, x, y);
    if (shot.setting === 'hill') {
      for (let y = RING.y + RING.ry + 6; y < STAGE_HEIGHT; y += 32)
        this.atlas.draw(this.ctx, PATH, 144, y);
      const stones = shot.stones;
      if (stones)
        for (const { x, y, index } of stonePositions()) {
          const light = sample(stones[index] ?? [], t);
          drawStandingStone(
            this.ctx,
            x,
            y,
            ELEMENT_COLOR_OF[STONE_ORDER[index] ?? 'arcane'],
            light,
            t,
          );
          if (light > 0) lights.push({ x, y: y - 18, radius: 30 * light });
        }
    }
    for (const [x, y] of BIRCHES) this.atlas.draw(this.ctx, BIRCH, x - 24, y - 100);
  }

  private drawHouse(shot: CinematicShot, t: number, lights: Light[]): void {
    const { ctx } = this;
    // Plaster wall with timber posts, and a plank floor.
    ctx.fillStyle = '#e6cfa8';
    ctx.fillRect(0, 0, STAGE_WIDTH, WALL_FOOT);
    ctx.fillStyle = '#6e4a2c';
    for (let x = 0; x < STAGE_WIDTH; x += 80) ctx.fillRect(x, 0, 6, WALL_FOOT);
    ctx.fillRect(0, WALL_FOOT - 4, STAGE_WIDTH, 4);
    ctx.fillStyle = '#946a44';
    ctx.fillRect(0, WALL_FOOT, STAGE_WIDTH, STAGE_HEIGHT - WALL_FOOT);
    ctx.fillStyle = '#7a5536';
    for (let y = WALL_FOOT + 10, row = 0; y < STAGE_HEIGHT; y += 12, row++) {
      ctx.fillRect(0, y, STAGE_WIDTH, 1);
      for (let x = (row % 2) * 24; x < STAGE_WIDTH; x += 48) ctx.fillRect(x, y - 11, 1, 11);
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
    const vignette = ctx.createRadialGradient(cx, cy, 50, cx, cy, 190);
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
    for (const light of lights) {
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
