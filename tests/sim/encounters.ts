/**
 * The encounter sim (docs/ENCOUNTER_DESIGN.md §5.3, §9 M0): plays any
 * encounter's real `Battle` on simulated time with four bots, over many
 * seeds, and reports each cell's mean with a 95% interval.
 *
 * The bot definitions are the author's (ENCOUNTER_DESIGN.md, Author
 * decisions, Oct 29): realistic touch players who plan one piece ahead and
 * slip, catching most slips on the landing ghost before release.
 *
 * - **good**: plans two pieces deep (the falling piece and the next), a
 *   competent stacker's judgement plus the challenge's placement hint;
 *   light touch slips (half the casual rate), 70% caught on the ghost;
 *   2.2 s a piece (touch pace).
 * - **casual**: a planner with slips: the good bot's two-piece plan and
 *   hint, the second-best spot 15% of the time, touch slips (8% one column
 *   off, 5% a wrong rotation), 70% caught on the ghost; 2.6 s a piece.
 * - **beginner** (reported, no band): the old casual: `bestFit` one piece
 *   deep plus the hint, 15% second-best, every slip uncaught; 2.6 s.
 * - **dropper**: hard-drops every piece where it spawns.
 * - **idle**: touches once (the pre-roll ends), then never again.
 *
 * All three placing bots use the challenge's own hint, so it can't flatter one.
 */
import { Battle } from '../../src/battle/battle';
import { type BattleOptions } from '../../src/battle/battle';
import { encounterDef } from '../../src/battle/verbs';
import { cellColors, type Board } from '../../src/core/board';
import { scoreGrid } from '../../src/core/bestFit';
import { afterLanding, landingsOf, type Grid, type Landing } from '../../src/core/landing';
import { createRng } from '../../src/core/rng';
import type { ChallengeSpec } from '../../src/data/types';
import { createHero, gainXp, type Hero } from '../../src/game/hero';
import { dualChance } from '../../src/game/pieceOdds';
import { DuelChallenge } from '../../src/battle/verbs/duel';
import { ENCOUNTER_DEFS } from '../../src/data/encounters';
import { SPELLS } from '../../src/data/spells';
import { newKnownSpell } from '../../src/game/spells';
import { castReady, heroAt } from './simulate';
import { MAP_RULES, type RegionRuleId } from '../../src/data/balance';
import { ENEMIES } from '../../src/data/enemies';
import { MAPS } from '../../src/data/maps';

/** How much the good bot weighs the challenge's hint against plain stacking. */
const HINT = Number(process.env.HINT ?? 1);
/**
 * Each bot's touch: `noise` scales the slips (1 = 8% a column off, 5% a
 * wrong turn); `ghost` is the chance a slip is caught before release (the
 * player sees the landing ghost under their finger and corrects it).
 * Sensitivity knobs override them: NOISE (casual and beginner), GOOD_NOISE
 * (good), GHOST (every bot).
 */
const NOISE = Number(process.env.NOISE ?? 1);
const GOOD_NOISE = Number(process.env.GOOD_NOISE ?? 0.5);
const GHOST = process.env.GHOST === undefined ? null : Number(process.env.GHOST);

export interface Touch {
  readonly noise: number;
  readonly ghost: number;
}
/** Diagnosis: the casual bot's judgement (`bestFit` by default, or `survival`) and hint weight. */
const CASUAL_JUDGE = process.env.CASUAL_JUDGE ?? 'bestFit';
const CASUAL_HINT = Number(process.env.CASUAL_HINT ?? HINT);

export type Bot = 'good' | 'casual' | 'beginner' | 'dropper' | 'idle';

/** Seconds a bot takes per piece (§5.3: touch pace 2.2 s; casual 2.6 s). */
export const PACE: Readonly<Record<Bot, number>> = {
  good: 2200,
  casual: 2600,
  beginner: 2600,
  dropper: 2200,
  idle: 2200,
};

