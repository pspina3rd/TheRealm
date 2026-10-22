import { describe, expect, it } from 'vitest';
import { emptyCounts } from '../src/core/elements';
import { CLASSES } from '../src/data/classes';
import { SPELLS } from '../src/data/spells';
import { ITEMS } from '../src/data/items';
import {
  addItem,
  addMana,
  addManaToAll,
  applyItemEffect,
  canAfford,
  drainMana,
  heroAlignment,
  heroTitle,
  manaFull,
  spendMana,
  cannotUseReason,
  createHero,
  equip,
  gainXp,
  heal,
  heroClass,
  itemCount,
  learnSpell,
  raiseSpellLevel,
  removeItem,
  takeDamage,
  totalAttack,
  totalDefense,
  useItem,
} from '../src/game/hero';
import { enhancements, heroSpell, newKnownSpell } from '../src/game/spells';
import { SKILL_POINTS_PER_LEVEL } from '../src/game/stats';
import { knownSpells } from './helpers';

describe('hero', () => {
  it('starts at level 1 with its class spell and Cure, named after the class', () => {
    const hero = createHero();
    expect(hero.name).toBe(CLASSES.ranger!.heroName);
    expect(hero.classId).toBe('ranger');
    expect(hero.level).toBe(1);
    expect(hero.spells).toEqual(knownSpells('gale', 'cure'));
    expect(hero.failedLessons).toEqual({});
    expect(createHero('mage', 'Test').name).toBe('Test');
  });

  it('starts with the same totals as before stats existed', () => {
    const totals = (id: string) => {
      const hero = createHero(id);
      return [hero.maxHp, hero.manaCap, hero.atk, hero.def, hero.gil];
    };
    expect(totals('ranger')).toEqual([40, 12, 5, 1, 25]);
    expect(totals('knight')).toEqual([48, 10, 5, 3, 20]);
    expect(totals('mage')).toEqual([34, 16, 4, 1, 25]);
    expect(totals('rogue')).toEqual([36, 12, 6, 1, 60]);
  });

  it('starts with its class spread of 4 stat ranks and no points', () => {
    const spread = (id: string) =>
      Object.entries(createHero(id).stats).filter(([, rank]) => rank > 0);
    expect(spread('knight')).toEqual([
      ['vitality', 2],
      ['guard', 2],
    ]);
    expect(spread('mage')).toEqual([
      ['focus', 2],
      ['insight', 2],
    ]);
    expect(spread('ranger')).toEqual([
      ['agility', 2],
      ['luck', 2],
    ]);
    expect(spread('rogue')).toEqual([
      ['strength', 2],
      ['charm', 2],
    ]);
    expect(createHero().skillPoints).toBe(0);
  });

  it('gains 2 skill points and only HP growth per level', () => {
    const knight = createHero('knight');
    const before = { ...knight };
    gainXp(knight, knight.nextXp);
    expect(knight.skillPoints).toBe(SKILL_POINTS_PER_LEVEL);
    expect(knight.maxHp).toBe(before.maxHp + CLASSES.knight!.hpGrowth);
    expect([knight.manaCap, knight.atk, knight.def]).toEqual([
      before.manaCap,
      before.atk,
      before.def,
    ]);
    expect(knight.stats).toEqual(before.stats);
  });

  it('falls back to the default class for unknown ids', () => {
    expect(heroClass({ classId: 'nope' }).id).toBe('ranger');
    expect(createHero('nope').classId).toBe('ranger');
  });

  it('levels up, raising max HP and fully restoring', () => {
    const hero = createHero();
    hero.hp = 1;
    expect(gainXp(hero, 30)).toBe(1);
    expect(hero.level).toBe(2);
    expect(hero.xp).toBe(0);
    expect(hero.nextXp).toBe(43);
    expect(hero.hp).toBe(hero.maxHp);
    expect(hero.maxHp).toBe(48);
  });

  it('can gain several levels at once and keeps leftover XP', () => {
    const hero = createHero();
    expect(gainXp(hero, 30 + 43 + 5)).toBe(2);
    expect(hero.level).toBe(3);
    expect(hero.xp).toBe(5);
  });

  it('caps healing and damage', () => {
    const hero = createHero();
    hero.hp = 35;
    expect(heal(hero, 100)).toBe(5);
    expect(takeDamage(hero, 999)).toBe(40);
    expect(hero.hp).toBe(0);
    expect(takeDamage(hero, -5)).toBe(0);
  });

  it('adds and removes items, deleting empty stacks', () => {
    const hero = createHero();
    addItem(hero, 'sporeCap', 2);
    expect(itemCount(hero, 'sporeCap')).toBe(2);
    expect(removeItem(hero, 'sporeCap', 3)).toBe(false);
    expect(removeItem(hero, 'sporeCap', 2)).toBe(true);
    expect('sporeCap' in hero.items).toBe(false);
  });

  it('learns each spell once', () => {
    const hero = createHero();
    expect(learnSpell(hero, 'thunder')).toBe(true);
    expect(learnSpell(hero, 'thunder')).toBe(false);
    expect(hero.spells.thunder).toEqual(newKnownSpell());
  });

  it('adds equipment bonuses to attack and defence', () => {
    const hero = createHero();
    addItem(hero, 'ironSword');
    addItem(hero, 'crystalMail');
    equip(hero, 'ironSword');
    equip(hero, 'crystalMail');
    expect(totalAttack(hero)).toBe(5 + 7);
    expect(totalDefense(hero)).toBe(1 + 6);
  });

  it('returns the previous weapon to the bag when swapping', () => {
    const hero = createHero();
    addItem(hero, 'copperSword');
    addItem(hero, 'ironSword');
    equip(hero, 'copperSword');
    equip(hero, 'ironSword');
    expect(hero.weaponId).toBe('ironSword');
    expect(itemCount(hero, 'copperSword')).toBe(1);
  });

  it('rejects equipping non-equipment or unowned items', () => {
    const hero = createHero();
    expect(() => equip(hero, 'herb')).toThrow();
    expect(() => equip(hero, 'ironSword')).toThrow();
  });

  it('uses consumables and explains when it cannot', () => {
    const hero = createHero();
    const herb = ITEMS.herb!;
    expect(cannotUseReason(hero, herb)).toBe('HP is already full.');
    hero.hp = 10;
    expect(useItem(hero, 'herb')).toContain('restored 20 HP');
    expect(hero.hp).toBe(30);
    expect(itemCount(hero, 'herb')).toBe(1);
    expect(() => useItem(hero, 'ether')).toThrow('Mana is already full.');
    hero.mana.fire = 0;
    expect(useItem(hero, 'ether')).toContain('restored 4 mana');
    expect(() => useItem(hero, 'sporeCap')).toThrow();
    expect(() => useItem(hero, 'nope')).toThrow('Unknown item');
  });

  it('teaches a spell from a tome only once', () => {
    const hero = createHero();
    addItem(hero, 'blizzardTome', 2);
    useItem(hero, 'blizzardTome');
    expect(hero.spells.blizzard).toEqual(newKnownSpell());
    expect(cannotUseReason(hero, ITEMS.blizzardTome!)).toBe('You already know that spell.');
  });

  it('applies a rest service to fully restore', () => {
    const hero = createHero();
    hero.hp = 1;
    hero.mana = emptyCounts(0);
    expect(applyItemEffect(hero, ITEMS.innRest!)).toContain('fully restored');
    expect(hero.hp).toBe(hero.maxHp);
    expect(manaFull(hero)).toBe(true);
  });

  it('reports items without an effect', () => {
    expect(applyItemEffect(createHero(), ITEMS.sporeCap!)).toContain('no effect');
  });

  describe('elemental mana', () => {
    it('starts with every pool full at the class capacity', () => {
      const mage = createHero('mage');
      const cap = CLASSES.mage!.base.mana + mage.stats.focus;
      expect(mage.mana).toEqual(emptyCounts(cap));
      expect(mage.manaCap).toBe(cap);
    });

    it('adds mana per element, capped', () => {
      const hero = createHero();
      hero.mana = emptyCounts(0);
      expect(addMana(hero, { fire: 5, water: 100 })).toBe(5 + hero.manaCap);
      expect(hero.mana.fire).toBe(5);
      expect(hero.mana.water).toBe(hero.manaCap);
      expect(addManaToAll(hero, 1)).toBe(6);
    });

    it('spends only when every pool can pay', () => {
      const hero = createHero();
      hero.mana = { ...emptyCounts(0), fire: 6, earth: 3 };
      expect(canAfford(hero, { fire: 6, earth: 4 })).toBe(false);
      expect(spendMana(hero, { fire: 6, earth: 4 })).toBe(false);
      expect(hero.mana.fire).toBe(6);
      expect(spendMana(hero, { fire: 6, earth: 3 })).toBe(true);
      expect(hero.mana.fire + hero.mana.earth).toBe(0);
    });

    it('drains from the fullest pool', () => {
      const hero = createHero();
      hero.mana = { ...emptyCounts(1), arcane: 9 };
      expect(drainMana(hero, 4)).toEqual({ element: 'arcane', drained: 4 });
      hero.mana = emptyCounts(0);
      expect(drainMana(hero, 4).drained).toBe(0);
    });

    it('refills on level-up', () => {
      const hero = createHero();
      hero.mana = emptyCounts(0);
      gainXp(hero, hero.nextXp);
      expect(manaFull(hero)).toBe(true);
    });
  });

  describe('alignment', () => {
    it('starts each class aligned to its element, with its own spell', () => {
      for (const cls of Object.values(CLASSES)) {
        const hero = createHero(cls.id);
        expect(Object.keys(hero.spells)[0]).toBe(cls.spell);
        expect(SPELLS[cls.spell]?.category).toBe(cls.element);
        expect(hero.titleElement).toBe(cls.element);
      }
      expect(heroTitle(createHero('knight'))).toBe('Stone Knight');
    });

    it('counts known spells per element', () => {
      const hero = createHero('knight'); // quake, cure
      expect(heroAlignment(hero)).toMatchObject({ earth: 1, nature: 1, fire: 0 });
      learnSpell(hero, 'fire');
      expect(heroAlignment(hero).fire).toBe(1);
    });

    it('changes the title only when another element pulls ahead', () => {
      const hero = createHero('knight');
      hero.spells = knownSpells('quake');
      learnSpell(hero, 'fire'); // fire 1 ties earth 1
      expect(hero.titleElement).toBe('earth');
      learnSpell(hero, 'meteor'); // fire 2 ties earth 2
      expect(hero.titleElement).toBe('earth');
      hero.spells.fire!.step = enhancements({ power: 1, efficiency: 1, effect: 1 });
      raiseSpellLevel(hero, 'fire'); // fire 3
      expect(heroTitle(hero)).toBe('Ember Knight');
    });

    it('prices a newly learned spell at its level 1 cost', () => {
      const hero = createHero();
      expect(heroSpell(hero, 'meteor')).toBeNull();
      learnSpell(hero, 'meteor');
      expect(heroSpell(hero, 'meteor')?.cost).toEqual(SPELLS.meteor!.levels[0].cost);
    });
  });

  it('equips charms in their own slot', () => {
    const hero = createHero();
    addItem(hero, 'emberCharm');
    addItem(hero, 'tideCharm');
    equip(hero, 'emberCharm');
    equip(hero, 'tideCharm');
    expect(hero.accessoryId).toBe('tideCharm');
    expect(itemCount(hero, 'emberCharm')).toBe(1);
  });
});
