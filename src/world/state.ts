import type { PendingAttempt } from '../game/encounterFlow';
import { MAPS, START } from '../data/maps';
import { createHero, type Hero } from '../game/hero';
import type { Direction, EntityDef, Location, MapDef } from './map';
import { mentorEntities } from './mentors';
import { vesperEntities } from '../game/story';
import type { LineMemory } from '../game/lines';
import { leaveTown, type EncounterRecord, type PriceChange } from '../game/stakes';

/** Everything needed to resume a game. */
export interface GameState {
  hero: Hero;
  mapId: string;
  x: number;
  y: number;
  facing: Direction;
  /** Permanent story flags, e.g. `cavePass`, `npc:sage`, `defeated:c2-wyrm`. */
  flags: Set<string>;
  /** Monsters beaten since entering the current map (they return when you leave). */
  cleared: Set<string>;
  /** Where the hero wakes after falling in battle (the last inn rested at). */
  respawn: Location;
  /** Monster battles won; mentors move on as it grows (see `src/world/mentors.ts`). */
  victories: number;
  /** How often each speaker's moments have been said, to rotate their lines (see `src/game/lines.ts`). */
  talk: LineMemory;
  /** Days ended (a day ends at an inn): once-a-day rules and markups count them. */
  day: number;
  /** Each person's regard for the hero, −2 to +2 (see `src/game/stakes.ts`)… */
  regard: Record<string, number>;
  /** …and the level their first won encounter left it at (repeat wins restore up to it). */
  regardPeak: Record<string, number>;
  /** Each encounter's strain, fails, wins and retry state, by encounter id. */
  encounters: Record<string, EncounterRecord>;
  /** Haggle discounts and markups, by shop id. */
  prices: Record<string, PriceChange>;
  /** An actual M1 try awaiting settlement; a reload abandons it as a failure. */
  pendingAttempt: PendingAttempt | null;
}

export function newGame(classId?: string, heroName?: string): GameState {
  return {
    hero: createHero(classId, heroName),
    mapId: START.map,
    x: START.x,
    y: START.y,
    facing: 'down',
    flags: new Set(),
    cleared: new Set(),
    respawn: { ...START },
    victories: 0,
    talk: {},
    day: 0,
    regard: {},
    regardPeak: {},
    encounters: {},
    prices: {},
    pendingAttempt: null,
  };
}

export function currentMap(state: GameState): MapDef {
  const map = MAPS[state.mapId];
  if (!map) throw new Error(`Unknown map: ${state.mapId}`);
  return map;
}

export function defeatedFlag(entityId: string): string {
  return `defeated:${entityId}`;
}

/** Entities on the current map that are still present, mentors included. */
export function activeEntities(state: GameState): EntityDef[] {
  const placed = currentMap(state).entities.filter((e) => {
    if (e.requiresFlag && !state.flags.has(e.requiresFlag)) return false;
    if (e.untilFlag && state.flags.has(e.untilFlag)) return false;
    if (e.kind !== 'monster') return true;
    return !state.cleared.has(e.id) && !state.flags.has(defeatedFlag(e.id));
  });
  return [...placed, ...vesperEntities(state), ...mentorEntities(state)];
}

/** Records a monster defeat (permanently for bosses) and counts the victory. */
export function markDefeated(state: GameState, entity: EntityDef): void {
  if (entity.kind !== 'monster') return;
  if (entity.boss) state.flags.add(defeatedFlag(entity.id));
  else state.cleared.add(entity.id);
  state.victories++;
}

/** Moves to a location, resetting temporary monster clears when the map changes. */
export function travel(state: GameState, to: Location): void {
  if (!MAPS[to.map]) throw new Error(`Unknown map: ${to.map}`);
  if (to.map !== state.mapId) {
    state.cleared.clear();
    leaveTown(state, to.map);
  }
  state.mapId = to.map;
  state.x = to.x;
  state.y = to.y;
}
