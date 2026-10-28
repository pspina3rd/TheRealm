import type { LockResult } from '../../core/board';
import type { Landing, TagGrid } from '../../core/landing';
import { isCrystal } from '../../core/pieces';
import { TELEGRAPH_LEAD } from '../../data/balance';
import {
  piecesLeft,
  type BattleContext,
  type BattleStatus,
  type Challenge,
  type Objective,
  type Telegraph,
} from '../types';

/** A CONTAIN board (§2): hazard tags that spread, and protected tags to save. */
export interface ContainParams {
  /** Start rows, top first; `R` is a hazard source, `C` a protected cell (both on crystals). */
  readonly rows: readonly string[];
  readonly pieceLimit: number;
  /** The hazard spreads every this many pieces… */
  readonly spreadEvery: number;
  /** …this many cells at a time. */
  readonly spreadCells: number;
  /** Protected cells that must be saved (picked or still alive) to win… */
  readonly keepCaps: number;
  /** …and how many lost ones fail. */
  readonly deadCapsFail: number;
  /** Extra hazard cells at the start per strain step. */
  readonly strainHazard: number;
}

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * CONTAIN + protect (Wren's mushroom ring). Every `spreadEvery` pieces the
 * hazard (rot) spreads into adjacent crystals, the hero's own included;
 * the crystals it could reach are marked one piece ahead. A protected cell
 * (a young cap) it reaches dies. Clearing a line removes its hazard, and a
 * protected cell in a cleared line is picked (saved). Win: no hazard left
 * with enough caps saved. Fail: too many caps lost, the pieces run out, or
 * a top-out.
 */
export class ContainChallenge implements Challenge {
  readonly preroll = true;
  picked = 0;
  dead = 0;
  untilSpread: number;
  private readonly total: number;
  private readonly ctx: BattleContext;
  private readonly params: ContainParams;

  constructor(ctx: BattleContext, params: ContainParams, strain = 0) {
    this.ctx = ctx;
    this.params = params;
    const board = ctx.board;
    board.loadRows(params.rows, {
      R: { cell: 'orange', tag: 'hazard' },
      C: { cell: 'green', tag: 'protected' },
    });
    this.total = board.countTag('protected');
    this.untilSpread = params.spreadEvery;
    for (let i = 0; i < strain * params.strainHazard; i++) this.spread(1, false);
  }

  /** Protected cells still on the board. */
  get alive(): number {
    return this.ctx.board.countTag('protected');
  }

  /** Crystals the hazard could spread into next: filled, untagged or protected, beside a hazard. */
  frontier(grid = this.ctx.board.grid, tags: TagGrid = this.ctx.board.tags): [number, number][] {
    const seen = new Set<string>();
    const out: [number, number][] = [];
    tags.forEach((row, y) =>
      row.forEach((tag, x) => {
        if (tag !== 'hazard') return;
        for (const [dx, dy] of NEIGHBOURS) {
          const nx = x + dx;
          const ny = y + dy;
          const cell = grid[ny]?.[nx];
          const key = `${nx},${ny}`;
          if (!isCrystal(cell ?? null) || seen.has(key)) continue;
          const t = tags[ny]?.[nx] ?? null;
          if (t === 'hazard') continue;
          seen.add(key);
          out.push([nx, ny]);
        }
      }),
    );
    return out;
  }

  /** The hazard takes `count` cells next to it; caps it reaches die (unless `harm` is off). */
  private spread(count: number, harm = true): void {
    const board = this.ctx.board;
    const taken: [number, number][] = [];
    // One spread is simultaneous: newly infected cells become sources on
    // the next tick, never a hidden second hop beyond this tick's warning.
    const options = this.frontier().filter(([x, y]) => harm || board.tagAt(x, y) !== 'protected');
    for (let i = 0; i < count && options.length > 0; i++) {
      const [x, y] = this.ctx.rng.pick(options);
      options.splice(
        options.findIndex(([ox, oy]) => ox === x && oy === y),
        1,
      );
      if (board.tagAt(x, y) === 'protected') {
        this.dead++;
        this.ctx.emit({ kind: 'lost' });
      }
      board.setTag(x, y, 'hazard');
      taken.push([x, y]);
    }
    if (harm && taken.length > 0) {
      this.ctx.emit({ kind: 'spread', cells: taken });
      this.ctx.emit({ kind: 'beat', beat: 'hazard' });
    }
  }

  onLock(result: LockResult): void {
    const picked = result.clearedTags.protected ?? 0;
    if (picked > 0) {
      this.picked += picked;
      this.ctx.emit({ kind: 'saved' });
    }
    if (this.status() !== 'ongoing') return;
    this.untilSpread--;
    if (this.untilSpread <= 0) {
      this.untilSpread = this.params.spreadEvery;
      this.spread(this.params.spreadCells);
    }
  }

  update(): void {}

  status(): BattleStatus {
    const board = this.ctx.board;
    if (this.dead >= this.params.deadCapsFail) return 'lost';
    if (board.countTag('hazard') === 0 && this.picked + this.alive >= this.params.keepCaps)
      return 'won';
    if (board.toppedOut || piecesLeft(this.ctx, this.params.pieceLimit) === 0) return 'lost';
    return 'ongoing';
  }

  /** True when every cap was saved (a Great). */
  get great(): boolean {
    return this.picked + this.alive === this.total;
  }

  objective(): Objective {
    const rot = this.ctx.board.countTag('hazard');
    return {
      label: 'Clear the rot',
      progress: rot === 0 ? 1 : Math.max(0, 1 - rot / 20),
      piecesLeft: piecesLeft(this.ctx, this.params.pieceLimit),
      counter: `Rot ${rot} · caps ${this.picked + this.alive}/${this.total}`,
    };
  }

  telegraphs(): readonly Telegraph[] {
    return this.untilSpread <= TELEGRAPH_LEAD
      ? [{ kind: 'cells', what: 'spread', cells: this.frontier(), leadPieces: TELEGRAPH_LEAD }]
      : [];
  }

  /**
   * Containing's worth: hazard cleared, caps picked (and never next to the
   * hazard), and no new crystals handed to the hazard.
   */
  hint(landing: Landing): number {
    let worth = 0;
    for (const row of landing.clearedRows) {
      for (const tag of row.tags) {
        if (tag === 'hazard') worth += 6;
        if (tag === 'protected') worth += 10;
      }
    }
    const reach = this.frontier(landing.grid, landing.tags);
    const caps = reach.filter(([x, y]) => landing.tags[y]?.[x] === 'protected').length;
    const hazard = landing.tags.reduce(
      (sum, row) => sum + row.filter((t) => t === 'hazard').length,
      0,
    );
    return worth - 1.5 * reach.length - 15 * caps - 3 * hazard;
  }
}
