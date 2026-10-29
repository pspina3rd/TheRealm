/** Points for clearing `lines` at once. Multi-line clears are worth much more. */
export function lineClearPoints(lines: number): number {
  return lines > 0 ? 100 * lines * (lines + 1) : 0;
}

/** Points per row for a hard drop. */
export const HARD_DROP_POINTS_PER_ROW = 2;

/** Points per row for a soft drop. */
export const SOFT_DROP_POINTS_PER_ROW = 1;

// These pacing numbers are balance tunables. The core layer must not import
// `src/data`, so they live here and `src/data/balance.ts` re-exports them.

/** Gravity at level 1, in ms per row… */
export const GRAVITY_START_MS = 720;
/** …speeding up this much per level until `GRAVITY_STEEP_LEVELS`… */
export const GRAVITY_STEEP_STEP = 45;
/** Gravity speeds up `GRAVITY_STEEP_STEP` ms per level until this level… */
export const GRAVITY_STEEP_LEVELS = 7;
/** …and 20 ms per level after it, so the late regions stay playable. */
export const GRAVITY_LATE_STEP = 20;

/**
 * Milliseconds between gravity steps. Starts at 720 ms and speeds up by
 * 45 ms per level to level 7 (450 ms), then 20 ms per level, never faster
 * than 120 ms.
 */
export function gravityInterval(level: number): number {
  const steps = Math.max(1, level) - 1;
  const steep = Math.min(steps, GRAVITY_STEEP_LEVELS - 1);
  const late = steps - steep;
  return Math.max(120, GRAVITY_START_MS - steep * GRAVITY_STEEP_STEP - late * GRAVITY_LATE_STEP);
}

/** A piece's worth of time, for effects counted in pieces (Blizzard's freeze), in ms. */
export const PIECE_MS = 1500;
