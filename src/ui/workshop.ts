/** Guided, development-only practice; adventure saves are never touched. */
import { required } from '../core/required';
import { Battle } from '../battle/battle';
import type { CastPreview } from '../battle/magicCasting';
import { BOARD_SPELLS } from '../battle/magicCasting';
import { spanFor } from '../core/boardMagic';
import { createRng } from '../core/rng';
import { newKnownSpell } from '../game/spells';
import { ARCANE_ELEMENTS, createArcane } from '../game/arcane';
import { PRACTICES, PRACTICE_SPELLS, practiceProgress, setupPractice } from '../game/magicPractice';
import { newGame } from '../world/state';
import { loadGame, saveGame, type KeyValueStore } from '../game/save';
import { magicGrid } from './magicTargeting';
import { openArcaneEditor } from './arcaneEditor';
import { button, el } from './dom';
import './workshop.css';
if (!import.meta.env.DEV) throw new Error('The workshop is a development review fixture.');
const store: KeyValueStore = {
  getItem: (key) => localStorage.getItem(`magic-workshop:${key}`),
  setItem: (key, value) => localStorage.setItem(`magic-workshop:${key}`, value),
  removeItem: (key) => localStorage.removeItem(`magic-workshop:${key}`),
};
const state = loadGame(store) ?? newGame();
state.flags = new Set(['wyrmBeaten', 'scene:chapterEnd', 'boardMagicEnabled']);
if (!state.hero.arcane || Object.keys(state.hero.arcane).length === 0)
  state.hero.skillPoints = Math.max(100, state.hero.skillPoints);
const root = required(document.getElementById('workshop'));
let battle: Battle,
  lessonIndex = 0,
  selected = 'thunder',
  target: number | null = null,
  direction: -1 | 1 = 1,
  showResult = false,
  live = false,
  enemyClock = 0,
  enemySequence = 0;
let preview: CastPreview | null = null,
  lastBoard = '',
  finished = false;
const goalTitle = el('h2'),
  instruction = el('p'),
  progress = el('strong'),
  feedback = el('p', { className: 'workshop-feedback' }),
  boardPanel = el('section', { className: 'workshop-board' }),
  spellTitle = el('h3'),
  spellDescription = el('p'),
  cost = el('p', { className: 'workshop-cost' }),
  outcome = el('p', { className: 'workshop-outcome' }),
  palette = el('div', { className: 'spell-palette' }),
  arcanePalette = el('div', { className: 'spell-palette' }),
  viewLabel = el('span', { className: 'board-view-label' });
feedback.setAttribute('role', 'status');
outcome.setAttribute('aria-live', 'polite');
progress.setAttribute('role', 'status');
const buttons = new Map<string, HTMLButtonElement>();
const practice = () => required(PRACTICES[lessonIndex]);
const save = (): void => {
  saveGame(store, state);
};
function prepareSpells(): void {
  for (const id of [...Object.keys(BOARD_SPELLS), 'shadow'])
    state.hero.spells[id] = { ...newKnownSpell(), level: 4 };
}
const nextButton = button('Next exercise →', () =>
  loadLesson((lessonIndex + 1) % PRACTICES.length),
);
nextButton.className = 'primary next-exercise';
const castButton = button('Cast Lightning', () => cast());
castButton.className = 'primary cast-spell';
const resultButton = button('See result', () => {
  showResult = !showResult;
  refresh();
});
const left = button('← Left', () => {
    direction = -1;
    refresh();
  }),
  right = button('Right →', () => {
    direction = 1;
    refresh();
  });
