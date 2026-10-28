/**
 * The encounters built so far (docs/ENCOUNTER_DESIGN.md §6, milestone M1):
 * each person's verb, board, words and world props. Their numbers live in
 * `ENCOUNTERS` in `balance.ts`; this file holds what the numbers don't:
 * layouts, authored queues, lines and how failing looks. Keys are NPC ids.
 *
 * Lines here are drafts in the person's voice for the author's edit, copied
 * word for word from docs/STORY.md ("Encounter lines (drafts)").
 */
import type { PieceName } from '../core/pieces';
import type { Element } from '../core/elements';
import type { BuildParams } from '../battle/verbs/build';
import type { ChargeParams } from '../battle/verbs/charge';
import type { ContainParams } from '../battle/verbs/contain';
import type { DigParams } from '../battle/verbs/dig';
import type { DuelParams } from '../battle/verbs/duel';
import type { PlantParams } from '../battle/verbs/plant';
import type { RetryRule } from '../game/stakes';
import { ENCOUNTERS } from './balance';
import type { Reward } from './types';

/** The board's look (§4): about eight unique skins, the rest recoloured themes. */
export type SkinId = 'well' | 'tower' | 'beds' | 'stall' | 'ring' | 'lamps';

/** A verb and its board. */
export type VerbSpec =
  | { readonly verb: 'dig'; readonly params: DigParams }
  | { readonly verb: 'build'; readonly params: BuildParams }
  | { readonly verb: 'plant'; readonly params: PlantParams }
  | { readonly verb: 'duel'; readonly params: DuelParams }
  | { readonly verb: 'contain'; readonly params: ContainParams }
  | { readonly verb: 'charge'; readonly params: ChargeParams };

/**
 * The person's own piece on the first try (§5.1): a scripted placement
 * the hero watches before taking control. `extra` when the piece is the
 * person's own (it doesn't come from the queue).
 */
export interface Demo {
  readonly piece: PieceName;
  /** Clockwise turns from the spawn orientation. */
  readonly turns: number;
  /** The column of the piece's left edge. */
  readonly x: number;
  readonly extra: boolean;
}

/** One world prop (§4): drawn by the person while it applies. */
export interface WorldProp {
  /** An icon from `src/ui/art/icons.ts`, glowing in `color`. */
  readonly icon: string;
  readonly color: string;
  /** What it shows, in words (the Stakes card and a tooltip). */
  readonly text: string;
}

/** A threshold's mentor assist (§3.4), offered after two fails. */
export interface Assist {
  readonly mentorId: string;
  /** The shapes the mentor tosses (Maren: J or T). */
  readonly shapes: readonly PieceName[];
  /** True when tosses come in the mentor's colour (Torva's are all red). */
  readonly recolor: boolean;
}

export interface EncounterDef {
  /** The person's NPC id (also the encounter's id). */
  readonly id: string;
  readonly title: string;
  readonly spec: VerbSpec;
  /** A board narrower than 10 (the well). */
  readonly width?: number;
  readonly skin: SkinId;
  /** The objective on the board's frame, in the person's words (`{target}` is the target). */
  readonly objective: string;
  /** The fail row of the Stakes card: how the world gets worse. */
  readonly failText: string;
  /** What each strain step does, in words. */
  readonly strainText: string;
  readonly retry: RetryRule;
  /** A threshold (required): strain capped at 1, the assist offered after 2 fails. */
  readonly assist?: Assist;
  /** Added to the rewards on a Great. */
  readonly great?: Reward;
  /** The person's demo on the first try. */
  readonly demo?: Demo;
  /** Their three lines: as the try starts, at their verb's event, and nearly done (§4). */
  readonly lines: { readonly start: string; readonly hazard: string; readonly nearly: string };
  /** Said after their win line: what to do next, and what it taught. */
  readonly winAdd?: string;
  /** The world props by the person: one for a win, one for a fail (§4). */
  readonly world: {
    readonly x: number;
    readonly y: number;
    readonly win: WorldProp;
    readonly fail: WorldProp;
  };
  /** Elements the person's board pays out in: a rough guide for the Stakes card. */
  readonly element?: Element;
}

const E = ENCOUNTERS;

