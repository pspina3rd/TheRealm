import { cellColors, type Board, type QueuedPiece } from '../core/board';
import type { Telegraph } from '../battle/types';
import type { SkinId } from '../data/encounters';
import type { CrystalColor } from '../core/pieces';
import { ELEMENT_OF_COLOR } from '../core/elements';
import { PIECES, isCrystal, type Cell } from '../core/pieces';
import type { Feedback } from './art/feedback';
import { ICON_SIZE, ELEMENT_ICONS, type IconId } from './art/icons';
import { CRYSTAL_HEX } from './crystals';
import { drawIcon } from './iconDraw';

const CELL = 30;
const FLASH_MS = 380;
const POP_MS = 900;
const SHAKE_MS = 300;
/** Width of the next-piece area for the first piece, and for each column of smaller ones. */
const NEXT_MAIN_WIDTH = 96;
const NEXT_SMALL_WIDTH = 48;
/** The element glyph drawn on each crystal: a darker silhouette of its icon. */
const GLYPH = { scale: 2, silhouette: 'rgba(20, 16, 36, 0.32)' } as const;

interface Flash {
  readonly row: number;
  readonly color: string;
  elapsed: number;
}

/** Columns the board canvas is drawn for; a narrow board is centred in it. */
export const CANVAS_COLUMNS = 10;

/**
 * An encounter's place drawn on the board (§4): its skin, its objective
 * overlay (an outline and spare area, zones, the lip), what's telegraphed,
 * and the dark's lit cells. Fights have none of it but the dark.
 */
export interface BoardScene {
  readonly skin: SkinId | null;
  readonly outline?: (x: number, y: number) => boolean;
  readonly spare?: (x: number, y: number) => boolean;
  /** Each column's wanted colour (PLANT's furrows), or null for a path. */
  readonly zones?: readonly (CrystalColor | null)[];
  /** The board row of the lip (DIG): cells above it fail. */
  readonly lipY?: number;
  readonly telegraphs: readonly Telegraph[];
  /** The dark's lit cells (null: no dark). */
  readonly lit: boolean[][] | null;
  /** Before the first touch: the board waits, with a hint. */
  readonly preroll: boolean;
  /** How far the day has gone (PLANT's sun), 0–1. */
  readonly dayGone?: number;
}

const NO_SCENE: BoardScene = { skin: null, telegraphs: [], lit: null, preroll: false };

/** Each skin's backdrop colours: the board's floor and its frame material. */
const SKINS: Readonly<Record<SkinId, { readonly floor: string; readonly wall: string }>> = {
  well: { floor: '#0b1220', wall: '#5a3a2e' },
  tower: { floor: '#13221a', wall: '#3e5a3a' },
  beds: { floor: '#1b1408', wall: '#4a3a1e' },
  stall: { floor: '#1e140c', wall: '#6a4a2a' },
  ring: { floor: '#0f1a10', wall: '#2e4a2a' },
  lamps: { floor: '#0d0d14', wall: '#3a3a4e' },
};

/** What the board shows besides the grid: timed effects and the visible preview. */
export interface BoardStatus {
  readonly slowPieces: number;
  readonly hastePieces: number;
  readonly fogPieces: number;
  readonly quickenMs: number;
  readonly upcomingPieces: readonly QueuedPiece[];
  /** While paused the stack and preview are hidden, so a pause can't be used to plan. */
  readonly paused: boolean;
}

interface CellFlash {
  readonly cells: readonly (readonly [number, number])[];
  elapsed: number;
}

interface Pop {
  readonly icon: IconId;
  readonly row: number | undefined;
  elapsed: number;
}

/**
 * Draws the falling-block board: crystals marked with their element, the
 * ghost piece, flashing cleared rows, element icons bursting from cleared
 * lines, badges for tailwind, haste and quicken, an enemy's sealed column,
 * and its fog over the next-piece preview.
 */
export class BoardView {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly nextCtx: CanvasRenderingContext2D;
  private flashes: Flash[] = [];
  private pops: Pop[] = [];
  private cellFlashes: CellFlash[] = [];
  private shake = 0;

  constructor(canvas: HTMLCanvasElement, next: HTMLCanvasElement) {
    this.ctx = context(canvas);
    this.nextCtx = context(next);
  }

