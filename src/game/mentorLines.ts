/**
 * What a mentor says when the hero walks up to them: one of the script's
 * rows, chosen from what the hero and the mentor have been through (see
 * "Mentors" in docs/GAME_DESIGN.md), said in the hero's mood with the
 * mentor's element and rotating like any line.
 */
import type { MentorDef } from '../data/mentors';
import { mentorPlace } from '../world/mentors';
import type { GameState } from '../world/state';
import { attitudeToward, moodFor } from './attitude';
import { mentorsTaught } from './ending';
import { seeksHero } from './hidden';
import { pickVariant, speak, variantsOf } from './lines';
import { isCategoryLocked } from './spells';

/** Which of the mentor's rows is said. */
export type MentorMoment = 'failedLesson' | 'seeks' | 'arrives' | 'afterLesson' | 'motive';

/** Records that the hero last talked with `mentorId` at route stop `stop`. */
export function metFlag(mentorId: string, stop: number): string {
  return `met:${mentorId}:${stop}`;
}

/** The stop where the hero last talked with the mentor, as its flag, if they ever have. */
function lastMet(flags: ReadonlySet<string>, mentor: MentorDef): string | undefined {
  return [...flags].find((flag) => flag.startsWith(`met:${mentor.id}:`));
}

/**
 * The row said now, first that applies:
 * - *If you failed their lesson* while their category is locked;
 * - *Seeks you out* while they seek the hero (a board feat they noticed);
 * - *Arrives somewhere new* on the first talk since they moved to a new
 *   stop away from home (once the hero has met them somewhere else);
 * - *After the lesson* once a lesson of theirs is won;
 * - otherwise why they teach (the motive, said on meeting).
 */
export function mentorMoment(state: GameState, mentor: MentorDef): MentorMoment {
  if (isCategoryLocked(state.hero, mentor.element)) return 'failedLesson';
  if (seeksHero(mentor, state)) return 'seeks';
  const stop = mentor.route.indexOf(mentorPlace(mentor, state));
  const met = lastMet(state.flags, mentor);
  if (met !== undefined && stop > 0 && met !== metFlag(mentor.id, stop)) return 'arrives';
  if (mentorsTaught(state.hero).includes(mentor)) return 'afterLesson';
  return 'motive';
}

/**
 * What the mentor says as the hero walks up, rotated and counted, and
 * where they met recorded (so *Arrives* is said once per new stop).
 */
export function mentorGreeting(state: GameState, mentor: MentorDef): string {
  const moment = mentorMoment(state, mentor);
  const met = lastMet(state.flags, mentor);
  if (met !== undefined) state.flags.delete(met);
  state.flags.add(metFlag(mentor.id, mentor.route.indexOf(mentorPlace(mentor, state))));
  const key = `${mentor.id}.${moment}`;
  if (moment === 'motive') return pickVariant(variantsOf(mentor.motive), state.talk, key);
  const mood = moodFor(attitudeToward(state.hero, mentor.element));
  return speak(mentor[moment], mood, state.talk, key);
}
