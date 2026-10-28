// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SAVE_KEY, saveGame, loadSave, type KeyValueStore } from '../src/game/save';
import { newGame, type GameState } from '../src/world/state';
import { MAPS } from '../src/data/maps';
import type { Battle } from '../src/battle/battle';
import type { EntityDef } from '../src/world/map';
import { App } from '../src/ui/app';
import { type describeInteraction, lessonInteraction } from '../src/game/encounter';
import { newRecord, recordOf } from '../src/game/stakes';
import { lessonsFor } from '../src/game/lessons';
import { MENTORS } from '../src/data/mentors';
import { Battle as BattleRunner } from '../src/battle/battle';
import { createRng } from '../src/core/rng';
import { DarkRule } from '../src/battle/rules';
import { BattleView } from '../src/ui/battleView';
import type { Atlas } from '../src/ui/art/atlas';

const html = readFileSync(resolve('index.html'), 'utf8');
const atlas = { draw: () => {} } as unknown as Atlas;
let removeListeners: (() => void)[] = [];

function mountDocument(): void {
  document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
  const dialog = document.querySelector<HTMLDialogElement>('#dialog')!;
  dialog.showModal = () => {
    dialog.open = true;
  };
  dialog.close = () => {
    dialog.open = false;
    dialog.dispatchEvent(new Event('close'));
  };
}

beforeEach(() => {
  mountDocument();
  const context = {
    save: () => {},
    restore: () => {},
    drawImage: () => {},
    fillRect: () => {},
    clearRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    fill: () => {},
    stroke: () => {},
    imageSmoothingEnabled: false,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    return new Proxy(
      { ...context, canvas: this },
      { get: (target, key) => Reflect.get(target, key) ?? (() => {}) },
    ) as CanvasRenderingContext2D;
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
    },
  );
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {} }));
  // Keep production constructor and menu wiring, but release their global
  // listeners between tests. Rendering and browser layout are outside this test.
  const addDocument = document.addEventListener.bind(document);
  const addWindow = window.addEventListener.bind(window);
  vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
    addDocument(type, listener, options);
    removeListeners.push(() => document.removeEventListener(type, listener, options));
  });
  vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
    addWindow(type, listener, options);
    removeListeners.push(() => window.removeEventListener(type, listener, options));
  });
});

