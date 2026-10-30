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
  const controls = el('div', { className: 'weave-target-controls' }),
    views = el('div', { className: 'weave-previews' }),
    message = el('p');
  message.setAttribute('role', 'status');
  const targetControls: {
    label: HTMLLabelElement;
    direction: HTMLSelectElement;
    group: HTMLElement;
  }[] = [];
  let selectedPhase = 0;
  const tabs = el('div', { className: 'weave-phase-tabs' });
  tabs.setAttribute('role', 'tablist');
  const tabButtons: HTMLButtonElement[] = [];
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
      views.dataset.phase = String(selectedPhase);
      controls.dataset.phase = String(selectedPhase);
      tabButtons.forEach((tab, i) =>
        tab.setAttribute('aria-selected', String(i === selectedPhase)),
      );
      const spans = preview.stages.map((s) =>
        spanFor(
          {
            element: s.preview.element,
            rank: s.preview.rank,
            bottomRow: s.preview.target.bottomRow,
          },
          battle.board.height,
        ),
      );
      views.replaceChildren(
        el(
          'section',
          { className: 'weave-before' },
          el('h3', { text: 'Before · aim effect 1' }),
          magicGrid(battle.board.magicState(), {
            hidden,
            selected: spans[0],
            onRow: (y) => {
              targets[0].bottomRow = y;
              refresh();
            },
          }),
        ),
      );
      preview.stages.forEach((stage, i) =>
        views.append(
          el(
            'section',
            { className: `weave-after-${i + 1}` },
            el('h3', {
              text: `${i + 1}. ${stage.preview.name} · Lv ${stage.preview.rank} · ${Object.entries(
                stage.preview.cost,
              )
                .map(([e, n]) => `${n} ${e}`)
                .join(' + ')}`,
            }),
            magicGrid(stage.preview.resolution.state, {
              hidden,
              selected: i === 0 ? spans[1] : undefined,
              onRow:
                i === 0
                  ? (y) => {
                      targets[1].bottomRow = y;
                      refresh();
                    }
                  : undefined,
            }),
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
      const short = Object.entries(preview.cost)
        .filter(([e, n]) => battle.hero.mana[e as keyof typeof battle.hero.mana] < n)
        .map(
          ([e, n]) =>
            `${n - battle.hero.mana[e as keyof typeof battle.hero.mana]} more ${e} needed (held ${battle.hero.mana[e as keyof typeof battle.hero.mana]}, cost ${n})`,
        )
        .join('; ');
      message.textContent = `${preview.name} · ${Object.entries(preview.cost)
        .map(([e, n]) => `${n} ${e}`)
        .join(
          ' + ',
        )} · ${short || preview.reason || 'Both effects cast in this order. Mana is spent once.'}`;
      cast.disabled = !!preview.reason;
      if (matchMedia('(max-width: 480px)').matches)
        requestAnimationFrame(() => {
          const active = views.children[selectedPhase];
          const marked = active?.querySelectorAll<HTMLElement>('.magic-row.selected');
          const first = marked?.[0],
            last = marked?.[marked.length - 1];
          if (!first || !last) return;
          const box = views.getBoundingClientRect(),
            end = last.getBoundingClientRect(),
            start = first.getBoundingClientRect();
          if (end.bottom > box.bottom) views.scrollTop += end.bottom - box.bottom + 2;
          else if (start.top < box.top) views.scrollTop -= box.top - start.top + 2;
        });
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
    const group = el('section', { className: `weave-control-${index}` }, label, direction);
    targetControls.push({ label, direction, group });
    controls.append(group);
  }
  for (const [index, text] of ['Before · aim 1', 'After 1 · aim 2', 'After 2 · result'].entries()) {
    const tab = button(text, () => {
      selectedPhase = index;
      refresh();
    });
    tab.setAttribute('role', 'tab');
    tabButtons.push(tab);
    tabs.append(tab);
  }
  const footer = el(
    'div',
    { className: 'weave-cast-footer' },
    message,
    el('div', {}, button('Cancel', close), cast),
  );
  dialog.append(el('h2', { text: 'Cast custom spell' }), tabs, controls, views, footer);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  document.body.append(dialog);
  refresh();
  dialog.showModal();
  return dialog;
}
