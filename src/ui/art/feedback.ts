/**
 * What the player sees for each battle event: floating numbers, spell
 * effects, flashing rows, rising icons and move banners. Pure data, so the
 * mapping is testable; the battle screen plays whatever this returns.
 */
import type { CellTally } from '../../core/board';
import { ELEMENTS, dominantElement, elementsOf, type Element } from '../../core/elements';
import type { BattleEvent } from '../../battle/types';
import { CRYSTAL_HEX } from '../crystals';
import { ELEMENT_ICONS, type IconId } from './icons';
import { SPELL_EFFECTS, type EffectId } from './vfx';
import { SPELLS } from '../../data/spells';

/** Where on the battle screen feedback appears. */
export type Target = 'enemy' | 'hero' | 'board';

export type Feedback =
  /** A number (or short value) that floats up and fades. */
  | {
      readonly kind: 'float';
      readonly target: Target;
      readonly text: string;
      readonly color: string;
      readonly icon?: IconId;
    }
  /** A sprite-sheet effect played over a target. */
  | { readonly kind: 'vfx'; readonly target: Target; readonly effect: EffectId }
  /** An icon that pops and rises; `row` places it on the board. */
  | { readonly kind: 'icon'; readonly target: Target; readonly icon: IconId; readonly row?: number }
  /** Board rows flash in the given colours. */
  | {
      readonly kind: 'flashRows';
      readonly rows: readonly number[];
      readonly colors: readonly string[];
    }
  /** The enemy's move name, shown as a banner. */
  | { readonly kind: 'banner'; readonly text: string }
  | { readonly kind: 'shake'; readonly target: Target }
  /** Mana pools that just changed glow (up) or flash (down). */
  | {
      readonly kind: 'mana';
      readonly elements: readonly Element[];
      readonly direction: 'up' | 'down';
    }
  | { readonly kind: 'defeat' };

export const COLORS = {
  damage: '#ffffff',
  heroDamage: '#ff5c7a',
  heal: '#6ff08f',
  price: '#f5d77b',
  crit: '#b4f5a0',
} as const;

/** Colour of each element's crystals. */
export const ELEMENT_COLOR_OF: Readonly<Record<Element, string>> = {
  fire: CRYSTAL_HEX.red,
  water: CRYSTAL_HEX.blue,
  lightning: CRYSTAL_HEX.gold,
  nature: CRYSTAL_HEX.green,
  earth: CRYSTAL_HEX.orange,
  arcane: CRYSTAL_HEX.violet,
  wind: CRYSTAL_HEX.cyan,
};

/** Effect played on the enemy when a line's element fires (if any). */
const SURGE_EFFECTS: Partial<Record<Element, EffectId>> = {
  fire: 'fire',
  lightning: 'thunder',
  water: 'ice',
};

/** The colour a cleared line flashes: its strongest element, or white for mixed lines. */
export function lineColor(line: CellTally): string {
  const top = dominantElement(elementsOf(line));
  return top && top.count >= 3 ? ELEMENT_COLOR_OF[top.element] : '#ffffff';
}

export function feedbackFor(event: BattleEvent): Feedback[] {
  switch (event.kind) {
    case 'lines':
      return [{ kind: 'flashRows', rows: event.rows, colors: event.lines.map(lineColor) }];
    case 'mana':
      return [
        {
          kind: 'mana',
          elements: ELEMENTS.filter((e) => (event.gained[e] ?? 0) > 0),
          direction: 'up',
        },
      ];
    case 'surge': {
      const effect = SURGE_EFFECTS[event.element];
      return [
        { kind: 'icon', target: 'board', icon: ELEMENT_ICONS[event.element], row: event.row },
        ...(effect ? [{ kind: 'vfx', target: 'enemy', effect } as const] : []),
        ...(event.element === 'nature'
          ? [{ kind: 'vfx', target: 'hero', effect: 'heal' } as const]
          : []),
      ];
    }
    case 'enemyHit': {
      const icon: IconId | undefined =
        event.affinity === 'weak' ? 'weak' : event.affinity === 'resist' ? 'resist' : undefined;
      return [
        {
          kind: 'float',
          target: 'enemy',
          text: String(event.amount),
          color: event.element ? ELEMENT_COLOR_OF[event.element] : COLORS.damage,
          ...(icon ? { icon } : {}),
        },
        { kind: 'shake', target: 'enemy' },
      ];
    }
    case 'crit':
      return [
        { kind: 'icon', target: 'enemy', icon: 'clover' },
        { kind: 'float', target: 'enemy', text: '×2', color: COLORS.crit, icon: 'clover' },
      ];
    case 'enemyDefeated':
      return [{ kind: 'defeat' }];
    case 'enemyMove':
      return [{ kind: 'banner', text: event.move.name }];
    case 'enemyHeal':
      return [{ kind: 'float', target: 'enemy', text: `+${event.amount}`, color: COLORS.heal }];
    case 'heroHit':
      return [
        { kind: 'float', target: 'hero', text: String(event.amount), color: COLORS.heroDamage },
        { kind: 'vfx', target: 'hero', effect: 'hit' },
        { kind: 'shake', target: 'hero' },
      ];
    case 'heroHeal':
      return [
        {
          kind: 'float',
          target: 'hero',
          text: `+${event.amount}`,
          color: COLORS.heal,
          icon: 'heart',
        },
      ];
    case 'ward':
      return [{ kind: 'icon', target: 'hero', icon: 'ward' }];
    case 'chill':
      return [{ kind: 'icon', target: 'enemy', icon: 'water' }];
    case 'tailwind':
      return [{ kind: 'icon', target: 'board', icon: 'wind' }];
    case 'haste':
      return [{ kind: 'icon', target: 'board', icon: 'haste' }];
    case 'curse':
      return [{ kind: 'shake', target: 'board' }];
    case 'drain':
      return [
        {
          kind: 'float',
          target: 'hero',
          text: `-${event.amount}`,
          color: ELEMENT_COLOR_OF[event.element],
          icon: ELEMENT_ICONS[event.element],
        },
        { kind: 'mana', elements: [event.element], direction: 'down' },
      ];
    case 'spell': {
      const effect = SPELL_EFFECTS[event.spellId];
      if (!effect) return [];
      const healing = SPELLS[event.spellId]?.effect.kind === 'heal';
      return [{ kind: 'vfx', target: healing ? 'hero' : 'enemy', effect }];
    }
    case 'item':
      return [{ kind: 'vfx', target: 'hero', effect: 'heal' }];
    case 'overflow':
      return [
        { kind: 'shake', target: 'board' },
        { kind: 'flashRows', rows: Array.from({ length: 20 }, (_, i) => i), colors: ['#ff5c7a'] },
      ];
    case 'revive':
      return [
        { kind: 'vfx', target: 'hero', effect: 'heal' },
        { kind: 'icon', target: 'hero', icon: 'heart' },
      ];
    case 'price':
      return [
        {
          kind: 'float',
          target: 'enemy',
          text: `${Math.round(event.multiplier * 100)}%`,
          color: COLORS.price,
        },
      ];
  }
}
