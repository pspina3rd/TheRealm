import { describe, expect, it } from 'vitest';
import type { BattleEvent } from '../src/battle/types';
import { ELEMENTS } from '../src/core/elements';
import {
  COLORS,
  ELEMENT_COLOR_OF,
  feedbackFor,
  lineColor,
  type Feedback,
} from '../src/ui/art/feedback';
import {
  ELEMENT_ICONS,
  ICONS,
  ICON_SIZE,
  ITEM_ICONS,
  PALETTES,
  iconPixels,
  itemIcon,
  type IconId,
} from '../src/ui/art/icons';
import { ITEMS } from '../src/data/items';
import { CRYSTAL_HEX } from '../src/ui/crystals';

const kinds = (feedback: Feedback[]) => feedback.map((f) => f.kind);

describe('icons', () => {
  it('are 12×12 grids of palette letters', () => {
    for (const [id, icon] of Object.entries(ICONS)) {
      expect(icon.rows, id).toHaveLength(ICON_SIZE);
      for (const row of icon.rows) {
        expect(row, id).toHaveLength(ICON_SIZE);
        expect(row, id).toMatch(/^[.odbhw]+$/);
      }
    }
  });

  it('gives every element its own icon', () => {
    const icons = ELEMENTS.map((e) => ELEMENT_ICONS[e]);
    expect(new Set(icons).size).toBe(ELEMENTS.length);
    for (const icon of icons) expect(ICONS[icon]).toBeDefined();
  });

  it('gives every item an icon, with valid shapes and badges', () => {
    expect(Object.keys(ITEM_ICONS).sort()).toEqual(Object.keys(ITEMS).sort());
    for (const spec of Object.values(ITEM_ICONS)) {
      expect(ICONS[spec.icon]).toBeDefined();
      if (spec.badge) expect(ICONS[spec.badge]).toBeDefined();
    }
    expect(itemIcon('nope')).toEqual({ icon: 'bag' });
  });

  it('recolours a shape with another palette', () => {
    const copper = iconPixels('sword', undefined, PALETTES.copper).flat();
    expect(copper).toContain(PALETTES.copper.b);
    expect(copper).not.toContain(ICONS.sword.palette.b);
  });

  it('resolves palette colours, or a single silhouette colour', () => {
    const pixels = iconPixels('heart');
    expect(pixels).toHaveLength(ICON_SIZE);
    expect(pixels[0]![0]).toBeNull();
    expect(new Set(pixels.flat().filter(Boolean)).size).toBeGreaterThan(2);
    const silhouette = iconPixels('heart', '#000');
    expect(new Set(silhouette.flat().filter(Boolean))).toEqual(new Set(['#000']));
  });
});

describe('feedbackFor', () => {
  it('flashes cleared rows in their strongest element, or white when mixed', () => {
    expect(lineColor({ red: 6, blue: 4 })).toBe(CRYSTAL_HEX.red);
    expect(lineColor({ stone: 9, cyan: 1 })).toBe('#ffffff');
    expect(
      feedbackFor({ kind: 'lines', rows: [18, 19], lines: [{ green: 10 }, { stone: 10 }] }),
    ).toEqual([{ kind: 'flashRows', rows: [18, 19], colors: [CRYSTAL_HEX.green, '#ffffff'] }]);
  });

  it('glows only the mana pools that filled', () => {
    expect(feedbackFor({ kind: 'mana', gained: { fire: 3, wind: 0 } })).toEqual([
      { kind: 'mana', elements: ['fire'], direction: 'up' },
    ]);
  });

  it('bursts the element icon from the line and plays its effect', () => {
    const fire = feedbackFor({ kind: 'surge', element: 'fire', power: 9, row: 17 });
    expect(fire).toContainEqual({ kind: 'icon', target: 'board', icon: 'fire', row: 17 });
    expect(fire).toContainEqual({ kind: 'vfx', target: 'enemy', effect: 'fire' });
    const nature = feedbackFor({ kind: 'surge', element: 'nature', power: 9, row: 3 });
    expect(nature).toContainEqual({ kind: 'vfx', target: 'hero', effect: 'heal' });
    expect(kinds(feedbackFor({ kind: 'surge', element: 'earth', power: 9, row: 3 }))).toEqual([
      'icon',
    ]);
  });

  it('floats damage in the element colour, marked weak or resisted', () => {
    const weak = feedbackFor({ kind: 'enemyHit', amount: 24, element: 'water', affinity: 'weak' });
    expect(weak[0]).toEqual({
      kind: 'float',
      target: 'enemy',
      text: '24',
      color: ELEMENT_COLOR_OF.water,
      icon: 'weak',
    });
    expect(weak[1]).toEqual({ kind: 'shake', target: 'enemy' });
    const plain = feedbackFor({ kind: 'enemyHit', amount: 13, element: null, affinity: null });
    expect(plain[0]).toEqual({ kind: 'float', target: 'enemy', text: '13', color: COLORS.damage });
    const resisted = feedbackFor({
      kind: 'enemyHit',
      amount: 3,
      element: 'fire',
      affinity: 'resist',
    });
    expect(resisted[0]).toMatchObject({ icon: 'resist' });
  });

  it('names enemy moves in a banner', () => {
    expect(
      feedbackFor({ kind: 'enemyMove', move: { kind: 'attack', name: 'Stab', power: 3 } }),
    ).toEqual([{ kind: 'banner', text: 'Stab' }]);
  });

  it('shows something for every event', () => {
    const events: BattleEvent[] = [
      { kind: 'enemyDefeated' },
      { kind: 'enemyHeal', amount: 5 },
      { kind: 'heroHit', amount: 7 },
      { kind: 'heroHeal', amount: 9 },
      { kind: 'ward', total: 9 },
      { kind: 'chill' },
      { kind: 'tailwind', pieces: 5 },
      { kind: 'haste', pieces: 3 },
      { kind: 'curse', rows: 2 },
      { kind: 'drain', element: 'arcane', amount: 3 },
      { kind: 'spell', spellId: 'thunder' },
      { kind: 'spell', spellId: 'cure' },
      { kind: 'item', itemId: 'herb' },
      { kind: 'overflow' },
      { kind: 'revive' },
      { kind: 'price', multiplier: 0.85 },
    ];
    for (const event of events) expect(feedbackFor(event).length, event.kind).toBeGreaterThan(0);
  });

  it('targets healing spells at the hero and attacks at the enemy', () => {
    expect(feedbackFor({ kind: 'spell', spellId: 'cure' })).toEqual([
      { kind: 'vfx', target: 'hero', effect: 'heal' },
    ]);
    expect(feedbackFor({ kind: 'spell', spellId: 'thunder' })).toEqual([
      { kind: 'vfx', target: 'enemy', effect: 'thunder' },
    ]);
    expect(feedbackFor({ kind: 'spell', spellId: 'quake' })).toEqual([]);
  });

  it('shows drained mana as a loss on the right pool', () => {
    const drain = feedbackFor({ kind: 'drain', element: 'arcane', amount: 3 });
    expect(drain).toContainEqual({ kind: 'mana', elements: ['arcane'], direction: 'down' });
    expect(drain[0]).toMatchObject({ text: '-3', icon: ELEMENT_ICONS.arcane satisfies IconId });
  });

  it('shows haggle prices as percentages', () => {
    expect(feedbackFor({ kind: 'price', multiplier: 0.85 })[0]).toMatchObject({ text: '85%' });
  });
});
