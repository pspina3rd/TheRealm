/**
 * Every tunable balance number in one place, so a balance pass changes data,
 * not code. Each module that uses a constant re-exports it under its old
 * name. Enemy stat blocks stay in `enemies.ts`; region level bands are in
 * `REGIONS` below. The gravity curve and `PIECE_MS` are defined in
 * `src/core/scoring.ts` (the core layer never imports data) and re-exported
 * here, so they are tuned there. Run the whole-game table with `npm run sim` (see
 * "Balance" in docs/GAME_DESIGN.md).
 */

// ---- Gravity and a piece's worth of time (defined in src/core/scoring.ts)
export {
  GRAVITY_START_MS,
  GRAVITY_STEEP_STEP,
  GRAVITY_STEEP_LEVELS,
  GRAVITY_LATE_STEP,
  PIECE_MS,
} from '../core/scoring';

// ---- Strike damage and the action gauge (src/battle/combat.ts)
/** Base damage for clearing 0–4 lines at once: single lines are weak, big clears steep. */
export const LINE_DAMAGE: readonly number[] = [0, 3, 12, 26, 48];
/** Strike bonus per point of attack (class base, Strength and weapon): 0.04 = +4%. */
export const ATTACK_PERCENT = 0.04;
/** A multi-line clear right after another multi-line clear strikes this much harder. */
export const BACK_TO_BACK_MULTIPLIER = 1.5;
/** Each consecutive piece that clears adds this share to the strike… */
export const COMBO_STEP = 0.25;
/** …counting at most this many steps. */
export const MAX_COMBO = 8;
/** Casting a spell takes time: it fills this share of the enemy's gauge… */
export const SPELL_TIME = 0.15;
/** …or this share against a boss, so a full spell kit can't simply out-cast it… */
export const BOSS_SPELL_TIME = 0.25;
/** …and using an item this share. */
export const ITEM_TIME = 0.4;
/** Items the hero can use in one battle. */
export const MAX_ITEMS_PER_BATTLE = 2;
/**
 * A Phoenix Feather revives with this share of max HP, at most once per
 * fight, and only while an item use is left: the revive is one of them.
 */
export const FEATHER_REVIVE = 0.25;
/** A water line pushes the enemy's gauge back this far… */
export const CHILL_MS = 1500;
/** …but never more than this below empty. */
export const MAX_CHILL_MS = 3000;
/** Each new covered hole a placement leaves fills this share of the enemy's gauge… */
export const HOLE_RUSH = 0.15;
/** …up to this much per placement. */
export const MAX_HOLE_RUSH = 0.45;
/** Fraction of max HP lost when the board overflows. */
export const OVERFLOW_PENALTY = 0.25;
/** Most HP an earth ward can hold. */
export const MAX_WARD = 25;
/** Spell damage added per hero level (not for spells that clear rows). */
export const SPELL_LEVEL_BONUS = 2;

// ---- Elements (src/battle/elemental.ts)
/** Damage multiplier against an element the enemy is weak to… */
export const WEAK_MULTIPLIER = 1.5;
/** …and against one it resists. */
export const RESIST_MULTIPLIER = 0.5;
/**
 * Strike damage share added (or removed) when every cleared cell is a
 * crystal the enemy is weak to (or resists); partial clears scale it.
 */
export const WEAK_CRYSTAL_BONUS = 0.5;
/**
 * Bosses shrug off part of a weakness: they take this share of its bonus
 * (×1.375 instead of ×1.5; a weak crystal adds 37.5% instead of 50%).
 */
export const BOSS_WEAKNESS_SHARE = 0.75;
export const RESIST_CRYSTAL_PENALTY = 0.25;

// ---- Battle pacing (src/battle/battle.ts)
/** Mana from cleared crystals is multiplied by this while an Ether lasts. */
export const MANA_BOOST_MULTIPLIER = 2;
/**
 * Mana per cleared crystal by lines cleared together (rounded down per
 * element): a lone line gives half, big clears more, so spells are fuelled
 * by the same big clears that strike hardest.
 */
export const MANA_PER_LINES: readonly number[] = [0, 0.5, 1, 1.5, 2];
/** Gravity interval multiplier under a tailwind (higher = slower). */
export const TAILWIND_SLOWDOWN = 1.6;
/** Pauses the hero may take in one battle (resuming is always allowed). */
export const MAX_PAUSES = 3;
/** Pieces fall this many times faster while an enemy's quicken lasts. */
export const QUICKEN_SPEED = 2.5;

