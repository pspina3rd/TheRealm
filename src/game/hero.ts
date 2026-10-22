import { ELEMENTS, emptyCounts, type Element, type ElementCounts } from '../core/elements';
import { CLASSES, DEFAULT_CLASS, type HeroClass } from '../data/classes';
import { ITEMS } from '../data/items';
import { ENHANCEMENT_IDS, SPELLS, STARTING_SPELLS } from '../data/spells';
import { STAT_IDS, type StatRanks } from '../data/stats';
import type { ElementAmounts, ItemDef } from '../data/types';
import type { Feats } from './feats';
import { ALIGNMENT_TITLES, alignmentOf, titleElementFor } from './alignment';
import { isValidSkillPlan, skillPlanCost, type SkillPlan } from './skills';
import {
  enhancements,
  isReady,
  knownSpell,
  newKnownSpell,
  totalEnhancements,
  type FailedLesson,
  type KnownSpell,
} from './spells';
import { SKILL_POINTS_PER_LEVEL, derivedStats, statRanks } from './stats';

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
  /** Spell id → its level and enhancements, in the order learned. */
  spells: Record<string, KnownSpell>;
  /**
   * The lesson lost in each category, if any: its spells can't be enhanced
   * until that lesson is won (see `isCategoryLocked`).
   */
  failedLessons: Partial<Record<Element, FailedLesson>>;
  /** Board feats done over the hero's life (see `src/game/feats.ts`). */
  feats: Feats;
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
    // Mana belongs to a battle: pools start empty and fill from cleared crystals.
    mana: emptyCounts(),
    ...derived,
    stats,
    skillPoints: 0,
    gil: cls.gil,
    weaponId: null,
    armorId: null,
    accessoryId: null,
    items: { herb: 2, ether: 1 },
    spells: Object.fromEntries(
      [cls.spell, ...STARTING_SPELLS.filter((id) => id !== cls.spell)].map((id) => [
        id,
        newKnownSpell(),
      ]),
    ),
    failedLessons: {},
    feats: {},
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
 * class's HP growth, and restores HP (never mana). Returns the levels gained.
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
 * Buys the planned stat ranks and spell enhancements with skill points.
 * This is permanent. New max HP is added to current HP too (mana pools are
 * battle-only, so only their capacity grows). Returns false (and spends nothing) if the plan is
 * invalid or costs more points than the hero has.
 */
export function spendSkillPoints(hero: Hero, plan: SkillPlan): boolean {
  if (!isValidSkillPlan(hero, plan)) return false;
  hero.skillPoints -= skillPlanCost(hero, plan);
  for (const id of STAT_IDS) hero.stats[id] += plan.stats[id] ?? 0;
  for (const [spellId, staged] of Object.entries(plan.spells)) {
    const known = knownSpell(hero, spellId);
    if (known) for (const id of ENHANCEMENT_IDS) known.step[id] += staged[id] ?? 0;
  }
  const before = hero.maxHp;
  refreshStats(hero);
  hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp - before);
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

/** Empties every pool. Each battle starts this way, so spells must be earned on the board. */
export function clearMana(hero: Hero): void {
  hero.mana = emptyCounts();
}

export function manaFull(hero: Hero): boolean {
  return ELEMENTS.every((e) => hero.mana[e] >= hero.manaCap);
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
  if (knownSpell(hero, spellId)) return false;
  hero.spells[spellId] = newKnownSpell();
  hero.titleElement = titleElementFor(hero.titleElement, heroAlignment(hero));
  return true;
}

/**
 * Raises a ready spell one level (a mentor's lesson, stage 4). Its
 * enhancements are kept and the next step starts empty. Alignment rises
 * with the level, which may change the hero's title. Throws unless the
 * hero knows the spell and it is ready.
 */
export function raiseSpellLevel(hero: Hero, spellId: string): void {
  const spell = SPELLS[spellId];
  const known = knownSpell(hero, spellId);
  if (!spell || !known || !isReady(spell, known)) throw new Error(`${spellId} is not ready`);
  hero.spells[spellId] = {
    level: known.level + 1,
    step: enhancements(),
    kept: totalEnhancements(known),
  };
  hero.titleElement = titleElementFor(hero.titleElement, heroAlignment(hero));
}

/** Why an item can't be used right now (in or out of battle), or null if it can. */
export function cannotUseReason(hero: Hero, item: ItemDef, inBattle = false): string | null {
  const use = item.use;
  if (!use) return `${item.name} can't be used directly.`;
  if (itemCount(hero, item.id) < 1) return `You have no ${item.name}.`;
  if (use.learnSpell && knownSpell(hero, use.learnSpell)) return 'You already know that spell.';
  if (use.manaBoost && !inBattle) return 'Use it in battle.';
  if (use.heal && hero.hp >= hero.maxHp) return 'HP is already full.';
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
    parts.push('HP fully restored');
  }
  if (use.heal) parts.push(`restored ${heal(hero, use.heal)} HP`);
  if (use.learnSpell && learnSpell(hero, use.learnSpell)) parts.push(`learned a new spell`);
  return parts.length ? `${item.name}: ${parts.join(', ')}.` : `${item.name} had no effect.`;
}

/** Uses one of an inventory item. Returns a message, or throws if it can't be used. */
export function useItem(hero: Hero, itemId: string, inBattle = false): string {
  const item = ITEMS[itemId];
  if (!item) throw new Error(`Unknown item: ${itemId}`);
  const reason = cannotUseReason(hero, item, inBattle);
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
