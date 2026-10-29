/**
 * Monsters grow with the hero inside a band, so early areas stay a
 * challenge without becoming a wall: a monster fights at the hero's level,
 * but never below its own and never more than `LEVEL_BAND` above it
 * (`BOSS_BAND` for bosses). Each level above its own adds HP, attack and
 * speed. Once the hero outgrows the band, the monster's XP falls off
 * (bosses' never does).
 */
import type { EnemyDef } from '../data/types';
import {
  LEVEL_BAND,
  BOSS_BAND,
  HP_PER_LEVEL,
  ATK_PER_LEVEL,
  SPEED_PER_LEVEL,
  XP_FALLOFF,
  MIN_XP_SHARE,
} from '../data/balance';
export {
  LEVEL_BAND,
  BOSS_BAND,
  HP_PER_LEVEL,
  ATK_PER_LEVEL,
  SPEED_PER_LEVEL,
  XP_FALLOFF,
  MIN_XP_SHARE,
} from '../data/balance';

/** The level `enemy` fights at against a hero of `heroLevel`. */
export function effectiveLevel(enemy: EnemyDef, heroLevel: number): number {
  const band = enemy.band ?? (enemy.boss ? BOSS_BAND : LEVEL_BAND);
  return Math.min(enemy.level + band, Math.max(enemy.level, heroLevel));
}

/** Share of a monster's XP a hero of `heroLevel` earns from it at `level`. */
export function xpShare(heroLevel: number, level: number, boss = false): number {
  if (boss) return 1;
  return Math.max(MIN_XP_SHARE, 1 - XP_FALLOFF * Math.max(0, heroLevel - level));
}

/**
 * `enemy` as it fights a hero of `heroLevel`: grown to its effective
 * level (HP, attack, gauge speed and XP up), and its XP cut once the hero
 * stands above that level.
 */
export function scaledEnemy(enemy: EnemyDef, heroLevel: number): EnemyDef {
  const level = effectiveLevel(enemy, heroLevel);
  const grown = level - enemy.level;
  const boss = enemy.boss === true;
  const xp = Math.round(enemy.xp * (1 + HP_PER_LEVEL * grown) * xpShare(heroLevel, level, boss));
  const speed = 1 + SPEED_PER_LEVEL * grown;
  return {
    ...enemy,
    level,
    hp: Math.round(enemy.hp * (1 + HP_PER_LEVEL * grown)),
    atk: enemy.atk + ATK_PER_LEVEL * grown,
    actMs: Math.round(enemy.actMs / speed),
    ...(enemy.enrage
      ? { enrage: { ...enemy.enrage, actMs: Math.round(enemy.enrage.actMs / speed) } }
      : {}),
    xp,
  };
}
