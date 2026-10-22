/** Draws the hero's alignment star (see `art/alignmentStar.ts`) on a canvas. */
import { ELEMENTS, ELEMENT_NAMES, emptyCounts, type ElementCounts } from '../core/elements';
import { starSpikes } from './art/alignmentStar';
import { ELEMENT_COLOR_OF } from './art/feedback';
import { ELEMENT_ICONS, ICON_SIZE } from './art/icons';
import { drawIcon } from './iconDraw';

const SIZE = 168;
const RADIUS = 52;
const ICON_SCALE = 2;

/** A canvas showing one spike per element, as long as the hero's alignment in it. */
export function alignmentStar(alignment: Readonly<ElementCounts>): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.className = 'alignment-star';
  canvas.setAttribute('role', 'img');
  const summary = ELEMENTS.map((e) => `${ELEMENT_NAMES[e]} ${alignment[e]}`).join(', ');
  canvas.setAttribute('aria-label', `Alignment: ${summary}`);
  canvas.title = summary;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const spikes = starSpikes(alignment, { cx: SIZE / 2, cy: SIZE / 2, radius: RADIUS });

  // Faint full-length outline so short spikes read as "room to grow".
  const full = starSpikes(emptyCounts(1), {
    cx: SIZE / 2,
    cy: SIZE / 2,
    radius: RADIUS,
    fullScale: 1,
  });
  ctx.strokeStyle = '#ffffff22';
  ctx.lineWidth = 1;
  for (const { tip, left, right } of full) {
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();
  }

  for (const { element, value, tip, left, right, label } of spikes) {
    ctx.fillStyle = value > 0 ? ELEMENT_COLOR_OF[element] : '#3a3f5c';
    ctx.beginPath();
    ctx.moveTo(SIZE / 2, SIZE / 2);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.fill();
    const half = (ICON_SIZE * ICON_SCALE) / 2;
    drawIcon(ctx, ELEMENT_ICONS[element], label.x - half, label.y - half, {
      scale: ICON_SCALE,
      alpha: value > 0 ? 1 : 0.35,
    });
  }
  return canvas;
}
