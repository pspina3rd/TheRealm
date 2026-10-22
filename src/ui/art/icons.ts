/**
 * Pixel-art icons drawn in code, in the same chunky style as the ElvGames
 * sprites. Each icon is a 12×12 grid of palette letters:
 *   . transparent   o outline   d dark   b base   h highlight   w white
 * Colours come from the icon's palette, so one shape can be recoloured.
 */
import type { Element } from '../../core/elements';

export const ICON_SIZE = 12;

export interface IconPalette {
  readonly o: string;
  readonly d: string;
  readonly b: string;
  readonly h: string;
  readonly w: string;
}

export interface IconDef {
  readonly rows: readonly string[];
  readonly palette: IconPalette;
}

const palette = (d: string, b: string, h: string, o = '#1a1424', w = '#ffffff'): IconPalette => ({
  o,
  d,
  b,
  h,
  w,
});

// prettier-ignore
export const ICONS = {
  fire: {
    palette: palette('#c2301f', '#ff7b3a', '#ffd34d'),
    rows: [
      '.....o......',
      '....obo.....',
      '....obbo..o.',
      '...obhbo.obo',
      '..obhhbbobbo',
      '..obhhhbbbbo',
      '.obhhwhhbbbo',
      '.obhwwwhhbbo',
      '.obbhwwhhbdo',
      '..odbhhhbdo.',
      '...oddbbddo.',
      '....oooooo..',
    ],
  },
  water: {
    palette: palette('#2a4fb8', '#4f86ff', '#a8ccff'),
    rows: [
      '.....oo.....',
      '.....oo.....',
      '....obbo....',
      '....obbo....',
      '...obhbbo...',
      '...obhbbo...',
      '..obhwbbbo..',
      '..obhwbbbo..',
      '..obhbbbdo..',
      '..obbbbddo..',
      '...oddddo...',
      '....oooo....',
    ],
  },
  lightning: {
    palette: palette('#c58a10', '#ffd23f', '#fff4a8'),
    rows: [
      '......ooooo.',
      '.....obhhbo.',
      '....obhhbo..',
      '...obhhbo...',
      '..obhhbooooo',
      '.obhwwhhhbo.',
      '.ooooobhbo..',
      '....obhbo...',
      '...obhbo....',
      '...obbo.....',
      '..obdo......',
      '..ooo.......',
    ],
  },
  nature: {
    palette: palette('#1f8a3c', '#4fd36f', '#b4f5a0'),
    rows: [
      '.......oooo.',
      '.....oohhbo.',
      '....ohhwhbo.',
      '...ohhwhbbo.',
      '..ohhwhbbbo.',
      '..ohwhbbbdo.',
      '.ohwhbbbddo.',
      '.ohhbbbddo..',
      '.obbbddoo...',
      '.odddoo.....',
      'odoo........',
      'oo..........',
    ],
  },
  earth: {
    palette: palette('#8a4a1c', '#e0893a', '#ffc27a'),
    rows: [
      '............',
      '....oooo....',
      '...ohhhbo...',
      '..ohwhhbbo..',
      '.ohhhhbbbbo.',
      '.ohhhbbbbdo.',
      'ohhhbbbbbddo',
      'ohhbbbbbdddo',
      'obbbbbbdddo.',
      'odbbbbdddo..',
      '.oddddddo...',
      '..oooooo....',
    ],
  },
  arcane: {
    palette: palette('#5b2fa6', '#b07cff', '#e3ccff'),
    rows: [
      '...oooo.....',
      '..ohhbbo....',
      '.ohhboo...o.',
      '.ohbo....owo',
      'ohbo......o.',
      'ohbo........',
      'ohbo.....o..',
      'ohbbo...owo.',
      '.ohbbo...o..',
      '.odbbboooo..',
      '..oddbbbdo..',
      '...ooooooo..',
    ],
  },
  wind: {
    palette: palette('#1d8fa3', '#4fe0f0', '#c8fbff'),
    rows: [
      '......ooo...',
      '.....ohhbo..',
      '.....o..ho..',
      'ooooooo.ho..',
      'ohhhhhhhbo..',
      'oooooooooo..',
      '............',
      'oooooooooooo',
      'obbbbbbbbbbo',
      'oooooooo.bo.',
      '.......ohbo.',
      '........oo..',
    ],
  },
  ward: {
    palette: palette('#8a4a1c', '#e0893a', '#ffc27a'),
    rows: [
      'oooooooooooo',
      'ohhhhhbbbbdo',
      'ohwwhhbbbbdo',
      'ohwhhbbbbbdo',
      'ohhhbbbbbbdo',
      'ohhbbbbbbddo',
      '.ohbbbbbbdo.',
      '.ohbbbbbddo.',
      '..obbbbbdo..',
      '..obbbbddo..',
      '...obbddo...',
      '....oooo....',
    ],
  },
  heart: {
    palette: palette('#a8243c', '#ff5c7a', '#ffb3c2'),
    rows: [
      '............',
      '.ooo....ooo.',
      'ohhbo..ohbbo',
      'ohwhbooobbbo',
      'ohhhbbbbbbbo',
      'ohhbbbbbbbdo',
      '.obbbbbbbdo.',
      '..obbbbbdo..',
      '...obbbdo...',
      '....obdo....',
      '.....oo.....',
      '............',
    ],
  },
  haste: {
    palette: palette('#a8243c', '#ff5c7a', '#ffb3c2'),
    rows: [
      'oo......oo..',
      'obo....obo..',
      '.obo..obo...',
      '..obooobo...',
      '...obbbo....',
      '....obo.....',
      'oo...o..oo..',
      'obo....obo..',
      '.obo..obo...',
      '..obooobo...',
      '...obbbo....',
      '....obo.....',
    ],
  },
  potion: {
    palette: palette('#2a4fb8', '#4f86ff', '#a8ccff'),
    rows: [
      '....oooo....',
      '....owwo....',
      '....oddo....',
      '...oobboo...',
      '..ohhbbbbo..',
      '.ohwhbbbbdo.',
      '.ohhbbbbbdo.',
      '.ohbbbbbbdo.',
      '.obbbbbbddo.',
      '.odbbbbdddo.',
      '..oddddddo..',
      '...oooooo...',
    ],
  },
  weak: {
    palette: palette('#1f8a3c', '#4fd36f', '#b4f5a0'),
    rows: [
      '.....oo.....',
      '....ohbo....',
      '...ohhbbo...',
      '..ohhbbbbo..',
      '.ohhbbbbbbo.',
      'oooohbbdoooo',
      '...ohbbdo...',
      '...ohbbdo...',
      '...ohbbdo...',
      '...ohbbdo...',
      '...obbddo...',
      '...oooooo...',
    ],
  },
  resist: {
    palette: palette('#a8243c', '#ff5c7a', '#ffb3c2'),
    rows: [
      '...oooooo...',
      '...ohbbdo...',
      '...ohbbdo...',
      '...ohbbdo...',
      '...ohbbdo...',
      '...ohbbdo...',
      'oooohbbdoooo',
      '.ohhbbbbbdo.',
      '..ohbbbbdo..',
      '...ohbbdo...',
      '....obdo....',
      '.....oo.....',
    ],
  },
} as const satisfies Record<string, IconDef>;

export type IconId = keyof typeof ICONS;

/** The icon for each element. */
export const ELEMENT_ICONS: Readonly<Record<Element, IconId>> = {
  fire: 'fire',
  water: 'water',
  lightning: 'lightning',
  nature: 'nature',
  earth: 'earth',
  arcane: 'arcane',
  wind: 'wind',
};

/** The colour of each cell, or null for transparent, row by row. */
export function iconPixels(id: IconId, silhouette?: string): (string | null)[][] {
  const icon: IconDef = ICONS[id];
  return icon.rows.map((row) =>
    [...row].map((cell) => {
      if (cell === '.') return null;
      if (silhouette) return silhouette;
      return icon.palette[cell as keyof IconPalette];
    }),
  );
}
