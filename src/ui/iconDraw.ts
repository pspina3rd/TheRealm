/** Renders the pixel icons in `art/icons.ts` to canvas, crisply, with caching. */
import { ICON_SIZE, iconPixels, type IconId } from './art/icons';

const cache = new Map<string, HTMLCanvasElement>();

/** The icon at 1× scale, optionally as a one-colour silhouette. */
function iconImage(id: IconId, silhouette?: string): HTMLCanvasElement {
  const key = `${id}|${silhouette ?? ''}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    iconPixels(id, silhouette).forEach((row, y) =>
      row.forEach((color, x) => {
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }),
    );
  }
  cache.set(key, canvas);
  return canvas;
}

export interface IconOptions {
  readonly scale?: number;
  readonly alpha?: number;
  /** Draw the shape in a single colour (used for the glyphs on crystals). */
  readonly silhouette?: string;
}

/** Draws an icon with its top-left at (x, y). */
export function drawIcon(
  ctx: CanvasRenderingContext2D,
  id: IconId,
  x: number,
  y: number,
  { scale = 2, alpha = 1, silhouette }: IconOptions = {},
): void {
  const size = ICON_SIZE * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= alpha;
  ctx.drawImage(iconImage(id, silhouette), Math.round(x), Math.round(y), size, size);
  ctx.restore();
}

/** A standalone canvas element showing an icon, for use in HTML. */
export function iconElement(id: IconId, scale = 2, label?: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE * scale;
  canvas.height = ICON_SIZE * scale;
  canvas.className = 'icon';
  if (label) {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
  } else {
    canvas.setAttribute('aria-hidden', 'true');
  }
  const ctx = canvas.getContext('2d');
  if (ctx) drawIcon(ctx, id, 0, 0, { scale });
  return canvas;
}
