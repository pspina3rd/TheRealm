import { emptyCounts, type Element } from '../core/elements';
import { DEFAULT_CLASS } from '../data/classes';
import { MAPS } from '../data/maps';
import { titleElementFor } from './alignment';
import { heroAlignment, heroClass, type Hero } from './hero';
import type { Direction, Location } from '../world/map';
import type { GameState } from '../world/state';

export const SAVE_KEY = 'the-realm/save';
/**
 * Version history:
 * - 2 replaced MP with elemental mana and added attunement and charms.
 * - 3 replaced attunement with alignment and gave each class its own spell.
 */
export const SAVE_VERSION = 3;
/** Older versions `deserialize` can still upgrade. */
const MIGRATABLE_VERSIONS: readonly number[] = [1, 2, SAVE_VERSION];

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
    !MIGRATABLE_VERSIONS.includes(data.version ?? 0) ||
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
type StoredHero = Partial<Hero> & { mp?: number; maxMp?: number; attunement?: Element | null };

/**
 * Brings a stored hero up to date:
 * - saves from before hero classes get the default class;
 * - version 1 MP becomes a full set of elemental pools;
 * - version 2 attunement is dropped: the hero learns their class's spell and
 *   keeps their attuned title until another element pulls ahead.
 */
function migrateHero(stored: StoredHero): Hero {
  const { mp, maxMp, attunement, ...rest } = stored;
  const classId = rest.classId ?? DEFAULT_CLASS;
  const cls = heroClass({ classId });
  const manaCap = rest.manaCap ?? maxMp ?? 12;
  const known = rest.spells ?? [];
  const spells = known.includes(cls.spell) ? known : [cls.spell, ...known];
  return {
    ...(rest as Hero),
    classId,
    titleElement:
      rest.titleElement ?? titleElementFor(attunement ?? cls.element, heroAlignment({ spells })),
    spells,
    accessoryId: rest.accessoryId ?? null,
    manaCap,
    mana: rest.mana ?? emptyCounts(Math.min(mp ?? manaCap, manaCap)),
  };
}
