/** Safe demonstrations of the taught spell, never generic hostile rubble. */
import { spawnColumn, type Board } from '../core/board';
import { spanFor, type BoardElement } from '../core/boardMagic';
import { standardName } from '../game/spellNames';
import { BOARD_SPELLS, type MagicTarget } from './magicCasting';

type Point = readonly [number, number];
type School = BoardElement | 'arcane';

export interface LessonPracticeIntent {
  readonly school: string;
  readonly rank: number;
  readonly goal: string;
  readonly rows: readonly number[];
  readonly cells: readonly Point[];
  readonly landingCells: readonly Point[];
  readonly target: MagicTarget | null;
}

export interface LessonPracticeRequest {
  readonly spellId: string;
  readonly rank: number;
  /** Distinct practice ownership makes these blocks' purpose inspectable. */
  readonly owner: string;
}

const GOALS: Readonly<Record<School, string>> = {
  fire: 'Remove loose practice blocks in the selected rows.',
  water: 'Fill the gaps with neutral Ice and complete the selected rows.',
  earth: 'Drop unsupported blocks into the open space below them.',
  wind: 'Shift loose blocks sideways into adjacent gaps.',
  lightning: 'Break practice obstructions; stronger ranks hit twice.',
  nature: 'Turn practice obstructions into neutral blocks.',
  arcane: 'Face the opponent and cast Arcane; no board obstruction is needed.',
};

function schoolOf(spellId: string): School | null {
  return spellId === 'shadow' ? 'arcane' : (BOARD_SPELLS[spellId] ?? null);
}

function rankOf(rank: number): number {
  return Number.isFinite(rank) ? Math.max(1, Math.min(4, Math.floor(rank))) : 1;
}

const key = (x: number, y: number): string => `${x},${y}`;

function reservedCells(board: Board): Set<string> {
  const reserved = new Set<string>();
  const active = board.active;
  if (active) {
    const ghost = board.ghostY();
    for (const [dx, dy] of active.cells) {
      // Preserve the displayed landing as well as its endpoint: a new sample
      // above the ghost must not unexpectedly intercept the current drop.
      for (let y = active.y + dy; y <= ghost + dy; y++) reserved.add(key(active.x + dx, y));
    }
  } else {
    // Lessons are constructed before the first piece spawns. Keep its whole
    // normal spawn corridor clear rather than guessing the next shape/ghost.
    const column = spawnColumn(board.width);
    for (let x = column; x < Math.min(board.width, column + 4); x++)
      for (let y = 0; y < board.height; y++) reserved.add(key(x, y));
  }
  return reserved;
}

function span(board: Board, school: BoardElement, rank: number, bottomRow: number): number[] {
  const [top, bottom] = spanFor({ element: school, rank, bottomRow }, board.height);
  return Array.from({ length: bottom - top + 1 }, (_, i) => top + i);
}

function cellsInRows(
  board: Board,
  rows: readonly number[],
  school: BoardElement,
  direction: -1 | 1,
): Point[] {
  const cells: Point[] = [];
  for (const y of rows) {
    const row = board.grid[y];
    if (!row) continue;
    for (let x = 0; x < board.width; x++) {
      const cell = row[x];
      const obstruction = board.obstructions[key(x, y)];
      if (school === 'water') {
        if (cell === null && row.some((c) => c !== null)) cells.push([x, y]);
      } else if (school === 'lightning' || school === 'nature') {
        if (cell !== null && obstruction && obstruction.strength > 0) cells.push([x, y]);
      } else if (cell !== null && !obstruction?.anchored) {
        if (school === 'fire' && !obstruction) cells.push([x, y]);
        else if (school === 'earth' && y + 1 < board.height && board.grid[y + 1]?.[x] === null)
          cells.push([x, y]);
        else if (
          school === 'wind' &&
          x + direction >= 0 &&
          x + direction < board.width &&
          row[x + direction] === null
        )
          cells.push([x, y]);
      }
    }
  }
  return cells;
}

