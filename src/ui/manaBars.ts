/** Elemental mana shown as seven icon-topped pools, plus icon cost chips for spells. */
import { ELEMENTS, ELEMENT_NAMES, type Element } from '../core/elements';
import type { ElementAmounts } from '../data/types';
import type { Hero } from '../game/hero';
import { ELEMENT_COLOR_OF } from './art/feedback';
import { ELEMENT_ICONS } from './art/icons';
import { el } from './dom';
import { iconElement } from './iconDraw';

const GLOW_MS = 600;

/** Seven pools, one per element, each with its icon; updated in place. */
export class ManaBars {
  private readonly pools = new Map<
    Element,
    { root: HTMLElement; fill: HTMLElement; value: HTMLElement }
  >();

  constructor(container: HTMLElement, iconScale = 2) {
    container.classList.add('mana-bars');
    container.replaceChildren(
      ...ELEMENTS.map((element) => {
        const fill = el('span');
        fill.style.background = ELEMENT_COLOR_OF[element];
        const value = el('small');
        const root = el(
          'div',
          { className: 'mana-pool' },
          iconElement(ELEMENT_ICONS[element], iconScale, ELEMENT_NAMES[element]),
          el('div', { className: 'mana-track' }, fill),
          value,
        );
        this.pools.set(element, { root, fill, value });
        return root;
      }),
    );
  }

  update(hero: Hero): void {
    for (const element of ELEMENTS) {
      const pool = this.pools.get(element);
      if (!pool) continue;
      const percent = `${(100 * hero.mana[element]) / hero.manaCap}%`;
      pool.fill.style.height = percent;
      // Phones lay the pools out as rows; the fill's width follows this there.
      pool.fill.style.setProperty('--fill', percent);
      pool.value.textContent = String(hero.mana[element]);
      pool.root.classList.toggle('full', hero.mana[element] >= hero.manaCap);
    }
  }

  /** Makes pools glow when they fill, or flash when drained. */
  pulse(elements: readonly Element[], direction: 'up' | 'down'): void {
    for (const element of elements) {
      const root = this.pools.get(element)?.root;
      if (!root) continue;
      const cls = direction === 'up' ? 'glow' : 'drained';
      root.classList.remove(cls);
      void root.offsetWidth; // restart the CSS animation
      root.classList.add(cls);
      window.setTimeout(() => root.classList.remove(cls), GLOW_MS);
    }
  }
}

/** A spell cost as element icons with amounts, e.g. 🔥6 ⛰6. */
export function costIcons(cost: ElementAmounts): HTMLElement {
  return el(
    'span',
    { className: 'cost' },
    ...ELEMENTS.filter((e) => cost[e]).map((element) =>
      el(
        'span',
        { className: 'cost-item' },
        iconElement(ELEMENT_ICONS[element], 1, ELEMENT_NAMES[element]),
        String(cost[element]),
      ),
    ),
  );
}
