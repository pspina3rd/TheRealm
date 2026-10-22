import {
  PIECES,
  PIECE_NAMES,
  rotateClockwise,
  type Cell,
  type CrystalColor,
  type Offset,
  type PieceName,
} from './pieces';
import type { Rng } from './rng';

export const BOARD_WIDTH = 10;
/** A standard 7-bag: one of each shape. */
export const EVEN_WEIGHTS: Readonly<Record<PieceName, number>> = Object.fromEntries(
  PIECE_NAMES.map((name) => [name, 1]),
) as Record<PieceName, number>;
export const BOARD_HEIGHT = 20;

/**
 * Horizontal nudges tried, in order, when a rotation collides ("wall kicks").
 * ±3 lets a vertical I piece flat against the right wall turn horizontal.
 */
const KICKS = [0, -1, 1, -2, 2, -3, 3] as const;

export interface ActivePiece {
  readonly name: PieceName;
  readonly color: CrystalColor;
  cells: Offset[];
  x: number;
  y: number;
}

/** Counts of cleared cells by kind, e.g. `{ red: 4, stone: 2 }`. */
export type CellTally = Partial<Record<Exclude<Cell, null>, number>>;

/** What happened when the active piece locked into the grid. */
export interface LockResult {
  readonly linesCleared: number;
  /** Everything cleared, across all lines. */
  readonly clearedCells: CellTally;
  /** What each cleared line contained, top to bottom. */
  readonly lines: readonly CellTally[];
  /** The board row of each cleared line, before rows above fell. */
  readonly rows: readonly number[];
  /** True when the piece locked above the top or no new piece fits. */
  readonly toppedOut: boolean;
}

/**
 * The falling-block playfield: grid state, the active piece and the piece
 * queue. It knows nothing about scoring, enemies or NPCs; challenges in
 * `src/battle` layer rules on top of the `LockResult`s it produces.
 */
export class Board {
  readonly width: number;
  readonly height: number;
  grid: Cell[][];
  active: ActivePiece | null = null;
  piecesPlaced = 0;
  toppedOut = false;

  private readonly rng: Rng;
  private readonly weights: Readonly<Record<PieceName, number>>;
  private bag: PieceName[] = [];
  /** A fixed piece sequence (used by puzzles); when set, it replaces the random bag. */
  private fixedQueue: PieceName[] | null = null;

  /**
   * @param weights copies of each shape per shuffled bag (default 1 each, a
   *   standard 7-bag). Higher weights make a shape, and its element, more common.
   */
  constructor(
    rng: Rng,
    width = BOARD_WIDTH,
    height = BOARD_HEIGHT,
    weights: Readonly<Record<PieceName, number>> = EVEN_WEIGHTS,
  ) {
    this.rng = rng;
    this.weights = weights;
    this.width = width;
    this.height = height;
    this.grid = Board.emptyGrid(width, height);
  }

  static emptyGrid(width: number, height: number): Cell[][] {
    return Array.from({ length: height }, () => Array<Cell>(width).fill(null));
  }

  /**
   * Fills the bottom of the grid from text rows (top row first). `#` is
   * stone, a colour initial (c g v n r b o) is a crystal, anything else is
   * empty. Used for puzzle layouts and tests.
   */
  loadRows(rows: readonly string[]): void {
    const codes: Record<string, Cell> = {
      '#': 'stone',
      c: 'cyan',
      g: 'gold',
      v: 'violet',
      n: 'green',
      r: 'red',
      b: 'blue',
      o: 'orange',
    };
    this.grid = Board.emptyGrid(this.width, this.height);
    const offset = this.height - rows.length;
    rows.forEach((row, i) => {
      for (let x = 0; x < this.width; x++) {
        (this.grid[offset + i] as Cell[])[x] = codes[row[x] ?? '.'] ?? null;
      }
    });
  }

  /** Forces the upcoming pieces to follow `names`; once exhausted, no pieces spawn. */
  setFixedQueue(names: readonly PieceName[]): void {
    this.fixedQueue = names.slice();
  }

  /** The next pieces to spawn, without consuming them. */
  preview(count: number): PieceName[] {
    if (this.fixedQueue) return this.fixedQueue.slice(0, count);
    while (this.bag.length < count) this.bag.push(...this.rng.shuffle(this.fillBag()));
    return this.bag.slice(0, count);
  }

  /** One bag's worth of pieces before shuffling. */
  private fillBag(): PieceName[] {
    const bag = PIECE_NAMES.flatMap((name) =>
      Array<PieceName>(Math.max(0, this.weights[name])).fill(name),
    );
    return bag.length > 0 ? bag : [...PIECE_NAMES];
  }

  /** Remaining fixed pieces, or `Infinity` when pieces are random. */
  get piecesRemaining(): number {
    return this.fixedQueue ? this.fixedQueue.length + (this.active ? 1 : 0) : Infinity;
  }

  /**
   * Spawns the next piece at the top. Returns false (and sets `toppedOut`)
   * if it does not fit, or false without topping out when a fixed queue is empty.
   */
  spawn(): boolean {
    let name: PieceName | undefined;
    if (this.fixedQueue) {
      name = this.fixedQueue.shift();
      if (!name) {
        this.active = null;
        return false;
      }
    } else {
      this.preview(1);
      name = this.bag.shift() as PieceName;
    }
    const def = PIECES[name];
    this.active = {
      name,
      color: def.color,
      cells: def.cells.map((c) => [...c] as Offset),
      x: 3,
      y: 0,
    };
    if (this.collides(0, 0, this.active.cells)) {
      this.toppedOut = true;
      return false;
    }
    return true;
  }

