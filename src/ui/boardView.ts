import { cellColors, type Board, type QueuedPiece } from '../core/board';
import { ELEMENT_OF_COLOR } from '../core/elements';
import { PIECES, type Cell } from '../core/pieces';
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

  render(board: Board, status: BoardStatus, dtMs: number, timeMs: number, dimmed: boolean): void {
    const { ctx } = this;
    const w = board.width * CELL;
    const h = board.height * CELL;
    this.shake = Math.max(0, this.shake - dtMs);
    const dx = this.shake > 0 ? Math.sin(timeMs / 18) * 5 * (this.shake / SHAKE_MS) : 0;

    ctx.save();
    ctx.translate(dx, 0);
    ctx.fillStyle = '#0a0c17';
    ctx.fillRect(-10, 0, w + 20, h);
    ctx.strokeStyle = '#1d2238';
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        ctx.strokeRect(x * CELL + 0.5, y * CELL + 0.5, CELL, CELL);
        const cell = board.grid[y]?.[x];
        if (cell) drawCrystal(ctx, cell, x * CELL, y * CELL, CELL);
      }
    }

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
  if (cell !== 'stone' && size >= 24) {
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
