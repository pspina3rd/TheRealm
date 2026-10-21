import type { Board } from '../core/board';
import { PIECES, type PieceName } from '../core/pieces';
import { drawCrystal } from './placeholders';

const CELL = 30;

/** Draws the falling-block board, ghost piece and an optional overlay message. */
export function drawBoard(ctx: CanvasRenderingContext2D, board: Board, overlay?: string): void {
  const w = board.width * CELL;
  const h = board.height * CELL;
  ctx.fillStyle = '#0a0c17';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#1d2238';
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      ctx.strokeRect(x * CELL + 0.5, y * CELL + 0.5, CELL, CELL);
      const cell = board.grid[y]?.[x];
      if (cell) drawCrystal(ctx, cell, x * CELL, y * CELL, CELL);
    }
  }

  const piece = board.active;
  if (piece && !overlay) {
    const ghostY = board.ghostY();
    for (const [cx, cy] of piece.cells) {
      if (ghostY + cy >= 0) {
        drawCrystal(ctx, piece.color, (piece.x + cx) * CELL, (ghostY + cy) * CELL, CELL, 0.2);
      }
    }
    for (const [cx, cy] of piece.cells) {
      if (piece.y + cy >= 0) {
        drawCrystal(ctx, piece.color, (piece.x + cx) * CELL, (piece.y + cy) * CELL, CELL);
      }
    }
  }

  if (overlay) {
    ctx.fillStyle = '#080a12cc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f5d77b';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px system-ui';
    ctx.fillText(overlay, w / 2, h / 2);
  }
}

/** Draws the next piece, centred in the canvas. */
export function drawNext(ctx: CanvasRenderingContext2D, name: PieceName | undefined): void {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (!name) return;
  const def = PIECES[name];
  const size = 20;
  const xs = def.cells.map(([x]) => x);
  const ys = def.cells.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const ox = (width - (Math.max(...xs) - minX + 1) * size) / 2;
  const oy = (height - (Math.max(...ys) - minY + 1) * size) / 2;
  for (const [x, y] of def.cells) {
    drawCrystal(ctx, def.color, ox + (x - minX) * size, oy + (y - minY) * size, size);
  }
}
