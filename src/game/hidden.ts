/**
 * Hidden spells: one per element that no list names until something the
 * hero does reveals it (`SpellDef.hidden`): a stat rank, alignment, a board
 * feat, a quest, or an item brought to the element's mentor. Until then
 * its slot is a dark silhouette; once revealed, the mentor teaches it.
 */
import type { Element } from '../core/elements';
import { MENTORS, type MentorDef } from '../data/mentors';
import { SPELLS } from '../data/spells';
import type { SpellDef } from '../data/types';
import { featCount } from './feats';
import { heroAlignment, removeItem, type Hero } from './hero';
import type { Gain } from './rewards';
import { knownSpell } from './spells';

/** Who a hidden spell is revealed to: the hero and the story flags. */
export interface Seeker {
  readonly hero: Pick<Hero, 'spells' | 'stats' | 'feats' | 'items'>;
  readonly flags: ReadonlySet<string>;
}

/**
 * A hidden spell's slot as the hero sees it: a dark silhouette (`hidden`),
 * lit in its element's colour with its mentor (`unlocked`), or the spell
 * itself (`known`).
 */
export type HiddenState = 'hidden' | 'unlocked' | 'known';

/** The hidden spells, in element order; only `element`'s if given. */
export function hiddenSpells(element?: Element): SpellDef[] {
  return Object.values(SPELLS).filter(
    (spell) => spell.hidden && (!element || spell.category === element),
  );
}

/** The flag set when the hero brings a hidden spell's item to its mentor. */
export function giftFlag(spellId: string): string {
  return `gift:${spellId}`;
}

/** True once a hidden spell has been revealed (always true for other spells). */
export function isRevealed(spell: SpellDef, { hero, flags }: Seeker): boolean {
  const unlock = spell.hidden;
  switch (unlock?.kind) {
    case undefined:
      return true;
    case 'stat':
      return hero.stats[unlock.stat] >= unlock.rank;
    case 'alignment': {
      const alignment = heroAlignment(hero);
      return Object.entries(unlock.needs).every(
        ([element, need]) => alignment[element as Element] >= (need ?? 0),
      );
    }
    case 'pattern':
      return featCount(hero, unlock.feat) >= unlock.count;
    case 'quest':
      return flags.has(unlock.flag);
    case 'item':
      return flags.has(giftFlag(spell.id));
  }
}

/** How a hidden spell's slot shows: hidden, unlocked (not yet taught) or known. */
export function hiddenState(spell: SpellDef, seeker: Seeker): HiddenState {
  if (knownSpell(seeker.hero, spell.id)) return 'known';
  return isRevealed(spell, seeker) ? 'unlocked' : 'hidden';
}

/** A hidden spell the hero doesn't know yet, and whether it is revealed. */
export interface HiddenSlot {
  readonly spell: SpellDef;
  readonly state: Exclude<HiddenState, 'known'>;
  /** For a still-hidden board-feat unlock: feats done so far, of those needed (shown as pips). */
  readonly progress?: { readonly have: number; readonly want: number };
}

/** The hidden spells the hero doesn't know yet (only `element`'s if given), in element order. */
export function hiddenSlots(seeker: Seeker, element?: Element): HiddenSlot[] {
  return hiddenSpells(element).flatMap((spell): HiddenSlot[] => {
    const state = hiddenState(spell, seeker);
    if (state === 'known') return [];
    const unlock = spell.hidden;
    return [
      unlock?.kind === 'pattern' && state === 'hidden'
        ? {
            spell,
            state,
            progress: { have: featCount(seeker.hero, unlock.feat), want: unlock.count },
          }
        : { spell, state },
    ];
  });
}

/**
 * The mentor who wants `itemId` to reveal one of their hidden spells not
 * yet revealed, or null (so the shop can warn before it is sold).
 */
export function wantedBy(seeker: Seeker, itemId: string): MentorDef | null {
  const spell = hiddenSpells().find(
    (s) =>
      s.hidden?.kind === 'item' &&
      s.hidden.itemId === itemId &&
      hiddenState(s, seeker) === 'hidden',
  );
  return Object.values(MENTORS).find((m) => m.element === spell?.category) ?? null;
}

/**
 * The items the hero carries that `mentor` would take to reveal a hidden
 * spell of theirs, so the hero can choose to give or keep them.
 */
export function itemsFor(seeker: Seeker, mentor: MentorDef): string[] {
  return hiddenSpells(mentor.element).flatMap((spell) => {
    const unlock = spell.hidden;
    return unlock?.kind === 'item' &&
      hiddenState(spell, seeker) === 'hidden' &&
      (seeker.hero.items[unlock.itemId] ?? 0) > 0
      ? [unlock.itemId]
      : [];
  });
}

/**
 * The hero gives `mentor` the items they asked for (see `itemsFor`): each
 * reveals its hidden spell for good. Returns the items given, for the
 * conversation to show.
 */
export function bringItems(
  state: { readonly hero: Hero; readonly flags: Set<string> },
  mentor: MentorDef,
): Gain[] {
  const wanted = new Set(itemsFor(state, mentor));
  return hiddenSpells(mentor.element).flatMap((spell): Gain[] => {
    const unlock = spell.hidden;
    if (unlock?.kind !== 'item' || !wanted.has(unlock.itemId)) return [];
    removeItem(state.hero, unlock.itemId);
    state.flags.add(giftFlag(spell.id));
    return [{ kind: 'item', itemId: unlock.itemId, count: -1 }];
  });
}

/**
 * True while `mentor` seeks the hero out: a board feat revealed one of
 * their hidden spells ("they noticed") and they have yet to teach it.
 */
export function seeksHero(mentor: MentorDef, seeker: Seeker): boolean {
  return hiddenSpells(mentor.element).some(
    (spell) => spell.hidden?.kind === 'pattern' && hiddenState(spell, seeker) === 'unlocked',
  );
}
