/** What a touch on the board asks the falling piece to do. */
export type GestureAction = 'left' | 'right' | 'rotate' | 'softDrop' | 'hardDrop';

/** Tuning for board gestures; distances in CSS pixels, times in milliseconds. */
export const GESTURE = {
  /** A touch that moves less than this is still a tap. */
  slopPx: 14,
  /** The first column step comes after this fraction of a column; later ones every column. */
  firstColumn: 0.6,
  /** A downward drag soft drops once held this long (so a quick flick never soft drops)… */
  softDropDelayMs: 120,
  /** …then one row every this many milliseconds while the finger stays down. */
  softDropRepeatMs: 50,
  /** A release moving down at least this fast (px/ms) is a flick: hard drop. */
  flickSpeed: 0.35,
  /** A flick must also travel this far down in all. */
  flickMinPx: 36,
  /** The speed of a release is measured over this last stretch of the touch… */
  speedWindowMs: 80,
  /**
   * …or, when events come sparsely (a phone at 20–30 fps), over the last
   * two samples that actually moved, if that movement ended this recently.
   */
  staleMoveMs: 100,
  /** A downward drag of `flickMinPx` that is over within this time is a flick whatever its speed. */
  quickFlickMs: 250,
} as const;

/**
 * Downward speed (px/ms) from `a` to `b`, or 0 for a movement shorter than
 * the slop: a few pixels of finger tremor at a high event rate can look
 * fast, but is never a flick.
 */
function downSpeed(a: Sample, b: Sample): number {
  const dy = b.y - a.y;
  return dy < GESTURE.slopPx ? 0 : dy / Math.max(1, b.t - a.t);
}

type Mode =
  /** No touch. */
  | 'idle'
  /** Down, not yet moved past the slop: may become a tap or a drag. */
  | 'pending'
  /** Dragging sideways: the piece follows the finger column by column. */
  | 'horizontal'
  /** Dragging down: soft drop while held, hard drop on a flick. */
  | 'vertical'
  /** Spent: dragged up, a second finger landed, or the piece locked. Waits for all fingers up. */
  | 'spent';

interface Sample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

/**
 * Turns pointer events on the board into piece moves, without the DOM so
 * it can be tested. Feed it `down`/`move`/`up`/`cancel` and call `tick`
 * every frame; each returns the moves to apply now.
 *
 * - Tap or long press (still): rotate, on release.
 * - Drag sideways: one column per `cellPx` the finger travels (follow the finger).
 * - Drag down and hold: soft drop, repeating while held.
 * - Flick down (fast release): hard drop.
 * - A second finger cancels the gesture until every finger is lifted.
 *
 * A gesture keeps the axis it starts on, so a sideways drag never drops.
 */
export class GestureRecognizer {
  /** On-screen width of one board column, in the same units as the coordinates. */
  cellPx: number;
  private mode: Mode = 'idle';
  private readonly fingers = new Set<number>();
  private primary: number | null = null;
  private start: Sample = { x: 0, y: 0, t: 0 };
  private last: Sample = { x: 0, y: 0, t: 0 };
  private samples: Sample[] = [];
  /** The last stretch between two samples that moved down (for sparse events). */
  private lastStroke: { from: Sample; to: Sample } | null = null;
  private columns = 0;
  private verticalSince = 0;
  private lastDrop = 0;

  constructor(cellPx: number) {
    this.cellPx = cellPx;
  }

  /** True while a finger is down on the board. */
  get active(): boolean {
    return this.fingers.size > 0;
  }

  down(id: number, x: number, y: number, t: number): GestureAction[] {
    this.fingers.add(id);
    if (this.fingers.size > 1) {
      this.mode = 'spent';
      return [];
    }
    this.primary = id;
    this.mode = 'pending';
    this.start = this.last = { x, y, t };
    this.samples = [this.start];
    this.lastStroke = null;
    this.columns = 0;
    return [];
  }

  move(id: number, x: number, y: number, t: number): GestureAction[] {
    if (id !== this.primary) return [];
    this.track({ x, y, t });
    const dx = x - this.start.x;
    const dy = y - this.start.y;
    if (this.mode === 'pending') {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < GESTURE.slopPx) return [];
      if (Math.abs(dx) >= Math.abs(dy)) this.mode = 'horizontal';
      else if (dy > 0) {
        this.mode = 'vertical';
        this.verticalSince = t;
        this.lastDrop = -Infinity;
      } else this.mode = 'spent';
    }
    if (this.mode !== 'horizontal') return [];
    const steps = Math.floor(Math.abs(dx) / this.cellPx + (1 - GESTURE.firstColumn));
    const target = Math.sign(dx) * steps;
    const actions: GestureAction[] = [];
    while (this.columns < target) {
      this.columns++;
      actions.push('right');
    }
    while (this.columns > target) {
      this.columns--;
      actions.push('left');
    }
    return actions;
  }

  up(id: number, x: number, y: number, t: number): GestureAction[] {
    if (!this.fingers.delete(id)) return [];
    const wasPrimary = id === this.primary;
    const mode = this.mode;
    if (this.fingers.size === 0) this.reset();
    if (!wasPrimary) return [];
    // A still touch rotates on release, a quick tap or a long press alike
    // (a long press used to do nothing, which felt like a missed tap).
    if (mode === 'pending') return ['rotate'];
    if (mode !== 'vertical') return [];
    this.track({ x, y, t });
    const travelled = y - this.start.y;
    if (travelled < GESTURE.flickMinPx) return [];
    if (t - this.start.t <= GESTURE.quickFlickMs) return ['hardDrop'];
    const from = this.samples.find((s) => t - s.t <= GESTURE.speedWindowMs) ?? this.last;
    let speed = downSpeed(from, { x, y, t });
    const stroke = this.lastStroke;
    if (stroke && t - stroke.to.t <= GESTURE.staleMoveMs) {
      speed = Math.max(speed, downSpeed(stroke.from, stroke.to));
    }
    return speed >= GESTURE.flickSpeed ? ['hardDrop'] : [];
  }

  /** The browser took the touch away (e.g. a system gesture): forget it, doing nothing. */
  cancel(id: number): void {
    if (!this.fingers.delete(id)) return;
    this.mode = 'spent';
    if (this.fingers.size === 0) this.reset();
  }

  /** Ends the current gesture early (e.g. the piece locked): the rest of the touch does nothing. */
  lockout(): void {
    if (this.mode !== 'idle') this.mode = 'spent';
  }

  /** Soft drops due by time `t` while a downward drag is held below its start. */
  tick(t: number): GestureAction[] {
    if (this.mode !== 'vertical') return [];
    if (this.last.y - this.start.y < GESTURE.slopPx) return [];
    if (t - this.verticalSince < GESTURE.softDropDelayMs) return [];
    if (t - this.lastDrop < GESTURE.softDropRepeatMs) return [];
    this.lastDrop = t;
    return ['softDrop'];
  }

  private track(sample: Sample): void {
    if (sample.y > this.last.y) this.lastStroke = { from: this.last, to: sample };
    this.last = sample;
    this.samples.push(sample);
    // Only the recent past matters for a flick's speed.
    while (
      this.samples.length > 2 &&
      sample.t - (this.samples[1] as Sample).t > GESTURE.speedWindowMs
    )
      this.samples.shift();
  }

  private reset(): void {
    this.mode = 'idle';
    this.primary = null;
  }
}