const directions = el('div', { className: 'wind-direction' }, left, right);
const sendButton = button('Let Slime place its block', () => {
  if (document.querySelector('dialog[open]')) return;
  battle.paused = false;
  const effect = battle.interference.effect('slime');
  if (effect.delayMs > 0) {
    feedback.textContent = `Slime is delayed for ${(effect.delayMs / 1000).toFixed(1)} seconds. Turn on live practice to watch the delay.`;
    return;
  }
  battle.placeObstructions('slime', [{ x: 4, y: 18, strength: 2 }]);
  feedback.textContent =
    battle.board.grid[18]?.[4] === 'neutral'
      ? 'Slime sent a blank block. It can help complete a row.'
      : 'Slime placed a grey obstruction. Try Arcane + Nature before the next placement.';
  refresh();
});
function chooseSpell(id: string): void {
  selected = id;
  target = null;
  showResult = false;
  preview = null;
  feedback.textContent = '';
  if (!id.startsWith('arcane:')) required(state.hero.spells[id]).level = Number(rank.value);
  else {
    prepareSpells();
    for (const e of ARCANE_ELEMENTS) createArcane(state.hero, state.flags, e);
  }
  refresh();
}
for (const spell of PRACTICE_SPELLS) {
  const node = button(spell.name, () => chooseSpell(spell.id));
  node.style.setProperty(
    '--spell-color',
    {
      lightning: '#dbc460',
      nature: '#65b780',
      earth: '#d88e57',
      water: '#658de4',
      fire: '#df565b',
      wind: '#6ebfc9',
    }[spell.element],
  );
  node.dataset.spell = spell.id;
  buttons.set(spell.id, node);
  palette.append(node);
}
for (const element of ARCANE_ELEMENTS) {
  const name =
      element === 'earth'
        ? 'Gravity'
        : element === 'water'
          ? 'Ice'
          : element[0]?.toUpperCase() + element.slice(1),
    id = `arcane:${element}`,
    node = button(`Arcane + ${name}`, () => chooseSpell(id));
  buttons.set(id, node);
  arcanePalette.append(node);
}
const rank = el('select');
rank.setAttribute('aria-label', 'Practice spell rank');
for (let n = 1; n <= 4; n++) {
  const option = el('option', { text: `Rank ${n}` });
  option.value = String(n);
  rank.append(option);
}
rank.value = '1';
rank.addEventListener('change', () => chooseSpell(selected));
const lessonSelect = el('select');
lessonSelect.setAttribute('aria-label', 'Exercise');
PRACTICES.forEach((lesson, i) => {
  const option = el('option', { text: `${i + 1}. ${lesson.title}` });
  option.value = String(i);
  lessonSelect.append(option);
});
lessonSelect.addEventListener('change', () => loadLesson(Number(lessonSelect.value)));
const liveButton = button('Start live practice', () => {
  live = !live;
  liveButton.textContent = live ? 'Pause live practice' : 'Start live practice';
  target = null;
  showResult = false;
  feedback.textContent = live
    ? 'Pieces are falling and Slime can send obstructions. Choosing a target pauses the action.'
    : 'Paused. Take your time choosing a spell and row.';
  refresh();
});
const pieceControls = el(
  'div',
  { className: 'workshop-actions' },
  ...(['left', 'rotate', 'right', 'hardDrop'] as const).map((action, i) =>
    button(['← Move', 'Rotate', 'Move →', 'Drop'][i] ?? action, () => {
      if (!battle.paused) {
        battle.input(action);
        target = null;
        showResult = false;
        refresh();
      }
    }),
  ),
);
const advanced = el(
  'details',
  { className: 'more-practice' },
  el('summary', { text: 'More practice options' }),
  el('label', { text: 'Exercise' }, lessonSelect),
  el('label', { text: 'Spell strength' }, rank),
  button('Arcane upgrades', () => {
    battle.paused = true;
    openArcaneEditor(state.hero, state.flags, save, () => {
      battle.paused = false;
      refresh();
    });
  }),
  liveButton,
  pieceControls,
  button('Refill practice mana', () => {
    for (const e of Object.keys(state.hero.mana))
      state.hero.mana[e as keyof typeof state.hero.mana] = 100;
    refresh();
  }),
);
const resetButton = button('Reset', () => loadLesson(lessonIndex));
resetButton.setAttribute('aria-label', 'Reset exercise');
root.append(
  el(
    'header',
    {},
    el('h1', { text: 'Spell practice' }),
    el('p', { text: 'Choose → Target → Cast' }),
    resetButton,
  ),
  el('section', { className: 'practice-goal' }, goalTitle, instruction, progress),
  el(
    'div',
    { className: 'workshop-layout' },
    el('div', { className: 'board-column' }, viewLabel, boardPanel),
    el(
      'aside',
      {},
      palette,
      arcanePalette,
      el(
        'section',
        { className: 'selected-spell' },
        spellTitle,
        spellDescription,
        directions,
        cost,
      ),
      feedback,
    ),
  ),
  el(
    'section',
    { className: 'cast-bar' },
    outcome,
    el('div', { className: 'cast-actions' }, resultButton, castButton, nextButton),
  ),
  el('footer', {}, advanced),
);
function loadLesson(index: number): void {
  lessonIndex = index;
  lessonSelect.value = String(index);
  prepareSpells();
  rank.value = '1';
  for (const element of ARCANE_ELEMENTS) createArcane(state.hero, state.flags, element);
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
  required(battle.combat).gauge = -1e9;
  setupPractice(battle, practice());
  live = false;
  liveButton.textContent = 'Start live practice';
  enemyClock = 0;
  enemySequence = 0;
  finished = false;
  lastBoard = '';
  chooseSpell(practice().spell);
}
function description(): string {
  if (!selected.startsWith('arcane:'))
    return PRACTICE_SPELLS.find((s) => s.id === selected)?.description ?? '';
  return (
    (
      {
        fire: 'Let red blocks satisfy this opponent’s color requirements.',
        water: 'Delay the opponent’s next obstruction.',
        wind: 'Shift the opponent’s upcoming obstructions.',
        lightning: 'Weaken the opponent’s grey obstructions.',
        nature: 'Make the opponent’s next obstruction a blank block.',
        earth: 'Unanchor the opponent’s obstructions so they fall.',
      } as Record<string, string>
    )[selected.slice(7)] ?? ''
  );
}
function refresh(): void {
  if (!battle) return;
  const lesson = practice(),
    arcane = selected.startsWith('arcane:'),
    needsRow = !arcane || selected === 'arcane:lightning';
  const spell = PRACTICE_SPELLS.find((s) => s.id === selected),
    name = arcane
      ? `Arcane + ${selected.endsWith('earth') ? 'Gravity' : selected.endsWith('water') ? 'Ice' : selected.slice(7, 8).toUpperCase() + selected.slice(8)}`
      : (spell?.name ?? selected);
  goalTitle.textContent = `${lessonIndex + 1} / ${PRACTICES.length} · ${lesson.title}`;
  instruction.textContent = lesson.instruction;
  liveButton.textContent = live ? 'Pause live practice' : 'Start live practice';
  const goal = practiceProgress(battle, lesson);
  progress.textContent = goal.label;
  progress.className = goal.done ? 'complete' : '';
  if (goal.done && !finished) {
    finished = true;
    live = false;
    feedback.textContent = 'That worked. Ready for the next exercise.';
  }
  nextButton.hidden = !goal.done;
  castButton.hidden = goal.done;
  resultButton.hidden = goal.done;
  palette.hidden = arcane;
  arcanePalette.hidden = !arcane;
  sendButton.hidden = lesson.goal !== 'incoming';
  for (const [id, node] of buttons) node.setAttribute('aria-pressed', String(id === selected));
  spellTitle.textContent = name;
  spellDescription.textContent = description();
  castButton.textContent = `Cast ${name}`;
  directions.hidden = !selected.endsWith('wind') && selected !== 'gale';
  left.setAttribute('aria-pressed', String(direction === -1));
  right.setAttribute('aria-pressed', String(direction === 1));
  preview = null;
  if (!needsRow || target !== null)
    try {
      preview = battle.magicCasting.preview(selected, { bottomRow: target ?? 19, direction });
    } catch (error) {
      outcome.textContent = error instanceof Error ? error.message : 'Choose a spell.';
    }
  const span =
    preview && needsRow
      ? spanFor(
          { element: preview.element, rank: preview.rank, bottomRow: preview.target.bottomRow },
          battle.board.height,
        )
      : undefined;
  const shown = showResult && preview ? preview.resolution.state : battle.board.magicState();
  const active = battle.board.active;
  if (live && !showResult && active)
    for (const [dx, dy] of active.cells) {
      const x = active.x + dx,
        y = active.y + dy;
      if (y >= 0 && y < battle.board.height && x >= 0 && x < battle.board.width)
        required(shown.grid[y])[x] = active.color;
    }
  const crop = live ? 0 : 14;
  const key = JSON.stringify([shown, span, showResult, crop, lesson.targets]);
  if (key !== lastBoard) {
    const visible = {
      ...shown,
      grid: shown.grid.slice(crop),
      tags: shown.tags.slice(crop),
      obstructions: Object.fromEntries(
        Object.entries(shown.obstructions).map(([key, o]) => {
          const [x, y] = key.split(',').map(Number);
          return [`${x},${Number(y) - crop}`, o];
        }),
      ),
    };
    const grid = magicGrid(visible, {
      ...(span ? { selected: [span[0] - crop, span[1] - crop] as const } : {}),
      onRow: (y) => {
        target = y + crop;
        showResult = false;
        feedback.textContent = '';
        refresh();
      },
    });
    grid.setAttribute(
      'aria-label',
      showResult ? 'Preview of spell result' : 'Practice board — tap a row to target it',
    );
    for (const [x, y] of lesson.targets ?? []) {
      const square = grid.children[y - crop]?.children[x];
      if (square) {
        square.classList.add('goal-square');
        square.setAttribute('title', 'Move a block here');
      }
    }
    boardPanel.replaceChildren(grid);
    lastBoard = key;
  }
  viewLabel.textContent = showResult ? 'Preview — nothing has changed yet' : 'Your board';
  resultButton.textContent = showResult ? 'Back to board' : 'See result';
  resultButton.disabled = preview === null;
  battle.paused = (live && target !== null) || document.querySelector('dialog[open]') !== null;
  if (preview) {
    cost.textContent = Object.entries(preview.cost)
      .map(
        ([e, n]) =>
          `${n} ${e === 'earth' ? 'earth' : e === 'water' ? 'water' : e} mana (${state.hero.mana[e as keyof typeof state.hero.mana]} available)`,
      )
      .join(' + ');
    if (preview.reason)
      outcome.textContent =
        preview.reason === 'This cast would change nothing.'
          ? 'Nothing here for this spell. Tap a different row.'
          : preview.reason;
    else if (arcane) outcome.textContent = description();
    else {
      const before = battle.board.magicState(),
        after = preview.resolution.state;
      const removed = Object.keys(before.obstructions).filter(
        (key) => !after.obstructions[key],
      ).length;
      const weakened = Object.entries(before.obstructions).filter(
        ([key, o]) => (after.obstructions[key]?.strength ?? o.strength) < o.strength,
      ).length;
      outcome.textContent = preview.resolution.completed.length
        ? `This will clear ${preview.resolution.completed.length} row${preview.resolution.completed.length === 1 ? '' : 's'}.`
        : removed
          ? `This will ${selected === 'natureConvert' ? 'convert' : 'remove'} ${removed} obstruction${removed === 1 ? '' : 's'}.`
          : weakened
            ? `This will weaken ${weakened} obstruction${weakened === 1 ? '' : 's'}.`
            : selected === 'quake'
              ? 'The highlighted blocks will fall.'
              : selected === 'gale'
                ? `The highlighted blocks will move ${direction === -1 ? 'left' : 'right'}.`
                : 'The highlighted blocks will burn away.';
    }
  } else {
    cost.textContent = 'Practice mana is provided.';
    outcome.textContent = needsRow
      ? 'Tap a row on the board to choose your target.'
      : 'Choose an Arcane spell.';
  }
  castButton.disabled = !preview || preview.reason !== null || goal.done;
}
function cast(): void {
  if (!preview || preview.reason) return;
  battle.paused = false;
  try {
    if (selected.startsWith('arcane:')) battle.castArcane(selected, preview.target);
    else required(battle.combat).castSpell(selected, preview.target);
    feedback.textContent = 'Spell cast.';
    if (live) target = null;
    showResult = false;
    save();
    refresh();
  } catch (error) {
    feedback.textContent = error instanceof Error ? error.message : 'Unable to cast.';
    refresh();
  }
}
// Keep the character's next action visible beside Arcane, rather than among debug counters.
arcanePalette.after(el('div', { className: 'opponent-action' }, sendButton));
loadLesson(0);
document.addEventListener('keydown', (event) => {
  if (document.querySelector('dialog[open]') || event.target instanceof HTMLSelectElement) return;
  if (event.key === 'Escape') {
    target = null;
    showResult = false;
    refresh();
    return;
  }
  const action = (
    { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ' ': 'hardDrop' } as const
  )[event.key as 'ArrowLeft'];
  if (action && live && !battle.paused) {
    event.preventDefault();
    battle.input(action);
    refresh();
  }
});
let previous = performance.now();
function frame(now: number): void {
  const dt = Math.min(100, Math.max(0, now - previous));
  previous = now;
  if (live && !battle.paused && battle.status === 'ongoing') {
    battle.update(dt);
    enemyClock += dt;
    if (enemyClock > 8000) {
      enemyClock = 0;
      battle.placeObstructions('slime', [
        { x: 1 + ((enemySequence++ * 3) % 8), y: 15, strength: 2 },
      ]);
    }
    refresh();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
