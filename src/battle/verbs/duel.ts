import type { LockResult } from '../../core/board';
import { DUEL_BACK_TO_BACK, DUEL_PRICES, DUEL_SENDS, TELEGRAPH_LEAD } from '../../data/balance';
import type { HaggleGrade } from '../../game/stakes';
import type { BattleContext, BattleStatus, Challenge, Objective, Telegraph } from '../types';

/** A merchant's script for a scripted DUEL (§2 "DUEL (scripted) rules", §6.1). */
export interface DuelParams {
  readonly startRows: number;
  readonly topRows: number;
  readonly growMs: number;
  readonly sendMs: number;
  readonly sendRows: number;
  readonly clearMs: number;
  readonly clearRows: number;
  readonly durationMs: number;
  readonly meterPerSent: number;
  readonly meterPerReceived: number;
  /** Your clears cancel his pending rows first. */
  readonly cancel: boolean;
  /** The meter starts this much worse per strain step. */
  readonly strainMeter: number;
}

/** How long into the pre-roll the demo's counter-offer arrives. */
export const DEMO_SEND_MS = 900;

/** Rows a clear of `lines` sends: 2/3/4 lines send 1/2/4, +1 back-to-back; singles nothing. */
export function rowsSent(lines: number, backToBack: boolean): number {
  const base = DUEL_SENDS[Math.min(lines, DUEL_SENDS.length - 1)] ?? 0;
  return base + (backToBack && lines >= 2 ? DUEL_BACK_TO_BACK : 0);
}

/** The band a final price falls in (§6.1): ≤ 85% Great, ≤ 94% Win, ≤ 105% Even, above Fail. */
export function gradeOf(meter: number): HaggleGrade {
  if (meter <= DUEL_PRICES.great + 1e-9) return 'great';
  if (meter <= DUEL_PRICES.win + 1e-9) return 'win';
  if (meter <= DUEL_PRICES.even + 1e-9) return 'even';
  return 'fail';
}

/**
 * DUEL, scripted (a merchant's haggle). The rival is a modelled stack: it
 * grows, clears and sends rows on a timer from its script. Each send is
 * telegraphed one piece ahead (a pending bar) and lands after the hero's
 * next lock, between pieces. The hero's 2/3/4-line clears add 1/2/4 rows
 * to the rival's stack (+1 back-to-back), each moving the price meter in
 * the hero's favour; each row received moves it back. It ends when time
 * is up, when the rival tops out ("Sold!": at most `sold`), or when the
 * hero tops out (a walk-off: at least `walkOff`). The final price's band
 * is the outcome: Great, Win and Even are won; Fail is lost.
 */
export class DuelChallenge implements Challenge {
  readonly preroll = true;
  rivalRows: number;
  meter: number;
  elapsed = 0;
  /** Rows on their way; armed rows land at the next lock. */
  private pending: { rows: number; armed: boolean }[] = [];
  private growTimer = 0;
  private sendTimer = 0;
  private clearTimer = 0;
  private prerollMs = 0;
  private demoPending: boolean;
  private backToBack = false;
  private ended: 'time' | 'sold' | 'walkOff' | null = null;
  private readonly ctx: BattleContext;
  private readonly params: DuelParams;

  constructor(ctx: BattleContext, params: DuelParams, strain = 0, demo = false) {
    this.ctx = ctx;
    this.params = params;
    this.rivalRows = params.startRows;
    this.meter = clampMeter(DUEL_PRICES.start + strain * params.strainMeter);
    this.demoPending = demo;
    ctx.board.loadRows([]);
  }

  /** Rows waiting to land on the hero's board. */
  get pendingRows(): number {
    return this.pending.reduce((sum, p) => sum + p.rows, 0);
  }

  /** The final price's band (meaningful once the haggle has ended). */
  get grade(): HaggleGrade {
    return gradeOf(this.meter);
  }

  /** The demo: the merchant's first counter-offer arrives during the pre-roll. */
  prerollUpdate(dtMs: number): void {
    this.prerollMs += dtMs;
    if (this.demoPending && this.prerollMs >= DEMO_SEND_MS) {
      this.demoPending = false;
      this.send(true);
    }
  }

  private send(armed: boolean): void {
    this.pending.push({ rows: this.params.sendRows, armed });
    this.ctx.emit({ kind: 'beat', beat: 'hazard' });
  }

