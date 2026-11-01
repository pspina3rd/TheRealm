import type { LockResult, Supply } from '../../core/board';
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
  /** Bonus for finishing within this many player pieces. */
  readonly greatPieceLimit: number;
  readonly pieceLimit: number;
  /** The controlled queue's guaranteed supply. */
  readonly supply: Supply;
  /** Reserved for later planting tasks; wrong colors at Mossvale score nothing. */
  readonly wrongColour: number;
  /** Target added per strain step. */
  readonly strainTarget: number;
}

/** Green crystals take root as they land in their marked beds. Line clears are separate. */
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
      (board.grid[board.height - 1] as Cell[])[x] = 'neutral';
      board.setTag(x, board.height - 1, 'ridge');
    }
  }

  /** Only newly placed seeds count; clears never recount the standing crop. */
  private planted(
    placed: LockResult['placed'],
    colors: readonly Cell[],
  ): readonly (readonly [number, number])[] {
    return placed.filter(([x], i) => this.params.zones[x] && colors[i] === this.params.zones[x]);
  }

  /** Efficient planting earns the bonus without prolonging a finished task. */
  get great(): boolean {
    return this.score >= this.target && this.ctx.board.piecesPlaced <= this.params.greatPieceLimit;
  }

  onLock(result: LockResult): void {
    const cells = this.planted(result.placed, result.placedColors ?? []);
    this.score += cells.length;
    if (cells.length) this.ctx.emit({ kind: 'planted', cells });
  }

  update(): void {}

  status(): BattleStatus {
    if (this.ctx.board.toppedOut) return 'lost';
    if (this.score >= this.target) return 'won';
    return piecesLeft(this.ctx, this.params.pieceLimit) > 0 ? 'ongoing' : 'lost';
  }

  objective(): Objective {
    return {
      label: 'Land green crystals in the green beds',
      progress: Math.min(1, this.score / this.target),
      piecesLeft: piecesLeft(this.ctx, this.params.pieceLimit),
      counter: `Sprouts ${this.score}/${this.target}`,
    };
  }

  /** Keep planting beds usable; wrong colors crowd out future seeds. */
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
    const scored = this.planted(landing.placed, landing.placedColors ?? []).length;
    return 8 * scored + this.standing(landing.grid, landing.tags);
  }
}
