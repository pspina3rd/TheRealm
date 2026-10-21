import './style.css';
import type { KeyValueStore } from './game/save';
import { App } from './ui/app';
import { SpriteRegistry } from './ui/sprites';

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
  const sprites = new SpriteRegistry();
  await sprites.load(`${import.meta.env.BASE_URL}assets/`);
  new App(sprites, createStore()).start();
}

void main();
