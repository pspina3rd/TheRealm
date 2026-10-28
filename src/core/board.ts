import {
  PIECES,
  PIECE_NAMES,
  isCrystal,
  rotateClockwise,
  type Cell,
  type CrystalColor,
  type Offset,
  type PieceName,
} from './pieces';
import { ELEMENT_OF_COLOR, colorOfElement, relatedTo } from './elements';
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

/**
 * Which cells of each shape (in `PIECES` order, kept through rotation)
 * take the second colour of a dual piece: two touching halves, except the
 * T, whose wings take it (no 2 + 2 split of a T keeps both halves touching).
 */
export const DUAL_SPLIT: Readonly<Record<PieceName, readonly boolean[]>> = {
  I: [false, false, true, true], // left pair / right pair
  O: [false, false, true, true], // top row / bottom row
  T: [false, true, false, true], // nub and centre / both wings
  S: [false, false, true, true], // top pair / bottom pair
  Z: [false, false, true, true], // top pair / bottom pair
  J: [false, false, true, true], // hook / the rest of the bar
  L: [false, true, true, false], // hook / the rest of the bar
};

/**
 * A marker on a board cell that moves with the cell: when lines clear and
 * rows fall, when rows are pushed up from below, and when bottom rows are
 * removed. Encounters give cells their meaning with them:
 * - `target`: something to dig out (DIG; Rowan's pipe);
 * - `hazard`: something that spreads (CONTAIN; Wren's rot);
 * - `protected`: something to save (CONTAIN; Wren's young caps);
 * - `ridge`: an inert cell that never scores (PLANT; Bean's soil ridges);
 * - `spore`: a region rule's spore (the grove), which petrifies in clusters.
 */
export const CELL_TAGS = ['target', 'hazard', 'protected', 'ridge', 'spore'] as const;
export type CellTag = (typeof CELL_TAGS)[number];

/** Tagged cells cleared, by tag, e.g. `{ protected: 1 }`. */
export type TagTally = Partial<Record<CellTag, number>>;

/** A cleared line as it was: its cells and their tags, column by column. */
export interface ClearedRow {
  readonly cells: readonly Cell[];
  readonly tags: readonly (CellTag | null)[];
}

/**
 * A controlled queue (an encounter's guaranteed supply): every `window`
 * pieces hold each of `pieces` at least once, slotted at random places;
 * the other slots come from the shuffled bag as usual.
 */
export interface Supply {
  readonly window: number;
  readonly pieces: readonly PieceName[];
}

/** A piece waiting in the queue: its shape and, for a dual piece, its second colour. */
export interface QueuedPiece {
  readonly name: PieceName;
  readonly second: CrystalColor | null;
}

/** Each cell's colour (in `PIECES` cell order) of a queued piece, two-tone when dual. */
export function cellColors({ name, second }: QueuedPiece): CrystalColor[] {
  const { color, cells } = PIECES[name];
  return cells.map((_, i) => (second && DUAL_SPLIT[name][i] ? second : color));
}

export interface ActivePiece {
  readonly name: PieceName;
  /** The colour its crystals lock as: the shape's own unless overridden. */
  readonly color: CrystalColor;
  /** Each cell's colour, index-matched to `cells` (rotation keeps it). */
  readonly colors: readonly CrystalColor[];
  /** A dual piece's second colour (on its `DUAL_SPLIT` cells), or null. */
  readonly second: CrystalColor | null;
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
  /** Makes a dual piece: this colour on the shape's `DUAL_SPLIT` cells. */
  readonly second?: CrystalColor | null;
  /** Cell offsets (a rotation of the shape); defaults to the spawn orientation. */
  readonly cells?: readonly Offset[];
  /** Starting column of the piece origin; defaults to the spawn column. */
  readonly x?: number;
}

/**
 * Column where new pieces appear on a board `width` wide: 3 on the usual
 * 10, centred on a narrow board (1 in Rowan's 6-wide well).
 */
export function spawnColumn(width: number): number {
  return Math.max(0, Math.floor((width - 4) / 2));
}

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
  /** Where the piece's cells locked, as [x, y] before any line cleared (cells above the top left out). */
  readonly placed: readonly (readonly [number, number])[];
  /** Tagged cells the cleared lines took, by tag. */
  readonly clearedTags: TagTally;
  /** The cleared lines' cells and tags, top to bottom (index-matched to `rows`). */
  readonly clearedRows: readonly ClearedRow[];
}

