import {
  learnSpell,
  gainXp,
  spendSkillPoints,
  raiseSpellLevel,
  refreshStats,
  createHero,
} from '../game/hero';
import { isReady } from '../game/spells';
import { SPELLS } from '../data/spells';
import { WEAVE_NAMES, WEAVE_SPELLS } from '../game/weaving';
import { openWeavingEditor } from './weavingEditor';
import { openWeavingTargeting } from './weavingTargeting';
import { openArcaneEditor } from './arcaneEditor';
/** Live review battle using the same piece input as the adventure. */
import { required } from '../core/required';
import { Battle, type BattleAction } from '../battle/battle';
import { BOARD_SPELLS, type CastPreview } from '../battle/magicCasting';
import { spanFor } from '../core/boardMagic';
import { createRng } from '../core/rng';
import { newKnownSpell } from '../game/spells';
import { ARCANE_ELEMENTS, createArcane, arcaneUnlocked } from '../game/arcane';
import { PRACTICES, PRACTICE_SPELLS, practiceProgress, setupPractice } from '../game/magicPractice';
import { newGame } from '../world/state';
import { loadGame, saveGame, type KeyValueStore } from '../game/save';
import { MAGIC_COLORS } from './magicTargeting';
import { bindWorkshopInput, type WorkshopMode } from './workshopInput';
import { button, el } from './dom';
import { WorkshopBoardView } from './workshopBoardView';
import { spellIntent, castConsequence, castOutcome } from './workshopCasting';
import { iconElement } from './iconDraw';
import { ELEMENT_ICONS } from './art/icons';
import { Atlas } from './art/atlas';
import { workshopPortrait } from './workshopPortrait';
import './workshop.css';
if (!import.meta.env.DEV) throw new Error('The workshop is a development review fixture.');
const store: KeyValueStore = {
  getItem: (key) => localStorage.getItem(`magic-workshop:${key}`),
  setItem: (key, value) => localStorage.setItem(`magic-workshop:${key}`, value),
  removeItem: (key) => localStorage.removeItem(`magic-workshop:${key}`),
};
const loaded = loadGame(store);
const state = loaded?.flags.has('workshopProgressionV1') ? loaded : newGame();
state.flags.add('boardMagicEnabled');
state.flags.add('workshopProgressionV1');
let liveBook: typeof state.hero.spells = structuredClone(state.hero.spells);
let practiceMana = false;
const root = required(document.getElementById('workshop'));
let battle: Battle,
  mode: WorkshopMode = 'play',
  selected: string | null = null,
  target: number | null = null,
  direction: -1 | 1 = 1,
  arcaneBank = false,
  exercise = -1,
  testLevel = 1,
  testSpell = 'all',
  complete = false,
  enemySequence = 0,
  lastBoard = '',
  lastNext = '';
let seenAutoCasts = 0;
let preview: CastPreview | null = null;
let usefulRows: number[] = [],
  showResult = true,
  lastCast = '',
  paletteResourceKey = '';
const castingTitle = el('strong'),
  castingStep = el('span');
const castingGuide = el('section', { className: 'casting-guide' }, castingTitle, castingStep);
castingGuide.setAttribute('role', 'status');
const spellArea = el('div', { className: 'spell-area' });
const arcaneResource = el('small', { className: 'arcane-resource' });
const compareButton = button('Show original', () => {
  showResult = !showResult;
  refresh();
});
compareButton.classList.add('compare-result');
const badge = el('span', { className: 'mode-badge' }),
  goal = el('p'),
  progress = el('strong'),
  nextPiece = el('div', { className: 'next-piece' }),
  enemy = el('section', { className: 'opponent' }),
  enemyClock = el('p'),
  effects = el('p', { className: 'effect-status' }),
  cost = el('p', { className: 'mana-cost' }),
  board = el('div', { className: 'board-surface' }),
  pauseOverlay = el('div', { className: 'pause-overlay' }),
  palette = el('nav', { className: 'spell-strip' }),
  playControls = el('div', { className: 'piece-controls' }),
  aimControls = el('div', { className: 'aim-controls' }),
  stage = el('main', { className: 'playfield' });
const boardWell = el('section', { className: 'board-well' });
const enemyMeter = el('progress', { className: 'enemy-meter' });
enemyMeter.max = 1;
enemyMeter.setAttribute('aria-label', 'Time until Slime places an obstruction');
const enemyIntent = el('span', { className: 'enemy-intent', text: 'Preparing stone' });
const spellNodes = new Map<string, { price: HTMLElement; pool: HTMLProgressElement }>();
board.setAttribute('aria-label', 'Battle board');
board.setAttribute('role', 'region');
badge.setAttribute('role', 'status');
const pauseButton = button('Pause', () => togglePause()),
  resetButton = button('Reset', () => reset(exercise)),
  cancelButton = button('Cancel', () => cancelAim()),
  castButton = button('Cast', () => cast()),
  windLeft = button('←', () => setDirection(-1)),
  windRight = button('→', () => setDirection(1)),
  bankButton = button('Arcane', () => {
    arcaneBank = true;
    renderPalette();
    refresh();
  }),
  elementBank = button('Elements', () => {
    arcaneBank = false;
    renderPalette();
    refresh();
  });