  play(feedback: Feedback): void {
    switch (feedback.kind) {
      case 'flashRows':
        feedback.rows.forEach((row, i) =>
          this.flashes.push({
            row,
            color: feedback.colors[i] ?? feedback.colors[0] ?? '#fff',
            elapsed: 0,
          }),
        );
        break;
      case 'icon':
        if (feedback.target === 'board')
          this.pops.push({ icon: feedback.icon, row: feedback.row, elapsed: 0 });
        break;
      case 'shake':
        if (feedback.target === 'board') this.shake = SHAKE_MS;
        break;
      case 'flashCells':
        this.cellFlashes.push({ cells: feedback.cells, elapsed: 0 });
        break;
      default:
        break;
    }
  }

  /** Clears running animations (between battles). */
  reset(): void {
    this.flashes = [];
    this.pops = [];
    this.cellFlashes = [];
    this.shake = 0;
  }

  render(
    board: Board,
    status: BoardStatus,
    dtMs: number,
    timeMs: number,
    dimmed: boolean,
    scene: BoardScene = NO_SCENE,
  ): void {
    const { ctx } = this;
    const full = CANVAS_COLUMNS * CELL;
    const w = board.width * CELL;
    const h = board.height * CELL;
    const ox = ((CANVAS_COLUMNS - board.width) * CELL) / 2;
    this.shake = Math.max(0, this.shake - dtMs);
    const dx = this.shake > 0 ? Math.sin(timeMs / 18) * 5 * (this.shake / SHAKE_MS) : 0;

    ctx.save();
    ctx.translate(dx, 0);
    const skin = scene.skin ? SKINS[scene.skin] : null;
    ctx.fillStyle = skin?.wall ?? '#0a0c17';
    ctx.fillRect(-10, 0, full + 20, h);
    if (ox > 0) drawBricks(ctx, ox, full, h);
    ctx.translate(ox, 0);
    ctx.fillStyle = skin?.floor ?? '#0a0c17';
    ctx.fillRect(0, 0, w, h);
    this.drawSceneUnder(board, scene, timeMs);
    ctx.strokeStyle = '#1d2238';
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        ctx.strokeRect(x * CELL + 0.5, y * CELL + 0.5, CELL, CELL);
        const cell = board.grid[y]?.[x];
        if (cell) drawCrystal(ctx, cell, x * CELL, y * CELL, CELL);
        const tag = board.tagAt(x, y);
        if (tag && cell) drawTag(ctx, tag, x * CELL, y * CELL, timeMs);
      }
    }
    this.drawTelegraphs(board, scene.telegraphs, timeMs);
    if (scene.lit) this.drawDark(board, scene.lit);

    this.drawSeal(board, timeMs);
    const piece = board.active;
    if (piece && !dimmed) {
      const ghostY = board.ghostY();
      piece.cells.forEach(([cx, cy], i) => {
        const color = piece.colors[i] ?? piece.color;
        if (ghostY + cy >= 0)
          drawCrystal(ctx, color, (piece.x + cx) * CELL, (ghostY + cy) * CELL, CELL, 0.18);
      });
      // A tossed piece glows in its colour while it falls.
      if (piece.recolored) {
        ctx.save();
        ctx.shadowColor = CRYSTAL_HEX[piece.color];
        ctx.shadowBlur = 10 + 6 * Math.sin(timeMs / 120);
        ctx.fillStyle = '#ffffff';
        for (const [cx, cy] of piece.cells) {
          if (piece.y + cy >= 0)
            ctx.fillRect((piece.x + cx) * CELL - 1, (piece.y + cy) * CELL - 1, CELL + 2, CELL + 2);
        }
        ctx.restore();
      }
      piece.cells.forEach(([cx, cy], i) => {
        const color = piece.colors[i] ?? piece.color;
        if (piece.y + cy >= 0)
          drawCrystal(ctx, color, (piece.x + cx) * CELL, (piece.y + cy) * CELL, CELL);
      });
    }

    this.drawFlashes(w, dtMs);
    this.drawCellFlashes(dtMs);
    this.drawPops(w, dtMs);
    this.drawBadges(status, this.badgeRight(board), timeMs);
    if (scene.preroll && !status.paused && !dimmed) {
      ctx.fillStyle = '#10132ad0';
      ctx.fillRect(0, h * 0.42, w, 56);
      ctx.fillStyle = '#f5d77b';
      ctx.font = 'bold 18px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Touch the board', w / 2, h * 0.42 + 24);
      ctx.font = '13px system-ui';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('to begin: then it counts', w / 2, h * 0.42 + 44);
    }
    if (status.paused) {
      ctx.fillStyle = '#080a12';
      ctx.fillRect(-10, 0, w + 20, h);
      ctx.fillStyle = '#aeb6d7';
      ctx.font = 'bold 40px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('❚❚', w / 2, h / 2);
    } else if (dimmed) {
      ctx.fillStyle = '#080a12b0';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();

    this.drawNext(status.paused ? [] : status.upcomingPieces, status.fogPieces);
  }

  /**
   * The encounter's place under the cells: furrows and paths, the tower's
   * ghost outline and the toy box, the lip, and the sun crossing the beds.
   */
  private drawSceneUnder(board: Board, scene: BoardScene, timeMs: number): void {
    const { ctx } = this;
    const h = board.height * CELL;
    scene.zones?.forEach((want, x) => {
      ctx.fillStyle = want ? '#3a2814' : '#1f3a1a';
      ctx.fillRect(x * CELL, 0, CELL, h);
    });
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        if (scene.spare?.(x, y)) {
          ctx.fillStyle = '#4a3420';
          ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        }
        if (scene.outline?.(x, y)) {
          ctx.globalAlpha = 0.5 + 0.2 * Math.sin(timeMs / 400);
          ctx.strokeStyle = '#61d9e8';
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(x * CELL + 2.5, y * CELL + 2.5, CELL - 5, CELL - 5);
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      }
    }
    if (scene.lipY !== undefined) {
      ctx.fillStyle = '#c9a26b';
      ctx.fillRect(0, scene.lipY * CELL - 2, board.width * CELL, 4);
    }
    if (scene.dayGone !== undefined) {
      const sx = scene.dayGone * board.width * CELL;
      ctx.fillStyle = scene.dayGone > 0.85 ? '#ff9a3c' : '#f5d77b';
      ctx.beginPath();
      ctx.arc(sx, 14, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** What's coming next piece: marked cells pulse; incoming rows show a red bar under the board. */
  private drawTelegraphs(board: Board, telegraphs: readonly Telegraph[], timeMs: number): void {
    const { ctx } = this;
    const pulse = 0.5 + 0.5 * Math.sin(timeMs / 120);
    for (const mark of telegraphs) {
      if (mark.kind === 'cells') {
        ctx.strokeStyle =
          mark.what === 'spore' ? 'rgba(220, 255, 200, 0.9)' : 'rgba(255, 140, 60, 0.9)';
        ctx.globalAlpha = 0.4 + 0.6 * pulse;
        ctx.lineWidth = 3;
        for (const [x, y] of mark.cells)
          ctx.strokeRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4);
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;
      } else if (mark.kind === 'rows') {
        const h = board.height * CELL;
        ctx.globalAlpha = 0.4 + 0.4 * pulse;
        ctx.fillStyle = '#ff465a';
        ctx.fillRect(0, h - 6 * mark.rows, board.width * CELL, 6 * mark.rows);
        ctx.globalAlpha = 1;
      }
    }
  }

  /**
   * The dark (§7.1): unlit cells are covered; the skyline (each column's
   * top cell) shows as a lit outline, and the ghost's landing stays lit.
   */
  private drawDark(board: Board, lit: boolean[][]): void {
    const { ctx } = this;
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        if (!lit[y]?.[x]) {
          ctx.fillStyle = '#04050b';
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }
    ctx.strokeStyle = '#d9e2ff';
    ctx.lineWidth = 2;
    for (let x = 0; x < board.width; x++) {
      const y = board.grid.findIndex((row) => row[x] !== null);
      if (y >= 0) {
        ctx.beginPath();
        ctx.moveTo(x * CELL, y * CELL + 1);
        ctx.lineTo((x + 1) * CELL, y * CELL + 1);
        ctx.stroke();
      }
    }
    ctx.lineWidth = 1;
  }

  /** An enemy's sealed column: hatched stone with a lock and the pieces it lasts. */
  private drawSeal(board: Board, timeMs: number): void {
    const seal = board.seal;
    if (!seal) return;
    const { ctx } = this;
    const x = seal.column * CELL;
    const h = board.height * CELL;
    ctx.save();
    ctx.fillStyle = 'rgba(120, 132, 160, 0.38)';
    ctx.fillRect(x, 0, CELL, h);
    ctx.strokeStyle = 'rgba(200, 210, 230, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = -CELL; y < h; y += 14) {
      ctx.moveTo(x, y + CELL);
      ctx.lineTo(x + CELL, y);
    }
    ctx.stroke();
    ctx.strokeStyle = '#b9c6d8';
    ctx.strokeRect(x + 1, 1, CELL - 2, h - 2);
    const bob = Math.sin(timeMs / 200) * 2;
    drawIcon(ctx, 'lock', x + (CELL - ICON_SIZE * 2) / 2, 6 + bob, { scale: 2 });
    drawCount(ctx, seal.pieces, x + 10, 54);
    ctx.restore();
  }

  /** The right edge for badges: left of a sealed column near the right wall. */
  private badgeRight(board: Board): number {
    const column = board.seal?.column ?? 0;
    return (column >= board.width - 2 ? column : board.width) * CELL;
  }

  /** Cells that just changed (turned to stone) flash white, then fade. */
  private drawCellFlashes(dtMs: number): void {
    const { ctx } = this;
    this.cellFlashes = this.cellFlashes.filter((flash) => {
      flash.elapsed += dtMs;
      const t = flash.elapsed / (FLASH_MS * 2);
      if (t >= 1) return false;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = '#e6ecff';
      for (const [x, y] of flash.cells) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      ctx.globalAlpha = 1;
      return true;
    });
  }

  private drawFlashes(width: number, dtMs: number): void {
    const { ctx } = this;
    this.flashes = this.flashes.filter((flash) => {
      flash.elapsed += dtMs;
      const t = flash.elapsed / FLASH_MS;
      if (t >= 1) return false;
      // A white burst that settles into the line's element colour, then fades.
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = t < 0.25 ? '#ffffff' : flash.color;
      const grow = Math.round(t * 10);
      ctx.fillRect(0, flash.row * CELL - grow, width, CELL + grow * 2);
      ctx.globalAlpha = 1;
      return true;
    });
  }

  private drawPops(width: number, dtMs: number): void {
    this.pops = this.pops.filter((pop) => {
      pop.elapsed += dtMs;
      const t = pop.elapsed / POP_MS;
      if (t >= 1) return false;
      const scale = t < 0.15 ? 3 + Math.round((1 - t / 0.15) * 2) : 3;
      const size = ICON_SIZE * scale;
      const baseY = pop.row === undefined ? 90 : pop.row * CELL + CELL / 2;
      drawIcon(this.ctx, pop.icon, (width - size) / 2, baseY - size / 2 - t * 50, {
        scale,
        alpha: t < 0.7 ? 1 : (1 - t) / 0.3,
      });
      return true;
    });
  }

  /** Tailwind, haste and quicken (seconds) counters, top-right of the board. */
  private drawBadges(status: BoardStatus, width: number, timeMs: number): void {
    const badges: [IconId, number][] = [];
    if (status.slowPieces > 0) badges.push(['wind', status.slowPieces]);
    if (status.hastePieces > 0) badges.push(['haste', status.hastePieces]);
    if (status.quickenMs > 0) badges.push(['hourglass', Math.ceil(status.quickenMs / 1000)]);
    badges.forEach(([icon, count], i) => {
      const x = width - 52;
      const y = 8 + i * 34;
      const bob = icon === 'wind' ? 0 : Math.sin(timeMs / 90) * 2;
      this.ctx.fillStyle = '#10132acc';
      this.ctx.fillRect(x - 4, y - 2, 52, 30);
      drawIcon(this.ctx, icon, x, y + bob, { scale: 2 });
      drawCount(this.ctx, count, x + 30, y + 20);
    });
  }

  /**
   * The next piece, large, with any further pieces Insight reveals stacked
   * small beside it; in an enemy's fog, a grey cloud with an eye and the
   * pieces it lasts instead.
   */
  private drawNext(names: readonly QueuedPiece[], fog: number): void {
    const ctx = this.nextCtx;
    const width = NEXT_MAIN_WIDTH + (names.length > 1 ? NEXT_SMALL_WIDTH : 0);
    if (ctx.canvas.width !== width) {
      ctx.canvas.width = width; // resizing resets the context
      ctx.imageSmoothingEnabled = false;
    }
    const { height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    if (fog > 0) {
      ctx.fillStyle = '#4a5068';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#9aa3bd';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(12 + i * 18, height / 2 + (i % 2 ? 8 : -6), 16, 0, Math.PI * 2);
        ctx.fill();
      }
      drawIcon(ctx, 'eye', width / 2 - ICON_SIZE, height / 2 - ICON_SIZE, { scale: 2 });
      drawCount(ctx, fog, width - 20, height - 8);
      return;
    }
    const [first, ...rest] = names;
    if (first) drawPiece(ctx, first, 0, 0, NEXT_MAIN_WIDTH, height, 24);
    const slot = height / Math.max(1, rest.length);
    rest.forEach((piece, i) =>
      drawPiece(ctx, piece, NEXT_MAIN_WIDTH, i * slot, NEXT_SMALL_WIDTH, slot, 10),
    );
  }
}

