import { describe, expect, it } from 'vitest';
import { ELEMENTS } from '../src/core/elements';
import { CLASSES } from '../src/data/classes';
import {
  EFFECT_ENHANCEMENTS,
  ENHANCEMENTS,
  ENHANCEMENT_IDS,
  LEVEL_STEPS,
  SPELLS,
} from '../src/data/spells';
import type { SpellDef } from '../src/data/types';
import {
  createHero,
  gainXp,
  heroAlignment,
  learnSpell,
  raiseSpellLevel,
  spendSkillPoints,
  type Hero,
} from '../src/game/hero';
import {
  EMPTY_PLAN,
  adjustEnhancement,
  adjustStat,
  canEnhance,
  canRaiseStat,
  enhancementCost,
  isValidSkillPlan,
  skillPlanCost,
} from '../src/game/skills';
import {
  canAddEnhancement,
  castEffect,
  castPower,
  castSpellFor,
  castSummary,
  enhancements,
  fitsStep,
  heroSpell,
  isCategoryLocked,
  isReady,
  knownSpell,
  levelStep,
  maxLevel,
  newKnownSpell,
  spellCategories,
  spellElements,
  spellLevel,
  spellName,
  stepSize,
  type KnownSpell,
} from '../src/game/spells';
import { STAT_RANK_COST } from '../src/game/stats';
import { knownSpells } from './helpers';

const spell = (id: string): SpellDef => SPELLS[id]!;
const at = (level: number, step = {}, kept = {}): KnownSpell => ({
  level,
  step: enhancements(step),
  kept: enhancements(kept),
});
const ONE_EACH = { power: 1, efficiency: 1, effect: 1 };

describe('spell data', () => {
  const primaries = Object.values(SPELLS).filter((s) => s.role === 'primary');

  it('has one four-level primary per element', () => {
    expect(primaries.map((s) => s.category).sort()).toEqual([...ELEMENTS].sort());
    for (const s of primaries) expect(maxLevel(s), s.id).toBe(LEVEL_STEPS.length + 1);
  });

  it('starts every class on its element’s primary', () => {
    for (const cls of Object.values(CLASSES)) {
      expect(spell(cls.spell).role).toBe('primary');
      expect(spell(cls.spell).category).toBe(cls.element);
    }
  });

  it('keeps each spell’s kind of effect and gives every level its own name', () => {
    const names = Object.values(SPELLS).flatMap((s) => s.levels.map((l) => l.name));
    expect(new Set(names).size).toBe(names.length);
    for (const s of Object.values(SPELLS)) {
      for (const level of s.levels) expect(level.effect.kind, s.id).toBe(s.levels[0].effect.kind);
    }
  });

  it('grows power about ×1.6 and cost +2 a level', () => {
    for (const s of primaries) {
      s.levels.slice(1).forEach((level, i) => {
        const previous = s.levels[i]!;
        const ratio = castPower(level.effect) / castPower(previous.effect);
        expect(ratio, `${s.id} ${level.name}`).toBeGreaterThan(1.5);
        expect(ratio, `${s.id} ${level.name}`).toBeLessThan(1.7);
        expect(level.cost[s.category]).toBe((previous.cost[s.category] ?? 0) + 2);
      });
    }
  });

  it('makes Meteor a single-level fire combo of fire, earth and arcane', () => {
    const meteor = spell('meteor');
    expect([meteor.role, meteor.category, maxLevel(meteor)]).toEqual(['combo', 'fire', 1]);
    expect(spellElements(meteor)).toEqual(['fire', 'earth', 'arcane']);
    expect(spellElements(spell('fire'))).toEqual(['fire']);
  });

  it('describes every attribute and the Effect of every levelled spell', () => {
    expect(Object.keys(ENHANCEMENTS)).toEqual([...ENHANCEMENT_IDS]);
    const levelled = Object.values(SPELLS).filter((s) => maxLevel(s) > 1);
    const kinds = new Set(levelled.map((s) => s.levels[0].effect.kind));
    for (const kind of kinds) expect(EFFECT_ENHANCEMENTS[kind]).toBeTruthy();
  });

  it('makes each level step need one of each attribute, plus more extras and points', () => {
    expect(LEVEL_STEPS.map(stepSize)).toEqual([3, 4, 5]);
    expect(LEVEL_STEPS.map((s) => s.cost)).toEqual([2, 3, 4]);
  });
});

