import { ELEMENTS, ELEMENT_NAMES } from '../../core/elements';
import { ITEMS } from '../../data/items';
import { ATTITUDE_PRICES, stockFor, type Attitude } from '../../game/attitude';
import type { ItemDef, ShopDef } from '../../data/types';
import type { Hero } from '../../game/hero';
import { cannotBuyReason, priceFor } from '../../game/shop';
import type { GameState } from '../../world/state';
import type { Atlas } from '../art/atlas';
import { ATTITUDE_ICONS, ELEMENT_ICONS, itemIcon } from '../art/icons';
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

/** The keeper's face with how their attitude moves prices (e.g. −10%). */
function attitudeChip(attitude: Attitude): HTMLElement {
  const change = ATTITUDE_PRICES[attitude] - 1;
  const text = change < 0 ? `−${percent(-change)}` : change > 0 ? `+${percent(change)}` : '±0';
  return chip(
    ATTITUDE_ICONS[attitude],
    text,
    'Prices for you',
    change < 0 ? 'up' : change > 0 ? 'down' : undefined,
  );
}

/**
 * A shop: the shopkeeper's face and price change for their attitude, your
 * gil, and a card per item with its price (the list price struck through
 * when it differs) and how it compares with your gear. A Devoted keeper's
 * secret stock is marked with a star.
 */
export function shopBody(
  atlas: Atlas,
  state: GameState,
  shop: ShopDef,
  multiplier: number,
  keeperSprite: string,
  attitude: Attitude,
  onBuy: (itemId: string) => void,
): HTMLElement[] {
  const cards = stockFor(shop, attitude).flatMap((itemId) => {
    const item = ITEMS[itemId];
    if (!item) return [];
    const reason = cannotBuyReason(state, item, multiplier);
    const price = priceFor(item, multiplier);
    const card = button('', () => onBuy(itemId), {
      disabled: reason !== null,
      title: reason ?? item.description,
    });
    const secret = !shop.stock.includes(itemId);
    card.className = secret ? 'shop-card secret' : 'shop-card';
    card.append(
      iconElement(itemIcon(itemId), 3),
      el(
        'span',
        { className: 'shop-info' },
        el('b', { text: item.name }),
        ...(secret ? [iconElement('star', 2, 'Kept back for you')] : []),
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
      attitudeChip(attitude),
    ),
    el('div', { className: 'shop-cards' }, ...cards),
  ];
}
