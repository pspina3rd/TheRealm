import { BOARD_HEIGHT, BOARD_WIDTH, Board, type LockResult, type QueuedPiece } from '../core/board';
import { PIECES } from '../core/pieces';
import { ELEMENTS, elementsOf, type Element } from '../core/elements';
import type { PieceName } from '../core/pieces';
import type { Rng } from '../core/rng';
import {
  HARD_DROP_POINTS_PER_ROW,
  SOFT_DROP_POINTS_PER_ROW,
  gravityInterval,
  lineClearPoints,
} from '../core/scoring';
import { ENEMIES } from '../data/enemies';
import type { ChallengeSpec } from '../data/types';
import { featsOfLock, recordFeats } from '../game/feats';
import { addMana, clearMana, type Hero } from '../game/hero';
import { scaledEnemy } from '../game/scaling';
import { fallMultiplier, previewCount } from '../game/stats';
import { BarterChallenge } from './barter';
import { CombatChallenge } from './combat';
import { HaggleChallenge } from './haggle';
import { LessonChallenge } from './lesson';
import { OfferingChallenge } from './offering';
import { PuzzleChallenge } from './puzzle';
import { steeredLanding } from './assist';
import { createEncounterChallenge, encounterDef } from './verbs';
import type { Assist, Demo } from '../data/encounters';
import { colorOfElement } from '../core/elements';
import { MENTORS } from '../data/mentors';
import { rotateClockwise, type Offset } from '../core/pieces';
import type {
  BattleContext,
  BattleEvent,
  BattleStatus,
  Challenge,
  NumberedEvent,
  Objective,
  RowPush,
  Telegraph,
} from './types';
import { createRule, type RegionRule } from './rules';
import {
  MANA_BOOST_MULTIPLIER,
  MANA_PER_LINES,
  TAILWIND_SLOWDOWN,
  MAX_PAUSES,
  QUICKEN_SPEED,
  STAKES,
  MENTOR_RULES,
  type RegionRuleId,
} from '../data/balance';
export {
  MANA_BOOST_MULTIPLIER,
  MANA_PER_LINES,
  TAILWIND_SLOWDOWN,
  MAX_PAUSES,
  QUICKEN_SPEED,
} from '../data/balance';

export type BattleAction = 'left' | 'right' | 'rotate' | 'softDrop' | 'hardDrop';

/** Most recent events kept; the screen reads them every frame. */
const MAX_EVENTS = 100;
/** A person's demo piece waits this long, then falls a row every `DEMO_ROW_MS`. */
export const DEMO_DELAY_MS = 700;
export const DEMO_ROW_MS = 45;
/** A person cries out when the stack is within this many rows of the top. */
const ALARM_ROWS = 5;
/** The person's "nearly" line comes once the objective is this far along. */
const NEARLY = 0.85;

export interface BattleOptions {
  /** Copies of each piece per bag, from area, charm and alignment (see `pieceWeights`). */
  readonly weights?: Readonly<Record<PieceName, number>>;
  /** Chance each random piece arrives dual (see `dualChance` in `src/game/pieceOdds.ts`). */
  readonly dualChance?: number;
  /** The region's rule for a monster fight (a lesson brings its mentor's own). */
  readonly rule?: RegionRuleId;
}

/**
 * Runs one falling-block battle: owns the board, gravity, input and score,
 * and delegates the rules to a `Challenge` built from a `ChallengeSpec`.
 */
export class Battle implements BattleContext {
  readonly spec: ChallengeSpec;
  readonly board: Board;
  readonly hero: Hero;
  readonly rng: Rng;
  readonly challenge: Challenge;
  /** Difficulty level (the foe's own level, unscaled); sets gravity speed. */
  readonly level: number;
  score = 0;
  lines = 0;
  hastePieces = 0;
  slowPieces = 0;
  manaBoostPieces = 0;
  fogPieces = 0;
  quickenMs = 0;
  paused = false;
  /** Pauses left this battle; while paused the board and preview are hidden. */
  pausesLeft = MAX_PAUSES;
  /**
   * False during an encounter's pre-roll: the board, its skin and the
   * objective show, but no clock runs until the hero's first touch (§2).
   */
  started: boolean;
  /** The person's demo piece while it is being placed for the hero (inputs wait). */
  demo: { readonly def: Demo; wait: number } | null = null;
  /** True once the hero gave up: it counts as a fail. */
  gaveUp = false;
  /** The mentor's assist on an assisted threshold try. */
  readonly assist: Assist | null;
  /** The region's rule in a fight or lesson (spores, the dark), if any. */
  readonly rule: RegionRule | null;
  private saidNearly = false;
  /** Oldest first, numbered so the screen can play each event once. */
  readonly events: NumberedEvent[] = [];
  private nextSeq = 0;
  private gravityTimer = 0;

