import type { ColorTouch } from '../core/boardMagic';
import type { EnemyDef, EnemyMove } from '../data/types';

export interface EnemyObstructionProfile {
  readonly enemyId: 'slime' | 'goblin';
  readonly intent: 'clogLanding' | 'blockWell';
  readonly name: string;
  readonly label: string;
  readonly strength: 1 | 2 | 3;
  readonly sequence: readonly ColorTouch[];
  readonly maxCells: number;
}

/** Material and counterplay are fixed by creature, never cycled by turn or coordinates. */
export const ENEMY_OBSTRUCTION_PROFILES: Readonly<Record<string, EnemyObstructionProfile>> = {
  slime: {
    enemyId: 'slime',
    intent: 'clogLanding',
    name: 'Sticky Goo',
    label: 'Clog landing',
    strength: 1,
    sequence: [],
    maxCells: 1,
  },
  goblin: {
    enemyId: 'goblin',
    intent: 'blockWell',
    name: 'Stacked Rubble',
    label: 'Block clearing well',
    strength: 2,
    sequence: [{ color: 'orange', sides: ['top', 'right', 'bottom', 'left'] }],
    maxCells: 1,
  },
};

/**
 * Signature-compatible profile adaptation. Empty cells denote a template,
 * never an executable packet: planEnemyMove supplies the frozen footprint
 * from the actual board. Lessons/practice must bypass this conversion.
 */
export function boardMagicEnemy(enemy: EnemyDef, width: number, height: number): EnemyDef {
  const profile = ENEMY_OBSTRUCTION_PROFILES[enemy.id];
  if (enemy.boss || !profile || width < 4 || height < 6) return enemy;
  const marker: EnemyMove = { kind: 'obstruct', name: profile.name, cells: [] };
  const first = enemy.moves.findIndex((move) => move.kind !== 'attack');
  return {
    ...enemy,
    moves: enemy.moves.map((move, i) => (i === (first < 0 ? 0 : first) ? marker : move)),
  };
}