/** Each placing bot's touch (see `Touch`). */
function touchOf(bot: Bot): Touch {
  const ghost = (catches: number): number => GHOST ?? catches;
  if (bot === 'good') return { noise: GOOD_NOISE, ghost: ghost(0.7) };
  if (bot === 'casual') return { noise: NOISE, ghost: ghost(0.7) };
  if (bot === 'beginner') return { noise: NOISE, ghost: ghost(0) };
  return { noise: 0, ghost: 0 };
}

function heights(grid: Grid): { heights: number[]; holes: number } {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const out: number[] = [];
  let holes = 0;
  for (let x = 0; x < width; x++) {
    let top = height;
    for (let y = 0; y < height; y++) {
      if (grid[y]?.[x] !== null) top = Math.min(top, y);
      else if (top < y) holes++;
    }
    out.push(height - top);
  }
  return { heights: out, holes };
}

/**
 * The competent stacker's view (as the fight sim's good bot): no holes,
 * flat, low; with a well kept open at the right wall when `well` is set
 * (for big clears: the duel), else no well.
 */
function stackValue(grid: Grid, well: boolean): number {
  const { heights: h, holes } = heights(grid);
  const wellColumn = h.length - 1;
  const stack = well ? h.slice(0, wellColumn) : h;
  const max = Math.max(...h);
  const bump = stack.slice(1).reduce((s, v, i) => s + Math.abs(v - (stack[i] ?? 0)), 0);
  const total = stack.reduce((s, v) => s + v, 0);
  const danger = max > 9;
  return (
    (well ? -7 : -12) * holes -
    0.35 * bump -
    (danger ? 0.5 : 0.1) * total -
    (well && !danger ? 2.5 * (h[wellColumn] ?? 0) : 0) -
    Math.max(0, max - 12) * 4
  );
}

/**
 * A landing judged by El-Tetris' features (Pierre Dellacherie's, tuned):
 * landing height, eroded piece cells, row and column transitions, holes
 * and well depths. A strong survival player, used by the good bot on
 * every encounter but the duel (which builds for big clears).
 */
export function survivalValue(landing: Landing, height: number): number {
  const grid = landing.grid;
  const width = grid[0]?.length ?? 0;
  const landingHeight =
    height - landing.placed.reduce((sum, [, y]) => sum + y, 0) / Math.max(1, landing.placed.length);
  const eroded = landing.placed.filter(([, y]) => landing.fullRows.includes(y)).length;
  let rowTransitions = 0;
  let colTransitions = 0;
  let holes = 0;
  let wells = 0;
  for (const row of grid) {
    let prev = true;
    for (const cell of row) {
      const filled = cell !== null;
      if (filled !== prev) rowTransitions++;
      prev = filled;
    }
    if (!prev) rowTransitions++;
  }
  for (let x = 0; x < width; x++) {
    let prev = false;
    let covered = false;
    for (let y = 0; y < grid.length; y++) {
      const filled = grid[y]?.[x] !== null;
      if (filled !== prev) colTransitions++;
      prev = filled;
      if (filled) covered = true;
      else if (covered) holes++;
    }
    if (!prev) colTransitions++;
    // Well cells: empty cells with both neighbours filled (walls count), counted cumulatively.
    let depth = 0;
    for (let y = 0; y < grid.length; y++) {
      const here = grid[y]?.[x] !== null;
      const left = x === 0 || grid[y]?.[x - 1] !== null;
      const right = x === width - 1 || grid[y]?.[x + 1] !== null;
      if (!here && left && right) {
        depth++;
        wells += depth;
      } else depth = 0;
    }
  }
  return (
    -4.5 * landingHeight +
    3.42 * landing.lines * eroded -
    3.22 * rowTransitions -
    9.35 * colTransitions -
    7.9 * holes -
    3.39 * wells
  );
}

/** A big-clear reward for the duel's good bot (as the fight sim's). */
function clearReward(lines: number, tall: boolean): number {
  return (tall ? [0, 5, 10, 16, 28] : [0, -2, 6, 15, 32])[lines] ?? 32;
}

export interface Choice {
  readonly landing: Landing;
  readonly score: number;
}

