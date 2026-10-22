/** Small visual building blocks shared by the menu, shop, conversation and results screens. */
import { ELEMENT_NAMES } from '../../core/elements';
import { ITEMS } from '../../data/items';
import { SPELLS } from '../../data/spells';
import type { ChallengeSpec, Reward } from '../../data/types';
import type { Gain } from '../../game/rewards';
import { ELEMENT_OF_COLOR } from '../../core/elements';
import type { CrystalColor } from '../../core/pieces';
import type { Atlas } from '../art/atlas';
import { isCreatureId, mapFrame, battleFrame, type CreatureId } from '../art/creatures';
import { ELEMENT_ICONS, PALETTES, itemIcon, type IconId, type IconSpec } from '../art/icons';
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
        el('span', { className: 'price-gauge', title: 'Clear lines to lower the price' }),
        pieces(spec.pieceLimit),
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
        return spell ? [chip(ELEMENT_ICONS[spell.element], spell.name, `Learn ${spell.name}`)] : [];
      }
      case 'shop':
        return [chip('bag', '', 'Opens the shop')];
      case 'flag':
        return [chip({ icon: 'lock', palette: PALETTES.open }, '', 'Unlocks the way forward')];
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
      case 'spell': {
        const spell = SPELLS[gain.spellId];
        return el(
          'div',
          { className: 'gain level-up' },
          chip(
            spell ? ELEMENT_ICONS[spell.element] : 'book',
            spell?.name ?? gain.spellId,
            'New spell',
          ),
        );
      }
    }
  });
}
