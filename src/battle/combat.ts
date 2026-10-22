import type { LockResult } from '../core/board';
import { ELEMENTS, colorOfElement, elementsOf, type Element } from '../core/elements';
import type { Rng } from '../core/rng';
import { ENEMIES } from '../data/enemies';
import { SPELLS } from '../data/spells';
import type { EnemyDef, EnemyMove } from '../data/types';
import {
  addMana,
  addManaToAll,
  canAfford,
  drainMana,
  heal,
  itemCount,
  removeItem,
  heroAlignment,
  spendMana,
  takeDamage,
  totalAttack,
  totalDefense,
  useItem,
} from '../game/hero';
import { heroSpell } from '../game/spells';
import { CRIT_MULTIPLIER, critChance } from '../game/stats';
import {
  WEAK_CRYSTAL_BONUS,
  WEAK_MULTIPLIER,
  crystalAffinity,
  elementMultiplier,
  lineSurge,
  resistancesOf,
  weaknessesOf,
  type LineSurge,
} from './elemental';
import type { BattleContext, BattleStatus, Challenge, Objective } from './types';

/** Base damage for clearing 0–4 lines at once. */
export const LINE_DAMAGE: readonly number[] = [0, 8, 20, 35, 55];
/** Fraction of max HP lost when the board overflows. */
export const OVERFLOW_PENALTY = 0.25;
/** Most HP an earth ward can hold. */
export const MAX_WARD = 25;
/** Spell damage added per hero level (not for spells that clear rows). */
export const SPELL_LEVEL_BONUS = 2;
/** Chill can push the enemy's next action back at most this far past its normal pace. */
export const MAX_CHILL = 2;

export interface Spoils {
  readonly xp: number;
  readonly gil: number;
  readonly drops: string[];
}

/**
 * Rolls the XP, gil and item drops for defeating `enemy`. `dropBonus` is
 * added to every drop chance (from Luck).
 */
export function rollSpoils(enemy: EnemyDef, rng: Rng, dropBonus = 0): Spoils {
  const drops = (enemy.drops ?? [])
    .filter((d) => rng.next() < d.chance + dropBonus)
    .map((d) => d.itemId);
  return { xp: enemy.xp, gil: enemy.gil, drops };
}

/**
 * A fight. Each cleared line strikes the enemy (a big clear can crit, from
 * Luck), and the line's strongest element triggers its own effect (burn,
 * chill, chain, regrowth, ward, surge or tailwind). Spells spend elemental
 * mana. Every `actEvery` actions the enemy uses one of its moves, physical
 * or magical, chosen one turn ahead so Insight can reveal it. Everything
 * that happens is emitted as a `BattleEvent` for the screen to show.
 */
export class CombatChallenge implements Challenge {
  readonly enemy: EnemyDef;
  enemyHp: number;
  /** Actions remaining before the enemy acts. */
  countdown: number;
  /** Earth ward: damage absorbed before HP. */
  ward = 0;
  /** The move the enemy will use when the countdown runs out. */
  nextMove: EnemyMove;
  /** Kindle: fire damage after each of the next `pieces` pieces. */
  burn = { power: 0, pieces: 0 };
  /** Regen: healing after each of the next `pieces` pieces. */
  regen = { amount: 0, pieces: 0 };
  /** Static: extra lightning damage on each of the next `clears` line clears. */
  charge = { power: 0, clears: 0 };
  /** Mist: enemy moves left that fizzle. */
  mist = 0;
  /** Fault Line: pieces left during which every element strikes as a weakness. */
  exposed = 0;

  protected readonly ctx: BattleContext;

  /** `enemy` is an id in `ENEMIES`, or a definition (e.g. a lesson's scaled foe). */
  constructor(ctx: BattleContext, enemy: string | EnemyDef) {
    const def = typeof enemy === 'string' ? ENEMIES[enemy] : enemy;
    if (!def) throw new Error(`Unknown enemy: ${String(enemy)}`);
    this.ctx = ctx;
    this.enemy = def;
    this.enemyHp = def.hp;
    this.countdown = def.actEvery;
    this.nextMove = ctx.rng.pick(def.moves);
  }

  /**
   * True once a boss has fallen to its enrage threshold (see
   * `EnemyDef.enrage`); it stays enraged even if it heals back above it.
   */
  enraged = false;

  /** Pieces between the enemy's moves: fewer once enraged. */
  private get actEvery(): number {
    return this.enraged
      ? (this.enemy.enrage?.actEvery ?? this.enemy.actEvery)
      : this.enemy.actEvery;
  }

