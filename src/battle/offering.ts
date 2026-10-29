import { ITEMS } from '../data/items';
import { itemCount } from '../game/hero';
import {
  piecesLeft,
  type BattleContext,
  type BattleStatus,
  type Challenge,
  type Objective,
} from './types';

/**
 * An offering. Presenting an item to an NPC costs points the way casting a
 * spell costs MP: score `targetScore` within `pieceLimit` pieces. The item is
 * only consumed on success (by the game layer), so failing is never a loss.
 */
export class OfferingChallenge implements Challenge {
  readonly itemId: string;
  readonly targetScore: number;
  readonly pieceLimit: number;
  private readonly ctx: BattleContext;

  constructor(ctx: BattleContext, itemId: string, targetScore: number, pieceLimit: number) {
    if (itemCount(ctx.hero, itemId) < 1) {
      throw new Error(`An offering needs a ${ITEMS[itemId]?.name ?? itemId}`);
    }
    this.ctx = ctx;
    this.itemId = itemId;
    this.targetScore = targetScore;
    this.pieceLimit = pieceLimit;
  }

  onLock(): void {}

  update(): void {}

  status(): BattleStatus {
    if (this.ctx.score >= this.targetScore) return 'won';
    if (this.ctx.board.toppedOut || piecesLeft(this.ctx, this.pieceLimit) === 0) return 'lost';
    return 'ongoing';
  }

  objective(): Objective {
    const name = ITEMS[this.itemId]?.name ?? this.itemId;
    return {
      label: `Offer: ${name}`,
      progress: Math.min(1, this.ctx.score / this.targetScore),
      piecesLeft: piecesLeft(this.ctx, this.pieceLimit),
      score: { have: this.ctx.score, want: this.targetScore },
    };
  }
}