function intent(
  board: Board,
  request: LessonPracticeRequest,
  school: School,
  target: MagicTarget | null,
  cells: readonly Point[],
): LessonPracticeIntent {
  const rank = rankOf(request.rank);
  const rows = school === 'arcane' || !target ? [] : span(board, school, rank, target.bottomRow);
  const landingCells: Point[] = [];
  if (school === 'earth') {
    for (const [x, y] of cells) {
      let landing = y;
      while (landing + 1 < board.height && board.grid[landing + 1]?.[x] === null) landing++;
      if (landing !== y) landingCells.push([x, landing]);
    }
  }
  return {
    school: standardName(request.spellId) ?? request.spellId,
    rank,
    goal:
      target || school === 'arcane'
        ? GOALS[school]
        : `${GOALS[school]} Clear space for a safe practice target.`,
    rows,
    cells,
    landingCells,
    target,
  };
}

/** Read-only current intent; UI reads never add, restore or move a target. */
export function lessonPracticeIntent(
  board: Board,
  request: LessonPracticeRequest,
): LessonPracticeIntent | null {
  const school = schoolOf(request.spellId);
  if (!board.magicEnabled || !school) return null;
  if (school === 'arcane') return intent(board, request, school, null, []);
  const rank = rankOf(request.rank);
  let best: LessonPracticeIntent | null = null;
  for (let bottomRow = board.height - 1; bottomRow >= 4; bottomRow--) {
    for (const direction of [1, -1] as const) {
      const rows = span(board, school, rank, bottomRow);
      const cells = cellsInRows(board, rows, school, direction);
      if (cells.length > (best?.cells.length ?? 0)) {
        best = intent(board, request, school, { bottomRow, direction }, cells);
      }
    }
  }
  return best ?? intent(board, request, school, null, []);
}

/**
 * Seed only if the live board has no useful demonstration. Every addition is
 * neutral or an explicit practice obstruction, in empty, untagged lower
 * cells, outside the active piece and current ghost. Never clear a row here.
 * Call at creation and the shield checkpoint; if no target fits, retry only
 * between physical locks while that shield remains up. Existing useful work
 * suppresses every addition, so targets never accumulate while usable.
 */
export function prepareLessonPractice(
  board: Board,
  request: LessonPracticeRequest,
): LessonPracticeIntent | null {
  const existing = lessonPracticeIntent(board, request);
  const school = schoolOf(request.spellId);
  if (!existing || !school || school === 'arcane' || existing.target) return existing;
  const rank = rankOf(request.rank);
  const reserved = reservedCells(board);
  const low = Math.max(4, board.height - 8);
  const desiredBottom = board.height - 4;
  const rows = span(board, school, rank, desiredBottom).filter(
    (y) => y >= low && y <= desiredBottom,
  );
  // Avalanche spans the whole board but needs only a bounded four-row sample.
  const practiceRows = rows.slice(-4);
  if (practiceRows.length === 0) return existing;
  const safe = (x: number, y: number): boolean =>
    x >= 0 &&
    x < board.width &&
    y >= low &&
    y < board.height &&
    board.grid[y]?.[x] === null &&
    board.tags[y]?.[x] === null &&
    !board.obstructions[key(x, y)] &&
    !reserved.has(key(x, y));
  for (let x = 0; x < board.width; x++) {
    const additions: Point[] = [];
    const empty: Point[] = [];
    for (const y of practiceRows) {
      additions.push([x, y]);
      if (school === 'water' || school === 'wind') {
        additions.push([x + 1, y]);
        empty.push([x + 2, y]);
      }
      if (school === 'earth')
        for (let below = y + 1; below < board.height; below++) empty.push([x, below]);
    }
    const addedKeys = new Set(additions.map(([ax, ay]) => key(ax, ay)));
    if (!additions.every(([ax, ay]) => safe(ax, ay))) continue;
    if (!empty.every(([ax, ay]) => addedKeys.has(key(ax, ay)) || safe(ax, ay))) continue;
    if (
      practiceRows.some((y) => {
        const count = board.grid[y]?.filter((cell) => cell !== null).length ?? board.width;
        return count + additions.filter(([, ay]) => ay === y).length >= board.width;
      })
    )
      continue;
    for (const [ax, ay] of additions) {
      const row = board.grid[ay];
      if (!row) continue;
      row[ax] = school === 'lightning' || school === 'nature' ? 'stone' : 'neutral';
      if (school === 'lightning' || school === 'nature') {
        board.obstructions[key(ax, ay)] = {
          id: `${request.owner}:${ax}:${ay}`,
          owner: request.owner,
          strength: rank >= 3 ? 2 : 1,
          anchored: true,
          sequence: [],
          step: 0,
          contacts: [],
        };
      }
    }
    return lessonPracticeIntent(board, request);
  }
  return existing;
}
