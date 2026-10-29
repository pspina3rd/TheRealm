/**
 * Toasts raised while an interlude covers the map (an item received as a
 * scene ends, with a vision still to come): held, then shown one at a time,
 * in order, once nothing covers the map and no other toast is showing.
 */
export class HeldToasts<T> {
  private readonly queue: T[] = [];

  /** Holds a toast until it can be seen. */
  hold(toast: T): void {
    this.queue.push(toast);
  }

  /** The next toast to show, if the map is clear (`clear`); none otherwise. */
  next(clear: boolean): T | undefined {
    return clear ? this.queue.shift() : undefined;
  }
}
