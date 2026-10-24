import { GestureRecognizer, type GestureAction } from './art/gestures';

/** Screens this narrow get the one-screen phone layout (see style.css). */
export const PHONE_QUERY = '(max-width: 760px)';

/** True when the phone layout is in use. */
export function isPhoneLayout(): boolean {
  return window.matchMedia(PHONE_QUERY).matches;
}

/** True when the player asked for less motion. */
export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A short buzz where the device supports it; never required. */
export function haptic(ms: number): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Some browsers throw when vibration is blocked; feedback is optional.
  }
}

/**
 * Board gestures (see `GestureRecognizer`) on `canvas`: pointer events
 * become piece moves passed to `apply`. `columns` is the board's width in
 * cells, so a column on screen is the canvas's width divided by it. Call
 * `tick` every frame (soft drop while held) and `lockout` when the piece
 * locks, so the rest of that touch can't move the next piece.
 */
export function bindBoardGestures(
  canvas: HTMLElement,
  columns: () => number,
  apply: (action: GestureAction) => void,
): { tick(timeMs: number): void; lockout(): void; readonly active: boolean } {
  const recognizer = new GestureRecognizer(1);
  let touch = false;
  const run = (actions: readonly GestureAction[]): void => {
    for (const action of actions) {
      apply(action);
      if (touch && (action === 'rotate' || action === 'hardDrop'))
        haptic(action === 'rotate' ? 8 : 18);
    }
  };
  canvas.addEventListener('pointerdown', (event) => {
    // Only the primary mouse button plays; right/middle clicks do nothing.
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    touch = event.pointerType === 'touch';
    recognizer.cellPx = canvas.getBoundingClientRect().width / Math.max(1, columns());
    // Keep the moves coming even if the finger slides off the board.
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // The pointer can already be gone (a rare race); the gesture still works without capture.
    }
    run(recognizer.down(event.pointerId, event.clientX, event.clientY, event.timeStamp));
  });
  canvas.addEventListener('pointermove', (event) => {
    run(recognizer.move(event.pointerId, event.clientX, event.clientY, event.timeStamp));
  });
  canvas.addEventListener('pointerup', (event) => {
    run(recognizer.up(event.pointerId, event.clientX, event.clientY, event.timeStamp));
  });
  canvas.addEventListener('pointercancel', (event) => recognizer.cancel(event.pointerId));
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  return {
    tick: (timeMs) => run(recognizer.tick(timeMs)),
    lockout: () => recognizer.lockout(),
    get active() {
      return recognizer.active;
    },
  };
}

/** Delay before a held button repeats, then the time between repeats. */
const HOLD_DELAY_MS = 170;
const HOLD_EVERY_MS = 55;

/**
 * Makes `node` act on press rather than release (faster under a thumb),
 * repeating while held when `repeats` is set. Keyboard activation (a click
 * with no pointer press before it) still works, once per press.
 */
export function bindPress(node: HTMLElement, onPress: () => void, repeats = false): void {
  let timer = 0;
  const stop = (): void => {
    window.clearTimeout(timer);
    timer = 0;
  };
  const repeat = (delay: number): void => {
    timer = window.setTimeout(() => {
      onPress();
      repeat(HOLD_EVERY_MS);
    }, delay);
  };
  node.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || (node as HTMLButtonElement).disabled) return;
    event.preventDefault(); // no focus ring or text selection from a thumb
    stop();
    onPress();
    if (event.pointerType === 'touch') haptic(6);
    if (repeats) repeat(HOLD_DELAY_MS);
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
    node.addEventListener(type, stop);
  }
  node.addEventListener('click', (event) => {
    // A pointer press already acted; only a keyboard click (detail 0) remains.
    if (event.detail === 0) onPress();
  });
}
