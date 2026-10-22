/**
 * Attitude: how an NPC feels about the hero, from the hero's alignment
 * around the NPC's element and their Charm. It is derived, never stored,
 * so it moves as the hero learns spells and spends points.
 *
 * score = alignment in the NPC's element
 *       + ½ × alignment in the two related elements
 *       − ½ × alignment in the two elements that beat the NPC's
 *       + Charm rank
 */
import { relatedTo, weakTo, type Element, type ElementCounts } from '../core/elements';
import type { ChallengeSpec, Line, NpcDef, Reward, ShopDef } from '../data/types';
import { alignmentOf } from './alignment';
import type { Hero } from './hero';
import { knownSpell } from './spells';

export const ATTITUDES = ['hostile', 'wary', 'neutral', 'friendly', 'devoted'] as const;
export type Attitude = (typeof ATTITUDES)[number];

/** Each tier's name, e.g. for a face's tooltip. */
export const ATTITUDE_NAMES: Readonly<Record<Attitude, string>> = {
  hostile: 'Hostile',
  wary: 'Wary',
  neutral: 'Neutral',
  friendly: 'Friendly',
  devoted: 'Devoted',
};

/**
 * The lowest score of each tier above Hostile. A new hero (1–2 alignment,
 * Charm 0–2) is Neutral to most people; a few spells in one element or
 * some Charm make its people Friendly, and Devoted takes real growth.
 */
export const ATTITUDE_THRESHOLDS: Readonly<Record<Exclude<Attitude, 'hostile'>, number>> = {
  wary: -2.5,
  neutral: -0.5,
  friendly: 3,
  devoted: 6,
};

/** Price multiplier per tier (Hostile never sells). */
export const ATTITUDE_PRICES: Readonly<Record<Attitude, number>> = {
  hostile: 1.2,
  wary: 1.2,
  neutral: 1,
  friendly: 0.9,
  devoted: 0.8,
};

/** How much harder a Wary NPC's challenge is (targets up, merchants faster). */
export const WARY_HARDER = 1.25;

/** The attitude score of an NPC of `element` toward a hero with this alignment and Charm. */
export function attitudeScore(
  alignment: Readonly<ElementCounts>,
  charm: number,
  element: Element,
): number {
  const sum = (elements: readonly Element[]): number =>
    elements.reduce((total, e) => total + alignment[e], 0);
  return alignment[element] + (sum(relatedTo(element)) - sum(weakTo(element))) / 2 + charm;
}

/** The tier a score falls in. */
export function attitudeForScore(score: number): Attitude {
  if (score >= ATTITUDE_THRESHOLDS.devoted) return 'devoted';
  if (score >= ATTITUDE_THRESHOLDS.friendly) return 'friendly';
  if (score >= ATTITUDE_THRESHOLDS.neutral) return 'neutral';
  if (score >= ATTITUDE_THRESHOLDS.wary) return 'wary';
  return 'hostile';
}

/** How `npc` feels about the hero. Things (a chest) are always Neutral. */
export function attitudeOf(hero: Pick<Hero, 'spells' | 'stats'>, npc: NpcDef): Attitude {
  if (npc.inanimate) return 'neutral';
  return attitudeForScore(attitudeScore(alignmentOf(hero.spells), hero.stats.charm, npc.element));
}

/**
 * The terms the NPC deals on, or null if they refuse: a Hostile NPC
 * refuses unless progress depends on them, then deals as if Wary.
 */
export function dealTerms(npc: NpcDef, attitude: Attitude): Attitude | null {
  if (attitude !== 'hostile') return attitude;
  return npc.essential ? 'wary' : null;
}

/**
 * The challenge on these terms. Wary: offerings need a higher score, barters
 * more crystals, and merchants push prices up faster. A puzzle stays as it
 * is, since it has exactly one recorded solution.
 */
export function challengeOnTerms(spec: ChallengeSpec, terms: Attitude): ChallengeSpec {
  if (terms !== 'wary') return spec;
  switch (spec.kind) {
    case 'offering':
      return { ...spec, targetScore: Math.ceil(spec.targetScore * WARY_HARDER) };
    case 'barter':
      return {
        ...spec,
        wants: Object.fromEntries(
          Object.entries(spec.wants).map(([color, n]) => [
            color,
            Math.ceil((n ?? 0) * WARY_HARDER),
          ]),
        ),
      };
    case 'haggle':
      return { ...spec, rivalIntervalMs: Math.round(spec.rivalIntervalMs / WARY_HARDER) };
    default:
      return spec;
  }
}

/** What an NPC gives: their usual rewards, and the extras their attitude adds. */
export interface TermRewards {
  readonly base: readonly Reward[];
  /** `bonus` when Friendly or Devoted, plus `secret` when Devoted. */
  readonly extras: readonly Reward[];
  /** True when a spell reward was swapped for its `instead` (the hero knew it). */
  readonly knewSpell: boolean;
}

/**
 * What the NPC gives on these terms. A spell the hero already knows becomes
 * its `instead` reward.
 */
export function rewardsOnTerms(
  hero: Pick<Hero, 'spells'>,
  npc: NpcDef,
  terms: Attitude,
): TermRewards {
  const warm = terms === 'friendly' || terms === 'devoted';
  const extras = [
    ...(warm && npc.bonus ? [npc.bonus] : []),
    ...(terms === 'devoted' && npc.secret ? [npc.secret] : []),
  ];
  const known = (reward: Reward): boolean =>
    reward.kind === 'spell' && !!knownSpell(hero, reward.spellId);
  const base = npc.rewards.flatMap((reward) =>
    reward.kind === 'spell' && known(reward) ? (reward.instead ? [reward.instead] : []) : [reward],
  );
  return { base, extras, knewSpell: npc.rewards.some(known) };
}

/** A shop's stock for this attitude: Devoted keepers bring out their secret stock. */
export function stockFor(shop: ShopDef, attitude: Attitude): readonly string[] {
  return attitude === 'devoted' ? [...shop.stock, ...(shop.secretStock ?? [])] : shop.stock;
}

/** The variant of a line for this attitude: cold (Hostile, Wary), plain or warm. */
export function say(line: Line, attitude: Attitude): string {
  if (typeof line === 'string') return line;
  if (attitude === 'hostile' || attitude === 'wary') return line.cold;
  return attitude === 'neutral' ? line.plain : line.warm;
}

/** What the NPC says on meeting the hero: a Devoted NPC confides instead of the warm intro. */
export function introFor(npc: NpcDef, attitude: Attitude): string {
  return attitude === 'devoted' && npc.lines.confide
    ? npc.lines.confide
    : say(npc.lines.intro, attitude);
}
