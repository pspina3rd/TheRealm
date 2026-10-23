import { BOARD_HEIGHT, BOARD_WIDTH, Board, type LockResult, type QueuedPiece } from '../core/board';
import { ELEMENTS, elementsOf } from '../core/elements';
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

export interface BattleOptions {
  /** Copies of each piece per bag, from area, charm and alignment (see `pieceWeights`). */
  readonly weights?: Readonly<Record<PieceName, number>>;
  /** Chance each random piece arrives dual (see `dualChance` in `src/game/pieceOdds.ts`). */
  readonly dualChance?: number;
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
    this.board = new Board(rng, BOARD_WIDTH, BOARD_HEIGHT, options.weights);
    this.board.dualChance = options.dualChance ?? 0;
    this.challenge = createChallenge(this, spec);
    // Gravity follows the foe's own level: growing with the hero makes it
    // tougher (see `scaledEnemy`), not faster-falling.
    this.level =
      spec.kind === 'combat'
        ? (ENEMIES[spec.enemyId]?.level ?? 1)
        : this.challenge instanceof CombatChallenge
          ? this.challenge.enemy.level
          : 1;
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
    const count = this.fogPieces > 0 ? 0 : previewCount(this.hero.stats.insight);
    return this.board.previewPieces(count);
  }

  emit(event: BattleEvent): void {
    this.events.push({ seq: this.nextSeq++, event });
    if (this.events.length > MAX_EVENTS) this.events.shift();
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
    this.challenge.onLock(result);
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
  }
}
