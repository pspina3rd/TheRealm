/**
 * Geometry for the alignment star: a seven-pointed star with one spike per
 * element, each as long as the hero's alignment in it. Pure maths so it can
 * be tested; `src/ui/alignmentStarView.ts` draws it.
 */
import { ELEMENTS, type Element, type ElementCounts } from '../../core/elements';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** One spike: a triangle from two base points on the inner ring out to its tip. */
export interface StarSpike {
  readonly element: Element;
  readonly value: number;
  readonly tip: Point;
  readonly left: Point;
  readonly right: Point;
  /** Where the element's icon sits, just past the longest possible spike. */
  readonly label: Point;
}

export interface StarLayout {
  readonly cx: number;
  readonly cy: number;
  /** Length of a full-scale spike from the centre. */
  readonly radius: number;
  /** Alignment drawn at full length; grows if the hero passes it. */
  readonly fullScale?: number;
  /** Gap between the spike area and the icons. */
  readonly labelGap?: number;
}

/** Fraction of the radius taken by the inner ring the spikes grow from. */
export const INNER_RING = 0.2;
/** Default alignment that fills a spike. */
export const DEFAULT_FULL_SCALE = 4;

function polar(cx: number, cy: number, r: number, angle: number): Point {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

/** The seven spikes, starting at the top and going clockwise in `ELEMENTS` order. */
export function starSpikes(alignment: Readonly<ElementCounts>, layout: StarLayout): StarSpike[] {
  const { cx, cy, radius, labelGap = 14 } = layout;
  const scale = Math.max(
    layout.fullScale ?? DEFAULT_FULL_SCALE,
    ...ELEMENTS.map((e) => alignment[e]),
  );
  const inner = radius * INNER_RING;
  const step = (2 * Math.PI) / ELEMENTS.length;
  return ELEMENTS.map((element, i) => {
    const angle = -Math.PI / 2 + i * step;
    const value = alignment[element];
    const length = inner + (radius - inner) * (Math.max(0, value) / scale);
    return {
      element,
      value,
      tip: polar(cx, cy, length, angle),
      left: polar(cx, cy, inner, angle - step / 2),
      right: polar(cx, cy, inner, angle + step / 2),
      label: polar(cx, cy, radius + labelGap, angle),
    };
  });
}
