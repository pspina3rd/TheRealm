import { ITEMS } from '../data/items';
import { SPELLS } from '../data/spells';
import type { Reward } from '../data/types';
import { addItem, learnSpell, type Hero } from './hero';

export interface RewardOutcome {
  /** Human-readable lines for the chronicle. */
  readonly messages: string[];
  /** Shop to open after the rewards, if any. */
  readonly shopId: string | null;
}

/**
 * Grants rewards to the hero and records flags. Shop rewards are returned
 * rather than applied, since opening a shop is a UI concern.
 */
export function grantRewards(
  hero: Hero,
  flags: Set<string>,
  rewards: readonly Reward[],
): RewardOutcome {
  const messages: string[] = [];
  let shopId: string | null = null;
  for (const reward of rewards) {
    switch (reward.kind) {
      case 'gil':
        hero.gil += reward.amount;
        messages.push(`Received ${reward.amount} gil.`);
        break;
      case 'item':
        addItem(hero, reward.itemId, reward.count);
        messages.push(`Received ${ITEMS[reward.itemId]?.name ?? reward.itemId} ×${reward.count}.`);
        break;
      case 'spell':
        if (learnSpell(hero, reward.spellId)) {
          messages.push(`Learned ${SPELLS[reward.spellId]?.name ?? reward.spellId}!`);
        }
        break;
      case 'flag':
        flags.add(reward.flag);
        break;
      case 'shop':
        shopId = reward.shopId;
        break;
    }
  }
  return { messages, shopId };
}
