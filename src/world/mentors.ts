/**
 * Where the mentors are. Each walks a route of stops, starting at home:
 * stops gated by a story flag join once the hero has it, and the mentor
 * moves on one stop every `moveEvery` won world battles, wrapping round.
 * Their place is a pure function of the saved flags and win count (and
 * where the hero stands), so it is deterministic and a mentor is only ever
 * in one place. A mentor never arrives on the hero's tile: while the hero
 * stands on their next stop they wait at the one before.
 *
 * A mentor who noticed a board feat of the hero's (a hidden spell revealed
 * by a pattern, still untaught) leaves the route and seeks the hero out:
 * they wait at their open stop closest to the hero's map, counted in map
 * crossings (an open stop on the hero's map first; the earlier stop on a
 * tie), never on the hero's own tile.
 */
import type { Element } from '../core/elements';
import { MAPS } from '../data/maps';
import { MENTORS, type MentorDef, type MentorStop } from '../data/mentors';
import { seeksHero } from '../game/hidden';
import type { Location, MentorEntity } from './map';
import type { GameState } from './state';

/** What a mentor's place depends on. */
type Whereabouts = Pick<GameState, 'hero' | 'mapId' | 'x' | 'y' | 'flags' | 'victories'>;

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

/**
 * The fewest warps from map `from` to map `to` (0 on the same map), or
 * Infinity if no warp leads there.
 */
export function mapDistance(from: string, to: string): number {
  const seen = new Map([[from, 0]]);
  const queue = [from];
  for (let map = queue.shift(); map !== undefined; map = queue.shift()) {
    const steps = seen.get(map) ?? 0;
    if (map === to) return steps;
    for (const warp of MAPS[map]?.warps ?? []) {
      if (!seen.has(warp.to.map)) {
        seen.set(warp.to.map, steps + 1);
        queue.push(warp.to.map);
      }
    }
  }
  return Infinity;
}

/**
 * Where a mentor who seeks the hero waits: the open stop fewest warps from
 * the hero's map (the earlier stop on a tie), but not the hero's own tile.
 */
export function seekingStop(
  mentor: MentorDef,
  flags: ReadonlySet<string>,
  hero: Location,
): MentorStop {
  const stops = openStops(mentor, flags);
  const free = stops.filter((s) => !(s.map === hero.map && s.x === hero.x && s.y === hero.y));
  const [first = mentor.route[0], ...rest] = free.length > 0 ? free : stops;
  const distance = (stop: MentorStop): number => mapDistance(hero.map, stop.map);
  return rest.reduce((best, stop) => (distance(stop) < distance(best) ? stop : best), first);
}

/**
 * Where a mentor is in this game, given the wins, flags and the hero's
 * tile, or near the hero while the mentor seeks them out.
 */
export function mentorPlace(mentor: MentorDef, state: Whereabouts): MentorStop {
  const hero = { map: state.mapId, x: state.x, y: state.y };
  return seeksHero(mentor, state)
    ? seekingStop(mentor, state.flags, hero)
    : mentorStop(mentor, state.flags, state.victories, hero);
}

/** True when the mentor is at their first stop (where they summon a trial foe). */
export function isAtHome(mentor: MentorDef, stop: MentorStop): boolean {
  return stop === mentor.route[0];
}

/** The mentors standing on the current map, as entities the hero can walk into. */
export function mentorEntities(state: Whereabouts) {
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
