import { required } from '../core/required';
/** Development-only playable review fixture. Its save namespace never touches the adventure. */
import { Battle } from '../battle/battle';
import { BOARD_SPELLS, GRAVITY_NAMES } from '../battle/magicCasting';
import { createRng } from '../core/rng';
import type { BoardElement } from '../core/boardMagic';
import { newKnownSpell } from '../game/spells';
import { ARCANE_ELEMENTS, arcaneRank } from '../game/arcane';
import { newGame } from '../world/state';
import { loadGame, saveGame, type KeyValueStore } from '../game/save';
import { magicGrid, openMagicTargeting } from './magicTargeting';
import { openArcaneEditor } from './arcaneEditor';
import { button, el } from './dom';
import './workshop.css';
if (!import.meta.env.DEV) throw new Error('The workshop is a development review fixture.');
const store: KeyValueStore = {
  getItem: (key) => localStorage.getItem(`magic-workshop:${key}`),
  setItem: (key, value) => localStorage.setItem(`magic-workshop:${key}`, value),
  removeItem: (key) => localStorage.removeItem(`magic-workshop:${key}`),
};
const root = required(document.getElementById('workshop'));
const saved = loadGame(store),
  state = saved ?? newGame();
if (!saved) {
  state.flags = new Set(['wyrmBeaten', 'scene:chapterEnd', 'boardMagicEnabled']);
  state.hero.skillPoints = 100;
  for (const id of [...Object.keys(BOARD_SPELLS), 'shadow'])
    state.hero.spells[id] = { ...newKnownSpell(), level: 4 };
}
const save = (): void => {
  saveGame(store, state);
};
let battle: Battle;
let enemySequence = 0;
let allyClock = 0;
let running = true;
let lastBoard = '';
const boardPanel = el('section', { className: 'workshop-board' }),
  message = el('p'),
  status = el('p'),
  controls = el('section', { className: 'workshop-controls' }),
  next = el('p');
