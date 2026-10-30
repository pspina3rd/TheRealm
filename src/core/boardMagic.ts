import { required } from './required';
/** Deterministic board mutation shared by previews, casts and actual placements. */
import { isCrystal, type Cell, type CrystalColor } from './pieces';
import type { CellTag, ClearedRow } from './board';
export type Side = 'top' | 'right' | 'bottom' | 'left';
export interface ColorTouch {
  color: CrystalColor;
  sides: readonly Side[];
}
export interface Obstruction {
  id: string;
  owner: string;
  strength: number;
  anchored: boolean;
  sequence: readonly ColorTouch[];
  step: number;
  contacts: string[];
}
export interface MagicState {
  grid: Cell[][];
  tags: (CellTag | null)[][];
  obstructions: Record<string, Obstruction>;
  latchedRows: string[];
  pendingRows: number[];
}
export type BoardElement = 'earth' | 'fire' | 'water' | 'wind' | 'lightning' | 'nature';
export interface BoardSpell {
  element: BoardElement;
  rank: number;
  bottomRow: number;
  direction?: -1 | 1;
  /** Arcane Lightning: ownership filter, weakening rather than destruction. */
  owner?: string;
  weaken?: boolean;
}
export interface MagicVisualBlock {
  from: readonly [number, number] | null;
  to: readonly [number, number] | null;
  before: Cell;
  after: Cell;
  effectAt: readonly [number, number] | null;
  effectCell: Cell;
}
export interface MagicResolution {
  /** Render-only trace from actual moves, additions, conversions, and removals. */
  visual?: MagicVisualBlock[];
  effectState?: MagicState;
  state: MagicState;
  completed: ClearedRow[];
  rows: number[];
  collapsedRows: number[];
  removed: {
    cell: Exclude<Cell, null>;
    tag: CellTag | null;
    cause: 'clear' | 'spell' | 'contact';
  }[];
  changed: boolean;
}
export const position = (x: number, y: number): string => `${x},${y}`;
const SIDES: readonly [Side, number, number][] = [
  ['top', 0, -1],
  ['right', 1, 0],
  ['bottom', 0, 1],
  ['left', -1, 0],
];
export function cloneMagic(state: MagicState): MagicState {
  return structuredClone(state);
}
export function emptyMagic(width: number, height: number): MagicState {
  return {
    grid: Array.from({ length: height }, () => Array<Cell>(width).fill(null)),
    tags: Array.from({ length: height }, () => Array<CellTag | null>(width).fill(null)),
    obstructions: {},
    latchedRows: [],
    pendingRows: [],
  };
}
export function spanFor(
  spell: Omit<BoardSpell, 'element'> & { element: BoardElement | 'arcane' },
  height: number,
): [number, number] {
  if (spell.element === 'arcane') return [0, -1];
  const rank = Math.max(1, Math.min(4, Math.floor(spell.rank)));
  const rows =
    spell.element === 'earth'
      ? required([1, 2, 4, height][rank - 1])
      : spell.element === 'lightning' || spell.element === 'nature'
        ? rank % 2 === 0
          ? 2
          : 1
        : rank;
  const bottom = Math.max(rows - 1, Math.min(height - 1, Math.floor(spell.bottomRow)));
  return [bottom - rows + 1, bottom];
}
/** Mutate only the returned clone. `fresh` denotes actual newly placed contacts. */
export function resolveMagic(
  input: MagicState,
  options: {
    spell?: BoardSpell;
    fresh?: readonly (readonly [number, number])[];
    settleOwners?: readonly string[];
    redOwners?: readonly string[];
    clears?: boolean;
  } = {},
): MagicResolution {
  const state = cloneMagic(input);
  const height = state.grid.length,
    width = state.grid[0]?.length ?? 0;
  const result: MagicResolution = {
    state,
    completed: [],
    rows: [],
    collapsedRows: [],
    removed: [],
    changed: false,
  };
  const actors: MagicVisualBlock[] = [];
  let actorAt = new Map<string, MagicVisualBlock>();
  if (options.spell)
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const cell = state.grid[y]?.[x];
        if (cell) {
          const actor: MagicVisualBlock = {
            from: [x, y],
            to: [x, y],
            before: cell,
            after: cell,
            effectAt: [x, y],
            effectCell: cell,
          };
          actors.push(actor);
          actorAt.set(position(x, y), actor);
        }
      }
  const fresh = new Set((options.fresh ?? []).map(([x, y]) => position(x, y)));
  const hitContacts = new Set<string>();
  const erase = (x: number, y: number, cause: 'clear' | 'spell' | 'contact'): void => {
    const cell = state.grid[y]?.[x];
    if (cell === null || cell === undefined) return;
    const actor = actorAt.get(position(x, y));
    if (actor) {
      actor.to = null;
      actor.after = null;
      actorAt.delete(position(x, y));
    }
    result.removed.push({ cell, tag: state.tags[y]?.[x] ?? null, cause });
    required(state.grid[y])[x] = null;
    required(state.tags[y])[x] = null;
    Reflect.deleteProperty(state.obstructions, position(x, y));
  };
  const move = (x: number, y: number, nx: number, ny: number): void => {
    const actor = actorAt.get(position(x, y));
    if (actor) {
      actor.to = [nx, ny];
      actorAt.delete(position(x, y));
      actorAt.set(position(nx, ny), actor);
    }
    required(state.grid[ny])[nx] = required(required(state.grid[y])[x]);
    required(state.grid[y])[x] = null;
    required(state.tags[ny])[nx] = required(state.tags[y])[x] ?? null;
    required(state.tags[y])[x] = null;
    const obstruction = state.obstructions[position(x, y)];
    if (obstruction) {
      state.obstructions[position(nx, ny)] = obstruction;
      Reflect.deleteProperty(state.obstructions, position(x, y));
    }
    fresh.add(position(nx, ny));
  };
  const fall = (selected: (x: number, y: number) => boolean, topDown: boolean): void => {
    // Repeat to settle stacked eligible cells; normal squares outside the selection stay put.
    const selectedCells = new Set<string>();
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) if (selected(x, y)) selectedCells.add(position(x, y));
    for (let pass = 0; pass < height; pass++) {
      let moved = false;
      for (let i = 0; i < height; i++) {
        const y = topDown ? i : height - 1 - i;
        for (let x = 0; x < width; x++) {
          if (
            !selectedCells.has(position(x, y)) ||
            required(state.grid[y])[x] === null ||
            state.obstructions[position(x, y)]?.anchored
          )
            continue;
          let ny = y;
          while (ny + 1 < height && required(state.grid[ny + 1])[x] === null) ny++;
          if (ny !== y) {
            move(x, y, x, ny);
            selectedCells.delete(position(x, y));
            selectedCells.add(position(x, ny));
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
  };
  const collapseRows = (collapse: Set<number>): void => {
    result.collapsedRows.push(...collapse);
    const next = emptyMagic(width, height);
    next.latchedRows = state.latchedRows;
    const nextActors = new Map<string, MagicVisualBlock>();
    let ny = height - 1;
    for (let y = height - 1; y >= 0; y--) {
      if (collapse.has(y)) continue;
      next.grid[ny] = required(state.grid[y]);
      next.tags[ny] = required(state.tags[y]);
      if (state.pendingRows.includes(y)) next.pendingRows.push(ny);
      for (let x = 0; x < width; x++) {
        const actor = actorAt.get(position(x, y));
        if (actor) {
          actor.to = [x, ny];
          nextActors.set(position(x, ny), actor);
        }
        const o = state.obstructions[position(x, y)];
        if (o) next.obstructions[position(x, ny)] = o;
        if (y !== ny && required(state.grid[y])[x] !== null) fresh.add(position(x, ny));
      }
      ny--;
    }
    actorAt = nextActors;
    state.grid = next.grid;
    state.tags = next.tags;
    state.obstructions = next.obstructions;
    state.pendingRows = next.pendingRows;
  };
  const spell = options.spell;
  if (spell) {
    const [top, bottom] = spanFor(spell, height);
    const hits = spell.rank >= 3 ? 2 : 1;
    if (spell.element === 'earth') fall((_x, y) => y >= top && y <= bottom, spell.rank >= 4);
    else if (spell.element === 'wind') {
      const dx = spell.direction ?? 1;
      for (let y = top; y <= bottom; y++)
        for (let i = 0; i < width; i++) {
          const x = dx === 1 ? width - 1 - i : i,
            nx = x + dx;
          if (
            required(state.grid[y])[x] !== null &&
            !state.obstructions[position(x, y)]?.anchored &&
            nx >= 0 &&
            nx < width &&
            required(state.grid[y])[nx] === null
          )
            move(x, y, nx, y);
        }
    } else
      for (let y = top; y <= bottom; y++)
        for (let x = 0; x < width; x++) {
          const obstruction = state.obstructions[position(x, y)];
          if (spell.element === 'water' && required(state.grid[y])[x] === null) {
            required(state.grid[y])[x] = 'neutral';
            if (options.spell) {
              const actor: MagicVisualBlock = {
                from: null,
                to: [x, y],
                before: null,
                after: 'neutral',
                effectAt: [x, y],
                effectCell: 'neutral',
              };
              actors.push(actor);
              actorAt.set(position(x, y), actor);
            }
            fresh.add(position(x, y));
          } else if (spell.element === 'fire' && !obstruction) erase(x, y, 'spell');
          else if (
            (spell.element === 'lightning' || spell.element === 'nature') &&
            obstruction &&
            (!spell.owner || obstruction.owner === spell.owner)
          ) {
            obstruction.strength = Math.max(spell.weaken ? 1 : 0, obstruction.strength - hits);
            if (obstruction.strength === 0) {
              if (spell.element === 'nature') {
                result.removed.push({
                  cell: 'stone',
                  tag: state.tags[y]?.[x] ?? null,
                  cause: 'spell',
                });
                required(state.tags[y])[x] = null;
                required(state.grid[y])[x] = 'neutral';
                const actor = actorAt.get(position(x, y));
                if (actor) actor.after = 'neutral';
                Reflect.deleteProperty(state.obstructions, position(x, y));
              } else erase(x, y, 'spell');
            }
          }
        }
  }
  if (spell) {
    result.effectState = cloneMagic(state);
    for (const actor of actors) {
      actor.effectAt = actor.to;
      actor.effectCell = actor.after;
    }
    result.visual = actors;
  }
  const settleOwners = options.settleOwners ?? [];
  const settle = (): void => {
    for (const obstruction of Object.values(state.obstructions))
      if (settleOwners.includes(obstruction.owner)) obstruction.anchored = false;
    // Only owned obstructions move; other loose squares need an elemental Gravity cast.
    fall(
      (x, y) =>
        !!state.obstructions[position(x, y)] &&
        !required(state.obstructions[position(x, y)]).anchored,
      false,
    );
  };
  for (let pass = 0; pass <= width * height; pass++) {
    settle();
    for (const [key, obstruction] of Object.entries(state.obstructions)) {
      const [x, y] = key.split(',').map(Number) as [number, number];
      const contacts = SIDES.flatMap(([side, dx, dy]) => {
        const color = state.grid[y + dy]?.[x + dx];
        return color && isCrystal(color)
          ? [{ side, color, key: `${side}:${color}`, fresh: fresh.has(position(x + dx, y + dy)) }]
          : [];
      });
      const step = obstruction.sequence[obstruction.step];
      if (
        step &&
        !hitContacts.has(obstruction.id) &&
        contacts.some(
          (c) =>
            step.sides.includes(c.side) &&
            (c.color === step.color ||
              (c.color === 'red' && options.redOwners?.includes(obstruction.owner))) &&
            (!obstruction.contacts.includes(c.key) || c.fresh),
        )
      ) {
        obstruction.step++;
        obstruction.strength = Math.max(1, obstruction.strength - 1);
        hitContacts.add(obstruction.id);
        if (obstruction.step >= obstruction.sequence.length) erase(x, y, 'contact');
      }
      obstruction.contacts = contacts.map((c) => c.key);
    }
    if (options.clears === false) break;
    const emptied = new Set(
      state.pendingRows.filter((y) => required(state.grid[y]).every((c) => c === null)),
    );
    if (emptied.size) collapseRows(emptied);
    const full = state.grid.map((row) => row.every((c) => c !== null));
    const signatures = state.grid.map((row, y) =>
      JSON.stringify(row.map((c, x) => state.obstructions[position(x, y)]?.id ?? c)),
    );
    const rows = full.flatMap((yes, y) =>
      yes && !state.latchedRows.includes(required(signatures[y])) ? [y] : [],
    );
    state.latchedRows = full.flatMap((yes, y) => (yes ? [required(signatures[y])] : []));
    if (rows.length === 0) break;
    const collapse = new Set<number>();
    for (const y of rows) {
      const cells = required(state.grid[y]).slice(),
        tags = required(state.tags[y]).slice();
      for (let x = 0; x < width; x++) {
        const obstruction = state.obstructions[position(x, y)];
        if (obstruction && --obstruction.strength > 0) continue;
        erase(x, y, 'clear');
      }
      // A surviving obstruction is not part of the removed/color reward tally.
      result.completed.push({
        cells: cells.map((c, x) => (required(state.grid[y])[x] === null ? c : null)),
        tags: tags.map((t, x) => (required(state.grid[y])[x] === null ? t : null)),
      });
      result.rows.push(y);
      if (required(state.grid[y]).every((c) => c === null)) collapse.add(y);
      else if (!state.pendingRows.includes(y)) state.pendingRows.push(y);
    }
    if (collapse.size) collapseRows(collapse);
  }
  result.changed = JSON.stringify(input) !== JSON.stringify(state);
  return result;
}
