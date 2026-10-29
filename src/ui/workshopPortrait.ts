/** Present the existing Slime sprite at encounter scale, trimming transparent sheet padding. */
import type { Atlas } from './art/atlas';
import { battleFrame } from './art/creatures';
import { el } from './dom';
export function workshopPortrait(atlas: Atlas): HTMLCanvasElement {
  const canvas = el('canvas', { className: 'opponent-portrait' });
  canvas.width = canvas.height = 144;
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const frames = new Map<number, HTMLCanvasElement>();
  const draw = (time: number): void => {
    if (time && !canvas.isConnected) return;
    const region = battleFrame('enemy.slime', time);
    let image = frames.get(region.x);
    if (!image) {
      const source = document.createElement('canvas');
      source.width = region.w;
      source.height = region.h;
      const sourceCtx = source.getContext('2d');
      if (!sourceCtx) return;
      atlas.draw(sourceCtx, region, 0, 0);
      const pixels = sourceCtx.getImageData(0, 0, region.w, region.h).data;
      let left = region.w,
        top = region.h,
        right = -1,
        bottom = -1;
      for (let y = 0; y < region.h; y++)
        for (let x = 0; x < region.w; x++) {
          if ((pixels[(y * region.w + x) * 4 + 3] ?? 0) > 16) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
      image = document.createElement('canvas');
      image.width = Math.max(1, right - left + 1);
      image.height = Math.max(1, bottom - top + 1);
      image
        .getContext('2d')
        ?.drawImage(source, left, top, image.width, image.height, 0, 0, image.width, image.height);
      frames.set(region.x, image);
    }
    ctx.clearRect(0, 0, 144, 144);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0005';
    ctx.beginPath();
    ctx.ellipse(72, 124, 53, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    const scale = Math.max(1, Math.floor(120 / Math.max(image.width, image.height)));
    ctx.drawImage(
      image,
      Math.round((144 - image.width * scale) / 2),
      122 - image.height * scale,
      image.width * scale,
      image.height * scale,
    );
    requestAnimationFrame(draw);
  };
  draw(0);
  return canvas;
}
