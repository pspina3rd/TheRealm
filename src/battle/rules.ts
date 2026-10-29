/**
 * Region rules (docs/ENCOUNTER_DESIGN.md §6.3, §7.1): one passive board
 * rule per region, counted in pieces and telegraphed one piece ahead. The
 * mentor teaches it in their lessons; the region's monsters then use it.
 * M1 builds spores (the grove, Hazel) and a dark prototype (Selene's test
 * board); the rest come with their regions.
 */
import type { Board, LockResult } from '../core/board';
import { isCrystal } from '../core/pieces';
import { REGION_RULES, TELEGRAPH_LEAD, type RegionRuleId } from '../data/balance';
import type { BattleContext, Telegraph } from './types';

/** A region rule: it acts after each lock and marks what it will do next. */
export interface RegionRule {
  readonly id: RegionRuleId;
  onLock(result: LockResult): void;
  telegraphs(): readonly Telegraph[];
}

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * **Spores** (the grove): every `landEvery` pieces a spore lands on the
 * top crystal of a column (that crystal is marked one piece ahead), and
 * every `spreadEvery` pieces each spore cluster takes one crystal beside
 * it. A cluster of `petrifyAt` turns to stone. Clearing a line takes its
 * spores with it.
 */
export class SporeRule implements RegionRule {
  readonly id = 'spores';
  untilLand: number = REGION_RULES.spores.landEvery;
  untilSpread: number = REGION_RULES.spores.spreadEvery;
  /** Where the next spore lands, chosen one piece ahead. */
  next: [number, number] | null = null;
  private readonly ctx: BattleContext;

  constructor(ctx: BattleContext) {
    this.ctx = ctx;
  }

  /** The top crystal of every column that has one (where a spore can land). */
  landingSpots(): [number, number][] {
    const board = this.ctx.board;
    const spots: [number, number][] = [];
    for (let x = 0; x < board.width; x++) {
      const y = board.grid.findIndex((row) => row[x] !== null);
      if (y >= 0 && isCrystal(board.grid[y]?.[x] ?? null) && board.tagAt(x, y) !== 'spore')
        spots.push([x, y]);
    }
    return spots;
  }

  /** Every cluster of spore cells (orthogonally connected). */
  clusters(): [number, number][][] {
    const board = this.ctx.board;
    const seen = new Set<string>();
    const out: [number, number][][] = [];
    for (const start of board.tagged('spore')) {
      if (seen.has(start.join())) continue;
      const cluster: [number, number][] = [];
      const queue = [start];
      seen.add(start.join());
      while (queue.length > 0) {
        const cell = queue.pop() as [number, number];
        cluster.push(cell);
        for (const [dx, dy] of NEIGHBOURS) {
          const next: [number, number] = [cell[0] + dx, cell[1] + dy];
          if (board.tagAt(...next) === 'spore' && !seen.has(next.join())) {
            seen.add(next.join());
            queue.push(next);
          }
        }
      }
      out.push(cluster);
    }
    return out;
  }

  onLock(): void {
    const board = this.ctx.board;
    const rules = REGION_RULES.spores;
    this.untilLand--;
    if (this.untilLand <= 0) {
      this.untilLand = rules.landEvery;
      const [x, y] = this.next ?? [-1, -1];
      const spot = isCrystal(board.grid[y]?.[x] ?? null) ? this.next : null;
      const target = spot ?? this.pick();
      if (target) {
        board.setTag(target[0], target[1], 'spore');
        this.ctx.emit({ kind: 'spores', cells: [target] });
      }
      this.next = null;
    }
    this.untilSpread--;
    if (this.untilSpread <= 0) {
      this.untilSpread = rules.spreadEvery;
      this.spread();
    }
    this.petrify();
    if (this.untilLand <= TELEGRAPH_LEAD && !this.next) this.next = this.pick();
  }

  private pick(): [number, number] | null {
    const spots = this.landingSpots();
    return spots.length > 0 ? this.ctx.rng.pick(spots) : null;
  }

  /** Each cluster takes one crystal beside it. */
  private spread(): void {
    const board = this.ctx.board;
    const taken: [number, number][] = [];
    for (const cluster of this.clusters()) {
      const options = cluster.flatMap(([x, y]) =>
        NEIGHBOURS.flatMap(([dx, dy]): [number, number][] => {
          const nx = x + dx;
          const ny = y + dy;
          const cell = board.grid[ny]?.[nx] ?? null;
          return isCrystal(cell) && board.tagAt(nx, ny) !== 'spore' ? [[nx, ny]] : [];
        }),
      );
      if (options.length === 0) continue;
      const [x, y] = this.ctx.rng.pick(options);
      board.setTag(x, y, 'spore');
      taken.push([x, y]);
    }
    if (taken.length > 0) this.ctx.emit({ kind: 'spores', cells: taken });
  }

  /** Clusters of `petrifyAt` or more turn to stone. */
  private petrify(): void {
    const board = this.ctx.board;
    const stone = this.clusters()
      .filter((cluster) => cluster.length >= REGION_RULES.spores.petrifyAt)
      .flat();
    for (const [x, y] of stone) {
      (board.grid[y] as (typeof board.grid)[number])[x] = 'stone';
      board.setTag(x, y, null);
    }
    if (stone.length > 0) this.ctx.emit({ kind: 'petrify', cells: stone });
  }

  telegraphs(): readonly Telegraph[] {
    const marks: Telegraph[] = [];
    if (this.next)
      marks.push({ kind: 'cells', what: 'spore', cells: [this.next], leadPieces: TELEGRAPH_LEAD });
    return marks;
  }
}

/**
 * **Dark** (the ruins; a prototype on Selene's test board in M1): the
 * board's interior is dark beyond `radius` rows of the falling piece. The
 * rule changes nothing on the board; `visibleCells` says what shows.
 */
export class DarkRule implements RegionRule {
  readonly id = 'dark';
  onLock(): void {}
  telegraphs(): readonly Telegraph[] {
    return [];
  }
}

/** The rule for `id` in this battle. */
export function createRule(ctx: BattleContext, id: RegionRuleId): RegionRule {
  return id === 'spores' ? new SporeRule(ctx) : new DarkRule();
}

/**
 * What the dark lets the hero see (§7.1): a row-major grid of booleans.
 * Lit are the rows within `radius` of the falling piece, the skyline (each
 * column's top filled cell, drawn as a lit outline) and the ghost's
 * landing cells; the preview stays visible elsewhere. Nothing is hidden
 * when no piece is falling.
 */
export function visibleCells(
  board: Pick<Board, 'grid' | 'width' | 'active' | 'ghostY'>,
  radius: number = REGION_RULES.dark.radius,
): boolean[][] {
  const piece = board.active;
  const lit = board.grid.map(() => Array<boolean>(board.width).fill(piece === null));
  if (!piece) return lit;
  const rows = piece.cells.map(([, cy]) => piece.y + cy);
  const top = Math.min(...rows) - radius;
  const bottom = Math.max(...rows) + radius;
  lit.forEach((row, y) => {
    if (y >= top && y <= bottom) row.fill(true);
  });
  for (let x = 0; x < board.width; x++) {
    const y = board.grid.findIndex((row) => row[x] !== null);
    if (y >= 0) (lit[y] as boolean[])[x] = true;
  }
  const ghost = board.ghostY();
  for (const [cx, cy] of piece.cells) {
    const row = lit[ghost + cy];
    if (row) row[piece.x + cx] = true;
  }
  return lit;
}
