import {
  ARCANE_ELEMENTS,
  ARCANE_BASE,
  ARCANE_UPGRADE_COSTS,
  arcaneCap,
  arcaneRank,
  arcaneUnlocked,
  createArcane,
  upgradeArcane,
} from '../game/arcane';
import type { Hero } from '../game/hero';
import { button, el } from './dom';
import './magic.css';
export function openArcaneEditor(
  hero: Hero,
  flags: ReadonlySet<string>,
  save: () => void,
  onDone: () => void = () => {},
): HTMLDialogElement {
  const dialog = el('dialog', { className: 'magic-target-dialog' });
  const render = (): void => {
    dialog.replaceChildren(
      el('h2', { text: 'Arcane Weaving' }),
      el('p', {
        text: `${hero.skillPoints} skill points · upgrades use the same XP-earned points as your other skills.`,
      }),
    );
    if (!arcaneUnlocked(flags))
      dialog.append(el('p', { text: 'Unlocks after the Moon Wyrm aftermath.' }));
    for (const element of ARCANE_ELEMENTS) {
      const rank = arcaneRank(hero, element),
        cap = arcaneCap(hero, element),
        cost = ARCANE_UPGRADE_COSTS[rank - 1];
      const row = el(
        'section',
        { className: 'arcane-editor-row' },
        el('h3', {
          text: `Arcane + ${element === 'earth' ? 'Gravity' : element === 'water' ? 'Ice' : element} · ${rank ? `rank ${rank}` : 'not created'}`,
        }),
        el('p', {
          text: `Requires Shadow Drain and ${ARCANE_BASE[element]} at rank 2. Current rank cap: ${cap}.`,
        }),
      );
      row.append(
        button(
          rank === 0
            ? 'Create pairing'
            : rank >= 4
              ? 'Maximum rank'
              : `Upgrade · ${cost ?? 0} points`,
          () => {
            const changed =
              rank === 0 ? createArcane(hero, flags, element) : upgradeArcane(hero, flags, element);
            if (changed) save();
            render();
          },
          {
            disabled:
              !arcaneUnlocked(flags) ||
              (rank === 0 ? cap < 2 : rank >= cap || cost === undefined || hero.skillPoints < cost),
          },
        ),
      );
      dialog.append(row);
    }
    dialog.append(
      button('Done', () => {
        dialog.close();
        dialog.remove();
        onDone();
      }),
    );
  };
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    dialog.close();
    dialog.remove();
    onDone();
  });
  document.body.append(dialog);
  render();
  dialog.showModal();
  return dialog;
}

import type { Battle } from '../battle/battle';
import { openMagicTargeting } from './magicTargeting';
export function openArcaneChooser(
  battle: Battle,
  onConfirm: () => boolean,
  onDone: () => void,
): void {
  const dialog = el('dialog', { className: 'magic-target-dialog' }),
    paused = battle.paused;
  battle.paused = true;
  const close = (): void => {
    battle.paused = paused;
    dialog.close();
    dialog.remove();
  };
  dialog.append(el('h2', { text: 'Choose Arcane pairing' }));
  let count = 0;
  for (const e of ARCANE_ELEMENTS) {
    const rank = arcaneRank(battle.hero, e);
    if (rank < 1) continue;
    count++;
    dialog.append(
      button(`Arcane + ${e} · rank ${rank}`, () => {
        close();
        openMagicTargeting(battle, `arcane:${e}`, onConfirm, onDone);
      }),
    );
  }
  if (count === 0)
    dialog.append(el('p', { text: 'Create a pairing in Arcane Weaving outside battle.' }));
  dialog.append(
    button('Cancel', () => {
      close();
      onDone();
    }),
  );
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
    onDone();
  });
  document.body.append(dialog);
  dialog.showModal();
}
