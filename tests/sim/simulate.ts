/**
 * A battle simulator for balance checks: plays a real `Battle` on simulated
 * time with a simple bot. Not shipped; used by `tests/difficulty.test.ts`
 * (set `SIM=1` to print the full table).
 */
import { Battle, type BattleAction, type BattleOptions } from '../../src/battle/battle';
import { rotationsOf } from '../../src/core/bestFit';
import { Board, type ActivePiece, type CellTally, type LockResult } from '../../src/core/board';
import type { Cell, Offset, PieceName } from '../../src/core/pieces';
import { createRng } from '../../src/core/rng';
import type { ChallengeSpec } from '../../src/data/types';
import { SPELLS } from '../../src/data/spells';
import { dualChance } from '../../src/game/pieceOdds';
import { BarterChallenge } from '../../src/battle/barter';
import { lineClearPoints } from '../../src/core/scoring';
import {
  addItem,
  createHero,
  equip,
  gainXp,
  learnSpell,
  refreshStats,
  type Hero,
} from '../../src/game/hero';

/**
 * How the bot plays: `good` builds for 3–4 line clears and casts ready
 * spells; `spammer` clears lines as soon as it can (mostly singles) and
 * casts every ready spell; `sloppy` is tidy but careless a third of the
 * time; `dropper` hard-drops in place. `prepared` plays like `good` but
 * brings 5 Herbs, an Ether and a Phoenix Feather, drinking the Ether at
 * once and a Herb below 35% HP (items cost gauge time and 3 per fight).
 */
export type Style = 'good' | 'prepared' | 'spammer' | 'tidy' | 'sloppy' | 'dropper';

type Grid = readonly (readonly Cell[])[];

interface Spot {
  readonly cells: readonly Offset[];
  readonly x: number;
  readonly score: number;
  readonly actions?: readonly BattleAction[];
}

export interface SimulationPolicy {
  readonly challengeAware?: boolean;
  /** Deterministic search budget; no wall-clock-dependent outcomes. */
  readonly puzzleNodeBudget?: number;
}

interface ReachableDrop {
  readonly board: Board;
  readonly lock: LockResult;
  readonly actions: readonly BattleAction[];
  readonly distance: number;
}

function copyActive(piece: ActivePiece): ActivePiece {
  return { ...piece, cells: piece.cells.map(([x, y]) => [x, y]) };
}

/** Enumerates real left/right/rotation paths at the current height; never teleports a piece. */
function reachableDrops(board: Board, remaining: readonly PieceName[] = []): ReachableDrop[] {
  if (!board.active) return [];
  const queue = [{ piece: copyActive(board.active), actions: [] as BattleAction[] }];
  const seen = new Set<string>();
  const drops: ReachableDrop[] = [];
  for (let node = queue.shift(); node; node = queue.shift()) {
    const id = JSON.stringify([node.piece.x, node.piece.y, node.piece.cells]);
    if (seen.has(id)) continue;
    seen.add(id);
    const make = (copyGrid: boolean) => {
      const next = new Board(createRng(1), board.width, board.height);
      next.grid = copyGrid ? board.grid.map((row) => row.slice()) : board.grid;
      next.active = copyActive(node.piece);
      next.seal = board.seal ? { ...board.seal } : null;
      next.setFixedQueue(remaining);
      return next;
    };
    const dropped = make(true);
    const { distance, result } = dropped.hardDrop();
    drops.push({ board: dropped, lock: result, actions: node.actions, distance });
    for (const action of ['left', 'right', 'rotate'] as const) {
      const next = make(false);
      const moved = action === 'rotate' ? next.rotate() : next.move(action === 'left' ? -1 : 1, 0);
      if (moved && next.active)
        queue.push({ piece: next.active, actions: [...node.actions, action] });
    }
  }
  return drops;
}

