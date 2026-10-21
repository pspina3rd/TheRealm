import { MAPS, START } from '../data/maps';
import { createHero, type Hero } from '../game/hero';
import type { Direction, EntityDef, Location, MapDef } from './map';

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

/** Entities on the current map that are still present. */
export function activeEntities(state: GameState): EntityDef[] {
  return currentMap(state).entities.filter((e) => {
    if (e.kind !== 'monster') return true;
    return !state.cleared.has(e.id) && !state.flags.has(defeatedFlag(e.id));
  });
}

/** Records a monster defeat (permanently for bosses). */
export function markDefeated(state: GameState, entity: EntityDef): void {
  if (entity.kind !== 'monster') return;
  if (entity.boss) state.flags.add(defeatedFlag(entity.id));
  else state.cleared.add(entity.id);
}

/** Moves to a location, resetting temporary monster clears when the map changes. */
export function travel(state: GameState, to: Location): void {
  if (!MAPS[to.map]) throw new Error(`Unknown map: ${to.map}`);
  if (to.map !== state.mapId) state.cleared.clear();
  state.mapId = to.map;
  state.x = to.x;
  state.y = to.y;
}
