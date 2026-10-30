import { BOARD_SPELLS } from '../../battle/magicCasting';
import { standardName, standardSpellText } from '../standardSpellText';
import { ELEMENT_NAMES, type Element } from '../../core/elements';
import {
  EFFECT_ENHANCEMENTS,
  ENHANCEMENTS,
  ENHANCEMENT_IDS,
  SPELLS,
  type EnhancementId,
} from '../../data/spells';
import { STATS, STAT_IDS, type StatId } from '../../data/stats';
import type { Hero } from '../../game/hero';
import { canEnhance, canRaiseStat, skillPlanCost, type SkillPlan } from '../../game/skills';
import {
  castEffect,
  castPower,
  castSpellFor,
  isSealed,
  isReady,
  knownSpell,
  levelStep,
  spellCategories,
  stepSize,
  totalEnhancements,
  type CastSpell,
} from '../../game/spells';
import {
  AGILITY_SLOWDOWN,
  INSIGHT_ENEMY_MOVE_RANK,
  INSIGHT_PREVIEW_RANKS,
  LUCK_CRIT_CHANCE,
  LUCK_DROP_BONUS,
  VITALITY_HP,
  previewCount,
  seesEnemyMove,
} from '../../game/stats';
import {
  ELEMENT_ICONS,
  ENHANCEMENT_ICONS,
  STAT_ICONS,
  type IconId,
  type IconSpec,
} from '../art/icons';
import { button, el } from '../dom';
import { iconElement } from '../iconDraw';
import { costIcons } from '../manaBars';
import { chip, levelPips, percent, sectionTitle } from './widgets';

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
      return [c('faceFriendly', `+${rank}`, 'Attitude of everyone you meet')];
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

/** What a step button changes: a stat rank or a spell attribute. */
export type StepTarget =
  | { readonly kind: 'stat'; readonly stat: StatId }
  | { readonly kind: 'spell'; readonly spellId: string; readonly attribute: EnhancementId };

/** A step button's `data-step` key, so focus can find it again after a redraw. */
export function stepKey(target: StepTarget): string {
  return target.kind === 'stat' ? `stat:${target.stat}` : `spell:${target.spellId}`;
}

/** A − or + button that stages a change. */
function stepButton(
  target: StepTarget,
  delta: 1 | -1,
  enabled: boolean,
  title: string,
  onAdjust: (target: StepTarget, delta: 1 | -1) => void,
): HTMLButtonElement {
  const node = button(delta > 0 ? '+' : '−', () => onAdjust(target, delta), {
    disabled: !enabled,
    title: `${delta > 0 ? 'Raise' : 'Lower'} ${title}`,
  });
  node.className = 'step';
  node.dataset.step = stepKey(target);
  if (target.kind === 'spell') node.dataset.attribute = target.attribute;
  node.dataset.delta = String(delta);
  return node;
}

/** One pip per enhancement in this step: bought, staged, or still required (ringed). */
function attributePips(have: number, staged: number, required: number): HTMLElement {
  const total = Math.max(have + staged, required);
  return el(
    'span',
    { className: 'rank-pips' },
    ...Array.from({ length: total }, (_, i) => {
      const state = i < have ? ' on' : i < have + staged ? ' staged' : ' milestone';
      return el('span', { className: `pip${state}` });
    }),
  );
}

/**
 * What an attribute currently gives, beside its icon: damage or healing,
 * mana taken off (with the cost left), or the side effect. `count` is the
 * attribute's enhancements in all, staged ones included.
 */
function attributeValue(
  attribute: EnhancementId,
  cast: CastSpell,
  count: number,
  up: boolean,
  boardSpell = false,
  trainingOnly = false,
): HTMLElement {
  const tone = up ? ' up' : '';
  if (trainingOnly && attribute !== 'efficiency')
    return el('span', { className: `chip-value${tone}`, text: `Training +${count}` });
  if (boardSpell && attribute !== 'efficiency')
    return el('span', {
      className: `chip-value${tone}`,
      text: attribute === 'power' ? `Row attacks +${count * 20}%` : `Clear surge +${count * 3}`,
    });
  switch (attribute) {
    case 'power':
      return el('span', { className: `chip-value${tone}`, text: String(castPower(cast.effect)) });
    case 'efficiency':
      // Mana taken off each element, then the cost that leaves.
      return el(
        'span',
        { className: 'efficiency' },
        el('span', { className: `chip-value${tone}`, text: `−${count}` }),
        costIcons(cast.cost),
      );
    case 'effect': {
      const value = castEffect(cast);
      const text = cast.effect.kind === 'drain' ? `${value}%` : String(value);
      return el('span', { className: `chip-value${tone}`, text });
    }
  }
}

