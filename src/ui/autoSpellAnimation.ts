/** Six elemental effects at all four ranks, driven by the resolver's actual cell identities and destinations. */
import type { AutoCastFrame } from '../battle/battle';
import type { Board } from '../core/board';
import type { Cell } from '../core/pieces';
import type { MagicState } from '../core/boardMagic';
import { spanFor } from '../core/boardMagic';
import { drawCrystal, drawObstruction } from './boardView';
import { drawIcon } from './iconDraw';
import { ELEMENT_ICONS } from './art/icons';
import { ELEMENT_COLOR_OF } from './art/feedback';
const S = 30;
function block(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  at: readonly [number, number],
  state: MagicState,
  time: number,
): void {
  if (!cell) return;
  drawCrystal(ctx, cell, at[0] * S, at[1] * S, S);
  const o = state.obstructions[`${Math.round(at[0])},${Math.round(at[1])}`];
  if (o) drawObstruction(ctx, o, at[0] * S, at[1] * S, time);
}
export function drawAutoSpell(
  ctx: CanvasRenderingContext2D,
  frame: AutoCastFrame,
  board: Board,
  time: number,
  reducedMotion = false,
): void {
  if (frame.preview.character) return;
  const { preview, before } = frame,
    result = preview.resolution,
    effect = result.effectState ?? result.state;
  const actors = result.visual ?? [];
  const [top, bottom] = spanFor(
    { element: preview.element, rank: preview.rank, bottomRow: preview.target.bottomRow },
    board.height,
  );
  const color = ELEMENT_COLOR_OF[preview.element];
  const progress = Math.max(0, Math.min(1, 1 - frame.remainingMs / frame.durationMs));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (frame.source === 'weave' && frame.phase !== 'effect') {
    const visible = frame.phase === 'target' ? before : result.state;
    ctx.fillStyle = '#0a0c17';
    ctx.fillRect(0, 0, board.width * S, board.height * S);
    ctx.strokeStyle = '#1d2238';
    for (let y = 0; y < board.height; y++)
      for (let x = 0; x < board.width; x++) {
        ctx.strokeRect(x * S + 0.5, y * S + 0.5, S, S);
        block(ctx, visible.grid[y]?.[x] ?? null, [x, y], visible, time);
      }
    const piece = board.active;
    if (piece)
      piece.cells.forEach(([dx, dy], i) => {
        if (piece.y + dy >= 0)
          drawCrystal(
            ctx,
            piece.colors[i] ?? piece.color,
            (piece.x + dx) * S,
            (piece.y + dy) * S,
            S,
          );
      });
  }
  if (frame.phase === 'effect') {
    ctx.fillStyle = '#0a0c17';
    ctx.fillRect(0, 0, board.width * S, board.height * S);
    ctx.strokeStyle = '#1d2238';
    ctx.lineWidth = 1;
    for (let y = 0; y < board.height; y++)
      for (let x = 0; x < board.width; x++) ctx.strokeRect(x * S + 0.5, y * S + 0.5, S, S);
    const first = progress < 0.7;
    const p = first ? Math.min(1, progress / 0.6) : Math.min(1, (progress - 0.7) / 0.3);
    for (const actor of actors) {
      const from = first ? actor.from : actor.effectAt,
        to = first ? actor.effectAt : actor.to;
      const old = first ? actor.before : actor.effectCell,
        next = first ? actor.effectCell : actor.after;
      const state = first ? effect : result.state;
      if (!from && !to) continue;
      const origin = from ?? to ?? [0, 0],
        dest = to ?? origin;
      const ease = reducedMotion
        ? 1
        : preview.element === 'earth' || !first
          ? p * p
          : 1 - (1 - p) * (1 - p);
      const at: [number, number] = [
        origin[0] + (dest[0] - origin[0]) * ease,
        origin[1] + (dest[1] - origin[1]) * ease,
      ];
      ctx.save();
      const obstruction = from ? before.obstructions[`${from[0]},${from[1]}`] : undefined;
      const strikes = preview.rank >= 3 ? 2 : 1;
      const strikeTimes = strikes === 2 ? [0.25, 0.7] : [0.45];
      const landed = strikeTimes.filter((impact) => p >= impact).length;
      const conversion =
        first &&
        obstruction &&
        (preview.element === 'lightning' || preview.element === 'nature') &&
        (old !== next ||
          obstruction.strength !== effect.obstructions[`${origin[0]},${origin[1]}`]?.strength);
      if (!to) ctx.globalAlpha = 1 - p;
      else if (!from) ctx.globalAlpha = p;
      const strengthChanged =
        first &&
        from &&
        before.obstructions[`${from[0]},${from[1]}`]?.strength !==
          effect.obstructions[`${from[0]},${from[1]}`]?.strength;
      if (conversion) {
        // Show each actual durability hit before the final break/conversion.
        ctx.globalAlpha = 1;
        if (landed >= Math.min(strikes, obstruction.strength)) block(ctx, next, dest, effect, time);
        else {
          const intermediate = {
            ...before,
            obstructions: {
              ...before.obstructions,
              [`${origin[0]},${origin[1]}`]: {
                ...obstruction,
                strength: Math.max(1, obstruction.strength - landed),
              },
            },
          };
          block(ctx, old, origin, intermediate, time);
        }
      } else if ((old !== next || strengthChanged) && old && next) {
        ctx.globalAlpha = 1 - p;
        block(ctx, old, origin, first ? before : effect, time);
        ctx.globalAlpha = p;
        block(ctx, next, at, state, time);
      } else block(ctx, next ?? old, at, state, time);
      ctx.restore();
      if (!first || reducedMotion) continue;
      const x = origin[0] * S,
        y = origin[1] * S;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      if (preview.element === 'fire' && old && !next) {
        // Flames rise from precisely the blocks being burned, followed by embers.
        for (let i = 0; i < 3; i++) {
          const lift = (p * 28 + i * 9) % 30;
          ctx.globalAlpha = 1 - p * 0.65;
          drawIcon(ctx, 'fire', x + 3 + i * 7, y + 15 - lift, { scale: 1 });
        }
        ctx.globalAlpha = 1;
      } else if (preview.element === 'lightning' && actor.before === 'stone' && actor.from) {
        const changed =
          before.obstructions[`${origin[0]},${origin[1]}`]?.strength !==
          effect.obstructions[`${origin[0]},${origin[1]}`]?.strength;
        if (changed && strikeTimes.some((impact) => p >= impact - 0.1 && p < impact + 0.12)) {
          ctx.beginPath();
          ctx.moveTo(x + 17, Math.max(top * S, y - 40));
          ctx.lineTo(x + 9, y + 7);
          ctx.lineTo(x + 19, y + 7);
          ctx.lineTo(x + 12, y + 25);
          ctx.stroke();
        }
      } else if (preview.element === 'nature' && actor.before === 'stone' && actor.from) {
        const changed =
          before.obstructions[`${origin[0]},${origin[1]}`]?.strength !==
            effect.obstructions[`${origin[0]},${origin[1]}`]?.strength || old !== next;
        if (changed) {
          ctx.beginPath();
          ctx.moveTo(x + 3, y + 28);
          ctx.quadraticCurveTo(x + 4, y + 28 - p * 35, x + 25, y + 28 - p * 25);
          ctx.stroke();
          drawIcon(ctx, 'nature', x + 8, y + 18 - p * 15, { scale: 1, alpha: p });
          for (const impact of strikeTimes) {
            const wave = (p - impact + 0.12) / 0.3;
            if (wave >= 0 && wave <= 1) {
              ctx.globalAlpha = 1 - wave;
              ctx.beginPath();
              ctx.arc(x + 15, y + 15, 4 + wave * 12, 0, Math.PI * 2);
              ctx.stroke();
              ctx.globalAlpha = 1;
            }
          }
        }
      } else if (preview.element === 'water' && !actor.from && to) {
        // A frost crystal grows into each gap before the completed row collapses.
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y + 30 * (1 - p), 30, 30 * p);
        ctx.clip();
        drawCrystal(ctx, 'neutral', x, y, 30);
        ctx.restore();
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 15);
        ctx.lineTo(x + 24, y + 15);
        ctx.moveTo(x + 15, y + 6);
        ctx.lineTo(x + 15, y + 24);
        ctx.moveTo(x + 9, y + 9);
        ctx.lineTo(x + 21, y + 21);
        ctx.stroke();
      } else if (preview.element === 'wind' && from && to && from[0] !== to[0]) {
        const sign = Math.sign(to[0] - from[0]);
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(at[0] * S + 15 - sign * 25, y + 8 + i * 7);
          ctx.quadraticCurveTo(
            at[0] * S + 15,
            y + i * 7,
            at[0] * S + 15 + sign * 16,
            y + 8 + i * 7,
          );
          ctx.stroke();
        }
      } else if (preview.element === 'earth' && from && to && from[1] !== to[1]) {
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x + 7 + i * 8, at[1] * S - 18);
          ctx.lineTo(x + 7 + i * 8, at[1] * S - 3);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
    // Keep the waiting piece visible; it does not advance during an automatic cast.
    const piece = board.active;
    if (piece)
      piece.cells.forEach(([dx, dy], i) => {
        if (piece.y + dy >= 0)
          drawCrystal(
            ctx,
            piece.colors[i] ?? piece.color,
            (piece.x + dx) * S,
            (piece.y + dy) * S,
            S,
          );
      });
  }
  // A steady target bracket replaces whole-row flashes.
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, top * S + 1, board.width * S - 2, (bottom - top + 1) * S - 2);
  // Separate row ticks keep the area legible, including Gravity's whole-board rank.
  for (let row = top; row <= bottom; row++) {
    ctx.beginPath();
    ctx.moveTo(1, row * S + S / 2);
    ctx.lineTo(7, row * S + S / 2);
    ctx.moveTo(board.width * S - 7, row * S + S / 2);
    ctx.lineTo(board.width * S - 1, row * S + S / 2);
    ctx.stroke();
  }
  // Four rank pips identify the learned tier without relying on flash brightness.
  for (let tier = 1; tier <= 4; tier++) {
    ctx.fillStyle = tier <= preview.rank ? color : '#38415b';
    ctx.fillRect(8 + (tier - 1) * 7, top * S + 4, 5, 4);
  }
  if (frame.phase === 'target') {
    for (const actor of actors) {
      const changed =
        actor.before !== actor.effectCell ||
        JSON.stringify(actor.from) !== JSON.stringify(actor.effectAt) ||
        (actor.from &&
          before.obstructions[`${actor.from[0]},${actor.from[1]}`]?.strength !==
            effect.obstructions[`${actor.from[0]},${actor.from[1]}`]?.strength);
      const at = actor.from ?? actor.effectAt;
      if (changed && at) {
        ctx.strokeRect(at[0] * S + 3, at[1] * S + 3, 24, 24);
        drawIcon(ctx, ELEMENT_ICONS[preview.element], at[0] * S + 9, at[1] * S + 9, { scale: 1 });
      }
    }
  }
  ctx.restore();
}
