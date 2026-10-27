import { describe, expect, it } from 'vitest';
import { bannerFont, layOutBanner } from '../src/ui/art/bannerLayout';

/** A stand-in for the canvas: every character is half the font size wide. */
const measure = (text: string, font: string): number =>
  (text.length * Number(/(\d+)px/.exec(font)?.[1] ?? 0)) / 2;

describe('battle banner layout', () => {
  it('draws stage directions in the italic font and speech in bold', () => {
    const layout = layOutBanner('*Vesper bows.* "Go."', measure, 600, 200);
    const words = layout.rows.flatMap((row) => row.words);
    expect(words.map((w) => [w.kind, w.text, w.font])).toEqual([
      ['stage', 'Vesper ', bannerFont('stage', 16)],
      ['stage', 'bows.', 'italic 15px system-ui'],
      ['speech', ' ', 'bold 16px system-ui'],
      ['speech', '"Go."', 'bold 16px system-ui'],
    ]);
    expect(layout.rows).toHaveLength(1);
    expect(layout.height).toBe(30);
  });

  it('wraps a long line onto rows that fit the width', () => {
    const text = 'Work from the outside in. If you smash the center clusters first.';
    const layout = layOutBanner(text, measure, 200, 400);
    expect(layout.rows.length).toBeGreaterThan(1);
    for (const row of layout.rows) expect(row.w).toBeLessThanOrEqual(200 - 32);
    expect(layout.rows.flatMap((r) => r.words.map((w) => w.text)).join('')).toBe(text);
  });

  it('shrinks the font on a short stage, down to the smallest', () => {
    const text = 'Work from the outside in. If you smash the center clusters first.';
    expect(layOutBanner(text, measure, 300, 400).step).toBe(20);
    expect(layOutBanner(text, measure, 300, 50).step).toBe(16);
    expect(layOutBanner(text, measure, 300, 10).step).toBe(14);
    expect(layOutBanner('', measure, 300, 100).height).toBe(30);
  });
});
