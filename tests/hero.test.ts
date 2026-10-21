import { describe, expect, it } from 'vitest';
import { CLASSES } from '../src/data/classes';
import { ITEMS } from '../src/data/items';
import {
  addItem,
  applyItemEffect,
  cannotUseReason,
  createHero,
  equip,
  gainXp,
  heal,
  heroClass,
  itemCount,
  learnSpell,
  removeItem,
  restoreMp,
  takeDamage,
  totalAttack,
  totalDefense,
  useItem,
} from '../src/game/hero';

describe('hero', () => {
  it('starts at level 1 with Fire and Cure, named after the class', () => {
    const hero = createHero();
    expect(hero.name).toBe(CLASSES.ranger!.heroName);
    expect(hero.classId).toBe('ranger');
    expect(hero.level).toBe(1);
    expect(hero.spells).toEqual(['fire', 'cure']);
    expect(createHero('mage', 'Test').name).toBe('Test');
  });

  it('takes starting stats and gil from its class', () => {
    for (const cls of Object.values(CLASSES)) {
      const hero = createHero(cls.id);
      expect([hero.maxHp, hero.maxMp, hero.atk, hero.def, hero.gil]).toEqual([
        cls.base.hp,
        cls.base.mp,
        cls.base.atk,
        cls.base.def,
        cls.gil,
      ]);
    }
  });

  it('grows by its class on level-up', () => {
    const knight = createHero('knight');
    gainXp(knight, knight.nextXp);
    const { growth, base } = CLASSES.knight!;
    expect([knight.maxHp, knight.maxMp, knight.atk, knight.def]).toEqual([
      base.hp + growth.hp,
      base.mp + growth.mp,
      base.atk + growth.atk,
      base.def + growth.def,
    ]);
  });

  it('falls back to the default class for unknown ids', () => {
    expect(heroClass({ classId: 'nope' }).id).toBe('ranger');
    expect(createHero('nope').classId).toBe('ranger');
  });

  it('levels up, raising stats and fully restoring', () => {
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

  it('caps healing, MP restoration and damage', () => {
    const hero = createHero();
    hero.hp = 35;
    expect(heal(hero, 100)).toBe(5);
    hero.mp = 10;
    expect(restoreMp(hero, 100)).toBe(2);
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
    expect(hero.spells.filter((s) => s === 'thunder')).toHaveLength(1);
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
    hero.mp = hero.maxMp;
    expect(() => useItem(hero, 'ether')).toThrow('MP is already full.');
    expect(() => useItem(hero, 'sporeCap')).toThrow();
    expect(() => useItem(hero, 'nope')).toThrow('Unknown item');
  });

  it('teaches a spell from a tome only once', () => {
    const hero = createHero();
    addItem(hero, 'blizzardTome', 2);
    useItem(hero, 'blizzardTome');
    expect(hero.spells).toContain('blizzard');
    expect(cannotUseReason(hero, ITEMS.blizzardTome!)).toBe('You already know that spell.');
  });

  it('applies a rest service to fully restore', () => {
    const hero = createHero();
    hero.hp = 1;
    hero.mp = 0;
    expect(applyItemEffect(hero, ITEMS.innRest!)).toContain('fully restored');
    expect(hero.hp).toBe(hero.maxHp);
    expect(hero.mp).toBe(hero.maxMp);
  });

  it('reports items without an effect', () => {
    expect(applyItemEffect(createHero(), ITEMS.sporeCap!)).toContain('no effect');
  });
});