export const ENCOUNTER_DEFS: Readonly<Record<string, EncounterDef>> = {
  elder: {
    id: 'elder',
    title: 'The Well',
    width: E.elder.width,
    skin: 'well',
    spec: {
      verb: 'dig',
      params: {
        rows: ['mm..mm', 'mmmm.m', 'm.mmmm', 'mmm.mm', 'm.mmmm', 'mmPm.m'],
        lip: E.elder.lip,
        risingEvery: E.elder.risingEvery,
        soonerPerHole: E.elder.soonerPerHole,
        strainRows: E.elder.strainRows,
      },
    },
    objective: 'Scrape down to the pipe before the mold climbs over the lip.',
    failText: 'The mold spreads',
    strainText: 'one row worse next time',
    retry: 'now',
    demo: { piece: 'O', turns: 0, x: 2, extra: true },
    lines: {
      start: "Lip's your limit, kid. Mold over the lip and it's in the tea.",
      hazard: '*The shaft groans.* There it comes again.',
      nearly: "There's the pipe!",
    },
    winAdd: "Pip's been wailing about his tower since dawn.",
    world: {
      x: 5,
      y: 7,
      win: { icon: 'drop', color: '#7fd4ff', text: 'Clear water, and villagers at the well' },
      fail: { icon: 'drop', color: '#b77cff', text: 'Violet water, mold up the wall' },
    },
  },
  kid: {
    id: 'kid',
    title: 'The Crystal Tower',
    skin: 'tower',
    spec: {
      verb: 'build',
      params: {
        outline: [
          { cols: [4, 7], rows: [1, 8] },
          { cols: [4, 7], rows: [9, 9] },
        ],
        spare: { cols: [0, 2], rows: [1, 5] },
        queue: ['O', 'S', 'O', 'J', 'J', 'Z', 'I', 'I', 'L', 'L', 'I'],
        crackLimit: E.kid.crackLimit,
        wobbleLimit: E.kid.wobbleLimit,
        previews: E.kid.previews,
        strainCracks: E.kid.strainCracks,
      },
    },
    objective: 'Build my tower up to the spinner. Ugly ones go in the toy box!',
    failText: 'The tower leans',
    strainText: 'a cracked block next time',
    retry: 'now',
    demo: { piece: 'O', turns: 0, x: 4, extra: false },
    lines: {
      start: 'Next is a square! Then a squiggly one, ew!',
      hazard: "It's wobbling!",
      nearly: 'Spinner time! The long one, flat!',
    },
    winAdd: "Farmer Bean's been waiting on seed all morning. Go see her!",
    world: {
      x: 16,
      y: 6,
      win: { icon: 'star', color: '#61d9e8', text: 'The tower spins' },
      fail: { icon: 'star', color: '#8a8fa8', text: 'The tower leans' },
    },
  },
  farmer: {
    id: 'farmer',
    title: 'The Herb Beds',
    skin: 'beds',
    spec: {
      verb: 'plant',
      params: {
        zones: ['green', 'green', null, null, 'green', 'green', null, null, 'green', 'green'],
        ridges: [0, 4, 8],
        target: E.farmer.target,
        great: E.farmer.great,
        pieceLimit: E.farmer.pieceLimit,
        supply: { window: E.farmer.supplyWindow, pieces: ['S'] },
        wrongColour: E.farmer.wrongColour,
        strainTarget: E.farmer.strainTarget,
      },
    },
    objective: 'Plant {target} sprouts in the furrows before sundown.',
    failText: 'The beds stay grey',
    strainText: 'two more sprouts next time',
    retry: 'now',
    great: { kind: 'item', itemId: 'herb', count: 1 },
    demo: { piece: 'S', turns: 1, x: 0, extra: true },
    lines: {
      start: "The seed's the green S, love. The red one only looks like it.",
      hazard: 'Upright, it fits the furrow.',
      nearly: 'Last row before dark!',
    },
    winAdd:
      "Green you clear goes to your own green magic, too. Now go haggle Ordor, he's been crowing all week.",
    world: {
      x: 9,
      y: 7,
      win: { icon: 'herb', color: '#6ff08f', text: 'Green beds, and a herb rack' },
      fail: { icon: 'herb', color: '#8a8fa8', text: 'Grey beds' },
    },
  },
  stallKeeper: {
    id: 'stallKeeper',
    title: 'The Stall',
    skin: 'stall',
    spec: { verb: 'duel', params: { ...E.stallKeeper } },
    objective: 'Big clears push his price down. Singles won’t move him.',
    failText: 'Red prices on the slate',
    strainText: 'he starts higher next time',
    retry: 'day',
    great: { kind: 'item', itemId: 'herb', count: 1 },
    lines: {
      start: "A single? I didn't feel it.",
      hazard: 'Counter-offer!',
      nearly: "Careful, you'll tip the scales!",
    },
    world: {
      x: 16,
      y: 11,
      win: { icon: 'coin', color: '#6ff08f', text: 'Green prices on the slate' },
      fail: { icon: 'coin', color: '#ff5c7a', text: 'Red prices on the slate' },
    },
  },
  forager: {
    id: 'forager',
    title: 'The Mushroom Ring',
    skin: 'ring',
    spec: {
      verb: 'contain',
      params: {
        rows: [
          'on.nononon',
          'nononon.no',
          'onon.nonCn',
          'n.noConono',
          'oCononon.n',
          'nonon.nono',
          'Rno.ononoR',
        ],
        pieceLimit: E.forager.pieceLimit,
        spreadEvery: E.forager.spreadEvery,
        spreadCells: E.forager.spreadCells,
        keepCaps: E.forager.keepCaps,
        deadCapsFail: E.forager.deadCapsFail,
        strainHazard: E.forager.strainHazard,
      },
    },
    objective: 'Clear the rot before it reaches the young caps.',
    failText: 'A brown patch where the ring was',
    strainText: 'three more rot next time',
    retry: 'wait',
    great: { kind: 'item', itemId: 'herb', count: 1 },
    lines: {
      start: 'That pale one, guard it.',
      hazard: "Rot's moving.",
      nearly: 'Nearly clean!',
    },
    world: {
      x: 17,
      y: 6,
      win: { icon: 'mushroom', color: '#ffb36b', text: 'A ring of mushrooms' },
      fail: { icon: 'mushroom', color: '#7a5a3a', text: 'A brown patch' },
    },
  },
  guard: {
    id: 'guard',
    title: 'The Ward Lamps',
    skin: 'lamps',
    spec: {
      verb: 'charge',
      params: {
        lamps: ['water', 'water', 'arcane', 'arcane'],
        purity: E.guard.purity,
        pieceLimit: E.guard.pieceLimit,
        snuffEvery: E.guard.snuffEvery,
        supply: { window: E.guard.supplyWindow, pieces: ['J', 'T'] },
        strainLamps: E.guard.strainLamps,
      },
    },
    objective: 'Light all four ward lamps: two blue, two violet. A lamp only takes a pure line.',
    failText: 'The lamps gutter',
    strainText: 'one more lamp next time',
    retry: 'wait',
    assist: { mentorId: 'maren', shapes: ['J', 'T'], recolor: false },
    lines: {
      start: "Both colours. Don't mess up the ratio.",
      hazard: 'Wind! Hold that one!',
      nearly: 'Last lamp!',
    },
    world: {
      x: 17,
      y: 16,
      win: { icon: 'star', color: '#f5d77b', text: 'Lit lamps and alert guards' },
      fail: { icon: 'star', color: '#5a6080', text: 'Guttering lamps' },
    },
  },
};