  onLock(result: LockResult): void {
    if (result.linesCleared > 0) {
      const lines = Math.min(result.linesCleared, LINE_DAMAGE.length - 1);
      const cleared = elementsOf(result.clearedCells);
      const affinity =
        this.exposed > 0
          ? ELEMENTS.reduce((sum, e) => sum + cleared[e], 0) * WEAK_CRYSTAL_BONUS
          : crystalAffinity(this.enemy, cleared);
      const hero = this.ctx.hero;
      const chance = critChance(hero.stats.luck, result.linesCleared);
      const crit = chance > 0 && this.ctx.rng.next() < chance;
      if (crit) this.ctx.emit({ kind: 'crit' });
      const damage = Math.max(1, (LINE_DAMAGE[lines] ?? 0) + totalAttack(hero) + affinity);
      this.hitEnemy(
        crit ? damage * CRIT_MULTIPLIER : damage,
        null,
        affinity > 0 ? 'weak' : affinity < 0 ? 'resist' : null,
      );
      const alignment = heroAlignment(hero);
      result.lines.forEach((line, i) => {
        const surge = lineSurge(line, alignment);
        if (surge && this.status() === 'ongoing') {
          this.applySurge(surge, result.linesCleared, result.rows[i] ?? 0);
        }
      });
      if (this.charge.clears > 0 && this.status() === 'ongoing') {
        this.charge.clears--;
        this.elementalHit(this.charge.power, 'lightning');
      }
    }
    this.tick();
    if (result.toppedOut) this.overflow();
    this.spendAction();
  }

  /** Kindle and Regen act once per piece placed; then Fault Line wears off a piece. */
  private tick(): void {
    if (this.burn.pieces > 0 && this.status() === 'ongoing') {
      this.burn.pieces--;
      this.elementalHit(this.burn.power, 'fire');
    }
    if (this.regen.pieces > 0 && this.status() === 'ongoing') {
      this.regen.pieces--;
      this.healHero(this.regen.amount);
    }
    if (this.exposed > 0) this.exposed--;
  }

  /** Strikes the enemy with `element`, scaled by its weakness or resistance (at least 1). */
  private elementalHit(base: number, element: Element): void {
    const multiplier = this.multiplier(element);
    this.hitEnemy(Math.max(1, Math.round(base * multiplier)), element, affinityOf(multiplier));
  }

  /** How hard `element` hits the enemy now: always a weakness while Fault Line lasts. */
  multiplier(element: Element): number {
    return this.exposed > 0 ? WEAK_MULTIPLIER : elementMultiplier(this.enemy, element);
  }

  /** The elements the enemy is weak to now (all of them while Fault Line lasts). */
  weaknesses(): Element[] {
    return this.exposed > 0 ? [...ELEMENTS] : weaknessesOf(this.enemy);
  }

  /** The elements the enemy resists now (none while Fault Line lasts). */
  resistances(): Element[] {
    return this.exposed > 0 ? [] : resistancesOf(this.enemy);
  }

  update(): void {
    // Combat is paced by pieces placed, not time.
  }

  status(): BattleStatus {
    if (this.enemyHp <= 0) return 'won';
    if (this.ctx.hero.hp <= 0) return 'lost';
    return 'ongoing';
  }

  objective(): Objective {
    return {
      label: this.enemy.name,
      progress: 1 - Math.max(0, this.enemyHp) / this.enemy.hp,
      piecesLeft: null,
    };
  }

  /** Why a spell can't be cast right now, or null if it can. */
  cannotCastReason(spellId: string): string | null {
    const hero = this.ctx.hero;
    const cast = heroSpell(hero, spellId);
    if (!cast) return "You don't know that spell.";
    if (!canAfford(hero, cast.cost)) return 'Not enough mana!';
    const effect = cast.effect;
    if ((effect.kind === 'heal' || effect.kind === 'regen') && hero.hp >= hero.maxHp) {
      return 'HP is already full.';
    }
    const category = SPELLS[spellId]?.category;
    const others = ELEMENTS.filter((element) => element !== category);
    if (effect.kind === 'manaTap' && others.every((e) => hero.mana[e] >= hero.manaCap)) {
      return 'Mana is already full.';
    }
    if (effect.kind === 'swap' && !this.ctx.board.canSwapWithNext()) return 'No room to swap.';
    if (effect.kind === 'purify' && this.ctx.board.count('stone') === 0)
      return 'No stone to purify.';
    if (
      effect.kind === 'resonate' &&
      category &&
      this.ctx.board.count(colorOfElement(category)) === 0
    )
      return 'No crystals of its element on the board.';
    return null;
  }

