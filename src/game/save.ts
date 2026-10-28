import { ELEMENTS, emptyCounts, type Element } from '../core/elements';
import { CLASSES, DEFAULT_CLASS } from '../data/classes';
import { ITEMS } from '../data/items';
import { CAMPAIGN_MAP_IDS } from '../data/campaignFlags';
import { MAPS, START } from '../data/maps';
import { ENHANCEMENT_IDS, SPELLS } from '../data/spells';
import { STATS, STAT_IDS } from '../data/stats';
import type { FeatId } from '../data/types';
import { titleElementFor } from './alignment';
import { heroAlignment, heroClass, refreshStats, type Hero } from './hero';
import { enhancements, newKnownSpell, type Enhancements, type KnownSpell } from './spells';
import type { Feats } from './feats';
import { migrateScenes, migrateStory } from './story';
import { SKILL_POINTS_PER_LEVEL, statRanks } from './stats';
import { tileAt, warpAt, type Direction, type Location } from '../world/map';
import type { GameState } from '../world/state';

export const SAVE_KEY = 'the-realm/save';
/** Where a save that can't be read is kept, so a new adventure never overwrites it. */
export const CORRUPT_KEY = `${SAVE_KEY}.corrupt`;
/**
 * Version history:
 * - 2 replaced MP with elemental mana and added attunement and charms.
 * - 3 replaced attunement with alignment and gave each class its own spell.
 * - 4 added stats and skill points; levels no longer raise mana, attack or defence.
 * - 5 gave spells levels and enhancements, and added locked categories.
 * - 6 added the count of monster battles won, which moves the mentors, and
 *   replaced locked categories with the lost lesson behind each lock.
 * - 7 added the hero's lifetime board feats, which reveal hidden spells.
 * - 8 added the story: line rotation (`talk`), the Moon Wyrm's visions and
 *   the maps reached (as flags), which place Vesper.
 * - 9 added the scenes (the opening, the Refusal, the end of Chapter One),
 *   each a `scene:` flag once seen; an older save has seen every scene due.
 * - 10 opens the second-half campaign. New scene flags remain unearned in
 *   old saves; only version 9's original scenes are migrated as already seen.
 */
export const SAVE_VERSION = 10;
/** Older versions `deserialize` can still upgrade. */
const MIGRATABLE_VERSIONS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, SAVE_VERSION];
const FACINGS: readonly Direction[] = ['up', 'down', 'left', 'right'];

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
  /** Since version 8. */
  talk?: Record<string, number>;
}

/** Minimal storage interface so tests can supply an in-memory store. */
export interface KeyValueStore {
  /**
   * False for a temporary in-memory store that is lost on reload (see
   * `createStore`). Omitted means persistent, so `localStorage` qualifies.
   */
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
    talk: state.talk,
  };
  return JSON.stringify(data);
}

/**
 * Parses a save string in three steps: parse, migrate (flags, the version 8
 * story, the hero), then sanitise, and last the version 9 scenes (on the
 * sanitised hero). Only structural garbage returns null: not JSON, not an
 * object, an unknown version, or a missing or mistyped core field (map,
 * position, flag list; the hero's name, level, XP, HP, gil and skill
 * points). Stale entries are dropped or clamped instead (see
 * `sanitizeHero`), so one removed item never costs the whole adventure.
 */
