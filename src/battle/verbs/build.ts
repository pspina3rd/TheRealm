import type { LockResult } from '../../core/board';
import type { Grid, Landing } from '../../core/landing';
import type { PieceName } from '../../core/pieces';
import type { BattleContext, BattleStatus, Challenge, Objective } from '../types';

/** A rectangle of cells, in columns and rows counted from the bottom (row 1). */
export interface Area {
  readonly cols: readonly [number, number];
  readonly rows: readonly [number, number];
}

/** A BUILD board (§2): a ghost outline to fill, a spare area, an authored queue. */
export interface BuildParams {
  /** The outline's parts (Pip's tower and its spinner). */
  readonly outline: readonly Area[];
  /** Where a mess is fine (Pip's toy box): no wobbles, and gaps there aren't cracks. */
  readonly spare: Area;
  readonly queue: readonly PieceName[];
  /** Fails on the crack after this many, and the wobble after this many. */
  readonly crackLimit: number;
  readonly wobbleLimit: number;
  /** Pieces shown ahead. */
  readonly previews: number;
  /** Pre-cracked cells per strain step. */
  readonly strainCracks: number;
}

/** "x,y" keys of an area's board cells on a board `height` tall. */
function areaKeys(area: Area, height: number): string[] {
  const keys: string[] = [];
  for (let x = area.cols[0]; x <= area.cols[1]; x++) {
    for (let row = area.rows[0]; row <= area.rows[1]; row++) keys.push(`${x},${height - row}`);
  }
  return keys;
}

/**
 * BUILD (Pip's tower): fill the ghost outline; lines never clear. A piece
 * with any cell outside both the outline and the spare area is a wobble;
 * an empty outline cell with a block above it is a crack. Win: every
 * outline cell filled. Fail: one crack or wobble past the limit, the
 * queue running out first, or a top-out.
 */
export class BuildChallenge implements Challenge {
  readonly preroll = true;
  readonly previews: number;
  wobbles = 0;
  private readonly outline: Set<string>;
  private readonly spare: Set<string>;
  private readonly preCracked: number;
  private readonly ctx: BattleContext;
  private readonly params: BuildParams;

  constructor(ctx: BattleContext, params: BuildParams, strain = 0) {
    this.ctx = ctx;
    this.params = params;
    this.previews = params.previews;
    const height = ctx.board.height;
    this.outline = new Set(params.outline.flatMap((area) => areaKeys(area, height)));
    this.spare = new Set(areaKeys(params.spare, height));
    this.preCracked = strain * params.strainCracks;
    ctx.board.clearsEnabled = false;
    ctx.board.loadRows([]);
    ctx.board.setFixedQueue(params.queue);
  }

  /** True when board cell (x, y) is part of the outline. */
  inOutline(x: number, y: number): boolean {
    return this.outline.has(`${x},${y}`);
  }

  /** True when board cell (x, y) is in the spare area. */
  inSpare(x: number, y: number): boolean {
    return this.spare.has(`${x},${y}`);
  }

  /** Outline cells filled on `grid`. */
  private filled(grid: Grid): number {
    let filled = 0;
    for (const key of this.outline) {
      const [x, y] = key.split(',').map(Number) as [number, number];
      if (grid[y]?.[x] !== null) filled++;
    }
    return filled;
  }

  /** Cracks on `grid`: empty outline cells with a block somewhere above them, plus any pre-cracked. */
  cracksOn(grid: Grid): number {
    let cracks = this.preCracked;
    for (const key of this.outline) {
      const [x, y] = key.split(',').map(Number) as [number, number];
      if (grid[y]?.[x] !== null) continue;
      if (grid.slice(0, y).some((row) => row[x] !== null)) cracks++;
    }
    return cracks;
  }

  get cracks(): number {
    return this.cracksOn(this.ctx.board.grid);
  }

  /** True when a piece placed at these cells wobbles (any cell outside the outline and spare area). */
  private wobbly(placed: readonly (readonly [number, number])[]): boolean {
    return placed.some(([x, y]) => !this.inOutline(x, y) && !this.inSpare(x, y));
  }

  onLock(result: LockResult): void {
    if (this.wobbly(result.placed)) {
      this.wobbles++;
      this.ctx.emit({ kind: 'beat', beat: 'hazard' });
    }
    if (result.holesMade > 0) this.ctx.emit({ kind: 'face', face: 'wince' });
  }

  update(): void {}

  status(): BattleStatus {
    const board = this.ctx.board;
    if (this.cracks > this.params.crackLimit || this.wobbles > this.params.wobbleLimit)
      return 'lost';
    if (this.filled(board.grid) === this.outline.size) return 'won';
    if (board.toppedOut || !board.active) return 'lost';
    return 'ongoing';
  }

  objective(): Objective {
    const filled = this.filled(this.ctx.board.grid);
    return {
      label: 'Build the tower',
      progress: filled / this.outline.size,
      piecesLeft: this.ctx.board.piecesRemaining,
      counter: `${filled}/${this.outline.size} · cracks ${this.cracks}/${this.params.crackLimit}`,
    };
  }

  /** Building's worth: outline cells filled, minus cracks and wobbles (each nearly fatal). */
  hint(landing: Landing): number {
    const wobble = this.wobbly(landing.placed) ? 1 : 0;
    const cracks = this.cracksOn(landing.grid);
    const over = cracks > this.params.crackLimit || this.wobbles + wobble > this.params.wobbleLimit;
    return over ? -1000 : 3 * this.filled(landing.grid) - 12 * cracks - 30 * wobble;
  }
}