  constructor(spec: ChallengeSpec, hero: Hero, rng: Rng, options: BattleOptions = {}) {
    this.spec = spec;
    this.hero = hero;
    // Spells are paid for on the board: every battle starts with empty pools.
    clearMana(hero);
    this.rng = rng;
    const def = spec.kind === 'encounter' ? encounterDef(spec) : null;
    this.board = new Board(rng, def?.width ?? BOARD_WIDTH, BOARD_HEIGHT, options.weights);
    this.board.dualChance = options.dualChance ?? 0;
    this.challenge = createChallenge(this, spec);
    this.started = !this.challenge.preroll;
    const ruleId = spec.kind === 'lesson' ? MENTOR_RULES[spec.mentorId] : options.rule;
    this.rule = ruleId && spec.kind !== 'encounter' ? createRule(this, ruleId) : null;
    this.assist = spec.kind === 'encounter' && spec.assisted ? (def?.assist ?? null) : null;
    // Gravity follows the foe's own level: growing with the hero makes it
    // tougher (see `scaledEnemy`), not faster-falling.
    this.level =
      spec.kind === 'combat'
        ? (ENEMIES[spec.enemyId]?.level ?? 1)
        : this.challenge instanceof CombatChallenge
          ? this.challenge.enemy.level
          : 1;
    this.board.spawn();
    if (spec.kind === 'encounter' && spec.demo && def?.demo) this.startDemo(def.demo);
  }

  /** Sets the person's demo piece at the top, turned, over its column; it falls on its own. */
  private startDemo(demo: Demo): void {
    const board = this.board;
    const displaced = board.active;
    let cells: readonly Offset[] = PIECES[demo.piece].cells;
    for (let i = 0; i < demo.turns; i++) cells = rotateClockwise(cells);
    const minX = Math.min(...cells.map(([cx]) => cx));
    if (!board.replaceActive(demo.piece, { cells, x: demo.x - minX })) return;
    if (demo.extra && displaced) board.requeue(displaced);
    this.demo = { def: demo, wait: DEMO_DELAY_MS };
  }

  get status(): BattleStatus {
    if (this.gaveUp) return 'lost';
    return this.challenge.status();
  }

  /** The hero gives up: once committed (after the first touch) it counts as a fail. */
  giveUp(): void {
    if (this.status === 'ongoing') this.gaveUp = true;
  }

  get objective(): Objective {
    return this.challenge.objective();
  }

  /** The combat rules when this battle is a fight, for spells and items. */
  get combat(): CombatChallenge | null {
    return this.challenge instanceof CombatChallenge ? this.challenge : null;
  }

  /** Milliseconds between gravity steps right now (slower with Agility). */
  get gravityMs(): number {
    const agile = gravityInterval(this.level) * fallMultiplier(this.hero.stats.agility);
    const base = this.quickenMs > 0 ? agile / QUICKEN_SPEED : agile;
    if (this.hastePieces > 0) return base / 2;
    return this.slowPieces > 0 ? base * TAILWIND_SLOWDOWN : base;
  }

  /** The upcoming pieces the hero can see (more with Insight; none in an enemy's fog). */
  get upcoming(): PieceName[] {
    return this.upcomingPieces.map((piece) => piece.name);
  }

  /** The same, with each piece's colours (a dual piece shows two-tone). */
  get upcomingPieces(): QueuedPiece[] {
    const shown = Math.max(previewCount(this.hero.stats.insight), this.challenge.previews ?? 0);
    return this.board.previewPieces(this.fogPieces > 0 ? 0 : shown);
  }

