import { standardName, standardSpellText } from '../standardSpellText';
import { castSpellFor, newKnownSpell } from '../../game/spells';
/** Small visual building blocks shared by the menu, shop, conversation and results screens. */
import { ELEMENT_NAMES } from '../../core/elements';
import { ITEMS } from '../../data/items';
import { SPELLS } from '../../data/spells';
import type { ChallengeSpec, Reward, SpellDef } from '../../data/types';
import type { Gain } from '../../game/rewards';
import { maxLevel, spellName, type CastSpell } from '../../game/spells';
import { ELEMENT_OF_COLOR } from '../../core/elements';
import type { CrystalColor } from '../../core/pieces';
import type { Atlas } from '../art/atlas';
import { isCreatureId, mapFrame, battleFrame, type CreatureId } from '../art/creatures';
import type { HiddenSlot } from '../../game/hidden';
import { mentorOf } from '../../world/mentors';
import {
  ELEMENT_ICONS,
  FLAG_ICONS,
  PALETTES,
  SPELL_KIND_ICONS,
  UNLOCK_HINT_ICONS,
  itemIcon,
  type IconId,
  type IconSpec,
} from '../art/icons';
import { ELEMENT_COLOR_OF } from '../art/feedback';
import { costIcons } from '../manaBars';
import { el } from '../dom';
import { iconElement } from '../iconDraw';

/** The icon used for score points (a gold gem), distinct from the XP star. */
export const SCORE_ICON: IconSpec = { icon: 'shard', palette: PALETTES.gold };

/** An icon followed by a value, e.g. [coin] 25. */
export function chip(
  icon: IconId | IconSpec,
  value: string | number,
  label?: string,
  tone?: 'up' | 'down',
): HTMLElement {
  const node = el(
    'span',
    { className: `chip-value${tone ? ` ${tone}` : ''}` },
    iconElement(icon, 2, label),
    String(value),
  );
  if (label) node.title = label;
  return node;
}

/** A fraction as a whole percentage, e.g. 0.09 → "9%". */
export function percent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/**
 * A sprite drawn large on a small canvas, animated while it is on screen.
 * `pose` 'battle' uses the creature's battle portrait.
 */
export function spritePortrait(
  atlas: Atlas,
  sprite: string,
  size = 96,
  pose: 'map' | 'battle' = 'map',
): HTMLCanvasElement {
  const canvas = el('canvas', { className: 'portrait' });
  canvas.width = size;
  canvas.height = size;
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx || !isCreatureId(sprite)) return canvas;
  const id: CreatureId = sprite;
  const draw = (time: number): void => {
    if (!canvas.isConnected && time > 0) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    const region = pose === 'battle' ? battleFrame(id, time) : mapFrame(id, 'down', true, time);
    const scale = Math.max(1, Math.floor(size / Math.max(region.w, region.h)));
    const w = region.w * scale;
    const h = region.h * scale;
    atlas.draw(ctx, region, Math.round((size - w) / 2), size - h, w, h);
    requestAnimationFrame(draw);
  };
  draw(0);
  return canvas;
}

/** A labelled section header, e.g. the bag icon and "Items". */
export function sectionTitle(icon: IconId | IconSpec, text: string): HTMLElement {
  return el('h2', { className: 'section-title' }, iconElement(icon, 2), text);
}

/** A picture of what a challenge asks for. */
export function challengeCard(spec: ChallengeSpec): HTMLElement {
  const pieces = (n: number): HTMLElement => chip('piece', n, `${n} pieces`);
  switch (spec.kind) {
    case 'combat':
      return el('div', { className: 'challenge-card' }, iconElement('sword', 3, 'Battle'));
    case 'offering':
      return el(
        'div',
        { className: 'challenge-card' },
        iconElement('gift', 3, 'Offering'),
        chip(itemIcon(spec.itemId), '−1', ITEMS[spec.itemId]?.name),
        chip(SCORE_ICON, spec.targetScore, `Score ${spec.targetScore} points`),
        pieces(spec.pieceLimit),
      );
    case 'barter':
      return el(
        'div',
        { className: 'challenge-card' },
        iconElement('trade', 3, 'Barter'),
        ...Object.entries(spec.wants).map(([color, count]) => {
          const element = ELEMENT_OF_COLOR[color as CrystalColor];
          return chip(
            ELEMENT_ICONS[element],
            `×${count}`,
            `${count} ${ELEMENT_NAMES[element]} crystals`,
          );
        }),
        pieces(spec.pieceLimit),
      );
    case 'haggle':
      return el(
        'div',
        { className: 'challenge-card' },
        iconElement('coin', 3, 'Haggle'),
        pieces(spec.pieceLimit),
      );
    case 'lesson':
      return el(
        'div',
        { className: 'challenge-card' },
        iconElement('scroll', 3, 'Lesson'),
        difficultyPips(spec.difficulty),
      );
    case 'puzzle':
      return el(
        'div',
        { className: 'challenge-card' },
        iconElement('puzzle', 3, 'Puzzle'),
        el(
          'span',
          { className: 'line-pips', title: `Clear ${spec.linesToClear} lines` },
          ...Array.from({ length: spec.linesToClear }, () => el('span')),
        ),
        pieces(spec.queue.length),
      );
    case 'encounter':
      return el(
        'div',
        { className: 'challenge-card' },
        iconElement('puzzle', 3, 'Challenge'),
        ...(spec.strain > 0 ? [chip('hourglass', spec.strain, 'Harder after a fail')] : []),
      );
  }
}

