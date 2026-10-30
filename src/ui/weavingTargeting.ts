import { spanFor } from '../core/boardMagic';
import type { Battle } from '../battle/battle';
import type { WeavePreview } from '../battle/weaving';
import type { MagicTarget } from '../battle/magicCasting';
import { visibleCells } from '../battle/rules';
import { button, el } from './dom';
import { magicGrid } from './magicTargeting';
export function openWeavingTargeting(
  battle: Battle,
  onConfirm: () => boolean = () => true,
  done: () => void = () => {},
): HTMLDialogElement {
  const dialog = el('dialog', { className: 'magic-target-dialog weaving-target' });
  const priorPaused = battle.paused;
  battle.paused = true;
  const targets: [MagicTarget, MagicTarget] = [
    { bottomRow: battle.board.height - 1, direction: 1 },
    { bottomRow: battle.board.height - 1, direction: 1 },
  ];
  const controls = el('div'),
    views = el('div', { className: 'weave-previews' }),
    message = el('p');
  message.setAttribute('role', 'status');
  const targetControls: { label: HTMLLabelElement; direction: HTMLSelectElement }[] = [];
  let preview: WeavePreview | null = null;
  const close = (): void => {
    battle.paused = priorPaused;
    dialog.close();
    dialog.remove();
    done();
  };
  const cast = button('Cast custom spell', () => {
    if (!preview || preview.reason) return;
    battle.paused = priorPaused;
    try {
      if (!onConfirm()) {
        battle.paused = true;
        return;
      }
      battle.castWeaving(preview);
      close();
    } catch (error) {
      battle.paused = true;
      message.textContent = error instanceof Error ? error.message : 'Unavailable.';
    }
  });
  const refresh = (): void => {
    try {
      preview = battle.previewWeaving(targets);
      const hidden =
        battle.rule?.id === 'dark'
          ? visibleCells(battle.board).map((r) => r.map((v) => !v))
          : undefined;
      views.replaceChildren(
        el(
          'section',
          {},
          el('h3', { text: 'Before' }),
          magicGrid(battle.board.magicState(), { hidden }),
        ),
      );
      preview.stages.forEach((stage, i) =>
        views.append(
          el(
            'section',
            {},
            el('h3', { text: `${i + 1}. ${stage.preview.name} · Lv ${stage.preview.rank}` }),
            magicGrid(stage.preview.resolution.state, { hidden }),
          ),
        ),
      );
      preview.stages.forEach((stage, index) => {
        const controls = targetControls[index];
        if (!controls) return;
        const [top, bottom] = spanFor(
          {
            element: stage.preview.element,
            rank: stage.preview.rank,
            bottomRow: stage.preview.target.bottomRow,
          },
          battle.board.height,
        );
        if (controls.label.firstChild)
          controls.label.firstChild.textContent = `${index + 1}. ${stage.preview.name} · rows ${top + 1}–${bottom + 1} from top `;
        controls.direction.hidden = stage.preview.element !== 'wind';
      });
      message.textContent = `${preview.name} · ${Object.entries(preview.cost)
        .map(([e, n]) => `${n} ${e}`)
        .join(
          ' + ',
        )} · ${preview.reason ?? 'Both effects cast in this order. Mana is spent once.'}`;
      cast.disabled = !!preview.reason;
    } catch (error) {
      cast.disabled = true;
      message.textContent = error instanceof Error ? error.message : 'Unavailable.';
    }
  };
  for (const [index, target] of targets.entries()) {
    const row = el('input');
    row.type = 'range';
    row.min = '1';
    row.max = String(battle.board.height);
    row.value = String(battle.board.height);
    row.setAttribute('aria-label', `Effect ${index + 1} target row`);
    const direction = el('select');
    direction.setAttribute('aria-label', `Effect ${index + 1} direction`);
    for (const [value, text] of [
      ['-1', 'Left'],
      ['1', 'Right'],
    ]) {
      const option = el('option', { text });
      option.value = value ?? '1';
      direction.append(option);
    }
    direction.value = '1';
    row.addEventListener('input', () => {
      target.bottomRow = Number(row.value) - 1;
      refresh();
    });
    direction.addEventListener('change', () => {
      target.direction = direction.value === '-1' ? -1 : 1;
      refresh();
    });
    const label = el('label', {}, `Effect ${index + 1} row `, row);
    targetControls.push({ label, direction });
    controls.append(label, direction);
  }
  dialog.append(
    el('h2', { text: 'Cast equipped weaving' }),
    message,
    views,
    controls,
    button('Cancel', close),
    cast,
  );
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  document.body.append(dialog);
  refresh();
  dialog.showModal();
  return dialog;
}
