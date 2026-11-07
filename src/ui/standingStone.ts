/** The standing mana crystals of Sevenstones, drawn the same way on the overworld and in story scenes. */
import { TILE } from './art/themes';

/**
 * Draws one standing stone with its base at (px, py). `light` runs from 0 (dark: a dull, half
 * transparent crystal) to 1 (lit: solid, with a pulsing glow on the ground around it).
 */
export function drawStandingStone(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  color: string,
  light: number,
  timeMs: number,
): void {
  ctx.save();
  if (light > 0) {
    ctx.globalAlpha = light * (0.5 + 0.25 * Math.sin(timeMs / 300));
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(px, py - 4, TILE * 0.6, TILE * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.45 + 0.55 * light;
  ctx.fillStyle = color;
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
}
