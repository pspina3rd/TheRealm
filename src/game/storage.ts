import type { KeyValueStore } from './save';

/** Falls back to a visibly temporary store when browser persistence is unavailable. */
export function createStore(
  getPersistentStore: () => KeyValueStore = () => localStorage,
): KeyValueStore {
  let source: KeyValueStore | undefined;
  try {
    source = getPersistentStore();
    const probe = '__the-realm-probe__';
    const previous = source.getItem(probe);
    // Never overwrite an existing value with the probe: a subsequent failure
    // could otherwise prevent us from restoring it.
    source.setItem(probe, previous ?? probe);
    if (previous === null) source.removeItem(probe);
    return source;
  } catch {
    // A full quota can block writes while old saves remain readable. Keep
    // those reads, with session-only writes and deletion tombstones on top.
    const memory = new Map<string, string | null>();
    return {
      persistent: false,
      getItem: (key) => {
        if (memory.has(key)) return memory.get(key) ?? null;
        try {
          return source?.getItem(key) ?? null;
        } catch {
          return null;
        }
      },
      setItem: (key, value) => void memory.set(key, value),
      removeItem: (key) => void memory.set(key, null),
    };
  }
}