/** The encounter a person runs, if they have one built. */
export function encounterOf(npcId: string): EncounterDef | undefined {
  return Object.hasOwn(ENCOUNTER_DEFS, npcId) ? ENCOUNTER_DEFS[npcId] : undefined;
}

/**
 * What a board draws over its cells (§2, "overlay budget"): at most one
 * hazard or visibility family (hazard tags, or the dark) and one
 * objective family (targets, zones, or an outline). Frame lamps and
 * meters are not overlays.
 */
export interface Overlays {
  readonly hazard: 'tags' | 'dark' | null;
  readonly objective: 'targets' | 'zones' | 'outline' | null;
}

/** The overlays a verb's board draws. */
export function overlaysOf(spec: VerbSpec): Overlays {
  switch (spec.verb) {
    case 'dig':
      return { hazard: null, objective: 'targets' };
    case 'build':
      return { hazard: null, objective: 'outline' };
    case 'plant':
      return { hazard: null, objective: 'zones' };
    case 'contain':
      return { hazard: 'tags', objective: 'targets' };
    case 'duel':
    case 'charge':
      return { hazard: null, objective: null };
  }
}

/**
 * The supply rule (§2): a colour encounter asks for at most half the
 * wanted cells its controlled queue guarantees,
 * `required ≤ 0.5 × (pieces ÷ window) × 4 × supplied shapes`, at every
 * strain, and purity is never above 7 of 10. Other verbs pass.
 */
export function supplyRuleHolds(spec: VerbSpec, strain = 0): boolean {
  const guaranteed = (pieces: number, supply: { window: number; pieces: readonly string[] }) =>
    0.5 * (pieces / supply.window) * 4 * supply.pieces.length;
  if (spec.verb === 'plant') {
    const p = spec.params;
    return p.target + strain * p.strainTarget <= guaranteed(p.pieceLimit, p.supply);
  }
  if (spec.verb === 'charge') {
    const p = spec.params;
    const lamps = p.lamps.length + strain * p.strainLamps;
    return p.purity <= 7 && lamps * p.purity <= guaranteed(p.pieceLimit, p.supply);
  }
  return true;
}
