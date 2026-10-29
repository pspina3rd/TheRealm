/** Renders the pixel icons in `art/icons.ts` to canvas, crisply, with caching. */
import { ICON_SIZE, iconPixels, type IconId, type IconPalette, type IconSpec } from './art/icons';

const cache = new Map<string, HTMLCanvasElement>();

/** The icon at 1× scale, optionally as a one-colour silhouette. */
function iconImage(id: IconId, silhouette?: string, recolour?: IconPalette): HTMLCanvasElement {
  const key = `${id}|${silhouette ?? ''}|${recolour ? Object.values(recolour).join() : ''}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    iconPixels(id, silhouette, recolour).forEach((row, y) =>
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
  readonly palette?: IconPalette;
}

/** Draws an icon with its top-left at (x, y). */
export function drawIcon(
  ctx: CanvasRenderingContext2D,
  id: IconId,
  x: number,
  y: number,
  { scale = 2, alpha = 1, silhouette, palette }: IconOptions = {},
): void {
  const size = ICON_SIZE * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= alpha;
  ctx.drawImage(iconImage(id, silhouette, palette), Math.round(x), Math.round(y), size, size);
  ctx.restore();
}

/** Draws an icon spec: the shape (recoloured if given) with its badge at half size in the corner. */
export function drawIconSpec(
  ctx: CanvasRenderingContext2D,
  spec: IconSpec,
  x: number,
  y: number,
  scale = 2,
): void {
  drawIcon(ctx, spec.icon, x, y, { scale, ...(spec.palette ? { palette: spec.palette } : {}) });
  if (spec.badge && scale >= 2) {
    const badgeScale = Math.max(1, Math.floor(scale / 2));
    const offset = ICON_SIZE * scale - ICON_SIZE * badgeScale;
    drawIcon(ctx, spec.badge, x + offset, y + offset, { scale: badgeScale });
  }
}

/** A standalone canvas element showing an icon (or icon spec), for use in HTML. */
export function iconElement(icon: IconId | IconSpec, scale = 2, label?: string): HTMLCanvasElement {
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
  if (ctx) drawIconSpec(ctx, typeof icon === 'string' ? { icon } : icon, 0, 0, scale);
  return canvas;
}