  /**
   * Casts a known spell at the hero's level of it, with its enhancements.
   * Counts as an action. Throws if it can't be cast.
   */
  castSpell(spellId: string): void {
    const reason = this.cannotCastReason(spellId);
    const spell = SPELLS[spellId];
    const hero = this.ctx.hero;
    const cast = heroSpell(hero, spellId);
    if (reason || !spell || !cast) throw new Error(reason ?? "You don't know that spell.");
    spendMana(hero, cast.cost);
    this.ctx.emit({ kind: 'spell', spellId });
    const element = spell.category;
    const effect = cast.effect;
    // Spells that clear rows keep their damage small: no level bonus.
    const strike = (base: number, levelBonus = SPELL_LEVEL_BONUS * hero.level): number => {
      const multiplier = this.multiplier(element);
      const dealt = Math.round((base + levelBonus) * multiplier);
      this.hitEnemy(dealt, element, affinityOf(multiplier));
      return dealt;
    };
    switch (effect.kind) {
      case 'damage':
        strike(effect.power);
        break;
      case 'freeze':
        strike(effect.power);
        this.countdown += effect.pieces;
        this.ctx.emit({ kind: 'chill' });
        break;
      case 'tailwind':
        strike(effect.power);
        this.tailwind(effect.pieces);
        break;
      case 'drain':
        // In whole percent, so a share like 0.7 can't round a heal down.
        this.healHero(Math.floor((strike(effect.power) * Math.round(effect.share * 100)) / 100));
        break;
      case 'heal':
        this.healHero(effect.amount);
        break;
      case 'clearRows':
        this.ctx.board.removeBottomRows(effect.rows);
        strike(effect.power, 0);
        break;
      case 'burn':
        this.burn = { power: effect.power, pieces: effect.pieces };
        break;
      case 'mist':
        this.mist += effect.moves;
        break;
      case 'charge':
        this.charge = { power: effect.power, clears: effect.clears };
        break;
      case 'regen':
        // Keep whichever heal-over-time has more healing left (Regen won't cut Bloom short).
        if (effect.amount * effect.pieces > this.regen.amount * this.regen.pieces)
          this.regen = { amount: effect.amount, pieces: effect.pieces };
        break;
      case 'ward':
        this.addWard(effect.amount);
        break;
      case 'manaTap': {
        const gained = Object.fromEntries(
          ELEMENTS.filter((e) => e !== element).map((e) => [e, effect.amount]),
        );
        if (addMana(hero, gained) > 0) this.ctx.emit({ kind: 'mana', gained });
        break;
      }
      case 'swap':
        this.ctx.board.swapWithNext();
        break;
      case 'purify':
        this.ctx.board.transmute('stone', colorOfElement(element));
        break;
      // Board-scaled damage: no level bonus, like spells that clear rows.
      case 'resonate':
        strike(
          Math.min(effect.max, effect.power * this.ctx.board.count(colorOfElement(element))),
          0,
        );
        break;
      case 'expose':
        this.exposed = Math.max(this.exposed, effect.pieces);
        break;
    }
    // Effect enhancements: the spell also fires its element's line effect.
    if (cast.surge > 0 && this.status() === 'ongoing') {
      this.applySurge({ element, power: cast.surge }, 1, this.ctx.board.height - 1);
    }
    this.spendAction();
  }

  /** Uses a consumable mid-fight. Counts as an action. Throws if it can't be used. */
  useItem(itemId: string): void {
    const hpBefore = this.ctx.hero.hp;
    useItem(this.ctx.hero, itemId);
    this.ctx.emit({ kind: 'item', itemId });
    if (this.ctx.hero.hp > hpBefore)
      this.ctx.emit({ kind: 'heroHeal', amount: this.ctx.hero.hp - hpBefore });
    this.spendAction();
  }

  /** Applies one cleared line's elemental effect. */
  private applySurge({ element, power }: LineSurge, linesTogether: number, row: number): void {
    const hero = this.ctx.hero;
    this.ctx.emit({ kind: 'surge', element, power, row });
    const strike = (base: number): void => this.elementalHit(base, element);
    switch (element) {
      case 'fire':
        strike(power);
        break;
      case 'lightning':
        strike(power * linesTogether);
        break;
      case 'water':
        if (this.countdown < this.actEvery + MAX_CHILL) {
          this.countdown++;
          this.ctx.emit({ kind: 'chill' });
        }
        break;
      case 'nature':
        this.healHero(power);
        break;
      case 'earth':
        this.addWard(power);
        break;
      case 'arcane': {
        const each = Math.ceil(power / 3);
        if (addManaToAll(hero, each) > 0) {
          this.ctx.emit({
            kind: 'mana',
            gained: Object.fromEntries(Object.keys(hero.mana).map((e) => [e, each])),
          });
        }
        break;
      }
      case 'wind':
        this.tailwind(Math.ceil(power / 2));
        break;
    }
  }