/** A legal, bounded fixed-queue search. Exhaustion is a solver limitation, not a game loss. */
export function puzzlePlan(
  battle: Battle,
  budget = 20_000,
): {
  readonly spot: Spot | null;
  readonly exhausted: boolean;
} {
  if (battle.spec.kind !== 'puzzle') return { spot: null, exhausted: false };
  let nodes = 0;
  let exhausted = false;
  const target = battle.objective.lines!;
  const memo = new Set<string>();
  const search = (board: Board, needed: number): readonly BattleAction[] | null => {
    if (!board.active) return null;
    const remaining = board.preview(Math.max(0, board.piecesRemaining - 1));
    const stateKey = JSON.stringify([board.grid, board.active, remaining, needed]);
    if (memo.has(stateKey)) return null;
    memo.add(stateKey);
    for (const drop of reachableDrops(board, remaining)) {
      if (++nodes > budget) {
        exhausted = true;
        return null;
      }
      if (drop.lock.linesCleared >= needed) return drop.actions;
      if (!drop.lock.toppedOut && search(drop.board, needed - drop.lock.linesCleared))
        return drop.actions;
      if (exhausted) return null;
    }
    return null;
  };
  const actions = search(battle.board, target.want - target.have);
  return {
    spot:
      actions && battle.board.active
        ? { cells: battle.board.active.cells, x: battle.board.active.x, score: 0, actions }
        : null,
    exhausted,
  };
}

/** Values only unmet barter goals, retaining the actual dual colours in simulated clears. */
export function barterGain(tally: CellTally, challenge: BarterChallenge): number {
  return Object.entries(challenge.wants).reduce((sum, [color, wanted]) => {
    const key = color as keyof CellTally;
    const missing = Math.max(0, (wanted ?? 0) - (challenge.collected[key] ?? 0));
    return sum + Math.min(missing, tally[key] ?? 0);
  }, 0);
}

function objectiveSpot(battle: Battle): Spot | null {
  let best: Spot | null = null;
  for (const drop of reachableDrops(battle.board)) {
    if (drop.lock.toppedOut) continue;
    const shape = features(drop.board.grid);
    const total = shape.heights.reduce((sum, h) => sum + h, 0);
    const bump = shape.heights
      .slice(1)
      .reduce((sum, h, i) => sum + Math.abs(h - shape.heights[i]!), 0);
    const safety = -8 * shape.holes - 0.5 * total - 0.4 * bump;
    let reward = 10 * drop.lock.linesCleared;
    if (battle.challenge instanceof BarterChallenge)
      reward += 5 * barterGain(drop.lock.clearedCells, battle.challenge);
    if (battle.spec.kind === 'offering')
      reward =
        Math.min(
          battle.spec.targetScore - battle.score,
          lineClearPoints(drop.lock.linesCleared) + drop.distance * 2,
        ) / 20;
    const score = safety + reward;
    if (!best || score > best.score)
      best = {
        cells: battle.board.active!.cells,
        x: battle.board.active!.x,
        actions: drop.actions,
        score,
      };
  }
  return best;
}

function fits(grid: Grid, cells: readonly Offset[], x: number, y: number, sealed: number | null) {
  const width = grid[0]?.length ?? 0;
  return cells.every(([cx, cy]) => {
    const gx = x + cx;
    const gy = y + cy;
    if (gx < 0 || gx >= width || gy >= grid.length || gx === sealed) return false;
    return gy < 0 || grid[gy]?.[gx] === null;
  });
}

function settle(grid: Grid, cells: readonly Offset[], x: number, y: number) {
  const next = grid.map((row) => row.slice());
  for (const [cx, cy] of cells) {
    const row = next[y + cy];
    if (row) row[x + cx] = 'stone';
  }
  const kept = next.filter((row) => row.some((cell) => cell === null));
  const lines = next.length - kept.length;
  const width = grid[0]?.length ?? 0;
  return {
    grid: [...Array.from({ length: lines }, () => Array<Cell>(width).fill(null)), ...kept],
    lines,
  };
}

function features(grid: Grid) {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const heights: number[] = [];
  let holes = 0;
  for (let x = 0; x < width; x++) {
    let top = height;
    for (let y = 0; y < height; y++) {
      if (grid[y]?.[x] !== null) top = Math.min(top, y);
      else if (top < y) holes++;
    }
    heights.push(height - top);
  }
  return { heights, holes };
}

/**
 * A competent stacker's view of a board: no holes, flat, with a well
 * column (the right wall, or the left one while the right is sealed) kept
 * open for 3–4 line clears until the stack grows tall.
 */
