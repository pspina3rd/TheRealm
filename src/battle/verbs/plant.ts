import type { ClearedRow, LockResult, Supply } from '../../core/board';
import type { Grid, Landing, TagGrid } from '../../core/landing';
import type { Cell, CrystalColor } from '../../core/pieces';
import {
  piecesLeft,
  type BattleContext,
  type BattleStatus,
  type Challenge,
  type Objective,
} from '../types';

/** A PLANT board (§2): column zones that each want a colour, sized to its shape. */
export interface PlantParams {
  /** Each column's wanted colour (a furrow), or null (a path that scores nothing). */
  readonly zones: readonly (CrystalColor | null)[];
  /** Columns with an inert soil ridge at row 1 (never scores). */
  readonly ridges: readonly number[];
  readonly target: number;
  /** A Great at this score or more. */
  readonly great: number;
  readonly pieceLimit: number;
  /** The controlled queue's guaranteed supply. */
  readonly supply: Supply;
  /** What a wrong colour in a zone scores (0 at Mossvale, −1 from Twitch on). */
  readonly wrongColour: number;
  /** Target added per strain step. */
  readonly strainTarget: number;
}

/**
 * PLANT (Bean's herb beds): in each cleared line, a crystal of its zone's
 * colour scores +1 (a dual half counts: it's a crystal of that colour),
 * a wrong colour scores `wrongColour`, paths and ridges score nothing. It
 * ends at sundown (the piece limit): a win at the target or more, a Great
 * at `great`. Fail: below target at sundown, or a top-out.
 */
export class PlantChallenge implements Challenge {
  readonly preroll = true;
  score = 0;
  readonly target: number;
  private readonly ctx: BattleContext;
  private readonly params: PlantParams;

  constructor(ctx: BattleContext, params: PlantParams, strain = 0) {
    this.ctx = ctx;
    this.params = params;
    this.target = params.target + strain * params.strainTarget;
    const board = ctx.board;
    board.supply = params.supply;
    board.loadRows([]);
    for (const x of params.ridges) {
      (board.grid[board.height - 1] as Cell[])[x] = 'stone';
      board.setTag(x, board.height - 1, 'ridge');
    }
  }

  /** What one cleared row scores. */
  rowScore(row: ClearedRow): number {
    return row.cells.reduce<number>((sum, cell, x) => {
      const want = this.params.zones[x];
      if (!want || cell === null || row.tags[x] === 'ridge') return sum;
      return sum + (cell === want ? 1 : this.params.wrongColour);
    }, 0);
  }

  /** True when the score reached the Great mark. */
  get great(): boolean {
    return this.score >= this.params.great;
  }

  onLock(result: LockResult): void {
    const gained = result.clearedRows.reduce((sum, row) => sum + this.rowScore(row), 0);
    this.score += gained;
    if (gained > 0) this.ctx.emit({ kind: 'beat', beat: 'hazard' });
  }

  update(): void {}

  status(): BattleStatus {
    if (this.ctx.board.toppedOut) return 'lost';
    if (piecesLeft(this.ctx, this.params.pieceLimit) > 0) return 'ongoing';
    return this.score >= this.target ? 'won' : 'lost';
  }

  objective(): Objective {
    return {
      label: 'Plant sprouts',
      progress: Math.min(1, this.score / this.target),
      piecesLeft: piecesLeft(this.ctx, this.params.pieceLimit),
      counter: `Sprouts ${this.score}/${this.target}`,
    };
  }

  /** Wanted cells standing in their zones, waiting for a clear, and wrong ones in the way. */
  private standing(grid: Grid, tags: TagGrid): number {
    let worth = 0;
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        const want = this.params.zones[x];
        if (!want || cell === null || tags[y]?.[x] === 'ridge') return;
        worth += cell === want ? 1 : -1.5;
      }),
    );
    return worth;
  }

  /** Planting's worth: sprouts scored now count most; wanted colour in a furrow next. */
  hint(landing: Landing): number {
    const scored = landing.clearedRows.reduce((sum, row) => sum + this.rowScore(row), 0);
    return 8 * scored + this.standing(landing.grid, landing.tags);
  }
}