/** A piece in its spawn orientation and colours (two-tone when dual), centred in the given box. */
function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: QueuedPiece,
  x: number,
  y: number,
  width: number,
  height: number,
  size: number,
): void {
  const def = PIECES[piece.name];
  const colors = cellColors(piece);
  const xs = def.cells.map(([cx]) => cx);
  const ys = def.cells.map(([, cy]) => cy);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const ox = x + (width - (Math.max(...xs) - minX + 1) * size) / 2;
  const oy = y + (height - (Math.max(...ys) - minY + 1) * size) / 2;
  def.cells.forEach(([cx, cy], i) => {
    const color = colors[i] ?? def.color;
    drawCrystal(ctx, color, ox + (cx - minX) * size, oy + (cy - minY) * size, size);
  });
}

/** The masonry beside a narrow board (Rowan's well shaft). */
function drawBricks(ctx: CanvasRenderingContext2D, width: number, full: number, h: number): void {
  ctx.strokeStyle = '#3a2418';
  for (const left of [0, full - width]) {
    for (let row = 0; row * 15 < h; row++) {
      const shift = row % 2 === 0 ? 0 : 15;
      for (let x = left - shift; x < left + width; x += 30) {
        ctx.strokeRect(Math.max(left, x) + 0.5, row * 15 + 0.5, 30, 15);
      }
    }
  }
}

