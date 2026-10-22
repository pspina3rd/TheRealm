/**
 * The end of the chapter: beating the finale boss (the Moon Wyrm) sets
 * `FINALE_FLAG` and shows an epilogue of what the hero became.
 */
import type { Element } from '../core/elements';
import { MENTORS, type MentorDef } from '../data/mentors';
import { NPCS } from '../data/npcs';
import { SPELLS, STARTING_SPELLS } from '../data/spells';
import { heroClass, heroTitle, type Hero } from './hero';

/** Set once the finale boss falls; the Sunken Ruins' seal stirs (see `Warp.stirs`). */
export const FINALE_FLAG = 'wyrmBeaten';

/** Who speaks last, and what they say: someone who sent the hero below. */
export const FINALE_WORDS = {
  npcId: 'guard',
  text: 'You came back up! The watch lit every lamp for you. The realm owes you; so do I.',
} as const;

/** What the epilogue shows. */
export interface Epilogue {
  /** e.g. "Gale Ranger". */
  readonly title: string;
  readonly titleElement: Element;
  readonly classSprite: string;
  readonly level: number;
  /** How many spells the hero knows. */
  readonly spells: number;
  /** The mentors whose magic the hero learned (an element beyond their start). */
  readonly mentors: readonly MentorDef[];
  readonly speaker: { readonly name: string; readonly sprite: string; readonly text: string };
}

/** The epilogue for this hero. */
export function epilogueFor(hero: Hero): Epilogue {
  const start = new Set([heroClass(hero).spell, ...STARTING_SPELLS]);
  const learned = new Set(
    Object.keys(hero.spells)
      .filter((id) => !start.has(id))
      .flatMap((id) => {
        const spell = SPELLS[id];
        return spell ? [spell.category] : [];
      }),
  );
  const speaker = NPCS[FINALE_WORDS.npcId];
  return {
    title: heroTitle(hero),
    titleElement: hero.titleElement,
    classSprite: heroClass(hero).sprite,
    level: hero.level,
    spells: Object.keys(hero.spells).length,
    mentors: Object.values(MENTORS).filter((mentor) => learned.has(mentor.element)),
    speaker: {
      name: speaker?.name ?? '',
      sprite: speaker?.sprite ?? '',
      text: FINALE_WORDS.text,
    },
  };
}
