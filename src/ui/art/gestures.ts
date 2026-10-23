/** What a touch on the board asks the falling piece to do. */
export type GestureAction = 'left' | 'right' | 'rotate' | 'softDrop' | 'hardDrop';

/** Tuning for board gestures; distances in CSS pixels, times in milliseconds. */
export const GESTURE = {
  /** A touch that moves less than this is still a tap. */
  slopPx: 10,
  /** The longest press that counts as a tap (rotate). */
  tapMs: 300,
  /** The first column step comes after this fraction of a column; later ones every column. */
  firstColumn: 0.6,
  /** A downward drag soft drops once held this long (so a quick flick never soft drops)… */
  softDropDelayMs: 120,
  /** …then one row every this many milliseconds while the finger stays down. */
  softDropRepeatMs: 50,
  /** A release moving down at least this fast (px/ms) is a flick: hard drop. */
  flickSpeed: 0.5,
  /** A flick must also travel this far down in all. */
  flickMinPx: 36,
  /** The speed of a release is measured over this last stretch of the touch. */
  speedWindowMs: 80,
} as const;

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
 * - Tap (short, still): rotate.
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
    if (mode === 'pending') {
      return t - this.start.t <= GESTURE.tapMs ? ['rotate'] : [];
    }
    if (mode !== 'vertical') return [];
    this.track({ x, y, t });
    const from = this.samples.find((s) => t - s.t <= GESTURE.speedWindowMs) ?? this.last;
    const speed = (y - from.y) / Math.max(1, t - from.t);
    const travelled = y - this.start.y;
    return speed >= GESTURE.flickSpeed && travelled >= GESTURE.flickMinPx ? ['hardDrop'] : [];
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
