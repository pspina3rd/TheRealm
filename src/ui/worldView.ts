import type { Element } from '../core/elements';
import { regionFixed } from '../game/encounterFlow';
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
import { encounterProps, groveStone, type EncounterProp } from './worldFeedback';
import { TILE, backgroundFor, planGround, planObjects, type PlacedObject } from './art/themes';

/**
 * The Sevenstones' ring of standing crystals on the hub map, one per
 * element, and the region whose mending brightens each.
 */
const STANDING_STONES: readonly {
  readonly element: Element;
  readonly region: string | null;
  readonly x: number;
  readonly y: number;
}[] = [
  { element: 'nature', region: 'grove', x: 31, y: 16 },
  { element: 'water', region: 'lake', x: 33, y: 15 },
  { element: 'earth', region: 'quarry', x: 35, y: 16 },
  { element: 'fire', region: 'forge', x: 36, y: 18 },
  { element: 'lightning', region: 'peaks', x: 35, y: 20 },
  { element: 'wind', region: 'cliffs', x: 31, y: 20 },
  { element: 'arcane', region: 'ruins', x: 30, y: 18 },
];

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
    const feedback = encounterProps(state, map);
    for (const prop of feedback) {
      drawables.push({
        sortY: (prop.y + 1) * TILE - 0.5,
        draw: () => this.drawEncounterProp(prop, camX, camY, timeMs),
      });
    }
    const stone = groveStone(state, map.id);
    if (stone) this.drawStandingStones(state, camX, camY, timeMs);
    const description = [...feedback.map((prop) => prop.text), ...(stone ? [stone.text] : [])].join(
      '. ',
    );
    if (ctx.canvas.title !== description) ctx.canvas.title = description;
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

  /** Small, distinct prop swaps beside the people whose encounters changed them. */
  private drawEncounterProp(prop: EncounterProp, camX: number, camY: number, timeMs: number): void {
    const { ctx } = this;
    const x = prop.x * TILE - camX;
    const y = prop.y * TILE - camY;
    const color = prop.color;
    ctx.save();
    ctx.fillStyle = '#242637';
    ctx.fillRect(x + 2, y + 14, TILE - 4, 12);
    ctx.fillStyle = color;
    switch (prop.skin) {
      case 'well':
        ctx.fillStyle = '#767d90';
        ctx.fillRect(x + 3, y + 9, 26, 17);
        ctx.fillStyle = color;
        ctx.fillRect(x + 7, y + 11, 18, 8);
        if (!prop.won) {
          ctx.fillRect(x + 3, y + 4, 4, 14);
          ctx.fillRect(x + 23, y + 7, 6, 16);
        }
        break;
      case 'tower': {
        const lean = prop.won ? 0 : 4;
        for (let row = 0; row < 3; row++) {
          ctx.fillRect(x + 8 + row * lean, y + 16 - row * 6, 14, 5);
        }
        ctx.save();
        ctx.translate(x + 15 + lean * 2, y + 2);
        ctx.rotate(prop.won ? timeMs / 600 : 0.5);
        ctx.fillRect(-8, -2, 16, 4);
        ctx.fillRect(-2, -8, 4, 16);
        ctx.restore();
        break;
      }
      case 'beds':
        ctx.fillStyle = '#624b3e';
        ctx.fillRect(x, y + 10, 32, 16);
        ctx.fillStyle = color;
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 4; col++) {
            ctx.fillRect(x + col * 8 + 2, y + row * 7 + 12, 5, prop.won ? 3 : 1);
            if (prop.won) ctx.fillRect(x + col * 8 + 4, y + row * 7 + 9, 2, 5);
          }
        }
        break;
      case 'stall':
        ctx.fillStyle = '#b89361';
        ctx.fillRect(x + 3, y + 3, 26, 24);
        ctx.fillStyle = '#202635';
        ctx.fillRect(x + 5, y + 5, 22, 18);
        ctx.fillStyle = color;
        for (let row = 0; row < 3; row++) {
          ctx.fillRect(x + 8, y + 8 + row * 5, 6, 2);
          ctx.fillRect(x + 18, y + 8 + row * 5, prop.won ? 4 : 7, 2);
        }
        break;
      case 'ring':
        if (prop.won) {
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const cx = x + 16 + Math.cos(angle) * 10;
            const cy = y + 16 + Math.sin(angle) * 6;
            ctx.fillStyle = '#d9cab4';
            ctx.fillRect(cx, cy, 2, 5);
            ctx.fillStyle = color;
            ctx.fillRect(cx - 2, cy - 1, 6, 3);
          }
        } else {
          ctx.beginPath();
          ctx.ellipse(x + 16, y + 18, 14, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'lamps':
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = '#778095';
          ctx.fillRect(x + i * 8 + 2, y + 13, 3, 13);
          ctx.fillStyle = color;
          const flicker = prop.won ? 0 : Math.round(Math.sin(timeMs / 90 + i) * 2);
          ctx.fillRect(x + i * 8 + 1, y + 8 + flicker, 5, prop.won ? 7 : 3);
        }
        break;
    }
    ctx.restore();
  }

  /**
   * The Sevenstones (§4): seven standing mana crystals in a ring, one per
   * element, dim while the Moon Wyrm drains them; a region set right
   * brightens its stone (M1: the grove's green stone, once Wren's ring is saved).
   */
  private drawStandingStones(state: GameState, camX: number, camY: number, timeMs: number): void {
    const { ctx } = this;
    STANDING_STONES.forEach(({ element, region, x, y }) => {
      const nature = element === 'nature' ? groveStone(state, 'overworld') : null;
      const bright = nature ? nature.light > 0 : region !== null && regionFixed(state, region);
      const px = x * TILE - camX + TILE / 2;
      const py = y * TILE - camY + TILE;
      ctx.save();
      if (bright) {
        ctx.globalAlpha = 0.5 + 0.25 * Math.sin(timeMs / 300);
        ctx.fillStyle = ELEMENT_COLOR_OF[element];
        ctx.beginPath();
        ctx.ellipse(px, py - 4, TILE * 0.6, TILE * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = bright ? 1 : 0.45;
      ctx.fillStyle = ELEMENT_COLOR_OF[element];
      ctx.beginPath();
      ctx.moveTo(px - 7, py - 2);
      ctx.lineTo(px - 5, py - 30);
      ctx.lineTo(px, py - 38);
      ctx.lineTo(px + 5, py - 30);
      ctx.lineTo(px + 7, py - 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1a1a26';
      ctx.stroke();
      ctx.restore();
    });
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
