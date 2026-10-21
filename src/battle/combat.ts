import type { LockResult } from '../core/board';
import type { Rng } from '../core/rng';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { SPELLS } from '../data/spells';
import type { EnemyDef, EnemyMove } from '../data/types';
import {
  heal,
  removeItem,
  restoreMp,
  takeDamage,
  totalAttack,
  totalDefense,
  useItem,
  itemCount,
} from '../game/hero';
import type { BattleContext, BattleStatus, Challenge, Objective } from './types';

/** Base damage for clearing 0–4 lines at once. */
export const LINE_DAMAGE: readonly number[] = [0, 8, 20, 35, 55];
/** Extra damage per cleared crystal matching the enemy's weakness. */
export const WEAKNESS_BONUS = 2;
/** Fraction of max HP lost when the board overflows. */
export const OVERFLOW_PENALTY = 0.25;

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
 * A fight. Clearing lines strikes the enemy; every `actEvery` actions the
 * enemy uses one of its moves, which may be physical or magical (cursing the
 * board with stone, speeding up gravity, healing or draining MP).
 */
export class CombatChallenge implements Challenge {
  readonly enemy: EnemyDef;
  enemyHp: number;
  /** Actions remaining before the enemy acts. */
  countdown: number;

  private readonly ctx: BattleContext;

  constructor(ctx: BattleContext, enemyId: string) {
    const enemy = ENEMIES[enemyId];
    if (!enemy) throw new Error(`Unknown enemy: ${enemyId}`);
    this.ctx = ctx;
    this.enemy = enemy;
    this.enemyHp = enemy.hp;
    this.countdown = enemy.actEvery;
    ctx.log(`${enemy.name} appears! ${enemy.description}`);
  }

  onLock(result: LockResult): void {
    if (result.linesCleared > 0) {
      const lines = Math.min(result.linesCleared, LINE_DAMAGE.length - 1);
      const weakCells = this.enemy.weakness ? (result.clearedCells[this.enemy.weakness] ?? 0) : 0;
      const damage =
        (LINE_DAMAGE[lines] ?? 0) + totalAttack(this.ctx.hero) + weakCells * WEAKNESS_BONUS;
      this.hitEnemy(damage, `Your ${lines}-line strike`);
      restoreMp(this.ctx.hero, result.linesCleared);
      if (weakCells > 0)
        this.ctx.log(`${weakCells} ${this.enemy.weakness} crystals hit its weakness!`, 'good');
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
    return {
      label: `${this.enemy.name} · Lv ${this.enemy.level}`,
      detail: `HP ${Math.max(0, this.enemyHp)} / ${this.enemy.hp} · acts in ${this.countdown}`,
      progress: 1 - Math.max(0, this.enemyHp) / this.enemy.hp,
    };
  }

  /** Why a spell can't be cast right now, or null if it can. */
  cannotCastReason(spellId: string): string | null {
    const spell = SPELLS[spellId];
    if (!spell || !this.ctx.hero.spells.includes(spellId)) return "You don't know that spell.";
    if (this.ctx.hero.mp < spell.mpCost) return 'Not enough MP!';
    if (spell.effect.kind === 'heal' && this.ctx.hero.hp >= this.ctx.hero.maxHp) {
      return 'HP is already full.';
    }
    return null;
  }

  /** Casts a known spell. Counts as an action. Throws if it can't be cast. */
  castSpell(spellId: string): void {
    const reason = this.cannotCastReason(spellId);
    if (reason) throw new Error(reason);
    const spell = SPELLS[spellId];
    if (!spell) return;
    const hero = this.ctx.hero;
    hero.mp -= spell.mpCost;
    const effect = spell.effect;
    switch (effect.kind) {
      case 'damage':
        this.hitEnemy(effect.power + hero.level * 2, spell.name);
        break;
      case 'freeze':
        this.hitEnemy(effect.power + hero.level * 2, spell.name);
        this.countdown += effect.pieces;
        this.ctx.log(`${this.enemy.name} is frozen!`, 'good');
        break;
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
        this.hurtHero(damage, `${name} uses ${move.name}`);
        break;
      }
      case 'curse':
        this.ctx.board.addGarbage(move.rows);
        this.ctx.log(`${name} casts ${move.name}! Stone rises from below.`, 'bad');
        if (this.ctx.board.toppedOut) this.overflow();
        break;
      case 'haste':
        this.ctx.hastePieces = move.pieces;
        this.ctx.log(`${name} casts ${move.name}! Your crystals fall faster.`, 'bad');
        break;
      case 'heal': {
        const restored = Math.min(move.amount, this.enemy.hp - this.enemyHp);
        this.enemyHp += restored;
        this.ctx.log(`${name} casts ${move.name} and recovers ${restored} HP.`, 'bad');
        break;
      }
      case 'drain': {
        const drained = Math.min(move.mp, this.ctx.hero.mp);
        this.ctx.hero.mp -= drained;
        this.ctx.log(`${name} casts ${move.name} and drains ${drained} MP.`, 'bad');
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
