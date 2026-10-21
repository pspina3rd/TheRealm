import type { ImageId, Region } from './images';

/** A one-shot effect: frames are 32px cells read left to right, 6 per row. */
export interface EffectArt {
  readonly image: ImageId;
  readonly frames: number;
  readonly fps: number;
}

const CELL = 32;
const COLUMNS = 6;

export const EFFECTS = {
  fire: { image: 'vfx.fire', frames: 6, fps: 14 },
  meteor: { image: 'vfx.meteor', frames: 13, fps: 16 },
  thunder: { image: 'vfx.thunder', frames: 11, fps: 16 },
  ice: { image: 'vfx.ice', frames: 7, fps: 14 },
  heal: { image: 'vfx.heal', frames: 13, fps: 16 },
  hit: { image: 'vfx.hit', frames: 5, fps: 16 },
} as const satisfies Record<string, EffectArt>;

export type EffectId = keyof typeof EFFECTS;

/** Effect played for each spell (spells not listed play no effect). */
export const SPELL_EFFECTS: Readonly<Record<string, EffectId>> = {
  fire: 'fire',
  thunder: 'thunder',
  blizzard: 'ice',
  meteor: 'meteor',
  cure: 'heal',
};

/** Duration of an effect in milliseconds. */
export function effectDuration(id: EffectId): number {
  const effect: EffectArt = EFFECTS[id];
  return (effect.frames / effect.fps) * 1000;
}

/** The frame `elapsedMs` into an effect, or null once it has finished. */
export function effectFrame(id: EffectId, elapsedMs: number): Region | null {
  const effect: EffectArt = EFFECTS[id];
  const index = Math.floor((elapsedMs / 1000) * effect.fps);
  if (elapsedMs < 0 || index >= effect.frames) return null;
  return {
    image: effect.image,
    x: (index % COLUMNS) * CELL,
    y: Math.floor(index / COLUMNS) * CELL,
    w: CELL,
    h: CELL,
  };
}