  private addWard(amount: number): void {
    this.ward = Math.min(MAX_WARD, this.ward + amount);
    this.ctx.emit({ kind: 'ward', total: this.ward });
  }

  private tailwind(pieces: number): void {
    this.ctx.slowPieces = Math.max(this.ctx.slowPieces, pieces);
    this.ctx.hastePieces = 0;
    this.ctx.emit({ kind: 'tailwind', pieces: this.ctx.slowPieces });
  }

  private hitEnemy(
    amount: number,
    element: Element | null,
    affinity: 'weak' | 'resist' | null,
  ): void {
    this.enemyHp -= amount;
    this.ctx.emit({ kind: 'enemyHit', amount, element, affinity });
    const enrage = this.enemy.enrage;
    if (this.enemyHp <= 0) this.ctx.emit({ kind: 'enemyDefeated' });
    else if (enrage && !this.enraged && this.enemyHp <= this.enemy.hp * enrage.below) {
      this.enraged = true;
      this.countdown = Math.min(this.countdown, this.actEvery);
      this.ctx.emit({ kind: 'enrage' });
    }
  }

  private healHero(amount: number): void {
    const healed = heal(this.ctx.hero, amount);
    if (healed > 0) this.ctx.emit({ kind: 'heroHeal', amount: healed });
  }

  /** The board overflowed: the hero is hurt and the board shatters. */
  private overflow(): void {
    this.ctx.emit({ kind: 'overflow' });
    this.hurtHero(Math.ceil(this.ctx.hero.maxHp * OVERFLOW_PENALTY));
    this.ctx.board.reset();
  }

  private spendAction(): void {
    if (this.status() !== 'ongoing') return;
    this.countdown--;
    if (this.countdown <= 0) {
      this.countdown = this.actEvery;
      const move = this.nextMove;
      this.nextMove = this.ctx.rng.pick(this.enemy.moves);
      if (this.mist > 0) {
        this.mist--;
        this.ctx.emit({ kind: 'fizzle', move });
      } else this.enemyAct(move);
    }
  }

  private enemyAct(move: EnemyMove): void {
    this.ctx.emit({ kind: 'enemyMove', move });
    switch (move.kind) {
      case 'attack': {
        const damage = Math.max(1, move.power + this.enemy.atk - totalDefense(this.ctx.hero));
        const absorbed = Math.min(this.ward, damage);
        if (absorbed > 0) {
          this.ward -= absorbed;
          this.ctx.emit({ kind: 'ward', total: this.ward });
        }
        if (damage > absorbed) this.hurtHero(damage - absorbed);
        break;
      }
      case 'curse': {
        const rows = this.enraged ? (this.enemy.enrage?.curseRows ?? move.rows) : move.rows;
        this.ctx.board.addGarbage(rows);
        this.ctx.emit({ kind: 'curse', rows });
        if (this.ctx.board.toppedOut) this.overflow();
        break;
      }
      case 'haste':
        this.ctx.hastePieces = move.pieces;
        this.ctx.slowPieces = 0;
        this.ctx.emit({ kind: 'haste', pieces: move.pieces });
        break;
      case 'heal': {
        const restored = Math.min(move.amount, this.enemy.hp - this.enemyHp);
        this.enemyHp += restored;
        this.ctx.emit({ kind: 'enemyHeal', amount: restored });
        break;
      }
      case 'drain': {
        const { element, drained } = drainMana(this.ctx.hero, move.mana);
        this.ctx.emit({ kind: 'drain', element, amount: drained });
        break;
      }
    }
  }

  private hurtHero(damage: number): void {
    const hero = this.ctx.hero;
    this.ctx.emit({ kind: 'heroHit', amount: takeDamage(hero, damage) });
    if (hero.hp === 0 && itemCount(hero, 'phoenixFeather') > 0) {
      removeItem(hero, 'phoenixFeather');
      hero.hp = Math.ceil(hero.maxHp / 2);
      this.ctx.emit({ kind: 'revive' });
    }
  }
}

function affinityOf(multiplier: number): 'weak' | 'resist' | null {
  if (multiplier > 1) return 'weak';
  if (multiplier < 1) return 'resist';
  return null;
}
