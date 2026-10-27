import { ITEMS } from '../data/items';
import type { ItemDef } from '../data/types';
import type { GameState } from '../world/state';
import { addItem, applyItemEffect, equip, removeItem, slotFor, type Hero } from './hero';
import { knownSpell } from './spells';

/**
 * What the hero pays: the list price times `multiplier` (the haggle's
 * result times the keeper's attitude price, see `src/game/attitude.ts`),
 * rounded and never below 1 gil or the item's resale price. Services have
 * no resale value, so their discounts are unrestricted.
 */
export function priceFor(item: ItemDef, multiplier: number): number {
  const resaleFloor = item.kind === 'service' ? 0 : sellPrice(item);
  return Math.max(1, resaleFloor, Math.round(item.price * multiplier));
}

/** Shops buy items back at this fraction of the list price. */
export const SELL_RATE = 0.5;

/** What a shop pays for one `item`: half its list price, rounded down. */
export function sellPrice(item: ItemDef): number {
  return Math.floor(item.price * SELL_RATE);
}

/**
 * The items the hero can sell, in bag order: anything carried (worn gear
 * isn't in the bag) that a shop would pay for. Services and keepsakes
 * (price 0) can't be sold; story progress lives in flags, never items.
 */
export function sellableItems(hero: Pick<Hero, 'items'>): ItemDef[] {
  return Object.entries(hero.items).flatMap(([id, count]) => {
    const item = ITEMS[id];
    return item && count > 0 && item.kind !== 'service' && sellPrice(item) > 0 ? [item] : [];
  });
}

/** Sells one `itemId` from the bag. Returns a message; throws if it can't be sold. */
export function sell(state: GameState, itemId: string): string {
  const item = sellableItems(state.hero).find((i) => i.id === itemId);
  if (!item) throw new Error(`Can't sell ${itemId}`);
  removeItem(state.hero, itemId);
  const price = sellPrice(item);
  state.hero.gil += price;
  return `Sold ${item.name}. (+${price} gil)`;
}

/** Why the hero can't buy `item`, or null if they can. */
export function cannotBuyReason(
  state: GameState,
  item: ItemDef,
  multiplier: number,
): string | null {
  const hero = state.hero;
  if (hero.gil < priceFor(item, multiplier)) return 'Not enough gil.';
  const slot = slotFor(item);
  if (slot) {
    const owned = (hero[slot] === item.id ? 1 : 0) + (hero.items[item.id] ?? 0);
    if (owned > 0) return 'You already own one.';
  }
  const spell = item.use?.learnSpell;
  if (spell && (knownSpell(hero, spell) || (hero.items[item.id] ?? 0) > 0)) {
    return 'You already have this spell.';
  }
  return null;
}

/**
 * Buys an item. Services (like an inn's rest) take effect immediately and a
 * rest also sets the respawn point; weapons and armour are equipped straight
 * away if better than what the hero wears, and a charm is put on if no
 * charm is worn. Returns a message; throws if the purchase isn't allowed.
 */
export function buy(state: GameState, itemId: string, multiplier: number): string {
  const item = ITEMS[itemId];
  if (!item) throw new Error(`Unknown item: ${itemId}`);
  const reason = cannotBuyReason(state, item, multiplier);
  if (reason) throw new Error(reason);

  const hero = state.hero;
  const price = priceFor(item, multiplier);
  hero.gil -= price;

  if (item.kind === 'service') {
    if (item.use?.rest) state.respawn = { map: state.mapId, x: state.x, y: state.y };
    return `${applyItemEffect(hero, item)} (−${price} gil)`;
  }

  addItem(hero, itemId);
  const slot = slotFor(item);
  if (slot) {
    const currentId = hero[slot];
    const stat = (def: ItemDef | undefined): number => (def?.atk ?? 0) + (def?.def ?? 0);
    const better =
      slot === 'accessoryId'
        ? !currentId
        : stat(item) > stat(currentId ? ITEMS[currentId] : undefined);
    if (better) {
      equip(hero, itemId);
      return `Bought and equipped ${item.name}. (−${price} gil)`;
    }
  }
  return `Bought ${item.name}. (−${price} gil)`;
}
