/** Same movement keys and gestures as the main game, with an explicit spell-aim mode. */
import type { BattleAction } from '../battle/battle';
import { battleKey } from './battleKeys';
import { bindBoardGestures, bindPress } from './touch';
export type WorkshopMode = 'play' | 'aim' | 'paused';
export interface WorkshopInputHost {
  mode(): WorkshopMode;
  input(action: BattleAction): void;
  targetRow(row: number): void;
  stepTarget(dy: number): void;
  direction(dx: -1 | 1): void;
  confirm(): void;
  cancel(): void;
  togglePause(): void;
  pick(slot: number): void;
  columns(): number;
  rows(): number;
  activePiece(): unknown;
}
export function bindWorkshopInput(
  board: HTMLElement,
  controls: Readonly<Partial<Record<BattleAction, HTMLElement>>>,
  host: WorkshopInputHost,
): { tick(time: number): void; lockout(): void; dispose(): void } {
  let disposed = false;
  const apply = (action: BattleAction): void => {
    if (!disposed && host.mode() === 'play') host.input(action);
  };
  const gestures = bindBoardGestures(
    board,
    () => host.columns(),
    apply,
    () => !disposed && host.mode() === 'play',
  );
  for (const [action, node] of Object.entries(controls))
    if (node)
      bindPress(
        node,
        () => apply(action as BattleAction),
        ['left', 'right', 'softDrop'].includes(action),
      );
  let aimPointer: number | null = null;
  const target = (event: PointerEvent): void => {
    const box = board.getBoundingClientRect();
    if (box.height <= 0) return;
    host.targetRow(
      Math.max(
        0,
        Math.min(
          host.rows() - 1,
          Math.floor(((event.clientY - box.top) / box.height) * host.rows()),
        ),
      ),
    );
  };
  const down = (event: PointerEvent): void => {
    if (disposed || host.mode() !== 'aim' || (event.pointerType === 'mouse' && event.button !== 0))
      return;
    event.preventDefault();
    aimPointer = event.pointerId;
    try {
      board.setPointerCapture(event.pointerId);
    } catch {
      /* The pointer may have already ended. */
    }
    target(event);
  };
  const move = (event: PointerEvent): void => {
    if (!disposed && host.mode() === 'aim' && aimPointer === event.pointerId) {
      event.preventDefault();
      target(event);
    }
  };
  const up = (event: PointerEvent): void => {
    if (aimPointer === event.pointerId) aimPointer = null;
  };
  board.addEventListener('pointerdown', down);
  board.addEventListener('pointermove', move);
  board.addEventListener('pointerup', up);
  board.addEventListener('pointercancel', up);
  const keydown = (event: KeyboardEvent): void => {
    if (
      document.querySelector('dialog[open]') ||
      event.target instanceof HTMLSelectElement ||
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target instanceof HTMLElement && event.target.isContentEditable)
    )
      return;
    const command = battleKey(event.key, event.repeat);
    if (command?.kind === 'pause') {
      event.preventDefault();
      gestures.lockout();
      host.togglePause();
      return;
    }
    if (host.mode() === 'aim') {
      if (event.key === 'Escape') {
        event.preventDefault();
        gestures.lockout();
        host.cancel();
      } else if (event.key === 'Enter' && !event.repeat) {
        event.preventDefault();
        gestures.lockout();
        host.confirm();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        host.stepTarget(event.key === 'ArrowUp' ? -1 : 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        host.direction(event.key === 'ArrowLeft' ? -1 : 1);
      } else if (command?.kind === 'pick' && !event.repeat) {
        event.preventDefault();
        host.pick(command.slot);
      }
      return;
    }
    if (host.mode() !== 'play') return;
    if (command?.kind === 'input') {
      event.preventDefault();
      apply(command.action);
    } else if (command?.kind === 'pick' && !event.repeat) {
      event.preventDefault();
      gestures.lockout();
      host.pick(command.slot);
    }
  };
  document.addEventListener('keydown', keydown);
  let piece = host.activePiece(),
    lastMode = host.mode();
  return {
    tick(time) {
      if (disposed) return;
      const next = host.activePiece(),
        mode = host.mode();
      if (next !== piece || mode !== lastMode) {
        gestures.lockout();
        piece = next;
        lastMode = mode;
      }
      gestures.tick(time);
    },
    lockout() {
      gestures.lockout();
      aimPointer = null;
    },
    dispose() {
      disposed = true;
      gestures.lockout();
      document.removeEventListener('keydown', keydown);
      board.removeEventListener('pointerdown', down);
      board.removeEventListener('pointermove', move);
      board.removeEventListener('pointerup', up);
      board.removeEventListener('pointercancel', up);
    },
  };
}
