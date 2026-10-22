import type { LockResult } from '../core/board';
import {
  piecesLeft,
  type BattleContext,
  type BattleStatus,
  type Challenge,
  type Objective,
} from './types';

/** Price multiplier bounds and steps for a haggle. */
export const HAGGLE = {
  start: 1,
  min: 0.5,
  max: 1.5,
  /** Price drop for clearing 0–4 lines at once. */
  dropPerClear: [0, 0.05, 0.12, 0.2, 0.3] as readonly number[],
  /** Price rise each time the merchant's timer fires. */
  risePerTick: 0.03,
} as const;

/**
 * A price duel with a merchant. Every line you clear pushes the price down,
 * while the merchant pushes it up on a timer. After `pieceLimit` pieces the
 * deal is struck at the current multiplier. Overflowing the board ends the
 * haggle with no deal.
 */
export class HaggleChallenge implements Challenge {
  readonly pieceLimit: number;
  readonly rivalIntervalMs: number;
  /** Current price multiplier, e.g. 0.8 means 20% off. */
  multiplier: number = HAGGLE.start;
  private rivalTimer = 0;
  private readonly ctx: BattleContext;

  constructor(ctx: BattleContext, pieceLimit: number, rivalIntervalMs: number) {
    this.ctx = ctx;
    this.pieceLimit = pieceLimit;
    this.rivalIntervalMs = rivalIntervalMs;
  }

  onLock(result: LockResult): void {
    const lines = Math.min(result.linesCleared, HAGGLE.dropPerClear.length - 1);
    if (lines > 0) {
      this.adjust(-(HAGGLE.dropPerClear[lines] ?? 0));
      this.ctx.emit({ kind: 'price', multiplier: this.multiplier });
    }
  }

  update(dtMs: number): void {
    this.rivalTimer += dtMs;
    while (this.rivalTimer >= this.rivalIntervalMs) {
      this.rivalTimer -= this.rivalIntervalMs;
      this.adjust(HAGGLE.risePerTick);
    }
  }

  status(): BattleStatus {
    if (this.ctx.board.toppedOut) return 'lost';
    return piecesLeft(this.ctx, this.pieceLimit) === 0 ? 'won' : 'ongoing';
  }

  objective(): Objective {
    return {
      label: `Haggle · price ${this.percent()}`,
      // Full bar at the best possible price.
      progress: (HAGGLE.max - this.multiplier) / (HAGGLE.max - HAGGLE.min),
      piecesLeft: piecesLeft(this.ctx, this.pieceLimit),
      price: { value: this.multiplier, min: HAGGLE.min, max: HAGGLE.max },
    };
  }

  private adjust(delta: number): void {
    const next = Math.round((this.multiplier + delta) * 100) / 100;
    this.multiplier = Math.min(HAGGLE.max, Math.max(HAGGLE.min, next));
  }

  private percent(): string {
    return `${Math.round(this.multiplier * 100)}%`;
  }
}
