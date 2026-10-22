import type { LockResult } from '../core/board';
import { ELEMENT_NAMES, elementsOf, type Element } from '../core/elements';
import type { Rng } from '../core/rng';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { SPELLS } from '../data/spells';
import type { EnemyDef, EnemyMove } from '../data/types';
import {
  addManaToAll,
  canAfford,
  drainMana,
  heal,
  itemCount,
  removeItem,
  spellCost,
  spendMana,
  takeDamage,
  totalAttack,
  totalDefense,
  useItem,
} from '../game/hero';
import { crystalAffinity, elementMultiplier, lineSurge, type LineSurge } from './elemental';
import type { BattleContext, BattleStatus, Challenge, Objective } from './types';

/** Base damage for clearing 0–4 lines at once. */
export const LINE_DAMAGE: readonly number[] = [0, 8, 20, 35, 55];
/** Fraction of max HP lost when the board overflows. */
export const OVERFLOW_PENALTY = 0.25;
/** Most HP an earth ward can hold. */
export const MAX_WARD = 25;
/** Chill can push the enemy's next action back at most this far past its normal pace. */
export const MAX_CHILL = 2;

export interface Spoils {
  readonly xp: number;
  readonly gil: number;
  readonly drops: string[];
}

/** Rolls the XP, gil and item drops for defeating `enemy`. */
export function rollSpoils(enemy: EnemyDef, rng: Rng): Spoils {
  const drops = (enemy.drops ?? []).filter((d) => rng.next() < d.chance).map((d) => d.itemId);
  return { xp: enemy.xp, gil: enemy.gil, drops };
}

/**
 * A fight. Each cleared line strikes the enemy, and the line's strongest
 * element triggers its own effect (burn, chill, chain, regrowth, ward,
 * surge or tailwind). Spells spend elemental mana. Every `actEvery` actions
 * the enemy uses one of its moves, physical or magical.
 */
export class CombatChallenge implements Challenge {
  readonly enemy: EnemyDef;
  enemyHp: number;
  /** Actions remaining before the enemy acts. */
  countdown: number;
  /** Earth ward: damage absorbed before HP. */
  ward = 0;

  private readonly ctx: BattleContext;

  constructor(ctx: BattleContext, enemyId: string) {
    const enemy = ENEMIES[enemyId];
    if (!enemy) throw new Error(`Unknown enemy: ${enemyId}`);
    this.ctx = ctx;
    this.enemy = enemy;
    this.enemyHp = enemy.hp;
    this.countdown = enemy.actEvery;
    ctx.log(`${enemy.name} appears! ${enemy.description} ${describeAffinities(enemy)}`);
  }

  onLock(result: LockResult): void {
    if (result.linesCleared > 0) {
      const lines = Math.min(result.linesCleared, LINE_DAMAGE.length - 1);
      const affinity = crystalAffinity(this.enemy, elementsOf(result.clearedCells));
      const damage = Math.max(1, (LINE_DAMAGE[lines] ?? 0) + totalAttack(this.ctx.hero) + affinity);
      this.hitEnemy(damage, `Your ${lines}-line strike`);
      if (affinity > 0) this.ctx.log('Its weakness is exposed!', 'good');
      if (affinity < 0) this.ctx.log('It resists those crystals.', 'bad');
      for (const line of result.lines) {
        const surge = lineSurge(line, this.ctx.hero.attunement);
        if (surge && this.status() === 'ongoing') this.applySurge(surge, result.linesCleared);
      }
    }
    if (result.toppedOut) this.overflow();
    this.spendAction();
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
    const effects = [
      this.ward > 0 ? `ward ${this.ward}` : '',
      this.ctx.slowPieces > 0 ? `tailwind ${this.ctx.slowPieces}` : '',
      this.ctx.hastePieces > 0 ? `hasted ${this.ctx.hastePieces}` : '',
    ].filter(Boolean);
    return {
      label: `${this.enemy.name} · Lv ${this.enemy.level}`,
      detail: [
        `HP ${Math.max(0, this.enemyHp)} / ${this.enemy.hp}`,
        `acts in ${this.countdown}`,
        ...effects,
      ].join(' · '),
      progress: 1 - Math.max(0, this.enemyHp) / this.enemy.hp,
    };
  }

