/** Points for clearing `lines` at once. Multi-line clears are worth much more. */
export function lineClearPoints(lines: number): number {
  return lines > 0 ? 100 * lines * (lines + 1) : 0;
}

/** Points per row for a hard drop. */
export const HARD_DROP_POINTS_PER_ROW = 2;

/** Points per row for a soft drop. */
export const SOFT_DROP_POINTS_PER_ROW = 1;

/**
 * Milliseconds between gravity steps. Starts at 720 ms and speeds up by
 * 45 ms per level, never faster than 120 ms.
 */
export function gravityInterval(level: number): number {
  return Math.max(120, 720 - (Math.max(1, level) - 1) * 45);
}

/** A piece's worth of time, for effects counted in pieces (Blizzard's freeze), in ms. */
export const PIECE_MS = 1500;