/** A tag's mark over its cell: the pipe, the rot, a young cap, a spore (a ridge is its soil). */
function drawTag(
  ctx: CanvasRenderingContext2D,
  tag: string,
  x: number,
  y: number,
  timeMs: number,
): void {
  const middle = (CELL - ICON_SIZE * 2) / 2;
  switch (tag) {
    case 'target':
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(timeMs / 200);
      ctx.strokeStyle = '#f5d77b';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
      ctx.lineWidth = 1;
      ctx.globalAlpha = 1;
      drawIcon(ctx, 'drop', x + middle, y + middle, { scale: 2 });
      break;
    case 'hazard':
      ctx.fillStyle = 'rgba(70, 40, 20, 0.75)';
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = '#7a5a3a';
      ctx.fillRect(x + 6, y + 8, 5, 5);
      ctx.fillRect(x + 17, y + 16, 6, 5);
      break;
    case 'protected':
      drawIcon(ctx, 'mushroom', x + middle, y + middle, { scale: 2 });
      break;
    case 'spore':
      ctx.fillStyle = '#eaffd8';
      ctx.fillRect(x + 7, y + 7, 3, 3);
      ctx.fillRect(x + 20, y + 10, 3, 3);
      ctx.fillRect(x + 12, y + 20, 3, 3);
      break;
    default:
      break;
  }
}

