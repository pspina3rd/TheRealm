/** The standing stones of Sevenstones, drawn the same way on the overworld and in story scenes. */
import { STONE_ORDER, type StoneElement } from '../game/cinematic';
import type { Atlas } from './art/atlas';
import { ELEMENT_COLOR_OF } from './art/feedback';

/** Each stone's cell in the `story.stones` sheet; the stone stands on the cell's bottom edge. */
const STONE_W = 80;
const STONE_H = 80;

/**
 * Draws one stone, a boulder with crystals of its colour growing out of it, with its base at
 * (px, py). `light` runs from 0 (dark crystals) to 1 (lit crystals with a pulsing glow).
 */
export function drawStandingStone(
  ctx: CanvasRenderingContext2D,
  atlas: Atlas,
  px: number,
  py: number,
  element: StoneElement,
  light: number,
  timeMs: number,
): void {
  const column = STONE_ORDER.indexOf(element);
  const x = Math.round(px - STONE_W / 2);
  const y = Math.round(py - STONE_H);
  ctx.save();
  if (light > 0) {
    ctx.globalAlpha = light * (0.45 + 0.2 * Math.sin(timeMs / 300));
    ctx.fillStyle = ELEMENT_COLOR_OF[element];
    ctx.beginPath();
    ctx.ellipse(px, py - 8, 34, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const cell = (row: number) =>
    ({
      image: 'story.stones',
      x: column * STONE_W,
      y: row * STONE_H,
      w: STONE_W,
      h: STONE_H,
    }) as const;
  atlas.draw(ctx, cell(1), x, y);
  if (light > 0) {
    ctx.globalAlpha = light;
    atlas.draw(ctx, cell(0), x, y);
  }
  ctx.restore();
}
