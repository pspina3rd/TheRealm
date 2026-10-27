import type { KeyValueStore } from './save';

/**
 * The store saves go to: the browser's `localStorage` (or `getPersistentStore`
 * in tests) once a probe write succeeds, leaving any existing probe value
 * as it was. When persistence is unavailable it falls back to an in-memory
 * store marked `persistent: false`, which the UI discloses as temporary.
 */
export function createStore(
  getPersistentStore: () => KeyValueStore = () => localStorage,
): KeyValueStore {
  try {
    const store = getPersistentStore();
    const probe = '__the-realm-probe__';
    const previous = store.getItem(probe);
    store.setItem(probe, probe);
    if (previous === null) store.removeItem(probe);
    else store.setItem(probe, previous);
    return store;
  } catch {
    const memory = new Map<string, string>();
    return {
      persistent: false,
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
      removeItem: (key) => void memory.delete(key),
    };
  }
}
