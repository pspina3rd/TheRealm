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

/** A vision to show over the map: which one (to dismiss it) and the Wyrm's words. */
export interface Interlude {
  readonly id: string;
  readonly text: string;
}

/**
 * Set while a shown vision is still on screen, with the variant shown
 * (`pending:<vision>:<n>`), so a reload shows the same words again.
 */
export function pendingFlag(visionId: string, variant: number): string {
  return `pending:${visionId}:${variant}`;
}

/**
 * Records arriving on the current map from `from` (a warp): marks the map
 * reached and any due vision seen (and pending until dismissed), and
 * returns that vision as an interlude, its words rotated under the Wyrm's
 * voice.
 */
export function arrive(state: GameState, from: string): Interlude | null {
  state.flags.add(reachedFlag(state.mapId));
  const vision = visionOnWarp(from, state.mapId, state.flags);
  if (!vision) return null;
  const lines = variantsOf(vision.lines);
  const variant = (state.talk[WYRM_VOICE] ?? 0) % lines.length;
  const text = pickVariant(lines, state.talk, WYRM_VOICE);
  state.flags.add(vision.flag);
  state.flags.add(pendingFlag(vision.id, variant));
  return { id: vision.id, text };
}

/** The pending flag of a vision, if it is pending. */
function pendingOf(flags: ReadonlySet<string>, visionId: string): string | undefined {
  return [...flags].find((flag) => flag.startsWith(`pending:${visionId}:`));
}

/**
 * The vision shown but never dismissed (the game was closed on it), to
 * show again, word for word; the rotation doesn't move.
 */
export function pendingVision(state: GameState): Interlude | null {
  for (const vision of VISIONS) {
    const flag = pendingOf(state.flags, vision.id);
    if (!flag) continue;
    const lines = variantsOf(vision.lines);
    const variant = Number(flag.split(':')[2]) || 0;
    return { id: vision.id, text: lines[variant % lines.length] ?? lines[0] ?? '...' };
  }
  return null;
}

/** The hero dismissed the vision. */
export function dismissVision(state: GameState, visionId: string): void {
  const flag = pendingOf(state.flags, visionId);
  if (flag) state.flags.delete(flag);
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

/**
 * The story's steps in order, for old saves (see `migrateStory`): the flags
 * a step sets, the maps that show the hero is past it and the progress
 * flags that prove it.
 */
const STEPS: readonly {
  readonly sets: readonly string[];
  readonly maps: readonly string[];
  readonly proof: readonly string[];
}[] = [
  { sets: ['vision:1'], maps: [], proof: [] },
  {
    sets: ['vision:2', reachedFlag('quarry')],
    maps: ['quarry', 'forge'],
    proof: ['ridgeCleared'],
  },
  { sets: ['vision:3', reachedFlag('peaks')], maps: ['peaks', 'cliffs'], proof: ['peakGate'] },
  {
    sets: [reachedFlag('ruins')],
    maps: ['ruins', 'caves1', 'caves2'],
    proof: ['cavePass', 'ruinsOpen', FINALE_FLAG, 'defeated:c2-wyrm'],
  },
];

/**
 * Story flags for a save from before the story beats (version 8). The
 * furthest step the hero is past (by the map they stand on or a progress
 * flag: the ridge cleared, the peak gate's key, the Cave Pass, the Wyrm
 * beaten) counts as seen, with every step before it; the first counts once
 * they have left Mossvale or done anything at all. So an old save is never
 * shown a vision out of order, and Vesper waits where their story stands.
 */
export function migrateStory(flags: Set<string>, mapId: string, victories: number): void {
  const begun = mapId !== 'mossvale' || victories > 0 || flags.size > 0;
  const past = (step: (typeof STEPS)[number]): boolean =>
    step.maps.includes(mapId) || step.proof.some((flag) => flags.has(flag));
  const furthest = STEPS.reduce((best, step, i) => (past(step) ? i : best), -1);
  const reached = Math.max(furthest, begun ? 0 : -1);
  if (MAPS[mapId]) flags.add(reachedFlag(mapId));
  for (const step of STEPS.slice(0, reached + 1)) for (const flag of step.sets) flags.add(flag);
}
