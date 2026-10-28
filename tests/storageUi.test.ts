// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../src/game/storage';
import { CORRUPT_KEY, SAVE_KEY, saveGame, type KeyValueStore } from '../src/game/save';
import { newGame, type GameState } from '../src/world/state';
import { MAPS } from '../src/data/maps';
import { CAMPAIGN_FLAGS as C } from '../src/data/campaignFlags';
import type { Battle } from '../src/battle/battle';
import type { EntityDef } from '../src/world/map';
import { setUpVerticalIClear } from './helpers';
import { App } from '../src/ui/app';
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
    return { ...context, canvas: this };
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

function start(store: KeyValueStore): void {
  saveGame(store, newGame());
  new App(atlas, store).start();
}

function manualSave(): void {
  document.querySelector<HTMLButtonElement>('#menu-button')!.click();
  const save = [...document.querySelectorAll<HTMLButtonElement>('#dialog-actions button')].find(
    (button) => button.textContent === 'Save',
  );
  expect(save).toBeDefined();
  save!.click();
}

describe('save durability messaging', () => {
  it('discloses volatile sessions at startup and on manual save', () => {
    const store = createStore(() => {
      throw new Error('Storage blocked');
    });
    start(store);
    const notice = document.querySelector('.session-notice');
    expect(notice?.getAttribute('role')).toBe('status');
    expect(notice?.textContent).toContain(
      'reloading or closing this page will lose your adventure',
    );
    manualSave();
    expect(document.querySelector('#world-banner')?.textContent).toContain(
      'Session only: progress will be lost on reload',
    );
    expect(document.querySelector('.session-notice')).toBe(notice);
  });

  it('resumes a readable adventure when quota prevents startup writes', () => {
    const durable = persistentStore();
    const state = newGame('mage');
    state.hero.gil = 321;
    state.flags.add('scene:opening');
    saveGame(durable, state);
    const selected = createStore(() => ({
      ...durable,
      setItem: () => {
        throw new Error('Quota exceeded');
      },
    }));
    new App(atlas, selected).start();
    expect(document.querySelector('#hud-name')?.textContent).toBe(state.hero.name);
    expect(document.querySelector('#hud-gil')?.textContent).toBe('321');
    expect(document.querySelector('#dialog')?.hasAttribute('open')).toBe(false);
    expect(document.querySelector('.session-notice')?.textContent).toContain(
      'reloading or closing this page will lose your adventure',
    );
    manualSave();
    expect(document.querySelector('#world-banner')?.textContent).toContain('Session only');
  });

  it('confirms a durable save without displaying a temporary-session warning', () => {
    start(persistentStore());
    expect(document.querySelector('.session-notice')).toBeNull();
    manualSave();
    expect(document.querySelector('#world-banner')?.textContent).toBe('Saved');
  });

  it('reports a write failure after persistence was initially available', () => {
    const store = persistentStore();
    start(store);
    vi.spyOn(store, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    manualSave();
    expect(document.querySelector('#world-banner')?.textContent).toBe('Saving is unavailable');
  });

  it('tells the player an unreadable save was backed up, and keeps the backup', () => {
    const store = persistentStore();
    store.setItem(SAVE_KEY, '{"version":8');
    new App(atlas, store).start();
    expect(document.querySelector('.session-notice')?.textContent).toContain('kept as a backup');
    expect(store.getItem(CORRUPT_KEY)).toBe('{"version":8');
    manualSave();
    expect(document.querySelector('#world-banner')?.textContent).toBe('Saved');
    expect(store.getItem(CORRUPT_KEY)).toBe('{"version":8');
  });
});

/** The real App controller, with rendering/timing mocked, not combat attainability. */
interface EndingApp {
  readonly state: GameState;
  readonly active: { readonly battle: Battle } | null;
  talk(entity: EntityDef): void;
  finishBattle(): void;
  walk(direction: 'down'): void;
}

function endingFixture(store: KeyValueStore): EndingApp {
  const state = newGame('ranger');
  state.mapId = 'innerWard';
  state.x = 16;
  state.y = 11;
  for (const flag of ['scene:opening', 'scene:refusal', C.rite, C.wardReady]) state.flags.add(flag);
  saveGame(store, state);
  const app = new App(atlas, store);
  app.start();
  const fixture = app as unknown as EndingApp;
  dismissEndingDialogs(fixture);
  const entity = MAPS.innerWard!.entities.find((e) => e.id === 'campaign-malificat')!;
  fixture.talk(entity);
  const battle = fixture.active!.battle;
  // Prepared legal clears with no elapsed enemy time isolate the result/scene UI.
  for (let clears = 0; clears < 100 && battle.status === 'ongoing'; clears++) {
    setUpVerticalIClear(battle.board, 4);
    battle.input('hardDrop');
  }
  expect(battle.status).toBe('won');
  fixture.finishBattle();
  expect(document.querySelector('#dialog-title')?.textContent).toBe('Victory!');
  return fixture;
}

function dismissEndingDialogs(app: EndingApp): string[] {
  const titles: string[] = [];
  for (
    let page = 0;
    page < 100 && document.querySelector<HTMLDialogElement>('#dialog')!.open;
    page++
  ) {
    vi.advanceTimersByTime(1000);
    const title = document.querySelector('#dialog-title')!.textContent!;
    titles.push(title);
    if (title === 'Campaign complete') {
      expect(app.state.flags.has('scene:campaignRecovery')).toBe(true);
      expect(app.state.mapId).toBe('overworld');
    }
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('#dialog-actions button')];
    const action =
      buttons.find((b) => b.textContent === 'Later') ??
      buttons.find((b) => b.textContent === 'Continue');
    expect(action, title).toBeDefined();
    action!.click();
  }
  expect(document.querySelector<HTMLDialogElement>('#dialog')!.open).toBe(false);
  return titles;
}

describe('campaign ending UI integration', () => {
  it('shows recovery before the final summary and locks the sealed ward afterward', () => {
    vi.useFakeTimers({ toFake: ['Date', 'performance'] });
    const store = persistentStore();
    const app = endingFixture(store);
    const titles = dismissEndingDialogs(app);
    expect(titles.filter((title) => title === 'Campaign complete')).toHaveLength(1);
    expect(titles).not.toContain('Chapter One complete');
    expect(app.state.flags.has(C.complete)).toBe(true);
    expect(app.state.flags.has('scene:campaignSummary')).toBe(true);
    app.walk('down');
    expect(app.state.mapId).toBe('overworld');
    expect(document.querySelector('#world-banner')?.textContent).toContain('sealed');
  });

  it('resumes a save made at the victory result through recovery without repeating the summary', () => {
    vi.useFakeTimers({ toFake: ['Date', 'performance'] });
    const store = persistentStore();
    endingFixture(store);
    // Reload before dismissing Victory: the saved completion must resume its scenes.
    removeListeners.forEach((remove) => remove());
    removeListeners = [];
    mountDocument();
    const reloaded = new App(atlas, store);
    reloaded.start();
    const app = reloaded as unknown as EndingApp;
    const titles = dismissEndingDialogs(app);
    expect(titles.filter((title) => title === 'Campaign complete')).toHaveLength(1);
    expect(app.state.mapId).toBe('overworld');
    removeListeners.forEach((remove) => remove());
    removeListeners = [];
    mountDocument();
    new App(atlas, store).start();
    expect(document.querySelector<HTMLDialogElement>('#dialog')!.open).toBe(false);
  });
});