function goodValue(after: Grid, wellColumn: number): number {
  const { heights, holes } = features(after);
  const stack = heights.filter((_, x) => x !== wellColumn);
  const max = Math.max(...heights);
  const bump = stack.slice(1).reduce((s, h, i) => s + Math.abs(h - (stack[i] ?? 0)), 0);
  const total = stack.reduce((s, h) => s + h, 0);
  const well = heights[wellColumn] ?? 0;
  const danger = max > 9;
  return (
    -7 * holes -
    0.35 * bump -
    (danger ? 0.5 : 0.1) * total -
    (danger ? 0 : 2.5 * well) -
    Math.max(0, max - 12) * 4
  );
}

/** What clearing `lines` at once is worth to the competent stacker, given the stack height. */
function goodReward(lines: number, tall: boolean): number {
  return (tall ? [0, 5, 10, 16, 28] : [0, -2, 6, 15, 32])[lines] ?? 32;
}

/** The bestFit heuristic: greedy and tidy, clears lines as soon as it can. */
function tidyScore(after: Grid, lines: number): number {
  const { heights, holes } = features(after);
  const total = heights.reduce((s, h) => s + h, 0);
  const bump = heights.slice(1).reduce((s, h, i) => s + Math.abs(h - (heights[i] ?? 0)), 0);
  return 0.76 * lines - 0.36 * holes - 0.51 * total - 0.18 * bump;
}

interface Landing {
  readonly cells: readonly Offset[];
  readonly x: number;
  readonly grid: Grid;
  readonly lines: number;
}

/** Every landing of `name` on `grid`, dropped straight down outside the sealed column. */
function landings(grid: Grid, name: PieceName, sealed: number | null): Landing[] {
  const width = grid[0]?.length ?? 0;
  const out: Landing[] = [];
  for (const cells of rotationsOf(name)) {
    const span = Math.max(...cells.map(([cx]) => cx)) + 1;
    for (let x = 0; x + span <= width; x++) {
      if (!fits(grid, cells, x, 0, sealed)) continue;
      let y = 0;
      while (fits(grid, cells, x, y + 1, sealed)) y++;
      const after = settle(grid, cells, x, y);
      out.push({ cells, x, grid: after.grid, lines: after.lines });
    }
  }
  return out;
}

function spots(board: Board, score: (g: Grid, lines: number) => number): Spot[] {
  const piece = board.active;
  if (!piece) return [];
  return landings(board.grid, piece.name, board.seal?.column ?? null).map((l) => ({
    cells: l.cells,
    x: l.x,
    score: score(l.grid, l.lines),
  }));
}

/** The competent stacker's pick: two pieces deep when the next one is visible. */
function goodSpot(battle: Battle): Spot | null {
  const board = battle.board;
  const piece = board.active;
  if (!piece) return null;
  const sealed = board.seal?.column ?? null;
  const wellColumn = sealed === 9 ? 0 : 9;
  const tall = (grid: Grid) => Math.max(...features(grid).heights) > 9;
  const [next] = battle.upcoming;
  let best: Spot | null = null;
  for (const first of landings(board.grid, piece.name, sealed)) {
    let score = goodReward(first.lines, tall(board.grid));
    if (next) {
      let second = -Infinity;
      for (const l of landings(first.grid, next, sealed)) {
        second = Math.max(
          second,
          goodReward(l.lines, tall(first.grid)) + goodValue(l.grid, wellColumn),
        );
      }
      score += second === -Infinity ? -1000 : second;
    } else score += goodValue(first.grid, wellColumn);
    if (!best || score > best.score) best = { cells: first.cells, x: first.x, score };
  }
  return best;
}

const key = (cells: readonly Offset[]): string => {
  const minY = Math.min(...cells.map(([, y]) => y));
  return JSON.stringify(cells.map(([x, y]) => [x, y - minY]).sort());
};

