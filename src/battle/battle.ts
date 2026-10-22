import { BOARD_HEIGHT, BOARD_WIDTH, Board, type LockResult } from '../core/board';
import { elementsOf } from '../core/elements';
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
import { addMana, type Hero } from '../game/hero';
import { BarterChallenge } from './barter';
import { CombatChallenge } from './combat';
import { describeSpec } from './describe';
import { HaggleChallenge } from './haggle';
import { OfferingChallenge } from './offering';
import { PuzzleChallenge } from './puzzle';
import type { BattleContext, BattleEvent, BattleStatus, Challenge, Objective, Tone } from './types';

export type BattleAction = 'left' | 'right' | 'rotate' | 'softDrop' | 'hardDrop';

/** Most recent events kept for the battle log. */
const MAX_EVENTS = 50;
/** Gravity interval multiplier under a tailwind (higher = slower). */
export const TAILWIND_SLOWDOWN = 1.6;

export interface BattleOptions {
  /** Copies of each piece per bag, from area, charm and attunement (see `pieceWeights`). */
  readonly weights?: Readonly<Record<PieceName, number>>;
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
  /** Difficulty level; sets gravity speed. */
  readonly level: number;
  score = 0;
  lines = 0;
  hastePieces = 0;
  slowPieces = 0;
  paused = false;
  /** Newest first. */
  readonly events: BattleEvent[] = [];
  private gravityTimer = 0;

  constructor(spec: ChallengeSpec, hero: Hero, rng: Rng, options: BattleOptions = {}) {
    this.spec = spec;
    this.hero = hero;
    this.rng = rng;
    this.board = new Board(rng, BOARD_WIDTH, BOARD_HEIGHT, options.weights);
    this.level = spec.kind === 'combat' ? (ENEMIES[spec.enemyId]?.level ?? 1) : 1;
    this.log(describeSpec(spec));
    this.challenge = createChallenge(this, spec);
    this.board.spawn();
  }

  get status(): BattleStatus {
    return this.challenge.status();
  }

  get objective(): Objective {
    return this.challenge.objective();
  }

  /** The combat rules when this battle is a fight, for spells and items. */
  get combat(): CombatChallenge | null {
    return this.challenge instanceof CombatChallenge ? this.challenge : null;
  }

  /** Milliseconds between gravity steps right now. */
  get gravityMs(): number {
    const base = gravityInterval(this.level);
    if (this.hastePieces > 0) return base / 2;
    return this.slowPieces > 0 ? base * TAILWIND_SLOWDOWN : base;
  }

  log(text: string, tone: Tone = 'info'): void {
    this.events.unshift({ text, tone });
    if (this.events.length > MAX_EVENTS) this.events.pop();
  }

  /** Applies a player input. Ignored when paused or finished. */
  input(action: BattleAction): void {
    if (!this.accepting()) return;
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
    this.challenge.update(dtMs);
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

  /**
   * Scores the lock, fills elemental mana from every cleared crystal (in any
   * kind of battle), then lets the challenge apply its rules.
   */
  private afterLock(result: LockResult): void {
    this.lines += result.linesCleared;
    this.score += lineClearPoints(result.linesCleared);
    if (this.hastePieces > 0) this.hastePieces--;
    if (this.slowPieces > 0) this.slowPieces--;
    addMana(this.hero, elementsOf(result.clearedCells));
    this.challenge.onLock(result);
  }
}

function createChallenge(ctx: BattleContext, spec: ChallengeSpec): Challenge {
  switch (spec.kind) {
    case 'combat':
      return new CombatChallenge(ctx, spec.enemyId);
    case 'offering':
      return new OfferingChallenge(ctx, spec.itemId, spec.targetScore, spec.pieceLimit);
    case 'barter':
      return new BarterChallenge(ctx, spec.wants, spec.pieceLimit);
    case 'haggle':
      return new HaggleChallenge(ctx, spec.pieceLimit, spec.rivalIntervalMs);
    case 'puzzle':
      return new PuzzleChallenge(ctx, spec.rows, spec.queue, spec.linesToClear);
  }
}