windLeft.textContent = '← Left';
windRight.textContent = 'Right →';
windLeft.setAttribute('aria-label', 'Wind left');
windRight.setAttribute('aria-label', 'Wind right');
const nextExercise = button('Next exercise', () => reset((exercise + 1) % PRACTICES.length));
const controls: Partial<Record<BattleAction, HTMLElement>> = {};
for (const [action, label] of [
  ['left', '←'],
  ['softDrop', '↓ Down'],
  ['right', '→'],
  ['rotate', 'Rotate'],
  ['hardDrop', 'Drop'],
] as const) {
  const node = el('button', { text: label });
  node.type = 'button';
  node.dataset.action = action;
  node.setAttribute(
    'aria-label',
    {
      left: 'Move left',
      softDrop: 'Soft drop',
      right: 'Move right',
      rotate: 'Rotate piece',
      hardDrop: 'Hard drop',
    }[action],
  );
  node.title = {
    left: 'Move left (←)',
    right: 'Move right (→)',
    softDrop: 'Soft drop (↓)',
    rotate: 'Rotate (↑ / X)',
    hardDrop: 'Hard drop (Space)',
  }[action];
  controls[action] = node;
  playControls.append(node);
}
aimControls.append(compareButton, windLeft, windRight, cancelButton, castButton);
const endLabel = el('strong', { text: 'Paused' });
const resume = button('Resume', () =>
  battle.status === 'ongoing' ? togglePause() : reset(exercise),
);
pauseOverlay.append(endLabel, resume);
pauseOverlay.hidden = true;
const encounter = el(
  'aside',
  { className: 'encounter', title: 'Opponent and encounter goal' },
  enemy,
  el(
    'section',
    { className: 'goal-panel' },
    el('small', { text: 'OBJECTIVE' }),
    goal,
    progress,
    nextExercise,
  ),
  el('section', { className: 'next-panel' }, el('small', { text: 'NEXT' }), nextPiece),
);
const enemyDetails = el(
  'div',
  { className: 'enemy-details' },
  el('small', { text: 'OPPONENT' }),
  el('strong', { text: 'Slime' }),
  enemyIntent,
  enemyMeter,
  enemyClock,
  effects,
);
enemy.append(enemyDetails);
const header = el(
  'header',
  { className: 'game-hud' },
  el('h1', { text: 'Magic workshop' }),
  badge,
  button('Exercises', () => openExercises()),
  pauseButton,
  resetButton,
);
const boardFrame = el('div', { className: 'board-frame' }, board, pauseOverlay);
boardWell.append(boardFrame);
const actionArea = el(
  'section',
  { className: 'action-area' },
  el('div', { className: 'action-copy' }, castingGuide, cost),
  aimControls,
);
spellArea.append(
  el('h2', { className: 'spellbook-title', text: 'YOUR MAGIC' }),
  el('div', { className: 'spell-banks' }, elementBank, bankButton),
  arcaneResource,
  palette,
);
spellArea.setAttribute('aria-label', 'Your spells and mana');
stage.append(spellArea, boardWell, encounter);
root.append(header, stage, actionArea, el('footer', { className: 'control-dock' }, playControls));
const boardView = new WorkshopBoardView(board, nextPiece);
const atlas = new Atlas();
void atlas.load(`${import.meta.env.BASE_URL}assets/`).then(() => {
  enemy.prepend(workshopPortrait(atlas));
});
function setMode(next: WorkshopMode): void {
  mode = next;
  battle.paused = mode !== 'play';
  inputs?.lockout();
  refresh();
}
function cancelAim(): void {
  selected = null;
  target = null;
  preview = null;
  setMode('play');
}
function togglePause(): void {
  if (mode === 'aim') {
    selected = null;
    target = null;
    preview = null;
  }
  setMode(mode === 'paused' ? 'play' : 'paused');
}
function needsRow(): boolean {
  return (
    !!selected &&
    (selected === 'arcane:lightning' ||
      (!selected.startsWith('arcane:') &&
        !(selected === 'quake' && (state.hero.spells.quake?.level ?? 1) >= 4)))
  );
}
function chooseSpell(id: string): void {
  if (
    battle.autoCastingBusy ||
    mode === 'paused' ||
    battle.status !== 'ongoing' ||
    (battle.autoCastingEnabled && !id.startsWith('arcane:'))
  )
    return;
  selected = id;
  target = null;
  preview = null;
  showResult = true;
  paletteResourceKey = '';
  lastCast = '';
  findUsefulRows();
  setMode('aim');
}
function findUsefulRows(): void {
  usefulRows = [];
  if (!selected || !needsRow()) return;
  for (let y = 0; y < 20; y++) {
    try {
      if (!battle.magicCasting.preview(selected, { bottomRow: y, direction }).reason)
        usefulRows.push(y);
    } catch {
      /* Unavailable spells have no useful targets. */
    }
  }
}
function stepTarget(dy: number): void {
  if (mode !== 'aim' || !needsRow()) return;
  target = Math.max(0, Math.min(19, (target ?? 19) + dy));
  refresh();
}
function setDirection(dx: -1 | 1): void {
  if (mode === 'aim') {
    direction = dx;
    findUsefulRows();
    refresh();
  }
}
function input(action: BattleAction): void {
  if (mode !== 'play') return;
  battle.input(action);
  refresh();
}
const inputs = bindWorkshopInput(board, controls, {
  mode: () => (battle?.autoCastingBusy ? 'paused' : mode),
  input,
  targetRow(row) {
    if (mode === 'aim' && needsRow()) {
      target = row;
      refresh();
    }
  },
  stepTarget,
  direction: setDirection,
  confirm: cast,
  cancel: cancelAim,
  togglePause,
  pick(slot) {
    const element = ARCANE_ELEMENTS[slot - 1];
    const id = arcaneBank
      ? element
        ? `arcane:${element}`
        : undefined
      : PRACTICE_SPELLS[slot - 1]?.id;
    if (id) chooseSpell(id);
  },
  columns: () => 10,
  rows: () => 20,
  activePiece: () => battle?.board.active,
});
function renderPalette(): void {
  palette.replaceChildren();
  elementBank.textContent = battle.autoCastingEnabled ? 'Affinity order' : 'Elements';
  elementBank.setAttribute('aria-pressed', String(!arcaneBank));
  bankButton.setAttribute('aria-pressed', String(arcaneBank));
  spellNodes.clear();
  paletteResourceKey = '';
  spellArea.dataset.bank = arcaneBank ? 'arcane' : 'elements';
  arcaneResource.hidden = !arcaneBank;
  if (arcaneBank && state.hero.weaving?.equipped)
    palette.append(
      button('Equipped weaving', () => {
        if (battle.autoCastingBusy) return;
        const prior = mode;
        mode = 'paused';
        inputs.lockout();
        openWeavingTargeting(
          battle,
          () => true,
          () => {
            setMode(prior);
            saveGame(store, state);
          },
        );
      }),
    );
  const options = arcaneBank
    ? ARCANE_ELEMENTS.map((element) => ({
        id: `arcane:${element}`,
        name:
          element === 'earth'
            ? 'Gravity'
            : element === 'water'
              ? 'Ice'
              : element[0]?.toUpperCase() + element.slice(1),
        element,
      }))
    : battle.autoCastingEnabled
      ? battle.autoOrder.map((id) => required(PRACTICE_SPELLS.find((s) => s.id === id)))
      : PRACTICE_SPELLS;
  if (options.length === 0)
    palette.append(
      el('p', {
        className: 'empty-spellbook',
        text: 'No spells learned. Open Exercises to choose your first.',
      }),
    );
  for (const [slot, spell] of options.entries()) {
    const automatic = battle.autoCastingEnabled && !arcaneBank;
    const node = automatic
      ? el('article', { className: 'auto-spell' })
      : button('', () => chooseSpell(spell.id));
    if (automatic) node.setAttribute('role', 'group');
    node.dataset.spell = spell.id;
    node.title = `${slot + 1}: ${arcaneBank ? 'Arcane + ' : ''}${spell.name}`;
    node.setAttribute('aria-label', `${arcaneBank ? 'Arcane + ' : ''}${spell.name}`);
    if (!automatic) node.setAttribute('aria-pressed', String(selected === spell.id));
    const glyph = iconElement(
      arcaneBank ? { icon: 'arcane', badge: spell.element } : ELEMENT_ICONS[spell.element],
      2,
    );
    glyph.classList.add('spell-glyph');
    const price = el('span', { className: 'spell-price' });
    const pool = el('progress', { className: 'mana-pool' });
    pool.max = state.hero.manaCap;
    pool.setAttribute('aria-label', `${spell.name} mana available`);
    node.append(
      glyph,
      el('span', {
        className: 'spell-label',
        text: `${automatic ? `${slot + 1} ` : ''}${spell.name}`,
      }),
      price,
      pool,
    );
    if (automatic)
      node.querySelector('.spell-label')?.append(
        el('small', {
          className: 'auto-rank',
          text: `Lv${state.hero.spells[spell.id]?.level ?? 1}`,
        }),
      );
    spellNodes.set(spell.id, { price, pool });
    node.style.setProperty(
      '--spell-color',
      {
        lightning: MAGIC_COLORS.gold,
        nature: MAGIC_COLORS.green,
        earth: MAGIC_COLORS.orange,
        water: MAGIC_COLORS.blue,
        fire: MAGIC_COLORS.red,
        wind: MAGIC_COLORS.cyan,
      }[spell.element] ?? '#aaa',
    );
    palette.append(node);
  }
}
function reset(index = -1): void {
  exercise = index;
  complete = false;
  mode = 'play';
  selected = null;
  target = null;
  preview = null;
  boardView.reset();
  usefulRows = [];
  lastCast = '';
  showResult = true;
  lastBoard = '';
  lastNext = '';
  seenAutoCasts = 0;
  enemySequence = 0;
  if (index === -1) state.hero.spells = structuredClone(liveBook);
  else {
    state.hero.spells = {};
    state.hero.arcane = {};
    for (const id of [...Object.keys(BOARD_SPELLS), 'shadow'])
      state.hero.spells[id] = { ...newKnownSpell(), level: 4 };
    for (const element of ARCANE_ELEMENTS) createArcane(state.hero, state.flags, element);
  }
  if (index >= 0) {
    const lesson = required(PRACTICES[index]);
    if (!lesson.spell.startsWith('arcane:')) required(state.hero.spells[lesson.spell]).level = 1;
    arcaneBank = lesson.spell.startsWith('arcane:');
  } else arcaneBank = false;
  battle = new Battle({ kind: 'combat', enemyId: 'slime' }, state.hero, createRng(42), {
    boardMagic: true,
    autoCast: index === -1,
    autoCastPacingMs: 500,
    storyFlags: state.flags,
  });
  refreshStats(state.hero);
  if (index !== -1 || practiceMana) {
    state.hero.maxHp = 10000;
    state.hero.manaCap = 100;
  }
  state.hero.hp = state.hero.maxHp;
  for (const e of Object.keys(state.hero.mana))
    state.hero.mana[e as keyof typeof state.hero.mana] = index !== -1 || practiceMana ? 100 : 0;
  if (index !== -1 || practiceMana) required(battle.combat).enemyHp = 10000;
  if (index >= 0) setupPractice(battle, required(PRACTICES[index]));
  else {
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
    ] as const)
      battle.board.obstructions[`${x},${y}`] = {
        id: `initial:${x}:${y}`,
        owner: 'slime',
        strength,
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
  if (index === -1) {
    battle.board.loadRows([
      '.r........',
      '..b.......',
      '..#.......',
      '.......#..',
      '..........',
      'rrrr..rrrr',
      'rrrr..rrrr',
    ]);
    for (const [x, y, strength] of [
      [2, 15, 3],
      [7, 16, 2],
    ] as const)
      battle.board.obstructions[`${x},${y}`] = {
        id: `initial:${x}:${y}`,
        owner: 'slime',
        strength,
        anchored: true,
        sequence: [],
        step: 0,
        contacts: [],
      };
    battle.board.replaceActive('O', { x: 3 });
  }
  // The opponent's authored next placement is visible before its clock starts.
  required(battle.combat).nextMove = {
    kind: 'obstruct',
    name: 'Set an obstruction',
    cells: incoming(),
  };
  renderPalette();
  inputs.lockout();
  refresh();
  resize();
}
function incoming(): { x: number; y: number; strength: number }[] {
  return exercise === 6
    ? [{ x: 4, y: 18, strength: 2 }]
    : [
        {
          x: 1 + ((enemySequence * 3) % 8),
          y: 12 + (enemySequence % 3),
          strength: 1 + (enemySequence % 3),
        },
      ];
}
function refresh(): void {
  if (!battle) return;
  if (seenAutoCasts !== battle.autoCastCount) {
    seenAutoCasts = battle.autoCastCount;
    lastCast = '';
    saveGame(store, state);
  }
  root.dataset.mode = mode;
  root.dataset.autoPhase = battle.autoFrame?.phase ?? 'idle';
  root.dataset.castSource = battle.autoFrame?.source ?? 'auto';
  root.dataset.testLevel = String(testLevel);
  root.dataset.testSpell = testSpell;
  for (const node of palette.querySelectorAll<HTMLElement>('[data-spell]'))
    node.classList.toggle('casting-now', node.dataset.spell === battle.autoFrame?.preview.id);
  const ended = battle.status !== 'ongoing' && !battle.autoCastingBusy;
  badge.textContent = ended
    ? battle.status === 'won'
      ? 'Victory'
      : 'Defeated'
    : mode === 'play'
      ? battle.autoCastingBusy
        ? 'Casting'
        : 'Playing'
      : mode === 'aim'
        ? 'Aiming'
        : 'Paused';
  endLabel.textContent = ended ? badge.textContent : 'Paused';
  resume.textContent = ended ? 'Reset battle' : 'Resume';
  pauseButton.disabled = ended;
  pauseButton.textContent = mode === 'paused' ? 'Resume' : 'Pause';
  pauseButton.setAttribute('aria-label', mode === 'paused' ? 'Resume game' : 'Pause game');
  battle.paused = mode !== 'play';
  pauseOverlay.hidden = !ended && mode !== 'paused';
  playControls.hidden = false;
  aimControls.hidden = mode !== 'aim';
  boardWell.classList.toggle(
    'board-target',
    mode === 'aim' && (!selected?.startsWith('arcane:') || needsRow()),
  );
  for (const node of Object.values(controls))
    if (node instanceof HTMLButtonElement)
      node.disabled = mode !== 'play' || battle.autoCastingBusy || battle.status !== 'ongoing';
  goal.textContent =
    exercise < 0
      ? battle.autoCastingEnabled
        ? Object.keys(state.hero.spells).length
          ? 'Clear lines to cast'
          : 'No spells learned · Clear lines'
        : 'Clear grey blocks'
      : {
          obstructions: 'Break grey blocks',
          convert: 'Make blank blocks',
          land: 'Land on the marks',
          line: 'Clear the bottom row',
          red: 'Burn red blocks',
          shift: 'Move onto the mark',
          incoming: 'Receive a blank block',
        }[required(PRACTICES[exercise]).goal];
  if (exercise >= 0) {
    const done = practiceProgress(battle, required(PRACTICES[exercise]));
    complete ||= done.done;
    progress.textContent = complete ? 'Exercise complete' : `${done.remaining} remaining`;
  } else
    progress.textContent = battle.autoCastingEnabled
      ? `${battle.lines} lines · ${battle.autoCastCount} auto casts`
      : `${Object.keys(battle.board.obstructions).length} remaining`;
  nextExercise.hidden = exercise < 0 || !complete;
  preview = null;
  let previewError = '';
  if (mode === 'aim' && selected)
    try {
      preview = battle.magicCasting.preview(selected, { bottomRow: target ?? 19, direction });
    } catch (error) {
      previewError = error instanceof Error ? error.message : 'Spell unavailable.';
    }
  let span: readonly [number, number] | undefined;
  const hasTarget = !needsRow() || target !== null;
  if (preview && hasTarget && (!selected?.startsWith('arcane:') || needsRow()))
    span = spanFor(
      { element: preview.element, rank: preview.rank, bottomRow: preview.target.bottomRow },
      20,
    );
  const actual = battle.board.magicState(),
    display = battle.board.magicState(),
    piece = battle.board.active;
  const ghostCells: string[] = [],
    activeCells: string[] = [];
  if (piece) {
    const ghostY = battle.board.ghostY();
    piece.cells.forEach(([dx, dy], i) => {
      const x = piece.x + dx,
        y = piece.y + dy,
        gy = ghostY + dy,
        color = piece.colors[i] ?? piece.color;
      if (gy >= 0 && gy < 20 && display.grid[gy]?.[x] === null) {
        required(display.grid[gy])[x] = color;
        ghostCells.push(`${x},${gy}`);
      }
      if (y >= 0 && y < 20) {
        required(display.grid[y])[x] = color;
        activeCells.push(`${x},${y}`);
      }
    });
  }
  const key = JSON.stringify([
    display,
    span,
    mode,
    ghostCells,
    activeCells,
    preview?.resolution.state,
    exercise,
  ]);
  if (key !== lastBoard) {
    boardView.updateSemantics(display, (grid) => {
      if (span)
        for (let y = span[0]; y <= span[1]; y++) grid.children[y]?.classList.add('selected');
      for (let y = 0; y < 20; y++)
        for (let x = 0; x < 10; x++) {
          const cell = grid.children[y]?.children[x];
          if (!cell) continue;
          if (ghostCells.includes(`${x},${y}`)) cell.classList.add('landing-ghost');
          if (activeCells.includes(`${x},${y}`)) {
            cell.classList.remove('landing-ghost');
            cell.classList.add('active-piece');
          }
          if (preview && hasTarget) {
            const after = preview.resolution.state,
              before = actual.grid[y]?.[x],
              next = after.grid[y]?.[x];
            if (before !== next) cell.classList.add(next === null ? 'will-remove' : 'will-fill');
            else if (
              (actual.obstructions[`${x},${y}`]?.strength ?? 0) >
              (after.obstructions[`${x},${y}`]?.strength ?? 0)
            )
              cell.classList.add('will-weaken');
          }
        }
      for (const [x, y] of exercise >= 0 ? (PRACTICES[exercise]?.targets ?? []) : [])
        grid.children[y]?.children[x]?.classList.add('goal-square');
    });
    lastBoard = key;
  }
  const next = battle.board.previewPieces(1)[0];
  if (next && lastNext !== next.name) {
    nextPiece.setAttribute('aria-label', `Next piece: ${next.name}`);
    lastNext = next.name;
  }
  const effect = battle.interference.effects.slime;
  enemyClock.textContent = `Next block: ${Math.max(0, (required(battle.combat).actMs - required(battle.combat).gauge + (effect?.delayMs ?? 0)) / 1000).toFixed(1)}s`;
  enemyMeter.value = Math.min(
    1,
    required(battle.combat).gauge / (required(battle.combat).actMs + (effect?.delayMs ?? 0)),
  );
  enemyIntent.textContent = effect?.nature
    ? 'Next send: blank block'
    : `Preparing stone · ${incoming()[0]?.strength ?? 1} hit${incoming()[0]?.strength === 1 ? '' : 's'}`;
  effects.textContent = [
    effect?.nature ? `${effect.nature} blank sends` : '',
    effect?.wind ? `${effect.wind} shifted sends` : '',
    effect?.gravity ? `${effect.gravity} unanchored moves` : '',
    effect?.red ? `${effect.red} red-touch moves` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const characterTarget = mode === 'aim' && !!selected?.startsWith('arcane:') && !needsRow();
  enemy.classList.toggle('character-target', characterTarget);
  enemy.setAttribute('aria-label', characterTarget ? 'Slime, spell target' : 'Slime');
  const definition = PRACTICE_SPELLS.find((s) => s.id === selected);
  const name = selected?.startsWith('arcane:')
    ? `Arcane + ${selected.endsWith('earth') ? 'Gravity' : selected.endsWith('water') ? 'Ice' : (selected[7]?.toUpperCase() ?? '') + selected.slice(8)}`
    : (definition?.name ?? 'Spell');
  const validPreview = !!preview && hasTarget && !preview.reason;
  const boardPreview =
    mode === 'aim' && validPreview && (!selected?.startsWith('arcane:') || needsRow());
  board.setAttribute(
    'aria-label',
    boardPreview && showResult ? 'Spell result preview; Cast to apply' : 'Battle board',
  );
  let consequence = '';
  if (mode !== 'aim') {
    cost.textContent = '';
    castingTitle.textContent = ended
      ? badge.textContent
      : battle.autoCastingEnabled
        ? 'Standard spells: automatic'
        : lastCast
          ? 'Spell cast'
          : 'Playing';
    castingStep.textContent =
      lastCast ||
      (ended
        ? 'Reset to try again.'
        : battle.autoCastingEnabled
          ? battle.autoCasts.length
            ? `Last auto: ${
                battle.autoCasts
                  .slice(0, 2)
                  .map(
                    (c) =>
                      `${PRACTICE_SPELLS.find((s) => s.id === c.id)?.name ?? c.id} Lv${c.rank}`,
                  )
                  .join(' → ') +
                (battle.autoCasts.length > 2 ? ` +${battle.autoCasts.length - 2}` : '')
              }`
            : 'Each cleared line allows one useful cast. Arcane is manual.'
          : 'Place blocks or choose a spell.');
  } else {
    castingTitle.textContent = `${name}${boardPreview ? (showResult ? ' · Preview' : ' · Before') : ''}`;
    if (preview) {
      cost.textContent = Object.entries(preview.cost)
        .map(([e, n]) =>
          selected?.startsWith('arcane:')
            ? `${n} ${e}`
            : `${n} of ${state.hero.mana[e as keyof typeof state.hero.mana]} mana`,
        )
        .join(' + ');
      consequence = hasTarget ? castConsequence(actual, preview) : spellIntent(selected ?? '');
    } else cost.textContent = '';
  }
  const frame = battle.autoFrame;
  if (frame) {
    const spell = PRACTICE_SPELLS.find((s) => s.id === frame.preview.id);
    castingTitle.textContent = `${frame.source === 'weave' ? 'Weaving · ' : ''}${spell?.name ?? frame.preview.name} Lv${frame.preview.rank} · ${frame.index}/${frame.total}`;
    castingStep.textContent = `${frame.phase === 'result' ? 'Applied' : frame.phase === 'effect' ? 'Casting' : 'Next'}: ${frame.phase === 'result' ? castOutcome(frame.before, frame.preview) : castConsequence(frame.before, frame.preview)}`;
    cost.textContent = Object.entries(frame.preview.cost)
      .map(([e, n]) => `${n} ${e} mana`)
      .join(' + ');
  }
  palette.hidden = false;
  castingGuide.hidden = false;
  compareButton.hidden =
    mode !== 'aim' ||
    !preview ||
    !hasTarget ||
    !!preview.reason ||
    (selected?.startsWith('arcane:') === true && !needsRow());
  compareButton.textContent = showResult ? 'Before' : 'Result';
  compareButton.setAttribute(
    'aria-label',
    showResult ? 'Show original board' : 'Show spell result',
  );
  compareButton.setAttribute('aria-pressed', String(showResult));
  if (mode === 'aim')
    castingStep.textContent = !hasTarget
      ? usefulRows.length
        ? `${spellIntent(selected ?? '')}. Choose a lit row.`
        : previewError || 'No useful target. Choose another spell.'
      : preview?.reason
        ? preview.reason
        : `${consequence}${characterTarget ? ' → Slime' : ''}`;
  castButton.textContent = selected?.startsWith('arcane:') ? 'Cast Arcane' : `Cast ${name}`;
  castButton.setAttribute(
    'aria-label',
    selected?.startsWith('arcane:') ? `Cast ${name.replace(' + ', ' ')}` : `Cast ${name}`,
  );
  castButton.hidden = false;
  castButton.dataset.cast = 'true';
  cancelButton.hidden = mode !== 'aim';
  const wind = selected === 'gale' || selected === 'arcane:wind';
  windLeft.hidden = mode !== 'aim' || !wind;
  windRight.hidden = mode !== 'aim' || !wind;
  windLeft.setAttribute('aria-pressed', String(direction === -1));
  windRight.setAttribute('aria-pressed', String(direction === 1));
  castButton.disabled =
    !preview || !hasTarget || preview.reason !== null || battle.status !== 'ongoing';
  refreshMana();
  for (const node of palette.querySelectorAll<HTMLButtonElement>('button'))
    node.setAttribute('aria-pressed', String(node.dataset.spell === selected));
}
function cast(): void {
  if (mode !== 'aim' || !selected || !preview || preview.reason || (needsRow() && target === null))
    return;
  const id = selected,
    chosen = preview.target,
    result = castConsequence(battle.board.magicState(), preview);
  battle.paused = false;
  try {
    if (id.startsWith('arcane:')) battle.castArcane(id, chosen);
    else required(battle.combat).castSpell(id, chosen);
    saveGame(store, state);
    lastCast = `Cast complete: ${result}`;
    selected = null;
    target = null;
    preview = null;
    setMode('play');
  } catch (error) {
    battle.paused = true;
    castingStep.textContent = error instanceof Error ? error.message : 'Unable to cast.';
  }
}
function refreshMana(): void {
  const key = JSON.stringify([state.hero.mana, state.hero.spells, state.hero.arcane, arcaneBank]);
  if (key === paletteResourceKey) return;
  paletteResourceKey = key;
  for (const [id, nodes] of spellNodes) {
    try {
      const p = battle.magicCasting.preview(id, { bottomRow: 19, direction });
      const available = state.hero.mana[p.element];
      const total = Object.values(p.cost).reduce((sum, n) => sum + (n ?? 0), 0);
      nodes.price.textContent = `${p.cost[p.element] ?? total} mana · ${available} held`;
      if (id.startsWith('arcane:'))
        arcaneResource.textContent = `+ ${p.cost.arcane ?? 0} Arcane · ${state.hero.mana.arcane} held`;
      nodes.pool.value = available;
      nodes.pool.max = state.hero.manaCap;
      nodes.pool.setAttribute('aria-valuetext', `${available} ${p.element} mana available`);
      const node = required(nodes.price.parentElement);
      const ready = Object.entries(p.cost).every(
        ([e, n]) => state.hero.mana[e as keyof typeof state.hero.mana] >= (n ?? 0),
      );
      node.classList.toggle('mana-ready', ready);
      if (battle.autoCastingEnabled && !arcaneBank)
        nodes.price.replaceChildren(
          el('span', {
            className: 'mana-full',
            text: `${ready ? 'Ready' : 'Charging'} · ${total} of ${available} mana`,
          }),
          el('span', { className: 'mana-compact', text: `${total} mana · ${available} held` }),
        );
      if (node instanceof HTMLButtonElement && arcaneBank) node.disabled = !ready;
      if (battle.autoCastingEnabled && !arcaneBank) {
        node.setAttribute(
          'aria-label',
          `${PRACTICE_SPELLS.find((s) => s.id === id)?.name} · level ${p.rank} · ${ready ? 'Ready for next line' : 'Charging'} · cost ${total}, held ${available}`,
        );
      }
      node.classList.toggle('unaffordable', p.reason === 'Not enough mana.');
      node.title = `${node.getAttribute('aria-label')} · ${Object.entries(p.cost)
        .map(([e, n]) => `${n} ${e}`)
        .join(' + ')} mana · ${available} ${p.element} available`;
    } catch {
      nodes.price.textContent = 'Unavailable';
      nodes.pool.value = 0;
    }
  }
}
function resize(): void {
  const box = boardWell.getBoundingClientRect();
  const cell = Math.max(1, Math.floor(Math.min((box.height - 8) / 20, (box.width - 8) / 10, 34)));
  root.style.setProperty('--cell', `${cell}px`);
}
function openExercises(): void {
  if (battle.autoCastingBusy || document.querySelector('dialog[open]')) return;
  const prior = mode;
  mode = 'paused';
  battle.paused = true;
  inputs.lockout();
  refresh();
  const dialog = el('dialog', { className: 'exercise-dialog' });
  dialog.append(
    el('h2', { text: 'Progression and exercises' }),
    el('p', {
      text: 'The same falling-block controls and clocks stay active. Aim pauses play; Cast or Cancel resumes it.',
    }),
  );
  const resumeLive = (): void => {
    liveBook = structuredClone(state.hero.spells);
    testLevel = 0;
    testSpell = 'mixed';
    dialog.close();
    dialog.remove();
    setMode(prior);
    renderPalette();
    refresh();
    saveGame(store, state);
  };
  dialog.append(
    el('h3', { text: 'Player progression' }),
    el('p', {
      text: `${state.hero.skillPoints} skill points. Starts with no spells; mana comes from cleared crystals. These controls simulate learning and earned XP for testing.`,
    }),
    button('Earn a level (test XP)', () => {
      gainXp(state.hero, state.hero.nextXp);
      resumeLive();
    }),
    button('Moon Wyrm aftermath (test unlock)', () => {
      state.flags.add('wyrmBeaten');
      state.flags.add('scene:chapterEnd');
      resumeLive();
    }),
  );
  for (const id of [...WEAVE_SPELLS, 'shadow'] as const) {
    const known = state.hero.spells[id];
    const name = id === 'shadow' ? 'Arcane' : WEAVE_NAMES[id];
    if (!known)
      dialog.append(
        button(
          `Learn ${name}`,
          () => {
            learnSpell(state.hero, id);
            resumeLive();
          },
          { disabled: id === 'shadow' && !arcaneUnlocked(state.flags) },
        ),
      );
    else {
      dialog.append(el('p', { text: `${name} · Lv ${known.level}` }));
      for (const attribute of ['power', 'efficiency', 'effect'] as const)
        dialog.append(
          button(`Enhance ${name} ${attribute}`, () => {
            spendSkillPoints(state.hero, { stats: {}, spells: { [id]: { [attribute]: 1 } } });
            resumeLive();
          }),
        );
      dialog.append(
        button(
          `Train ${name} next level`,
          () => {
            raiseSpellLevel(state.hero, id);
            resumeLive();
          },
          { disabled: !isReady(required(SPELLS[id]), known) },
        ),
      );
    }
  }
  const edit = (open: typeof openWeavingEditor): void => {
    dialog.close();
    dialog.remove();
    open(
      state.hero,
      state.flags,
      () => {
        liveBook = structuredClone(state.hero.spells);
        saveGame(store, state);
      },
      () => {
        setMode(prior);
        renderPalette();
        refresh();
      },
    );
  };
  dialog.append(
    button('Arcane mastery', () => edit(openArcaneEditor)),
    button('Arcane Weaving', () => edit(openWeavingEditor)),
  );
  dialog.append(
    el('h3', { text: 'Supplied practice loadouts' }),
    el('p', {
      text: 'Debug presets below grant spells and full mana. They do not represent a new player.',
    }),
  );
  dialog.append(
    button('Supply mana (debug)', () => {
      practiceMana = true;
      state.hero.manaCap = 100;
      for (const e of Object.keys(state.hero.mana))
        state.hero.mana[e as keyof typeof state.hero.mana] = 100;
      resumeLive();
    }),
  );
  const spellSelect = el('select');
  spellSelect.setAttribute('aria-label', 'Test spells');
  for (const [id, name] of [
    ['all', 'All spells'],
    ['fire', 'Fire only'],
    ['blizzard', 'Ice only'],
    ['quake', 'Gravity only'],
    ['gale', 'Wind only'],
    ['thunder', 'Lightning only'],
    ['natureConvert', 'Nature only'],
  ]) {
    const option = el('option', { text: name });
    option.value = required(id);
    spellSelect.append(option);
  }
  spellSelect.value = testSpell === 'mixed' ? 'all' : testSpell;
  dialog.append(el('label', {}, 'Live test spells ', spellSelect));
  const choose = (index: number, level = testLevel): void => {
    testLevel = level;
    testSpell = spellSelect.value;
    dialog.close();
    dialog.remove();
    state.flags.add('wyrmBeaten');
    state.flags.add('scene:chapterEnd');
    if (index === -1) {
      practiceMana = true;
      liveBook = {};
      state.hero.arcane = {};
      state.hero.weaving = { recipes: [], equipped: null };
      for (const id of testSpell === 'all' ? [...Object.keys(BOARD_SPELLS), 'shadow'] : [testSpell])
        liveBook[id] = { ...newKnownSpell(), level };
      state.hero.spells = structuredClone(liveBook);
      for (const element of ARCANE_ELEMENTS) createArcane(state.hero, state.flags, element);
    }
    reset(index);
  };
  dialog.append(
    button('New zero-spell run', () => {
      liveBook = {};
      practiceMana = false;
      Object.assign(state.hero, createHero());
      state.hero.arcane = {};
      state.hero.weaving = { recipes: [], equipped: null };
      state.hero.skillPoints = 0;
      state.flags = new Set(['boardMagicEnabled', 'workshopProgressionV1']);
      dialog.close();
      dialog.remove();
      reset(-1);
    }),
  );
  for (const level of [1, 2, 3, 4])
    dialog.append(button(`Supplied spells · Lv ${level}`, () => choose(-1, level)));
  dialog.append(button('Manual spell lab', () => choose(-2)));
  for (const [index, lesson] of PRACTICES.entries())
    dialog.append(button(lesson.title, () => choose(index)));
  const close = (): void => {
    dialog.close();
    dialog.remove();
    setMode(prior);
  };
  dialog.append(button('Back', close));
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  document.body.append(dialog);
  dialog.showModal();
}
window.addEventListener('resize', resize);
new ResizeObserver(resize).observe(boardWell);
reset();
let previous = performance.now();
function frame(now: number): void {
  const dt = Math.min(100, Math.max(0, now - previous));
  previous = now;
  inputs.tick(now);
  if (mode === 'play' && (battle.status === 'ongoing' || battle.autoCastingBusy)) {
    const before = battle.interference.placements.slime ?? 0;
    required(battle.combat).nextMove = {
      kind: 'obstruct',
      name: 'Set an obstruction',
      cells: incoming(),
    };
    battle.update(dt);
    if ((battle.interference.placements.slime ?? 0) > before) enemySequence++;
    refresh();
  }
  const hasTarget = !needsRow() || target !== null;
  const span =
    preview && hasTarget && (!selected?.startsWith('arcane:') || needsRow())
      ? spanFor(
          { element: preview.element, rank: preview.rank, bottomRow: preview.target.bottomRow },
          20,
        )
      : undefined;
  boardView.render(
    battle,
    mode === 'aim' ? preview : null,
    hasTarget,
    span,
    exercise >= 0 ? (PRACTICES[exercise]?.targets ?? []) : [],
    dt,
    now,
    {
      usefulRows: mode === 'aim' && target === null ? usefulRows : [],
      showResult: mode === 'aim' && showResult && hasTarget && !preview?.reason,
    },
  );
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