/** The falling piece's landings on the battle's board, in its own colours. */
function landingsNow(board: Board): Landing[] {
  const piece = board.active;
  if (!piece) return [];
  return landingsOf(board, piece.name, cellColors({ name: piece.name, second: piece.second }));
}

/** The good bot: two pieces deep, the stacker's view plus the hint. */
export function goodChoice(battle: Battle): Landing | null {
  return goodRanked(battle)[0]?.landing ?? null;
}

/** Every landing of the falling piece with the good bot's score, best first. */
export function goodRanked(battle: Battle): Choice[] {
  const board = battle.board;
  const hint = battle.challenge.hint?.bind(battle.challenge);
  const duel = battle.challenge instanceof DuelChallenge;
  const height = board.height;
  const [next] = battle.upcomingPieces;
  const tall = Math.max(...heights(board.grid).heights) > 9;
  // The duel builds for big clears (the fight sim's stacker); everything else plays to survive.
  const judge = (landing: Landing): number =>
    duel
      ? stackValue(landing.grid, true) + clearReward(landing.lines, tall)
      : survivalValue(landing, height);
  const ranked: Choice[] = [];
  for (const first of landingsNow(board)) {
    const now = HINT * (hint?.(first) ?? 0) + judge(first);
    let ahead = -Infinity;
    if (next) {
      const after = afterLanding(board, first);
      for (const second of landingsOf(after, next.name, cellColors(next))) {
        ahead = Math.max(ahead, judge(second) + 0.9 * HINT * (hint?.(second) ?? 0));
      }
    }
    const score = now + (ahead === -Infinity ? (next ? -1000 : 0) : ahead);
    ranked.push({ landing: first, score });
  }
  return ranked.sort((a, b) => b.score - a.score);
}

/** The casual bot: the good bot's plan, but the second-best spot 15% of the time. */
function casualChoice(battle: Battle, rng: () => number): Landing | null {
  const ranked = goodRanked(battle);
  const pick = ranked.length > 1 && rng() < 0.15 ? ranked[1] : ranked[0];
  return pick?.landing ?? null;
}

/** The beginner (the old casual): one piece, tidy, plus the hint; sometimes the second-best spot. */
function beginnerChoice(battle: Battle): Landing | null {
  const hint = battle.challenge.hint?.bind(battle.challenge);
  const board = battle.board;
  const duel = battle.challenge instanceof DuelChallenge;
  const tall = Math.max(...heights(board.grid).heights) > 9;
  // CASUAL_JUDGE=survival (diagnosis): the good bot's judgement, one piece deep.
  const judge = (landing: Landing): number =>
    CASUAL_JUDGE !== 'survival'
      ? 10 * scoreGrid(landing.grid, landing.lines)
      : duel
        ? stackValue(landing.grid, true) + clearReward(landing.lines, tall)
        : survivalValue(landing, board.height);
  const ranked = landingsNow(board)
    .map((landing) => ({
      landing,
      score: judge(landing) + CASUAL_HINT * (hint?.(landing) ?? 0),
    }))
    .sort((a, b) => b.score - a.score);
  const pick = ranked.length > 1 && battle.rng.next() < 0.15 ? ranked[1] : ranked[0];
  return pick?.landing ?? null;
}

const key = (cells: readonly (readonly [number, number])[]): string => {
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return JSON.stringify(cells.map(([x, y]) => [x - minX, y - minY]).sort());
};

/**
 * Turns and slides the falling piece to a landing, then hard-drops. With
 * `noise`, the casual bot's touch slips: one column off (8%) or one turn
 * too many (5%).
 */
