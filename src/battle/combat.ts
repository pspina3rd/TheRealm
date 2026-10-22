import type { LockResult } from '../core/board';
import { elementsOf, type Element } from '../core/elements';
import type { Rng } from '../core/rng';
import { ENEMIES } from '../data/enemies';
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
 * the enemy uses one of its moves, physical or magical. Everything that
 * happens is emitted as a `BattleEvent` for the screen to show.
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
  }

  onLock(result: LockResult): void {
    if (result.linesCleared > 0) {
      const lines = Math.min(result.linesCleared, LINE_DAMAGE.length - 1);
      const affinity = crystalAffinity(this.enemy, elementsOf(result.clearedCells));
      const damage = Math.max(1, (LINE_DAMAGE[lines] ?? 0) + totalAttack(this.ctx.hero) + affinity);
      this.hitEnemy(damage, null, affinity > 0 ? 'weak' : affinity < 0 ? 'resist' : null);
      result.lines.forEach((line, i) => {
        const surge = lineSurge(line, this.ctx.hero.attunement);
        if (surge && this.status() === 'ongoing') {
          this.applySurge(surge, result.linesCleared, result.rows[i] ?? 0);
        }
      });
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
      label: this.enemy.name,
      progress: 1 - Math.max(0, this.enemyHp) / this.enemy.hp,
      piecesLeft: null,
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
    this.ctx.emit({ kind: 'spell', spellId });
    const effect = spell.effect;
    const strike = (base: number): number => {
      const multiplier = elementMultiplier(this.enemy, spell.element);
      const dealt = Math.round((base + hero.level * 2) * multiplier);
      this.hitEnemy(dealt, spell.element, affinityOf(multiplier));
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
        this.healHero(Math.floor(strike(effect.power) / 2));
        break;
      case 'heal':
        this.healHero(effect.amount);
        break;
      case 'clearRows':
        this.ctx.board.removeBottomRows(effect.rows);
        break;
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
    const multiplier = elementMultiplier(this.enemy, element);
    const strike = (base: number): void =>
      this.hitEnemy(Math.max(1, Math.round(base * multiplier)), element, affinityOf(multiplier));
    switch (element) {
      case 'fire':
        strike(power);
        break;
      case 'lightning':
        strike(power * linesTogether);
        break;
      case 'water':
        if (this.countdown < this.enemy.actEvery + MAX_CHILL) {
          this.countdown++;
          this.ctx.emit({ kind: 'chill' });
        }
        break;
      case 'nature':
        this.healHero(power);
        break;
      case 'earth':
        this.ward = Math.min(MAX_WARD, this.ward + power);
        this.ctx.emit({ kind: 'ward', total: this.ward });
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
    if (this.enemyHp <= 0) this.ctx.emit({ kind: 'enemyDefeated' });
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
      this.countdown = this.enemy.actEvery;
      this.enemyAct(this.ctx.rng.pick(this.enemy.moves));
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
      case 'curse':
        this.ctx.board.addGarbage(move.rows);
        this.ctx.emit({ kind: 'curse', rows: move.rows });
        if (this.ctx.board.toppedOut) this.overflow();
        break;
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