/**
 * A row per known spell: its element, name, level pips and, while it can
 * still level, the skill points one enhancement costs, the step's progress
 * pips and each attribute's pips, value and −/+ buttons. A spell whose
 * step is complete glows and shows a scroll (ready for a mentor); a sealed
 * spell shows a lock and where its mentor is (`lockHint`); it can still
 * be enhanced.
 */
function spellRows(
  hero: Hero,
  plan: SkillPlan,
  onAdjust: (target: StepTarget, delta: 1 | -1) => void,
  lockHint?: (category: Element) => HTMLElement,
): HTMLElement[] {
  return spellCategories(hero).flatMap(({ spells }) =>
    spells.flatMap((spellId) => {
      const spell = SPELLS[spellId];
      const known = knownSpell(hero, spellId);
      if (!spell || !known) return [];
      const staged = plan.spells[spellId] ?? {};
      const cast = castSpellFor(spell, known, staged);
      const step = levelStep(spell, known.level);
      const locked = isSealed(hero, spellId);
      const ready = isReady(spell, known, staged);
      const anyStaged = ENHANCEMENT_IDS.some((id) => (staged[id] ?? 0) > 0);
      const header = el(
        'div',
        { className: 'spell-head' },
        iconElement(ELEMENT_ICONS[spell.category], 3, ELEMENT_NAMES[spell.category]),
        el(
          'span',
          { className: 'stat-name' },
          el('b', { text: `${standardName(spellId) ?? cast.name} · Lv ${cast.level}` }),
          levelPips(spell, cast.level),
        ),
      );
      if (step) {
        const used = ENHANCEMENT_IDS.reduce((sum, id) => sum + known.step[id], 0);
        const adding = ENHANCEMENT_IDS.reduce((sum, id) => sum + (staged[id] ?? 0), 0);
        header.append(
          chip('point', step.cost, `${step.cost} skill points per enhancement`),
          el(
            'span',
            {
              className: 'rank-pips step-pips',
              title: `Next level: ${used + adding}/${stepSize(step)}`,
            },
            ...Array.from({ length: stepSize(step) }, (_, i) =>
              el('span', {
                className: `pip${i < used ? ' on' : i < used + adding ? ' staged' : ''}`,
              }),
            ),
          ),
        );
      }
      if (ready)
        header.append(iconElement('scroll', 2, 'Ready: a mentor can teach the next level'));
      if (locked) {
        header.append(iconElement('lock', 2, 'Sealed: win the lesson back, or win monster fights'));
        if (lockHint) header.append(lockHint(spell.category));
      }
      const attributes = step
        ? el(
            'div',
            { className: 'spell-attributes' },
            ...ENHANCEMENT_IDS.map((attribute) => {
              const def = ENHANCEMENTS[attribute];
              const added = staged[attribute] ?? 0;
              const target: StepTarget = { kind: 'spell', spellId, attribute };
              const title = `${standardName(spellId) ?? cast.name} ${def.name}`;
              const tip =
                BOARD_SPELLS[spellId] && attribute !== 'efficiency'
                  ? 'Only applies when the spell completes a row; it does not add target rows, obstruction hits, or damage to burned blocks. Also trains the next spell level.'
                  : (attribute === 'effect' && EFFECT_ENHANCEMENTS[cast.effect.kind]) ||
                    def.description;
              return el(
                'div',
                {
                  className: `spell-attribute${added > 0 ? ' staged' : ''}`,
                  title: `${def.name}: ${tip}`,
                },
                el(
                  'span',
                  { className: 'attribute-head' },
                  iconElement(ENHANCEMENT_ICONS[attribute], 2, def.name),
                  attributeValue(
                    attribute,
                    cast,
                    totalEnhancements(known)[attribute] + added,
                    added > 0,
                    !!BOARD_SPELLS[spellId],
                    spellId === 'fire',
                  ),
                ),
                attributePips(known.step[attribute], added, step.each),
                stepButton(target, -1, added > 0, title, onAdjust),
                stepButton(target, 1, canEnhance(hero, plan, spellId, attribute), title, onAdjust),
              );
            }),
          )
        : null;
      const classes = ['spell-row'];
      if (ready) classes.push('ready');
      if (locked) classes.push('sealed');
      if (anyStaged) classes.push('staged');
      if (!step) classes.push('max');
      return [
        el(
          'div',
          { className: classes.join(' ') },
          header,
          ...(standardSpellText(spellId, cast)
            ? [el('small', { text: standardSpellText(spellId, cast) ?? '' })]
            : []),
          ...(spellId === 'fire' && attributes
            ? [
                el('small', {
                  text: 'Fire Power/Effect purchases train the next level. Burning blocks does not deal separate damage or complete rows, so it receives no row-clear bonuses.',
                }),
              ]
            : []),
          ...(attributes ? [attributes] : []),
        ),
      ];
    }),
  );
}

