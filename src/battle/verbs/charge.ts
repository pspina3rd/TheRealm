import type { ClearedRow, LockResult, Supply } from '../../core/board';
import { colorOfElement, type Element } from '../../core/elements';
import type { Landing } from '../../core/landing';
import { TELEGRAPH_LEAD } from '../../data/balance';
import type { Cell } from '../../core/pieces';
import {
  piecesLeft,
  type BattleContext,
  type BattleStatus,
  type Challenge,
  type Objective,
  type Telegraph,
} from '../types';

/** A CHARGE board (§2): lamps on the frame that only pure lines light. */
export interface ChargeParams {
  /** Each lamp's element, in order. */
  readonly lamps: readonly Element[];
  /** A pure line holds at least this many of its cells in the lamp's element (P ≤ 7). */
  readonly purity: number;
  readonly pieceLimit: number;
  /** Extra placements per additional strain lamp. */
  readonly strainPieces?: number;
  /** Every this many pieces the wind snuffs the oldest lit lamp, unless all are lit (0: never). */
  readonly snuffEvery: number;
  readonly supply: Supply;
  /** Lamps added per strain step (a copy of the first). */
  readonly strainLamps: number;
}

/** The element a cleared row is pure in, among `elements`, at `purity` or more; else null. */
export function pureElement(
  cells: readonly Cell[],
  elements: readonly Element[],
  purity: number,
): Element | null {
  return (
    elements.find(
      (element) => cells.filter((cell) => cell === colorOfElement(element)).length >= purity,
    ) ?? null
  );
}

/**
 * CHARGE (Vale's ward lamps): a pure line (at least `purity` of its cells
 * in one lamp's element; a dual half counts, being a crystal of that
 * colour) lights the next unlit lamp of that element. Every `snuffEvery`
 * pieces the wind snuffs the oldest lit lamp, unless all are lit; the
 * flame flickers one piece ahead. Win: every lamp lit. Fail: the pieces
 * run out, or a top-out.
 */
export class ChargeChallenge implements Challenge {
  readonly preroll = true;
  readonly lamps: Element[];
  /** Lit lamps' indexes, oldest first. */
  lit: number[] = [];
  untilSnuff: number;
  private readonly ctx: BattleContext;
  private readonly params: ChargeParams;

  constructor(ctx: BattleContext, params: ChargeParams, strain = 0) {
    this.ctx = ctx;
    this.params = {
      ...params,
      pieceLimit: params.pieceLimit + strain * (params.strainPieces ?? 0),
    };
    const first = params.lamps[0] as Element;
    this.lamps = [...params.lamps, ...Array<Element>(strain * params.strainLamps).fill(first)];
    this.untilSnuff = params.snuffEvery;
    ctx.board.supply = params.supply;
    ctx.board.loadRows([]);
  }

  private elements(): Element[] {
    return [...new Set(this.lamps)];
  }

  /** The lamp a pure row of `element` lights: the first unlit one of it, or -1. */
  private nextLamp(element: Element, lit: readonly number[] = this.lit): number {
    return this.lamps.findIndex((e, i) => e === element && !lit.includes(i));
  }

  /** Lamps a set of cleared rows would light (indexes), given those lit. */
  private lights(rows: readonly ClearedRow[], lit: readonly number[]): number[] {
    const now = [...lit];
    const added: number[] = [];
    for (const row of rows) {
      const element = pureElement(row.cells, this.elements(), this.params.purity);
      const lamp = element ? this.nextLamp(element, now) : -1;
      if (lamp >= 0) {
        now.push(lamp);
        added.push(lamp);
      }
    }
    return added;
  }

  onLock(result: LockResult): void {
    for (const lamp of this.lights(result.clearedRows, this.lit)) {
      this.lit.push(lamp);
      this.ctx.emit({ kind: 'lamp', index: lamp, lit: true });
    }
    if (this.status() !== 'ongoing' || this.params.snuffEvery <= 0) return;
    this.untilSnuff--;
    if (this.untilSnuff <= 0) {
      this.untilSnuff = this.params.snuffEvery;
      const oldest = this.lit.shift();
      if (oldest !== undefined) {
        this.ctx.emit({ kind: 'lamp', index: oldest, lit: false });
        this.ctx.emit({ kind: 'beat', beat: 'hazard' });
      }
    }
  }

  update(): void {}

  status(): BattleStatus {
    if (this.lit.length === this.lamps.length) return 'won';
    if (this.ctx.board.toppedOut || piecesLeft(this.ctx, this.params.pieceLimit) === 0)
      return 'lost';
    return 'ongoing';
  }

  objective(): Objective {
    return {
      label: 'Light the lamps',
      progress: this.lit.length / this.lamps.length,
      piecesLeft: piecesLeft(this.ctx, this.params.pieceLimit),
      counter: `Lamps ${this.lit.length}/${this.lamps.length}`,
      lamps: this.lamps.map((element, i) => ({ element, lit: this.lit.includes(i) })),
    };
  }

  telegraphs(): readonly Telegraph[] {
    const oldest = this.lit[0];
    return this.untilSnuff <= TELEGRAPH_LEAD &&
      oldest !== undefined &&
      this.lit.length < this.lamps.length
      ? [{ kind: 'lamp', index: oldest, leadPieces: TELEGRAPH_LEAD }]
      : [];
  }

  /**
   * Charging's worth: lamps lit now count most; rows building toward one
   * colour are worth more the purer they are, and mixing costs.
   */
  hint(landing: Landing): number {
    const lit = this.lights(landing.clearedRows, this.lit).length;
    // Only the colours of lamps still dark are worth building toward.
    const wanted = this.elements()
      .filter((element) => this.nextLamp(element) >= 0)
      .map(colorOfElement);
    const width = this.ctx.board.width;
    const spare = width - this.params.purity;
    let worth = 0;
    landing.grid.forEach((row) => {
      const counts = wanted.map((color) => row.filter((cell) => cell === color).length);
      const best = Math.max(...counts);
      const filled = row.filter((cell) => cell !== null).length;
      if (filled === 0) return;
      const mixed = counts.reduce((sum, n) => sum + n, 0) - best;
      const impure = filled - best;
      // A row can still light while its off-colour cells fit the spare (3 of 10 at P 7):
      // the purer and fuller, the better; past the spare it is junk to clear.
      worth += impure <= spare ? 0.4 * best * best : -2 * (impure - spare);
      worth -= 3 * mixed;
      // Off-colour cells keep to the spare columns at the right; wanted ones to the left.
      row.forEach((cell, x) => {
        if (cell === null) return;
        const dump = x >= width - spare;
        const want = wanted.includes(cell as (typeof wanted)[number]);
        if (dump === want) worth -= 1.5;
      });
    });
    // Clearing a row that was building toward a lamp, but impure, throws that work away.
    const wasted = landing.clearedRows
      .filter((row) => !pureElement(row.cells, this.elements(), this.params.purity))
      .reduce(
        (sum, row) =>
          sum + Math.max(...wanted.map((color) => row.cells.filter((c) => c === color).length)),
        0,
      );
    return 3 * (40 * lit + worth - 2 * wasted);
  }
}
