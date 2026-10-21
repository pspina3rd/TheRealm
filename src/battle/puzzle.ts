import type { LockResult } from '../core/board';
import type { PieceName } from '../core/pieces';
import type { BattleContext, BattleStatus, Challenge, Objective } from './types';

/**
 * A preset board with a fixed piece sequence. Clear `linesToClear` lines
 * before the pieces run out.
 */
export class PuzzleChallenge implements Challenge {
  readonly linesToClear: number;
  linesCleared = 0;
  private readonly ctx: BattleContext;

  constructor(
    ctx: BattleContext,
    rows: readonly string[],
    queue: readonly PieceName[],
    linesToClear: number,
  ) {
    this.ctx = ctx;
    this.linesToClear = linesToClear;
    ctx.board.loadRows(rows);
    ctx.board.setFixedQueue(queue);
  }

  onLock(result: LockResult): void {
    this.linesCleared += result.linesCleared;
  }

  update(): void {}

  status(): BattleStatus {
    if (this.linesCleared >= this.linesToClear) return 'won';
    if (this.ctx.board.toppedOut || !this.ctx.board.active) return 'lost';
    return 'ongoing';
  }

  objective(): Objective {
    const left = this.ctx.board.piecesRemaining;
    return {
      label: 'Crystal puzzle',
      detail: `Lines ${this.linesCleared} / ${this.linesToClear} · ${left} piece${left === 1 ? '' : 's'} left`,
      progress: Math.min(1, this.linesCleared / this.linesToClear),
    };
  }
}
