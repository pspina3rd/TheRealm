import { describe, expect, it } from 'vitest';
import { emptyCounts } from '../src/core/elements';
import { ATTUNEMENT_LEVEL, CLASSES } from '../src/data/classes';
import { SPELLS } from '../src/data/spells';
import { ITEMS } from '../src/data/items';
import {
  addItem,
  addMana,
  addManaToAll,
  applyItemEffect,
  attune,
  canAfford,
  canAttune,
  drainMana,
  heroTitle,
  manaFull,
  spellCost,
  spendMana,
  cannotUseReason,
  createHero,
  equip,
  gainXp,
  heal,
  heroClass,
  itemCount,
  learnSpell,
  removeItem,
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
      expect([hero.maxHp, hero.manaCap, hero.atk, hero.def, hero.gil]).toEqual([
        cls.base.hp,
        cls.base.mana,
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
    expect([knight.maxHp, knight.manaCap, knight.atk, knight.def]).toEqual([
      base.hp + growth.hp,
      base.mana + growth.mana,
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
    expect(hero.spells).toContain('blizzard');
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
      expect(mage.mana).toEqual(emptyCounts(CLASSES.mage!.base.mana));
      expect(mage.manaCap).toBe(CLASSES.mage!.base.mana);
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

  describe('attunement', () => {
    it('opens at its level, once', () => {
      const hero = createHero('knight');
      expect(canAttune(hero)).toBe(false);
      expect(() => attune(hero, 'earth')).toThrow();
      hero.level = ATTUNEMENT_LEVEL;
      expect(canAttune(hero)).toBe(true);
      attune(hero, 'earth');
      expect(hero.attunement).toBe('earth');
      expect(canAttune(hero)).toBe(false);
      expect(() => attune(hero, 'fire')).toThrow();
    });

    it('names the hero after their element', () => {
      const hero = createHero('knight');
      expect(heroTitle(hero)).toBe('Knight');
      hero.attunement = 'earth';
      expect(heroTitle(hero)).toBe('Stone Knight');
    });

    it('discounts only the attuned element, never below 1', () => {
      const hero = createHero();
      hero.attunement = 'earth';
      expect(spellCost(hero, SPELLS.meteor!)).toEqual({ fire: 6, earth: 4, arcane: 6 });
      expect(spellCost(hero, SPELLS.fire!)).toEqual({ fire: 6 });
      hero.attunement = 'fire';
      expect(spellCost(hero, { ...SPELLS.fire!, cost: { fire: 2 } })).toEqual({ fire: 1 });
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