/** Icons for what a challenge rewards. */
export function rewardIcons(rewards: readonly Reward[]): HTMLElement[] {
  return rewards.flatMap((reward): HTMLElement[] => {
    switch (reward.kind) {
      case 'gil':
        return [chip('coin', reward.amount, `${reward.amount} gil`)];
      case 'item':
        return [chip(itemIcon(reward.itemId), `×${reward.count}`, ITEMS[reward.itemId]?.name)];
      case 'spell': {
        const spell = SPELLS[reward.spellId];
        if (!spell) return [];
        const name = standardName(reward.spellId) ?? spellName(spell);
        return [chip(ELEMENT_ICONS[spell.category], name, `Learn ${name}`)];
      }
      case 'shop':
        return [chip('coin', '', 'Opens the shop')];
      case 'flag': {
        const flag = FLAG_ICONS[reward.flag];
        return [
          flag
            ? chip(flag, '', flag.label)
            : chip({ icon: 'lock', palette: PALETTES.open }, '', 'Unlocks the way forward'),
        ];
      }
    }
  });
}

/** Rows showing what was gained or lost after a battle. */
export function gainRows(gains: readonly Gain[]): HTMLElement[] {
  return gains.map((gain) => {
    switch (gain.kind) {
      case 'xp':
        return el('div', { className: 'gain' }, chip('star', `+${gain.amount}`, 'Experience'));
      case 'level':
        return el(
          'div',
          { className: 'gain level-up' },
          chip('star', `Lv ${gain.level}`, 'Level up!'),
          chip('point', `+${gain.points}`, 'Skill points'),
        );
      case 'gil':
        return el(
          'div',
          { className: `gain${gain.amount < 0 ? ' loss' : ''}` },
          chip('coin', gain.amount > 0 ? `+${gain.amount}` : gain.amount, 'Gil'),
        );
      case 'item': {
        const name = ITEMS[gain.itemId]?.name ?? gain.itemId;
        return el(
          'div',
          { className: `gain${gain.count < 0 ? ' loss' : ''}` },
          chip(itemIcon(gain.itemId), gain.count > 0 ? `+${gain.count}` : gain.count, name),
          el('span', { text: name }),
        );
      }
      case 'spell':
      case 'spellLevel': {
        const spell = SPELLS[gain.spellId];
        const level = gain.kind === 'spellLevel' ? gain.level : 1;
        return el(
          'div',
          { className: 'gain level-up' },
          chip(
            spell ? ELEMENT_ICONS[spell.category] : 'book',
            spell
              ? `${standardName(gain.spellId) ?? spellName(spell, level)} · Lv ${level}`
              : gain.spellId,
            gain.kind === 'spell' ? 'New spell' : `Level ${level}`,
          ),
          ...(spell ? [levelPips(spell, level)] : []),
          ...(spell && standardName(gain.spellId)
            ? [
                el(
                  'div',
                  { className: 'spell-learned-flow' },
                  el('b', { text: 'Clear a line → charge mana → AUTO cast' }),
                  el('small', {
                    text:
                      standardSpellText(
                        gain.spellId,
                        castSpellFor(spell, { ...newKnownSpell(), level }),
                      ) ?? '',
                  }),
                  el('small', {
                    text: 'In fights, the learned level casts when affordable and useful. Lessons remain hands-on practice.',
                  }),
                ),
              ]
            : []),
        );
      }
      case 'seal':
      case 'unseal': {
        const open = gain.kind === 'unseal';
        const spell = SPELLS[gain.spellId];
        return el(
          'div',
          { className: `gain${open ? ' level-up' : ' loss'}` },
          iconElement(
            open ? { icon: 'lock', palette: PALETTES.open } : 'lock',
            2,
            open ? 'Seal lifted' : 'Sealed until you win the lesson back, or win monster fights',
          ),
          chip(
            spell ? ELEMENT_ICONS[spell.category] : 'book',
            spell ? spellName(spell) : gain.spellId,
            spell ? ELEMENT_NAMES[spell.category] : '',
          ),
        );
      }
      case 'regard':
        return el(
          'div',
          { className: `gain${gain.delta >= 0 ? ' level-up' : ' loss'}` },
          regardPips(gain.level),
          el('span', { text: gain.delta > 0 ? '+1' : gain.delta < 0 ? '−1' : '±0' }),
        );
      case 'strain':
        return el(
          'div',
          { className: `gain${gain.level > 0 ? ' loss' : ''}` },
          chip('hourglass', gain.level, `Next try is harder by ${gain.level}`),
        );
      case 'price':
        return el(
          'div',
          { className: `gain${gain.multiplier <= 1 ? ' level-up' : ' loss'}` },
          chip('coin', `${Math.round(gain.multiplier * 100)}%`, 'Prices here'),
        );
    }
  });
}

