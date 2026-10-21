/** Drawing for the falling-block board's crystals. */
import type { CrystalColor } from '../core/pieces';

export const CRYSTAL_HEX: Readonly<Record<CrystalColor | 'stone', string>> = {
  cyan: '#61d9e8',
  gold: '#f6d365',
  violet: '#bd91ff',
  green: '#72e6a2',
  red: '#ff7c9b',
  blue: '#7296ff',
  orange: '#ffad69',
  stone: '#6b6577',
};

/** Draws one board crystal with a highlight. */
export function drawCrystal(
  ctx: CanvasRenderingContext2D,
  color: CrystalColor | 'stone',
  x: number,
  y: number,
  size: number,
  alpha = 1,
): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = CRYSTAL_HEX[color];
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  ctx.fillStyle = '#ffffff35';
  ctx.fillRect(x + 3, y + 3, size - 6, 4);
  ctx.globalAlpha = 1;
}
