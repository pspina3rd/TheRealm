import type { BattleAction } from '../battle/battle';

/** Keys that move and drop the falling piece. */
const KEY_BATTLE: Readonly<Record<string, BattleAction>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'rotate',
  x: 'rotate',
  ArrowDown: 'softDrop',
  ' ': 'hardDrop',
};

/** What a key press does in battle (see `battleKey`). */
export type BattleKey =
  | { readonly kind: 'input'; readonly action: BattleAction }
  | { readonly kind: 'pause' }
  | { readonly kind: 'pick'; readonly slot: number }
  | { readonly kind: 'back' };

/** Lower-cases single letters so WASD and P work with Caps Lock or Shift. */
export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

/**
 * The battle command for a key press, or null for none. Piece moves repeat
 * while held; P does not, so holding it spends one pause rather than
 * toggling (and spending pauses) on every repeat.
 */
export function battleKey(rawKey: string, repeat: boolean): BattleKey | null {
  const key = normalizeKey(rawKey);
  const action = KEY_BATTLE[key];
  if (action) return { kind: 'input', action };
  if (key === 'p') return repeat ? null : { kind: 'pause' };
  // A category, then a spell in its menu.
  if (/^[1-9]$/.test(key)) return { kind: 'pick', slot: Number(key) };
  return key === 'Escape' ? { kind: 'back' } : null;
}