afterEach(() => {
  removeListeners.forEach((remove) => remove());
  removeListeners = [];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function persistentStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

interface Harness {
  state: GameState;
  active: { battle: Battle; entity: EntityDef; finished: boolean; resultDelay: number } | null;
  talk(entity: EntityDef): void;
  showInteraction(entity: EntityDef, interaction: ReturnType<typeof describeInteraction>): void;
  battleInput(action: 'left' | 'right' | 'hardDrop'): void;
  finishBattle(): void;
  leaveBattle(): void;
}
function setup(): { app: Harness; store: KeyValueStore } {
  const store = persistentStore();
  const state = newGame();
  state.flags.add('scene:opening');
  saveGame(store, state);
  const app = new App(atlas, store) as unknown as Harness;
  return { app, store };
}
function entity(id: string): EntityDef {
  return Object.values(MAPS)
    .flatMap((map) => map.entities)
    .find((entity) => entity.kind === 'npc' && entity.npcId === id)!;
}
function click(label: string): HTMLButtonElement {
  const node = [...document.querySelectorAll<HTMLButtonElement>('#dialog-actions button')].find(
    (node) => node.textContent === label,
  );
  expect(node, `Action ${label}`).toBeDefined();
  node!.click();
  return node!;
}
function finishDemo(battle: Battle): void {
  for (let i = 0; battle.demoPlaying && i < 1000; i++) battle.update(100);
  expect(battle.demoPlaying).toBe(false);
}

describe('M1 player UI loop', () => {
  it('shows Win / Ask / Fail / Retry, leaves a demo free, and saves the first real input once', () => {
    const { app, store } = setup();
    const rowan = entity('elder');
    app.talk(rowan);
    expect([...document.querySelectorAll('.stakes-row b')].map((node) => node.textContent)).toEqual(
      ['Win', 'Ask', 'Fail', 'Retry'],
    );
    click('Take it on');
    expect(app.active!.battle.demo).not.toBeNull();
    app.battleInput('left');
    expect(recordOf(app.state, 'elder').tries).toBe(0);
    app.leaveBattle();
    expect(app.active).toBeNull();
    expect(recordOf(app.state, 'elder').fails).toBe(0);
    app.talk(rowan);
    click('Take it on');
    finishDemo(app.active!.battle);
    expect(recordOf(app.state, 'elder').tries).toBe(0);
    const writes = vi.spyOn(store, 'setItem');
    app.battleInput('left');
    expect(recordOf(app.state, 'elder').tries).toBe(1);
    expect(loadSave(store).state?.encounters.elder?.tries).toBe(1);
    const saves = writes.mock.calls.filter(([key]) => key === SAVE_KEY).length;
    app.battleInput('right');
    expect(recordOf(app.state, 'elder').tries).toBe(1);
    expect(writes.mock.calls.filter(([key]) => key === SAVE_KEY)).toHaveLength(saves);
    app.leaveBattle();
    expect(recordOf(app.state, 'elder').fails).toBe(1);
    app.finishBattle();
    expect(recordOf(app.state, 'elder').fails).toBe(1);
  });

  it('keeps Ordor’s incoming-row demonstration open on early input, then commits after it', () => {
    const { app, store } = setup();
    app.talk(entity('stallKeeper'));
    click('Take it on');
    const battle = app.active!.battle;
    expect(battle.demoPlaying).toBe(true);
    expect(battle.demo).toBeNull();
    app.battleInput('left');
    expect(app.active?.battle).toBe(battle);
    expect(recordOf(app.state, 'stallKeeper').tries).toBe(0);
    battle.update(900);
    expect(battle.demoPlaying).toBe(false);
    expect(battle.objective.rival?.pending).toBeGreaterThan(0);
    app.battleInput('left');
    expect(app.active?.battle).toBe(battle);
    expect(recordOf(app.state, 'stallKeeper').tries).toBe(1);
    expect(loadSave(store).state?.encounters.stallKeeper?.tries).toBe(1);
  });

  it('rechecks a blocked commitment and opens the updated card', () => {
    const { app } = setup();
    app.talk(entity('guard'));
    click('Take it on');
    app.state.encounters.guard = { ...newRecord(), waitPast: app.state.victories };
    app.battleInput('left');
    expect(app.active).toBeNull();
    expect(document.querySelector('.stakes-blocked')?.textContent).toBeTruthy();
    expect(
      [...document.querySelectorAll<HTMLButtonElement>('#dialog-actions button')].find(
        (node) => node.textContent === 'Take it on',
      )?.disabled,
    ).toBe(true);
    expect(recordOf(app.state, 'guard').tries).toBe(0);
  });

  it('offers Browse without committing a haggle and explicit help or solo after Vale fails', () => {
    const { app } = setup();
    app.talk(entity('stallKeeper'));
    click('Browse');
    expect(app.active).toBeNull();
    expect(recordOf(app.state, 'stallKeeper').tries).toBe(0);
    app.state.encounters.guard = { ...newRecord(), fails: 2 };
    app.talk(entity('guard'));
    const labels = [...document.querySelectorAll('#dialog-actions button')].map(
      (node) => node.textContent,
    );
    expect(labels).toContain('Try solo');
    expect(labels.some((label) => label?.includes('Maren'))).toBe(true);
    click('Try solo');
    expect(app.active!.battle.spec).toMatchObject({ kind: 'encounter', assisted: false });
  });

  it('lesson Retry returns to a refreshed stakes card when Now once becomes Wait', () => {
    const { app } = setup();
    const mentor: EntityDef = { id: 'test-hazel', kind: 'mentor', mentorId: 'hazel', x: 1, y: 1 };
    const lesson = lessonsFor(app.state, MENTORS.hazel!)[0]!;
    const open = (): void =>
      app.showInteraction(mentor, lessonInteraction(app.state, 'hazel', lesson));
    open();
    click('Take it on');
    app.battleInput('left');
    app.leaveBattle();
    click('Retry');
    expect(document.querySelector('.stakes-card')).not.toBeNull();
    click('Take it on');
    app.battleInput('left');
    app.leaveBattle();
    click('Retry');
    expect(document.querySelector('.stakes-blocked')?.textContent).toBeTruthy();
    expect(
      [...document.querySelectorAll<HTMLButtonElement>('#dialog-actions button')].find(
        (node) => node.textContent === 'Take it on',
      )?.disabled,
    ).toBe(true);
  });

  it('renders the isolated dark fixture with a visible skyline and ghost', () => {
    const { app } = setup();
    const battle = new BattleRunner(
      { kind: 'combat', enemyId: 'slime' },
      app.state.hero,
      createRng(23),
      { rule: 'dark' },
    );
    expect(battle.rule).toBeInstanceOf(DarkRule);
    battle.board.grid[19]!.fill('blue');
    battle.board.grid[19]![4] = null;
    const view = new BattleView(atlas);
    view.start(null, 'char.026');
    expect(() => view.render(battle, app.state.flags, 16, 0, false)).not.toThrow();
    expect(document.querySelector('.battle-board')?.getAttribute('data-skin')).toBe('dark');
    expect(document.querySelector('.board-objective')?.textContent).toBeTruthy();
  });
});