  /** The elements that surged in each of the last two locks, oldest first (a lock with none: []). */
  readonly recentSurges: Element[][] = [];

  /**
   * Pushes `count` rows up from the bottom, each with one random gap, in
   * stone or mold: every pushed row goes through here (see `RowPush`).
   */
  pushRows(push: RowPush, count: number): number {
    const width = this.board.width;
    for (let i = 0; i < count; i++) {
      const gap = this.rng.int(width);
      this.board.pushRow(
        Array.from({ length: width }, (_, x) =>
          x === gap ? null : push.fill === 'mold' ? (x % 2 === 0 ? 'violet' : 'green') : 'stone',
        ),
      );
    }
    if (count > 0) this.emit({ kind: 'rise', rows: count, source: push.source });
    return count;
  }

  emit(event: BattleEvent): void {
    this.events.push({ seq: this.nextSeq++, event });
    if (this.events.length > MAX_EVENTS) this.events.shift();
  }

  /** Everything marked on the board ahead of time: the challenge's and the region rule's. */
  telegraphs(): readonly Telegraph[] {
    return [...(this.challenge.telegraphs?.() ?? []), ...(this.rule?.telegraphs() ?? [])];
  }

  /** Events numbered `afterSeq` or later. */
  eventsSince(afterSeq: number): NumberedEvent[] {
    return this.events.filter((e) => e.seq >= afterSeq);
  }

  /**
   * Pauses (spending one of `MAX_PAUSES`) or resumes. Returns whether the
   * state changed: a finished battle, or one out of pauses, won't pause.
   */
  togglePause(): boolean {
    if (this.paused) {
      this.paused = false;
      return true;
    }
    if (this.status !== 'ongoing' || this.pausesLeft <= 0) return false;
    this.pausesLeft--;
    this.paused = true;
    return true;
  }

  /** Applies a player input. Ignored when paused or finished. */
  input(action: BattleAction): void {
    if (!this.accepting() || this.demo) return;
    if (!this.started) {
      // The first touch ends the pre-roll: the hero is committed and the clock starts.
      this.started = true;
      this.emit({ kind: 'begin' });
      this.emit({ kind: 'beat', beat: 'start' });
    }
    const board = this.board;
    switch (action) {
      case 'left':
        board.move(-1, 0);
        break;
      case 'right':
        board.move(1, 0);
        break;
      case 'rotate':
        board.rotate();
        break;
      case 'softDrop': {
        const result = board.step();
        if (result) this.afterLock(result);
        else this.score += SOFT_DROP_POINTS_PER_ROW;
        this.gravityTimer = 0;
        break;
      }
      case 'hardDrop': {
        const { distance, result } = board.hardDrop();
        this.score += distance * HARD_DROP_POINTS_PER_ROW;
        this.afterLock(result);
        break;
      }
    }
  }

  /** Advances gravity and challenge timers by `dtMs`. */
  update(dtMs: number): void {
    if (!this.accepting()) return;
    if (this.demo) {
      this.playDemo(dtMs);
      return;
    }
    if (!this.started) {
      this.challenge.prerollUpdate?.(dtMs);
      return;
    }
    this.challenge.update(dtMs);
    this.quickenMs = Math.max(0, this.quickenMs - dtMs);
    this.gravityTimer += dtMs;
    while (this.gravityTimer >= this.gravityMs && this.accepting()) {
      this.gravityTimer -= this.gravityMs;
      const result = this.board.step();
      if (result) this.afterLock(result);
    }
  }

  private accepting(): boolean {
    return !this.paused && this.status === 'ongoing' && this.board.active !== null;
  }

  /** The demo piece waits, then falls a row at a time and locks; then the hero has control. */
  private playDemo(dtMs: number): void {
    const demo = this.demo as NonNullable<Battle['demo']>;
    demo.wait -= dtMs;
    while (demo.wait <= 0 && this.demo) {
      demo.wait += DEMO_ROW_MS;
      const result = this.board.step();
      if (result) {
        this.demo = null;
        this.emit({ kind: 'demo' });
        this.afterLock(result);
      }
    }
  }

