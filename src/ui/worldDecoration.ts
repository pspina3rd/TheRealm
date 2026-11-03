/** Authored world feedback art shared by the web renderer and native asset exporter. */
import type { EncounterProp } from './worldFeedback';
import { TILE } from './art/themes';

/** Draws one outcome prop at a supplied pixel origin; it never changes encounter state. */
export function drawEncounterProp(
  ctx: CanvasRenderingContext2D,
  prop: EncounterProp,
  x: number,
  y: number,
  timeMs: number,
): void {
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
