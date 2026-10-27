// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { bindPress } from '../src/ui/touch';

/** A button bound with `bindPress`, and how often it acted. */
function pressable(): { node: HTMLButtonElement; presses: () => number } {
  const node = document.createElement('button');
  const onPress = vi.fn();
  bindPress(node, onPress);
  return { node, presses: () => onPress.mock.calls.length };
}

const fire = (node: HTMLElement, type: string, detail = 0): void => {
  node.dispatchEvent(new MouseEvent(type, { button: 0, detail, bubbles: true }));
};

/** A tap or mouse click: press, release, then the browser's click. */
const tap = (node: HTMLElement, clickDetail = 0): void => {
  fire(node, 'pointerdown');
  fire(node, 'pointerup');
  fire(node, 'click', clickDetail);
};

describe('bindPress', () => {
  it('acts once for a touch tap whose click has detail 0 (Chromium)', () => {
    const { node, presses } = pressable();
    tap(node, 0);
    expect(presses()).toBe(1);
  });

  it('acts once for a mouse click (detail 1)', () => {
    const { node, presses } = pressable();
    tap(node, 1);
    expect(presses()).toBe(1);
  });

  it('acts once for keyboard activation with no pointer press before it', () => {
    const { node, presses } = pressable();
    fire(node, 'click', 0);
    expect(presses()).toBe(1);
  });

  it('acts twice for two separate taps, and a keyboard press after a tap still acts', () => {
    const { node, presses } = pressable();
    tap(node);
    tap(node);
    expect(presses()).toBe(2);
    fire(node, 'click', 0);
    expect(presses()).toBe(3);
  });

  it('ignores presses on a disabled button', () => {
    const { node, presses } = pressable();
    node.disabled = true;
    fire(node, 'pointerdown');
    expect(presses()).toBe(0);
  });
});
