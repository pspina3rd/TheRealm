/** Small, solvable exercises that introduce one board interaction at a time. */
import type { Battle } from '../battle/battle';
import type { BoardElement } from '../core/boardMagic';
export interface MagicPractice {
  id: string;
  title: string;
  instruction: string;
  spell: string;
  rows: readonly string[];
  strengths?: readonly number[];
  targets?: readonly (readonly [number, number])[];
  goal: 'obstructions' | 'convert' | 'land' | 'line' | 'red' | 'shift' | 'incoming';
}
export const PRACTICES: readonly MagicPractice[] = [
  {
    id: 'lightning',
    title: 'Break the grey blocks',
    instruction:
      'Lightning hits grey obstructions. Tap a grey block’s row, then Cast. Dots show how many hits it needs.',
    spell: 'thunder',
    rows: ['..........', '..#.......', '.....#....', '.......#..'],
    strengths: [1, 2, 3],
    goal: 'obstructions',
  },
  {
    id: 'nature',
    title: 'Turn obstacles into usable blocks',
    instruction:
      'Nature turns grey obstructions into blank blocks. Tap a grey block’s row, then Cast.',
    spell: 'natureConvert',
    rows: ['..........', '..#.......', '.....#....', '.......#..'],
    strengths: [1, 1, 1],
    goal: 'convert',
  },
  {
    id: 'gravity',
    title: 'Drop the floating blocks',
    instruction:
      'Gravity drops unsupported blocks. Tap each floating block’s row to drop it onto a marked space.',
    spell: 'quake',
    rows: ['..r.......', '......g...', '..........', '..........', '..........', '..........'],
    targets: [
      [2, 19],
      [6, 19],
    ],
    goal: 'land',
  },
  {
    id: 'ice',
    title: 'Finish the bottom row',
    instruction:
      'Ice fills the empty spaces with blank blocks. Tap the bottom row, then Cast to clear it.',
    spell: 'blizzard',
    rows: ['rr.bgg.cc.'],
    goal: 'line',
  },
  {
    id: 'fire',
    title: 'Burn the red blocks',
    instruction: 'Fire burns normal blocks in a row. Tap a row containing red blocks, then Cast.',
    spell: 'fire',
    rows: ['..rr......', '..........', '......rr..', '..........'],
    goal: 'red',
  },
  {
    id: 'wind',
    title: 'Push the block into place',
    instruction:
      'Wind pushes blocks one space where there is room. Choose Right and tap the cyan block’s row.',
    spell: 'gale',
    rows: ['....c.....', '..........'],
    targets: [[5, 18]],
    goal: 'shift',
  },
  {
    id: 'arcane',
    title: 'Change what Slime sends',
    instruction:
      'Arcane + Nature makes the next enemy obstruction arrive as a blank block. Cast it, then let Slime place its block.',
    spell: 'arcane:nature',
    rows: ['..........', '..#.......', '..........', '.......#..'],
    strengths: [2, 3],
    targets: [[4, 18]],
    goal: 'incoming',
  },
];
export const PRACTICE_SPELLS: readonly {
  id: string;
  name: string;
  element: BoardElement;
  description: string;
}[] = [
  { id: 'thunder', name: 'Lightning', element: 'lightning', description: 'Hit grey obstructions.' },
  {
    id: 'natureConvert',
    name: 'Nature',
    element: 'nature',
    description: 'Turn obstructions into blank blocks.',
  },
  { id: 'quake', name: 'Gravity', element: 'earth', description: 'Drop unsupported blocks.' },
  { id: 'blizzard', name: 'Ice', element: 'water', description: 'Fill gaps to complete rows.' },
  { id: 'fire', name: 'Fire', element: 'fire', description: 'Burn normal blocks in a row.' },
  {
    id: 'gale',
    name: 'Wind',
    element: 'wind',
    description: 'Push blocks one space left or right.',
  },
];
export function setupPractice(battle: Battle, practice: MagicPractice): void {
  battle.board.loadRows(practice.rows);
  let index = 0;
  for (let y = 0; y < battle.board.height; y++)
    for (let x = 0; x < battle.board.width; x++)
      if (battle.board.grid[y]?.[x] === 'stone') {
        battle.board.obstructions[`${x},${y}`] = {
          id: `practice:${index}`,
          owner: 'slime',
          strength: practice.strengths?.[index] ?? 1,
          anchored: true,
          sequence: [],
          step: 0,
          contacts: [],
        };
        index++;
      }
}
export function practiceProgress(
  battle: Battle,
  practice: MagicPractice,
): { remaining: number; done: boolean; label: string } {
  const obstructions = Object.keys(battle.board.obstructions).length;
  let remaining: number;
  switch (practice.goal) {
    case 'obstructions':
      remaining = obstructions;
      break;
    case 'convert':
      remaining = Math.max(obstructions, 3 - battle.board.count('neutral'));
      break;
    case 'land':
    case 'shift':
      remaining = (practice.targets ?? []).filter(
        ([x, y]) => battle.board.grid[y]?.[x] === null,
      ).length;
      break;
    case 'line':
      remaining = battle.lines > 0 ? 0 : 1;
      break;
    case 'red':
      remaining = battle.board.count('red');
      break;
    case 'incoming':
      remaining =
        (battle.interference.placements.slime ?? 0) > 0 && battle.board.grid[18]?.[4] === 'neutral'
          ? 0
          : 1;
      break;
  }
  return {
    remaining,
    done: remaining === 0,
    label:
      remaining === 0
        ? 'Complete!'
        : practice.goal === 'line'
          ? '1 row to clear'
          : practice.goal === 'incoming'
            ? 'Make Slime send a blank block'
            : `${remaining} ${practice.goal === 'obstructions' || practice.goal === 'convert' ? 'obstruction' : practice.goal === 'red' ? 'red block' : 'marked space'}${remaining === 1 ? '' : 's'} left`,
  };
}
