/**
 * Where the mentors are. Each walks a route of stops, starting at home:
 * stops gated by a story flag join once the hero has it, and the mentor
 * moves on one stop every `moveEvery` won world battles, wrapping round.
 * Their place is a pure function of the saved flags and win count, so it
 * is deterministic and a mentor is only ever in one place.
 */
import type { Element } from '../core/elements';
import { MENTORS, type MentorDef, type MentorStop } from '../data/mentors';
import type { MentorEntity } from './map';
import type { GameState } from './state';

/** The stops on a mentor's route the hero's story has opened, home first. */
export function openStops(mentor: MentorDef, flags: ReadonlySet<string>): MentorStop[] {
  return mentor.route.filter((stop) => !stop.requiresFlag || flags.has(stop.requiresFlag));
}

/** Where a mentor is after `victories` won world battles. */
export function mentorStop(
  mentor: MentorDef,
  flags: ReadonlySet<string>,
  victories: number,
): MentorStop {
  const stops = openStops(mentor, flags);
  return stops[Math.floor(victories / mentor.moveEvery) % stops.length] ?? mentor.route[0];
}

/** True when the mentor is at their first stop (where they summon a trial foe). */
export function isAtHome(mentor: MentorDef, stop: MentorStop): boolean {
  return stop === mentor.route[0];
}

/** The mentors standing on the current map, as entities the hero can walk into. */
export function mentorEntities(state: Pick<GameState, 'mapId' | 'flags' | 'victories'>) {
  return Object.values(MENTORS).flatMap((mentor): MentorEntity[] => {
    const stop = mentorStop(mentor, state.flags, state.victories);
    return stop.map === state.mapId
      ? [{ id: `mentor:${mentor.id}`, kind: 'mentor', mentorId: mentor.id, x: stop.x, y: stop.y }]
      : [];
  });
}

/** The mentor of `element`, if there is one. */
export function mentorOf(element: Element): MentorDef | undefined {
  return Object.values(MENTORS).find((mentor) => mentor.element === element);
}
