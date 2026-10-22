import { ELEMENTS, emptyCounts, type Element, type ElementCounts } from '../core/elements';
import { CLASSES, DEFAULT_CLASS, type HeroClass } from '../data/classes';
import { ITEMS } from '../data/items';
import { STARTING_SPELLS } from '../data/spells';
import { STAT_IDS, type StatRanks } from '../data/stats';
import type { ElementAmounts, ItemDef, SpellDef } from '../data/types';
import { ALIGNMENT_TITLES, alignmentOf, titleElementFor } from './alignment';
import {
  SKILL_POINTS_PER_LEVEL,
  derivedStats,
  isValidPlan,
  planCost,
  statRanks,
  type StatPlan,
} from './stats';

/** The player character. Plain data so it can be saved as JSON. */
export interface Hero {
  name: string;
  /** Key into `CLASSES`; decides base numbers, starting ranks, HP growth and sprite. */
  classId: string;
  /**
   * The element the hero's title comes from: their strongest alignment,
   * starting with the class's own (see `titleElementFor`).
   */
  titleElement: Element;
  level: number;
  xp: number;
  /** XP needed to reach the next level. */
  nextXp: number;
  hp: number;
  /** From class, level and Vitality (kept in step by `refreshStats`). */
  maxHp: number;
  /** Seven elemental mana pools, filled by clearing crystals of each element. */
  mana: ElementCounts;
  /** Capacity of each mana pool: class base plus Focus. */
  manaCap: number;
  /** Attack added to every line-clear strike: class base plus Strength (before weapon). */
  atk: number;
  /** Defence subtracted from every enemy hit: class base plus Guard (before armour). */
  def: number;
  /** Rank of each stat, bought with skill points. */
  stats: StatRanks;
  /** Unspent skill points. */
  skillPoints: number;
  gil: number;
  weaponId: string | null;
  armorId: string | null;
  /** A charm that tilts which pieces fall. */
  accessoryId: string | null;
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
  const stats = statRanks(cls.stats);
  const derived = derivedStats(cls, 1, stats);
  return {
    name: name ?? cls.heroName,
    classId: cls.id,
    titleElement: cls.element,
    level: 1,
    xp: 0,
    nextXp: 30,
    hp: derived.maxHp,
    mana: emptyCounts(derived.manaCap),
    ...derived,
    stats,
    skillPoints: 0,
    gil: cls.gil,
    weaponId: null,
    armorId: null,
    accessoryId: null,
    items: { herb: 2, ether: 1 },
    spells: [cls.spell, ...STARTING_SPELLS.filter((id) => id !== cls.spell)],
  };
}

/** The class name with the strongest element's prefix, e.g. "Stone Knight". */
export function heroTitle(hero: Hero): string {
  return `${ALIGNMENT_TITLES[hero.titleElement]} ${heroClass(hero).name}`;
}

/** The hero's alignment in every element (see `src/game/alignment.ts`). */
export function heroAlignment(hero: Pick<Hero, 'spells'>): ElementCounts {
  return alignmentOf(hero.spells);
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
 * Adds XP and applies any level-ups. Each gives skill points and the
 * class's HP growth, and restores HP and mana. Returns the levels gained.
 */
export function gainXp(hero: Hero, amount: number): number {
  hero.xp += amount;
  let gained = 0;
  while (hero.xp >= hero.nextXp) {
    hero.xp -= hero.nextXp;
    hero.level++;
    hero.nextXp = Math.floor(hero.nextXp * 1.45);
    hero.skillPoints += SKILL_POINTS_PER_LEVEL;
    refreshStats(hero);
    hero.hp = hero.maxHp;
    fillMana(hero);
    gained++;
  }
  return gained;
}

/**
 * Recomputes max HP, mana capacity, attack and defence from the class,
 * level and stat ranks, keeping current HP and mana within the new caps.
 */
export function refreshStats(hero: Hero): void {
  Object.assign(hero, derivedStats(heroClass(hero), hero.level, hero.stats));
  hero.hp = Math.min(hero.hp, hero.maxHp);
  for (const element of ELEMENTS) hero.mana[element] = Math.min(hero.mana[element], hero.manaCap);
}

/**
 * Buys the planned stat ranks with skill points. This is permanent. New
 * max HP and mana capacity are added to current HP and every pool too.
 * Returns false (and spends nothing) if the plan is invalid or costs more
 * points than the hero has.
 */
export function spendSkillPoints(hero: Hero, plan: StatPlan): boolean {
  if (!isValidPlan(hero.stats, hero.skillPoints, plan)) return false;
  for (const id of STAT_IDS) hero.stats[id] += plan[id] ?? 0;
  hero.skillPoints -= planCost(plan);
  const before = { maxHp: hero.maxHp, manaCap: hero.manaCap };
  refreshStats(hero);
  hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp - before.maxHp);
  addManaToAll(hero, hero.manaCap - before.manaCap);
  return true;
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

/**
 * What a spell costs this hero. Every hero pays the listed cost for now;
 * this is the one place later cost changes (spell enhancements) will apply.
 */
export function spellCost(_hero: Hero, spell: SpellDef): ElementAmounts {
  return spell.cost;
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

/**
 * Learns a spell, raising the hero's alignment and possibly their title.
 * Returns false if the spell was already known.
 */
export function learnSpell(hero: Hero, spellId: string): boolean {
  if (hero.spells.includes(spellId)) return false;
  hero.spells.push(spellId);
  hero.titleElement = titleElementFor(hero.titleElement, heroAlignment(hero));
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
