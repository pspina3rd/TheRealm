/** Assert an invariant at an indexed lookup instead of silently losing board state. */
export function required<T>(value: T, message = 'Missing required game state.'): NonNullable<T> {
  if (value === null || value === undefined) throw new Error(message);
  return value;
}
