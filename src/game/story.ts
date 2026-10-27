/**
 * Story beats: the Moon Wyrm's visions (shown once, on a warp out of
 * Mossvale or into a region), the words before a boss fight, and where
 * Vesper waits. Everything here is derived from saved flags, so it is
 * deterministic and survives a reload.
 */
import { MAPS } from '../data/maps';
import {
  PRELUDES,
  VESPER_ROUTE,
  VISIONS,
  reachedFlag,
  type VesperStop,
  type VisionDef,
} from '../data/story';
import type { NpcEntity } from '../world/map';
import type { GameState } from '../world/state';
import { FINALE_FLAG } from './ending';
import { pickVariant, variantsOf, type LineMemory } from './lines';

/** The voice the Moon Wyrm's words rotate under, visions and lair alike. */
export const WYRM_VOICE = 'wyrm';

/** The vision a warp from `from` to `to` shows, if one is due (each shows once). */
export function visionOnWarp(
  from: string,
  to: string,
  flags: ReadonlySet<string>,
): VisionDef | null {
  if (from === to) return null;
  const due = VISIONS.find(
    (vision) => !flags.has(vision.flag) && (vision.leaves === from || vision.enters === to),
  );
  return due ?? null;
}

/** An interlude to show over the map: the speaker's words, stage directions and all. */
export interface Interlude {
  readonly id: string;
  readonly text: string;
}

/**
 * Records arriving on the current map from `from` (a warp): marks the map
 * reached and any due vision seen, and returns that vision as an
 * interlude, its words rotated under the Wyrm's voice.
 */
export function arrive(state: GameState, from: string): Interlude | null {
  state.flags.add(reachedFlag(state.mapId));
  const vision = visionOnWarp(from, state.mapId, state.flags);
  if (!vision) return null;
  state.flags.add(vision.flag);
  return { id: vision.id, text: pickVariant(variantsOf(vision.lines), state.talk, WYRM_VOICE) };
}

/** What a monster says before its fight (the Wyrm in its lair), rotated; null for most. */
export function preludeFor(enemyId: string, memory: LineMemory): string | null {
  const lines = PRELUDES[enemyId];
  return lines ? pickVariant(variantsOf(lines), memory, WYRM_VOICE) : null;
}

/**
 * Where Vesper is: the last stop on the route whose flag the hero holds,
 * so always the newest step of the story. Nowhere before the first vision,
 * or once the Moon Wyrm has fallen.
 */
export function vesperStop(flags: ReadonlySet<string>): VesperStop | null {
  if (flags.has(FINALE_FLAG)) return null;
  const open = VESPER_ROUTE.filter((stop) => flags.has(stop.requiresFlag));
  return open.at(-1) ?? null;
}

/** Vesper, as an entity, when standing on the current map (and not on the hero's own tile). */
export function vesperEntities(state: Pick<GameState, 'flags' | 'mapId' | 'x' | 'y'>): NpcEntity[] {
  const stop = vesperStop(state.flags);
  const here = stop?.x === state.x && stop.y === state.y;
  return stop && stop.map === state.mapId && !here
    ? [{ id: `vesper:${stop.npcId}`, kind: 'npc', npcId: stop.npcId, x: stop.x, y: stop.y }]
    : [];
}

/** Maps a hero is past each vision on, for old saves (see `migrateStory`). */
const PAST: Readonly<Record<string, readonly string[]>> = {
  'vision:2': ['quarry', 'forge', 'peaks', 'cliffs', 'ruins', 'caves1', 'caves2'],
  'vision:3': ['peaks', 'cliffs', 'ruins', 'caves1', 'caves2'],
  [reachedFlag('ruins')]: ['ruins', 'caves1', 'caves2'],
};

/**
 * Story flags for a save from before the story beats (version 8): the
 * map the hero stands on counts as reached, and every vision whose place
 * they are already past counts as seen (the first, once they have left
 * Mossvale or done anything at all), so an old save is never shown a
 * vision out of order and Vesper waits where their story stands.
 */
export function migrateStory(flags: Set<string>, mapId: string, victories: number): void {
  const begun = mapId !== 'mossvale' || victories > 0 || flags.size > 0;
  if (MAPS[mapId]) flags.add(reachedFlag(mapId));
  if (begun) flags.add('vision:1');
  for (const [flag, maps] of Object.entries(PAST)) if (maps.includes(mapId)) flags.add(flag);
  if (flags.has(FINALE_FLAG)) for (const flag of Object.keys(PAST)) flags.add(flag);
}