  update(dtMs: number): void {
    if (this.ended) return;
    const p = this.params;
    this.elapsed += dtMs;
    this.growTimer += dtMs;
    this.sendTimer += dtMs;
    this.clearTimer += dtMs;
    while (this.growTimer >= p.growMs) {
      this.growTimer -= p.growMs;
      this.rivalRows++;
    }
    while (this.clearTimer >= p.clearMs) {
      this.clearTimer -= p.clearMs;
      this.rivalRows = Math.max(0, this.rivalRows - p.clearRows);
    }
    while (this.sendTimer >= p.sendMs) {
      this.sendTimer -= p.sendMs;
      this.send(false);
    }
    this.checkRival();
    if (!this.ended && this.elapsed >= p.durationMs) this.ended = 'time';
  }

  private checkRival(): void {
    if (this.rivalRows < this.params.topRows) return;
    this.ended = 'sold';
    this.meter = Math.min(this.meter, DUEL_PRICES.sold);
    this.ctx.emit({ kind: 'price', multiplier: this.meter });
  }

  onLock(result: LockResult): void {
    if (this.ended) return;
    const board = this.ctx.board;
    if (result.toppedOut) {
      this.ended = 'walkOff';
      this.meter = Math.max(this.meter, DUEL_PRICES.walkOff);
      return;
    }
    const lines = result.linesCleared;
    if (lines > 0) {
      let sent = rowsSent(lines, this.backToBack);
      this.backToBack = lines >= 2;
      if (this.params.cancel) sent = this.cancel(sent);
      if (sent > 0) {
        this.rivalRows += sent;
        this.shift(sent * this.params.meterPerSent);
        this.ctx.emit({ kind: 'sent', rows: sent });
        this.checkRival();
        if (this.ended) return;
      } else if (lines === 1) this.ctx.emit({ kind: 'face', face: 'wince' });
    }
    const landing = this.pending.filter((p) => p.armed).reduce((sum, p) => sum + p.rows, 0);
    this.pending = this.pending.filter((p) => !p.armed).map((p) => ({ ...p, armed: true }));
    if (landing > 0) {
      const pushed = this.ctx.pushRows({ source: 'send' }, landing);
      this.shift(pushed * this.params.meterPerReceived);
      if (board.toppedOut) {
        this.ended = 'walkOff';
        this.meter = Math.max(this.meter, DUEL_PRICES.walkOff);
      }
    }
  }

  /** Clears cancel pending rows first (from Lo on); returns what is left to send. */
  private cancel(sent: number): number {
    let left = sent;
    for (const p of this.pending) {
      const used = Math.min(left, p.rows);
      p.rows -= used;
      left -= used;
    }
    this.pending = this.pending.filter((p) => p.rows > 0);
    return left;
  }

  private shift(delta: number): void {
    this.meter = clampMeter(this.meter + delta);
    this.ctx.emit({ kind: 'price', multiplier: this.meter });
  }

  status(): BattleStatus {
    if (!this.ended) return 'ongoing';
    return this.grade === 'fail' ? 'lost' : 'won';
  }

  objective(): Objective {
    const secondsLeft = Math.max(0, Math.ceil((this.params.durationMs - this.elapsed) / 1000));
    return {
      label: `Haggle · price ${Math.round(this.meter * 100)}%`,
      progress: (DUEL_PRICES.max - this.meter) / (DUEL_PRICES.max - DUEL_PRICES.min),
      piecesLeft: null,
      price: { value: this.meter, min: DUEL_PRICES.min, max: DUEL_PRICES.max },
      counter: `${Math.round(this.meter * 100)}% · ${secondsLeft}s`,
      rival: {
        rows: this.rivalRows,
        top: this.params.topRows,
        pending: this.pendingRows,
        secondsLeft,
      },
    };
  }

  telegraphs(): readonly Telegraph[] {
    const armed = this.pending.filter((p) => p.armed).reduce((sum, p) => sum + p.rows, 0);
    return armed > 0
      ? [{ kind: 'rows', what: 'send', rows: armed, leadPieces: TELEGRAPH_LEAD }]
      : [];
  }
}

function clampMeter(value: number): number {
  const rounded = Math.round(value * 1000) / 1000;
  return Math.min(DUEL_PRICES.max, Math.max(DUEL_PRICES.min, rounded));
}
