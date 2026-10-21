import './style.css';
import type { KeyValueStore } from './game/save';
import { App } from './ui/app';
import { Atlas } from './ui/art/atlas';

/** Uses localStorage when available, otherwise an in-memory store (e.g. in private mode). */
function createStore(): KeyValueStore {
  try {
    const probe = '__the-realm-probe__';
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    const memory = new Map<string, string>();
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
      removeItem: (key) => void memory.delete(key),
    };
  }
}

async function main(): Promise<void> {
  const atlas = new Atlas();
  await atlas.load(`${import.meta.env.BASE_URL}assets/`);
  new App(atlas, createStore()).start();
}

void main();
