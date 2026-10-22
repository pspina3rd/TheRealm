/** Shared UI pieces for elements: mana bars, spell cost chips and the legend. */
import { SURGE_DESCRIPTIONS } from '../battle/elemental';
import { ELEMENTS, ELEMENT_NAMES, ELEMENT_OF_COLOR, type Element } from '../core/elements';
import type { CrystalColor } from '../core/pieces';
import type { ElementAmounts } from '../data/types';
import type { Hero } from '../game/hero';
import { CRYSTAL_HEX } from './crystals';
import { el } from './dom';

/** The crystal colour that shows each element. */
export const ELEMENT_HEX = Object.fromEntries(
  (Object.entries(ELEMENT_OF_COLOR) as [CrystalColor, Element][]).map(([color, element]) => [
    element,
    CRYSTAL_HEX[color],
  ]),
) as Readonly<Record<Element, string>>;

/** Seven small bars, one per elemental mana pool, updated in place. */
export class ManaBars {
  readonly root: HTMLElement;
  private readonly fills = new Map<Element, HTMLElement>();
  private readonly labels = new Map<Element, HTMLElement>();

  constructor(container: HTMLElement) {
    this.root = container;
    container.classList.add('mana-bars');
    container.replaceChildren(
      ...ELEMENTS.map((element) => {
        const fill = el('span');
        fill.style.background = ELEMENT_HEX[element];
        const label = el('small');
        this.fills.set(element, fill);
        this.labels.set(element, label);
        const bar = el(
          'div',
          { className: 'mana-bar' },
          el('div', { className: 'mana-track' }, fill),
          label,
        );
        bar.title = `${ELEMENT_NAMES[element]} mana`;
        return bar;
      }),
    );
  }

  update(hero: Hero): void {
    for (const element of ELEMENTS) {
      const value = hero.mana[element];
      const fill = this.fills.get(element);
      const label = this.labels.get(element);
      if (fill) fill.style.height = `${(100 * value) / hero.manaCap}%`;
      if (label) label.textContent = String(value);
    }
  }
}

/** Coloured chips showing a mana cost, e.g. [6 fire][6 earth]. */
export function costChips(cost: ElementAmounts): HTMLElement {
  return el(
    'span',
    { className: 'cost-chips' },
    ...ELEMENTS.filter((e) => cost[e]).map((element) => {
      const chip = el('span', { className: 'chip', text: String(cost[element]) });
      chip.style.background = ELEMENT_HEX[element];
      chip.title = `${cost[element]} ${ELEMENT_NAMES[element]} mana`;
      return chip;
    }),
  );
}

/** A table of what each crystal colour means. */
export function elementLegend(): HTMLElement {
  return el(
    'div',
    { className: 'legend' },
    ...ELEMENTS.map((element) => {
      const swatch = el('span', { className: 'swatch' });
      swatch.style.background = ELEMENT_HEX[element];
      return el(
        'div',
        { className: 'legend-row' },
        swatch,
        el('b', { text: ELEMENT_NAMES[element] }),
        el('small', { text: SURGE_DESCRIPTIONS[element] }),
      );
    }),
  );
}
