import type { Board, ActivePiece } from '../core/board';
import type { ColorTouch } from '../core/boardMagic';
import { isCrystal, type Cell } from '../core/pieces';
import type { Rng } from '../core/rng';
import type { EnemyDef, EnemyMove } from '../data/types';
import { ENEMY_OBSTRUCTION_PROFILES, type EnemyObstructionProfile } from './magicEncounters';

export type IntentBoard = Pick<
  Board,
  | 'width'
  | 'height'
  | 'grid'
  | 'tags'
  | 'active'
  | 'seal'
  | 'magicEnabled'
  | 'toppedOut'
  | 'clearsEnabled'
>;
type ObstructMove = Extract<EnemyMove, { kind: 'obstruct' }>;

export interface EnemyMovePlanOptions {
  /** False for mentor lessons, authored NPC boards, demos, and practice. */
  readonly hostile?: boolean;
  readonly previousMove?: EnemyMove;
  /** Pending frozen packets reserve selection targets but do not occupy the physical board. */
  readonly reservedCells?: readonly (readonly [number, number])[];
  /** Legacy filtering is opt-in; authored bosses keep their existing policy. */
  readonly filterLegacy?: boolean;
  readonly enemyHp?: number;
  readonly heroMana?: number;
  readonly fogPieces?: number;
  readonly hastePieces?: number;
  readonly quickenMs?: number;
}

export interface PlannedEnemyMove {
  readonly move: EnemyMove;
  readonly intent: 'clogLanding' | 'blockWell' | 'attack' | 'authored';
  readonly label: string;
  readonly reason: string;
  readonly fallback: boolean;
}

const objectiveTags = new Set(['target', 'protected', 'ridge']);
const adjacent = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

function protectedBoard(board: IntentBoard): boolean {
  return board.tags.some((row) => row.some((tag) => tag !== null && objectiveTags.has(tag)));
}

function activeCells(piece: ActivePiece | null): readonly (readonly [number, number])[] {
  return piece?.cells.map(([dx, dy]) => [piece.x + dx, piece.y + dy] as const) ?? [];
}

/** Current orientation/column, starting at its actual position, not a new spawn. */
function landingCells(
  board: IntentBoard,
  grid: readonly (readonly Cell[])[],
): readonly (readonly [number, number])[] {
  const piece = board.active;
  if (!piece) return [];
  let y = piece.y;
  const fits = (at: number): boolean =>
    piece.cells.every(([dx, dy]) => {
      const x = piece.x + dx,
        row = at + dy;
      return (
        x >= 0 &&
        x < board.width &&
        row < board.height &&
        x !== board.seal?.column &&
        (row < 0 || grid[row]?.[x] === null)
      );
    });
  while (fits(y + 1)) y++;
  return piece.cells.map(([dx, dy]) => [piece.x + dx, y + dy] as const);
}

function completedBy(
  grid: readonly (readonly Cell[])[],
  cells: readonly (readonly [number, number])[],
): Set<number> {
  const at = new Set(cells.map(([x, y]) => `${x},${y}`));
  return new Set(
    grid.flatMap((row, y) =>
      row.every((cell, x) => cell !== null || at.has(`${x},${y}`)) ? [y] : [],
    ),
  );
}

