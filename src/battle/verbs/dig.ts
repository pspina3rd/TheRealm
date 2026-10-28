import type { Cell } from '../../core/pieces';
import type { LockResult } from '../../core/board';
import type { Landing } from '../../core/landing';
import type { Rng } from '../../core/rng';
import type { BattleContext, BattleStatus, Challenge, Objective, Telegraph } from '../types';

/** A DIG board (docs/ENCOUNTER_DESIGN.md §2): debris over a tagged target, and rising rows. */
export interface DigParams {
  /** Start rows, top first; `m` is mold, `P` the target (a tagged stone). */
  readonly rows: readonly string[];
  /** A cell above this row (row 1 is the bottom) fails: the mold is over the lip. */
  readonly lip: number;
  /** A 1-gap mold row pushes up every this many pieces… */
  readonly risingEvery: number;
  /** …and each new buried hole brings it this many pieces sooner. */
  readonly soonerPerHole: number;
  /** Debris rows added on top per strain step. */
  readonly strainRows: number;
}

/** A row of mold (violet and green crystals) with one gap. */
export function moldRow(width: number, rng: Rng): Cell[] {
  const gap = rng.int(width);
  return Array.from({ length: width }, (_, x) =>
    x === gap ? null : x % 2 === 0 ? 'violet' : 'green',
  );
}

/** A mold row as `loadRows` text, with one gap. */
function moldText(width: number, rng: Rng): string {
  const gap = rng.int(width);
  return Array.from({ length: width }, (_, x) => (x === gap ? '.' : 'm')).join('');
}

/**
 * DIG + rising (Rowan's well): clear the target's row before the debris
 * climbs over the lip. Every `risingEvery` pieces a 1-gap mold row pushes
 * up from below, and each new buried hole brings it a piece sooner; it is
 * telegraphed when one piece away. Win: the target's row clears. Fail: a
 * cell over the lip, or a top-out.
 */
export class DigChallenge implements Challenge {
  readonly preroll = true;
  /** Pieces until the next rising row. */
  untilRise: number;
  private won = false;
  private overLip = false;
  private readonly start: number;
  private readonly ctx: BattleContext;
  private readonly params: DigParams;

  constructor(ctx: BattleContext, params: DigParams, strain = 0) {
    this.ctx = ctx;
    this.params = params;
    const board = ctx.board;
    const extra = Array.from({ length: strain * params.strainRows }, () =>
      moldText(board.width, ctx.rng),
    );
    board.loadRows([...extra, ...params.rows], { P: { cell: 'stone', tag: 'target' } });
    this.untilRise = Number(process.env.RISE ?? params.risingEvery);
    this.start = this.rowsAbove();
  }

  /** The board row (from the top) of the lip: cells in rows above it are over. */
  get lipY(): number {
    return this.ctx.board.height - this.params.lip;
  }

  /** Rows with debris above the target, still to dig through. */
  rowsAbove(): number {
    const board = this.ctx.board;
    const [target] = board.tagged('target');
    if (!target) return 0;
    return board.grid.slice(0, target[1]).filter((row) => row.some((c) => c !== null)).length;
  }

  onLock(result: LockResult): void {
    if ((result.clearedTags.target ?? 0) > 0) {
      this.won = true;
      return;
    }
    const board = this.ctx.board;
    if (result.placed.some(([, y]) => y < this.lipY)) {
      this.overLip = true;
      return;
    }
    this.untilRise -= 1 + this.params.soonerPerHole * result.holesMade;
    if (this.untilRise <= 0) {
      this.untilRise = this.params.risingEvery;
      board.pushRow(moldRow(board.width, this.ctx.rng));
      this.ctx.emit({ kind: 'rise', rows: 1 });
      this.ctx.emit({ kind: 'beat', beat: 'hazard' });
      if (board.stackTop() < this.lipY) this.overLip = true;
    }
  }

  update(): void {}

  status(): BattleStatus {
    if (this.won) return 'won';
    if (this.overLip || this.ctx.board.toppedOut) return 'lost';
    return 'ongoing';
  }

  objective(): Objective {
    const left = this.rowsAbove();
    return {
      label: 'Dig to the pipe',
      progress: this.won ? 1 : Math.max(0, 1 - left / Math.max(1, this.start + 1)),
      piecesLeft: null,
      counter: this.won ? 'Clear!' : `${left} rows to the pipe`,
    };
  }

  telegraphs(): readonly Telegraph[] {
    return this.untilRise <= 1 ? [{ kind: 'rows', what: 'rise', rows: 1 }] : [];
  }

  /**
   * Digging's worth: clearing the target's row wins outright; a cell over
   * the lip loses; each row of debris still above the target costs.
   */
  hint(landing: Landing): number {
    if (landing.clearedRows.some((row) => row.tags.includes('target'))) return 1000;
    if (landing.placed.some(([, y]) => y < this.lipY)) return -1000;
    const target = Math.max(0, landing.tags.findIndex((row) => row.includes('target')));
    const rows = landing.grid.slice(0, target + 1);
    const cells = rows
      .slice(0, target)
      .reduce((sum, row) => sum + row.filter((c) => c !== null).length, 0);
    // Buried gaps down to the target's row: each one brings the mold sooner and must be dug out.
    let buried = 0;
    for (let x = 0; x < landing.grid[0]!.length; x++) {
      let covered = false;
      for (const row of rows) {
        if (row[x] !== null) covered = true;
        else if (covered) buried++;
      }
    }
    return 3 * landing.lines - 1.5 * cells - 8 * buried;
  }
}