export function execute(
  battle: Battle,
  landing: Landing,
  touch: Touch | null,
  rng: () => number,
  drop = true,
): boolean {
  const board = battle.board;
  const want = key(landing.cells);
  for (let i = 0; i < 4 && board.active && key(board.active.cells) !== want; i++)
    battle.input('rotate');
  // A slip happens, unless the ghost shows it and the player corrects it before release.
  const scale = touch?.noise ?? 0;
  const ghost = touch?.ghost ?? 0;
  const slip = (rate: number): boolean =>
    scale > 0 && rng() < rate * scale && !(ghost > 0 && rng() < ghost);
  if (slip(0.05)) battle.input('rotate');
  const piece = board.active;
  if (piece) {
    // The landing's x is its origin with its own offsets; match the piece's left edge to it.
    const edge = (cells: readonly (readonly [number, number])[]): number =>
      Math.min(...cells.map(([cx]) => cx));
    let target = landing.x + edge(landing.cells) - edge(piece.cells);
    if (slip(0.08)) target += rng() < 0.5 ? -1 : 1;
    for (let i = 0; i < 12 && piece.x > target; i++) battle.input('left');
    for (let i = 0; i < 12 && piece.x < target; i++) battle.input('right');
  }
  const actual = board.active;
  const matched =
    actual !== null &&
    key(actual.cells) === want &&
    actual.x + Math.min(...actual.cells.map(([x]) => x)) ===
      landing.x + Math.min(...landing.cells.map(([x]) => x));
  if (drop) battle.input('hardDrop');
  return matched;
}

/** Why a try ended (for the fail-cause mix). */
export type Ending = 'won' | 'lost' | 'timeout';

export interface TryResult {
  readonly won: boolean;
  readonly ending: Ending;
  /** Simulated seconds from the first touch. */
  readonly seconds: number;
  readonly pieces: number;
  /** The challenge's own account of a loss (e.g. "topped out", "over the lip"). */
  readonly cause: string;
  /** A Great, where the encounter has one. */
  readonly great: boolean;
  /** A haggle's final price (1 for others). */
  readonly price: number;
}

/** The hero class the sims play (CLASS=ranger|knight|mage|rogue; ranger by default). */
export const SIM_CLASS = process.env.CLASS ?? 'ranger';

/** A hero of `classId` at `level` (no extra gear), as the encounter sims meet people. */
export function simHero(level: number, classId = SIM_CLASS): Hero {
  const hero = createHero(classId);
  while (hero.level < level) gainXp(hero, hero.nextXp);
  hero.hp = hero.maxHp;
  return hero;
}

/**
 * Plays one try of an encounter with a bot, on simulated time. Fights and
 * lessons play too (the hero as the fight sim builds them, casting spells
 * as the fight sim's good bot does), so lessons get the same four bots.
 * `tweak` adjusts the battle before play (sensitivity runs).
 */
