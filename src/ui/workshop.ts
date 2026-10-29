/** Live review battle using the same piece input as the adventure. */
import { required } from '../core/required';
import { Battle, type BattleAction } from '../battle/battle';
import { BOARD_SPELLS, type CastPreview } from '../battle/magicCasting';
import { spanFor } from '../core/boardMagic';
import { createRng } from '../core/rng';
import { newKnownSpell } from '../game/spells';
import { ARCANE_ELEMENTS, createArcane } from '../game/arcane';
import { PRACTICES, PRACTICE_SPELLS, practiceProgress, setupPractice } from '../game/magicPractice';
import { newGame } from '../world/state';
import { loadGame, saveGame, type KeyValueStore } from '../game/save';
import { MAGIC_COLORS } from './magicTargeting';
import { bindWorkshopInput, type WorkshopMode } from './workshopInput';
import { button, el } from './dom';
import { WorkshopBoardView } from './workshopBoardView';
import { iconElement } from './iconDraw';
import { ELEMENT_ICONS } from './art/icons';
import { Atlas } from './art/atlas';
import { spritePortrait } from './screens/widgets';
import './workshop.css';
if (!import.meta.env.DEV) throw new Error('The workshop is a development review fixture.');
const store: KeyValueStore = {
  getItem: (key) => localStorage.getItem(`magic-workshop:${key}`),
  setItem: (key, value) => localStorage.setItem(`magic-workshop:${key}`, value),
  removeItem: (key) => localStorage.removeItem(`magic-workshop:${key}`),
};
const state = loadGame(store) ?? newGame();
state.flags = new Set(['wyrmBeaten', 'scene:chapterEnd', 'boardMagicEnabled']);
const root = required(document.getElementById('workshop'));
let battle: Battle,
  mode: WorkshopMode = 'play',
  selected: string | null = null,
  target: number | null = null,
  direction: -1 | 1 = 1,
  arcaneBank = false,
  exercise = -1,
  complete = false,
  enemySequence = 0,
  allyClock = 0,
  lastBoard = '',
  lastNext = '';
let preview: CastPreview | null = null;
const badge = el('span', { className: 'mode-badge' }),
  goal = el('p'),
  progress = el('strong'),
  nextPiece = el('div', { className: 'next-piece' }),
  enemy = el('section', { className: 'opponent' }),
  enemyClock = el('p'),
  effects = el('p', { className: 'effect-status' }),
  spellName = el('h2'),
  hint = el('p', { className: 'aim-hint' }),
  outcome = el('p', { className: 'outcome' }),
  cost = el('p', { className: 'mana-cost' }),
  board = el('div', { className: 'board-surface' }),
  pauseOverlay = el('div', { className: 'pause-overlay' }),
  palette = el('nav', { className: 'spell-strip' }),
  playControls = el('div', { className: 'piece-controls' }),
  aimControls = el('div', { className: 'aim-controls' }),
  stage = el('main', { className: 'playfield' });
