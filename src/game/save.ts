import { ELEMENTS, emptyCounts, type Element } from '../core/elements';
import { CLASSES, DEFAULT_CLASS } from '../data/classes';
import { MAPS, START } from '../data/maps';
import { ITEMS } from '../data/items';
import { ENHANCEMENT_IDS, SPELLS } from '../data/spells';
import { STATS, STAT_IDS } from '../data/stats';
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
  /** False for a temporary session store; omitted means persistent for existing adapters. */
  readonly persistent?: boolean;
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
  try {
    const decoded: unknown = JSON.parse(json);
    if (!record(decoded)) return null;
    const data = decoded as Partial<SaveData>;
    if (
      !MIGRATABLE_VERSIONS.includes(data.version ?? 0) ||
      !record(data.hero) ||
      typeof data.mapId !== 'string' ||
      !Object.hasOwn(MAPS, data.mapId) ||
      !integer(data.x) ||
      !integer(data.y) ||
      !Array.isArray(data.flags) ||
      !data.flags.every((flag) => typeof flag === 'string') ||
      !record(data.respawn) ||
      (data.facing !== undefined && !['up', 'down', 'left', 'right'].includes(data.facing)) ||
      (data.victories !== undefined && !count(data.victories))
    ) {
      return null;
    }
    const hero = migrateHero(data.hero);
    if (!validHero(hero)) return null;
    const respawn = standable(data.respawn) ? data.respawn : { ...START };
    const here = { map: data.mapId, x: data.x, y: data.y };
    const spot = standable(here) ? here : respawn;
    return {
      hero,
      mapId: spot.map,
      x: spot.x,
      y: spot.y,
      facing: data.facing ?? 'down',
      flags: migrateFlags(data.flags),
      cleared: new Set(),
      respawn,
      // Before version 6 wins were not counted: every mentor starts at home.
      victories: data.victories ?? 0,
    };
  } catch {
    // Migration may encounter malformed nested data as well as invalid JSON.
    return null;
  }
}

/**
 * Story flags from an old save. The Moon Caves are now entered from the
 * Moonfall Ruins, behind the ridge (`ridgeCleared`) and the peaks' gate
 * (`peakGate`): a hero who already holds the Cave Pass gets both, so they can
 * still reach the caves they had opened.
 */
export function migrateFlags(flags: readonly string[]): Set<string> {
  const set = new Set(flags);
  if (set.has('cavePass')) for (const flag of ['ridgeCleared', 'peakGate']) set.add(flag);
  return set;
}

/**
 * True when the hero can stand at `at`: a walkable tile on a known map that
 * no warp or person (or monster) sits on. Maps change as the world grows (the mentor regions
 * reshaped the Realm), so a saved spot that no longer is one sends the hero
 * to their inn, and a lost inn to the start.
 */
function standable(at: Location): boolean {
  if (typeof at.map !== 'string' || !Object.hasOwn(MAPS, at.map)) return false;
  if (!integer(at.x) || !integer(at.y)) return false;
  const map = MAPS[at.map];
  return (
    !!map &&
    tileAt(map, at.x, at.y).walkable &&
    !warpAt(map, at.x, at.y) &&
    !map.entities.some((e) => e.x === at.x && e.y === at.y)
  );
}

/** Saves to `store`. Storage can be unavailable (private mode); failures return false. */
export function saveGame(store: KeyValueStore, state: GameState): boolean {
  try {
    store.setItem(SAVE_KEY, serialize(state));
    return store.persistent !== false;
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
  const classId =
    typeof rest.classId === 'string' && Object.hasOwn(CLASSES, rest.classId)
      ? rest.classId
      : DEFAULT_CLASS;
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
    classId: cls.id,
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

/** Runtime checks guard the boundary between untrusted JSON and game state. */
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function count(value: unknown): value is number {
  return integer(value) && value >= 0;
}

function validHero(hero: Hero): boolean {
  const equipment = (id: unknown, kind: string): boolean =>
    id === null || (typeof id === 'string' && Object.hasOwn(ITEMS, id) && ITEMS[id]?.kind === kind);
  const enhancementsValid = (value: unknown): boolean =>
    record(value) && ENHANCEMENT_IDS.every((id) => count(value[id]));
  return (
    typeof hero.name === 'string' &&
    typeof hero.classId === 'string' &&
    Object.hasOwn(CLASSES, hero.classId) &&
    ELEMENTS.includes(hero.titleElement) &&
    integer(hero.level) &&
    hero.level >= 1 &&
    count(hero.xp) &&
    integer(hero.nextXp) &&
    hero.nextXp > 0 &&
    count(hero.hp) &&
    integer(hero.maxHp) &&
    hero.maxHp > 0 &&
    hero.hp <= hero.maxHp &&
    integer(hero.manaCap) &&
    hero.manaCap > 0 &&
    count(hero.atk) &&
    count(hero.def) &&
    count(hero.gil) &&
    count(hero.skillPoints) &&
    record(hero.mana) &&
    ELEMENTS.every((id) => count(hero.mana[id]) && hero.mana[id] <= hero.manaCap) &&
    record(hero.stats) &&
    STAT_IDS.every((id) => count(hero.stats[id]) && hero.stats[id] <= STATS[id].maxRank) &&
    equipment(hero.weaponId, 'weapon') &&
    equipment(hero.armorId, 'armor') &&
    equipment(hero.accessoryId, 'accessory') &&
    record(hero.items) &&
    Object.entries(hero.items).every(
      ([id, amount]) => Object.hasOwn(ITEMS, id) && count(amount) && amount > 0,
    ) &&
    record(hero.spells) &&
    Object.entries(hero.spells).every(([id, known]) => {
      const spell = Object.hasOwn(SPELLS, id) ? SPELLS[id] : undefined;
      return (
        !!spell &&
        record(known) &&
        integer(known.level) &&
        known.level >= 1 &&
        known.level <= spell.levels.length &&
        enhancementsValid(known.step) &&
        enhancementsValid(known.kept)
      );
    }) &&
    record(hero.failedLessons) &&
    Object.entries(hero.failedLessons).every(([element, failed]) => {
      if (!record(failed) || typeof failed.spellId !== 'string') return false;
      const spell = Object.hasOwn(SPELLS, failed.spellId) ? SPELLS[failed.spellId] : undefined;
      return (
        !!spell &&
        ELEMENTS.some((id) => id === element) &&
        spell.category === element &&
        integer(failed.level) &&
        failed.level >= 1 &&
        failed.level <= spell.levels.length
      );
    }) &&
    record(hero.feats) &&
    Object.entries(hero.feats).every(
      ([id, value]) =>
        (id === 'hastedClear' || ELEMENTS.some((element) => id === `pure.${element}`)) &&
        count(value),
    )
  );
}
