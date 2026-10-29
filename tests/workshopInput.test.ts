// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Battle } from '../src/battle/battle';
import { createRng } from '../src/core/rng';
import { createHero } from '../src/game/hero';
import { bindWorkshopInput, type WorkshopMode } from '../src/ui/workshopInput';
const disposers: (() => void)[] = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  vi.useRealTimers();
  document.body.replaceChildren();
});
function pointer(node: HTMLElement, type: string, x: number, y: number, time: number) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: x,
    clientY: y,
  });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    pointerType: { value: 'touch' },
    timeStamp: { value: time },
  });
  node.dispatchEvent(event);
}
function fixture() {
  const board = document.createElement('div'),
    down = document.createElement('button');
  document.body.append(board, down);
  vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 400,
    right: 200,
    width: 200,
    height: 400,
    toJSON: () => ({}),
  });
  const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, createHero(), createRng(1), {
    boardMagic: true,
  });
  let mode: WorkshopMode = 'play';
  const targetRow = vi.fn(),
    stepTarget = vi.fn(),
    confirm = vi.fn(),
    cancel = vi.fn();
  const input = vi.fn((action: Parameters<Battle['input']>[0]) => battle.input(action));
  const binding = bindWorkshopInput(
    board,
    { softDrop: down },
    {
      mode: () => mode,
      input,
      targetRow,
      stepTarget,
      direction: vi.fn(),
      confirm,
      cancel,
      togglePause: vi.fn(),
      pick: vi.fn(),
      columns: () => 10,
      rows: () => 20,
      activePiece: () => battle.board.active,
    },
  );
  disposers.push(binding.dispose);
  return {
    board,
    down,
    battle,
    input,
    targetRow,
    stepTarget,
    confirm,
    cancel,
    binding,
    setMode: (next: WorkshopMode) => {
      mode = next;
      battle.paused = next !== 'play';
    },
  };
}
describe('workshop uses main-game controls', () => {
  it('Down Arrow soft-drops the actual falling piece immediately and on repeated keys', () => {
    const { battle } = fixture(),
      y = battle.board.active!.y;
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
    );
    expect(battle.board.active!.y).toBe(y + 1);
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        repeat: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(battle.board.active!.y).toBe(y + 2);
  });
  it('retains main-game rotate and hard-drop shortcuts', () => {
    const { battle, input } = fixture();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true }),
    );
    expect(input).toHaveBeenLastCalledWith('rotate');
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
    );
    expect(battle.board.piecesPlaced).toBe(1);
  });
  it('held touch Down repeats soft drop and stops on release without a duplicate trailing click', () => {
    vi.useFakeTimers();
    const { down, battle } = fixture(),
      start = battle.board.active!.y;
    pointer(down, 'pointerdown', 10, 10, 0);
    expect(battle.board.active!.y).toBe(start + 1);
    vi.advanceTimersByTime(225);
    expect(battle.board.active!.y).toBeGreaterThan(start + 1);
    pointer(down, 'pointerup', 10, 10, 240);
    const y = battle.board.active!.y;
    down.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    vi.advanceTimersByTime(300);
    expect(battle.board.active!.y).toBe(y);
  });
  it('touch taps rotate in Play, while the same touch selects a row only in Aim', () => {
    const { board, input, targetRow, setMode } = fixture();
    pointer(board, 'pointerdown', 50, 100, 0);
    pointer(board, 'pointerup', 50, 100, 60);
    expect(input).toHaveBeenLastCalledWith('rotate');
    input.mockClear();
    setMode('aim');
    pointer(board, 'pointerdown', 60, 310, 100);
    pointer(board, 'pointerup', 60, 310, 160);
    expect(targetRow).toHaveBeenLastCalledWith(15);
    expect(input).not.toHaveBeenCalled();
  });
  it('supports sideways touch drags and downward hard-drop flicks in Play', () => {
    const { board, input, battle } = fixture();
    pointer(board, 'pointerdown', 50, 100, 0);
    pointer(board, 'pointermove', 100, 100, 100);
    pointer(board, 'pointerup', 100, 100, 140);
    expect(input).toHaveBeenCalledWith('right');
    pointer(board, 'pointerdown', 100, 100, 200);
    pointer(board, 'pointermove', 100, 180, 240);
    pointer(board, 'pointerup', 100, 190, 250);
    expect(battle.board.piecesPlaced).toBe(1);
  });
  it('aim keys move the target, Enter confirms once, and Escape cancels without moving a piece', () => {
    const { setMode, input, stepTarget, confirm, cancel } = fixture();
    setMode('aim');
    for (const key of ['ArrowDown', 'Enter', 'Escape'])
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
    expect(stepTarget).toHaveBeenCalledWith(1);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(input).not.toHaveBeenCalled();
  });
  it('Pause blocks piece buttons and board gestures without disabling them on resume', () => {
    const { setMode, board, down, input } = fixture();
    setMode('paused');
    pointer(down, 'pointerdown', 10, 10, 0);
    pointer(down, 'pointerup', 10, 10, 40);
    pointer(board, 'pointerdown', 50, 50, 100);
    pointer(board, 'pointerup', 50, 50, 150);
    expect(input).not.toHaveBeenCalled();
    setMode('play');
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
    );
    expect(input).toHaveBeenCalledWith('softDrop');
  });
});
it('disposed controls cannot move a piece through leftover pointer listeners', () => {
  const { binding, down, input } = fixture();
  binding.dispose();
  pointer(down, 'pointerdown', 5, 5, 0);
  pointer(down, 'pointerup', 5, 5, 60);
  expect(input).not.toHaveBeenCalled();
});