  /** Why a spell can't be cast right now, or null if it can. */
  cannotCastReason(spellId: string): string | null {
    const spell = SPELLS[spellId];
    const hero = this.ctx.hero;
    if (!spell || !hero.spells.includes(spellId)) return "You don't know that spell.";
    if (!canAfford(hero, spellCost(hero, spell))) return 'Not enough mana!';
    if (spell.effect.kind === 'heal' && hero.hp >= hero.maxHp) return 'HP is already full.';
    return null;
  }

  /** Casts a known spell. Counts as an action. Throws if it can't be cast. */
  castSpell(spellId: string): void {
    const reason = this.cannotCastReason(spellId);
    const spell = SPELLS[spellId];
    if (reason || !spell) throw new Error(reason ?? "You don't know that spell.");
    const hero = this.ctx.hero;
    spendMana(hero, spellCost(hero, spell));
    const effect = spell.effect;
    const power = (base: number): number =>
      Math.round((base + hero.level * 2) * elementMultiplier(this.enemy, spell.element));
    switch (effect.kind) {
      case 'damage':
        this.hitEnemy(power(effect.power), spell.name);
        break;
      case 'freeze':
        this.hitEnemy(power(effect.power), spell.name);
        this.countdown += effect.pieces;
        this.ctx.log(`${this.enemy.name} is frozen!`, 'good');
        break;
      case 'tailwind':
        this.hitEnemy(power(effect.power), spell.name);
        this.tailwind(effect.pieces);
        break;
      case 'drain': {
        const dealt = power(effect.power);
        this.hitEnemy(dealt, spell.name);
        this.ctx.log(`You drain ${heal(hero, Math.floor(dealt / 2))} HP.`, 'good');
        break;
      }
      case 'heal':
        this.ctx.log(`${spell.name} restores ${heal(hero, effect.amount)} HP.`, 'good');
        break;
      case 'clearRows':
        this.ctx.board.removeBottomRows(effect.rows);
        this.ctx.log(`${spell.name} shakes loose ${effect.rows} rows.`, 'good');
        break;
    }
    this.spendAction();
  }

  /** Uses a consumable mid-fight. Counts as an action. Throws if it can't be used. */
  useItem(itemId: string): void {
    this.ctx.log(useItem(this.ctx.hero, itemId), 'good');
    this.spendAction();
  }

  /** Applies one cleared line's elemental effect. */
  private applySurge({ element, power }: LineSurge, linesTogether: number): void {
    const hero = this.ctx.hero;
    const scaled = (base: number): number =>
      Math.max(1, Math.round(base * elementMultiplier(this.enemy, element)));
    switch (element) {
      case 'fire':
        this.hitEnemy(scaled(power), 'Fire line burns and');
        break;
      case 'lightning':
        this.hitEnemy(scaled(power * linesTogether), `Lightning chains ×${linesTogether} and`);
        break;
      case 'water':
        if (this.countdown < this.enemy.actEvery + MAX_CHILL) {
          this.countdown++;
          this.ctx.log(`Water line chills ${this.enemy.name}: it acts a piece later.`, 'good');
        }
        break;
      case 'nature':
        this.ctx.log(`Nature line regrows ${heal(hero, power)} HP.`, 'good');
        break;
      case 'earth':
        this.ward = Math.min(MAX_WARD, this.ward + power);
        this.ctx.log(`Earth line raises a ward (${this.ward}).`, 'good');
        break;
      case 'arcane':
        this.ctx.log(
          `Arcane line surges: +${addManaToAll(hero, Math.ceil(power / 3))} mana.`,
          'good',
        );
        break;
      case 'wind':
        this.tailwind(Math.ceil(power / 2));
        break;
    }
  }