/** Turns and slides the falling piece to `spot`, then hard-drops (it may fall short if blocked). */
function execute(battle: Battle, spot: Spot): void {
  if (spot.actions) {
    for (const action of spot.actions) battle.input(action);
    battle.input('hardDrop');
    return;
  }
  const board = battle.board;
  const want = key(spot.cells);
  for (let i = 0; i < 4 && board.active && key(board.active.cells) !== want; i++)
    battle.input('rotate');
  const piece = board.active;
  if (piece) {
    const minX = Math.min(...piece.cells.map(([cx]) => cx));
    // A spot's x is the origin of its own cells (an O's start a column in): match left edges.
    const target = spot.x + Math.min(...spot.cells.map(([cx]) => cx)) - minX;
    for (let i = 0; i < 12 && piece.x > target; i++) battle.input('left');
    for (let i = 0; i < 12 && piece.x < target; i++) battle.input('right');
  }
  battle.input('hardDrop');
}

function choose(battle: Battle, style: Style): Spot | null {
  const rng = battle.rng;
  if (style === 'good' || style === 'prepared') return goodSpot(battle);
  const all = spots(battle.board, tidyScore);
  if (style === 'spammer' || style === 'tidy')
    return all.reduce<Spot | null>((b, s) => (!b || s.score > b.score ? s : b), null);
  // Sloppy: a careless drop a third of the time, otherwise greedy and tidy.
  if (all.length > 0 && rng.next() < 0.35) return all[rng.int(all.length)] ?? null;
  return all.reduce<Spot | null>((b, s) => (!b || s.score > b.score ? s : b), null);
}

/** Casts whatever spell is ready, damage first (a good player spends mana as it comes). */
function castReady(battle: Battle): void {
  const combat = battle.combat;
  if (!combat) return;
  for (const id of Object.keys(combat.spellBook())) {
    const kind = SPELLS[id]?.levels[0].effect.kind;
    if (kind === 'heal' && battle.hero.hp > battle.hero.maxHp * 0.5) continue;
    if (combat.cannotCastReason(id) === null && combat.status() === 'ongoing') combat.castSpell(id);
  }
}

/** The prepared player's items: an Ether at once, a Herb when low. */
function useItems(battle: Battle): void {
  const combat = battle.combat;
  const hero = battle.hero;
  if (!combat || combat.status() !== 'ongoing') return;
  if (combat.cannotUseItemReason('ether') === null) combat.useItem('ether');
  if (hero.hp < hero.maxHp * 0.35 && combat.cannotUseItemReason('herb') === null)
    combat.useItem('herb');
}

/** A hero of `classId` at `level`, with points spread over Strength, Vitality and Guard, and level-fit gear. */
/**
 * A late-game mentor kit: nine spells across the elements (fire hits the
 * Moon Wyrm's weakness), the primaries at level 2.
 */
export const FULL_KIT = [
  'fire',
  'kindle',
  'gale',
  'gust',
  'thunder',
  'static',
  'cure',
  'regen',
  'quake',
] as const;

export function heroAt(level: number, classId = 'ranger', kit: readonly string[] = []): Hero {
  const hero = createHero(classId);
  for (const id of kit) {
    learnSpell(hero, id);
    if (SPELLS[id]?.role === 'primary') hero.spells[id] = { ...hero.spells[id]!, level: 2 };
  }
  while (hero.level < level) gainXp(hero, hero.nextXp);
  const order = ['strength', 'vitality', 'guard'] as const;
  for (let i = 0; hero.skillPoints > 0; i++) {
    hero.stats[order[i % 3]!]++;
    hero.skillPoints--;
  }
  const gear: [string, string | null][] =
    level >= 9
      ? [['flameBrand', 'forgePlate']]
      : level >= 7
        ? [['knightBlade', 'crystalMail']]
        : level >= 4
          ? [['ironSword', 'apprenticeRobe']]
          : [['copperSword', null]];
  for (const [weapon, armor] of gear) {
    addItem(hero, weapon);
    equip(hero, weapon);
    if (armor) {
      addItem(hero, armor);
      equip(hero, armor);
    }
  }
  refreshStats(hero);
  hero.hp = hero.maxHp;
  return hero;
}

export interface FightResult {
  readonly won: boolean;
  readonly ms: number;
  readonly pieces: number;
  readonly hpLeft: number;
  /** Times the board overflowed. */
  readonly overflows: number;
  readonly stopReason: 'won' | 'lost' | 'timeout' | 'solver-budget' | 'solver-unsolved';
}