  /**
   * Counts board feats in fights (see `src/game/feats.ts`), scores the
   * lock, fills elemental mana from every cleared crystal (in any kind of
   * battle; doubled while an Ether lasts), then lets the challenge apply its rules.
   */
  private afterLock(result: LockResult): void {
    // Only fights (and lessons) count: puzzles' preset boards can't be replayed for feats.
    if (this.combat) recordFeats(this.hero, featsOfLock(result, this.hastePieces > 0));
    this.lines += result.linesCleared;
    this.score += lineClearPoints(result.linesCleared);
    if (this.hastePieces > 0) this.hastePieces--;
    if (this.slowPieces > 0) this.slowPieces--;
    if (this.fogPieces > 0) this.fogPieces--;
    const boost = this.manaBoostPieces > 0 ? MANA_BOOST_MULTIPLIER : 1;
    if (this.manaBoostPieces > 0) this.manaBoostPieces--;
    if (result.linesCleared > 0) {
      this.emit({ kind: 'lines', rows: result.rows, lines: result.lines });
      const crystals = elementsOf(result.clearedCells);
      const share = MANA_PER_LINES[Math.min(result.linesCleared, MANA_PER_LINES.length - 1)] ?? 0;
      const gained = Object.fromEntries(
        ELEMENTS.map((e) => [e, Math.floor(crystals[e] * share) * boost]),
      );
      if (addMana(this.hero, gained) > 0) this.emit({ kind: 'mana', gained });
    }
    if (result.holesMade > 0) this.emit({ kind: 'holes', count: result.holesMade });
    const first = this.nextSeq;
    this.challenge.onLock(result);
    if (this.rule && this.status === 'ongoing') this.rule.onLock(result);
    this.recentSurges.push(
      this.eventsSince(first).flatMap(({ event }) =>
        event.kind === 'surge' ? [event.element] : [],
      ),
    );
    if (this.recentSurges.length > 2) this.recentSurges.shift();
    if (this.spec.kind === 'encounter') this.react(result);
    if (this.assist && this.status === 'ongoing' && this.rng.next() < STAKES.assistToss)
      this.assistToss(this.assist);
  }

  /** The person in the strip reacts: a cheer at a 3+ clear, alarm near the top, a wince at a hole. */
  private react(result: LockResult): void {
    const face =
      result.linesCleared >= 3
        ? 'cheer'
        : this.board.stackTop() < ALARM_ROWS
          ? 'alarm'
          : result.holesMade > 0
            ? 'wince'
            : null;
    if (face) this.emit({ kind: 'face', face });
    if (!this.saidNearly && this.status === 'ongoing' && this.objective.progress >= NEARLY) {
      this.saidNearly = true;
      this.emit({ kind: 'beat', beat: 'nearly' });
    }
  }

  /** The mentor tosses the shape the challenge's hint likes best, in its own colour or theirs. */
  private assistToss(assist: Assist): void {
    const best = steeredLanding(
      this.board,
      assist.shapes,
      this.challenge.hint?.bind(this.challenge),
    );
    const mentor = MENTORS[assist.mentorId];
    if (!best || !mentor) return;
    const color = colorOfElement(mentor.element);
    if (this.board.replaceActive(best.name, assist.recolor ? { color } : {})) {
      this.emit({ kind: 'toss', element: mentor.element, piece: best.name });
    }
  }
}

function createChallenge(ctx: BattleContext, spec: ChallengeSpec): Challenge {
  switch (spec.kind) {
    case 'combat': {
      const enemy = ENEMIES[spec.enemyId];
      if (!enemy) throw new Error(`Unknown enemy: ${spec.enemyId}`);
      return new CombatChallenge(ctx, scaledEnemy(enemy, ctx.hero.level));
    }
    case 'offering':
      return new OfferingChallenge(ctx, spec.itemId, spec.targetScore, spec.pieceLimit);
    case 'barter':
      return new BarterChallenge(ctx, spec.wants, spec.pieceLimit);
    case 'haggle':
      return new HaggleChallenge(ctx, spec.pieceLimit, spec.rivalIntervalMs);
    case 'puzzle':
      return new PuzzleChallenge(ctx, spec.rows, spec.queue, spec.linesToClear);
    case 'lesson':
      return new LessonChallenge(ctx, spec);
    case 'encounter':
      return createEncounterChallenge(ctx, spec);
  }
}
