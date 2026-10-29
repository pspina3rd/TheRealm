import type { EnemyDef, EnemyMove } from '../data/types';
/** Selected opt-in encounters, held behind boardMagicEnabled until workshop review. */
export function boardMagicEnemy(enemy: EnemyDef, width: number, height: number): EnemyDef {
  if (enemy.boss || !['slime', 'goblin'].includes(enemy.id)) return enemy;
  const obstruction: EnemyMove = {
    kind: 'obstruct',
    name: enemy.id === 'slime' ? 'Sticky obstruction' : 'Stacked rubble',
    cells: [
      { x: Math.min(width - 1, 2), y: height - 4, strength: enemy.id === 'slime' ? 1 : 2 },
      {
        x: Math.min(width - 1, 6),
        y: height - 3,
        strength: enemy.id === 'slime' ? 2 : 3,
        sequence: [
          {
            color: enemy.id === 'slime' ? 'green' : 'orange',
            sides: ['top', 'right', 'bottom', 'left'],
          },
        ],
      },
    ],
  };
  // Replace one interference action, or one attack if that character has none.
  const index = enemy.moves.findIndex((move) => move.kind !== 'attack');
  return {
    ...enemy,
    moves: enemy.moves.map((move, i) => (i === (index < 0 ? 0 : index) ? obstruction : move)),
  };
}
