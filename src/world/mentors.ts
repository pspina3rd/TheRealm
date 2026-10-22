/**
 * Where the mentors are. Each walks a route of stops, starting at home:
 * stops gated by a story flag join once the hero has it, and the mentor
 * moves on one stop every `moveEvery` won world battles, wrapping round.
 * Their place is a pure function of the saved flags and win count (and
 * where the hero stands), so it is deterministic and a mentor is only ever
 * in one place. A mentor never arrives on the hero's tile: while the hero
 * stands on their next stop they wait at the one before.
 */
import type { Element } from '../core/elements';
import { MENTORS, type MentorDef, type MentorStop } from '../data/mentors';
import type { Location, MentorEntity } from './map';
import type { GameState } from './state';

/** The stops on a mentor's route the hero's story has opened, home first. */
export function openStops(mentor: MentorDef, flags: ReadonlySet<string>): MentorStop[] {
  return mentor.route.filter((stop) => !stop.requiresFlag || flags.has(stop.requiresFlag));
}

/**
 * Where a mentor is after `victories` won world battles. If `hero` stands
 * on that stop, the mentor is still at the stop before it.
 */
export function mentorStop(
  mentor: MentorDef,
  flags: ReadonlySet<string>,
  victories: number,
  hero?: Location,
): MentorStop {
  const stops = openStops(mentor, flags);
  const index = Math.floor(victories / mentor.moveEvery) % stops.length;
  const stop = stops[index] ?? mentor.route[0];
  const occupied = hero && stop.map === hero.map && stop.x === hero.x && stop.y === hero.y;
  return occupied ? (stops.at(index - 1) ?? stop) : stop;
}

/** Where a mentor is in this game, given the wins, flags and the hero's tile. */
export function mentorPlace(
  mentor: MentorDef,
  state: Pick<GameState, 'mapId' | 'x' | 'y' | 'flags' | 'victories'>,
): MentorStop {
  return mentorStop(mentor, state.flags, state.victories, {
    map: state.mapId,
    x: state.x,
    y: state.y,
  });
}

/** True when the mentor is at their first stop (where they summon a trial foe). */
export function isAtHome(mentor: MentorDef, stop: MentorStop): boolean {
  return stop === mentor.route[0];
}

/** The mentors standing on the current map, as entities the hero can walk into. */
export function mentorEntities(
  state: Pick<GameState, 'mapId' | 'x' | 'y' | 'flags' | 'victories'>,
) {
  return Object.values(MENTORS).flatMap((mentor): MentorEntity[] => {
    const stop = mentorPlace(mentor, state);
    return stop.map === state.mapId
      ? [{ id: `mentor:${mentor.id}`, kind: 'mentor', mentorId: mentor.id, x: stop.x, y: stop.y }]
      : [];
  });
}

/** The mentor of `element`, if there is one. */
export function mentorOf(element: Element): MentorDef | undefined {
  return Object.values(MENTORS).find((mentor) => mentor.element === element);
}
