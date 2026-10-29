/**
 * Spell levels and enhancements. Each known spell has a level and the
 * enhancements bought for it. Enhancing all three attributes (Power,
 * Efficiency, Effect) makes the spell *ready* for its next level, which a
 * mentor lesson then teaches (`raiseSpellLevel` in `hero.ts`). Bonuses stay
 * after the level rises; a spell at its last level can't be enhanced.
 *
 * Per enhancement:
 * - Power: +20% of the level's base damage or healing.
 * - Efficiency: −1 mana from each element of the cost, never below 1.
 * - Effect: a stronger side effect, by kind of spell —
 *   damage and heal also fire their element's line effect at 3 per Effect
 *   (fire burns, lightning chains, nature regrows); freeze delays the enemy
 *   1 more piece; tailwind slows 1 more piece; drain heals 10% more of the
 *   damage (at most all of it); clearRows removes 1 more row at 1, 3 and 5
 *   Effect.
 */
import { ELEMENTS, type Element } from '../core/elements';
import { PIECE_MS } from '../core/scoring';
import {
  ENHANCEMENT_IDS,
  LEVEL_STEPS,
  SPELLS,
  type EnhancementId,
  type LevelStep,
} from '../data/spells';
import type { ElementAmounts, SpellDef, SpellEffect, SpellLevel } from '../data/types';
import type { Hero } from './hero';

/** Power adds this fraction of the level's base damage or healing. */
export const POWER_PER_ENHANCEMENT = 0.2;
/** Efficiency takes this much mana off each element of the cost… */
export const MANA_PER_EFFICIENCY = 1;
/** …but never below this. */
export const MIN_MANA_PER_ELEMENT = 1;
/** Line-effect strength a damage or heal spell gains per Effect. */
export const SURGE_PER_EFFECT = 3;
/** Extra share of drained damage healed per Effect. */
export const DRAIN_SHARE_PER_EFFECT = 0.1;
/** clearRows removes one more row per this many Effect (rounded up). */
export const EFFECTS_PER_EXTRA_ROW = 2;

/** A count per attribute. */
export type Enhancements = Record<EnhancementId, number>;

/** A spell the hero knows. Plain data so it can be saved as JSON. */
export interface KnownSpell {
  level: number;
  /** Enhancements bought toward the next level. */
  step: Enhancements;
  /** Enhancements from earlier levels; their bonuses stay. */
  kept: Enhancements;
}

/** A spell as cast: its name, cost and effect after level and enhancements. */
export interface CastSpell {
  readonly name: string;
  readonly level: number;
  readonly cost: ElementAmounts;
  readonly effect: SpellEffect;
  /** Strength of the category's line effect the spell also fires (0 for none). */
  readonly surge: number;
}

/** Every attribute at 0, plus any given counts. */
export function enhancements(counts: Partial<Enhancements> = {}): Enhancements {
  return Object.fromEntries(ENHANCEMENT_IDS.map((id) => [id, counts[id] ?? 0])) as Enhancements;
}

/** A newly learned spell: level 1, nothing enhanced. */
export function newKnownSpell(): KnownSpell {
  return { level: 1, step: enhancements(), kept: enhancements() };
}

/** The highest level a spell reaches. */
export function maxLevel(spell: SpellDef): number {
  return spell.levels.length;
}

/** A spell's data at `level` (clamped to the levels it has). */
export function spellLevel(spell: SpellDef, level: number): SpellLevel {
  const index = Math.min(Math.max(level, 1), maxLevel(spell)) - 1;
  return spell.levels[index] ?? spell.levels[0];
}

/** A spell's name at `level`, e.g. Fire at 1, Blaze at 2. */
export function spellName(spell: SpellDef, level = 1): string {
  return spellLevel(spell, level).name;
}

/** The elements whose alignment a spell builds. */
export function spellElements(spell: SpellDef): readonly Element[] {
  return spell.elements ?? [spell.category];
}

/** All enhancements a spell has: earlier levels' plus the current step's. */
export function totalEnhancements(known: KnownSpell): Enhancements {
  return enhancements(
    Object.fromEntries(ENHANCEMENT_IDS.map((id) => [id, known.step[id] + known.kept[id]])),
  );
}

/** What the spell needs to become ready for its next level, or null at its last level. */
export function levelStep(spell: SpellDef, level: number): LevelStep | null {
  return level < maxLevel(spell) ? (LEVEL_STEPS[level - 1] ?? null) : null;
}

/** Enhancements a step needs in all. */
export function stepSize(step: LevelStep): number {
  return step.each * ENHANCEMENT_IDS.length + step.any;
}

/**
 * True if `counts` can still lead to a complete step: whole, non-negative,
 * and leaving room for every attribute's required `each`.
 */