/**
 * The skill screen: the points waiting to be spent, then a row per stat
 * with its icon, rank pips, what its ranks add up to and −/+ buttons, then
 * the Spells section (`spellRows`). Stats and enhancements share the
 * points; nothing is spent until the caller confirms the plan. Step
 * buttons carry `data-step` and `data-delta` so `focusStep` can keep focus
 * in place after a redraw.
 */
export function skillsBody(
  hero: Hero,
  plan: SkillPlan,
  onAdjust: (target: StepTarget, delta: 1 | -1) => void,
  lockHint?: (category: Element) => HTMLElement,
): HTMLElement[] {
  const left = hero.skillPoints - skillPlanCost(hero, plan);
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
    const added = plan.stats[stat] ?? 0;
    const target: StepTarget = { kind: 'stat', stat };
    const name = STATS[stat].name;
    return el(
      'div',
      { className: `stat-row${added > 0 ? ' staged' : ''}`, title: STATS[stat].description },
      iconElement(STAT_ICONS[stat], 3, name),
      el('span', { className: 'stat-name' }, el('b', { text: name }), rankPips(stat, rank, added)),
      el(
        'span',
        { className: `chips${rank + added === 0 ? ' none' : ''}` },
        ...effectChips(stat, rank + added, added > 0 ? 'up' : undefined),
      ),
      stepButton(target, -1, added > 0, name, onAdjust),
      stepButton(target, 1, canRaiseStat(hero, plan, stat), name, onAdjust),
    );
  });

  return [
    points,
    sectionTitle('point', 'Stats'),
    el('div', { className: 'stat-rows' }, ...rows),
    sectionTitle('book', 'Spells'),
    el('div', { className: 'spell-rows' }, ...spellRows(hero, plan, onAdjust, lockHint)),
  ];
}

/**
 * Focuses a step button after a redraw so keyboard play stays on what was
 * just changed: the same button; else, in its row, the same button of
 * another attribute (so + walks Power → Efficiency → Effect), then the same
 * attribute's other button, then any; else the first + that can still be
 * pressed, else any enabled step. Never an action, so an extra key press
 * can't confirm a permanent spend. Returns false if no step can take focus.
 */
export function focusStep(root: ParentNode, last?: { target: StepTarget; delta: 1 | -1 }): boolean {
  const steps = [...root.querySelectorAll<HTMLButtonElement>('.step:not(:disabled)')];
  const row = last ? steps.filter((b) => b.dataset.step === stepKey(last.target)) : [];
  const attribute = last?.target.kind === 'spell' ? last.target.attribute : undefined;
  const delta = String(last?.delta);
  const target =
    row.find((b) => b.dataset.attribute === attribute && b.dataset.delta === delta) ??
    row.find((b) => b.dataset.delta === delta) ??
    row.find((b) => b.dataset.attribute === attribute) ??
    row[0] ??
    steps.find((b) => b.dataset.delta === '1') ??
    steps[0];
  target?.focus();
  return target !== undefined;
}
