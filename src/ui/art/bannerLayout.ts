/**
 * How a battle banner's line is laid out on the canvas: its words, with
 * `*stage directions*` in an italic font, wrapped onto rows that fit the
 * width, in the largest font whose rows fit the stage's height.
 */
import { parseStage } from '../../game/lines';

export interface BannerWord {
  readonly kind: 'speech' | 'stage';
  readonly text: string;
  /** Canvas font to draw it with. */
  readonly font: string;
  readonly w: number;
}

export interface BannerLayout {
  readonly rows: readonly { readonly words: readonly BannerWord[]; readonly w: number }[];
  /** Pixels from one row's baseline to the next. */
  readonly step: number;
  /** The box's height. */
  readonly height: number;
}

/** Font sizes tried, largest first. */
const SIZES = [16, 13, 11] as const;

/** The font for a run of speech or narration at `size`. */
export function bannerFont(kind: 'speech' | 'stage', size: number): string {
  return kind === 'stage' ? `italic ${size - 1}px system-ui` : `bold ${size}px system-ui`;
}

/**
 * Lays out `text` for a stage `width` × `height`, measuring with `measure`
 * (the canvas's `measureText` in the game). Rows hold `width - 32` pixels.
 */
export function layOutBanner(
  text: string,
  measure: (text: string, font: string) => number,
  width: number,
  height: number,
): BannerLayout {
  const beats = parseStage(text);
  const layOut = (size: number): BannerLayout => {
    const words = beats.flatMap((beat) =>
      beat.text
        .split(/(?<=\s)/)
        .filter((w) => w.length > 0)
        .map((part): BannerWord => {
          const font = bannerFont(beat.kind, size);
          return { kind: beat.kind, text: part, font, w: measure(part, font) };
        }),
    );
    const rows: { words: BannerWord[]; w: number }[] = [];
    for (const word of words) {
      const row = rows.at(-1);
      if (row && row.w + word.w <= width - 32) {
        row.words.push(word);
        row.w += word.w;
      } else rows.push({ words: [word], w: word.w });
    }
    const step = Math.round(size * 1.25);
    return { rows, step, height: 10 + step * Math.max(1, rows.length) };
  };
  return SIZES.map(layOut).find((l) => l.height <= height - 4) ?? layOut(SIZES[2]);
}