  private tailwind(pieces: number): void {
    this.ctx.slowPieces = Math.max(this.ctx.slowPieces, pieces);
    this.ctx.hastePieces = 0;
    this.ctx.log(`A tailwind slows your pieces (${this.ctx.slowPieces}).`, 'good');
  }

  private hitEnemy(damage: number, source: string): void {
    this.enemyHp -= damage;
    this.ctx.log(`${source} deals ${damage} damage.`, 'good');
    if (this.enemyHp <= 0) this.ctx.log(`${this.enemy.name} is defeated!`, 'good');
  }

  /** The board overflowed: the hero is hurt and the board shatters. */
  private overflow(): void {
    const damage = Math.ceil(this.ctx.hero.maxHp * OVERFLOW_PENALTY);
    this.hurtHero(damage, 'The crystals overwhelm you');
    this.ctx.board.reset();
  }

  private spendAction(): void {
    if (this.status() !== 'ongoing') return;
    this.countdown--;
    if (this.countdown <= 0) {
      this.countdown = this.enemy.actEvery;
      this.enemyAct(this.ctx.rng.pick(this.enemy.moves));
    }
  }

  private enemyAct(move: EnemyMove): void {
    const name = this.enemy.name;
    switch (move.kind) {
      case 'attack': {
        const damage = Math.max(1, move.power + this.enemy.atk - totalDefense(this.ctx.hero));
        const absorbed = Math.min(this.ward, damage);
        this.ward -= absorbed;
        if (absorbed > 0) this.ctx.log(`Your ward absorbs ${absorbed}.`, 'good');
        if (damage > absorbed) this.hurtHero(damage - absorbed, `${name} uses ${move.name}`);
        break;
      }
      case 'curse':
        this.ctx.board.addGarbage(move.rows);
        this.ctx.log(`${name} casts ${move.name}! Stone rises from below.`, 'bad');
        if (this.ctx.board.toppedOut) this.overflow();
        break;
      case 'haste':
        this.ctx.hastePieces = move.pieces;
        this.ctx.slowPieces = 0;
        this.ctx.log(`${name} casts ${move.name}! Your crystals fall faster.`, 'bad');
        break;
      case 'heal': {
        const restored = Math.min(move.amount, this.enemy.hp - this.enemyHp);
        this.enemyHp += restored;
        this.ctx.log(`${name} casts ${move.name} and recovers ${restored} HP.`, 'bad');
        break;
      }
      case 'drain': {
        const { element, drained } = drainMana(this.ctx.hero, move.mana);
        this.ctx.log(
          `${name} casts ${move.name} and drains ${drained} ${ELEMENT_NAMES[element].toLowerCase()} mana.`,
          'bad',
        );
        break;
      }
    }
  }

  private hurtHero(damage: number, source: string): void {
    const hero = this.ctx.hero;
    this.ctx.log(`${source}: ${takeDamage(hero, damage)} damage.`, 'bad');
    if (hero.hp === 0 && itemCount(hero, 'phoenixFeather') > 0) {
      removeItem(hero, 'phoenixFeather');
      hero.hp = Math.ceil(hero.maxHp / 2);
      this.ctx.log(`${ITEMS.phoenixFeather?.name} bursts into flame. You rise again!`, 'good');
    }
  }
}

/** "Weak to fire. Resists water." for the battle log. */
export function describeAffinities(enemy: EnemyDef): string {
  const list = (elements: readonly Element[]): string =>
    elements.map((e) => ELEMENT_NAMES[e].toLowerCase()).join(' and ');
  return [
    enemy.weak.length ? `Weak to ${list(enemy.weak)}.` : '',
    enemy.resist.length ? `Resists ${list(enemy.resist)}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}
