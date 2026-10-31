// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Battle } from '../src/battle/battle';
import { createRng } from '../src/core/rng';
import { MENTORS } from '../src/data/mentors';
import { SPELLS } from '../src/data/spells';
import { createHero, spendSkillPoints } from '../src/game/hero';
import {
  adjustEnhancement,
  EMPTY_PLAN,
  fireTrainingAttribute,
  skillPlanCost,
} from '../src/game/skills';
import { isReady, newKnownSpell } from '../src/game/spells';
import { HeroPanel } from '../src/ui/heroPanel';
import { skillsBody } from '../src/ui/screens/skills';
import { gainRows } from '../src/ui/screens/widgets';
import type { Atlas } from '../src/ui/art/atlas';

beforeEach(() => {
  const html = readFileSync('index.html', 'utf8');
  document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('honest Fire training and first-spell practice', () => {
  it.each([1, 2, 3])(
    'preserves rank-%s upgrade costs and backing counts through grouped training',
    (level) => {
      const hero = createHero();
      hero.skillPoints = 100;
      hero.spells.fire = { ...newKnownSpell(), level };
      let plan = EMPTY_PLAN;
      const original = structuredClone(hero);
      for (const attribute of ['power', 'efficiency', 'effect'] as const) {
        const picked =
          attribute === 'efficiency' ? attribute : fireTrainingAttribute(hero, plan, 1)!;
        plan = adjustEnhancement(plan, 'fire', picked, 1);
      }
      // Higher tiers allow elective choices; keep those choices with the player.
      for (let i = 1; i < level; i++) plan = adjustEnhancement(plan, 'fire', 'efficiency', 1);
      expect(hero).toEqual(original);
      expect(isReady(SPELLS.fire!, hero.spells.fire!, plan.spells.fire)).toBe(true);
      const expected = [6, 12, 20][level - 1]!;
      expect(skillPlanCost(hero, plan)).toBe(expected);
      expect(spendSkillPoints(hero, plan)).toBe(true);
      expect(hero.skillPoints).toBe(100 - expected);
      expect(hero.spells.fire!.step).toEqual({ power: 1, effect: 1, efficiency: level });
    },
  );

  it('undoes only staged training and never disguises an elective as a missing required step', () => {
    const hero = createHero();
    hero.skillPoints = 30;
    hero.spells.fire = {
      ...newKnownSpell(),
      level: 2,
      step: { power: 2, effect: 0, efficiency: 0 },
    };
    expect(fireTrainingAttribute(hero, EMPTY_PLAN, 1)).toBe('effect');
    expect(fireTrainingAttribute(hero, EMPTY_PLAN, -1)).toBeNull();
    const root = document.createElement('div');
    root.append(...skillsBody(hero, EMPTY_PLAN, vi.fn()));
    expect(root.querySelector('.fire-training')?.textContent).toContain(
      'Training 1/2 · 1 elective',
    );
    expect(root.querySelector('[data-step="spell:fire"][data-attribute="power"]')).toBeNull();
    expect(root.querySelector('[data-step="spell:fire"][data-attribute="effect"]')).toBeNull();
    expect(
      root.querySelector('[data-step="spell:fire"][data-attribute="efficiency"]'),
    ).not.toBeNull();
    expect(root.textContent).toContain('Burn ordinary blocks in 3 rows');
    expect(root.textContent).not.toContain('Ready for the Lv 3 lesson');
  });

  it('undoes elective training before removing a staged core requirement', () => {
    const hero = createHero();
    hero.spells.fire = {
      ...newKnownSpell(),
      level: 2,
      step: { power: 1, effect: 0, efficiency: 0 },
    };
    let plan = adjustEnhancement(EMPTY_PLAN, 'fire', 'effect', 1);
    plan = adjustEnhancement(plan, 'fire', 'power', 1);
    expect(fireTrainingAttribute(hero, plan, -1)).toBe('power');
    plan = adjustEnhancement(plan, 'fire', fireTrainingAttribute(hero, plan, -1)!, -1);
    expect(plan.spells.fire).toEqual({ power: 0, effect: 1 });
    expect(hero.spells.fire!.step).toEqual({ power: 1, effect: 0, efficiency: 0 });
  });

  it.each(['fire', 'blizzard', 'quake', 'gale', 'thunder', 'natureConvert', 'shadow'])(
    'exposes one clearly named lent %s practice action before its normal AUTO card',
    (id) => {
      const hero = createHero();
      const mentor = Object.values(MENTORS).find((m) => m.element === SPELLS[id]!.category)!;
      const battle = new Battle(
        {
          kind: 'lesson',
          spellId: id,
          mentorId: mentor.id,
          enemyId: mentor.trialFoe,
          difficulty: 1,
        },
        hero,
        createRng(1),
        { boardMagic: true },
      );
      const panel = new HeroPanel({ draw: () => {} } as unknown as Atlas);
      panel.render(battle, new Set());
      const practice = document.querySelector<HTMLButtonElement>('.practice-spell')!;
      expect(practice).not.toBeNull();
      expect(practice.textContent).toContain('Lv 1');
      expect(practice.textContent).toContain('Clear matching crystals to charge');
      expect(document.querySelectorAll('#spell-list button')).toHaveLength(1);
      for (const pool of Object.keys(hero.mana)) hero.mana[pool as keyof typeof hero.mana] = 20;
      panel.render(battle, new Set());
      expect(document.querySelector('.practice-spell')?.textContent).toContain(
        'automatic in fights',
      );
      const cast = vi.fn();
      panel.onCast = cast;
      document.querySelector<HTMLButtonElement>('.practice-spell')!.click();
      expect(cast).toHaveBeenCalledWith(id);
      expect(hero.spells).toEqual({});
      hero.spells[id] = newKnownSpell();
      const fight = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(2), {
        boardMagic: true,
        autoCast: true,
      });
      panel.render(fight, new Set());
      expect(document.querySelector('.practice-spell')).toBeNull();
      expect(document.querySelector('.auto-standard')?.textContent).toContain('Lv 1');
      expect(document.querySelectorAll('#spell-list button')).toHaveLength(0);
    },
  );

  it('explains the earned spell transition on the actual result surface', () => {
    const root = document.createElement('div');
    root.append(...gainRows([{ kind: 'spell', spellId: 'quake' }]));
    expect(root.textContent).toContain('Gravity · Lv 1');
    expect(root.textContent).toContain('Clear a line → charge mana → AUTO cast');
    expect(root.textContent).toContain('Drop unsupported blocks in 1 row');
  });
});
