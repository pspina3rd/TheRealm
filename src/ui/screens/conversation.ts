import { ITEMS } from '../../data/items';
import type { Interaction } from '../../game/encounter';
import type { Resolution } from '../../game/encounter';
import type { Atlas } from '../art/atlas';
import { itemIcon } from '../art/icons';
import { el } from '../dom';
import { iconElement } from '../iconDraw';
import { challengeCard, chip, gainRows, rewardIcons, spritePortrait } from './widgets';

/** The speaker's portrait beside a speech bubble. */
function speech(atlas: Atlas, sprite: string, text: string): HTMLElement {
  return el(
    'div',
    { className: 'speech' },
    spritePortrait(atlas, sprite, 96),
    el('p', { className: 'bubble', text }),
  );
}

/**
 * A conversation: who is speaking, what they say, and for a challenge, a
 * picture of what they want (the challenge card) and what they give back.
 */
export function conversationBody(atlas: Atlas, interaction: Interaction): HTMLElement[] {
  const body = [speech(atlas, interaction.sprite, interaction.text)];
  if (interaction.kind === 'needsItem') {
    body.push(
      el(
        'div',
        {
          className: 'challenge-card missing',
          title: `You need: ${ITEMS[interaction.itemId]?.name ?? interaction.itemId}`,
        },
        iconElement('gift', 3, 'Offering'),
        chip(itemIcon(interaction.itemId), '?', ITEMS[interaction.itemId]?.name),
      ),
    );
  }
  if (interaction.kind === 'challenge') {
    const rewards = rewardIcons(interaction.rewards);
    body.push(
      el(
        'div',
        { className: 'deal' },
        challengeCard(interaction.spec),
        ...(rewards.length
          ? [
              el('span', { className: 'deal-arrow', text: '➜' }),
              el('div', { className: 'rewards' }, ...rewards),
            ]
          : []),
      ),
    );
  }
  return body;
}

/** The results after a battle: the winner, what was gained or lost, and any parting words. */
export function resultsBody(
  atlas: Atlas,
  resolution: Resolution,
  speaker: string | null,
): HTMLElement[] {
  const body: HTMLElement[] = [];
  if (resolution.speech && speaker) body.push(speech(atlas, speaker, resolution.speech));
  if (resolution.fell)
    body.push(el('div', { className: 'gain loss' }, iconElement('bed', 2, 'You wake at the inn')));
  body.push(el('div', { className: 'gains' }, ...gainRows(resolution.gains)));
  return body;
}