board.setAttribute('aria-label', 'Battle board');
board.setAttribute('role', 'region');
badge.setAttribute('role', 'status');
outcome.setAttribute('aria-live', 'polite');
const pauseButton = button('Pause', () => togglePause()),
  resetButton = button('Reset', () => reset(exercise)),
  cancelButton = button('Cancel', () => cancelAim()),
  castButton = button('Cast', () => cast()),
  upButton = button('↑ Row', () => stepTarget(-1)),
  downButton = button('↓ Row', () => stepTarget(1)),
  windLeft = button('←', () => setDirection(-1)),
  windRight = button('→', () => setDirection(1)),
  bankButton = button('Arcane', () => {
    arcaneBank = !arcaneBank;
    renderPalette();
  });
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
  controls[action] = node;
  playControls.append(node);
}
aimControls.append(cancelButton, upButton, downButton, windLeft, windRight, castButton);
const endLabel = el('strong', { text: 'Paused' });
const resume = button('Resume', () =>
  battle.status === 'ongoing' ? togglePause() : reset(exercise),
);
pauseOverlay.append(endLabel, resume);
pauseOverlay.hidden = true;
const rail = el(
  'aside',
  { className: 'info-rail' },
  el('section', { className: 'next-panel' }, el('small', { text: 'Next piece' }), nextPiece),
  el(
    'section',
    { className: 'goal-panel' },
    el('small', { text: 'Goal' }),
    goal,
    progress,
    nextExercise,
  ),
  enemy,
  el('section', { className: 'spell-info' }, spellName, hint, outcome, cost),
  bankButton,
);
enemy.append(el('strong', { text: 'Slime' }), enemyClock, effects);
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
stage.append(boardFrame, rail);
root.append(
  header,
  stage,
  palette,
  el('footer', { className: 'control-dock' }, playControls, aimControls),
);
const boardView = new WorkshopBoardView(board, nextPiece);
const atlas = new Atlas();
void atlas.load(`${import.meta.env.BASE_URL}assets/`).then(() => {
  enemy.prepend(spritePortrait(atlas, 'enemy.slime', 96, 'battle'));
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
  if (mode === 'paused' || battle.status !== 'ongoing') return;
  selected = id;
  target = null;
  preview = null;
  setMode('aim');
}
function stepTarget(dy: number): void {
  if (mode !== 'aim' || !needsRow()) return;
  target = Math.max(0, Math.min(19, (target ?? 19) + dy));
  refresh();
}
function setDirection(dx: -1 | 1): void {
  if (mode === 'aim') {
    direction = dx;
    refresh();
  }
}
function input(action: BattleAction): void {
  if (mode !== 'play') return;
  battle.input(action);
  refresh();
}
const inputs = bindWorkshopInput(board, controls, {
  mode: () => mode,
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
  bankButton.textContent = arcaneBank ? 'Elements' : 'Arcane';
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
    : PRACTICE_SPELLS;
  for (const [slot, spell] of options.entries()) {
    const node = button('', () => chooseSpell(spell.id));
    node.dataset.spell = spell.id;
    node.title = `${slot + 1}: ${arcaneBank ? 'Arcane + ' : ''}${spell.name}`;
    node.setAttribute('aria-label', `${arcaneBank ? 'Arcane + ' : ''}${spell.name}`);
    node.setAttribute('aria-pressed', String(selected === spell.id));
    const glyph = iconElement(
      arcaneBank ? { icon: 'arcane', badge: spell.element } : ELEMENT_ICONS[spell.element],
      2,
    );
    glyph.classList.add('spell-glyph');
    node.append(glyph, el('span', { text: spell.name }));
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
  lastBoard = '';
  lastNext = '';
  enemySequence = 0;
  allyClock = 0;
  for (const id of [...Object.keys(BOARD_SPELLS), 'shadow'])
    state.hero.spells[id] = { ...newKnownSpell(), level: 4 };
  for (const element of ARCANE_ELEMENTS) createArcane(state.hero, state.flags, element);
  if (index >= 0) {
    const lesson = required(PRACTICES[index]);
    if (!lesson.spell.startsWith('arcane:')) required(state.hero.spells[lesson.spell]).level = 1;
    arcaneBank = lesson.spell.startsWith('arcane:');
  } else arcaneBank = false;
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
  root.dataset.mode = mode;
  const ended = battle.status !== 'ongoing';
  badge.textContent = ended
    ? battle.status === 'won'
      ? 'Victory'
      : 'Defeated'
    : mode === 'play'
      ? 'Playing'
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
  playControls.hidden = mode === 'aim';
  aimControls.hidden = mode !== 'aim';
  for (const node of Object.values(controls))
    if (node instanceof HTMLButtonElement)
      node.disabled = mode !== 'play' || battle.status !== 'ongoing';
  goal.textContent =
    exercise < 0
      ? 'Clear grey blocks'
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
    progress.textContent = complete ? 'Exercise complete' : done.label;
  } else progress.textContent = `${Object.keys(battle.board.obstructions).length} remaining`;
  nextExercise.hidden = exercise < 0 || !complete;
  preview = null;
  if (mode === 'aim' && selected)
    try {
      preview = battle.magicCasting.preview(selected, { bottomRow: target ?? 19, direction });
    } catch (error) {
      outcome.textContent = error instanceof Error ? error.message : 'Spell unavailable.';
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
  effects.textContent = [
    effect?.nature ? `${effect.nature} blank sends` : '',
    effect?.wind ? `${effect.wind} shifted sends` : '',
    effect?.gravity ? `${effect.gravity} unanchored moves` : '',
    effect?.red ? `${effect.red} red-touch moves` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  enemy.classList.toggle(
    'character-target',
    mode === 'aim' && !!selected?.startsWith('arcane:') && !needsRow(),
  );
  if (mode !== 'aim') {
    spellName.textContent = 'Spells';
    hint.textContent = ended ? 'Reset to play again.' : 'Choose a spell below to aim.';
    outcome.textContent = 'Tap: rotate. Drag: move. Flick down: drop.';
    cost.textContent = '';
  } else {
    const definition = PRACTICE_SPELLS.find((s) => s.id === selected),
      name = selected?.startsWith('arcane:')
        ? `Arcane + ${selected.endsWith('earth') ? 'Gravity' : selected.endsWith('water') ? 'Ice' : selected.slice(7)}`
        : (definition?.name ?? 'Spell');
    spellName.textContent = `${name} · Rank ${preview?.rank ?? state.hero.spells[selected ?? '']?.level ?? 1}`;
    hint.textContent = needsRow()
      ? target === null
        ? 'Tap a row to target it.'
        : 'Gold band = target rows.'
      : selected?.startsWith('arcane:')
        ? 'Target: Slime'
        : 'Target: whole board';
    if (preview) {
      cost.textContent = Object.entries(preview.cost)
        .map(([e, n]) => `${n} ${e} / ${state.hero.mana[e as keyof typeof state.hero.mana]}`)
        .join(' + ');
      const rank = preview.rank;
      const hits = rank >= 3 ? 2 : 1;
      const rows =
        preview.element === 'earth'
          ? ([1, 2, 4, 20][rank - 1] ?? 1)
          : ['nature', 'lightning'].includes(preview.element)
            ? rank % 2 === 0
              ? 2
              : 1
            : rank;
      const affected = Object.entries(actual.obstructions).filter(
        ([key, o]) => (preview?.resolution.state.obstructions[key]?.strength ?? 0) < o.strength,
      ).length;
      const mechanics = selected?.startsWith('arcane:')
        ? (
            {
              fire: `Red counts for ${rank} enemy placements.`,
              water: `Next send delayed ${((rank * battle.magicCasting.intervalMs) / 1000).toFixed(0)}s.`,
              wind: `Shift next ${rank} blocks ${direction === -1 ? 'left' : 'right'}.`,
              lightning: `${rows} row(s) · ${hits} weakening hit(s).`,
              nature: `Next ${rank} blocks become blank.`,
              earth: `Unanchor for ${rank} enemy placements.`,
            } as Record<string, string>
          )[preview.element]
        : ['lightning', 'nature'].includes(preview.element)
          ? `${rows} row(s) · ${hits} hit(s)${hasTarget ? ` · ${affected} blocks affected` : ''}`
          : preview.element === 'earth'
            ? `${rows === 20 ? 'Whole board' : `${rows} row(s)`} · fall until supported.`
            : preview.element === 'wind'
              ? `${rows} row(s) · one space ${direction === -1 ? 'left' : 'right'}.`
              : preview.element === 'water'
                ? `Fill ${rows} row(s)${hasTarget ? ` · ${preview.resolution.completed.length} complete` : ''}.`
                : `Burn ${rows} row(s). Grey blocks stay.`;
      outcome.textContent =
        hasTarget && preview.reason ? preview.reason : (mechanics ?? 'Affects the marked target.');
    } else {
      cost.textContent = '';
      outcome.textContent = definition?.description ?? 'Aim at the highlighted opponent.';
    }
  }
  const rowControls = mode === 'aim' && needsRow(),
    wind = selected === 'gale' || selected === 'arcane:wind';
  upButton.hidden = !rowControls;
  downButton.hidden = !rowControls;
  windLeft.hidden = !wind;
  windRight.hidden = !wind;
  windLeft.setAttribute('aria-pressed', String(direction === -1));
  windRight.setAttribute('aria-pressed', String(direction === 1));
  castButton.disabled =
    !preview || !hasTarget || preview.reason !== null || battle.status !== 'ongoing';
  for (const node of palette.querySelectorAll<HTMLButtonElement>('button'))
    node.setAttribute('aria-pressed', String(node.dataset.spell === selected));
}
function cast(): void {
  if (mode !== 'aim' || !selected || !preview || preview.reason || (needsRow() && target === null))
    return;
  const id = selected,
    chosen = preview.target;
  battle.paused = false;
  try {
    if (id.startsWith('arcane:')) battle.castArcane(id, chosen);
    else required(battle.combat).castSpell(id, chosen);
    saveGame(store, state);
    selected = null;
    target = null;
    preview = null;
    setMode('play');
  } catch (error) {
    battle.paused = true;
    outcome.textContent = error instanceof Error ? error.message : 'Unable to cast.';
  }
}
function resize(): void {
  const box = stage.getBoundingClientRect(),
    railWidth = rail.getBoundingClientRect().width,
    gap = window.innerWidth <= 600 ? 8 : 16;
  const cell = Math.max(
    1,
    Math.floor(Math.min(box.height / 20, (box.width - railWidth - gap) / 10, 30)),
  );
  root.style.setProperty('--cell', `${cell}px`);
}
function openExercises(): void {
  if (document.querySelector('dialog[open]')) return;
  const prior = mode;
  mode = 'paused';
  battle.paused = true;
  inputs.lockout();
  refresh();
  const dialog = el('dialog', { className: 'exercise-dialog' });
  dialog.append(
    el('h2', { text: 'Optional exercises' }),
    el('p', {
      text: 'The same falling-block controls and clocks stay active. Aim pauses play; Cast or Cancel resumes it.',
    }),
  );
  const choose = (index: number): void => {
    dialog.close();
    dialog.remove();
    reset(index);
  };
  dialog.append(button('Live workshop', () => choose(-1)));
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
new ResizeObserver(resize).observe(stage);
reset();
let previous = performance.now();
function frame(now: number): void {
  const dt = Math.min(100, Math.max(0, now - previous));
  previous = now;
  inputs.tick(now);
  if (mode === 'play' && battle.status === 'ongoing') {
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
      const y = 19,
        x = required(battle.board.grid[y]).findIndex((c) => c === null);
      if (x >= 0) {
        battle.interference.cast('ally', 'nature', 1, y, 1, 12000);
        battle.placeObstructions('ally', [{ x, y, strength: 1 }]);
      }
    }
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
  );
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
