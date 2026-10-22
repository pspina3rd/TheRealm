import { ELEMENTS, emptyCounts, type Element, type ElementCounts } from '../core/elements';
import {
  ATTUNEMENT_LEVEL,
  ATTUNEMENT_TITLES,
  CLASSES,
  DEFAULT_CLASS,
  type HeroClass,
} from '../data/classes';
import { ITEMS } from '../data/items';
import { STARTING_SPELLS } from '../data/spells';
import type { ElementAmounts, ItemDef, SpellDef } from '../data/types';

/** The player character. Plain data so it can be saved as JSON. */
export interface Hero {
  name: string;
  /** Key into `CLASSES`; decides starting stats, growth and sprite. */
  classId: string;
  /** Element chosen at `ATTUNEMENT_LEVEL`, or null before then. */
  attunement: Element | null;
  level: number;
  xp: number;
  /** XP needed to reach the next level. */
  nextXp: number;
  hp: number;
  maxHp: number;
  /** Seven elemental mana pools, filled by clearing crystals of each element. */
  mana: ElementCounts;
  /** Capacity of each mana pool. */
  manaCap: number;
  /** Base attack added to every line-clear strike (before weapon bonus). */
  atk: number;
  /** Base defence subtracted from every enemy hit (before armour bonus). */
  def: number;
  gil: number;
  weaponId: string | null;
  armorId: string | null;
  /** A charm that tilts which pieces fall. */
  accessoryId: string | null;
  /** Item id → count. Zero-count entries are removed. */
  items: Record<string, number>;
  spells: string[];
}

/** Mana discount on the attuned element's share of a spell's cost. */
export const ATTUNED_DISCOUNT = 2;

/** The hero's class, falling back to the default for unknown ids (e.g. old saves). */
export function heroClass(hero: Pick<Hero, 'classId'>): HeroClass {
  return CLASSES[hero.classId] ?? (CLASSES[DEFAULT_CLASS] as HeroClass);
}

export function createHero(classId = DEFAULT_CLASS, name?: string): Hero {
  const cls = heroClass({ classId });
  return {
    name: name ?? cls.heroName,
    classId: cls.id,
    attunement: null,
    level: 1,
    xp: 0,
    nextXp: 30,
    hp: cls.base.hp,
    maxHp: cls.base.hp,
    mana: emptyCounts(cls.base.mana),
    manaCap: cls.base.mana,
    atk: cls.base.atk,
    def: cls.base.def,
    gil: cls.gil,
    weaponId: null,
    armorId: null,
    accessoryId: null,
    items: { herb: 2, ether: 1 },
    spells: [...STARTING_SPELLS],
  };
}

/** "Knight", or "Stone Knight" once attuned to earth. */
export function heroTitle(hero: Hero): string {
  const cls = heroClass(hero).name;
  return hero.attunement ? `${ATTUNEMENT_TITLES[hero.attunement]} ${cls}` : cls;
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
 * Adds XP and applies any level-ups (each restores HP and mana and raises
 * stats by the class's growth). Returns the number of levels gained.
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
    hero.manaCap += growth.mana;
    hero.atk += growth.atk;
    hero.def += growth.def;
    hero.hp = hero.maxHp;
    fillMana(hero);
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

/** Applies damage (never below 0 HP). Returns the damage actually taken. */
export function takeDamage(hero: Hero, amount: number): number {
  const taken = Math.min(Math.max(0, amount), hero.hp);
  hero.hp -= taken;
  return taken;
}

// ------------------------------------------------------------------ mana ---

/** Adds mana per element, capped. Returns the total actually added. */
export function addMana(hero: Hero, amounts: ElementAmounts): number {
  let added = 0;
  for (const element of ELEMENTS) {
    const gain = Math.min(amounts[element] ?? 0, hero.manaCap - hero.mana[element]);
    if (gain > 0) {
      hero.mana[element] += gain;
      added += gain;
    }
  }
  return added;
}

/** Adds `amount` to every pool. Returns the total actually added. */
export function addManaToAll(hero: Hero, amount: number): number {
  return addMana(hero, emptyCounts(amount));
}

export function fillMana(hero: Hero): void {
  hero.mana = emptyCounts(hero.manaCap);
}

export function manaFull(hero: Hero): boolean {
  return ELEMENTS.every((e) => hero.mana[e] >= hero.manaCap);
}

/** A spell's cost for this hero, with the attunement discount applied. */
export function spellCost(hero: Hero, spell: SpellDef): ElementAmounts {
  const cost: Partial<Record<Element, number>> = { ...spell.cost };
  const attuned = hero.attunement;
  if (attuned && cost[attuned]) cost[attuned] = Math.max(1, cost[attuned] - ATTUNED_DISCOUNT);
  return cost;
}

export function canAfford(hero: Hero, cost: ElementAmounts): boolean {
  return ELEMENTS.every((e) => hero.mana[e] >= (cost[e] ?? 0));
}

/** Spends mana. Returns false (and spends nothing) if any pool is short. */
export function spendMana(hero: Hero, cost: ElementAmounts): boolean {
  if (!canAfford(hero, cost)) return false;
  for (const e of ELEMENTS) hero.mana[e] -= cost[e] ?? 0;
  return true;
}

/** Removes up to `amount` from the fullest pool. Returns which pool and how much. */
export function drainMana(hero: Hero, amount: number): { element: Element; drained: number } {
  const element = ELEMENTS.reduce((best, e) => (hero.mana[e] > hero.mana[best] ? e : best));
  const drained = Math.min(amount, hero.mana[element]);
  hero.mana[element] -= drained;
  return { element, drained };
}

// ------------------------------------------------------------ attunement ---

export function canAttune(hero: Hero): boolean {
  return hero.attunement === null && hero.level >= ATTUNEMENT_LEVEL;
}

/** Chooses the hero's element for good. Throws if not yet allowed. */
export function attune(hero: Hero, element: Element): void {
  if (!canAttune(hero)) throw new Error(`Attunement opens at level ${ATTUNEMENT_LEVEL}, once.`);
  hero.attunement = element;
}

// ----------------------------------------------------------------- items ---

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
  if (use.heal && !use.mana && hero.hp >= hero.maxHp) return 'HP is already full.';
  if (use.mana && !use.heal && manaFull(hero)) return 'Mana is already full.';
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
    fillMana(hero);
    parts.push('HP and mana fully restored');
  }
  if (use.heal) parts.push(`restored ${heal(hero, use.heal)} HP`);
  if (use.mana) parts.push(`restored ${addManaToAll(hero, use.mana)} mana`);
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

/** The equipment slot an item goes in, or null if it isn't equipment. */
export function slotFor(item: ItemDef): 'weaponId' | 'armorId' | 'accessoryId' | null {
  switch (item.kind) {
    case 'weapon':
      return 'weaponId';
    case 'armor':
      return 'armorId';
    case 'accessory':
      return 'accessoryId';
    default:
      return null;
  }
}

/** Equips a weapon, armour or charm from the inventory, returning the old one to it. */
export function equip(hero: Hero, itemId: string): void {
  const item = ITEMS[itemId];
  const slot = item && slotFor(item);
  if (!item || !slot) throw new Error(`${itemId} is not equipment`);
  if (!removeItem(hero, itemId)) throw new Error(`You have no ${item.name}`);
  const previous = hero[slot];
  if (previous) addItem(hero, previous);
  hero[slot] = itemId;
}
