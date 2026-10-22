import { ELEMENT_NAMES } from '../../core/elements';
import { ITEMS } from '../../data/items';
import { SPELLS } from '../../data/spells';
import type { Lesson } from '../../game/lessons';
import { castSpellFor, castSummary, newKnownSpell } from '../../game/spells';
import type { Interaction } from '../../game/encounter';
import type { Resolution } from '../../game/encounter';
import type { Atlas } from '../art/atlas';
import { ELEMENT_ICONS, itemIcon } from '../art/icons';
import { button, el } from '../dom';
import { iconElement } from '../iconDraw';
import {
  challengeCard,
  chip,
  difficultyPips,
  gainRows,
  levelPips,
  rewardIcons,
  spellMeta,
  spritePortrait,
} from './widgets';

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
 * One lesson a mentor offers, as a button: the spell's element, its name
 * and level pips at the level taught, what it does and costs, and the
 * lesson's difficulty. A raised level shows the ready scroll.
 */
function lessonButton(
  lesson: Lesson,
  failed: boolean,
  onPick: (lesson: Lesson) => void,
): HTMLButtonElement {
  const spell = SPELLS[lesson.spellId];
  const node = button('', () => onPick(lesson));
  node.className = 'lesson';
  if (!spell) return node;
  const cast = castSpellFor(spell, { ...newKnownSpell(), level: lesson.level });
  node.title = castSummary(cast);
  node.append(
    iconElement(ELEMENT_ICONS[spell.category], 3, ELEMENT_NAMES[spell.category]),
    el('span', {}, el('b', { text: cast.name }), levelPips(spell, lesson.level), spellMeta(cast)),
    failed
      ? iconElement('lock', 2, 'Win this lesson to unlock')
      : lesson.level > 1
        ? iconElement('scroll', 2, 'Next level')
        : el('span'),
    difficultyPips(lesson.difficulty),
  );
  return node;
}

/**
 * A conversation: who is speaking, what they say, and for a challenge, a
 * picture of what they want (the challenge card) and what they give back.
 * A mentor's lessons are buttons; picking one calls `onLesson`.
 */
export function conversationBody(
  atlas: Atlas,
  interaction: Interaction,
  onLesson: (lesson: Lesson) => void = () => {},
): HTMLElement[] {
  const body = [speech(atlas, interaction.sprite, interaction.text)];
  if (interaction.kind === 'lessons') {
    body.push(
      el(
        'div',
        { className: 'lessons' },
        ...interaction.lessons.map((lesson) =>
          lessonButton(
            lesson,
            interaction.failed?.spellId === lesson.spellId &&
              interaction.failed.level === lesson.level,
            onLesson,
          ),
        ),
      ),
    );
  }
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