// ---- Monster scaling (src/game/scaling.ts)
/** Levels a monster can grow above its own to meet the hero. */
export const LEVEL_BAND = 3;
/** Levels a boss can grow. */
export const BOSS_BAND = 1;
/** Share of base HP gained per level grown. */
export const HP_PER_LEVEL = 0.1;
/** Attack gained per level grown. */
export const ATK_PER_LEVEL = 1;
/** Share by which each level grown speeds up the action gauge. */
export const SPEED_PER_LEVEL = 0.03;
/** Share of XP lost per level the hero stands above the monster… */
export const XP_FALLOFF = 0.25;
/** …down to this share. */
export const MIN_XP_SHARE = 0.1;

// ---- Recovery (src/game/hero.ts, src/game/encounter.ts)
/** HP regained per step walked on the map… */
export const WALK_REGEN = 1;
/** …only while below this share of max HP: a broke, battered hero can always recover. */
export const WALK_REGEN_CAP = 0.5;
/**
 * A beginner (below `BEGINNER_LEVEL`) in the starter lands walks back up to
 * this share instead, so a broke new hero isn't stuck fighting at half HP.
 */
export const BEGINNER_REGEN_CAP = 0.8;
export const BEGINNER_LEVEL = 4;
/** Share of max HP the hero wakes with at the last inn after falling in a fight… */
export const FALL_HP_SHARE = 0.3;
/** …or in the home village, where the healer looks after a beginner. */
export const HOME_FALL_HP_SHARE = 0.5;

// ---- Lessons (src/game/lessons.ts)
/** Help chance per piece before the clamp: base − per point × (alignment − difficulty)… */
export const HELP_BASE = 0.4;
export const HELP_PER_POINT = 0.05;
/** …clamped to this range… */
export const HELP_MIN = 0.1;
export const HELP_MAX = 0.5;
/** A lesson foe gains this share of its HP per difficulty above 1… */
export const FOE_HP_PER_DIFFICULTY = 0.6;
/** …and this much attack. */
export const FOE_ATK_PER_DIFFICULTY = 3;
/** Extra difficulty of teaching a hidden spell. */
export const HIDDEN_DIFFICULTY = 1;
/** Heroes below this level meet gentler difficulty-1 lesson foes… */
export const NOVICE_LEVEL = 3;
/** …with this share of their HP (a 50 HP wisp has 36). */
export const NOVICE_FOE_HP = 0.72;

// ---- Skill points (src/game/stats.ts)
/** Skill points gained per hero level. */
export const SKILL_POINTS_PER_LEVEL = 2;

// ---- Hero levels (src/game/hero.ts)
/** XP a new hero needs for level 2… */
export const FIRST_LEVEL_XP = 44;
/** …and each level needs this many times the last. */
export const XP_GROWTH = 1.45;

// ---- Regions: the level curve of the world (src/data/maps.ts, src/data/enemies.ts)
/** A region's place on the level curve. */
export interface RegionBand {
  /** Hero level the region is meant to be entered at. */
  readonly entryLevel: number;
  /** Lowest and highest own level of its monsters. */
  readonly monsterLevels: readonly [number, number];
  /** Levels its monsters can grow above their own to meet the hero (`EnemyDef.band`). */
  readonly band: number;
}

/** Every area's band, in progression order (keys are map ids). Bosses grow `BOSS_BAND`. */
export const REGIONS = {
  overworld: { entryLevel: 1, monsterLevels: [1, 3], band: LEVEL_BAND },
  grove: { entryLevel: 2, monsterLevels: [2, 4], band: 2 },
  lake: { entryLevel: 3, monsterLevels: [3, 5], band: 2 },
  quarry: { entryLevel: 4, monsterLevels: [4, 6], band: 2 },
  forge: { entryLevel: 5, monsterLevels: [5, 7], band: 2 },
  peaks: { entryLevel: 6, monsterLevels: [6, 8], band: 2 },
  cliffs: { entryLevel: 7, monsterLevels: [7, 9], band: 2 },
  ruins: { entryLevel: 8, monsterLevels: [8, 10], band: 2 },
  caves1: { entryLevel: 10, monsterLevels: [10, 11], band: LEVEL_BAND },
  caves2: { entryLevel: 12, monsterLevels: [11, 13], band: LEVEL_BAND },
} as const satisfies Record<string, RegionBand>;
