import type { Hero } from '../game/hero';
import {
  WEAVE_UPGRADE_COSTS,
  emptyWeaving,
  saveWeave,
  upgradeWeave,
  weaveCost,
  weaveCap,
  weaveReason,
  WEAVE_NAMES,
  WEAVE_SPELLS,
  type WeaveRecipe,
  type WeaveSpell,
} from '../game/weaving';
import { button, el } from './dom';
import './magic.css';
const costText = (cost: object): string =>
  Object.entries(cost)
    .map(([e, n]) => `${n} ${e}`)
    .join(' + ');
export function openWeavingEditor(
  hero: Hero,
  flags: ReadonlySet<string>,
  save: () => void,
  done: () => void = () => {},
): HTMLDialogElement {
  const dialog = el('dialog', { className: 'magic-target-dialog weaving-editor' });
  const book = (hero.weaving ??= emptyWeaving());
  let draft: WeaveRecipe;
  const fresh = (): WeaveRecipe => {
    let serial = 1;
    while (book.recipes.some((r) => r.id === `weave:${serial}`)) serial++;
    const learned = WEAVE_SPELLS.filter((id) => (hero.spells[id]?.level ?? 0) >= 2);
    return {
      id: `weave:${serial}`,
      name: 'Custom spell',
      level: 1,
      stages: [
        { spell: learned[0] ?? 'fire', rank: 1 },
        { spell: learned[1] ?? learned[0] ?? 'quake', rank: 1 },
      ],
    };
  };
  draft = structuredClone(book.recipes.find((r) => r.id === book.equipped) ?? fresh());
  const close = (): void => {
    dialog.close();
    dialog.remove();
    done();
  };
  const render = (): void => {
    dialog.replaceChildren(
      el('h2', { text: 'Arcane Weaving' }),
      el('p', {
        text: 'Equip a custom spell. Its two effects cast in the order shown; each uses your chosen strength.',
      }),
    );
    const name = el('input');
    name.value = draft.name;
    name.maxLength = 80;
    name.setAttribute('aria-label', 'Custom spell name');
    name.addEventListener('input', () => {
      draft.name = name.value;
    });
    dialog.append(
      el('label', {}, 'Name ', name),
      el('p', { text: `Weaving level ${draft.level} · ${hero.skillPoints} skill points` }),
    );
    const mastery = el('p', {
      className: 'weave-mastery',
      text: `Effect strengths are capped at Lv ${draft.level} by this custom spell's mastery, and by each source spell's learned level.`,
    });
    const price = WEAVE_UPGRADE_COSTS[draft.level - 1];
    dialog.append(
      mastery,
      el('p', {
        text:
          book.equipped === draft.id
            ? `Equipped: ${draft.name}`
            : `Editing: ${draft.name} · not equipped`,
      }),
    );
    if (price !== undefined)
      dialog.append(
        button(
          `Unlock Lv ${draft.level + 1} strengths · ${price} points`,
          () => {
            if (
              hero.skillPoints < price ||
              draft.level >= weaveCap(hero, draft.stages) ||
              weaveReason(hero, flags, draft)
            )
              return;
            const priorEquipped = book.equipped;
            if (saveWeave(hero, flags, draft) && upgradeWeave(hero, flags, draft.id)) {
              book.equipped = priorEquipped;
              const upgraded = book.recipes.find((r) => r.id === draft.id);
              if (upgraded) draft = structuredClone(upgraded);
              save();
              render();
            }
          },
          {
            disabled:
              hero.skillPoints < price ||
              draft.level >= weaveCap(hero, draft.stages) ||
              !!weaveReason(hero, flags, draft),
          },
        ),
      );
    for (const [index, stage] of draft.stages.entries()) {
      const spell = el('select');
      spell.setAttribute('aria-label', `Effect ${index + 1}`);
      for (const id of WEAVE_SPELLS) {
        const option = el('option', {
          text: `${WEAVE_NAMES[id]} · learned Lv ${hero.spells[id]?.level ?? 0}`,
        });
        option.value = id;
        option.disabled = (hero.spells[id]?.level ?? 0) < 2;
        spell.append(option);
      }
      spell.value = stage.spell;
      const strength = el('select');
      strength.setAttribute('aria-label', `Effect ${index + 1} strength`);
      for (const rank of [1, 2, 3, 4]) {
        const option = el('option', { text: `Lv ${rank}` });
        option.value = String(rank);
        option.disabled = rank > Math.min(draft.level, hero.spells[stage.spell]?.level ?? 0);
        strength.append(option);
      }
      strength.value = String(stage.rank);
      spell.addEventListener('change', () => {
        stage.spell = spell.value as WeaveSpell;
        stage.rank = Math.min(stage.rank, hero.spells[stage.spell]?.level ?? 1);
        render();
      });
      strength.addEventListener('change', () => {
        stage.rank = Number(strength.value);
        render();
      });
      dialog.append(
        el(
          'section',
          { className: 'weave-stage' },
          el('h3', { text: `${index + 1}. ${WEAVE_NAMES[stage.spell]}` }),
          spell,
          strength,
        ),
      );
    }
    let cost = 'Choose learned spells.';
    try {
      cost = costText(weaveCost(hero, draft));
    } catch {
      /* Unlearned draft stays unavailable. */
    }
    const reason = weaveReason(hero, flags, draft);
    dialog.append(
      el('p', { className: 'weave-cost', text: `Casting cost: ${cost}` }),
      el('p', { text: reason ?? 'Ready to equip. Editing spends no mana.' }),
      button('Reverse order', () => {
        draft.stages.reverse();
        render();
      }),
      button(
        'Save and equip',
        () => {
          if (saveWeave(hero, flags, draft)) {
            save();
            render();
          }
        },
        { disabled: !!reason },
      ),
    );
    if (book.equipped)
      dialog.append(
        button('Unequip custom spell', () => {
          book.equipped = null;
          save();
          render();
        }),
      );
    dialog.append(el('h3', { text: 'Saved spells' }));
    for (const recipe of book.recipes)
      dialog.append(
        button(`${recipe.id === book.equipped ? 'Equipped: ' : ''}${recipe.name}`, () => {
          draft = structuredClone(recipe);
          render();
        }),
      );
    dialog.append(
      button('New custom spell', () => {
        draft = fresh();
        render();
      }),
      button('Done', close),
    );
  };
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  document.body.append(dialog);
  render();
  dialog.showModal();
  return dialog;
}