describe('spell levels', () => {
  it('clamp to the levels a spell has and name each', () => {
    expect(spellLevel(spell('fire'), 0).name).toBe('Fire');
    expect(spellName(spell('fire'), 2)).toBe('Blaze');
    expect(spellName(spell('fire'), 9)).toBe('Cataclysm');
    expect(spellName(spell('meteor'))).toBe('Meteor');
  });

  it('cast with the level’s numbers', () => {
    const cast = castSpellFor(spell('thunder'), at(3));
    expect(cast).toEqual({
      name: 'Stormcall',
      level: 3,
      cost: { lightning: 12 },
      effect: { kind: 'damage', power: 61 },
      surge: 0,
    });
  });
});

describe('enhancements', () => {
  it('Power adds 20% of the level’s base per enhancement', () => {
    expect(castSpellFor(spell('fire'), at(1, { power: 1 })).effect).toEqual({
      kind: 'damage',
      power: 17, // 14 × 1.2 = 16.8
    });
    expect(castPower(castSpellFor(spell('fire'), at(2, {}, { power: 2 })).effect)).toBe(31);
    expect(castSpellFor(spell('cure'), at(1, { power: 1 })).effect).toEqual({
      kind: 'heal',
      amount: 24,
    });
  });

  it('Efficiency takes 1 mana off each element, never below 1', () => {
    expect(castSpellFor(spell('fire'), at(1, { efficiency: 1 })).cost).toEqual({ fire: 5 });
    expect(castSpellFor(spell('fire'), at(4, {}, { efficiency: 20 })).cost).toEqual({ fire: 1 });
    const meteor = castSpellFor(spell('meteor'), at(1), { efficiency: 2 });
    expect(meteor.cost).toEqual({ fire: 4, earth: 4, arcane: 4 });
  });

  describe('Effect', () => {
    const effect = (id: string, count: number) =>
      castSpellFor(spell(id), at(1, {}, { effect: count }));

    it('makes damage and heal spells fire their line effect, 3 per enhancement', () => {
      expect(effect('fire', 0).surge).toBe(0);
      expect(effect('thunder', 2).surge).toBe(6);
      expect(castEffect(effect('cure', 1))).toBe(3);
    });

    it('delays a frozen enemy and slows pieces 1 more each', () => {
      expect(castEffect(effect('blizzard', 2))).toBe(5);
      expect(castEffect(effect('gale', 1))).toBe(6);
      expect(effect('gale', 1).surge).toBe(0);
    });

    it('heals 10% more of drained damage, at most all of it', () => {
      expect(castEffect(effect('shadow', 0))).toBe(50);
      expect(castEffect(effect('shadow', 3))).toBe(80);
      expect(castEffect(effect('shadow', 9))).toBe(100);
    });

    it('clears 1 more row at 1, 3 and 5 Effect', () => {
      expect([0, 1, 2, 3, 4, 5].map((n) => castEffect(effect('quake', n)))).toEqual([
        2, 3, 3, 4, 4, 5,
      ]);
    });
  });

  it('count both earlier levels’ and the current step’s, plus staged ones', () => {
    const cast = castSpellFor(spell('fire'), at(2, { power: 1 }, { power: 1 }), { power: 1 });
    expect(castPower(cast.effect)).toBe(Math.round(22 * 1.6));
  });
});

describe('castSummary', () => {
  const summary = (id: string, level = 1, kept = {}) =>
    castSummary(castSpellFor(spell(id), at(level, {}, kept)));

  it('names the spell, its level and what it does', () => {
    expect(summary('fire', 2)).toBe('Blaze · Lv 2 · 22 damage');
    expect(summary('cure', 1, { effect: 1 })).toBe('Cure · Lv 1 · heal 20 · +3 line effect');
    expect(summary('quake')).toBe('Quake · Lv 1 · clear 2 rows · 6 damage');
    expect(summary('blizzard')).toBe('Blizzard · Lv 1 · 18 damage · enemy gauge −4.5 s');
    expect(summary('gale')).toBe('Gale · Lv 1 · 10 damage · slow 5 pieces');
    expect(summary('shadow')).toBe('Shadow Drain · Lv 1 · 18 damage · heal 50% of it');
  });
});