export function deserialize(json: string): GameState | null {
  try {
    const data: unknown = JSON.parse(json);
    if (
      !record(data) ||
      !MIGRATABLE_VERSIONS.includes(data.version as number) ||
      !record(data.hero) ||
      typeof data.mapId !== 'string' ||
      !finite(data.x) ||
      !finite(data.y) ||
      !Array.isArray(data.flags)
    ) {
      return null;
    }
    // The version-7 branch briefly exposed an unfinished Sunken Ruins map.
    // Preserve that adventure and its progress just outside the ward.
    if (data.mapId === 'sunkenRuins' && (data.version as number) <= 7) {
      data.mapId = 'overworld';
      data.x = 15;
      data.y = 19;
    }
    // None of these destinations existed in version 9. An edited/stale
    // old location must not silently bypass the newly earned descent.
    if (
      (data.version as number) < 10 &&
      typeof data.mapId === 'string' &&
      CAMPAIGN_MAP_IDS.has(data.mapId)
    ) {
      data.mapId = 'overworld';
      data.x = 15;
      data.y = 19;
    }
    const victories = count(data.victories) ? data.victories : 0;
    const flags = migrateFlags(data.flags.filter((f): f is string => typeof f === 'string'));
    const mapId = String(data.mapId);
    if ((data.version as number) < 8) migrateStory(flags, mapId, victories);
    const hero = sanitizeHero(migrateHero(data.hero as StoredHero));
    if (!hero) return null;
    if ((data.version as number) < 9) migrateScenes(flags, hero);
    const allowCampaign = (data.version as number) >= 10;
    const respawn = standable(data.respawn, flags, allowCampaign) ? data.respawn : { ...START };
    const here = { map: data.mapId, x: data.x, y: data.y };
    const spot = standable(here, flags, allowCampaign) ? here : respawn;
    return {
      hero,
      mapId: spot.map,
      x: spot.x,
      y: spot.y,
      facing: FACINGS.includes(data.facing as Direction) ? (data.facing as Direction) : 'down',
      flags,
      cleared: new Set(),
      respawn: { map: respawn.map, x: respawn.x, y: respawn.y },
      // Before version 6 wins were not counted: every mentor starts at home.
      victories,
      // Before version 8 no line had rotated: everyone starts at their first variant.
      talk: validTalk(data.talk),
    };
  } catch {
    // Migration can trip over malformed nested data as well as invalid JSON.
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
 * reshaped Sevenstones), so a saved spot that no longer is one sends the hero
 * to their inn, and a lost inn to the start.
 */
function standable(
  at: unknown,
  flags: ReadonlySet<string>,
  allowCampaign: boolean,
): at is Location {
  if (!record(at) || typeof at.map !== 'string' || !Object.hasOwn(MAPS, at.map)) return false;
  if (!allowCampaign && CAMPAIGN_MAP_IDS.has(at.map)) return false;
  const map = MAPS[at.map];
  const { x, y } = at;
  return (
    !!map &&
    integer(x) &&
    integer(y) &&
    tileAt(map, x, y).walkable &&
    !warpAt(map, x, y) &&
    !map.entities.some(
      (e) =>
        e.x === x &&
        e.y === y &&
        (!e.requiresFlag || flags.has(e.requiresFlag)) &&
        (!e.untilFlag || !flags.has(e.untilFlag)) &&
        !(e.kind === 'monster' && flags.has(`defeated:${e.id}`)),
    )
  );
}

/** The saved line memory, keeping only counts that are whole numbers of 0 or more. */
function validTalk(talk: unknown): Record<string, number> {
  if (!record(talk)) return {};
  return Object.fromEntries(
    Object.entries(talk).filter((entry): entry is [string, number] => count(entry[1])),
  );
}

/**
 * Saves to `store`. Returns false when storage is unavailable (private mode)
 * and also when the store is temporary (`persistent: false`): the write
 * happened, but nothing will survive a reload.
 */
export function saveGame(store: KeyValueStore, state: GameState): boolean {
  try {
    store.setItem(SAVE_KEY, serialize(state));
    return store.persistent !== false;
  } catch {
    return false;
  }
}

/**
 * What `loadSave` found. `state` is null when there is no readable save;
 * `corrupt` is set when a save existed but couldn't be read, and
 * `backupKey` names where its text was kept (null if the copy failed).
 */
export interface LoadResult {
  state: GameState | null;
  corrupt: boolean;
  backupKey: string | null;
}

/**
 * Loads the save from `store`. An unreadable save is never silently lost:
 * its raw text is copied to `CORRUPT_KEY` (which saving never touches)
 * before the caller starts afresh, and the result says so. An earlier,
 * different backup is never overwritten: the newer one goes to
 * `CORRUPT_KEY.<now>` instead (`now` defaults to the current time in ms).
 */
export function loadSave(store: KeyValueStore, now = Date.now()): LoadResult {
  const none = { state: null, corrupt: false, backupKey: null };
  let json: string | null;
  try {
    json = store.getItem(SAVE_KEY);
  } catch {
    return none;
  }
  if (!json) return none;
  const state = deserialize(json);
  if (state) return { ...none, state };
  try {
    const earlier = store.getItem(CORRUPT_KEY);
    let backupKey = CORRUPT_KEY;
    if (earlier !== null && earlier !== json) {
      const datedKey = `${CORRUPT_KEY}.${now}`;
      backupKey = datedKey;
      let suffix = 0;
      let existing = store.getItem(backupKey);
      while (existing !== null && existing !== json) {
        backupKey = `${datedKey}.${++suffix}`;
        existing = store.getItem(backupKey);
      }
    }
    store.setItem(backupKey, json);
    return { state: null, corrupt: true, backupKey };
  } catch {
    return { state: null, corrupt: true, backupKey: null };
  }
}

/** The saved game, or null when there is none or it can't be read (see `loadSave`). */
export function loadGame(store: KeyValueStore): GameState | null {
  return loadSave(store).state;
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
 * - saves from before hero classes (or naming a class since removed) get the
 *   default class;
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
  const storedSpells = Array.isArray(rest.spells) || record(rest.spells) ? rest.spells : [];
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
    feats: renamedFeats(record(rest.feats) ? rest.feats : {}),
    accessoryId: rest.accessoryId ?? null,
    manaCap,
    mana: record(rest.mana) ? rest.mana : emptyCounts(Math.min(mp ?? manaCap, manaCap)),
  };
  if (!record(rest.stats)) {
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

/** True for a plain JSON object (not null, not an array). */
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** A whole number of 0 or more. */
function count(value: unknown): value is number {
  return integer(value) && value >= 0;
}

/** `value` rounded into [min, max]; anything that isn't a finite number becomes `min`. */
function clampInt(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): number {
  return finite(value) ? Math.min(max, Math.max(min, Math.round(value))) : min;
}

/** Spell enhancement counts, each a whole number of 0 or more. */
function sanitizeEnhancements(value: unknown): Enhancements {
  const stored = record(value) ? value : {};
  return enhancements(
    Object.fromEntries(ENHANCEMENT_IDS.map((id) => [id, clampInt(stored[id], 0)])),
  );
}

/** `id` when it still names an item of `kind`, else nothing equipped. */
function equipped(id: unknown, kind: string): string | null {
  return typeof id === 'string' && Object.hasOwn(ITEMS, id) && ITEMS[id]?.kind === kind ? id : null;
}

/** Every feat id: each element's pure lines, plus the hasted clear. */
const FEAT_IDS: readonly FeatId[] = [...ELEMENTS.map((e) => `pure.${e}` as const), 'hastedClear'];

/**
 * A migrated hero made safe to play, or null if a core field (name, level,
 * XP, next XP, HP, gil, skill points) is missing or not a finite number.
 * Everything else is repaired: unknown items, spells, failed lessons and
 * feats are dropped; equipment that no longer exists is unequipped; numbers
 * become whole and in range (stats to their max rank, spell levels to the
 * spell's levels); derived numbers (max HP, mana cap, attack, defence) are
 * recomputed from class, level and stats; HP and mana are clamped to their
 * caps; a hero left with no spell relearns their class spell.
 */
function sanitizeHero(hero: Hero): Hero | null {
  const core: unknown[] = [hero.level, hero.xp, hero.nextXp, hero.hp, hero.gil, hero.skillPoints];
  if (typeof hero.name !== 'string' || !core.every(finite)) return null;
  const cls = heroClass(hero);
  const raw = hero as unknown as Record<string, unknown>;
  const field = (key: string): Record<string, unknown> => {
    const value = raw[key];
    return record(value) ? value : {};
  };
  const stats = field('stats');
  const mana = field('mana');
  const spells = Object.entries(field('spells')).flatMap(([id, known]): [string, KnownSpell][] => {
    const def = Object.hasOwn(SPELLS, id) ? SPELLS[id] : undefined;
    if (!def) return [];
    const k = record(known) ? known : {};
    const level = clampInt(k.level, 1, def.levels.length);
    return [
      [id, { level, step: sanitizeEnhancements(k.step), kept: sanitizeEnhancements(k.kept) }],
    ];
  });
  if (spells.length === 0) spells.push([cls.spell, newKnownSpell()]);
  const feats = field('feats');
  const clean: Hero = {
    ...hero,
    titleElement: ELEMENTS.includes(hero.titleElement) ? hero.titleElement : cls.element,
    level: clampInt(hero.level, 1),
    xp: clampInt(hero.xp, 0),
    nextXp: clampInt(hero.nextXp, 1),
    hp: clampInt(hero.hp, 0),
    gil: clampInt(hero.gil, 0),
    skillPoints: clampInt(hero.skillPoints, 0),
    stats: Object.fromEntries(
      STAT_IDS.map((id) => [id, clampInt(stats[id], 0, STATS[id].maxRank)]),
    ) as Hero['stats'],
    mana: Object.fromEntries(ELEMENTS.map((e) => [e, clampInt(mana[e], 0)])) as Hero['mana'],
    weaponId: equipped(hero.weaponId, 'weapon'),
    armorId: equipped(hero.armorId, 'armor'),
    accessoryId: equipped(hero.accessoryId, 'accessory'),
    items: Object.fromEntries(
      Object.entries(field('items')).flatMap(([id, n]) => {
        const amount = clampInt(n, 0);
        return Object.hasOwn(ITEMS, id) && amount > 0 ? [[id, amount]] : [];
      }),
    ),
    spells: Object.fromEntries(spells),
    failedLessons: Object.fromEntries(
      Object.entries(field('failedLessons')).flatMap(([element, failed]) => {
        if (!record(failed) || typeof failed.spellId !== 'string') return [];
        const def = Object.hasOwn(SPELLS, failed.spellId) ? SPELLS[failed.spellId] : undefined;
        if (!def || def.category !== element) return [];
        const level = clampInt(failed.level, 1, def.levels.length);
        return [[element, { spellId: failed.spellId, level }]];
      }),
    ),
    feats: Object.fromEntries(
      FEAT_IDS.flatMap((id) => {
        const n = clampInt(feats[id], 0);
        return n > 0 ? [[id, n]] : [];
      }),
    ),
  };
  // Derived numbers follow from class, level and stats; this also clamps HP and mana.
  refreshStats(clean);
  return clean;
}
