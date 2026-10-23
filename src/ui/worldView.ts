import { MENTORS } from '../data/mentors';
import { entityAttitude, entitySprite } from '../game/encounter';
import { heroClass } from '../game/hero';
import { seeksHero } from '../game/hidden';
import { lessonsFor } from '../game/lessons';
import type { EntityDef, MapDef, MentorEntity } from '../world/map';
import { mapHeight, mapWidth, warpStirs } from '../world/map';
import { activeEntities, currentMap, type GameState } from '../world/state';
import type { Atlas } from './art/atlas';
import { ELEMENT_COLOR_OF } from './art/feedback';
import { ATTITUDE_ICONS, ICON_SIZE, elementPalette } from './art/icons';
import { drawIcon } from './iconDraw';
import { isCreatureId, isStripSprite, mapFrame } from './art/creatures';
import type { Region } from './art/images';
import { TILE, backgroundFor, planGround, planObjects, type PlacedObject } from './art/themes';

/** Tiles per second the hero glides between grid positions. */
const GLIDE_SPEED = 8;
/** On-map size for monsters drawn from large battle strips. */
const STRIP_SIZE = 48;
const BOSS_SIZE = 72;
/** Opacity of props drawn over the hero, so the hero is never hidden. */
const SEE_THROUGH = 0.55;

/** Something drawn in the depth-sorted layer this frame. */
interface Drawable {
  readonly sortY: number;
  draw(): void;
}

/** Draws the current map, props, characters and hero, with a camera that follows the hero. */
export class WorldView {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly atlas: Atlas;
  /** Smoothed hero position in tiles, for gliding between steps. */
  private heroX = 0;
  private heroY = 0;
  private lastMap = '';
  private props: PlacedObject[] = [];
  /** Marks drawn over everything this frame (mentors' scrolls). */
  private overlays: (() => void)[] = [];
  /** The camera's top-left corner last frame, in map pixels. */
  private camX = 0;
  private camY = 0;
  /** Where a tap-to-walk is heading, marked on the ground. */
  target: { readonly x: number; readonly y: number } | null = null;

  constructor(canvas: HTMLCanvasElement, atlas: Atlas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not supported');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.atlas = atlas;
  }

  render(state: GameState, dtMs: number, timeMs: number): void {
    const map = currentMap(state);
    const moving = this.glide(state, map, dtMs);
    const { ctx } = this;
    ctx.imageSmoothingEnabled = false; // resizing the canvas resets it
    const viewW = ctx.canvas.width;
    const viewH = ctx.canvas.height;
    const camX = Math.round(
      clampCamera(this.heroX * TILE + TILE / 2 - viewW / 2, mapWidth(map) * TILE, viewW),
    );
    const camY = Math.round(
      clampCamera(this.heroY * TILE + TILE / 2 - viewH / 2, mapHeight(map) * TILE, viewH),
    );

    this.camX = camX;
    this.camY = camY;

    ctx.fillStyle = backgroundFor(map);
    ctx.fillRect(0, 0, viewW, viewH);
    this.drawGround(map, camX, camY, timeMs);
    this.drawTarget(camX, camY, timeMs);

    const heroSortY = (this.heroY + 1) * TILE + 0.25;
    const heroCenterX = (this.heroX + 0.5) * TILE;
    const heroCenterY = (this.heroY + 0.5) * TILE;
    const drawables: Drawable[] = this.props.map((p) => {
      const coversHero =
        p.sortY > heroSortY &&
        heroCenterX >= p.px &&
        heroCenterX <= p.px + p.region.w &&
        heroCenterY >= p.py &&
        heroCenterY <= p.py + p.region.h;
      return {
        sortY: p.sortY,
        draw: () => {
          ctx.globalAlpha = coversHero ? SEE_THROUGH : 1;
          this.atlas.draw(ctx, p.region, p.px - camX, p.py - camY);
          ctx.globalAlpha = 1;
        },
      };
    });
    this.drawStirringSeals(map, state.flags, camX, camY, timeMs);
    for (const entity of activeEntities(state)) {
      drawables.push(this.entityDrawable(entity, camX, camY, timeMs));
      if (entity.kind === 'mentor') this.drawMentorMark(state, entity, camX, camY, timeMs);
      const attitude = entityAttitude(state, entity);
      if (attitude) {
        // The NPC's face for the hero, small, beside their head.
        const fx = entity.x * TILE - camX + TILE / 2 + 4;
        const fy = entity.y * TILE - camY - 22;
        this.overlays.push(() =>
          drawIcon(this.ctx, ATTITUDE_ICONS[attitude], fx, fy, { scale: 1 }),
        );
      }
    }
    const heroRegion = mapFrame(
      spriteOf(heroClass(state.hero).sprite),
      state.facing,
      moving,
      timeMs,
    );
    drawables.push({
      sortY: heroSortY,
      draw: () => this.drawStanding(heroRegion, this.heroX * TILE - camX, this.heroY * TILE - camY),
    });

    drawables.sort((a, b) => a.sortY - b.sortY).forEach((d) => d.draw());
    this.overlays.forEach((draw) => draw());
    this.overlays = [];
  }

  /** The map tile under a point on screen (client coordinates), as of the last frame. */
  tileAtPoint(clientX: number, clientY: number): { x: number; y: number } {
    const canvas = this.ctx.canvas;
    const rect = canvas.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * canvas.width + this.camX;
    const py = ((clientY - rect.top) / rect.height) * canvas.height + this.camY;
    return { x: Math.floor(px / TILE), y: Math.floor(py / TILE) };
  }

