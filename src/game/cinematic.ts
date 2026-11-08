/**
 * Illustrated story scenes ("cinematics"): a run of shots, each a short timed animation with the
 * words shown beneath it. This module holds the platform-neutral model and its timing rules; the
 * web view draws it (`src/ui/cinematicView.ts`) and the iPhone book can follow the same data.
 */
import type { Direction } from '../world/map';

/** One point on a timeline: `value` at `at` milliseconds into the shot. */
export interface TrackKey {
  readonly at: number;
  readonly value: number;
}

/** A value over time, interpolated linearly between keys and held before the first and after the last. */
export type Track = readonly TrackKey[];

/** A track that never changes. */
export const steady = (value: number): Track => [{ at: 0, value }];

/** Where an actor is at a moment of the shot. Facing and walking hold until the next key. */
export interface ActorKey {
  readonly at: number;
  readonly x: number;
  readonly y: number;
  readonly facing: Direction;
  readonly walking?: boolean;
}

/** A character on stage: a sprite sheet and its path through the shot. */
export interface CinematicActor {
  /** A creature id from `src/ui/art/creatures.ts`. */
  readonly sprite: string;
  readonly keys: readonly ActorKey[];
  /** Carries a lit lantern: the darkness opens around this actor. */
  readonly lantern?: boolean;
}

export type CinematicSetting = 'hill' | 'house' | 'memory';

/** The seven standing stones, in the order they go out: violet first, red last. */
export const STONE_ORDER = [
  'arcane',
  'water',
  'wind',
  'nature',
  'lightning',
  'earth',
  'fire',
] as const;

/** One of the seven stones, named by its school of magic. */
export type StoneElement = (typeof STONE_ORDER)[number];

export interface CinematicShot {
  readonly id: string;
  readonly setting: CinematicSetting;
  /** The words shown beneath the picture. Paragraphs are separated by blank lines. */
  readonly text: string;
  readonly durationMs: number;
  readonly actors: readonly CinematicActor[];
  /** Brightness of each stone, 0 (out) to 1 (lit), in `STONE_ORDER`. Absent: no stones on stage. */
  readonly stones?: readonly Track[];
  /** How dark the night is, 0 (none) to 1 (black). */
  readonly darkness: Track;
  /** Black over everything, 0 to 1, for fades. */
  readonly fade?: Track;
  /** The house door: 0 shut, 1 open. */
  readonly door?: Track;
  /** How hard the house door shakes, in pixels. */
  readonly doorShake?: Track;
}

/** The value of `track` at `t` milliseconds. */
export function sample(track: Track, t: number): number {
  const first = track[0];
  if (!first) return 0;
  if (t <= first.at) return first.value;
  for (let i = 1; i < track.length; i++) {
    const prev = track[i - 1] as TrackKey;
    const next = track[i] as TrackKey;
    if (t <= next.at) {
      const span = next.at - prev.at;
      return span === 0
        ? next.value
        : prev.value + ((t - prev.at) / span) * (next.value - prev.value);
    }
  }
  return (track[track.length - 1] as TrackKey).value;
}

/** An actor's position, facing and gait at `t` milliseconds. */
export interface ActorPose {
  readonly x: number;
  readonly y: number;
  readonly facing: Direction;
  readonly walking: boolean;
}

/** Where `actor` is at `t`: moving in a straight line between keys, facing as the last key passed. */
export function actorPose(actor: CinematicActor, t: number): ActorPose {
  const keys = actor.keys;
  const first = keys[0];
  if (!first) throw new Error(`Actor ${actor.sprite} has no keys`);
  let prev = first;
  for (const key of keys) {
    if (key.at > t) {
      const span = key.at - prev.at;
      const k = span === 0 ? 1 : (t - prev.at) / span;
      return {
        x: prev.x + k * (key.x - prev.x),
        y: prev.y + k * (key.y - prev.y),
        facing: prev.facing,
        walking: prev.walking ?? false,
      };
    }
    prev = key;
  }
  return { x: prev.x, y: prev.y, facing: prev.facing, walking: prev.walking ?? false };
}

/** Every key time in a shot, for checking that nothing happens after it ends. */
export function shotKeyTimes(shot: CinematicShot): number[] {
  const tracks = [
    shot.darkness,
    shot.fade ?? [],
    shot.door ?? [],
    shot.doorShake ?? [],
    ...(shot.stones ?? []),
  ];
  return [
    ...tracks.flatMap((track) => track.map((key) => key.at)),
    ...shot.actors.flatMap((actor) => actor.keys.map((key) => key.at)),
  ];
}
