import { emptyCounts } from '../core/elements';
import { DEFAULT_CLASS } from '../data/classes';
import { MAPS } from '../data/maps';
import type { Hero } from './hero';
import type { Direction, Location } from '../world/map';
import type { GameState } from '../world/state';

export const SAVE_KEY = 'the-realm/save';
/** Version 2 replaced MP with elemental mana and added attunement and charms. */
export const SAVE_VERSION = 2;

/** JSON-friendly form of `GameState` (sets become arrays). */
interface SaveData {
  version: number;
  hero: Hero;
  mapId: string;
  x: number;
  y: number;
  facing: Direction;
  flags: string[];
  respawn: Location;
}

/** Minimal storage interface so tests can supply an in-memory store. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function serialize(state: GameState): string {
  const data: SaveData = {
    version: SAVE_VERSION,
    hero: state.hero,
    mapId: state.mapId,
    x: state.x,
    y: state.y,
    facing: state.facing,
    flags: [...state.flags],
    respawn: state.respawn,
  };
  return JSON.stringify(data);
}

/** Parses a save string. Returns null if it is malformed or from another version. */
export function deserialize(json: string): GameState | null {
  let data: Partial<SaveData>;
  try {
    data = JSON.parse(json) as Partial<SaveData>;
  } catch {
    return null;
  }
  if (
    (data.version !== SAVE_VERSION && data.version !== 1) ||
    !data.hero ||
    typeof data.mapId !== 'string' ||
    !MAPS[data.mapId] ||
    typeof data.x !== 'number' ||
    typeof data.y !== 'number' ||
    !Array.isArray(data.flags) ||
    !data.respawn
  ) {
    return null;
  }
  return {
    hero: migrateHero(data.hero),
    mapId: data.mapId,
    x: data.x,
    y: data.y,
    facing: data.facing ?? 'down',
    flags: new Set(data.flags),
    cleared: new Set(),
    respawn: data.respawn,
  };
}

/** Saves to `store`. Storage can be unavailable (private mode); failures return false. */
export function saveGame(store: KeyValueStore, state: GameState): boolean {
  try {
    store.setItem(SAVE_KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(store: KeyValueStore): GameState | null {
  try {
    const json = store.getItem(SAVE_KEY);
    return json ? deserialize(json) : null;
  } catch {
    return null;
  }
}

export function deleteSave(store: KeyValueStore): void {
  try {
    store.removeItem(SAVE_KEY);
  } catch {
    // Nothing to delete if storage is unavailable.
  }
}

/** A hero as stored by any save version. */
type StoredHero = Partial<Hero> & { mp?: number; maxMp?: number };

/**
 * Brings a stored hero up to date: saves from before hero classes get the
 * default class, and version 1 MP becomes a full set of elemental pools.
 */
function migrateHero(stored: StoredHero): Hero {
  const { mp, maxMp, ...rest } = stored;
  const manaCap = rest.manaCap ?? maxMp ?? 12;
  return {
    ...(rest as Hero),
    classId: rest.classId ?? DEFAULT_CLASS,
    attunement: rest.attunement ?? null,
    accessoryId: rest.accessoryId ?? null,
    manaCap,
    mana: rest.mana ?? emptyCounts(Math.min(mp ?? manaCap, manaCap)),
  };
}
