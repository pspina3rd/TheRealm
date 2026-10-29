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
export const LINE_DAMAGE: readonly number[] = [0, 4, 12, 26, 48];
/** Strike bonus per point of attack (class base, Strength and weapon): 0.04 = +4%. */
export const ATTACK_PERCENT = 0.04;
/** A multi-line clear right after another multi-line clear strikes this much harder. */
export const BACK_TO_BACK_MULTIPLIER = 1.5;
/** Each consecutive piece that clears adds this share to the strike… */
export const COMBO_STEP = 0.25;
/** …counting at most this many steps. */
export const MAX_COMBO = 8;
/** Casting a spell takes time: it fills this share of the enemy's gauge… */
export const SPELL_TIME = 0.1;
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
export const FEATHER_REVIVE = 0.35;
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
 * Bosses shrug off part of a weak crystal's bonus: they take this share
 * of it (a weak crystal adds 37.5% instead of 50%). Spells on a boss's
 * weakness have their own share, `BOSS_SPELL_WEAKNESS_SHARE`.
 */
export const BOSS_WEAKNESS_SHARE = 0.75;
/**
 * A spell (or an exposed strike) on a boss's weakness gets this share of
 * the weakness bonus: none, so it hits ×1 instead of ×1.5. The full kit's
 * Fire found the Moon Wyrm's weakness and won 43% of first tries against a
 * 20–30% target; now 33% (60 runs, touch pace). Weak crystals keep
 * `BOSS_WEAKNESS_SHARE`.
 */
export const BOSS_SPELL_WEAKNESS_SHARE = 0;
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

// ---- Lessons (src/game/lessons.ts, src/battle/lesson.ts)
/**
 * Help chance per piece before the clamp: base − per point × (alignment −
 * difficulty), clamped to 5–35% (docs/ENCOUNTER_DESIGN.md §6.3; it was
 * 10–50% around a 40% base, and lessons won 87–100% for the good bot)…
 */
export const HELP_BASE = 0.3;
export const HELP_PER_POINT = 0.05;
/** …clamped to this range… */
export const HELP_MIN = 0.05;
export const HELP_MAX = 0.1;
/** The mentor's shield: at this share of HP the foe raises it; only the taught spell breaks it. */
export const SHIELD_AT = 0.25;
/** A lesson foe gains this share of its HP per difficulty above 1… */
export const FOE_HP_PER_DIFFICULTY = 0.75;
/** …and this much attack. */
export const FOE_ATK_PER_DIFFICULTY = 5;
/** Extra difficulty of teaching a hidden spell. */
export const HIDDEN_DIFFICULTY = 1;
/** Heroes below this level meet gentler difficulty-1 lesson foes… */
export const NOVICE_LEVEL = 3;
/** …with this share of their HP (a 50 HP wisp has 36). */
export const NOVICE_FOE_HP = 0.8;

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

// ---- Encounters (src/battle/verbs/*, src/data/encounters.ts; docs/ENCOUNTER_DESIGN.md §6)
// Every number is the spec's starting value; the balance pass (M6) tunes them here.
// Time is in milliseconds; "pieces" count locked pieces. Keys are NPC ids.
export const ENCOUNTERS = {
  /** Elder Rowan, "The Well": DIG + rising (§6.1). */
  elder: {
    /** The shaft is this many columns wide (cols 0–5 inside the masonry). */
    width: 6,
    /** A cell locked above this row (row 1 is the bottom) is mold over the lip. */
    lip: 16,
    /** A 1-gap mold row pushes up every this many pieces… */
    risingEvery: 12,
    /** …and each new buried hole brings it this many pieces sooner. */
    soonerPerHole: 0,
    /** Strain: each step adds this many debris rows on top. */
    strainRows: 1,
  },
  /** Pip, "The Crystal Tower": BUILD (§6.1). */
  kid: {
    /** The tower fails on the crack after this many… */
    crackLimit: 3,
    /** …or the wobble after this many. */
    wobbleLimit: 1,
    /** Pieces shown ahead (Pip calls them out). */
    previews: 3,
    /** Strain: each step starts with this many pre-cracked cells. */
    strainCracks: 1,
  },
  /** Farmer Bean, "The Herb Beds": PLANT (§6.1). */
  farmer: {
    pieceLimit: 24,
    /** Sprouts to plant… */
    target: 19,
    /** …and the Great mark (+1 Herb). */
    great: 22,
    /** Controlled queue: one S in every 3 pieces. */
    supplyWindow: 2,
    /** What a wrong colour in a furrow scores at Mossvale (−1 from Twitch on). */
    wrongColour: 0,
    /** Strain: the target grows this much per step. */
    strainTarget: 1,
  },
  /** Shopkeeper Ordor, "The Stall": DUEL, one-sided (§6.1). */
  stallKeeper: {
    /** His stack (crates) starts this many rows high and tops out at `topRows`. */
    startRows: 4,
    topRows: 12,
    /** He grows a row every `growMs`, sends `sendRows` every `sendMs` and clears `clearRows` every `clearMs`. */
    growMs: 10_000,
    sendMs: 15_000,
    sendRows: 1,
    clearMs: 20_000,
    clearRows: 2,
    /** The haggle lasts this long. */
    durationMs: 60_000,
    /** Each row you send moves the meter this much in your favour… */
    meterPerSent: -0.03,
    /** …and each row you receive this much against you (+3% elsewhere; Ordor never cancels). */
    meterPerReceived: 0.012,
    /** Whether your clears cancel his pending rows first (from Lo on). */
    cancel: false,
    /** Strain: the meter starts this much worse per step. */
    strainMeter: 0.05,
  },
  /** Forager Wren, "The Mushroom Ring": CONTAIN + protect (§6.4). */
  forager: {
    pieceLimit: 36,
    /** Rot spreads every this many pieces… */
    spreadEvery: 5,
    /** …this many cells at a time (one per source). */
    spreadCells: 2,
    /** Caps that must be picked or still alive to win… */
    keepCaps: 2,
    /** …and the number of dead caps that fails. */
    deadCapsFail: 2,
    /** Strain: each step starts with this many more rot cells. */
    strainHazard: 3,
  },
  /** Captain Vale, "The Ward Lamps": CHARGE, twist wind snuffs; a threshold (§6.2). */
  guard: {
    pieceLimit: 32,
    /** A pure line has at least this many of its 10 cells in the lamp's element (≤ 7). */
    purity: 6,
    /** Every this many pieces the wind snuffs the oldest lit lamp (unless all are lit). */
    snuffEvery: 14,
    /** Controlled queue: one J and one T in every 4 pieces. */
    supplyWindow: 3,
    /** Strain: each step adds a lamp (thresholds cap strain at 1). */
    strainLamps: 1,
  },
} as const;

