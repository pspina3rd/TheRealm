import { describe, expect, it } from 'vitest';
import { HeldToasts } from '../src/ui/heldToasts';

describe('toasts held under an interlude', () => {
  it('waits while the Refusal and Vision 1 cover the map, then shows each in order', () => {
    const toasts = new HeldToasts<string>();
    toasts.hold('Focus Stone received'); // as R4 ends
    toasts.hold('second');
    expect(toasts.next(false)).toBeUndefined(); // Vision 1 is open
    expect(toasts.next(false)).toBeUndefined();
    expect(toasts.next(true)).toBe('Focus Stone received'); // the map is clear
    expect(toasts.next(false)).toBeUndefined(); // the first is still showing
    expect(toasts.next(true)).toBe('second');
    expect(toasts.next(true)).toBeUndefined();
  });
});
