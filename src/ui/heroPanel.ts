import type { Battle } from '../battle/battle';
import { ITEMS } from '../data/items';
import { ELEMENTS, ELEMENT_NAMES, type Element } from '../core/elements';
import { SPELLS } from '../data/spells';
import type { Hero } from '../game/hero';
import { castSummary, heroSpell, spellCategories } from '../game/spells';
import type { Feedback } from './art/feedback';
import { ELEMENT_ICONS, PALETTES, type IconId } from './art/icons';
import { button, byId, el } from './dom';
import { iconElement } from './iconDraw';
import { ManaBars } from './manaBars';
import { hiddenSpellSlot, levelPips, spellMeta } from './screens/widgets';
import type { Atlas } from './art/atlas';
import { hiddenSlots } from '../game/hidden';

/** Icon for a usable item, from what it does. */
function itemIcon(itemId: string): IconId {
  const use = ITEMS[itemId]?.use;
  return use?.manaBoost ? 'potion' : 'heart';
}

/**
 * The hero's side of the battle screen: HP, the seven mana pools, and spell
 * and item buttons. Spells sit in seven fixed slots, one per element in
 * element order (dark until the hero knows a spell in it), so key 1–7
 * always means the same element. A category with several spells opens its
 * own menu; one with a single spell casts it straight away. Buttons show
 * the element, the best spell's name, level pips, what kind of spell it is
 * and its icon cost; ones you can't use are dimmed, and pressing one
 * shakes it. An open category's menu ends with its hidden spells'
 * silhouettes. Number keys pick a category, then a spell; Escape goes back.
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
  private choices: ((() => void) | undefined)[] = [];
  /** Height of the category slots and of one slot, kept while a category menu is open. */
  private categoriesHeight = 0;
  private slotHeight = 0;

  onCast: (spellId: string) => void = () => {};
  onItem: (itemId: string) => void = () => {};

  private readonly atlas: Atlas;

  constructor(atlas: Atlas) {
    this.atlas = atlas;
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

  /** Draws the panel; `flags` (the story flags) reveal some hidden spells. */
  render(battle: Battle, flags: ReadonlySet<string>): void {
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
      hero.feats,
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
        el('kbd', { className: 'esc', text: 'Esc' }),
      );
      this.spellList.replaceChildren(
        back,
        ...menu.spells.map((id, index) =>
          this.spellButton(hero, id, index + 1, usable(id), () => cast(id)),
        ),
        ...hiddenSlots({ hero, flags }, menu.category).map((slot) =>
          hiddenSpellSlot(this.atlas, slot),
        ),
      );
      // Keep the categories' height so the controls below don't jump; a row
      // only grows if its content (e.g. a three-element cost) needs more room.
      this.spellList.style.minHeight = `${this.categoriesHeight}px`;
      this.spellList.style.gridAutoRows = `minmax(${this.slotHeight}px, auto)`;
    } else {
      this.open = null;
      // One slot per element, always in the same place; unknown ones are dark.
      this.choices = [];
      this.spellList.replaceChildren(
        ...(combat
          ? ELEMENTS.map((element, index) => {
              const known = categories.find((c) => c.category === element);
              if (!known) return emptySlot(element, index + 1);
              const { spells } = known;
              const [first] = spells;
              const choose =
                spells.length === 1 && first ? () => cast(first) : () => this.setOpen(element);
              this.choices[index] = choose;
              const node = this.spellButton(
                hero,
                first ?? '',
                index + 1,
                spells.some(usable),
                choose,
              );
              if (spells.length > 1) {
                node.dataset.action = `category-${element}`;
                node.classList.add('category');
                node.append(el('span', { className: 'more', text: `+${spells.length - 1}` }));
              }
              return node;
            })
          : []),
      );
      this.spellList.style.minHeight = '';
      this.spellList.style.gridAutoRows = '';
      this.categoriesHeight = this.spellList.offsetHeight;
      this.slotHeight = (this.spellList.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;
    }

    const items = Object.entries(hero.items).filter(([id]) => {
      const use = ITEMS[id]?.use;
      return Boolean(use?.heal || use?.manaBoost);
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
              !ongoing || !item || combat.cannotUseItemReason(id) !== null,
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
    const node = button('', onClick, { title: cast ? castSummary(cast) : '' });
    node.dataset.action = spellId;
    node.classList.add('spell');
    node.classList.toggle('unusable', !usable);
    node.setAttribute('aria-keyshortcuts', String(hotkey));
    if (spell && cast) {
      node.append(
        iconElement(ELEMENT_ICONS[spell.category], 3),
        el('span', {}, el('b', { text: cast.name }), levelPips(spell, cast.level), spellMeta(cast)),
      );
    }
    node.append(el('kbd', { text: String(hotkey) }));
    return node;
  }
}

/** A dark slot for an element the hero knows no spell in yet, keeping every key in place. */
function emptySlot(element: Element, hotkey: number): HTMLButtonElement {
  const node = button('', () => {}, { disabled: true, title: ELEMENT_NAMES[element] });
  node.classList.add('spell', 'empty-slot');
  node.append(
    iconElement({ icon: ELEMENT_ICONS[element], palette: PALETTES.shadow }, 3),
    el('kbd', { text: String(hotkey) }),
  );
  return node;
}
