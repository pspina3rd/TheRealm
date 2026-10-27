import type { KeyValueStore } from './save';

/** Falls back to a visibly temporary store when browser persistence is unavailable. */
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
