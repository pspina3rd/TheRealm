import type { Battle } from '../battle/battle';
import { ITEMS } from '../data/items';
import { SPELLS } from '../data/spells';
import { cannotUseReason, spellCost } from '../game/hero';
import type { Feedback } from './art/feedback';
import { ELEMENT_ICONS, type IconId } from './art/icons';
import { button, byId, el } from './dom';
import { iconElement } from './iconDraw';
import { ManaBars, costIcons } from './manaBars';

/** Icon for a usable item, from what it does. */
function itemIcon(itemId: string): IconId {
  const use = ITEMS[itemId]?.use;
  return use?.mana ? 'potion' : 'heart';
}

/**
 * The hero's side of the battle screen: HP, the seven mana pools, and spell
 * and item buttons. Spells show their element and an icon cost; buttons you
 * can't use are dimmed, and pressing one shakes it.
 */
export class HeroPanel {
  private readonly hpFill = byId('battle-hp-fill');
  private readonly hpText = byId('battle-hp-text');
  private readonly spellList = byId('spell-list');
  private readonly itemList = byId('battle-items');
  private readonly actions = byId('actions-panel');
  private readonly mana: ManaBars;
  private controlsKey = '';

  onCast: (spellId: string) => void = () => {};
  onItem: (itemId: string) => void = () => {};

  constructor() {
    byId('battle-hp-icon').replaceChildren(iconElement('heart', 2, 'HP'));
    this.mana = new ManaBars(byId('battle-mana'));
  }

  play(feedback: Feedback): void {
    if (feedback.kind === 'mana') this.mana.pulse(feedback.elements, feedback.direction);
  }

  /** Shakes a spell or item button that couldn't be used. */
  deny(id: string): void {
    const node = document.querySelector<HTMLElement>(`[data-action="${id}"]`);
    if (!node) return;
    node.classList.remove('denied');
    void node.offsetWidth;
    node.classList.add('denied');
  }

  render(battle: Battle): void {
    const hero = battle.hero;
    this.hpFill.style.width = `${(100 * hero.hp) / hero.maxHp}%`;
    this.hpText.textContent = `${hero.hp}/${hero.maxHp}`;
    this.mana.update(hero);

    const combat = battle.combat;
    this.actions.hidden = !combat;
    const ongoing = battle.status === 'ongoing' && !battle.paused;
    const key = JSON.stringify([
      hero.mana,
      hero.hp,
      hero.items,
      hero.spells,
      ongoing,
      Boolean(combat),
    ]);
    if (key === this.controlsKey) return;
    this.controlsKey = key;

    this.spellList.replaceChildren(
      ...(combat
        ? hero.spells.flatMap((id, index) => {
            const spell = SPELLS[id];
            if (!spell) return [];
            const usable = ongoing && combat.cannotCastReason(id) === null;
            const node = button('', () => this.onCast(id), { title: spell.description });
            node.dataset.action = id;
            node.classList.add('spell');
            node.classList.toggle('unusable', !usable);
            node.setAttribute('aria-keyshortcuts', String(index + 1));
            node.append(
              iconElement(ELEMENT_ICONS[spell.element], 3),
              el('span', {}, el('b', { text: spell.name }), costIcons(spellCost(hero, spell))),
              el('kbd', { text: String(index + 1) }),
            );
            return [node];
          })
        : []),
    );

    const usable = Object.entries(hero.items).filter(([id]) => {
      const use = ITEMS[id]?.use;
      return Boolean(use?.heal || use?.mana);
    });
    this.itemList.replaceChildren(
      ...(combat
        ? usable.map(([id, count]) => {
            const item = ITEMS[id];
            const node = button('', () => this.onItem(id), { title: item?.description ?? id });
            node.dataset.action = id;
            node.classList.add('item');
            node.classList.toggle(
              'unusable',
              !ongoing || !item || cannotUseReason(hero, item) !== null,
            );
            node.append(
              iconElement(itemIcon(id), 2),
              el('span', { text: `${item?.name ?? id} ×${count}` }),
            );
            return node;
          })
        : []),
    );
  }
}
