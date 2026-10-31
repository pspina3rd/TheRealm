// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { haptic } from '../src/ui/touch';
afterEach(() => {
  document.body.classList.remove('haptics-on');
  vi.restoreAllMocks();
});
describe('optional vibration', () => {
  it('is silent until explicitly enabled and tolerates unsupported devices', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
    haptic(18);
    expect(vibrate).not.toHaveBeenCalled();
    document.body.classList.add('haptics-on');
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    haptic(18);
    haptic(32);
    expect(vibrate).toHaveBeenCalledExactlyOnceWith(18);
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: undefined });
    expect(() => haptic(32)).not.toThrow();
  });
  it('ignores hidden screens, bounds pulses and tolerates browser rejection', () => {
    document.body.classList.add('haptics-on');
    vi.spyOn(performance, 'now').mockReturnValue(2000);
    const vibrate = vi.fn(() => {
      throw new Error('Unavailable');
    });
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    haptic(1000);
    expect(vibrate).not.toHaveBeenCalled();
    hidden.mockReturnValue(false);
    expect(() => haptic(1000)).not.toThrow();
    expect(vibrate).toHaveBeenCalledExactlyOnceWith(45);
  });
});
