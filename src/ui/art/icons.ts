/**
 * Pixel-art icons drawn in code, in the same chunky style as the ElvGames
 * sprites. Each icon is a 12×12 grid of palette letters:
 *   . transparent   o outline   d dark   b base   h highlight   w white
 * Colours come from the icon's palette, so one shape can be recoloured.
 */
import type { Element } from '../../core/elements';
import type { EnhancementId } from '../../data/spells';
import type { StatId } from '../../data/stats';
import type { EnemyMove, SpellEffect } from '../../data/types';

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
  sword: {
    palette: palette('#5b6a80', '#b9c6d8', '#ffffff'),
    rows: [
      '.........ooo',
      '........ohwo',
      '.......ohwbo',
      '......ohwbo.',
      '.....ohwbo..',
      '.oo.ohwbo...',
      '.odoohbo....',
      '..oddbo.....',
      '...oddo.....',
      '..oddodo....',
      '.oddo.oo....',
      '.ooo........',
    ],
  },
  armor: {
    palette: palette('#5b6a80', '#b9c6d8', '#ffffff'),
    rows: [
      '............',
      '.oo......oo.',
      'ohbo....obdo',
      'ohbbooooobdo',
      'ohhbbbbbbbdo',
      '.ohhbbbbbdo.',
      '.ohhbwbbbdo.',
      '.ohbbbbbbdo.',
      '.ohbbbbbbdo.',
      '.obbbbbbddo.',
      '.oddddddddo.',
      '.oooooooooo.',
    ],
  },
  robe: {
    palette: palette('#2a4fb8', '#4f86ff', '#a8ccff'),
    rows: [
      '....oooo....',
      '...ohhbbo...',
      '..ohhbbbbo..',
      '.ohhbbbbbbo.',
      'ohhbobbobbdo',
      'oooohbbbdooo',
      '...ohbbbdo..',
      '..ohhbbbbdo.',
      '..ohbbbbbdo.',
      '.ohhbbbbbbdo',
      '.obbbbbbbddo',
      '.oooooooooo.',
    ],
  },
  feather: {
    palette: palette('#c2301f', '#ff7b3a', '#ffd34d'),
    rows: [
      '.........oo.',
      '.......oohbo',
      '......ohhbbo',
      '.....ohhbbdo',
      '....ohhbbdo.',
      '...ohhbbdo..',
      '..ohhbbdo...',
      '..ohbbdo....',
      '.ohbddo.....',
      '.owoo.......',
      'ow..........',
      'o...........',
    ],
  },
  book: {
    palette: palette('#5a3520', '#9a5b3c', '#c98a5a'),
    rows: [
      '.oooooooooo.',
      'ohhhhhhhhbdo',
      'ohwbbbbbbbdo',
      'ohbbbbbbbbdo',
      'ohbbbbbbbbdo',
      'ohbbbbbbbbdo',
      'ohbbbbbbbbdo',
      'ohbbbbbbbbdo',
      'ohbbbbbbbbdo',
      'odddddddddwo',
      'owwwwwwwwwwo',
      '.oooooooooo.',
    ],
  },
  amulet: {
    palette: palette('#c58a10', '#ffd23f', '#fff4a8'),
    rows: [
      '.o........o.',
      '.o........o.',
      '..o......o..',
      '...o....o...',
      '....oooo....',
      '...ohhbbo...',
      '..ohwhbbbo..',
      '..ohhbbbdo..',
      '..ohbbbbdo..',
      '...obbddo...',
      '....oddo....',
      '.....oo.....',
    ],
  },
  mushroom: {
    palette: palette('#a8243c', '#ff5c7a', '#ffb3c2'),
    rows: [
      '....oooo....',
      '..oohhbboo..',
      '.ohhwhbbbbo.',
      'ohhbbbbwbbdo',
      'ohwbbbbbbbdo',
      'obbbbbbbbddo',
      'oooooooooooo',
      '...owwwwo...',
      '...owwwwo...',
      '...owwwwo...',
      '...owwwdo...',
      '....oooo....',
    ],
  },
  blob: {
    palette: palette('#1f8a3c', '#4fd36f', '#b4f5a0'),
    rows: [
      '............',
      '............',
      '.....oo.....',
      '....ohbo....',
      '...ohwbbo...',
      '..ohhbbbbo..',
      '.ohhbbbbbbo.',
      'ohhbbbbbbbdo',
      'ohbbbbbbbddo',
      'obbbbbbbdddo',
      'oddddddddddo',
      '.oooooooooo.',
    ],
  },
  shard: {
    palette: palette('#5b2fa6', '#b07cff', '#e3ccff'),
    rows: [
      '.....oo.....',
      '....ohwo....',
      '....ohbo....',
      '...ohwbbo...',
      '...ohhbbo...',
      '..ohhbbbdo..',
      '..ohhbbbdo..',
      '..ohbbbbdo..',
      '...ohbbdo...',
      '...ohbbdo...',
      '....obdo....',
      '.....oo.....',
    ],
  },
  fang: {
    palette: palette('#8a8072', '#d8d0c0', '#ffffff'),
    rows: [
      'o..........o',
      '.o........o.',
      '..oo....oo..',
      '....oooo....',
      '...owwwho...',
      '...owwwho...',
      '...owwhho...',
      '....owho....',
      '....owho....',
      '.....oho....',
      '.....oo.....',
      '............',
    ],
  },
  bed: {
    palette: palette('#a8243c', '#ff5c7a', '#ffb3c2'),
    rows: [
      '............',
      '............',
      'oo..........',
      'obo.........',
      'obooooooooo.',
      'obowwhhhhhho',
      'obowwbbbbbbo',
      'oboooooooooo',
      'obddddddddbo',
      'oboooooooobo',
      'obo......obo',
      'ooo......ooo',
    ],
  },
  herb: {
    palette: palette('#1f8a3c', '#4fd36f', '#b4f5a0'),
    rows: [
      '......oo....',
      '.....ohbo...',
      '..oo.ohbo...',
      '.ohbooboo...',
      '.ohhbobo.oo.',
      '..oobbo.ohbo',
      '....obooohbo',
      '....obobbbo.',
      '....obooo...',
      '....obo.....',
      '....obo.....',
      '....ooo.....',
    ],
  },
  coin: {
    palette: palette('#c58a10', '#ffd23f', '#fff4a8'),
    rows: [
      '....oooo....',
      '..oohhbboo..',
      '.ohwhhbbbdo.',
      '.ohhddddbdo.',
      'ohhdhhbbdbdo',
      'ohhdhbbbdbdo',
      'ohhdbbbbdbdo',
      'ohhdbbbddbdo',
      '.ohbddddbdo.',
      '.obbbbbbddo.',
      '..oodddddo..',
      '....oooo....',
    ],
  },
  star: {
    palette: palette('#c58a10', '#ffd23f', '#fff4a8'),
    rows: [
      '.....oo.....',
      '....ohbo....',
      '....ohbo....',
      'ooooohbboooo',
      'ohhhhwhbbbdo',
      '.ohhhhbbbdo.',
      '..ohhbbbdo..',
      '..ohhbbbdo..',
      '.ohhbodbbdo.',
      '.ohbo..obdo.',
      'ohdo....oddo',
      'ooo......ooo',
    ],
  },
  lock: {
    palette: palette('#8a8072', '#d8d0c0', '#ffffff'),
    rows: [
      '...oooooo...',
      '..ohhhhhbo..',
      '..oho..obo..',
      '..oho..obo..',
      '.oooooooooo.',
      'ohhhhhhhhbdo',
      'ohwhhoohhbdo',
      'ohhhhoohbbdo',
      'ohhhhoobbbdo',
      'ohbbbbbbbbdo',
      'oddddddddddo',
      '.oooooooooo.',
    ],
  },
  bag: {
    palette: palette('#8a4a1c', '#e0893a', '#ffc27a'),
    rows: [
      '....oooo....',
      '...ohhbbo...',
      '....obbo....',
      '..oooooooo..',
      '.ohhhbbbbbo.',
      'ohhwhbbbbbdo',
      'ohhhbbbbbbdo',
      'ohhbbbbbbbdo',
      'ohbbbbbbbbdo',
      'obbbbbbbbddo',
      '.oddddddddo.',
      '..oooooooo..',
    ],
  },
  trade: {
    palette: palette('#1d8fa3', '#4fe0f0', '#c8fbff'),
    rows: [
      '......oo....',
      '......obo...',
      'oooooooohbo.',
      'ohhhhhhhhhbo',
      'oooooooohbo.',
      '......obo...',
      '...oo.oo....',
      '..obo.......',
      '.obhoooooooo',
      'obhhhhhhhhho',
      '.obhoooooooo',
      '..ooo.......',
    ],
  },
  gift: {
    palette: palette('#5b2fa6', '#b07cff', '#e3ccff'),
    rows: [
      '..oo....oo..',
      '.ohho..ohho.',
      '..ohhoohho..',
      'oooooooooooo',
      'ohhhhwwbbbdo',
      'oooooooooooo',
      '.ohhhwwbbdo.',
      '.ohhhwwbbdo.',
      '.ohhhwwbbdo.',
      '.ohhhwwbbdo.',
      '.obbbwwbddo.',
      '.oooooooooo.',
    ],
  },
  puzzle: {
    palette: palette('#1d8fa3', '#4fe0f0', '#c8fbff'),
    rows: [
      'oooooo......',
      'ohhbbo......',
      'ohbbdo......',
      'oooooooooooo',
      'ohhbboohhbbo',
      'ohbbdoohbbdo',
      'oooooooooooo',
      '......ohhbbo',
      '......ohbbdo',
      'oooooooooooo',
      'ohhbboohhbbo',
      'oooooooooooo',
    ],
  },
  piece: {
    palette: palette('#1d8fa3', '#4fe0f0', '#c8fbff'),
    rows: [
      '............',
      '............',
      '....oooo....',
      '....ohbo....',
      '....obdo....',
      'oooooooooooo',
      'ohboohboohbo',
      'obdoobdoobdo',
      'oooooooooooo',
      '............',
      '............',
      '............',
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
  eye: {
    palette: palette('#1d6f8a', '#3fb6d8', '#a8ecff'),
    rows: [
      '............',
      '............',
      '....oooo....',
      '..oowwwwoo..',
      '.owwbbbbwwo.',
      'owwbhoobbwwo',
      'owwbhoobdwwo',
      '.owwbbddwwo.',
      '..oowwwwoo..',
      '....oooo....',
      '............',
      '............',
    ],
  },
  clover: {
    palette: palette('#1f8a3c', '#4fd36f', '#b4f5a0'),
    rows: [
      '.ooo....ooo.',
      'ohhbo..ohhbo',
      'ohwhboohwhbo',
      'ohhbboohhbbo',
      '.obbdoobbdo.',
      '..oooooooo..',
      '.obbboobbbo.',
      'obbbboobbbbo',
      'obbbdoobbbdo',
      'odddo..odddo',
      '.ooo.oo.ooo.',
      '......oo....',
    ],
  },
  boot: {
    palette: palette('#7a3d1c', '#c8743a', '#f2b07a'),
    rows: [
      '...oooo.....',
      '..ohhbo.oo..',
      '..ohbbooowo.',
      '..ohbbowwwo.',
      '..ohbbdowo..',
      '..ohbbdoo...',
      '..ohbbbdo...',
      '.ohhbbbbdoo.',
      '.ohbbbbbbddo',
      '.obbbbbbbbdo',
      '.oddddddddo.',
      '.oooooooooo.',
    ],
  },
  point: {
    palette: palette('#c58a10', '#ffd23f', '#fff4a8'),
    rows: [
      '.....oo.....',
      '....ohbo....',
      '....ohbo....',
      '...ohhbbo...',
      '.oohhwhbboo.',
      'ohhhwwwhbbdo',
      'obbbhwhbbddo',
      '.oobbhbbdoo.',
      '...obbddo...',
      '....obdo....',
      '....obdo....',
      '.....oo.....',
    ],
  },
  /** Spell Power. */
  burst: {
    palette: palette('#c2301f', '#ff7b3a', '#ffd34d'),
    rows: [
      '.....oo.....',
      '.o...obo..o.',
      '.oo..obo.oo.',
      '.obooobboobo',
      '..obhhhbbbo.',
      'oo.ohwwhbo..',
      'obbhwwwhbboo',
      '.oobhwhhbo..',
      '..obbhbbbo..',
      '.obooobboobo',
      '.oo..obo..oo',
      '.o....oo...o',
    ],
  },
  /** Spell Efficiency: a drop of mana (shown with how much it takes off). */
  drop: {
    palette: palette('#5b2fa6', '#b07cff', '#e3ccff'),
    rows: [
      '.....oo.....',
      '.....oo.....',
      '....obbo....',
      '....obbo....',
      '...ohbbdo...',
      '..ohwbbbdo..',
      '..ohwbbbdo..',
      '.ohwbbbbbdo.',
      '.ohhbbbbbdo.',
      '.obbbbbbddo.',
      '..oddddddo..',
      '...oooooo...',
    ],
  },

  /** Spell Effect. */
  wand: {
    palette: palette('#7a3d1c', '#b07cff', '#e3ccff'),
    rows: [
      '........o...',
      '.......oho..',
      '....ooohwhoo',
      '.....ohwwwho',
      '......ohwho.',
      '......oo.oo.',
      '.....odo....',
      '....odo.....',
      '...odo......',
      '..odo.......',
      '.odo........',
      '.oo.........',
    ],
  },
  /** A spell ready for its next level. */
  scroll: {
    palette: palette('#a8743a', '#e8c88a', '#fff4d0'),
    rows: [
      '.oooooooooo.',
      'ohhhhhhhhhdo',
      'odhhhhhhhddo',
      '.oooooooooo.',
      '..ohwwwwbo..',
      '..ohddddbo..',
      '..ohhhhhbo..',
      '..ohdddbbo..',
      '..ohhhhhbo..',
      '.oooooooooo.',
      'ohhhhhhhhhdo',
      '.oooooooooo.',
    ],
  },
  /** A frozen enemy waits. */
  hourglass: {
    palette: palette('#a8743a', '#e8c88a', '#fff4d0'),
    rows: [
      'oooooooooooo',
      'obbbbbbbbbdo',
      '.oooooooooo.',
      '..owhhhhbo..',
      '...obhhbo...',
      '....obbo....',
      '....obbo....',
      '...ob..bo...',
      '..ob.hh.bo..',
      '.oooooooooo.',
      'obbbbbbbbbdo',
      'oooooooooooo',
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

/**
 * An icon to show: a shape, an optional recolour, and an optional small
 * badge (e.g. a tome's element) drawn over its centre.
 */
export interface IconSpec {
  readonly icon: IconId;
  readonly palette?: IconPalette;
  readonly badge?: IconId;
}

/** Recolours shared by several icons. */
export const PALETTES = {
  copper: palette('#7a3d1c', '#c8743a', '#f2b07a'),
  iron: palette('#5b6a80', '#b9c6d8', '#ffffff'),
  knight: palette('#2a4fb8', '#9ab8ff', '#ffffff'),
  crystal: palette('#1d8fa3', '#8af0ff', '#e6feff'),
  violet: palette('#5b2fa6', '#b07cff', '#e3ccff'),
  gold: palette('#c58a10', '#ffd23f', '#fff4a8'),
  open: palette('#1f8a3c', '#4fd36f', '#b4f5a0'),
  /** A dark silhouette, e.g. a spell slot not yet filled. */
  shadow: palette('#2a2f4d', '#2a2f4d', '#2a2f4d', '#20243c', '#2a2f4d'),
} as const satisfies Record<string, IconPalette>;

const elementPalette = (element: Element): IconPalette => ICONS[ELEMENT_ICONS[element]].palette;

/** The icon for each stat. */
export const STAT_ICONS: Readonly<Record<StatId, IconId>> = {
  vitality: 'heart',
  strength: 'sword',
  guard: 'ward',
  focus: 'potion',
  agility: 'boot',
  insight: 'eye',
  charm: 'gift',
  luck: 'clover',
};

/** The icon for each spell attribute. */
export const ENHANCEMENT_ICONS: Readonly<Record<EnhancementId, IconId>> = {
  power: 'burst',
  efficiency: 'drop',
  effect: 'wand',
};

/** The icon for what each kind of spell does. */
export const SPELL_KIND_ICONS: Readonly<Record<SpellEffect['kind'], IconSpec>> = {
  damage: { icon: 'burst' },
  heal: { icon: 'heart' },
  drain: { icon: 'fang' },
  freeze: { icon: 'hourglass' },
  tailwind: { icon: 'boot' },
  clearRows: { icon: 'piece', palette: PALETTES.iron },
  burn: { icon: 'hourglass', palette: elementPalette('fire') },
  regen: { icon: 'hourglass', palette: elementPalette('nature') },
  mist: { icon: 'water', palette: PALETTES.iron },
  charge: { icon: 'burst', palette: PALETTES.gold },
  ward: { icon: 'ward' },
  manaTap: { icon: 'potion', palette: PALETTES.violet },
  swap: { icon: 'piece', palette: PALETTES.crystal },
  purify: { icon: 'piece', palette: elementPalette('water') },
  resonate: { icon: 'shard', palette: PALETTES.gold },
  expose: { icon: 'weak' },
};

/** The icon for each kind of enemy move, shown when Insight reveals it. */
export const MOVE_ICONS: Readonly<Record<EnemyMove['kind'], IconSpec>> = {
  attack: { icon: 'sword', palette: ICONS.heart.palette },
  curse: { icon: 'piece', palette: PALETTES.iron },
  haste: { icon: 'haste' },
  heal: { icon: 'heart' },
  drain: { icon: 'potion' },
};

/** The icon for every item. `tests/feedback.test.ts` checks none are missing. */
export const ITEM_ICONS: Readonly<Record<string, IconSpec>> = {
  herb: { icon: 'herb' },
  ether: { icon: 'potion' },
  phoenixFeather: { icon: 'feather' },
  fireTome: { icon: 'book', badge: 'fire' },
  galeTome: { icon: 'book', badge: 'wind' },
  shadowTome: { icon: 'book', badge: 'arcane' },
  blizzardTome: { icon: 'book', badge: 'water' },
  innRest: { icon: 'bed' },
  copperSword: { icon: 'sword', palette: PALETTES.copper },
  ironSword: { icon: 'sword', palette: PALETTES.iron },
  knightBlade: { icon: 'sword', palette: PALETTES.knight },
  apprenticeRobe: { icon: 'robe' },
  crystalMail: { icon: 'armor', palette: PALETTES.crystal },
  emberCharm: { icon: 'amulet', palette: elementPalette('fire'), badge: 'fire' },
  tideCharm: { icon: 'amulet', palette: elementPalette('water'), badge: 'water' },
  stormCharm: { icon: 'amulet', palette: elementPalette('lightning'), badge: 'lightning' },
  windCharm: { icon: 'amulet', palette: elementPalette('wind'), badge: 'wind' },
  slimeGel: { icon: 'blob' },
  sporeCap: { icon: 'mushroom' },
  goblinCharm: { icon: 'fang' },
  moonShard: { icon: 'shard' },
};

/** An item's icon, with a plain bag icon for anything unlisted. */
export function itemIcon(itemId: string): IconSpec {
  return ITEM_ICONS[itemId] ?? { icon: 'bag' };
}

/** The colour of each cell, or null for transparent, row by row. */
export function iconPixels(
  id: IconId,
  silhouette?: string,
  recolour?: IconPalette,
): (string | null)[][] {
  const icon: IconDef = ICONS[id];
  const colours = recolour ?? icon.palette;
  return icon.rows.map((row) =>
    [...row].map((cell) => {
      if (cell === '.') return null;
      if (silhouette) return silhouette;
      return colours[cell as keyof IconPalette];
    }),
  );
}
