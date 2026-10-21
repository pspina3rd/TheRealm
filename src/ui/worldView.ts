import { ENEMIES } from '../data/enemies';
import { NPCS } from '../data/npcs';
import { mapHeight, mapWidth, tileAt } from '../world/map';
import { activeEntities, currentMap, type GameState } from '../world/state';
import { drawMonster, drawPerson, drawTile } from './placeholders';
import type { SpriteRegistry } from './sprites';

export const TILE_SIZE = 32;
/** Tiles per second the hero sprite glides between grid positions. */
const GLIDE_SPEED = 12;

/** Draws the current map, entities and hero, with a camera that follows the hero. */
export class WorldView {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly sprites: SpriteRegistry;
  /** Smoothed hero position in tiles, for gliding between steps. */
  private heroX = 0;
  private heroY = 0;
  private lastMap = '';

  constructor(canvas: HTMLCanvasElement, sprites: SpriteRegistry) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not supported');
    this.ctx = ctx;
    this.sprites = sprites;
  }

  render(state: GameState, dtMs: number, timeMs: number): void {
    this.glide(state, dtMs);
    const { ctx } = this;
    const map = currentMap(state);
    const viewW = ctx.canvas.width;
    const viewH = ctx.canvas.height;
    const camX = clampCamera(
      this.heroX * TILE_SIZE + TILE_SIZE / 2 - viewW / 2,
      mapWidth(map) * TILE_SIZE,
      viewW,
    );
    const camY = clampCamera(
      this.heroY * TILE_SIZE + TILE_SIZE / 2 - viewH / 2,
      mapHeight(map) * TILE_SIZE,
      viewH,
    );

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, viewW, viewH);

    const firstX = Math.floor(camX / TILE_SIZE);
    const firstY = Math.floor(camY / TILE_SIZE);
    for (let ty = firstY; ty <= firstY + Math.ceil(viewH / TILE_SIZE); ty++) {
      for (let tx = firstX; tx <= firstX + Math.ceil(viewW / TILE_SIZE); tx++) {
        const tile = tileAt(map, tx, ty);
        const px = Math.round(tx * TILE_SIZE - camX);
        const py = Math.round(ty * TILE_SIZE - camY);
        if (!this.sprites.draw(ctx, tile.sprite, px, py, TILE_SIZE, TILE_SIZE, timeMs)) {
          drawTile(ctx, tile, px, py, TILE_SIZE, timeMs);
        }
      }
    }

    for (const entity of activeEntities(state)) {
      const px = Math.round(entity.x * TILE_SIZE - camX);
      const py = Math.round(entity.y * TILE_SIZE - camY);
      if (entity.kind === 'monster') {
        const key = ENEMIES[entity.enemyId]?.sprite ?? '';
        if (!this.sprites.draw(ctx, key, px, py, TILE_SIZE, TILE_SIZE, timeMs)) {
          drawMonster(ctx, key, px, py, TILE_SIZE, timeMs);
        }
        if (entity.boss) this.drawMarker(px, py, '#ff7c9b');
      } else {
        const key = NPCS[entity.npcId]?.sprite ?? '';
        if (!this.sprites.draw(ctx, key, px, py, TILE_SIZE, TILE_SIZE, timeMs)) {
          drawPerson(ctx, key, px, py, TILE_SIZE);
        }
      }
    }

    const hx = Math.round(this.heroX * TILE_SIZE - camX);
    const hy = Math.round(this.heroY * TILE_SIZE - camY);
    const heroKey = `hero.${state.facing}`;
    if (!this.sprites.draw(ctx, heroKey, hx, hy, TILE_SIZE, TILE_SIZE, timeMs)) {
      drawPerson(ctx, 'hero', hx, hy, TILE_SIZE);
    }
  }

  /** Moves the drawn hero toward the logical position; snaps on map change. */
  private glide(state: GameState, dtMs: number): void {
    if (state.mapId !== this.lastMap) {
      this.lastMap = state.mapId;
      this.heroX = state.x;
      this.heroY = state.y;
      return;
    }
    const maxStep = (GLIDE_SPEED * dtMs) / 1000;
    this.heroX += clamp(state.x - this.heroX, -maxStep, maxStep);
    this.heroY += clamp(state.y - this.heroY, -maxStep, maxStep);
  }

  private drawMarker(px: number, py: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(px + 13, py - 6, 6, 6);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Keeps the camera inside the map, centring maps smaller than the view. */
function clampCamera(target: number, mapSize: number, viewSize: number): number {
  if (mapSize <= viewSize) return (mapSize - viewSize) / 2;
  return clamp(target, 0, mapSize - viewSize);
}
