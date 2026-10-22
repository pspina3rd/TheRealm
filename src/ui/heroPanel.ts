import type { Battle } from '../battle/battle';
import { ITEMS } from '../data/items';
import { ELEMENT_NAMES, type Element } from '../core/elements';
import { SPELLS } from '../data/spells';
import { cannotUseReason, type Hero } from '../game/hero';
import { heroSpell, spellCategories } from '../game/spells';
import type { Feedback } from './art/feedback';
import { ELEMENT_ICONS, type IconId } from './art/icons';
import { button, byId, el } from './dom';
import { iconElement } from './iconDraw';
import { ManaBars, costIcons } from './manaBars';
import { levelPips } from './screens/widgets';

/** Icon for a usable item, from what it does. */
function itemIcon(itemId: string): IconId {
  const use = ITEMS[itemId]?.use;
  return use?.mana ? 'potion' : 'heart';
}

/**
 * The hero's side of the battle screen: HP, the seven mana pools, and spell
 * and item buttons. Spells sit in one button per category (element); a
 * category with several spells opens its own menu, one with a single spell
 * casts it straight away. Buttons show the element, the best spell's name
 * and its icon cost; ones you can't use are dimmed, and pressing one
 * shakes it. Number keys pick a category, then a spell; Escape goes back.
 */
export class HeroPanel {
  private readonly hpFill = byId('battle-hp-fill');
  private readonly hpText = byId('battle-hp-text');
  private readonly spellList = byId('spell-list');
  private readonly itemList = byId('battle-items');
  private readonly actions = byId('actions-panel');
  private readonly mana: ManaBars;
  private controlsKey = '';
  /** The category whose menu is open, if any. */
  private open: Element | null = null;
  /** What the number keys choose: categories, or the open category's spells. */
  private choices: (() => void)[] = [];

  onCast: (spellId: string) => void = () => {};
  onItem: (itemId: string) => void = () => {};

  constructor() {
    byId('battle-hp-icon').replaceChildren(iconElement('heart', 2, 'HP'));
    this.mana = new ManaBars(byId('battle-mana'));
  }

  play(feedback: Feedback): void {
    if (feedback.kind === 'mana') this.mana.pulse(feedback.elements, feedback.direction);
  }

  /** Closes any open category menu (a new battle starts on the categories). */
  reset(): void {
    this.open = null;
    this.controlsKey = '';
  }

  /** Presses the `n`th (1-based) category or spell button. Returns false if there is none. */
  pick(n: number): boolean {
    const choose = this.choices[n - 1];
    choose?.();
    return choose !== undefined;
  }

  /** Closes the open category menu. Returns false if none was open. */
  back(): boolean {
    if (!this.open) return false;
    this.setOpen(null);
    return true;
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
      this.open,
    ]);
    if (key === this.controlsKey) return;
    this.controlsKey = key;

    const usable = (id: string): boolean => ongoing && combat?.cannotCastReason(id) === null;
    const cast = (id: string): void => {
      // A spell that goes off closes the menu; one that can't stays and shakes.
      if (usable(id)) this.setOpen(null);
      this.onCast(id);
    };
    const categories = combat ? spellCategories(hero) : [];
    const menu = categories.find((c) => c.category === this.open);
    if (menu) {
      this.choices = menu.spells.map((id) => () => cast(id));
      const back = button('', () => this.setOpen(null), { title: 'Back (Esc)' });
      back.classList.add('spell', 'back');
      back.append(
        iconElement(ELEMENT_ICONS[menu.category], 2, ELEMENT_NAMES[menu.category]),
        el('b', { text: '◀' }),
        el('kbd', { text: 'Esc' }),
      );
      this.spellList.replaceChildren(
        back,
        ...menu.spells.map((id, index) =>
          this.spellButton(hero, id, index + 1, usable(id), () => cast(id)),
        ),
      );
    } else {
      this.open = null;
      this.choices = categories.map(({ category, spells }) => {
        const [only] = spells;
        return spells.length === 1 && only ? () => cast(only) : () => this.setOpen(category);
      });
      this.spellList.replaceChildren(
        ...categories.map(({ category, spells }, index) => {
          const node = this.spellButton(hero, spells[0] ?? '', index + 1, spells.some(usable), () =>
            this.choices[index]?.(),
          );
          if (spells.length > 1) {
            node.dataset.action = `category-${category}`;
            node.classList.add('category');
            node.append(el('span', { className: 'more', text: `+${spells.length - 1}` }));
          }
          return node;
        }),
      );
    }

    const items = Object.entries(hero.items).filter(([id]) => {
      const use = ITEMS[id]?.use;
      return Boolean(use?.heal || use?.mana);
    });
    this.itemList.replaceChildren(
      ...(combat
        ? items.map(([id, count]) => {
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

  private setOpen(category: Element | null): void {
    this.open = category;
    this.controlsKey = '';
  }

  /** A button for one spell: element, name at the hero's level, level pips, cost and hotkey. */
  private spellButton(
    hero: Hero,
    spellId: string,
    hotkey: number,
    usable: boolean,
    onClick: () => void,
  ): HTMLButtonElement {
    const spell = SPELLS[spellId];
    const cast = heroSpell(hero, spellId);
    const node = button('', onClick, { title: cast ? `${cast.name} · Lv ${cast.level}` : '' });
    node.dataset.action = spellId;
    node.classList.add('spell');
    node.classList.toggle('unusable', !usable);
    node.setAttribute('aria-keyshortcuts', String(hotkey));
    if (spell && cast) {
      node.append(
        iconElement(ELEMENT_ICONS[spell.category], 3),
        el(
          'span',
          {},
          el('b', { text: cast.name }),
          levelPips(spell, cast.level),
          costIcons(cast.cost),
        ),
      );
    }
    node.append(el('kbd', { text: String(hotkey) }));
    return node;
  }
}