  /** A soft pulsing square where the hero is walking to. */
  private drawTarget(camX: number, camY: number, timeMs: number): void {
    if (!this.target) return;
    const { ctx } = this;
    const pulse = 0.35 + 0.25 * Math.sin(timeMs / 140);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#f5d77b';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      this.target.x * TILE - camX + 3,
      this.target.y * TILE - camY + 3,
      TILE - 6,
      TILE - 6,
    );
    ctx.restore();
  }

  private drawGround(map: MapDef, camX: number, camY: number, timeMs: number): void {
    const firstX = Math.max(0, Math.floor(camX / TILE));
    const firstY = Math.max(0, Math.floor(camY / TILE));
    const lastX = Math.min(mapWidth(map) - 1, Math.floor((camX + this.ctx.canvas.width) / TILE));
    const lastY = Math.min(mapHeight(map) - 1, Math.floor((camY + this.ctx.canvas.height) / TILE));
    for (let y = firstY; y <= lastY; y++) {
      for (let x = firstX; x <= lastX; x++) {
        for (const layer of planGround(map, x, y, timeMs)) {
          this.atlas.draw(this.ctx, layer, x * TILE - camX, y * TILE - camY);
        }
      }
    }
  }

  private entityDrawable(entity: EntityDef, camX: number, camY: number, timeMs: number): Drawable {
    const id = spriteOf(entitySprite(entity) ?? '');
    // Monsters shuffle on the spot; townsfolk stand still facing you.
    const region = mapFrame(id, 'down', entity.kind === 'monster', timeMs + entity.x * 137);
    const x = entity.x * TILE - camX;
    const y = entity.y * TILE - camY;
    const isStrip = isStripSprite(id);
    const size = entity.kind === 'monster' && entity.boss ? BOSS_SIZE : STRIP_SIZE;
    return {
      sortY: (entity.y + 1) * TILE,
      draw: () =>
        isStrip ? this.drawStanding(region, x, y, size, size) : this.drawStanding(region, x, y),
    };
  }

  /**
   * A mentor's marks: a glow of their element's colour at their feet, and
   * a bobbing scroll overhead while they have a lesson for the hero, or a
   * leaping star in their colour while they seek the hero out (they noticed
   * a feat on the board). The glow is drawn at once (under every sprite);
   * the marks go on top.
   */
  private drawMentorMark(
    state: GameState,
    entity: MentorEntity,
    camX: number,
    camY: number,
    timeMs: number,
  ): void {
    const mentor = MENTORS[entity.mentorId];
    if (!mentor) return;
    const { ctx } = this;
    const cx = entity.x * TILE - camX + TILE / 2;
    const cy = entity.y * TILE - camY + TILE - 3;
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.15 * Math.sin(timeMs / 300);
    ctx.fillStyle = ELEMENT_COLOR_OF[mentor.element];
    ctx.beginPath();
    ctx.ellipse(cx, cy, TILE * 0.45, TILE * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (seeksHero(mentor, state)) {
      this.overlays.push(() => {
        const leap = Math.round(Math.abs(Math.sin(timeMs / 180)) * 6);
        drawIcon(ctx, 'star', cx - ICON_SIZE, entity.y * TILE - camY - 34 - leap, {
          scale: 2,
          palette: elementPalette(mentor.element),
        });
      });
    } else if (lessonsFor(state, mentor).length > 0) {
      this.overlays.push(() => {
        const bob = Math.round(Math.sin(timeMs / 250) * 2);
        drawIcon(ctx, 'scroll', cx - ICON_SIZE, entity.y * TILE - camY - 30 + bob, { scale: 2 });
      });
    }
  }

  /** A sealed way that stirs (see `Warp.stirs`) glows violet and pulses, over its arch. */
  private drawStirringSeals(
    map: MapDef,
    flags: ReadonlySet<string>,
    camX: number,
    camY: number,
    timeMs: number,
  ): void {
    const { ctx } = this;
    for (const warp of map.warps) {
      if (!warpStirs(warp, flags)) continue;
      this.overlays.push(() => {
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(timeMs / 260);
        ctx.fillStyle = ELEMENT_COLOR_OF.arcane;
        ctx.beginPath();
        ctx.arc(
          (warp.x + 0.5) * TILE - camX,
          (warp.y + 0.5) * TILE - camY,
          TILE * 0.7,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.restore();
      });
    }
  }

  /** Draws a sprite with its bottom centre on the bottom centre of the tile at pixel (x, y). */
  private drawStanding(region: Region, x: number, y: number, w = region.w, h = region.h): void {
    this.atlas.draw(
      this.ctx,
      region,
      Math.round(x + (TILE - w) / 2),
      Math.round(y + TILE - h + 2),
      w,
      h,
    );
  }

  /**
   * Moves the drawn hero toward the logical position; snaps on map change.
   * Returns whether the hero is visibly walking.
   */
  private glide(state: GameState, map: MapDef, dtMs: number): boolean {
    if (state.mapId !== this.lastMap) {
      this.lastMap = state.mapId;
      this.props = planObjects(map);
      this.heroX = state.x;
      this.heroY = state.y;
      return false;
    }
    const maxStep = (GLIDE_SPEED * dtMs) / 1000;
    const dx = state.x - this.heroX;
    const dy = state.y - this.heroY;
    this.heroX += clamp(dx, -maxStep, maxStep);
    this.heroY += clamp(dy, -maxStep, maxStep);
    return Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
  }
}

/** Resolves a data sprite key, failing loudly on typos (the data tests also check these). */
function spriteOf(key: string) {
  if (!isCreatureId(key)) throw new Error(`Unknown sprite "${key}"`);
  return key;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Keeps the camera inside the map, centring maps smaller than the view. */
function clampCamera(target: number, mapSize: number, viewSize: number): number {
  if (mapSize <= viewSize) return (mapSize - viewSize) / 2;
  return clamp(target, 0, mapSize - viewSize);
}
