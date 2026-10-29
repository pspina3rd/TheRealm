/** Actual game renderer plus targeting overlays; the hidden grid supplies accessible cell state. */
import type { Battle } from '../battle/battle';
import { Board } from '../core/board';
import { createRng } from '../core/rng';
import type { CastPreview } from '../battle/magicCasting';
import { BoardView } from './boardView';
import { feedbackFor } from './art/feedback';
import { magicGrid } from './magicTargeting';
import { el } from './dom';
export class WorkshopBoardView {
  readonly canvas = el('canvas', { className: 'workshop-board-canvas' });
  private readonly next = el('canvas', { className: 'workshop-next-canvas' });
  private readonly overlay = el('canvas', { className: 'target-overlay' });
  private readonly semantics = el('div', { className: 'board-semantics' });
  private readonly view: BoardView;
  private seq = 0;
  private readonly resultBoard = new Board(createRng(0));
  private resultKey = '';
  constructor(surface: HTMLElement, nextContainer: HTMLElement) {
    this.canvas.width = this.overlay.width = 300;
    this.canvas.height = this.overlay.height = 600;
    this.next.width = 96;
    this.next.height = 72;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.overlay.setAttribute('aria-hidden', 'true');
    surface.append(this.canvas, this.overlay, this.semantics);
    nextContainer.replaceChildren(this.next);
    this.view = new BoardView(this.canvas, this.next);
  }
  reset(): void {
    this.seq = 0;
    this.view.reset();
  }
  updateSemantics(
    display: Parameters<typeof magicGrid>[0],
    decorate: (grid: HTMLElement) => void,
  ): void {
    const grid = magicGrid(display);
    grid.setAttribute(
      'aria-label',
      'Current board before casting; preview leaves these blocks unchanged',
    );
    decorate(grid);
    this.semantics.replaceChildren(grid);
  }
  render(
    battle: Battle,
    preview: CastPreview | null,
    hasTarget: boolean,
    span: readonly [number, number] | undefined,
    targets: readonly (readonly [number, number])[],
    dt: number,
    time: number,
    aim: { usefulRows: readonly number[]; showResult: boolean },
  ): void {
    for (const { seq, event } of battle.eventsSince(this.seq)) {
      this.seq = seq + 1;
      for (const feedback of feedbackFor(event)) this.view.play(feedback);
    }
    const showingResult = aim.showResult && preview && hasTarget && !preview.reason;
    if (showingResult) {
      const key = JSON.stringify([preview.before, preview.target, preview.id]);
      if (key !== this.resultKey) {
        this.resultBoard.adoptMagic(preview.resolution.state);
        this.resultBoard.active = structuredClone(battle.board.active);
        this.resultKey = key;
      }
    }
    this.view.render(
      showingResult ? this.resultBoard : battle.board,
      {
        slowPieces: battle.slowPieces,
        hastePieces: battle.hastePieces,
        fogPieces: battle.fogPieces,
        quickenMs: battle.quickenMs,
        paused: false,
        upcomingPieces: battle.upcomingPieces,
        spec: battle.spec,
        objective: battle.objective,
        ...(battle.rule ? { rule: battle.rule } : {}),
        telegraphs: () => battle.telegraphs(),
      },
      dt,
      time,
      false,
    );
    const ctx = this.overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 300, 600);
    ctx.save();
    ctx.strokeStyle = '#a7e7cf';
    ctx.fillStyle = '#a7e7cf';
    ctx.lineWidth = 1;
    for (const row of aim.usefulRows) {
      ctx.fillRect(1, row * 30 + 3, 4, 24);
      ctx.strokeRect(5, row * 30 + 1, 294, 28);
    }
    if (span) {
      ctx.fillStyle = '#ffe29c14';
      ctx.fillRect(0, span[0] * 30, 300, (span[1] - span[0] + 1) * 30);
      ctx.strokeStyle = '#ffe29c';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, span[0] * 30 + 1, 298, (span[1] - span[0] + 1) * 30 - 2);
    }
    if (preview && hasTarget && !showingResult) {
      const before = battle.board.magicState(),
        after = preview.resolution.state;
      for (let y = 0; y < 20; y++)
        for (let x = 0; x < 10; x++) {
          const original = before.grid[y]?.[x],
            next = after.grid[y]?.[x];
          if (original !== next) {
            ctx.strokeStyle = next === null ? '#ffb7a6' : '#a7e7cf';
            ctx.lineWidth = 2;
            ctx.setLineDash(next === null ? [] : [4, 3]);
            ctx.strokeRect(x * 30 + 4, y * 30 + 4, 22, 22);
            if (next === null) {
              ctx.beginPath();
              ctx.moveTo(x * 30 + 6, y * 30 + 24);
              ctx.lineTo(x * 30 + 24, y * 30 + 6);
              ctx.stroke();
            }
          } else if (
            (before.obstructions[`${x},${y}`]?.strength ?? 0) >
            (after.obstructions[`${x},${y}`]?.strength ?? 0)
          ) {
            ctx.strokeStyle = '#ffe29c';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.strokeRect(x * 30 + 4, y * 30 + 4, 22, 22);
          }
        }
    }
    ctx.strokeStyle = '#e2e9ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    for (const [x, y] of targets) ctx.strokeRect(x * 30 + 5, y * 30 + 5, 20, 20);
    ctx.restore();
  }
}
