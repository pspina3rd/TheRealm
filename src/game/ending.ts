/**
 * The end of Chapter One: beating the finale boss (the Moon Wyrm) sets
 * `FINALE_FLAG`; after the Wyrm's fall and the chapter's end (scenes in
 * `src/data/story.ts`), a summary shows what the hero became.
 */
import type { Element } from '../core/elements';
import { MENTORS, type MentorDef } from '../data/mentors';
import { NPCS } from '../data/npcs';
import { SPELLS, STARTING_SPELLS } from '../data/spells';
import { heroClass, heroTitle, type Hero } from './hero';
import {
  CAMPAIGN_FLAGS,
  CAMPAIGN_RECOVERY_FLAG,
  CAMPAIGN_SUMMARY_FLAG,
} from '../data/campaignFlags';

/** Set once the finale boss falls; the Sunken Ruins' seal stirs (see `Warp.stirs`). */
export { FINALE_FLAG } from '../data/story';

/** Full campaign victory, distinct from the Moon Wyrm's Chapter One ending. */
export const CAMPAIGN_COMPLETE_FLAG = CAMPAIGN_FLAGS.complete;

/** Victory is summarized only after the final recovery sequence is finished. */
export function campaignSummaryDue(flags: ReadonlySet<string>): boolean {
  return (
    flags.has(CAMPAIGN_COMPLETE_FLAG) &&
    flags.has(CAMPAIGN_RECOVERY_FLAG) &&
    !flags.has(CAMPAIGN_SUMMARY_FLAG)
  );
}

/** What the Chapter One summary shows. */
export interface Epilogue {
  /** Campaign completion uses the same earned-hero summary, with a different heading. */
  readonly campaign?: boolean;
  /** e.g. "Gale Ranger". */
  readonly title: string;
  readonly titleElement: Element;
  readonly classSprite: string;
  readonly level: number;
  /** How many spells the hero knows. */
  readonly spells: number;
  /** The mentors whose lessons the hero won (see `mentorsTaught`). */
  readonly mentors: readonly MentorDef[];
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

/** The Chapter One summary for this hero. */
export function epilogueFor(hero: Hero): Epilogue {
  return {
    title: heroTitle(hero),
    titleElement: hero.titleElement,
    classSprite: heroClass(hero).sprite,
    level: hero.level,
    spells: Object.keys(hero.spells).length,
    mentors: mentorsTaught(hero),
  };
}

/** The final-form victory summary, shown after the recovery scenes. */
export function campaignEpilogueFor(hero: Hero): Epilogue {
  return { ...epilogueFor(hero), campaign: true };
}
