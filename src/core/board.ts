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
  /** The colour its crystals lock as: the shape's own unless overridden. */
  readonly color: CrystalColor;
  /** True when the colour was set by `replaceActive` rather than taken from the shape. */
  readonly recolored: boolean;
  cells: Offset[];
  x: number;
  y: number;
}

/** Counts of cleared cells by kind, e.g. `{ red: 4, stone: 2 }`. */
export type CellTally = Partial<Record<Exclude<Cell, null>, number>>;

/** How `replaceActive` sets up a piece: a colour override, and a starting rotation and column. */
export interface PieceOptions {
  /** Crystal colour for every cell, instead of the shape's own. */
  readonly color?: CrystalColor;
  /** Cell offsets (a rotation of the shape); defaults to the spawn orientation. */
  readonly cells?: readonly Offset[];
  /** Starting column of the piece origin; defaults to the spawn column. */
  readonly x?: number;
}

/** Column where new pieces appear. */
const SPAWN_X = 3;

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
  /** New covered holes the placement left (after any clears), never negative. */
  readonly holesMade: number;
}

/** Columns a new piece can spawn into; a seal never lands here, so spawning stays possible. */
export const SPAWN_COLUMNS: readonly number[] = [3, 4, 5, 6];

/** A column sealed by an enemy: no piece can enter it for `pieces` more locks. */
export interface Seal {
  readonly column: number;
  pieces: number;
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
  /** A sealed column, if an enemy has sealed one (see `sealColumn`). */
  seal: Seal | null = null;

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
    this.active = makePiece(name);
    if (this.collides(0, 0, this.active.cells)) {
      this.toppedOut = true;
      return false;
    }
    return true;
  }

  /**
   * Swaps the falling piece for `name` at the top of the board, optionally
   * recoloured, turned and moved (a mentor's toss). The displaced piece is
   * gone: the toss takes its turn, and the queue is untouched. Returns
   * false, changing nothing, if there is no active piece or the new one
   * would not fit.
   */
  replaceActive(name: PieceName, options: PieceOptions = {}): boolean {
    const piece = makePiece(name, options);
    if (!this.active || !this.fits(piece)) return false;
    this.active = piece;
    return true;
  }

  /** True if the falling piece could be swapped for the next one (see `swapWithNext`). */
  canSwapWithNext(): boolean {
    const [next] = this.preview(1);
    return this.active !== null && next !== undefined && this.fits(makePiece(next));
  }

  /**
   * Swaps the falling piece for the next one in the queue, which restarts
   * at the top; the falling piece's shape takes its place in the queue, in
   * its own colour (a recoloured toss goes back as a plain piece). Returns
   * false, changing nothing, if `canSwapWithNext` is false.
   */
  swapWithNext(): boolean {
    const previous = this.active;
    const [next] = this.preview(1);
    if (!previous || !next || !this.replaceActive(next)) return false;
    const queue = this.fixedQueue ?? this.bag;
    queue[0] = previous.name;
    return true;
  }

  /** True if `piece`, where it is, overlaps no wall, floor or block. */
  private fits(piece: ActivePiece): boolean {
    return piece.cells.every(([cx, cy]) => {
      const x = piece.x + cx;
      const y = piece.y + cy;
      if (x < 0 || x >= this.width || y >= this.height || x === this.seal?.column) return false;
      return y < 0 || this.grid[y]?.[x] === null;
    });
  }

  /** True if the active piece, moved by (dx, dy) with `cells`, overlaps walls or blocks. */
  collides(dx: number, dy: number, cells: readonly Offset[] = this.active?.cells ?? []): boolean {
    const piece = this.active;
    if (!piece) return true;
    return cells.some(([cx, cy]) => {
      const x = piece.x + cx + dx;
      const y = piece.y + cy + dy;
      if (x < 0 || x >= this.width || y >= this.height || x === this.seal?.column) return true;
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
      return {
        linesCleared: 0,
        clearedCells: {},
        lines: [],
        rows: [],
        toppedOut: this.toppedOut,
        holesMade: 0,
      };
    }
    const holesBefore = this.holes();

    for (const [cx, cy] of piece.cells) {
      const y = piece.y + cy;
      if (y < 0) this.toppedOut = true;
      else (this.grid[y] as Cell[])[piece.x + cx] = piece.color;
    }
    this.piecesPlaced++;
    this.active = null;

    const { lines, rows, tally } = this.clearFullLines();
    if (this.seal && --this.seal.pieces <= 0) this.seal = null;
    const holesMade = Math.max(0, this.holes() - holesBefore);
    if (!this.toppedOut) this.spawn();
    return {
      linesCleared: lines.length,
      clearedCells: tally,
      lines,
      rows,
      toppedOut: this.toppedOut,
      holesMade,
    };
  }

  /** Empty cells with a locked block somewhere above them in their column. */
  holes(): number {
    let holes = 0;
    for (let x = 0; x < this.width; x++) {
      let covered = false;
      for (const row of this.grid) {
        if (row[x] !== null) covered = true;
        else if (covered) holes++;
      }
    }
    return holes;
  }

  /**
   * Columns that can be sealed now: outside the spawn columns and clear of
   * the falling piece, so neither the falling nor the next piece is stuck.
   */
  sealableColumns(): number[] {
    const piece = this.active;
    const used = new Set(piece ? piece.cells.map(([cx]) => piece.x + cx) : []);
    return Array.from({ length: this.width }, (_, x) => x).filter(
      (x) => !SPAWN_COLUMNS.includes(x) && !used.has(x),
    );
  }

  /** Seals `column` for the next `pieces` locks: no piece can enter it, so its rows can't fill. */
  sealColumn(column: number, pieces: number): void {
    this.seal = { column, pieces };
  }

  /**
   * Turns up to `count` random locked crystals to stone (an enemy's
   * petrify). Returns the cells changed as [x, y].
   */
  petrify(count: number): [number, number][] {
    const crystals: [number, number][] = [];
    this.grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell !== null && cell !== 'stone') crystals.push([x, y]);
      }),
    );
    const changed: [number, number][] = [];
    while (changed.length < count && crystals.length > 0) {
      const [cell] = crystals.splice(this.rng.int(crystals.length), 1) as [[number, number]];
      (this.grid[cell[1]] as Cell[])[cell[0]] = 'stone';
      changed.push(cell);
    }
    return changed;
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

  /** How many locked cells hold `cell` (a crystal colour or stone). */
  count(cell: Exclude<Cell, null>): number {
    return this.grid.reduce((sum, row) => sum + row.filter((c) => c === cell).length, 0);
  }

  /** Turns every locked `from` cell into `to`. Returns how many changed. */
  transmute(from: Exclude<Cell, null>, to: Exclude<Cell, null>): number {
    const changed = this.count(from);
    this.grid = this.grid.map((row) => row.map((c) => (c === from ? to : c)));
    return changed;
  }

  /** Empties the grid, clears the top-out state and spawns a fresh piece. */
  reset(): void {
    this.grid = Board.emptyGrid(this.width, this.height);
    this.toppedOut = false;
    this.seal = null;
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

/** A piece at the top of the board: the shape's spawn orientation and colour unless overridden. */
function makePiece(name: PieceName, options: PieceOptions = {}): ActivePiece {
  const def = PIECES[name];
  return {
    name,
    color: options.color ?? def.color,
    recolored: options.color !== undefined,
    cells: (options.cells ?? def.cells).map((c) => [...c] as Offset),
    x: options.x ?? SPAWN_X,
    y: 0,
  };
}

/** Adds a row's cells to `tally` and returns it. */
function tallyRow(row: readonly Cell[], tally: CellTally): CellTally {
  for (const cell of row) {
    if (cell !== null) tally[cell] = (tally[cell] ?? 0) + 1;
  }
  return tally;
}
