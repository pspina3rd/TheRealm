/** Shared pixel-art block faces, cached so the board can animate cheaply. */
import type { CrystalColor } from '../core/pieces';
export const CRYSTAL_HEX: Readonly<Record<CrystalColor | 'stone' | 'neutral', string>> = {
  cyan: '#61d9e8',
  gold: '#f6d365',
  violet: '#bd91ff',
  green: '#72e6a2',
  red: '#ff7c9b',
  blue: '#7296ff',
  orange: '#ffad69',
  stone: '#6b6577',
  neutral: '#b8c1cb',
};
const tiles = new Map<string, HTMLCanvasElement>();
function tone(hex: string, amount: number): string {
  const target = amount > 0 ? 255 : 0,
    weight = Math.abs(amount);
  return `rgb(${[1, 3, 5].map((at) => Math.round(parseInt(hex.slice(at, at + 2), 16) * (1 - weight) + target * weight)).join(',')})`;
}
function face(
  ctx: CanvasRenderingContext2D,
  points: readonly (readonly [number, number])[],
  color: string,
  size: number,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    const px = Math.round((x * size) / 30),
      py = Math.round((y * size) / 30);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();
}
function tile(
  color: CrystalColor | 'stone' | 'neutral',
  size: number,
  strength = 0,
): HTMLCanvasElement {
  const key = `${color}:${size}:${strength}`,
    cached = tiles.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.max(1, Math.round(size));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not supported');
  ctx.imageSmoothingEnabled = false;
  const base = CRYSTAL_HEX[color],
    stone = color === 'stone',
    neutral = color === 'neutral';
  const outer = [
    [5, 1],
    [25, 1],
    [29, 5],
    [29, 25],
    [25, 29],
    [5, 29],
    [1, 25],
    [1, 5],
  ] as const;
  face(ctx, outer, tone(base, -0.72), size);
  if (stone) {
    const lift = strength === 3 ? 0.28 : strength === 2 ? 0.1 : strength === 1 ? -0.12 : 0;
    face(
      ctx,
      [
        [5, 3],
        [24, 3],
        [27, 6],
        [27, 24],
        [24, 27],
        [6, 27],
        [3, 24],
        [3, 6],
      ],
      tone(base, lift),
      size,
    );
    face(
      ctx,
      [
        [5, 3],
        [24, 3],
        [21, 7],
        [8, 7],
        [3, 13],
        [3, 6],
      ],
      tone(base, Math.min(0.5, lift + 0.2)),
      size,
    );
    face(
      ctx,
      [
        [27, 8],
        [27, 24],
        [24, 27],
        [7, 27],
        [10, 23],
        [23, 22],
      ],
      tone(base, -0.35),
      size,
    );
    const k = size / 30;
    ctx.fillStyle = tone(base, -0.2);
    for (const [x, y] of [
      [8, 11],
      [20, 8],
      [23, 17],
      [9, 22],
    ] as const)
      ctx.fillRect(
        Math.round(x * k),
        Math.round(y * k),
        Math.max(1, Math.round(2 * k)),
        Math.max(1, Math.round(k)),
      );
    ctx.strokeStyle = tone(base, -0.6);
    ctx.lineWidth = Math.max(1, Math.round(k));
    ctx.beginPath();
    ctx.moveTo(12 * k, 4 * k);
    ctx.lineTo(10 * k, 10 * k);
    ctx.lineTo(14 * k, 13 * k);
    if (strength <= 2) {
      ctx.lineTo(11 * k, 20 * k);
      ctx.lineTo(7 * k, 24 * k);
    }
    if (strength === 1) {
      ctx.moveTo(14 * k, 13 * k);
      ctx.lineTo(22 * k, 18 * k);
      ctx.lineTo(25 * k, 24 * k);
    }
    ctx.stroke();
  } else {
    face(
      ctx,
      [
        [5, 3],
        [25, 3],
        [27, 5],
        [27, 25],
        [25, 27],
        [5, 27],
        [3, 25],
        [3, 5],
      ],
      base,
      size,
    );
    face(
      ctx,
      [
        [5, 3],
        [25, 3],
        [21, 8],
        [9, 8],
        [3, 14],
        [3, 5],
      ],
      tone(base, neutral ? 0.5 : 0.52),
      size,
    );
    face(
      ctx,
      [
        [25, 3],
        [27, 5],
        [27, 25],
        [22, 21],
        [22, 9],
      ],
      tone(base, -0.26),
      size,
    );
    face(
      ctx,
      [
        [5, 27],
        [25, 27],
        [27, 25],
        [21, 21],
        [9, 21],
        [3, 25],
      ],
      tone(base, -0.46),
      size,
    );
    face(
      ctx,
      [
        [3, 14],
        [9, 8],
        [9, 21],
        [5, 25],
        [3, 25],
      ],
      tone(base, 0.12),
      size,
    );
    face(
      ctx,
      [
        [9, 8],
        [21, 8],
        [22, 21],
        [9, 21],
      ],
      neutral ? tone(base, 0.15) : base,
      size,
    );
    face(
      ctx,
      [
        [9, 8],
        [21, 8],
        [14, 13],
        [9, 18],
      ],
      tone(base, neutral ? 0.32 : 0.2),
      size,
    );
    const k = size / 30;
    ctx.fillStyle = tone(base, 0.8);
    ctx.fillRect(
      Math.round(7 * k),
      Math.round(4 * k),
      Math.max(1, Math.round(7 * k)),
      Math.max(1, Math.round(2 * k)),
    );
    if (neutral) {
      ctx.strokeStyle = tone(base, -0.2);
      ctx.lineWidth = 1;
      ctx.strokeRect(
        Math.round(12 * k) + 0.5,
        Math.round(12 * k) + 0.5,
        Math.max(2, Math.round(5 * k)),
        Math.max(2, Math.round(5 * k)),
      );
    }
  }
  tiles.set(key, canvas);
  return canvas;
}
export function drawCrystal(
  ctx: CanvasRenderingContext2D,
  color: CrystalColor | 'stone' | 'neutral',
  x: number,
  y: number,
  size: number,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tile(color, size), x, y, size, size);
  ctx.restore();
}
export function drawObstructionStone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  strength: number,
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tile('stone', size, strength), x, y, size, size);
  ctx.restore();
}