/** Columns a new piece can spawn into; a seal never lands here, so spawning stays possible. */
export const SPAWN_COLUMNS: readonly number[] = [3, 4, 5, 6];

/** A column sealed by an enemy: no piece can enter it for `pieces` more locks. */
export interface Seal {
  readonly column: number;
  pieces: number;
}

/** The text codes `loadRows` reads: stone and each crystal colour's initial. */
const CELL_CODES: Readonly<Record<string, Cell>> = {
  '#': 'stone',
  c: 'cyan',
  g: 'gold',
  v: 'violet',
  n: 'green',
  r: 'red',
  b: 'blue',
  o: 'orange',
  x: 'neutral',
};

/** An encounter's extra `loadRows` code: the cell it makes and the tag it carries. */
export interface CellCode {
  readonly cell: Cell;
  readonly tag?: CellTag;
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
  /** Each cell's tag (see `CellTag`), index-matched to `grid`. */
  tags: (CellTag | null)[][];
  active: ActivePiece | null = null;
  piecesPlaced = 0;
  toppedOut = false;
  /** False on boards where full lines stay (BUILD): nothing clears. */
  clearsEnabled = true;
  /** A controlled queue's guaranteed supply, or null for the plain bag. */
  supply: Supply | null = null;
  /** A sealed column, if an enemy has sealed one (see `sealColumn`). */
  seal: Seal | null = null;
  /**
   * Chance that each random piece arrives dual: half in its own element,
   * half in one of that element's two related ones (see `dualChance`).
   */
  dualChance = 0;

