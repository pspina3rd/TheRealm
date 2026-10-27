import { describe, expect, it } from 'vitest';
import { createStore } from '../src/game/storage';
import { deleteSave, loadGame, saveGame, type KeyValueStore } from '../src/game/save';
import { newGame } from '../src/world/state';

function memory(): KeyValueStore {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

describe('browser storage selection', () => {
  it('keeps durable adapters compatible and preserves an existing probe key', () => {
    const durable = memory();
    durable.setItem('__the-realm-probe__', 'existing');
    const selected = createStore(() => durable);
    expect(selected).toBe(durable);
    expect(durable.getItem('__the-realm-probe__')).toBe('existing');
    expect(saveGame(selected, newGame())).toBe(true);
    expect(loadGame(selected)?.mapId).toBe('mossvale');
  });

  it('removes its probe when storage was initially empty', () => {
    const durable = memory();
    createStore(() => durable);
    expect(durable.getItem('__the-realm-probe__')).toBeNull();
  });

  it('keeps a temporary session playable without claiming a durable save', () => {
    const inaccessible = (): never => {
      throw new Error('Access denied');
    };
    const selected = createStore(inaccessible);
    expect(selected.persistent).toBe(false);
    const state = newGame();
    state.hero.gil = 123;
    expect(saveGame(selected, state)).toBe(false);
    expect(loadGame(selected)?.hero.gil).toBe(123);
    expect(loadGame(createStore(inaccessible))).toBeNull();
  });

  it('uses a temporary session when the persistence probe cannot write', () => {
    const selected = createStore(() => ({
      ...memory(),
      setItem: () => {
        throw new Error('Quota exceeded');
      },
    }));
    expect(selected.persistent).toBe(false);
    expect(saveGame(selected, newGame())).toBe(false);
    expect(loadGame(selected)).not.toBeNull();
  });

  it('resumes readable saves after quota failure and keeps changes and deletes session-only', () => {
    const durable = memory();
    const state = newGame('mage');
    state.hero.gil = 123;
    saveGame(durable, state);
    const readOnly: KeyValueStore = {
      ...durable,
      setItem: () => {
        throw new Error('Quota exceeded');
      },
      removeItem: () => {
        throw new Error('Storage is read-only');
      },
    };
    const selected = createStore(() => readOnly);
    expect(selected.persistent).toBe(false);
    expect(loadGame(selected)?.hero).toEqual(state.hero);
    state.hero.gil = 456;
    expect(saveGame(selected, state)).toBe(false);
    expect(loadGame(selected)?.hero.gil).toBe(456);
    expect(loadGame(durable)?.hero.gil).toBe(123);
    deleteSave(selected);
    expect(loadGame(selected)).toBeNull();
    expect(loadGame(durable)?.hero.gil).toBe(123);
    const reloaded = createStore(() => readOnly);
    expect(loadGame(reloaded)?.hero.gil).toBe(123);
    // A session write can replace its own deletion tombstone.
    expect(saveGame(selected, state)).toBe(false);
    expect(loadGame(selected)?.hero.gil).toBe(456);
  });

  it('contains source read errors while preserving temporary writes and deletions', () => {
    const selected = createStore(() => ({
      getItem: () => {
        throw new Error('Reads blocked');
      },
      setItem: () => {
        throw new Error('Writes blocked');
      },
      removeItem: () => {
        throw new Error('Deletes blocked');
      },
    }));
    expect(selected.getItem('setting')).toBeNull();
    selected.setItem('setting', '1');
    expect(selected.getItem('setting')).toBe('1');
    selected.removeItem('setting');
    expect(selected.getItem('setting')).toBeNull();
  });

  it('does not replace an existing probe value even when later operations would fail', () => {
    const durable = memory();
    const key = '__the-realm-probe__';
    durable.setItem(key, 'existing');
    const selected = createStore(() => ({
      ...durable,
      setItem: (name, value) => {
        if (value !== 'existing') throw new Error('Unexpected probe replacement');
        durable.setItem(name, value);
      },
      removeItem: () => {
        throw new Error('Cannot restore after deletion');
      },
    }));
    expect(selected.persistent).not.toBe(false);
    expect(durable.getItem(key)).toBe('existing');
  });
});