export function fitsStep(step: LevelStep, counts: Readonly<Partial<Enhancements>>): boolean {
  let used = 0;
  let missing = 0;
  for (const id of ENHANCEMENT_IDS) {
    const count = counts[id] ?? 0;
    if (!Number.isInteger(count) || count < 0) return false;
    used += count;
    missing += Math.max(0, step.each - count);
  }
  return used + missing <= stepSize(step);
}

/**
 * True if the spell can take one more `attribute` on top of `staged`: it
 * has a next level and the step stays completable.
 */
export function canAddEnhancement(
  spell: SpellDef,
  known: KnownSpell,
  staged: Readonly<Partial<Enhancements>>,
  attribute: EnhancementId,
): boolean {
  const step = levelStep(spell, known.level);
  if (!step) return false;
  const counts = addCounts(known.step, staged);
  counts[attribute]++;
  return fitsStep(step, counts);
}

/** True when every enhancement the next level needs is bought (plus any `staged`). */
export function isReady(
  spell: SpellDef,
  known: KnownSpell,
  staged: Readonly<Partial<Enhancements>> = {},
): boolean {
  const step = levelStep(spell, known.level);
  if (!step) return false;
  const counts = addCounts(known.step, staged);
  const used = ENHANCEMENT_IDS.reduce((sum, id) => sum + counts[id], 0);
  return used === stepSize(step) && fitsStep(step, counts);
}

/** The spell at the hero's level, with every enhancement applied (plus any `staged`). */
export function castSpellFor(
  spell: SpellDef,
  known: KnownSpell,
  staged: Readonly<Partial<Enhancements>> = {},
): CastSpell {
  const { name, cost, effect } = spellLevel(spell, known.level);
  const bonus = addCounts(totalEnhancements(known), staged);
  const power = (base: number): number =>
    Math.round(base * (1 + POWER_PER_ENHANCEMENT * bonus.power));
  return {
    name,
    level: known.level,
    cost: Object.fromEntries(
      Object.entries(cost).map(([element, amount]) => [
        element,
        Math.max(MIN_MANA_PER_ELEMENT, amount - MANA_PER_EFFICIENCY * bonus.efficiency),
      ]),
    ),
    effect: enhancedEffect(effect, bonus.effect, power),
    surge: effect.kind === 'damage' || effect.kind === 'heal' ? SURGE_PER_EFFECT * bonus.effect : 0,
  };
}

/**
 * The number Power raises: the spell's damage, healing or ward, or the
 * mana it gives; 0 for spells with no such number (Mist, Gust).
 */
export function castPower(effect: SpellEffect): number {
  switch (effect.kind) {
    case 'heal':
    case 'regen':
    case 'ward':
    case 'manaTap':
      return effect.amount;
    case 'mist':
    case 'swap':
    case 'purify':
    case 'expose':
      return 0;
    default:
      return effect.power;
  }
}

/**
 * The number Effect raises: line-effect strength (damage and heal), rows
 * (clearRows), pieces (freeze, tailwind, burn, regen) or healed share in
 * percent (drain). For single-level supports it is their duration (pieces,
 * clears or moves), or 0.
 */
export function castEffect(cast: CastSpell): number {
  const effect = cast.effect;
  switch (effect.kind) {
    case 'damage':
    case 'heal':
      return cast.surge;
    case 'clearRows':
      return effect.rows;
    case 'freeze':
    case 'tailwind':
    case 'burn':
    case 'regen':
    case 'expose':
      return effect.pieces;
    case 'drain':
      return Math.round(effect.share * 100);
    case 'charge':
      return effect.clears;
    case 'mist':
      return effect.moves;
    case 'ward':
    case 'manaTap':
    case 'swap':
    case 'purify':
    case 'resonate':
      return 0;
  }
}

