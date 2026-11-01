// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { bindBoardGestures } from '../src/ui/touch';

function board() {
  const node = document.createElement('canvas');
  document.body.append(node);
  vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({
    width: 300,
    height: 600,
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 300,
    bottom: 600,
    toJSON: () => ({}),
  });
  const apply = vi.fn();
  const input = bindBoardGestures(node, () => 10, apply);
  return { node, apply, input };
}
function pointer(node: HTMLElement, type: string, id: number, primary = true) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  for (const [key, value] of Object.entries({
    pointerId: id,
    pointerType: 'touch',
    isPrimary: primary,
    button: 0,
    clientX: 100,
    clientY: 100,
  }))
    Object.defineProperty(event, key, { value });
  node.dispatchEvent(event);
}

describe('touch interruption recovery', () => {
  it('accepts the next touch after capture is lost and release lands off the board', () => {
    const { node, apply, input } = board();
    pointer(node, 'pointerdown', 11);
    pointer(node, 'lostpointercapture', 11);
    expect(input.active).toBe(false);
    pointer(node, 'pointerdown', 22);
    pointer(node, 'pointerup', 22);
    expect(apply.mock.calls.map(([action]) => action)).toEqual(['rotate']);
  });
  it('recovers on a new primary touch even if the browser omitted the old ending events', () => {
    const { node, apply } = board();
    pointer(node, 'pointerdown', 11);
    pointer(node, 'pointerdown', 22);
    pointer(node, 'pointerup', 22);
    expect(apply.mock.calls.map(([action]) => action)).toEqual(['rotate']);
  });
  it('cancels held input on window blur without treating it as a tap', () => {
    const { node, apply, input } = board();
    pointer(node, 'pointerdown', 11);
    window.dispatchEvent(new Event('blur'));
    expect(input.active).toBe(false);
    expect(apply).not.toHaveBeenCalled();
    pointer(node, 'pointerdown', 22);
    pointer(node, 'pointerup', 22);
    expect(apply).toHaveBeenCalledExactlyOnceWith('rotate');
  });
  it('keeps genuine second-finger cancellation and next-piece lockout intact', () => {
    const { node, apply, input } = board();
    pointer(node, 'pointerdown', 11);
    pointer(node, 'pointerdown', 22, false);
    pointer(node, 'pointerup', 22, false);
    pointer(node, 'pointerup', 11);
    expect(apply).not.toHaveBeenCalled();
    pointer(node, 'pointerdown', 33);
    input.lockout();
    pointer(node, 'pointerup', 33);
    expect(apply).not.toHaveBeenCalled();
    pointer(node, 'pointerdown', 44);
    pointer(node, 'pointerup', 44);
    expect(apply).toHaveBeenCalledExactlyOnceWith('rotate');
  });
});