/** Validate the exact packet; an occupied/countered packet fizzles, never retargets. */
export function frozenObstructionStillLegal(move: EnemyMove, board: IntentBoard): boolean {
  if (move.kind !== 'obstruct') return true;
  if (
    !board.magicEnabled ||
    !board.clearsEnabled ||
    board.toppedOut ||
    move.cells.length === 0 ||
    protectedBoard(board)
  )
    return false;
  const live = new Set(activeCells(board.active).map(([x, y]) => `${x},${y}`));
  const grid = board.grid.map((row) => row.slice());
  const seen = new Set<string>();
  for (const cell of move.cells) {
    const { x, y, strength } = cell;
    const key = `${x},${y}`;
    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      !Number.isInteger(strength) ||
      strength < 1 ||
      strength > 3 ||
      x < 0 ||
      x >= board.width ||
      y < 4 ||
      y >= board.height ||
      x === board.seal?.column ||
      grid[y]?.[x] !== null ||
      board.tags[y]?.[x] !== null ||
      live.has(key) ||
      seen.has(key)
    )
      return false;
    const row = grid[y];
    if (!row) return false;
    row[x] = 'stone';
    seen.add(key);
  }
  // Neither an immediate full row nor a newly gifted clear at the current landing.
  if (grid.some((row) => row.every((cell) => cell !== null))) return false;
  const before = completedBy(board.grid, landingCells(board, board.grid));
  const afterCells = landingCells(board, grid);
  if (afterCells.some(([, y]) => y < 0)) return false;
  return [...completedBy(grid, afterCells)].every((row) => before.has(row));
}

function top(board: IntentBoard, x: number): number {
  const found = board.grid.findIndex((row) => row[x] !== null);
  return found < 0 ? board.height : found;
}

function contactIsAlreadySatisfied(
  board: IntentBoard,
  x: number,
  y: number,
  sequence: readonly ColorTouch[],
): boolean {
  const first = sequence[0];
  if (!first) return false;
  return adjacent.some(
    ([dx, dy], index) =>
      first.sides.includes((['top', 'right', 'bottom', 'left'] as const)[index] ?? 'top') &&
      board.grid[y + dy]?.[x + dx] === first.color,
  );
}

function frozenMove(move: EnemyMove): EnemyMove {
  if (move.kind !== 'obstruct') return Object.freeze({ ...move });
  const cells = move.cells.map((cell) =>
    Object.freeze({
      ...cell,
      ...(cell.sequence
        ? {
            sequence: Object.freeze(
              cell.sequence.map((step) =>
                Object.freeze({
                  color: step.color,
                  sides: Object.freeze([...step.sides]),
                }),
              ),
            ),
          }
        : {}),
    }),
  );
  return Object.freeze({ ...move, cells: Object.freeze(cells) });
}

interface Candidate {
  readonly x: number;
  readonly y: number;
  readonly score: number;
}

function candidates(
  profile: EnemyObstructionProfile,
  board: IntentBoard,
  reservedCells: readonly (readonly [number, number])[] = [],
): Candidate[] {
  const ghost = landingCells(board, board.grid);
  const out: Candidate[] = [];
  const reserved = new Set(reservedCells.map(([x, y]) => `${x},${y}`));
  for (let x = 0; x < board.width; x++) {
    let y: number, score: number;
    const floor = top(board, x);
    if (profile.intent === 'clogLanding') {
      y = floor - 1;
      const distance = ghost.length
        ? Math.min(...ghost.map(([gx, gy]) => Math.abs(gx - x) + Math.abs(gy - y)))
        : Infinity;
      if (distance > 2) continue;
      score = 100 - distance * 10;
    } else {
      const sides = [
        x > 0 ? top(board, x - 1) : null,
        x + 1 < board.width ? top(board, x + 1) : null,
      ].filter((value): value is number => value !== null);
      const lip = Math.min(...sides);
      const depth = floor - lip;
      const clearingRows = board.grid.filter(
        (row, rowIndex) =>
          rowIndex >= lip &&
          row[x] === null &&
          row.filter((cell) => cell !== null).length >= board.width - 3,
      ).length;
      if (depth < 2 || clearingRows === 0) continue;
      y = lip - 1;
      score = depth * 10 + clearingRows * 30;
    }
    if (reserved.has(`${x},${y}`)) continue;
    const move: ObstructMove = {
      kind: 'obstruct',
      name: profile.name,
      cells: [{ x, y, strength: profile.strength, sequence: profile.sequence }],
    };
    if (
      contactIsAlreadySatisfied(board, x, y, profile.sequence) ||
      !frozenObstructionStillLegal(move, board)
    )
      continue;
    out.push({ x, y, score });
  }
  return out;
}

