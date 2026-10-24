import { emptyCounts, type Element } from '../core/elements';
import { DEFAULT_CLASS } from '../data/classes';
import { MAPS, START } from '../data/maps';
import { titleElementFor } from './alignment';
import { heroAlignment, heroClass, refreshStats, type Hero } from './hero';
import { newKnownSpell, type KnownSpell } from './spells';
import type { Feats } from './feats';
import { SKILL_POINTS_PER_LEVEL, statRanks } from './stats';
import { tileAt, warpAt, type Direction, type Location } from '../world/map';
import type { GameState } from '../world/state';

export const SAVE_KEY = 'the-realm/save';
/**
 * Version history:
 * - 2 replaced MP with elemental mana and added attunement and charms.
 * - 3 replaced attunement with alignment and gave each class its own spell.
 * - 4 added stats and skill points; levels no longer raise mana, attack or defence.
 * - 5 gave spells levels and enhancements, and added locked categories.
 * - 6 added the count of monster battles won, which moves the mentors, and
 *   replaced locked categories with the lost lesson behind each lock.
 * - 7 added the hero's lifetime board feats, which reveal hidden spells.
 */
export const SAVE_VERSION = 7;
/** Older versions `deserialize` can still upgrade. */
const MIGRATABLE_VERSIONS: readonly number[] = [1, 2, 3, 4, 5, 6, SAVE_VERSION];

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
  /** Since version 6. */
  victories?: number;
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
    victories: state.victories,
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
  const respawn = standable(data.respawn) ? data.respawn : { ...START };
  const here = { map: data.mapId, x: data.x, y: data.y };
  const spot = standable(here) ? here : respawn;
  return {
    hero: migrateHero(data.hero),
    mapId: spot.map,
    x: spot.x,
    y: spot.y,
    facing: data.facing ?? 'down',
    flags: new Set(data.flags),
    cleared: new Set(),
    respawn,
    // Before version 6 wins were not counted: every mentor starts at home.
    victories: typeof data.victories === 'number' ? data.victories : 0,
  };
}

/**
 * True when the hero can stand at `at`: a walkable tile on a known map that
 * no warp sits on. Maps change as the world grows (the mentor regions
 * reshaped the Realm), so a saved spot that no longer is one sends the hero
 * to their inn, and a lost inn to the start.
 */
function standable(at: Location): boolean {
  const map = MAPS[at.map];
  return !!map && tileAt(map, at.x, at.y).walkable && !warpAt(map, at.x, at.y);
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
type StoredHero = Omit<Partial<Hero>, 'spells'> & {
  mp?: number;
  maxMp?: number;
  attunement?: Element | null;
  /** A list of spell ids before version 5. */
  spells?: string[] | Record<string, KnownSpell>;
  /** Version 5 only; nothing set it then, so it is dropped. */
  lockedCategories?: Element[];
};

/**
 * Brings a stored hero up to date:
 * - saves from before hero classes get the default class;
 * - version 1 MP becomes a full set of elemental pools;
 * - version 2 attunement is dropped: the hero learns their class's spell and
 *   keeps their attuned title until another element pulls ahead;
 * - before version 4 there were no stats: the hero gets the class's starting
 *   ranks and 2 unspent points per level gained, and max HP, mana, attack
 *   and defence are recomputed (levels now only add HP), with current HP and
 *   mana kept within the new caps;
 * - before version 5 spells were a list of ids: each becomes a level 1
 *   spell with no enhancements;
 * - before version 6 no lesson had been lost, so none locks a category;
 * - before version 7 no feats were counted, so the tally starts empty.
 */
function migrateHero(stored: StoredHero): Hero {
  const { mp, maxMp, attunement, ...rest } = stored;
  delete rest.lockedCategories;
  const classId = rest.classId ?? DEFAULT_CLASS;
  const cls = heroClass({ classId });
  const manaCap = rest.manaCap ?? maxMp ?? 12;
  const storedSpells = rest.spells ?? [];
  const spells = Array.isArray(storedSpells)
    ? Object.fromEntries(
        (storedSpells.includes(cls.spell) ? storedSpells : [cls.spell, ...storedSpells]).map(
          (id) => [id, newKnownSpell()],
        ),
      )
    : storedSpells;
  const hero: Hero = {
    ...(rest as Hero),
    classId,
    titleElement:
      rest.titleElement ?? titleElementFor(attunement ?? cls.element, heroAlignment({ spells })),
    spells,
    failedLessons: rest.failedLessons ?? {},
    feats: renamedFeats(rest.feats ?? {}),
    accessoryId: rest.accessoryId ?? null,
    manaCap,
    mana: rest.mana ?? emptyCounts(Math.min(mp ?? manaCap, manaCap)),
  };
  if (!rest.stats) {
    hero.stats = statRanks(cls.stats);
    hero.skillPoints = SKILL_POINTS_PER_LEVEL * (hero.level - 1);
    refreshStats(hero);
  }
  return hero;
}

/**
 * Version 7 saves called the hasted clear `hastedQuad` (it needed four
 * lines; it now needs three): its count carries over.
 */
function renamedFeats(feats: Feats & { hastedQuad?: number }): Feats {
  const { hastedQuad, ...rest } = feats;
  return hastedQuad ? { ...rest, hastedClear: (rest.hastedClear ?? 0) + hastedQuad } : rest;
}
