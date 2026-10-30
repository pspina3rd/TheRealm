import { autoTarget } from '../battle/autoCasting';
import { canAfford } from '../game/hero';
import { isSealed } from '../game/spells';
import { WEAVE_NAMES, weaveCost, weaveReason } from '../game/weaving';
import { BOARD_SPELLS, STANDARD_SPELLS } from '../battle/magicCasting';
import type { Battle } from '../battle/battle';
import { MAX_ITEMS_PER_BATTLE } from '../battle/combat';
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
  onWeaving: () => void = () => {};
  onArcane: () => void = () => {};

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
    // A lesson lends its spell: the panel shows the fight's spell book.
    const hero = battle.combat
      ? { ...battle.hero, spells: battle.combat.spellBook() }
      : battle.hero;
    this.hpFill.style.width = `${(100 * hero.hp) / hero.maxHp}%`;
    this.hpText.textContent = `${hero.hp}/${hero.maxHp}`;
    this.mana.update(hero);

    const combat = battle.combat;
    const automatic = battle.autoCastingEnabled;
    byId('battle-view').classList.toggle('casting-auto', automatic);
    this.spellList.classList.toggle('auto-mode', automatic);
    this.actions.hidden = !combat;
    const ongoing = battle.status === 'ongoing' && !battle.paused && !battle.autoCastingBusy;
    const key = JSON.stringify([
      hero.mana,
      hero.hp,
      hero.items,
      hero.spells,
      hero.feats,
      ongoing,
      Boolean(combat),
      combat?.itemsUsed,
      this.open,
      automatic,
      automatic ? battle.board.magicState() : null,
      battle.autoFrame
        ? [battle.autoFrame.phase, battle.autoFrame.index, battle.autoFrame.preview.id]
        : null,
      battle.autoCasts.map((c) => [c.id, c.rank]),
      hero.weaving,
    ]);
    if (key === this.controlsKey) return;
    this.controlsKey = key;
    this.actions.querySelector('.manual-spells')?.remove();
    // Live HP/mana updates rebuild controls. Keep keyboard focus on the
    // same action instead of dropping it back to the document body.
    const focused = document.activeElement;
    const focusedAction =
      focused instanceof HTMLElement &&
      (this.spellList.contains(focused) || this.itemList.contains(focused))
        ? focused.dataset.action
        : undefined;

    const usable = (id: string): boolean => ongoing && combat?.cannotCastReason(id) === null;
    const cast = (id: string): void => {
      // A spell that goes off closes the menu; one that can't stays and shakes.
      if (usable(id)) this.setOpen(null);
      this.onCast(id);
    };
    const categories = combat ? spellCategories(hero) : [];
    const menu = categories.find((c) => c.category === this.open);
    // On a phone an open category's menu pops up over the board as a sheet.
    this.spellList.classList.toggle('menu-open', Boolean(menu));
    if (automatic) {
      this.open = null;
      this.choices = [];
      this.renderAutomatic(battle, hero, ongoing, flags);
    } else if (menu) {
      this.choices = menu.spells.map((id) => () => cast(id));
      const back = button('', () => this.setOpen(null), { title: 'Back (Esc)' });
      back.dataset.action = `back-${menu.category}`;
      back.setAttribute('aria-label', `Back from ${ELEMENT_NAMES[menu.category]} spells`);
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
                node.setAttribute(
                  'aria-label',
                  `${ELEMENT_NAMES[element]} spells (${spells.length})`,
                );
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
    if (battle.autoCastingEnabled)
      for (const node of this.spellList.querySelectorAll<HTMLButtonElement>('[data-action]')) {
        if (BOARD_SPELLS[node.dataset.action ?? '']) {
          node.disabled = true;
          node.title = 'Automatic after a line clear';
          node.append(el('small', { text: 'AUTO · LINE CLEAR' }));
        }
      }
    // Item uses left this battle, as a bag with a count, before the items.
    const usesLeft = combat ? MAX_ITEMS_PER_BATTLE - combat.itemsUsed : 0;
    const uses = el('span', { className: 'item-uses' });
    uses.title = `${usesLeft} item uses left this battle`;
    uses.append(iconElement('bag', 2), el('b', { text: `${usesLeft}/${MAX_ITEMS_PER_BATTLE}` }));
    this.itemList.replaceChildren(
      ...(combat && items.length > 0 ? [uses] : []),
      ...(combat
        ? items.map(([id, count]) => {
            const item = ITEMS[id];
            const node = button('', () => this.onItem(id), { title: item?.description ?? id });
            node.dataset.action = id;
            node.setAttribute('aria-label', `${item?.name ?? id} ×${count}`);
            node.classList.add('item');
            node.classList.toggle(
              'unusable',
              !ongoing || !item || combat.cannotUseItemReason(id) !== null,
            );
            node.append(
              iconElement(itemIcon(id), 2),
              el('span', { text: item?.name ?? id }),
              el('small', { className: 'count', text: `×${count}` }),
            );
            return node;
          })
        : []),
    );
    if (focusedAction) {
      [
        ...this.spellList.querySelectorAll<HTMLElement>('[data-action]'),
        ...this.itemList.querySelectorAll<HTMLElement>('[data-action]'),
      ]
        .find((node) => node.dataset.action === focusedAction)
        ?.focus({ preventScroll: true });
    }
  }

  private renderAutomatic(
    battle: Battle,
    hero: Hero,
    ongoing: boolean,
    flags: ReadonlySet<string>,
  ): void {
    const order = battle.autoOrder;
    const frame = battle.autoFrame;
    const latest = battle.autoCasts.at(-1);
    const nameOf = (id: string): string =>
      id === 'shadow' ? 'Arcane' : (WEAVE_NAMES[id as keyof typeof WEAVE_NAMES] ?? id);
    const status = el('div', {
      className: 'auto-cast-summary',
      text: frame
        ? `${frame.source === 'weave' ? 'Custom' : 'Auto'} ${frame.index}/${frame.total}: ${nameOf(frame.preview.id)} Lv ${frame.preview.rank} · ${frame.phase === 'target' ? 'Targeting' : frame.phase === 'effect' ? 'Casting' : 'Applied'}`
        : latest
          ? `Last: ${nameOf(latest.id)} Lv ${latest.rank}`
          : 'AUTO · Priority order · One chance per cleared line',
    });
    status.setAttribute('role', 'status');
    this.spellList.replaceChildren(status);
    for (const [priority, id] of order.entries()) {
      const cast = heroSpell(hero, id);
      if (!cast) continue;
      const element = STANDARD_SPELLS[id];
      const hits = element === 'lightning' || element === 'nature';
      const rows =
        element === 'earth'
          ? [1, 2, 4, battle.board.height][cast.level - 1]
          : hits
            ? cast.level % 2 === 0
              ? 2
              : 1
            : cast.level;
      const reach =
        id === 'shadow'
          ? 'Opponent · damage + drain'
          : rows === battle.board.height
            ? 'Whole board'
            : `${rows} row${rows === 1 ? '' : 's'}${hits ? ` · ${cast.level >= 3 ? 2 : 1} hit${cast.level >= 3 ? 's' : ''}` : ''}`;
      const current = frame?.preview.id === id && frame.source !== 'weave';
      const readiness = current
        ? 'Casting'
        : isSealed(hero, id)
          ? 'Sealed'
          : !canAfford(hero, cast.cost)
            ? 'Waiting for mana'
            : autoTarget(battle.magicCasting, id)
              ? 'Ready'
              : 'No useful target';
      const amounts = Object.entries(cast.cost)
        .map(([e, n]) => `Held ${hero.mana[e as keyof typeof hero.mana]} · Cost ${n} ${e}`)
        .join(' + ');
      const card = el(
        'article',
        { className: `auto-standard${current ? ' casting-now' : ''}` },
        el('b', { text: `${priority + 1}. ${nameOf(id)} · Lv ${cast.level}` }),
        el('small', { text: amounts }),
        el('small', { text: `${reach} · ${readiness}` }),
      );
      card.dataset.spell = id;
      card.setAttribute(
        'aria-label',
        `${nameOf(id)} level ${cast.level}, automatic, priority ${priority + 1}, ${reach}, ${amounts}, ${readiness}`,
      );
      this.spellList.append(card);
    }
    if (!order.length)
      this.spellList.append(
        el('p', {
          className: 'auto-empty',
          text: 'No standard spells learned. Clear lines to fight and earn mana.',
        }),
      );
    const manual = el('div', { className: 'manual-spells' });
    if (Object.keys(hero.arcane ?? {}).length)
      manual.append(
        button('Arcane techniques · Opponent', () => this.onArcane(), { disabled: !ongoing }),
      );
    const recipe = hero.weaving?.recipes.find((r) => r.id === hero.weaving?.equipped);
    if (recipe) {
      const sequence = recipe.stages.map((s) => `${nameOf(s.spell)} Lv ${s.rank}`).join(' → ');
      const recipeReason = weaveReason(hero, flags, recipe);
      let cost = recipeReason ?? '';
      if (!recipeReason)
        cost = Object.entries(weaveCost(hero, recipe))
          .map(([e, n]) => `${n} ${e}`)
          .join(' + ');
      const node = button(`${recipe.name} · ${sequence} · ${cost}`, () => this.onWeaving(), {
        disabled: !ongoing || !!recipeReason,
      });
      node.className = 'equipped-weaving';
      node.setAttribute('aria-label', `Cast custom spell ${recipe.name}: ${sequence}, ${cost}`);
      manual.append(node);
    }
    const supportIds = Object.keys(hero.spells).filter((id) => !STANDARD_SPELLS[id]);
    if (supportIds.length)
      manual.append(
        button(
          'Support spells · Manual',
          () => {
            const dialog = el('dialog', { className: 'magic-target-dialog' });
            const paused = battle.paused;
            battle.paused = true;
            const close = (): void => {
              battle.paused = paused;
              dialog.close();
              dialog.remove();
            };
            dialog.append(el('h2', { text: 'Manual support spells' }));
            for (const id of supportIds) {
              const cast = heroSpell(hero, id);
              if (!cast) continue;
              dialog.append(
                button(
                  `${cast.name} Lv ${cast.level}`,
                  () => {
                    close();
                    this.onCast(id);
                  },
                  { disabled: battle.combat?.cannotCastReason(id) !== null },
                ),
              );
            }
            dialog.append(button('Cancel', close));
            dialog.addEventListener('cancel', (e) => {
              e.preventDefault();
              close();
            });
            document.body.append(dialog);
            dialog.showModal();
          },
          { disabled: !ongoing },
        ),
      );
    if (manual.childElementCount) this.actions.append(manual);
    this.spellList.style.minHeight = '';
    this.spellList.style.gridAutoRows = '';
    byId('battle-view').style.setProperty(
      '--auto-manual-h',
      `${manual.childElementCount ? Math.ceil(manual.childElementCount / 2) * 48 : 0}px`,
    );
    byId('battle-view').style.setProperty(
      '--auto-spells-h',
      `${30 + Math.max(1, Math.ceil(order.length / 3)) * 68 + (manual.childElementCount ? Math.ceil(manual.childElementCount / 2) * 58 : 0)}px`,
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
      // The name stays the button's name even where the phone layout hides its text.
      node.setAttribute('aria-label', cast.name);
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
