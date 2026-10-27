// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/ui/app';
import { battleKey } from '../src/ui/battleKeys';
import { HeroPanel } from '../src/ui/heroPanel';
import type { Atlas } from '../src/ui/art/atlas';
import type { ChallengeSpec } from '../src/data/types';
import type { Battle } from '../src/battle/battle';
import { addItem } from '../src/game/hero';
import { makeBattle } from './helpers';

const html = readFileSync('index.html', 'utf8');
const atlas = { draw: () => {} } as unknown as Atlas;
let removeBindings = (): void => {};

beforeEach(() => {
  document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
  document.querySelector<HTMLElement>('#battle-view')!.hidden = false;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  removeBindings();
  removeBindings = () => {};
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Use the production input binding without starting the canvas/render loop. */
function bindBattleInput(battle: Battle): void {
  const app = Object.create(App.prototype) as {
    active: { battle: Battle; finished: boolean };
    dialog: { isOpen: boolean };
    battleView: { hero: { back: () => boolean } };
    bindInput: () => void;
  };
  app.active = { battle, finished: false };
  app.dialog = { isOpen: false };
  app.battleView = { hero: { back: () => false } };
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
    },
  );
  // Binding also installs world handlers. Remove all document/window listeners
  // afterwards so each case has just one production keyboard handler.
  const addDocument = document.addEventListener.bind(document);
  const addWindow = window.addEventListener.bind(window);
  const listeners: (() => void)[] = [];
  vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
    addDocument(type, listener, options);
    listeners.push(() => document.removeEventListener(type, listener, options));
  });
  vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
    addWindow(type, listener, options);
    listeners.push(() => window.removeEventListener(type, listener, options));
  });
  app.bindInput();
  removeBindings = () => listeners.forEach((remove) => remove());
}

describe('battle controls in the DOM', () => {
  const challenges: ChallengeSpec[] = [
    { kind: 'combat', enemyId: 'slime' },
    { kind: 'offering', itemId: 'herb', targetScore: 100, pieceLimit: 20 },
    { kind: 'barter', wants: { red: 5 }, pieceLimit: 20 },
    { kind: 'haggle', pieceLimit: 20, rivalIntervalMs: 1000 },
    { kind: 'puzzle', rows: [], queue: ['I'], linesToClear: 1 },
    {
      kind: 'lesson',
      mentorId: 'kestrel',
      spellId: 'gust',
      enemyId: 'galeWisp',
      difficulty: 1,
    },
  ];

  it.each(challenges)('keeps touch pause available during $kind', (spec) => {
    const battle = makeBattle(spec);
    const panel = new HeroPanel(atlas);
    panel.render(battle, new Set());
    bindBattleInput(battle);
    const pause = document.querySelector<HTMLButtonElement>('#pause-button')!;
    expect(pause.closest('[hidden]')).toBeNull();
    pause.click();
    expect(battle.paused).toBe(true);
    pause.click();
    expect(battle.paused).toBe(false);
  });

  it.each(['spell', 'item'])('preserves focused %s through HP and mana updates', (kind) => {
    const battle = makeBattle(challenges[0]!);
    addItem(battle.hero, 'herb', 2);
    const panel = new HeroPanel(atlas);
    panel.render(battle, new Set());
    const selector = kind === 'spell' ? '#spell-list [data-action]' : '[data-action="herb"]';
    const control = document.querySelector<HTMLButtonElement>(selector)!;
    const action = control.dataset.action;
    control.focus();
    battle.hero.hp--;
    battle.hero.mana.fire++;
    panel.render(battle, new Set());
    expect((document.activeElement as HTMLElement).dataset.action).toBe(action);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('does not steal focus from pause when controls update', () => {
    const battle = makeBattle(challenges[0]!);
    const panel = new HeroPanel(atlas);
    panel.render(battle, new Set());
    const pause = document.querySelector<HTMLButtonElement>('#pause-button')!;
    pause.focus();
    battle.hero.hp--;
    panel.render(battle, new Set());
    expect(document.activeElement).toBe(pause);
  });
});

describe('battle keys', () => {
  it('pauses on a fresh P press only, so holding P spends one pause', () => {
    expect(battleKey('p', false)).toEqual({ kind: 'pause' });
    expect(battleKey('P', false)).toEqual({ kind: 'pause' });
    expect(battleKey('p', true)).toBeNull();
  });

  it('repeats piece moves, picks spells by digit and backs out with Escape', () => {
    expect(battleKey('ArrowLeft', true)).toEqual({ kind: 'input', action: 'left' });
    expect(battleKey('X', false)).toEqual({ kind: 'input', action: 'rotate' });
    expect(battleKey(' ', false)).toEqual({ kind: 'input', action: 'hardDrop' });
    expect(battleKey('3', false)).toEqual({ kind: 'pick', slot: 3 });
    expect(battleKey('0', false)).toBeNull();
    expect(battleKey('Escape', false)).toEqual({ kind: 'back' });
    expect(battleKey('m', false)).toBeNull();
  });
});
