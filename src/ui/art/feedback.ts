/**
 * What the player sees for each battle event: floating numbers, spell
 * effects, flashing rows, rising icons and move banners. Pure data, so the
 * mapping is testable; the battle screen plays whatever this returns.
 */
import type { CellTally } from '../../core/board';
import { ELEMENTS, dominantElement, elementsOf, type Element } from '../../core/elements';
import type { BattleEvent, Beat, Face } from '../../battle/types';
import { CRYSTAL_HEX } from '../crystals';
import { ELEMENT_ICONS, type IconId } from './icons';
import { SPELL_EFFECTS, type EffectId } from './vfx';
import { SPELLS } from '../../data/spells';
import type { SpellEffect } from '../../data/types';

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
  | { readonly kind: 'defeat' }
  /** A mentor tossed a piece: their portrait pulses and the tossed piece glows. */
  | { readonly kind: 'toss'; readonly element: Element }
  /** The enemy's action gauge jumped (a mistake fed it): the gauge flashes. */
  | { readonly kind: 'rush' }
  /** Board cells ([x, y]) flash, e.g. crystals just turned to stone. */
  | { readonly kind: 'flashCells'; readonly cells: readonly (readonly [number, number])[] }
  /** The person in the stage strip pulls a face (wordless). */
  | { readonly kind: 'face'; readonly face: Face }
  /** The person says their line for this moment (the screen looks up the words). */
  | { readonly kind: 'beat'; readonly beat: Beat };

export const COLORS = {
  damage: '#ffffff',
  heroDamage: '#ff5c7a',
  heal: '#6ff08f',
  price: '#f5d77b',
  crit: '#b4f5a0',
  combo: '#f5d77b',
  rush: '#ff9a3c',
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

/** Kinds of spell whose effect plays on the hero rather than the enemy. */
const HERO_SPELL_KINDS: readonly SpellEffect['kind'][] = ['heal', 'regen', 'ward', 'manaTap'];

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
    case 'enrage':
      return [
        { kind: 'banner', text: 'Enraged!' },
        { kind: 'shake', target: 'enemy' },
      ];
    case 'enemyMove':
      return [{ kind: 'banner', text: event.move.name }];
    case 'fizzle':
      return [
        { kind: 'icon', target: 'enemy', icon: 'water' },
        { kind: 'float', target: 'enemy', text: 'Miss', color: ELEMENT_COLOR_OF.water },
      ];
    case 'toss':
      return [
        { kind: 'toss', element: event.element },
        { kind: 'icon', target: 'board', icon: ELEMENT_ICONS[event.element], row: 2 },
      ];
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
    case 'manaBoost':
      return [{ kind: 'icon', target: 'board', icon: 'potion' }];
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
      const kind = SPELLS[event.spellId]?.levels[0].effect.kind;
      const onHero = kind !== undefined && HERO_SPELL_KINDS.includes(kind);
      return [{ kind: 'vfx', target: onHero ? 'hero' : 'enemy', effect }];
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
    case 'rush':
      return [
        { kind: 'rush' },
        {
          kind: 'float',
          target: 'enemy',
          text: `+${event.holes}`,
          color: COLORS.rush,
          icon: 'haste',
        },
      ];
    case 'gaugeJump':
      return [{ kind: 'rush' }];
    case 'combo':
      return [
        {
          kind: 'float',
          target: 'enemy',
          text: `×${event.steps + 1}`,
          color: COLORS.combo,
          icon: 'burst',
        },
      ];
    case 'backToBack':
      return [{ kind: 'float', target: 'enemy', text: '×1.5', color: COLORS.combo, icon: 'lines' }];
    case 'fog':
      return [{ kind: 'icon', target: 'board', icon: 'eye' }];
    case 'seal':
      return [
        { kind: 'icon', target: 'board', icon: 'lock' },
        { kind: 'shake', target: 'board' },
      ];
    case 'petrify':
      return [
        { kind: 'flashCells', cells: event.cells },
        { kind: 'icon', target: 'board', icon: 'shard' },
      ];
    case 'quicken':
      return [{ kind: 'icon', target: 'board', icon: 'hourglass' }];
    case 'price':
      return [
        {
          kind: 'float',
          target: 'enemy',
          text: `${Math.round(event.multiplier * 100)}%`,
          color: COLORS.price,
        },
      ];
    case 'begin':
      return [];
    case 'demo':
      return [{ kind: 'icon', target: 'board', icon: 'star' }];
    case 'face':
      return [{ kind: 'face', face: event.face }];
    case 'beat':
      return [{ kind: 'beat', beat: event.beat }];
    case 'rise':
      // A curse already shakes the board (see 'curse').
      return event.source === 'curse' ? [] : [{ kind: 'shake', target: 'board' }];
    case 'holes':
      return [];
    case 'lamp':
      return [{ kind: 'icon', target: 'board', icon: event.lit ? 'star' : 'wind' }];
    case 'spread':
    case 'spores':
      return [{ kind: 'flashCells', cells: event.cells }];
    case 'saved':
      return [{ kind: 'icon', target: 'board', icon: 'mushroom' }];
    case 'lost':
      return [{ kind: 'shake', target: 'board' }];
    case 'sent':
      return [{ kind: 'float', target: 'enemy', text: `+${event.rows}`, color: COLORS.combo }];
    case 'shield':
      return event.up
        ? [{ kind: 'icon', target: 'enemy', icon: 'ward' }]
        : [
            { kind: 'shake', target: 'enemy' },
            { kind: 'icon', target: 'enemy', icon: 'burst' },
          ];
  }
}
