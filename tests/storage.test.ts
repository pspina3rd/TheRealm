import { describe, expect, it } from 'vitest';
import { createStore } from '../src/game/storage';
import { loadGame, saveGame, type KeyValueStore } from '../src/game/save';
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
});
