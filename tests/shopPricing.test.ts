import { describe, expect, it } from 'vitest';
import { DUEL_PRICES as HAGGLE } from '../src/data/balance';
import { ITEMS } from '../src/data/items';
import { SHOPS } from '../src/data/shops';
import { ATTITUDE_PRICES, stockFor, type Attitude } from '../src/game/attitude';
import { buy, priceFor, sell, sellPrice } from '../src/game/shop';
import { newGame } from '../src/world/state';

describe('discounted shop prices', () => {
  it('never sells stocked goods below their resale price at any attitude or haggle endpoint', () => {
    for (const shop of Object.values(SHOPS)) {
      for (const attitude of Object.keys(ATTITUDE_PRICES) as Attitude[]) {
        for (const itemId of stockFor(shop, attitude)) {
          const item = ITEMS[itemId]!;
          if (item.kind === 'service' || sellPrice(item) <= 0) continue;
          for (const haggle of [HAGGLE.min, HAGGLE.start, HAGGLE.max]) {
            expect(priceFor(item, haggle * ATTITUDE_PRICES[attitude])).toBeGreaterThanOrEqual(
              sellPrice(item),
            );
          }
        }
      }
    }
  });

  it.each([
    ['ether', 'friendly', 9],
    ['herb', 'devoted', 6],
  ] as const)(
    'prevents profitable repeat purchases of %s with %s pricing',
    (itemId, attitude, price) => {
      const state = newGame();
      state.hero.gil = 100;
      state.hero.items = {};
      const multiplier = HAGGLE.min * ATTITUDE_PRICES[attitude];
      expect(priceFor(ITEMS[itemId]!, multiplier)).toBe(price);
      for (let cycle = 0; cycle < 10; cycle++) {
        const before = state.hero.gil;
        buy(state, itemId, multiplier);
        sell(state, itemId);
        expect(state.hero.gil).toBeLessThanOrEqual(before);
      }
      expect(state.hero.gil).toBeLessThanOrEqual(100);
      expect(state.hero.items).toEqual({});
    },
  );

  it('preserves full-price purchases, half-list resale, and discounted services', () => {
    expect(priceFor(ITEMS.ether!, 1)).toBe(14);
    expect(sellPrice(ITEMS.ether!)).toBe(7);
    expect(priceFor(ITEMS.innRest!, HAGGLE.min * ATTITUDE_PRICES.devoted)).toBe(6);
  });
});
