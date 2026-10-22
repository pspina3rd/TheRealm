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
import type { ChallengeSpec } from '../data/types';
import { featsOfLock, recordFeats } from '../game/feats';
import { addMana, type Hero } from '../game/hero';
import { fallMultiplier, previewCount } from '../game/stats';
import { BarterChallenge } from './barter';
import { CombatChallenge } from './combat';
import { HaggleChallenge } from './haggle';
import { LessonChallenge } from './lesson';
import { OfferingChallenge } from './offering';
import { PuzzleChallenge } from './puzzle';
import type {
  BattleContext,
  BattleEvent,
  BattleStatus,
  Challenge,
  NumberedEvent,
  Objective,
} from './types';

export type BattleAction = 'left' | 'right' | 'rotate' | 'softDrop' | 'hardDrop';

/** Most recent events kept; the screen reads them every frame. */
const MAX_EVENTS = 100;
/** Gravity interval multiplier under a tailwind (higher = slower). */
export const TAILWIND_SLOWDOWN = 1.6;

export interface BattleOptions {
  /** Copies of each piece per bag, from area, charm and alignment (see `pieceWeights`). */
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
  /** Oldest first, numbered so the screen can play each event once. */
  readonly events: NumberedEvent[] = [];
  private nextSeq = 0;
  private gravityTimer = 0;

  constructor(spec: ChallengeSpec, hero: Hero, rng: Rng, options: BattleOptions = {}) {
    this.spec = spec;
    this.hero = hero;
    this.rng = rng;
    this.board = new Board(rng, BOARD_WIDTH, BOARD_HEIGHT, options.weights);
    this.challenge = createChallenge(this, spec);
    this.level = this.challenge instanceof CombatChallenge ? this.challenge.enemy.level : 1;
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

  /** Milliseconds between gravity steps right now (slower with Agility). */
  get gravityMs(): number {
    const base = gravityInterval(this.level) * fallMultiplier(this.hero.stats.agility);
    if (this.hastePieces > 0) return base / 2;
    return this.slowPieces > 0 ? base * TAILWIND_SLOWDOWN : base;
  }

  /** The upcoming pieces the hero can see (more with Insight). */
  get upcoming(): PieceName[] {
    return this.board.preview(previewCount(this.hero.stats.insight));
  }

  emit(event: BattleEvent): void {
    this.events.push({ seq: this.nextSeq++, event });
    if (this.events.length > MAX_EVENTS) this.events.shift();
  }

  /** Events numbered `afterSeq` or later. */
  eventsSince(afterSeq: number): NumberedEvent[] {
    return this.events.filter((e) => e.seq >= afterSeq);
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
   * Counts any board feats (see `src/game/feats.ts`), scores the lock, fills elemental mana from every cleared crystal (in any
   * kind of battle), then lets the challenge apply its rules.
   */
  private afterLock(result: LockResult): void {
    recordFeats(this.hero, featsOfLock(result, this.hastePieces > 0));
    this.lines += result.linesCleared;
    this.score += lineClearPoints(result.linesCleared);
    if (this.hastePieces > 0) this.hastePieces--;
    if (this.slowPieces > 0) this.slowPieces--;
    if (result.linesCleared > 0) {
      this.emit({ kind: 'lines', rows: result.rows, lines: result.lines });
      const gained = elementsOf(result.clearedCells);
      if (addMana(this.hero, gained) > 0) this.emit({ kind: 'mana', gained });
    }
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
    case 'lesson':
      return new LessonChallenge(ctx, spec);
  }
}