/** A crystal with a highlight and, for elemental crystals, its element glyph. */
export function drawCrystal(
  ctx: CanvasRenderingContext2D,
  cell: Exclude<Cell, null>,
  x: number,
  y: number,
  size: number,
  alpha = 1,
): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = CRYSTAL_HEX[cell];
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  ctx.fillStyle = '#ffffff35';
  ctx.fillRect(x + 3, y + 3, size - 6, 3);
  if (isCrystal(cell) && size >= 24) {
    const glyph = ICON_SIZE * GLYPH.scale;
    const scale = size >= 28 ? GLYPH.scale : 1;
    const offset = (size - (scale === 1 ? ICON_SIZE : glyph)) / 2;
    drawIcon(ctx, ELEMENT_ICONS[ELEMENT_OF_COLOR[cell]], x + offset, y + offset, {
      scale,
      silhouette: GLYPH.silhouette,
      alpha,
    });
  }
  ctx.globalAlpha = 1;
}

/** A small outlined number, used on badges. */
export function drawCount(
  ctx: CanvasRenderingContext2D,
  value: number,
  x: number,
  y: number,
): void {
  ctx.font = 'bold 15px system-ui';
  ctx.textAlign = 'left';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#10132a';
  ctx.strokeText(String(value), x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(value), x, y);
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not supported');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
