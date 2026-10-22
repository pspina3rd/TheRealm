import { ELEMENTS, ELEMENT_NAMES } from '../../core/elements';
import { ITEMS } from '../../data/items';
import type { ItemDef, ShopDef } from '../../data/types';
import type { Hero } from '../../game/hero';
import { cannotBuyReason, priceFor } from '../../game/shop';
import type { GameState } from '../../world/state';
import type { Atlas } from '../art/atlas';
import { ELEMENT_ICONS, STAT_ICONS, itemIcon } from '../art/icons';
import { CHARM_DISCOUNT } from '../../game/stats';
import { button, el } from '../dom';
import { iconElement } from '../iconDraw';
import { chip, percent, spritePortrait } from './widgets';

/** How a piece of gear compares with what the hero wears, as icon chips. */
function comparison(hero: Hero, item: ItemDef): HTMLElement[] {
  if (item.kind === 'weapon') {
    const current = hero.weaponId ? (ITEMS[hero.weaponId]?.atk ?? 0) : 0;
    const diff = (item.atk ?? 0) - current;
    return [
      chip(
        'sword',
        diff >= 0 ? `+${diff}` : diff,
        'Attack change',
        diff > 0 ? 'up' : diff < 0 ? 'down' : undefined,
      ),
    ];
  }
  if (item.kind === 'armor') {
    const current = hero.armorId ? (ITEMS[hero.armorId]?.def ?? 0) : 0;
    const diff = (item.def ?? 0) - current;
    return [
      chip(
        'ward',
        diff >= 0 ? `+${diff}` : diff,
        'Defence change',
        diff > 0 ? 'up' : diff < 0 ? 'down' : undefined,
      ),
    ];
  }
  if (item.pieceBias) {
    return ELEMENTS.filter((e) => item.pieceBias?.[e]).map((e) =>
      chip(ELEMENT_ICONS[e], `+${item.pieceBias?.[e]}`, `More ${ELEMENT_NAMES[e]} pieces`, 'up'),
    );
  }
  return [];
}

/**
 * A shop: the shopkeeper, your gil and Charm discount, and a card per item
 * with its price (the list price struck through when haggled or charmed)
 * and how it compares with your gear.
 */
export function shopBody(
  atlas: Atlas,
  state: GameState,
  shop: ShopDef,
  multiplier: number,
  keeperSprite: string,
  onBuy: (itemId: string) => void,
): HTMLElement[] {
  const cards = shop.stock.flatMap((itemId) => {
    const item = ITEMS[itemId];
    if (!item) return [];
    const reason = cannotBuyReason(state, item, multiplier);
    const price = priceFor(state.hero, item, multiplier);
    const card = button('', () => onBuy(itemId), {
      disabled: reason !== null,
      title: reason ?? item.description,
    });
    card.className = 'shop-card';
    card.append(
      iconElement(itemIcon(itemId), 3),
      el(
        'span',
        { className: 'shop-info' },
        el('b', { text: item.name }),
        el('span', { className: 'chips' }, ...comparison(state.hero, item)),
      ),
      el(
        'span',
        { className: 'shop-price' },
        ...(price !== item.price ? [el('s', { text: String(item.price) })] : []),
        chip(
          'coin',
          price,
          'Price',
          price < item.price ? 'up' : price > item.price ? 'down' : undefined,
        ),
      ),
    );
    return [card];
  });

  return [
    el(
      'div',
      { className: 'shop-header' },
      spritePortrait(atlas, keeperSprite, 96),
      chip('coin', state.hero.gil, 'Your gil'),
      ...(state.hero.stats.charm > 0
        ? [
            chip(
              STAT_ICONS.charm,
              `−${percent(CHARM_DISCOUNT * state.hero.stats.charm)}`,
              'Charm',
              'up',
            ),
          ]
        : []),
    ),
    el('div', { className: 'shop-cards' }, ...cards),
  ];
}