/** A short description of what a cast does, for tooltips, e.g. "Blaze · Lv 2 · 22 damage". */
export function castSummary(cast: CastSpell): string {
  const effect = cast.effect;
  const parts = [cast.name, `Lv ${cast.level}`];
  switch (effect.kind) {
    case 'damage':
      parts.push(`${effect.power} damage`);
      break;
    case 'heal':
      parts.push(`heal ${effect.amount}`);
      break;
    case 'clearRows':
      parts.push(`clear ${effect.rows} rows`, `${effect.power} damage`);
      break;
    case 'freeze':
      parts.push(`${effect.power} damage`, `enemy gauge −${(effect.pieces * PIECE_MS) / 1000} s`);
      break;
    case 'tailwind':
      parts.push(`${effect.power} damage`, `slow ${effect.pieces} pieces`);
      break;
    case 'drain':
      parts.push(`${effect.power} damage`, `heal ${Math.round(effect.share * 100)}% of it`);
      break;
    case 'burn':
      parts.push(`${effect.power} damage × ${effect.pieces} pieces`);
      break;
    case 'mist':
      parts.push(`next ${effect.moves} enemy move fizzles`);
      break;
    case 'charge':
      parts.push(`+${effect.power} damage × ${effect.clears} clears`);
      break;
    case 'regen':
      parts.push(`heal ${effect.amount} × ${effect.pieces} pieces`);
      break;
    case 'ward':
      parts.push(`ward ${effect.amount}`);
      break;
    case 'manaTap':
      parts.push(`+${effect.amount} mana to the other pools`);
      break;
    case 'swap':
      parts.push('swap for the next piece');
      break;
    case 'purify':
      parts.push('stone becomes crystal');
      break;
    case 'resonate':
      parts.push(`${effect.power} damage per crystal of its element (max ${effect.max})`);
      break;
    case 'expose':
      parts.push(`every hit is a weakness × ${effect.pieces} pieces`);
      break;
  }
  if (cast.surge > 0) parts.push(`+${cast.surge} line effect`);
  return parts.join(' · ');
}

function enhancedEffect(
  effect: SpellEffect,
  extra: number,
  power: (base: number) => number,
): SpellEffect {
  switch (effect.kind) {
    case 'damage':
      return { ...effect, power: power(effect.power) };
    case 'heal':
      return { ...effect, amount: power(effect.amount) };
    case 'clearRows':
      return {
        ...effect,
        power: power(effect.power),
        rows: effect.rows + Math.ceil(extra / EFFECTS_PER_EXTRA_ROW),
      };
    case 'freeze':
    case 'tailwind':
      return { ...effect, power: power(effect.power), pieces: effect.pieces + extra };
    case 'drain':
      return {
        ...effect,
        power: power(effect.power),
        share: Math.min(1, effect.share + DRAIN_SHARE_PER_EFFECT * extra),
      };
    // Single-level supports and hidden spells: nothing to enhance.
    case 'burn':
    case 'mist':
    case 'charge':
    case 'regen':
    case 'ward':
    case 'manaTap':
    case 'swap':
    case 'purify':
    case 'resonate':
    case 'expose':
      return effect;
  }
}

function addCounts(a: Readonly<Enhancements>, b: Readonly<Partial<Enhancements>>): Enhancements {
  return enhancements(Object.fromEntries(ENHANCEMENT_IDS.map((id) => [id, a[id] + (b[id] ?? 0)])));
}

// ------------------------------------------------------------- the hero ---

/** The hero's record of a spell, or undefined if they don't know it. */
export function knownSpell(hero: Pick<Hero, 'spells'>, spellId: string): KnownSpell | undefined {
  return Object.hasOwn(hero.spells, spellId) ? hero.spells[spellId] : undefined;
}

/** A spell the hero knows, as they would cast it now; null if unknown. */
export function heroSpell(hero: Pick<Hero, 'spells'>, spellId: string): CastSpell | null {
  const spell = SPELLS[spellId];
  const known = knownSpell(hero, spellId);
  return spell && known ? castSpellFor(spell, known) : null;
}

/**
 * A spell sealed by a lost lesson (docs/ENCOUNTER_DESIGN.md §6.3): the
 * hero knows it but can't cast it until they win that lesson back, or win
 * `fights` more monster fights, whichever comes first. One seal at a time.
 */
export interface SpellSeal {
  readonly spellId: string;
  /** Monster fights still to win before the seal lifts on its own. */
  fights: number;
}

/** True while `spellId` is sealed: it can't be cast. */
export function isSealed(hero: Pick<Hero, 'seal'>, spellId: string): boolean {
  return hero.seal?.spellId === spellId;
}

/** The element of the sealed spell, if any (its mentor speaks of the lost lesson). */
export function sealedElement(hero: Pick<Hero, 'seal'>): Element | null {
  return hero.seal ? (SPELLS[hero.seal.spellId]?.category ?? null) : null;
}

/** A category the hero knows spells in, for the battle menu. */
export interface SpellCategory {
  readonly category: Element;
  /** Known spell ids: the primary, then supports, then combos. */
  readonly spells: readonly string[];
}

/** Menu and lesson order of spells within a category. */
export const ROLE_ORDER = ['primary', 'support', 'combo'] as const;

/**
 * The categories the hero knows spells in, in element order (so each
 * element keeps its place for every hero). Unknown spell ids are skipped.
 */
export function spellCategories(hero: Pick<Hero, 'spells'>): SpellCategory[] {
  const known = Object.keys(hero.spells).flatMap((id) => SPELLS[id] ?? []);
  return ELEMENTS.flatMap((category) => {
    const spells = known
      .filter((spell) => spell.category === category)
      .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
      .map((spell) => spell.id);
    return spells.length ? [{ category, spells }] : [];
  });
}