/**
 * Plays one fight on simulated time: the bot thinks `thinkMs` per piece
 * (less when the piece is about to land), then places it.
 */
export function simulate(
  spec: ChallengeSpec,
  hero: Hero,
  style: Style,
  seed: number,
  thinkMs = 1500,
  limitMs = 600_000,
  options: BattleOptions = {},
): FightResult {
  const battle = new Battle(spec, hero, createRng(seed), {
    dualChance: dualChance(hero),
    ...options,
  });
  return simulateBattle(battle, style, thinkMs, limitMs);
}

/** Runs an existing battle so campaign tests can apply its real resolution afterwards. */
export function simulateBattle(
  battle: Battle,
  style: Style,
  thinkMs = 1500,
  limitMs = 600_000,
  policy: SimulationPolicy = {},
): FightResult {
  const hero = battle.hero;
  const STEP = 50;
  let ms = 0;
  let waited = 0;
  let current = battle.board.active;
  let overflows = 0;
  let seen = 0;
  let solverStop: FightResult['stopReason'] | null = null;
  while (battle.status === 'ongoing' && ms < limitMs) {
    if (battle.board.active !== current) {
      current = battle.board.active;
      waited = 0;
    }
    // A player hurries when the piece is about to land (haste, quicken, late
    // gravity): they place it once it is 2 rows from landing, though never
    // faster than 40% of their usual time.
    const piece = battle.board.active;
    const landing = piece ? battle.board.ghostY() - piece.y : Infinity;
    if (waited >= thinkMs || (landing <= 2 && waited >= thinkMs * 0.4)) {
      if (style === 'prepared') useItems(battle);
      if (style === 'good' || style === 'prepared' || style === 'spammer') castReady(battle);
      if (battle.status !== 'ongoing') break;
      if (style === 'dropper') battle.input('hardDrop');
      else {
        let spot: Spot | null;
        if (policy.challengeAware && battle.spec.kind === 'puzzle') {
          const plan = puzzlePlan(battle, policy.puzzleNodeBudget);
          spot = plan.spot;
          if (!spot) {
            solverStop = plan.exhausted ? 'solver-budget' : 'solver-unsolved';
            break;
          }
        } else
          spot =
            policy.challengeAware && !battle.combat ? objectiveSpot(battle) : choose(battle, style);
        if (spot) execute(battle, spot);
        else battle.input('hardDrop');
      }
      current = battle.board.active;
      waited = 0;
      continue;
    }
    for (const e of battle.eventsSince(seen)) if (e.event.kind === 'overflow') overflows++;
    seen = battle.events.at(-1)?.seq ?? 0;
    seen++;
    battle.update(STEP);
    ms += STEP;
    waited += STEP;
  }
  return {
    won: battle.status === 'won',
    ms,
    pieces: battle.board.piecesPlaced,
    hpLeft: hero.hp / hero.maxHp,
    overflows,
    stopReason: solverStop ?? (battle.status === 'ongoing' ? 'timeout' : battle.status),
  };
}

/** Win rate, mean fight seconds and mean HP left over `runs` seeds. */
export function measure(
  spec: ChallengeSpec,
  level: number,
  style: Style,
  runs: number,
  classId = 'ranger',
  kit: readonly string[] = [],
  thinkMs = 1500,
): { winRate: number; seconds: number; pieces: number; hpLeft: number; overflows: number } {
  let wins = 0;
  let ms = 0;
  let pieces = 0;
  let hp = 0;
  let overflows = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const hero = heroAt(level, classId, kit);
    if (style === 'prepared') hero.items = { herb: 5, ether: 1, phoenixFeather: 1 };
    const result = simulate(spec, hero, style, seed * 7919, thinkMs);
    if (result.won) wins++;
    overflows += result.overflows;
    ms += result.ms;
    pieces += result.pieces;
    hp += result.won ? result.hpLeft : 0;
  }
  return {
    winRate: wins / runs,
    seconds: ms / runs / 1000,
    pieces: pieces / runs,
    hpLeft: wins > 0 ? hp / wins : 0,
    overflows: overflows / runs,
  };
}
