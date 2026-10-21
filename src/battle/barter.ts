import type { CellTally, LockResult } from '../core/board';
import type { CrystalColor } from '../core/pieces';
import {
  piecesLeft,
  type BattleContext,
  type BattleStatus,
  type Challenge,
  type Objective,
} from './types';

type Wants = Readonly<Partial<Record<CrystalColor, number>>>;

/** A crystal trade: clear the requested number of cells of each colour. */
export class BarterChallenge implements Challenge {
  readonly wants: Wants;
  readonly pieceLimit: number;
  /** Crystals cleared so far, by colour. */
  readonly collected: CellTally = {};
  private readonly ctx: BattleContext;

  constructor(ctx: BattleContext, wants: Wants, pieceLimit: number) {
    this.ctx = ctx;
    this.wants = wants;
    this.pieceLimit = pieceLimit;
  }

  onLock(result: LockResult): void {
    for (const [color, count] of Object.entries(result.clearedCells)) {
      const key = color as keyof CellTally;
      this.collected[key] = (this.collected[key] ?? 0) + (count ?? 0);
    }
  }

  update(): void {}

  status(): BattleStatus {
    if (this.entries().every(([, have, want]) => have >= want)) return 'won';
    if (this.ctx.board.toppedOut || piecesLeft(this.ctx, this.pieceLimit) === 0) return 'lost';
    return 'ongoing';
  }

  objective(): Objective {
    const entries = this.entries();
    const totalWant = entries.reduce((sum, [, , want]) => sum + want, 0);
    const totalHave = entries.reduce((sum, [, have, want]) => sum + Math.min(have, want), 0);
    return {
      label: 'Barter crystals',
      detail: `${entries.map(([c, have, want]) => `${c} ${Math.min(have, want)}/${want}`).join(' · ')} · ${piecesLeft(this.ctx, this.pieceLimit)} pieces left`,
      progress: totalWant ? totalHave / totalWant : 1,
    };
  }

  /** `[colour, collected, wanted]` for each requested colour. */
  private entries(): [CrystalColor, number, number][] {
    return Object.entries(this.wants).map(([color, want]) => [
      color as CrystalColor,
      this.collected[color as CrystalColor] ?? 0,
      want ?? 0,
    ]);
  }
}
