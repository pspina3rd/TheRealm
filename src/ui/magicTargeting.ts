import { visibleCells } from '../battle/rules';
import { required } from '../core/required';
import type { Battle } from '../battle/battle';
import type { MagicState } from '../core/boardMagic';
import { spanFor } from '../core/boardMagic';
import type { CastPreview } from '../battle/magicCasting';
import { button, el } from './dom';
import './magic.css';
export const MAGIC_COLORS: Readonly<Record<string, string>> = {
  red: '#df565b',
  blue: '#658de4',
  green: '#65b780',
  gold: '#dbc460',
  orange: '#d88e57',
  violet: '#a17ed8',
  cyan: '#6ebfc9',
  stone: '#444957',
  neutral: '#c4c7cb',
};
export function magicGrid(
  state: MagicState,
  options: {
    onRow?: (y: number) => void;
    selected?: readonly [number, number];
    hidden?: boolean[][];
  } = {},
): HTMLElement {
  const grid = el('div', { className: 'magic-grid' });
  grid.style.setProperty('--columns', String(state.grid[0]?.length ?? 10));
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', 'Spell result preview');
  state.grid.forEach((row, y) => {
    const line = el('div', { className: 'magic-row' });
    line.setAttribute('role', 'row');
    if (options.selected && y >= options.selected[0] && y <= options.selected[1])
      line.classList.add('selected');
    if (options.onRow) line.addEventListener('click', () => required(options.onRow)(y));
    row.forEach((cell, x) => {
      const square = el('span', { className: 'magic-square' });
      square.setAttribute('role', 'gridcell');
      if (options.hidden?.[y]?.[x]) {
        square.textContent = '?';
        square.setAttribute('aria-label', 'Hidden');
        line.append(square);
        return;
      }
      const obstruction = state.obstructions[`${x},${y}`];
      if (cell) {
        square.style.backgroundColor = MAGIC_COLORS[cell] ?? '#888';
        square.textContent =
          cell === 'neutral' ? '□' : cell === 'stone' ? '◆' : required(cell[0]).toUpperCase();
      }
      square.setAttribute(
        'aria-label',
        obstruction
          ? `${obstruction.owner} obstruction, ${obstruction.strength} strength, ${obstruction.anchored ? 'anchored' : 'falling'}`
          : (cell ?? 'empty'),
      );
      if (obstruction) {
        square.classList.add('obstruction');
        square.style.setProperty('--strength', String(obstruction.strength));
        square.textContent = Array.from({ length: obstruction.strength }, () => '•').join('');
        const step = obstruction.sequence[obstruction.step];
        if (step)
          for (const side of step.sides) {
            const edge = el('i', { className: `magic-edge ${side}` });
            edge.style.backgroundColor = required(MAGIC_COLORS[step.color]);
            square.append(edge);
          }
        if (obstruction.sequence.length - obstruction.step > 1) {
          square.classList.add('multi-touch');
          const marks = el('small', {
            text: obstruction.sequence
              .slice(obstruction.step)
              .map((s) => required(s.color[0]).toUpperCase())
              .join('→'),
          });
          square.append(marks);
        }
        square.setAttribute(
          'aria-label',
          `${square.getAttribute('aria-label')}${step ? '; needs ' + step.color + ' on ' + step.sides.join('/') : ''}`,
        );
        square.title = `${square.getAttribute('aria-label')}${step ? `; touch ${step.color} on ${step.sides.join('/')}` : ''}`;
      }
      line.append(square);
    });
    grid.append(line);
  });
  return grid;
}
/** A cancelable targeting session. Pausing here does not spend one of the player's pauses. */
export function openMagicTargeting(
  battle: Battle,
  id: string,
  onConfirm: () => boolean = () => true,
  onDone: () => void = () => {},
): HTMLDialogElement {
  const dialog = el('dialog', { className: 'magic-target-dialog' }),
    title = el('h2', { text: 'Choose spell target' }),
    message = el('p'),
    boards = el('div', { className: 'magic-preview-pair' });
  const row = el('input');
  row.type = 'range';
  row.min = '1';
  row.max = String(battle.board.height);
  row.value = String(battle.board.height);
  row.setAttribute('aria-label', 'Bottom target row from top');
  const direction = el('select');
  direction.setAttribute('aria-label', 'Wind direction');
  for (const [value, text] of [
    ['-1', 'Left'],
    ['1', 'Right'],
  ]) {
    const option = el('option', { text });
    option.value = required(value);
    direction.append(option);
  }
  direction.value = '1';
  const status = el('p');
  status.setAttribute('role', 'status');
  let preview: CastPreview | null = null;
  const priorPaused = battle.paused;
  battle.paused = true;
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    battle.paused = priorPaused;
    dialog.close();
    dialog.remove();
    onDone();
  };
  const confirm = button('Cast', () => {
    if (!preview || preview.reason) return;
    battle.paused = priorPaused;
    try {
      if (!onConfirm()) {
        battle.paused = true;
        return;
      }
      if (id.startsWith('arcane:')) battle.castArcane(id, preview.target);
      else battle.combat?.castSpell(id, preview.target);
      close();
    } catch (error) {
      battle.paused = true;
      status.textContent = error instanceof Error ? error.message : 'Cast unavailable.';
      refresh();
    }
  });
  const refresh = (): void => {
    try {
      preview = battle.magicCasting.preview(id, {
        bottomRow: Number(row.value) - 1,
        direction: direction.value === '-1' ? -1 : 1,
      });
      const span = spanFor(
        { element: preview.element, rank: preview.rank, bottomRow: preview.target.bottomRow },
        battle.board.height,
      );
      title.textContent = preview.name;
      message.textContent = `Rank ${preview.rank} · ${Object.entries(preview.cost)
        .map(([e, n]) => `${n} ${e}`)
        .join(' + ')} · rows ${span[0] + 1}–${span[1] + 1} from top`;
      const hidden =
        battle.rule?.id === 'dark'
          ? visibleCells(battle.board).map((row) => row.map((visible) => !visible))
          : undefined;
      const before = el(
        'section',
        {},
        el('h3', { text: 'Before' }),
        magicGrid(battle.board.magicState(), {
          hidden,
          selected: span,
          onRow: (y) => {
            row.value = String(y + 1);
            refresh();
          },
        }),
      );
      const after = el(
        'section',
        {},
        el('h3', { text: 'After' }),
        magicGrid(preview.resolution.state, { hidden }),
      );
      boards.replaceChildren(before, after);
      status.textContent = preview.reason ?? 'Preview ready. Mana is spent only when you cast.';
      confirm.disabled = preview.reason !== null;
    } catch (error) {
      preview = null;
      confirm.disabled = true;
      status.textContent = error instanceof Error ? error.message : 'Unavailable.';
    }
  };
  row.addEventListener('input', refresh);
  direction.addEventListener('change', refresh);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  dialog.append(
    title,
    message,
    boards,
    el('label', { text: 'Target row' }, row),
    direction,
    status,
    el('div', { className: 'magic-actions' }, button('Cancel', close), confirm),
  );
  document.body.append(dialog);
  refresh();
  dialog.showModal();
  return dialog;
}