describe('level steps', () => {
  const fire = spell('fire');

  it('need one of each attribute first, with no extras at level 1', () => {
    const step = levelStep(fire, 1)!;
    expect(canAddEnhancement(fire, at(1), {}, 'power')).toBe(true);
    expect(canAddEnhancement(fire, at(1, { power: 1 }), {}, 'power')).toBe(false);
    expect(canAddEnhancement(fire, at(1, { power: 1 }), {}, 'effect')).toBe(true);
    expect(fitsStep(step, { power: 2 })).toBe(false);
    expect(fitsStep(step, { power: -1 })).toBe(false);
    expect(fitsStep(step, { power: 0.5 })).toBe(false);
  });

  it('allow extras of any attribute once one of each fits', () => {
    expect(canAddEnhancement(fire, at(2, { power: 1 }), {}, 'power')).toBe(true);
    expect(canAddEnhancement(fire, at(2, { power: 2 }), {}, 'power')).toBe(false);
    expect(canAddEnhancement(fire, at(3, { effect: 2 }), {}, 'effect')).toBe(true);
    expect(canAddEnhancement(fire, at(3, { effect: 2 }), { effect: 1 }, 'effect')).toBe(false);
    expect(canAddEnhancement(fire, at(3, { effect: 3 }), {}, 'power')).toBe(true);
  });

  it('allow nothing past a complete step, nor at the last level', () => {
    expect(canAddEnhancement(fire, at(1, ONE_EACH), {}, 'power')).toBe(false);
    expect(levelStep(fire, 4)).toBeNull();
    expect(canAddEnhancement(fire, at(4), {}, 'power')).toBe(false);
    expect(levelStep(spell('meteor'), 1)).toBeNull();
  });

  it('make a spell ready once complete, counting staged ones', () => {
    expect(isReady(fire, at(1, { power: 1, efficiency: 1 }))).toBe(false);
    expect(isReady(fire, at(1, { power: 1, efficiency: 1 }), { effect: 1 })).toBe(true);
    expect(isReady(fire, at(2, { ...ONE_EACH, power: 2 }))).toBe(true);
    expect(isReady(fire, at(2, { power: 4 }))).toBe(false);
    expect(isReady(fire, at(4))).toBe(false);
  });
});

/** A hero with `points` skill points and the given spells. */
function heroWith(points: number, spells: Record<string, KnownSpell>): Hero {
  return Object.assign(createHero('mage'), { skillPoints: points, spells });
}

describe('the hero’s spells', () => {
  it('ignore ids that are not their own records', () => {
    const hero = createHero();
    expect(knownSpell(hero, 'toString')).toBeUndefined();
    expect(heroSpell(hero, 'fire')).toBeNull();
    expect(heroSpell(hero, 'gale')?.name).toBe('Gale');
  });

  it('cost what their level and Efficiency say', () => {
    const hero = heroWith(0, { fire: at(2, { efficiency: 1 }) });
    expect(heroSpell(hero, 'fire')?.cost).toEqual({ fire: 7 });
  });

  it('group into categories in element order, primary first', () => {
    const hero = heroWith(0, knownSpells('gale', 'meteor', 'cure', 'fire', 'nope'));
    expect(spellCategories(hero)).toEqual([
      { category: 'fire', spells: ['fire', 'meteor'] },
      { category: 'nature', spells: ['cure'] },
      { category: 'wind', spells: ['gale'] },
    ]);
  });

  it('raise alignment by their levels', () => {
    const hero = heroWith(0, { quake: at(3), meteor: at(1) });
    expect(heroAlignment(hero)).toMatchObject({ earth: 4, fire: 1, arcane: 1 });
  });
});

describe('raiseSpellLevel', () => {
  it('raises a ready spell, keeping its bonuses and starting the next step', () => {
    const hero = createHero('mage');
    hero.spells.shadow = at(1, ONE_EACH);
    const before = castSpellFor(spell('shadow'), hero.spells.shadow);
    raiseSpellLevel(hero, 'shadow');
    expect(hero.spells.shadow).toEqual(at(2, {}, ONE_EACH));
    const after = heroSpell(hero, 'shadow')!;
    expect(after.name).toBe('Soul Siphon');
    expect(castPower(after.effect)).toBe(Math.round(29 * 1.2));
    expect(castPower(after.effect)).toBeGreaterThan(castPower(before.effect));
    expect(after.cost).toEqual({ arcane: 9 });
    expect(heroAlignment(hero).arcane).toBe(2);
  });

  it('throws for spells that are not ready or not known', () => {
    const hero = createHero('mage');
    expect(() => raiseSpellLevel(hero, 'shadow')).toThrow();
    expect(() => raiseSpellLevel(hero, 'fire')).toThrow();
    hero.spells.shadow = at(4);
    expect(() => raiseSpellLevel(hero, 'shadow')).toThrow();
    expect(hero.spells.shadow).toEqual(at(4));
  });
});