/**
 * Price bands of a scripted DUEL haggle, as multipliers (§6.1): the meter
 * is clamped to `min`–`max`; at or below `great` is Great, `win` a Win,
 * `even` Even (no penalty), anything above a Fail. A rival who tops out
 * sells at `sold` at most; a hero who tops out walks off at `walkOff` at least.
 */
export const DUEL_PRICES = {
  start: 1,
  min: 0.7,
  max: 1.3,
  great: 0.85,
  win: 0.94,
  even: 1.05,
  sold: 0.8,
  walkOff: 1.15,
} as const;

/**
 * Rows a DUEL sends for clearing 0–4 lines at once (singles send nothing),
 * plus `backToBack` for a multi-line clear right after another.
 */
export const DUEL_SENDS: readonly number[] = [0, 0, 1, 2, 4];
export const DUEL_BACK_TO_BACK = 1;

/** Placement-relevant board events are telegraphed this many pieces ahead (§2, §7.1). */
export const TELEGRAPH_LEAD = 1;

/**
 * What winning and failing cost and give (§3). Regard is per person; strain
 * per encounter; a day ends at an inn.
 */
export const STAKES = {
  /** Regard range, added to the attitude score (it never changes difficulty). */
  regardMin: -2,
  regardMax: 2,
  /** A first win's regard; a fail's; a repeat win restores this much, up to the first win's level. */
  regardWin: 1,
  regardFail: -1,
  regardRestore: 1,
  /** Strain steps an encounter can hold; thresholds hold fewer. */
  strainMax: 2,
  thresholdStrainMax: 1,
  /** Strain steps a night at an inn takes off every encounter. */
  innRelief: 1,
  /** Repeat wins of a repeatable pay this share (rounded down) and give no regard. */
  repeatPay: 0.5,
  /** A haggle markup lasts until a haggle there is won or this many days pass. */
  markupDays: 2,
  /** Thresholds offer the mentor's assist after this many fails… */
  assistAfterFails: 2,
  /** …in which the mentor tosses a piece with this chance, steered by the challenge's hint. */
  assistToss: 0.3,
  /** A sealed spell is freed by winning its lesson or this many monster fights. */
  sealFights: 3,
} as const;

/**
 * The region rules (§6.3, §7.1), counted in pieces and telegraphed one piece
 * ahead. M1 builds spores (the grove, Hazel) and a dark prototype (Selene).
 */
export const REGION_RULES = {
  /** A spore lands every `landEvery` pieces and spreads every `spreadEvery`; a cluster of `petrifyAt` petrifies. */
  spores: { landEvery: 5, spreadEvery: 3, petrifyAt: 4 },
  /** The board is dark beyond `radius` rows of the falling piece; the skyline and ghost always show. */
  dark: { radius: 3 },
} as const;

export type RegionRuleId = keyof typeof REGION_RULES;

/** Each map's monster rule (maps not listed have none: Sevenstones, and regions built later). */
export const MAP_RULES: Readonly<Partial<Record<string, RegionRuleId>>> = {
  grove: 'spores',
};

/** The rule each mentor teaches, used in their lessons wherever they are (M1: Hazel; Selene's dark is a test board). */
export const MENTOR_RULES: Readonly<Partial<Record<string, RegionRuleId>>> = {
  hazel: 'spores',
};