message.setAttribute('role', 'status');
const reset = (): void => {
  battle = new Battle({ kind: 'combat', enemyId: 'slime' }, state.hero, createRng(42), {
    boardMagic: true,
    storyFlags: state.flags,
  });
  state.hero.maxHp = 10000;
  state.hero.hp = 10000;
  state.hero.manaCap = 100;
  for (const e of Object.keys(state.hero.mana))
    state.hero.mana[e as keyof typeof state.hero.mana] = 100;
  required(battle.combat).enemyHp = 10000;
  enemySequence = 0;
  allyClock = 0;
  running = true;
  battle.board.loadRows([
    '..........',
    '..r.......',
    '..b.#.....',
    'r..##...g.',
    'rg..#..b..',
    'rr.#..gg..',
  ]);
  for (const [x, y, strength] of [
    [4, 16, 3],
    [3, 17, 2],
    [4, 17, 1],
    [4, 18, 3],
    [3, 19, 2],
  ]) {
    battle.board.obstructions[`${x},${y}`] = {
      id: `initial:${x}:${y}`,
      owner: 'slime',
      strength: required(strength),
      anchored: true,
      sequence:
        x === 4
          ? [
              { color: 'green', sides: ['left', 'right', 'top', 'bottom'] },
              { color: 'red', sides: ['left', 'right', 'top', 'bottom'] },
            ]
          : [],
      step: 0,
      contacts: [],
    };
  }
  message.textContent =
    'Practice supplies: full mana, developed base spells and 100 initial skill points. This is separate from your adventure.';
  render();
};
const spell = el('select');
spell.setAttribute('aria-label', 'Spell');
for (const id of Object.keys(BOARD_SPELLS)) {
  const option = el('option', {
    text:
      id === 'quake'
        ? 'Gravity / Mudslide / Earthquake / Avalanche'
        : id === 'natureConvert'
          ? 'Nature conversion'
          : id,
  });
  option.value = id;
  spell.append(option);
}
const rank = el('select');
rank.setAttribute('aria-label', 'Practice spell rank');
for (let n = 1; n <= 4; n++) {
  const option = el('option', { text: `Rank ${n}` });
  option.value = String(n);
  rank.append(option);
}
rank.value = '4';
const arcane = el('select');
arcane.setAttribute('aria-label', 'Arcane pairing');
for (const e of ARCANE_ELEMENTS) {
  const option = el('option', { text: e === 'earth' ? 'Gravity' : e === 'water' ? 'Ice' : e });
  option.value = e;
  arcane.append(option);
}
const aim = (id: string): void => {
  openMagicTargeting(
    battle,
    id,
    () => true,
    () => {
      save();
      render();
    },
  );
};
const act = (action: Parameters<Battle['input']>[0]): void => {
  if (!battle.paused && running) {
    battle.input(action);
    render();
  }
};
controls.append(
  el('label', { text: 'Elemental spell' }, spell),
  el('label', { text: 'Practice rank' }, rank),
  button('Preview elemental spell', () => {
    const known = state.hero.spells[spell.value];
    if (known) known.level = Number(rank.value);
    aim(spell.value);
  }),
  el('label', { text: 'Arcane pairing' }, arcane),
  button('Preview Arcane spell', () => aim(`arcane:${arcane.value}`)),
  button('Arcane upgrades', () => {
    const paused = battle.paused;
    battle.paused = true;
    openArcaneEditor(state.hero, state.flags, save, () => {
      battle.paused = paused;
      render();
    });
  }),
  el(
    'div',
    { className: 'workshop-actions' },
    button('←', () => act('left')),
    button('Rotate', () => act('rotate')),
    button('→', () => act('right')),
    button('Drop', () => act('hardDrop')),
  ),
  button('Pause / Resume', () => {
    running = !running;
    render();
  }),
  button('Reset board and supplies', reset),
  button('Refill practice mana', () => {
    for (const e of Object.keys(state.hero.mana))
      state.hero.mana[e as keyof typeof state.hero.mana] = 100;
    render();
  }),
);
root.append(
  el('h1', { text: 'Magic Workshop' }),
  el('p', {
    text: 'Test obstruction strength, colored edges, spell previews and character interference. Arrow keys move; Up rotates; Space drops. Colored edges show the next required contact. Blank squares earn no mana.',
  }),
  message,
  el('div', { className: 'workshop-layout' }, boardPanel, el('aside', {}, controls, status, next)),
);
function incoming(): {
  x: number;
  y: number;
  strength: number;
}[] {
  return [
    {
      x: 1 + ((enemySequence * 3) % 8),
      y: 12 + (enemySequence % 3),
      strength: 1 + (enemySequence % 3),
    },
  ];
}
function render(): void {
  if (!battle) return;
  const shown = battle.board.magicState();
  const active = battle.board.active;
  if (active)
    for (const [dx, dy] of active.cells) {
      const x = active.x + dx,
        y = active.y + dy;
      if (y >= 0 && y < battle.board.height && x >= 0 && x < battle.board.width)
        required(shown.grid[y])[x] = active.color;
    }
  const key = JSON.stringify(shown);
  if (key !== lastBoard) {
    boardPanel.replaceChildren(magicGrid(shown));
    lastBoard = key;
  }
  const effect = battle.interference.effect('slime');
  status.textContent = `${running ? 'Running' : 'Paused'} · Player pieces ${battle.board.piecesPlaced} · Opponent placements ${battle.interference.placements.slime ?? 0} · Gravity ${effect.gravity} · Red contact ${effect.red} · Wind ${effect.wind} · Nature ${effect.nature} · Delay ${(effect.delayMs / 1000).toFixed(1)}s · Pair rank ${arcaneRank(state.hero, arcane.value as BoardElement)} · Mana ${Object.entries(
    state.hero.mana,
  )
    .map(([e, n]) => `${e} ${n}`)
    .join(', ')}`;
  const cell = required(incoming()[0]);
  next.textContent = `Next obstruction: column ${cell.x + 1}, row ${cell.y + 1} from top; strength ${cell.strength}. Enemy action in ${Math.max(0, (required(battle.combat).actMs - required(battle.combat).gauge) / 1000).toFixed(1)}s. Ally supplies a blank block every 12s. ${spell.value === 'quake' ? GRAVITY_NAMES[Number(rank.value) - 1] : ''}`;
}
reset();
document.addEventListener('keydown', (event) => {
  if (document.querySelector('dialog[open]')) return;
  const action = (
    {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'rotate',
      ArrowDown: 'softDrop',
      ' ': 'hardDrop',
    } as const
  )[event.key as 'ArrowLeft'];
  if (action) {
    event.preventDefault();
    act(action);
  }
});
let previous = performance.now();
function frame(now: number): void {
  const dt = Math.min(100, Math.max(0, now - previous));
  previous = now;
  if (running && !battle.paused && battle.status === 'ongoing') {
    const before = battle.interference.placements.slime ?? 0;
    required(battle.combat).nextMove = {
      kind: 'obstruct',
      name: 'Set an obstruction',
      cells: incoming(),
    };
    battle.update(dt);
    if ((battle.interference.placements.slime ?? 0) > before) enemySequence++;
    allyClock += dt;
    if (allyClock >= 12000) {
      allyClock -= 12000;
      const y = battle.board.height - 1,
        x = required(battle.board.grid[y]).findIndex((c) => c === null);
      if (x >= 0) {
        battle.interference.cast('ally', 'nature', 1, y, 1, 12000);
        battle.placeObstructions('ally', [{ x, y, strength: 1 }]);
      }
    }
    render();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