/** Optional no-op filtering for authored moves, without changing their payloads. */
export function legacyMoveUseful(
  move: EnemyMove,
  board: IntentBoard,
  options: EnemyMovePlanOptions = {},
  enemy?: EnemyDef,
): boolean {
  switch (move.kind) {
    case 'heal':
      return options.enemyHp === undefined || enemy === undefined || options.enemyHp < enemy.hp;
    case 'drain':
      return options.heroMana === undefined || options.heroMana > 0;
    case 'fog':
      return options.fogPieces === undefined || options.fogPieces < move.pieces;
    case 'haste':
      return options.hastePieces === undefined || options.hastePieces < move.pieces;
    case 'quicken':
      return options.quickenMs === undefined || options.quickenMs < move.ms;
    case 'petrify':
      return board.grid.some((row) => row.some(isCrystal));
    case 'seal':
      return board.width > 4 && (board.seal?.pieces ?? 0) < move.pieces;
    case 'curse':
      return move.rows > 0;
    case 'obstruct':
      return frozenObstructionStillLegal(move, board);
    case 'attack':
      return true;
  }
}

function attack(enemy: EnemyDef, rng: Rng, reason: string): PlannedEnemyMove {
  const attacks = enemy.moves.filter((move) => move.kind === 'attack');
  const move: EnemyMove = attacks.length
    ? rng.pick(attacks)
    : { kind: 'attack', name: 'Attack', power: 0 };
  return Object.freeze({
    move: frozenMove(move),
    intent: 'attack',
    label: move.name,
    reason,
    fallback: true,
  });
}

/** Plan at selection time; cells/material stay frozen through telegraph and Ice delay. */
export function planEnemyMove(
  enemy: EnemyDef,
  board: IntentBoard,
  rng: Rng,
  options: EnemyMovePlanOptions = {},
): PlannedEnemyMove {
  const profile =
    options.hostile !== false &&
    board.magicEnabled &&
    board.clearsEnabled &&
    board.width >= 4 &&
    board.height >= 6 &&
    !enemy.boss
      ? ENEMY_OBSTRUCTION_PROFILES[enemy.id]
      : undefined;
  if (profile) {
    if (options.previousMove?.kind === 'obstruct')
      return attack(enemy, rng, 'Attack between obstruction attempts.');
    const targets = candidates(profile, board, options.reservedCells);
    const score = Math.max(...targets.map((target) => target.score));
    const best = targets.filter((target) => target.score === score);
    if (best.length) {
      const target = rng.pick(best);
      const move: ObstructMove = {
        kind: 'obstruct',
        name: profile.name,
        cells: [
          { x: target.x, y: target.y, strength: profile.strength, sequence: profile.sequence },
        ],
      };
      return Object.freeze({
        move: frozenMove(move),
        intent: profile.intent,
        label: profile.label,
        reason:
          profile.intent === 'clogLanding'
            ? 'Goo will clog the current piece’s supported landing area.'
            : 'Rubble will cap the mouth of an open clearing well.',
        fallback: false,
      });
    }
    return attack(
      enemy,
      rng,
      profile.intent === 'clogLanding'
        ? 'No safe, useful landing area to clog.'
        : 'No safe, open clearing well to block.',
    );
  }
  const authored = enemy.moves.filter(
    (move) =>
      move.kind !== 'obstruct' ||
      (options.hostile !== false &&
        board.magicEnabled &&
        board.clearsEnabled &&
        move.cells.length > 0),
  );
  const moves =
    options.filterLegacy && !enemy.boss
      ? authored.filter((move) => legacyMoveUseful(move, board, options, enemy))
      : authored;
  if (moves.length === 0) return attack(enemy, rng, 'No authored utility has an effect now.');
  const move = frozenMove(rng.pick(moves));
  return Object.freeze({
    move,
    intent: 'authored',
    label: move.name,
    reason: 'Use the creature’s authored move without adding an obstruction profile.',
    fallback: false,
  });
}
