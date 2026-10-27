/**
 * The end of the chapter: beating the finale boss (the Moon Wyrm) sets
 * `FINALE_FLAG` and shows an epilogue of what the hero became.
 */
import type { Element } from '../core/elements';
import { MENTORS, type MentorDef } from '../data/mentors';
import { NPCS } from '../data/npcs';
import { SPELLS, STARTING_SPELLS } from '../data/spells';
import { heroClass, heroTitle, type Hero } from './hero';

/** Set once the finale boss falls; opens the Sunken Ruins' ward. */
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
  /** The mentors whose lessons the hero won (see `mentorsTaught`). */
  readonly mentors: readonly MentorDef[];
  readonly speaker: { readonly name: string; readonly sprite: string; readonly text: string };
}

/**
 * The mentors whose lessons the hero won, derived without a saved record:
 * only a lesson raises a spell past level 1, and only a lesson teaches a
 * spell that is neither a starting spell nor an NPC's reward. (A tome an
 * old save still holds could also teach one; that is the one exception.)
 */
export function mentorsTaught(hero: Hero): MentorDef[] {
  const elsewhere = new Set([
    heroClass(hero).spell,
    ...STARTING_SPELLS,
    ...Object.values(NPCS).flatMap((npc) =>
      npc.rewards.flatMap((r) => (r.kind === 'spell' ? [r.spellId] : [])),
    ),
  ]);
  const taught = new Set(
    Object.entries(hero.spells).flatMap(([id, known]) => {
      const spell = SPELLS[id];
      return spell && (known.level > 1 || !elsewhere.has(id)) ? [spell.category] : [];
    }),
  );
  return Object.values(MENTORS).filter((mentor) => taught.has(mentor.element));
}

/** The epilogue for this hero. */
export function epilogueFor(hero: Hero): Epilogue {
  const speaker = NPCS[FINALE_WORDS.npcId];
  return {
    title: heroTitle(hero),
    titleElement: hero.titleElement,
    classSprite: heroClass(hero).sprite,
    level: hero.level,
    spells: Object.keys(hero.spells).length,
    mentors: mentorsTaught(hero),
    speaker: {
      name: speaker?.name ?? '',
      sprite: speaker?.sprite ?? '',
      text: FINALE_WORDS.text,
    },
  };
}
