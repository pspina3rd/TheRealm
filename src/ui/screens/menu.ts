import { costIcons } from '../manaBars';
import { standardName, standardSpellText } from '../standardSpellText';
import { ELEMENTS, type Element } from '../../core/elements';
import type { HiddenSlot } from '../../game/hidden';
import { ITEMS } from '../../data/items';
import { SPELLS } from '../../data/spells';
import {
  cannotUseReason,
  heroAlignment,
  heroClass,
  heroTitle,
  slotFor,
  totalAttack,
  totalDefense,
  type Hero,
} from '../../game/hero';
import {
  castSpellFor,
  castSummary,
  isSealed,
  isReady,
  knownSpell,
  spellCategories,
} from '../../game/spells';
import type { Atlas } from '../art/atlas';
import { alignmentStar } from '../alignmentStarView';
import { ELEMENT_ICONS, STAT_ICONS, itemIcon, type IconId } from '../art/icons';
import { STATS, STAT_IDS } from '../../data/stats';
import { button, el } from '../dom';
import { iconElement } from '../iconDraw';
import {
  chip,
  hiddenSpellSlot,
  levelPips,
  sectionTitle,
  spellMeta,
  spritePortrait,
} from './widgets';

export interface MenuHandlers {
  readonly onUse: (itemId: string) => void;
  readonly onEquip: (itemId: string) => void;
  /** Where to find the mentor whose lesson would lift a seal. */
  readonly lockHint?: (category: Element) => HTMLElement;
}

/** Name, title, level, totals, stat ranks and XP, with the hero's sprite and alignment star. */
function heroCard(atlas: Atlas, hero: Hero): HTMLElement {
  const xp = el(
    'div',
    { className: 'bar xp', title: `${hero.xp} / ${hero.nextXp} XP` },
    el('span'),
  );
  (xp.firstChild as HTMLElement).style.width = `${(100 * hero.xp) / hero.nextXp}%`;
  return el(
    'div',
    { className: 'hero-card' },
    spritePortrait(atlas, heroClass(hero).sprite, 96),
    el(
      'div',
      {},
      el('h2', { text: `${hero.name} · Lv ${hero.level}` }),
      el('p', { className: 'muted', text: heroTitle(hero) }),
      el(
        'div',
        { className: 'chips' },
        chip('heart', `${hero.hp}/${hero.maxHp}`, 'HP'),
        chip('sword', totalAttack(hero), 'Attack'),
        chip('ward', totalDefense(hero), 'Defence'),
        chip('potion', hero.manaCap, 'Mana pool size (pools fill from crystals in battle)'),
      ),
      el(
        'div',
        { className: 'chips stat-strip' },
        ...STAT_IDS.map((id) =>
          chip(STAT_ICONS[id], hero.stats[id], `${STATS[id].name}: ${STATS[id].description}`),
        ),
        ...(hero.skillPoints > 0
          ? [chip('point', hero.skillPoints, 'Unspent skill points', 'up')]
          : []),
      ),
      el('div', { className: 'xp-row' }, iconElement('star', 2, 'Experience'), xp),
    ),
    alignmentStar(heroAlignment(hero)),
  );
}

/** Weapon, armour and charm slots; empty slots show a faded outline of what goes there. */
function equipmentSlots(hero: Hero): HTMLElement {
  const slots: [IconId, string | null, string][] = [
    ['sword', hero.weaponId, 'Weapon'],
    ['armor', hero.armorId, 'Armour'],
    ['amulet', hero.accessoryId, 'Charm'],
  ];
  return el(
    'div',
    { className: 'slots' },
    ...slots.map(([icon, itemId, label]) => {
      const tile = el('div', {
        className: `slot${itemId ? '' : ' empty'}`,
        title: itemId ? `${label}: ${ITEMS[itemId]?.name ?? itemId}` : `${label}: none`,
      });
      tile.append(itemId ? iconElement(itemIcon(itemId), 3) : iconElement(icon, 3));
      return tile;
    }),
  );
}

/**
 * The menu: the hero card, equipment, mana, an item grid (select an item to
 * see it and use or equip it) and the spellbook, where each element's
 * `hidden` spells follow its known ones as silhouettes.
 */
export function menuBody(
  atlas: Atlas,
  hero: Hero,
  handlers: MenuHandlers,
  hidden: readonly HiddenSlot[] = [],
): HTMLElement[] {
  const detail = el('div', { className: 'item-detail' });
  const select = (itemId: string): void => {
    const item = ITEMS[itemId];
    if (!item) return;
    const controls: HTMLButtonElement[] = [];
    if (slotFor(item)) controls.push(button('Equip', () => handlers.onEquip(itemId)));
    else if (item.use) {
      const reason = cannotUseReason(hero, item);
      controls.push(
        button('Use', () => handlers.onUse(itemId), {
          disabled: reason !== null,
          title: reason ?? '',
        }),
      );
    }
    detail.replaceChildren(
      iconElement(itemIcon(itemId), 3),
      el(
        'div',
        {},
        el('b', { text: item.name }),
        el('p', { className: 'muted', text: item.description }),
      ),
      ...controls,
    );
  };

  const items = Object.entries(hero.items).map(([itemId, count]) => {
    const tile = button('', () => select(itemId), { title: ITEMS[itemId]?.name ?? itemId });
    tile.className = 'tile';
    tile.append(
      iconElement(itemIcon(itemId), 3),
      el('span', { className: 'count', text: String(count) }),
    );
    return tile;
  });

  const categories = spellCategories(hero);
  const spells = ELEMENTS.flatMap((element) =>
    (categories.find((c) => c.category === element)?.spells ?? [])
      .flatMap((id): HTMLElement[] => {
        const spell = SPELLS[id];
        const known = knownSpell(hero, id);
        if (!spell || !known) return [];
        const cast = castSpellFor(spell, known);
        const ready = isReady(spell, known);
        const locked = isSealed(hero, id);
        return [
          el(
            'div',
            {
              className: `spell-tile${ready ? ' ready' : ''}`,
              title: standardSpellText(id, cast) ?? castSummary(cast),
            },
            iconElement(ELEMENT_ICONS[spell.category], 3),
            el(
              'span',
              {},
              el('b', { text: `${standardName(id) ?? cast.name} · Lv ${cast.level}` }),
              levelPips(spell, cast.level),
              standardSpellText(id, cast)
                ? el('small', { text: standardSpellText(id, cast) ?? '' }, costIcons(cast.cost))
                : spellMeta(cast),
            ),
            ...(ready
              ? [iconElement('scroll', 2, 'Ready: a mentor can teach the next level')]
              : []),
            ...(locked
              ? [
                  iconElement('lock', 2, 'Sealed: win the lesson back, or win monster fights'),
                  ...(handlers.lockHint ? [handlers.lockHint(spell.category)] : []),
                ]
              : []),
          ),
        ];
      })
      .concat(
        hidden
          .filter((slot) => slot.spell.category === element)
          .map((slot) => hiddenSpellSlot(atlas, slot)),
      ),
  );

  return [
    heroCard(atlas, hero),
    equipmentSlots(hero),
    sectionTitle('bag', 'Items'),
    el('div', { className: 'tiles' }, ...items),
    detail,
    sectionTitle('book', 'Spells'),
    el('div', { className: 'spell-tiles' }, ...spells),
  ];
}