export function playEncounter(
  spec: ChallengeSpec,
  bot: Bot,
  seed: number,
  level = 1,
  options: BattleOptions = {},
  limitMs = 600_000,
  tweak?: (battle: Battle) => void,
  trace?: (battle: Battle, landing: Landing) => void,
): TryResult {
  const hero = spec.kind === 'encounter' ? simHero(level) : heroAt(level, SIM_CLASS);
  if (spec.kind === 'lesson' && SPELLS[spec.spellId]?.role === 'primary' && spec.difficulty > 1)
    hero.spells[spec.spellId] = { ...newKnownSpell(), level: spec.difficulty - 1 };
  const battle = new Battle(spec, hero, createRng(seed), {
    dualChance: dualChance(hero),
    ...options,
  });
  tweak?.(battle);
  const fight = battle.combat !== null;
  const noise = createRng(seed ^ 0x5eed);
  const think = PACE[bot];
  const touch = touchOf(bot);
  const placer = bot === 'good' || bot === 'casual' || bot === 'beginner';
  const choose = (): Landing | null =>
    bot === 'good'
      ? goodChoice(battle)
      : bot === 'casual'
        ? casualChoice(battle, () => noise.next())
        : beginnerChoice(battle);
  const STEP = 50;
  let ms = 0;
  let begun = 0;
  let waited = 0;
  let current = battle.board.active;
  let aimed = false;
  let aimedSlip = false;
  let droppedSlip = false;
  while ((battle.status === 'ongoing' || (placer && battle.canCorrect)) && ms < limitMs) {
    // The same disclosed correction is available to a real player. Use it
    // for a visible new tower crack/wobble, a well placement that differs
    // from the intended landing, or a lost board. No unseen future is inspected.
    const visibleBuildMistake = battle.spec.kind === 'encounter' && battle.spec.id === 'kid';
    const correctionNeeded = visibleBuildMistake
      ? battle.correctionSuggested
      : droppedSlip || battle.status === 'lost';
    if (placer && battle.canCorrect && correctionNeeded) {
      battle.correctLastDrop();
      droppedSlip = false;
      aimedSlip = false;
      current = battle.board.active;
      waited = 0;
      aimed = false;
    }
    if (battle.status !== 'ongoing') break;
    if (battle.board.active !== current) {
      droppedSlip = aimedSlip;
      aimedSlip = false;
      current = battle.board.active;
      waited = 0;
      aimed = false;
    }
    // A touch player drags the piece over its spot at once, then flicks it down after thinking.
    if (!aimed && battle.started && !battle.demoPlaying && placer) {
      aimed = true;
      if (fight) castReady(battle);
      if (battle.status !== 'ongoing') break;
      const choice = choose();
      if (choice) {
        trace?.(battle, choice);
        aimedSlip = !execute(battle, choice, touch, () => noise.next(), false);
      }
      if (process.env.AIM && choice) {
        const a = battle.board.active!;
        process.stderr.write(
          `plan x=${choice.x} ${JSON.stringify(choice.cells)} now x=${a.x} y=${a.y} ${JSON.stringify(a.cells)} name=${a.name}\n`,
        );
      }
    }
    const piece = battle.board.active;
    const landing = piece ? battle.board.ghostY() - piece.y : Infinity;
    const ready =
      !battle.demoPlaying && (waited >= think || (landing <= 2 && waited >= think * 0.4));
    if (ready && !(bot === 'idle' && battle.started)) {
      if (!battle.started) begun = ms;
      if (bot === 'idle') battle.input('rotate');
      else if (bot === 'dropper') battle.input('hardDrop');
      else if (aimed) {
        battle.input('hardDrop');
        droppedSlip = aimedSlip;
        if (process.env.TRACEBOARD)
          process.stderr.write(
            battle.board.grid
              .slice(4)
              .map((r) => r.map((c) => (c ? c[0] : '.')).join(''))
              .join('\n') + '\n\n',
          );
      } else {
        const choice = choose();
        if (choice) {
          trace?.(battle, choice);
          droppedSlip = !execute(battle, choice, touch, () => noise.next());
        } else battle.input('hardDrop');
      }
      current = battle.board.active;
      waited = 0;
      aimed = false;
      continue;
    }
    battle.update(STEP);
    ms += STEP;
    waited += STEP;
  }
  if (process.env.RISES)
    process.stderr.write(
      `rises=${battle.events.filter((e) => e.event.kind === 'rise').length} pieces=${battle.board.piecesPlaced} ${battle.status}\n`,
    );
  const challenge = battle.challenge as { great?: boolean; grade?: string };
  const duel = battle.challenge instanceof DuelChallenge ? battle.challenge : null;
  // A haggle "wins" at a Win or better (≤ 94%); Even is a draw (§5.3 "Haggle: ≤ 94% finish").
  const won = duel
    ? battle.status !== 'ongoing' && duel.meter <= 0.94 + 1e-9
    : battle.status === 'won';
  return {
    won,
    ending: battle.status === 'ongoing' ? 'timeout' : won ? 'won' : 'lost',
    seconds: (ms - begun) / 1000,
    pieces: battle.board.piecesPlaced,
    cause: won ? 'won' : causeOf(battle),
    great: won && (challenge.great === true || challenge.grade === 'great'),
    price: duel?.meter ?? 1,
  };
}

/** A loss's cause in a word, for the fail-cause mix. */
function causeOf(battle: Battle): string {
  if (battle.status === 'ongoing') return 'timeout';
  if (battle.board.toppedOut) return 'topout';
  if (battle.hero.hp <= 0) return 'hp';
  const o = battle.objective;
  if (o.piecesLeft === 0) return 'pieces';
  const duel = battle.challenge;
  if (duel instanceof DuelChallenge) return `price ${Math.round(duel.meter * 100)}%`;
  return 'rule';
}

