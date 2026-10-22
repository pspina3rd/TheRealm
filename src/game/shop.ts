import { ITEMS } from '../data/items';
import type { ItemDef } from '../data/types';
import type { GameState } from '../world/state';
import { addItem, applyItemEffect, equip, slotFor, type Hero } from './hero';
import { charmPriceMultiplier } from './stats';

/**
 * What the hero pays: the list price times a haggle multiplier, less their
 * Charm discount, rounded and never below 1 gil.
 */
export function priceFor(hero: Pick<Hero, 'stats'>, item: ItemDef, multiplier: number): number {
  return Math.max(1, Math.round(item.price * multiplier * charmPriceMultiplier(hero.stats.charm)));
}

/** Why the hero can't buy `item`, or null if they can. */
export function cannotBuyReason(
  state: GameState,
  item: ItemDef,
  multiplier: number,
): string | null {
  const hero = state.hero;
  if (hero.gil < priceFor(hero, item, multiplier)) return 'Not enough gil.';
  const slot = slotFor(item);
  if (slot) {
    const owned = (hero[slot] === item.id ? 1 : 0) + (hero.items[item.id] ?? 0);
    if (owned > 0) return 'You already own one.';
  }
  const spell = item.use?.learnSpell;
  if (spell && (hero.spells.includes(spell) || (hero.items[item.id] ?? 0) > 0)) {
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
  const price = priceFor(hero, item, multiplier);
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
