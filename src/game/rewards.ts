import type { Reward } from '../data/types';
import { addItem, learnSpell, type Hero } from './hero';

/** Something the hero gained or lost, for the results screen to show as icons. */
export type Gain =
  | { readonly kind: 'xp'; readonly amount: number }
  /** Reached a new level, earning skill points. */
  | { readonly kind: 'level'; readonly level: number; readonly points: number }
  /** Gil gained (negative when lost). */
  | { readonly kind: 'gil'; readonly amount: number }
  /** Items gained (negative count when handed over). */
  | { readonly kind: 'item'; readonly itemId: string; readonly count: number }
  | { readonly kind: 'spell'; readonly spellId: string };

export interface RewardOutcome {
  readonly gains: Gain[];
  /** Shop to open after the rewards, if any. */
  readonly shopId: string | null;
}

/**
 * Grants rewards to the hero and records flags. Shop rewards are returned
 * rather than applied, since opening a shop is a UI concern. Hidden flags
 * and already-known spells produce no gain.
 */
export function grantRewards(
  hero: Hero,
  flags: Set<string>,
  rewards: readonly Reward[],
): RewardOutcome {
  const gains: Gain[] = [];
  let shopId: string | null = null;
  for (const reward of rewards) {
    switch (reward.kind) {
      case 'gil':
        hero.gil += reward.amount;
        gains.push({ kind: 'gil', amount: reward.amount });
        break;
      case 'item':
        addItem(hero, reward.itemId, reward.count);
        gains.push({ kind: 'item', itemId: reward.itemId, count: reward.count });
        break;
      case 'spell':
        if (learnSpell(hero, reward.spellId))
          gains.push({ kind: 'spell', spellId: reward.spellId });
        break;
      case 'flag':
        flags.add(reward.flag);
        break;
      case 'shop':
        shopId = reward.shopId;
        break;
    }
  }
  return { gains, shopId };
}
