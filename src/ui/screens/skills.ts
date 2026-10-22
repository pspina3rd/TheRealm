import { STATS, STAT_IDS, type StatId } from '../../data/stats';
import type { Hero } from '../../game/hero';
import {
  AGILITY_SLOWDOWN,
  CHARM_DISCOUNT,
  INSIGHT_ENEMY_MOVE_RANK,
  INSIGHT_PREVIEW_RANKS,
  LUCK_CRIT_CHANCE,
  LUCK_DROP_BONUS,
  VITALITY_HP,
  canRaise,
  planCost,
  previewCount,
  seesEnemyMove,
  type StatPlan,
} from '../../game/stats';
import { STAT_ICONS, type IconId, type IconSpec } from '../art/icons';
import { button, el } from '../dom';
import { iconElement } from '../iconDraw';
import { chip, percent, sectionTitle } from './widgets';

/** What a rank of each stat adds up to at `rank`, as icon chips. */
function effectChips(stat: StatId, rank: number, tone: 'up' | undefined): HTMLElement[] {
  const c = (icon: IconId | IconSpec, value: string, label: string): HTMLElement =>
    chip(icon, value, label, tone);
  switch (stat) {
    case 'vitality':
      return [c('heart', `+${VITALITY_HP * rank}`, 'Max HP')];
    case 'strength':
      return [c('sword', `+${rank}`, 'Damage on every line strike')];
    case 'guard':
      return [c('ward', `−${rank}`, 'Damage from every enemy hit')];
    case 'focus':
      return [c('potion', `+${rank}`, 'Capacity of every mana pool')];
    case 'agility':
      return [c('boot', `−${percent(AGILITY_SLOWDOWN * rank)}`, 'Fall speed')];
    case 'insight':
      return [
        c('piece', `×${previewCount(rank)}`, 'Next pieces shown'),
        ...(seesEnemyMove(rank) ? [c('eye', '', 'The enemy’s next move is shown')] : []),
      ];
    case 'charm':
      return [c('coin', `−${percent(CHARM_DISCOUNT * rank)}`, 'Shop prices')];
    case 'luck':
      return [
        c('bag', `+${percent(LUCK_DROP_BONUS * rank)}`, 'Item drop chance'),
        c('clover', percent(LUCK_CRIT_CHANCE * rank), 'Double strike chance on 3+ lines'),
      ];
  }
}

/** Most point icons shown; the number beside them always gives the count. */
const MAX_POINT_ICONS = 5;

/** Ranks that unlock something new, marked on the pips. */
const MILESTONES: Partial<Record<StatId, readonly number[]>> = {
  insight: [...INSIGHT_PREVIEW_RANKS, INSIGHT_ENEMY_MOVE_RANK],
};

/** One pip per rank: owned, chosen on this screen, or still open (milestones ringed). */
function rankPips(stat: StatId, rank: number, added: number): HTMLElement {
  const { maxRank, name } = STATS[stat];
  const milestones = MILESTONES[stat] ?? [];
  return el(
    'span',
    { className: 'rank-pips', title: `${name} ${rank + added}/${maxRank}` },
    ...Array.from({ length: maxRank }, (_, i) => {
      const state = i < rank ? ' on' : i < rank + added ? ' staged' : '';
      const ring = milestones.includes(i + 1) ? ' milestone' : '';
      return el('span', { className: `pip${state}${ring}` });
    }),
  );
}

/**
 * The skill screen: the points waiting to be spent, then a row per stat
 * with its icon, rank pips, what its ranks add up to and −/+ buttons that
 * stage a choice. Nothing is spent until the caller confirms the plan.
 * Step buttons carry `data-stat` and `data-delta` so `focusStep` can keep
 * focus in place after a redraw.
 */
export function skillsBody(
  hero: Hero,
  plan: StatPlan,
  onAdjust: (stat: StatId, delta: 1 | -1) => void,
): HTMLElement[] {
  const left = hero.skillPoints - planCost(plan);
  const points = el(
    'div',
    { className: 'skill-points', title: `${left} skill points left` },
    ...Array.from({ length: Math.min(hero.skillPoints, MAX_POINT_ICONS) }, (_, i) => {
      const icon = iconElement('point', 2);
      if (i >= left) icon.classList.add('spent');
      return icon;
    }),
    el('b', { text: String(left) }),
  );

  const rows = STAT_IDS.map((stat) => {
    const rank = hero.stats[stat];
    const added = plan[stat] ?? 0;
    const step = (delta: 1 | -1, label: string, enabled: boolean): HTMLButtonElement => {
      const node = button(label, () => onAdjust(stat, delta), {
        disabled: !enabled,
        title: `${delta > 0 ? 'Raise' : 'Lower'} ${STATS[stat].name}`,
      });
      node.className = 'step';
      node.dataset.stat = stat;
      node.dataset.delta = String(delta);
      return node;
    };
    return el(
      'div',
      { className: `stat-row${added > 0 ? ' staged' : ''}`, title: STATS[stat].description },
      iconElement(STAT_ICONS[stat], 3, STATS[stat].name),
      el(
        'span',
        { className: 'stat-name' },
        el('b', { text: STATS[stat].name }),
        rankPips(stat, rank, added),
      ),
      el(
        'span',
        { className: `chips${rank + added === 0 ? ' none' : ''}` },
        ...effectChips(stat, rank + added, added > 0 ? 'up' : undefined),
      ),
      step(-1, '−', added > 0),
      step(1, '+', canRaise(hero.stats, hero.skillPoints, plan, stat)),
    );
  });

  return [points, sectionTitle('point', 'Stats'), el('div', { className: 'stat-rows' }, ...rows)];
}

/**
 * Focuses a step button after a redraw so keyboard play stays on the stat
 * just changed: the same button, else the other one in its row, else the
 * first + that can still be pressed, else any enabled step. Never an
 * action, so an extra key press can't confirm a permanent spend. Returns
 * false if no step can take focus.
 */
export function focusStep(root: ParentNode, last?: { stat: StatId; delta: 1 | -1 }): boolean {
  const steps = [...root.querySelectorAll<HTMLButtonElement>('.step:not(:disabled)')];
  const row = steps.filter((b) => b.dataset.stat === last?.stat);
  const target =
    row.find((b) => b.dataset.delta === String(last?.delta)) ??
    row[0] ??
    steps.find((b) => b.dataset.delta === '1') ??
    steps[0];
  target?.focus();
  return target !== undefined;
}