  /** True if the active piece, moved by (dx, dy) with `cells`, overlaps walls or blocks. */
  collides(dx: number, dy: number, cells: readonly Offset[] = this.active?.cells ?? []): boolean {
    const piece = this.active;
    if (!piece) return true;
    return cells.some(([cx, cy]) => {
      const x = piece.x + cx + dx;
      const y = piece.y + cy + dy;
      if (x < 0 || x >= this.width || y >= this.height) return true;
      return y >= 0 && this.grid[y]?.[x] !== null;
    });
  }

  /** Moves the active piece if the destination is free. Returns whether it moved. */
  move(dx: number, dy: number): boolean {
    if (!this.active || this.collides(dx, dy)) return false;
    this.active.x += dx;
    this.active.y += dy;
    return true;
  }

  /** Rotates clockwise, trying small horizontal kicks. Returns whether it rotated. */
  rotate(): boolean {
    const piece = this.active;
    if (!piece || piece.name === 'O') return false;
    const rotated = rotateClockwise(piece.cells);
    for (const kick of KICKS) {
      if (!this.collides(kick, 0, rotated)) {
        piece.x += kick;
        piece.cells = rotated;
        return true;
      }
    }
    return false;
  }

  /** Row the active piece would land on if hard-dropped. */
  ghostY(): number {
    if (!this.active) return 0;
    let dy = 0;
    while (!this.collides(0, dy + 1)) dy++;
    return this.active.y + dy;
  }

  /** Drops the active piece to the floor and locks it. Returns rows fallen and the lock result. */
  hardDrop(): { distance: number; result: LockResult } {
    let distance = 0;
    while (this.move(0, 1)) distance++;
    return { distance, result: this.lock() };
  }

  /**
   * Advances gravity by one row. Returns a `LockResult` when the piece could
   * not fall and was locked, otherwise null.
   */
  step(): LockResult | null {
    if (!this.active) return null;
    return this.move(0, 1) ? null : this.lock();
  }

  /** Writes the active piece into the grid, clears full lines and spawns the next piece. */
  lock(): LockResult {
    const piece = this.active;
    if (!piece) {
      return { linesCleared: 0, clearedCells: {}, lines: [], rows: [], toppedOut: this.toppedOut };
    }

    for (const [cx, cy] of piece.cells) {
      const y = piece.y + cy;
      if (y < 0) this.toppedOut = true;
      else (this.grid[y] as Cell[])[piece.x + cx] = piece.color;
    }
    this.piecesPlaced++;
    this.active = null;

    const { lines, rows, tally } = this.clearFullLines();
    if (!this.toppedOut) this.spawn();
    return {
      linesCleared: lines.length,
      clearedCells: tally,
      lines,
      rows,
      toppedOut: this.toppedOut,
    };
  }

  /**
   * Pushes `count` rows of stone up from the bottom, each with one random gap.
   * Tops out if blocks are pushed off the top. Used by enemy curses.
   */
  addGarbage(count: number): void {
    for (let i = 0; i < count; i++) {
      const top = this.grid.shift() as Cell[];
      if (top.some((cell) => cell !== null)) this.toppedOut = true;
      const row = Array<Cell>(this.width).fill('stone');
      row[this.rng.int(this.width)] = null;
      this.grid.push(row);
    }
    // Lift the active piece if the rising floor now overlaps it.
    while (this.active && this.collides(0, 0) && this.active.y > -4) this.active.y--;
  }

  /** Removes the bottom `count` rows (a board-clearing spell). Returns the cells removed. */
  removeBottomRows(count: number): CellTally {
    const tally: CellTally = {};
    for (let i = 0; i < count; i++) {
      const row = this.grid.pop() as Cell[];
      tallyRow(row, tally);
      this.grid.unshift(Array<Cell>(this.width).fill(null));
    }
    return tally;
  }

  /** Empties the grid, clears the top-out state and spawns a fresh piece. */
  reset(): void {
    this.grid = Board.emptyGrid(this.width, this.height);
    this.toppedOut = false;
    this.active = null;
    this.spawn();
  }

  /** Number of filled cells on the board (excluding the active piece). */
  filledCount(): number {
    return this.grid.reduce((sum, row) => sum + row.filter((c) => c !== null).length, 0);
  }

  private clearFullLines(): { lines: CellTally[]; rows: number[]; tally: CellTally } {
    const tally: CellTally = {};
    const lines: CellTally[] = [];
    const rows: number[] = [];
    const kept = this.grid.filter((row, y) => {
      const full = row.every((cell) => cell !== null);
      if (full) {
        tallyRow(row, tally);
        lines.push(tallyRow(row, {}));
        rows.push(y);
      }
      return !full;
    });
    this.grid = [...Board.emptyGrid(this.width, lines.length), ...kept];
    return { lines, rows, tally };
  }
}

/** Adds a row's cells to `tally` and returns it. */
function tallyRow(row: readonly Cell[], tally: CellTally): CellTally {
  for (const cell of row) {
    if (cell !== null) tally[cell] = (tally[cell] ?? 0) + 1;
  }
  return tally;
}