  private readonly rng: Rng;
  private readonly weights: Readonly<Record<PieceName, number>>;
  private bag: PieceName[] = [];
  /** Second colour of each bag piece (null = single colour), index-matched to `bag`. */
  private seconds: (CrystalColor | null)[] = [];
  /** Shuffled bag pieces waiting to fill a controlled queue's free slots. */
  private loose: PieceName[] = [];
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
    this.tags = Board.emptyTags(width, height);
  }

  static emptyGrid(width: number, height: number): Cell[][] {
    return Array.from({ length: height }, () => Array<Cell>(width).fill(null));
  }

  static emptyTags(width: number, height: number): (CellTag | null)[][] {
    return Array.from({ length: height }, () => Array<CellTag | null>(width).fill(null));
  }

  /** Column where this board's pieces spawn (see `spawnColumn`). */
  get spawnX(): number {
    return spawnColumn(this.width);
  }

  /** The tag on cell (x, y), or null. */
  tagAt(x: number, y: number): CellTag | null {
    return this.tags[y]?.[x] ?? null;
  }

  /** Sets (or with null, removes) the tag on cell (x, y); off the board, nothing. */
  setTag(x: number, y: number, tag: CellTag | null): void {
    const row = this.tags[y];
    if (row && x >= 0 && x < this.width) row[x] = tag;
  }

  /** Every cell carrying `tag`, as [x, y], top row first. */
  tagged(tag: CellTag): [number, number][] {
    const cells: [number, number][] = [];
    this.tags.forEach((row, y) =>
      row.forEach((t, x) => {
        if (t === tag) cells.push([x, y]);
      }),
    );
    return cells;
  }

  /** How many cells carry `tag`. */
  countTag(tag: CellTag): number {
    return this.tagged(tag).length;
  }

  /** The row of the highest filled cell (the board's height when empty). */
  stackTop(): number {
    const y = this.grid.findIndex((row) => row.some((cell) => cell !== null));
    return y < 0 ? this.height : y;
  }

  /**
   * Fills the bottom of the grid from text rows (top row first). `#` is
   * stone, `x` neutral, a colour initial (c g v n r b o) is a crystal, `m` is mold
   * (violet and green crystals in a checker), anything else is empty.
   * `legend` adds an encounter's codes: the cell and the tag it carries
   * (e.g. Rowan's pipe, a tagged stone). Old tags are cleared. Used for
   * puzzle layouts, encounter boards and tests.
   */
  loadRows(rows: readonly string[], legend: Readonly<Record<string, CellCode>> = {}): void {
    this.grid = Board.emptyGrid(this.width, this.height);
    this.tags = Board.emptyTags(this.width, this.height);
    const offset = this.height - rows.length;
    rows.forEach((row, i) => {
      const y = offset + i;
      for (let x = 0; x < this.width; x++) {
        const code = row[x] ?? '.';
        const custom = Object.hasOwn(legend, code) ? legend[code] : undefined;
        const mold: Cell = (x + y) % 2 === 0 ? 'violet' : 'green';
        (this.grid[y] as Cell[])[x] = custom
          ? custom.cell
          : code === 'm'
            ? mold
            : (CELL_CODES[code] ?? null);
        this.setTag(x, y, custom?.tag ?? null);
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
    while (this.bag.length < count) {
      const names = this.supply ? this.supplyWindow(this.supply) : this.rng.shuffle(this.fillBag());
      this.bag.push(...names);
      this.seconds.push(...names.map((name) => this.rollSecond(name)));
    }
    return this.bag.slice(0, count);
  }

  /** The next pieces with their colours (fixed queues are never dual). */
  previewPieces(count: number): QueuedPiece[] {
    return this.preview(count).map((name, i) => ({
      name,
      second: this.fixedQueue ? null : (this.seconds[i] ?? null),
    }));
  }

  /** Rolls whether a new bag piece is dual, and its second colour: a related element's. */
  private rollSecond(name: PieceName): CrystalColor | null {
    if (this.dualChance <= 0 || this.rng.next() >= this.dualChance) return null;
    return colorOfElement(this.rng.pick(relatedTo(ELEMENT_OF_COLOR[PIECES[name].color])));
  }

  /**
   * One window of a controlled queue: each supplied piece once, at a random
   * slot, and the other slots from the shuffled bag (which may bring more).
   */
  private supplyWindow(supply: Supply): PieceName[] {
    const free = Math.max(0, supply.window - supply.pieces.length);
    while (this.loose.length < free) this.loose.push(...this.rng.shuffle(this.fillBag()));
    const window = this.loose.splice(0, free);
    for (const name of supply.pieces) window.splice(this.rng.int(window.length + 1), 0, name);
    return window;
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
    let second: CrystalColor | null = null;
    if (this.fixedQueue) {
      name = this.fixedQueue.shift();
      if (!name) {
        this.active = null;
        return false;
      }
    } else {
      this.preview(1);
      name = this.bag.shift() as PieceName;
      second = this.seconds.shift() ?? null;
    }
    this.active = makePiece(name, { second, x: this.spawnX });
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
    const piece = makePiece(name, { x: this.spawnX, ...options });
    if (!this.active || !this.fits(piece)) return false;
    this.active = piece;
    return true;
  }

  /** Puts a piece back at the front of the queue (one a person's demo displaced). */
  requeue(piece: QueuedPiece): void {
    if (this.fixedQueue) this.fixedQueue.unshift(piece.name);
    else {
      this.preview(1);
      this.bag.unshift(piece.name);
      this.seconds.unshift(piece.second);
    }
  }

  /** True if the falling piece could be swapped for the next one (see `swapWithNext`). */
  canSwapWithNext(): boolean {
    const [next] = this.preview(1);
    return (
      this.active !== null && next !== undefined && this.fits(makePiece(next, { x: this.spawnX }))
    );
  }

  /**
   * Swaps the falling piece for the next one in the queue, which restarts
   * at the top, in its colours; the falling piece takes its place in the
   * queue, keeping a dual split (a recoloured toss goes back plain). Returns
   * false, changing nothing, if `canSwapWithNext` is false.
   */
  swapWithNext(): boolean {
    const previous = this.active;
    const [next] = this.preview(1);
    const [queued] = this.previewPieces(1);
    if (!previous || !next || !this.replaceActive(next, { second: queued?.second ?? null }))
      return false;
    if (this.fixedQueue) this.fixedQueue[0] = previous.name;
    else {
      this.bag[0] = previous.name;
      this.seconds[0] = previous.recolored ? null : previous.second;
    }
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

  /**
   * Writes the active piece into the grid (its cells untagged), clears full
   * lines (unless clears are off) and spawns the next piece.
   */
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
        placed: [],
        clearedTags: {},
        clearedRows: [],
      };
    }
    const holesBefore = this.holes();

    const placed: [number, number][] = [];
    piece.cells.forEach(([cx, cy], i) => {
      const x = piece.x + cx;
      const y = piece.y + cy;
      if (y < 0) this.toppedOut = true;
      else {
        (this.grid[y] as Cell[])[x] = piece.colors[i] ?? piece.color;
        this.setTag(x, y, null);
        placed.push([x, y]);
      }
    });
    this.piecesPlaced++;
    this.active = null;

    const cleared = this.clearsEnabled ? this.clearFullLines() : NO_CLEAR;
    if (this.seal && --this.seal.pieces <= 0) this.seal = null;
    const holesMade = Math.max(0, this.holes() - holesBefore);
    if (!this.toppedOut) this.spawn();
    return {
      linesCleared: cleared.lines.length,
      clearedCells: cleared.tally,
      lines: cleared.lines,
      rows: cleared.rows,
      toppedOut: this.toppedOut,
      holesMade,
      placed,
      clearedTags: cleared.clearedTags,
      clearedRows: cleared.clearedRows,
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
        if (isCrystal(cell)) crystals.push([x, y]);
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
      const row = Array<Cell>(this.width).fill('stone');
      row[this.rng.int(this.width)] = null;
      this.pushRow(row);
    }
  }

  /**
   * Pushes one row up from the bottom (rising mold, a merchant's
   * counter-offer), with optional tags. Tops out if blocks are pushed off
   * the top; lifts the falling piece if the rising floor now overlaps it.
   */
  pushRow(cells: readonly Cell[], tags: readonly (CellTag | null)[] = []): void {
    const top = this.grid.shift() as Cell[];
    this.tags.shift();
    if (top.some((cell) => cell !== null)) this.toppedOut = true;
    this.grid.push(Array.from({ length: this.width }, (_, x) => cells[x] ?? null));
    this.tags.push(Array.from({ length: this.width }, (_, x) => tags[x] ?? null));
    while (this.active && this.collides(0, 0) && this.active.y > -4) this.active.y--;
  }

  /** Removes the bottom `count` rows (a board-clearing spell). Returns the cells removed. */
  removeBottomRows(count: number): CellTally {
    const tally: CellTally = {};
    for (let i = 0; i < count; i++) {
      const row = this.grid.pop() as Cell[];
      this.tags.pop();
      tallyRow(row, tally);
      this.grid.unshift(Array<Cell>(this.width).fill(null));
      this.tags.unshift(Array<CellTag | null>(this.width).fill(null));
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
    this.tags = Board.emptyTags(this.width, this.height);
    this.toppedOut = false;
    this.seal = null;
    this.active = null;
    this.spawn();
  }

  /** Number of filled cells on the board (excluding the active piece). */
  filledCount(): number {
    return this.grid.reduce((sum, row) => sum + row.filter((c) => c !== null).length, 0);
  }

  private clearFullLines(): Cleared {
    const cleared: Cleared = { lines: [], rows: [], tally: {}, clearedTags: {}, clearedRows: [] };
    const full = this.grid.map((row) => row.every((cell) => cell !== null));
    this.grid.forEach((row, y) => {
      if (!full[y]) return;
      const tags = this.tags[y] as (CellTag | null)[];
      tallyRow(row, cleared.tally);
      cleared.lines.push(tallyRow(row, {}));
      cleared.rows.push(y);
      cleared.clearedRows.push({ cells: row.slice(), tags: tags.slice() });
      for (const tag of tags) {
        if (tag) cleared.clearedTags[tag] = (cleared.clearedTags[tag] ?? 0) + 1;
      }
    });
    const count = cleared.lines.length;
    this.grid = [...Board.emptyGrid(this.width, count), ...this.grid.filter((_, y) => !full[y])];
    this.tags = [...Board.emptyTags(this.width, count), ...this.tags.filter((_, y) => !full[y])];
    return cleared;
  }
}

/** What clearing full lines took. */
interface Cleared {
  readonly lines: CellTally[];
  readonly rows: number[];
  readonly tally: CellTally;
  readonly clearedTags: TagTally;
  readonly clearedRows: ClearedRow[];
}

/** A lock on a board whose clears are off. */
const NO_CLEAR: Cleared = { lines: [], rows: [], tally: {}, clearedTags: {}, clearedRows: [] };

/** A piece at the top of the board: the shape's spawn orientation and colour unless overridden. */
function makePiece(name: PieceName, options: PieceOptions = {}): ActivePiece {
  const def = PIECES[name];
  const color = options.color ?? def.color;
  const second = options.color === undefined ? (options.second ?? null) : null;
  return {
    name,
    color,
    colors: options.color === undefined ? cellColors({ name, second }) : def.cells.map(() => color),
    second,
    recolored: options.color !== undefined,
    cells: (options.cells ?? def.cells).map((c) => [...c] as Offset),
    x: options.x ?? spawnColumn(BOARD_WIDTH),
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
