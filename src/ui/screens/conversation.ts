import { ELEMENT_NAMES } from '../../core/elements';
import { ITEMS } from '../../data/items';
import { SPELLS } from '../../data/spells';
import { ATTITUDE_NAMES, type Attitude } from '../../game/attitude';
import type { Lesson } from '../../game/lessons';
import { castSpellFor, castSummary, newKnownSpell } from '../../game/spells';
import type { Interaction } from '../../game/encounter';
import type { Resolution } from '../../game/encounter';
import type { Epilogue } from '../../game/ending';
import type { Gain } from '../../game/rewards';
import type { Atlas } from '../art/atlas';
import { ATTITUDE_ICONS, ELEMENT_ICONS, itemIcon } from '../art/icons';
import { button, el, lineNodes } from '../dom';
import { iconElement } from '../iconDraw';
import {
  challengeCard,
  chip,
  difficultyPips,
  gainRows,
  hiddenSpellSlot,
  levelPips,
  rewardIcons,
  spellMeta,
  spritePortrait,
} from './widgets';

/** The speaker's portrait, with their face for the hero on it, beside a speech bubble. */
function speech(atlas: Atlas, sprite: string, text: string, attitude?: Attitude): HTMLElement {
  return el(
    'div',
    { className: 'speech' },
    el(
      'div',
      { className: 'speaker' },
      spritePortrait(atlas, sprite, 96),
      ...(attitude ? [iconElement(ATTITUDE_ICONS[attitude], 3, ATTITUDE_NAMES[attitude])] : []),
    ),
    el('p', { className: 'bubble' }, ...lineNodes(text)),
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
      ? iconElement('lock', 2, 'Win this lesson to lift the seal')
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
 * A mentor's lessons are buttons; picking one calls `onLesson`. Their
 * unrevealed hidden spells follow as silhouettes, and anything the hero
 * just handed over (`given`) shows under the speech.
 */
export function conversationBody(
  atlas: Atlas,
  interaction: Interaction,
  onLesson: (lesson: Lesson) => void = () => {},
  given: readonly Gain[] = [],
): HTMLElement[] {
  const body = [speech(atlas, interaction.sprite, interaction.text, interaction.attitude)];
  if (given.length > 0) body.push(el('div', { className: 'gains' }, ...gainRows(given)));
  if (interaction.kind === 'lessons') {
    body.push(
      el(
        'div',
        { className: 'lessons' },
        ...interaction.lessons.map((lesson) =>
          lessonButton(lesson, interaction.sealed === lesson.spellId, onLesson),
        ),
        ...interaction.silhouettes.map((slot) => hiddenSpellSlot(atlas, slot)),
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
    const extras = rewardIcons(interaction.extras);
    const rewards = [
      ...rewardIcons(interaction.rewards),
      ...(extras.length ? [el('span', { className: 'extras' }, ...extras)] : []),
    ];
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

/**
 * The chapter's end: the hero with their title's element, level and spell
 * count; the mentors whose magic they learned; and a last word from
 * someone who sent them below.
 */
export function epilogueBody(atlas: Atlas, epilogue: Epilogue): HTMLElement[] {
  return [
    el(
      'div',
      { className: 'epilogue-hero' },
      spritePortrait(atlas, epilogue.classSprite, 96),
      el(
        'div',
        { className: 'epilogue-stats' },
        el('b', { text: epilogue.title }),
        el(
          'span',
          { className: 'chips' },
          chip(ELEMENT_ICONS[epilogue.titleElement], '', ELEMENT_NAMES[epilogue.titleElement]),
          chip('star', `Lv ${epilogue.level}`, 'Level'),
          chip('book', `×${epilogue.spells}`, 'Spells known'),
        ),
      ),
    ),
    el(
      'div',
      { className: 'epilogue-mentors' },
      ...epilogue.mentors.map((mentor) => {
        const portrait = spritePortrait(atlas, mentor.sprite, 64);
        portrait.title = mentor.name;
        return portrait;
      }),
    ),
  ];
}