/** A mean and Wilson 95% confidence bounds. */
export function interval(
  wins: number,
  runs: number,
): { mean: number; half: number; lower: number; upper: number } {
  if (runs <= 0) throw new Error('A confidence interval needs at least one run');
  const p = wins / runs;
  const z2 = 1.96 ** 2;
  const divisor = 1 + z2 / runs;
  const center = (p + z2 / (2 * runs)) / divisor;
  const half = (1.96 * Math.sqrt((p * (1 - p) + z2 / (4 * runs)) / runs)) / divisor;
  return { mean: p, half, lower: Math.max(0, center - half), upper: Math.min(1, center + half) };
}

export interface Cell {
  readonly id: string;
  readonly bot: Bot;
  readonly strain: number;
  readonly runs: number;
  readonly winRate: number;
  readonly half: number;
  readonly lower: number;
  readonly upper: number;
  readonly greatRate: number;
  readonly seconds: number;
  readonly pieces: number;
  readonly causes: Readonly<Record<string, number>>;
  /** Mean final price (haggles). */
  readonly price: number;
}

/**
 * Layout trials: ROWAN=row,row,… (or WREN=…) replaces the well's (or the
 * ring's) start rows (top first) for this run, so a re-authored layout can be simmed before it is
 * written into src/data/encounters.ts.
 */
for (const [env, id] of [
  ['ROWAN', 'elder'],
  ['WREN', 'forager'],
] as const) {
  const rows = process.env[env];
  if (!rows) continue;
  const spec = ENCOUNTER_DEFS[id]!.spec as { params: { rows: readonly string[] } };
  spec.params = { ...spec.params, rows: rows.split(',') };
}

/** One table cell: `runs` seeds of an encounter with one bot, first try, at a strain. */
export function measureEncounter(
  id: string,
  bot: Bot,
  runs: number,
  strain = 0,
  level = 1,
  extra: Partial<Extract<ChallengeSpec, { kind: 'encounter' }>> = {},
): Cell {
  encounterDef({ kind: 'encounter', id, strain, demo: true, assisted: false });
  let wins = 0;
  let greats = 0;
  let seconds = 0;
  let pieces = 0;
  let price = 0;
  const causes: Record<string, number> = {};
  for (let seed = 1; seed <= runs; seed++) {
    const spec = {
      kind: 'encounter',
      id,
      strain,
      demo: strain === 0,
      assisted: false,
      ...extra,
    } as const;
    const result = playEncounter(spec, bot, seed * 7919 + 13, level);
    if (result.won) wins++;
    if (result.great) greats++;
    seconds += result.seconds;
    pieces += result.pieces;
    price += result.price;
    const cause = result.cause.startsWith('price') ? 'price' : result.cause;
    causes[cause] = (causes[cause] ?? 0) + 1;
  }
  const { mean, half, lower, upper } = interval(wins, runs);
  return {
    id,
    bot,
    strain,
    runs,
    winRate: mean,
    half,
    lower,
    upper,
    greatRate: greats / runs,
    seconds: seconds / runs,
    pieces: pieces / runs,
    causes,
    price: price / runs,
  };
}

/** Lessons the tables play: each mentor's trial foe and the spell taught. */
const LESSONS: Readonly<Record<string, readonly [string, string]>> = {
  torva: ['emberWisp', 'fire'],
  maren: ['tideWisp', 'blizzard'],
  kestrel: ['galeWisp', 'gale'],
  hazel: ['mossWisp', 'cure'],
};
/** The hero level a lesson of each difficulty is met at. */
const LESSON_LEVELS = [0, 1, 3, 5];
/** The hero level each encounter is met at (Mossvale's at 1). */
export const ENCOUNTER_LEVELS: Readonly<Record<string, number>> = { forager: 3, guard: 2 };

/**
 * A table cell's battle: an encounter id, `lesson:<mentor>:<difficulty>`,
 * or `fight:<enemyId>` (at the enemy's level, with its map's region rule).
 */