/** Someone's regard, −2 to +2, as five pips around a centre (filled toward the side it leans). */
export function regardPips(level: number): HTMLElement {
  return el(
    'span',
    { className: 'rank-pips regard-pips', title: `Regard ${level > 0 ? '+' : ''}${level}` },
    ...[-2, -1, 0, 1, 2].map((step) =>
      el('span', {
        className: `pip${step === 0 ? ' mid' : ''}${(step > 0 && step <= level) || (step < 0 && step >= level) ? (step > 0 ? ' on' : ' low') : ''}`,
      }),
    ),
  );
}

/** A lesson's difficulty as swords, one per point. */
export function difficultyPips(difficulty: number): HTMLElement {
  return el(
    'span',
    { className: 'difficulty', title: `Difficulty ${difficulty}` },
    ...Array.from({ length: difficulty }, () => iconElement('sword', 2)),
  );
}

/** A spell's level as pips, e.g. ●●○○ for level 2 of 4; nothing for single-level spells. */
export function levelPips(spell: SpellDef, level: number): HTMLElement {
  const max = maxLevel(spell);
  return el(
    'span',
    { className: 'level-pips', title: max > 1 ? `Level ${level}/${max}` : '' },
    ...(max > 1
      ? Array.from({ length: max }, (_, i) => el('span', { className: i < level ? 'on' : '' }))
      : []),
  );
}

/** What kind of spell a cast is (an icon) and what it costs. */
export function spellMeta(cast: CastSpell): HTMLElement {
  return el(
    'span',
    { className: 'spell-meta' },
    iconElement(SPELL_KIND_ICONS[cast.effect.kind], 1),
    costIcons(cast.cost),
  );
}

/**
 * A hidden spell the hero doesn't know: a dark silhouette with a faint hint
 * of what kind of thing reveals it, or, once revealed, lit in its element's
 * colour with the face of the mentor who will teach it. Never its name.
 */
export function hiddenSpellSlot(atlas: Atlas, { spell, state, progress }: HiddenSlot): HTMLElement {
  const element = spell.category;
  const mentor = mentorOf(element);
  if (state === 'unlocked') {
    const node = el(
      'div',
      { className: 'hidden-spell unlocked', title: mentor?.name ?? '' },
      iconElement(ELEMENT_ICONS[element], 3),
      ...(mentor ? [spritePortrait(atlas, mentor.sprite, 32)] : []),
    );
    node.style.setProperty('--glow', ELEMENT_COLOR_OF[element]);
    return node;
  }
  return el(
    'div',
    { className: 'hidden-spell', title: '?' },
    iconElement({ icon: ELEMENT_ICONS[element], palette: PALETTES.shadow }, 3),
    el(
      'span',
      { className: 'hint' },
      iconElement(UNLOCK_HINT_ICONS[spell.hidden?.kind ?? 'stat'], 2),
    ),
    ...(progress
      ? [
          el('span', {
            className: 'progress-pips',
            text:
              '●'.repeat(Math.min(progress.have, progress.want)) +
              '○'.repeat(Math.max(0, progress.want - progress.have)),
          }),
        ]
      : []),
  );
}
