import { CLASSES, DEFAULT_CLASS, type HeroClass } from '../data/classes';
import { ITEMS } from '../data/items';
import { STARTING_SPELLS } from '../data/spells';
import type { ItemDef } from '../data/types';

/** The player character. Plain data so it can be saved as JSON. */
export interface Hero {
  name: string;
  /** Key into `CLASSES`; decides starting stats, growth and sprite. */
  classId: string;
  level: number;
  xp: number;
  /** XP needed to reach the next level. */
  nextXp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  /** Base attack added to every line-clear strike (before weapon bonus). */
  atk: number;
  /** Base defence subtracted from every enemy hit (before armour bonus). */
  def: number;
  gil: number;
  weaponId: string | null;
  armorId: string | null;
  /** Item id → count. Zero-count entries are removed. */
  items: Record<string, number>;
  spells: string[];
}

/** The hero's class, falling back to the default for unknown ids (e.g. old saves). */
export function heroClass(hero: Pick<Hero, 'classId'>): HeroClass {
  return CLASSES[hero.classId] ?? (CLASSES[DEFAULT_CLASS] as HeroClass);
}

export function createHero(classId = DEFAULT_CLASS, name?: string): Hero {
  const cls = heroClass({ classId });
  return {
    name: name ?? cls.heroName,
    classId: cls.id,
    level: 1,
    xp: 0,
    nextXp: 30,
    hp: cls.base.hp,
    maxHp: cls.base.hp,
    mp: cls.base.mp,
    maxMp: cls.base.mp,
    atk: cls.base.atk,
    def: cls.base.def,
    gil: cls.gil,
    weaponId: null,
    armorId: null,
    items: { herb: 2, ether: 1 },
    spells: [...STARTING_SPELLS],
  };
}

/** Attack including the equipped weapon. */
export function totalAttack(hero: Hero): number {
  return hero.atk + (hero.weaponId ? (ITEMS[hero.weaponId]?.atk ?? 0) : 0);
}

/** Defence including the equipped armour. */
export function totalDefense(hero: Hero): number {
  return hero.def + (hero.armorId ? (ITEMS[hero.armorId]?.def ?? 0) : 0);
}

/**
 * Adds XP and applies any level-ups (each restores HP/MP and raises stats by
 * the class's growth). Returns the number of levels gained.
 */
export function gainXp(hero: Hero, amount: number): number {
  const growth = heroClass(hero).growth;
  hero.xp += amount;
  let gained = 0;
  while (hero.xp >= hero.nextXp) {
    hero.xp -= hero.nextXp;
    hero.level++;
    hero.nextXp = Math.floor(hero.nextXp * 1.45);
    hero.maxHp += growth.hp;
    hero.maxMp += growth.mp;
    hero.atk += growth.atk;
    hero.def += growth.def;
    hero.hp = hero.maxHp;
    hero.mp = hero.maxMp;
    gained++;
  }
  return gained;
}

/** Restores up to `amount` HP. Returns the HP actually restored. */
export function heal(hero: Hero, amount: number): number {
  const restored = Math.min(amount, hero.maxHp - hero.hp);
  hero.hp += restored;
  return restored;
}

/** Restores up to `amount` MP. Returns the MP actually restored. */
export function restoreMp(hero: Hero, amount: number): number {
  const restored = Math.min(amount, hero.maxMp - hero.mp);
  hero.mp += restored;
  return restored;
}

/** Applies damage (never below 0 HP). Returns the damage actually taken. */
export function takeDamage(hero: Hero, amount: number): number {
  const taken = Math.min(Math.max(0, amount), hero.hp);
  hero.hp -= taken;
  return taken;
}

export function itemCount(hero: Hero, itemId: string): number {
  return hero.items[itemId] ?? 0;
}

export function addItem(hero: Hero, itemId: string, count = 1): void {
  hero.items[itemId] = itemCount(hero, itemId) + count;
}

/** Removes `count` of an item. Returns false (and changes nothing) if there are not enough. */
export function removeItem(hero: Hero, itemId: string, count = 1): boolean {
  const have = itemCount(hero, itemId);
  if (have < count) return false;
  if (have === count) {
    hero.items = Object.fromEntries(Object.entries(hero.items).filter(([id]) => id !== itemId));
  } else {
    hero.items[itemId] = have - count;
  }
  return true;
}

export function learnSpell(hero: Hero, spellId: string): boolean {
  if (hero.spells.includes(spellId)) return false;
  hero.spells.push(spellId);
  return true;
}

/** Why an item can't be used right now, or null if it can. */
export function cannotUseReason(hero: Hero, item: ItemDef): string | null {
  const use = item.use;
  if (!use) return `${item.name} can't be used directly.`;
  if (itemCount(hero, item.id) < 1) return `You have no ${item.name}.`;
  if (use.learnSpell && hero.spells.includes(use.learnSpell)) return 'You already know that spell.';
  const healsOnly = use.heal && !use.mp;
  const mpOnly = use.mp && !use.heal;
  if (healsOnly && hero.hp >= hero.maxHp) return 'HP is already full.';
  if (mpOnly && hero.mp >= hero.maxMp) return 'MP is already full.';
  return null;
}

/**
 * Applies an item's effect without consuming it from the inventory (used for
 * both inventory items and purchased services). Returns a short description.
 */
export function applyItemEffect(hero: Hero, item: ItemDef): string {
  const use = item.use ?? {};
  const parts: string[] = [];
  if (use.rest) {
    hero.hp = hero.maxHp;
    hero.mp = hero.maxMp;
    parts.push('HP and MP fully restored');
  }
  if (use.heal) parts.push(`restored ${heal(hero, use.heal)} HP`);
  if (use.mp) parts.push(`restored ${restoreMp(hero, use.mp)} MP`);
  if (use.learnSpell && learnSpell(hero, use.learnSpell)) parts.push(`learned a new spell`);
  return parts.length ? `${item.name}: ${parts.join(', ')}.` : `${item.name} had no effect.`;
}

/** Uses one of an inventory item. Returns a message, or throws if it can't be used. */
export function useItem(hero: Hero, itemId: string): string {
  const item = ITEMS[itemId];
  if (!item) throw new Error(`Unknown item: ${itemId}`);
  const reason = cannotUseReason(hero, item);
  if (reason) throw new Error(reason);
  removeItem(hero, itemId);
  return applyItemEffect(hero, item);
}

/** Equips a weapon or armour from the inventory, returning the old one to it. */
export function equip(hero: Hero, itemId: string): void {
  const item = ITEMS[itemId];
  if (!item || (item.kind !== 'weapon' && item.kind !== 'armor')) {
    throw new Error(`${itemId} is not equipment`);
  }
  if (!removeItem(hero, itemId)) throw new Error(`You have no ${item.name}`);
  const slot = item.kind === 'weapon' ? 'weaponId' : 'armorId';
  const previous = hero[slot];
  if (previous) addItem(hero, previous);
  hero[slot] = itemId;
}