export function cellTarget(
  name: string,
  strain = 0,
  assisted = false,
): { spec: ChallengeSpec; level: number; rule?: RegionRuleId } {
  const [kind, a = '', b = '1'] = name.split(':');
  if (kind === 'lesson') {
    const [enemyId, spellId] = LESSONS[a]!;
    const difficulty = Number(b);
    return {
      spec: { kind: 'lesson', mentorId: a, enemyId, spellId, difficulty },
      level: LESSON_LEVELS[difficulty]!,
    };
  }
  if (kind === 'fight') {
    const map = Object.values(MAPS).find((m) =>
      m.entities.some((e) => e.kind === 'monster' && e.enemyId === a),
    );
    const rule = map ? MAP_RULES[map.id] : undefined;
    return {
      spec: { kind: 'combat', enemyId: a },
      level: ENEMIES[a]!.level,
      ...(rule ? { rule } : {}),
    };
  }
  return {
    spec: {
      kind: 'encounter',
      id: name,
      strain: assisted ? 0 : strain,
      demo: strain === 0 && !assisted,
      assisted,
    },
    level: ENCOUNTER_LEVELS[name] ?? 1,
  };
}

/** One cell of any target (see `cellTarget`), `runs` seeds; `tweak` adjusts each battle. */
export function measureCell(
  name: string,
  bot: Bot,
  runs: number,
  opts: { strain?: number; assisted?: boolean; noRule?: boolean; tweak?: (b: Battle) => void } = {},
): Cell {
  const { spec, level, rule } = cellTarget(name, opts.strain ?? 0, opts.assisted ?? false);
  const options: BattleOptions = !opts.noRule && rule ? { rule } : {};
  let wins = 0;
  let greats = 0;
  let seconds = 0;
  let pieces = 0;
  let price = 0;
  const causes: Record<string, number> = {};
  for (let seed = 1; seed <= runs; seed++) {
    const result = playEncounter(spec, bot, seed * 7919 + 13, level, options, 900_000, opts.tweak);
    if (result.won) wins++;
    if (result.great) greats++;
    seconds += result.seconds;
    pieces += result.pieces;
    price += result.price;
    const cause = result.cause.startsWith('price') ? 'price' : result.cause;
    causes[cause] = (causes[cause] ?? 0) + 1;
  }
  const { mean, half, lower, upper } = interval(wins, runs);
  return {
    id: name,
    bot,
    strain: opts.strain ?? 0,
    runs,
    winRate: mean,
    half,
    lower,
    upper,
    greatRate: greats / runs,
    seconds: seconds / runs,
    pieces: pieces / runs,
    causes,
    price: price / runs,
  };
}

/** General battle cell: same touch/noise policy for lessons and regional monsters. */
export function measureBattle(
  id: string,
  spec: ChallengeSpec,
  bot: Bot,
  runs: number,
  level: number,
  options: BattleOptions = {},
): Cell {
  const results = Array.from({ length: runs }, (_, seed) =>
    playEncounter(spec, bot, (seed + 1) * 7919 + 13, level, options),
  );
  return summarize(id, bot, 0, results);
}

/** Summarize actual outcomes with Wilson bounds, retaining every fail cause. */
export function summarize(
  id: string,
  bot: Bot,
  strain: number,
  results: readonly TryResult[],
): Cell {
  const runs = results.length;
  const { mean, half, lower, upper } = interval(results.filter((r) => r.won).length, runs);
  const causes: Record<string, number> = {};
  for (const result of results) causes[result.cause] = (causes[result.cause] ?? 0) + 1;
  return {
    id,
    bot,
    strain,
    runs,
    winRate: mean,
    half,
    lower,
    upper,
    greatRate: results.filter((r) => r.great).length / runs,
    seconds: results.reduce((sum, r) => sum + r.seconds, 0) / runs,
    pieces: results.reduce((sum, r) => sum + r.pieces, 0) / runs,
    causes,
    price: results.reduce((sum, r) => sum + r.price, 0) / runs,
  };
}