describe('category locks', () => {
  it('start empty and block enhancing the locked category only', () => {
    const hero = heroWith(10, knownSpells('shadow', 'cure'));
    expect(isCategoryLocked(hero, 'arcane')).toBe(false);
    hero.failedLessons = { arcane: { spellId: 'shadow', level: 2 } };
    expect(isCategoryLocked(hero, 'arcane')).toBe(true);
    expect(canEnhance(hero, EMPTY_PLAN, 'shadow', 'power')).toBe(false);
    expect(canEnhance(hero, EMPTY_PLAN, 'cure', 'power')).toBe(true);
    const plan = adjustEnhancement(EMPTY_PLAN, 'shadow', 'power', 1);
    expect(isValidSkillPlan(hero, plan)).toBe(false);
    expect(isValidSkillPlan(hero, adjustEnhancement(plan, 'shadow', 'power', -1))).toBe(true);
  });

  it('lift once the hero knows the lost lesson’s spell at its level, however learned', () => {
    const hero = heroWith(10, knownSpells('cure'));
    hero.failedLessons = { fire: { spellId: 'fire', level: 1 } };
    expect(isCategoryLocked(hero, 'fire')).toBe(true);
    hero.spells.fire = newKnownSpell(); // e.g. from a tome
    expect(isCategoryLocked(hero, 'fire')).toBe(false);
  });
});

describe('skill plans with spells', () => {
  it('price each enhancement at its spell’s current step', () => {
    const hero = heroWith(20, { fire: at(1), cure: at(3), meteor: at(1) });
    const plan = {
      stats: { luck: 1 },
      spells: { fire: { power: 1, effect: 1 }, cure: { power: 1 }, nope: {} },
    };
    expect(enhancementCost(hero, plan)).toBe(2 * 2 + 4);
    expect(skillPlanCost(hero, plan)).toBe(8 + STAT_RANK_COST);
    expect(isValidSkillPlan(hero, plan)).toBe(true);
  });

  it('share one pool of points between stats and spells', () => {
    const hero = heroWith(3, knownSpells('fire'));
    const plan = adjustEnhancement(EMPTY_PLAN, 'fire', 'power', 1); // 2 points
    expect(canRaiseStat(hero, plan, 'luck')).toBe(true);
    const both = adjustStat(plan, 'luck', 1);
    expect(canRaiseStat(hero, both, 'luck')).toBe(false);
    expect(canEnhance(hero, { stats: { luck: 2 }, spells: {} }, 'fire', 'power')).toBe(false);
    expect(isValidSkillPlan(hero, adjustStat(both, 'luck', 1))).toBe(false);
  });

  it('reject enhancements past the step, unknown or maxed spells and negatives', () => {
    const hero = heroWith(50, { fire: at(1), thunder: at(4), meteor: at(1) });
    const plan = (spells: SkillPlanSpells) => ({ stats: {}, spells });
    expect(isValidSkillPlan(hero, plan({ fire: { power: 2 } }))).toBe(false);
    expect(isValidSkillPlan(hero, plan({ cure: { power: 1 } }))).toBe(false);
    expect(isValidSkillPlan(hero, plan({ thunder: { effect: 1 } }))).toBe(false);
    expect(isValidSkillPlan(hero, plan({ meteor: { power: 1 } }))).toBe(false);
    expect(isValidSkillPlan(hero, plan({ meteor: { power: 0 } }))).toBe(true);
    expect(isValidSkillPlan(hero, plan({ fire: { power: -1, effect: 2 } }))).toBe(false);
    expect(canEnhance(hero, EMPTY_PLAN, 'cure', 'power')).toBe(false);
    expect(canEnhance(hero, EMPTY_PLAN, 'thunder', 'power')).toBe(false);
  });

  it('adjust one enhancement at a time without changing the original, never below 0', () => {
    const plan = adjustEnhancement(EMPTY_PLAN, 'fire', 'power', 1);
    expect(plan.spells).toEqual({ fire: { power: 1 } });
    expect(adjustEnhancement(plan, 'fire', 'effect', -1).spells.fire).toEqual({
      power: 1,
      effect: 0,
    });
    expect(adjustStat(plan, 'luck', 1)).toEqual({ stats: { luck: 1 }, spells: plan.spells });
    expect(EMPTY_PLAN).toEqual({ stats: {}, spells: {} });
  });

  it('spend stats and enhancements together, making a spell ready', () => {
    const hero = createHero('ranger');
    for (let i = 0; i < 3; i++) gainXp(hero, hero.nextXp); // level 4: 6 points
    const plan = { stats: {}, spells: { gale: ONE_EACH } };
    expect(spendSkillPoints(hero, plan)).toBe(true);
    expect(hero.skillPoints).toBe(0);
    expect(hero.spells.gale).toEqual(at(1, ONE_EACH));
    expect(isReady(spell('gale'), hero.spells.gale!)).toBe(true);
    expect(spendSkillPoints(Object.assign(hero, { skillPoints: 9 }), plan)).toBe(false);
  });

  it('let a newly learned spell start at level 1', () => {
    const hero = createHero();
    learnSpell(hero, 'fire');
    expect(hero.spells.fire).toEqual(newKnownSpell());
  });
});

type SkillPlanSpells = Record<string, Partial<Record<(typeof ENHANCEMENT_IDS)[number], number>>>;
