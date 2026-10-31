import { required } from '../core/required';
/** Character-owned interference: duration is measured by that character's placements. */
import type { Board } from '../core/board';
import {
  resolveMagic,
  position,
  type BoardElement,
  type ColorTouch,
  type MagicResolution,
} from '../core/boardMagic';
export interface InterferenceEffects {
  red: number;
  wind: number;
  nature: number;
  gravity: number;
  direction: -1 | 1;
  delayMs: number;
}
export type PlacementIntent = 'hostile' | 'helpful';
export interface ObstructionPlacement {
  x: number;
  y: number;
  strength: number;
  sequence?: readonly ColorTouch[];
}
export class ArcaneInterference {
  effects: Record<string, InterferenceEffects> = {};
  placements: Record<string, number> = {};
  private serial = 0;
  constructor(readonly board: Board) {}
  effect(owner: string): InterferenceEffects {
    return (this.effects[owner] ??= {
      red: 0,
      wind: 0,
      nature: 0,
      gravity: 0,
      direction: 1,
      delayMs: 0,
    });
  }
  checkpoint(): {
    effects: Record<string, InterferenceEffects>;
    placements: Record<string, number>;
    serial: number;
  } {
    return structuredClone({
      effects: this.effects,
      placements: this.placements,
      serial: this.serial,
    });
  }
  restore(point: ReturnType<ArcaneInterference['checkpoint']>): void {
    this.effects = structuredClone(point.effects);
    this.placements = { ...point.placements };
    this.serial = point.serial;
    this.sync();
  }
  sync(): void {
    this.board.magicOwners = {
      settleOwners: Object.keys(this.effects).filter((o) => required(this.effects[o]).gravity > 0),
      redOwners: Object.keys(this.effects).filter((o) => required(this.effects[o]).red > 0),
    };
  }
  /** Call on a copy for previews; no placement counters advance on casting. */
  cast(
    owner: string,
    element: BoardElement,
    rank: number,
    bottomRow: number,
    direction: -1 | 1,
    intervalMs: number,
  ): MagicResolution {
    const e = this.effect(owner),
      r = Math.max(1, Math.min(4, Math.floor(rank)));
    if (element === 'fire') e.red = Math.max(e.red, r);
    if (element === 'water') e.delayMs = Math.max(e.delayMs, r * intervalMs);
    if (element === 'wind') {
      e.wind = Math.max(e.wind, r);
      e.direction = direction;
    }
    if (element === 'nature') e.nature = Math.max(e.nature, r);
    if (element === 'earth') e.gravity = Math.max(e.gravity, r);
    this.sync();
    const result = this.board.resolveBoardMagic(
      element === 'lightning'
        ? { spell: { element, rank: r, bottomRow, owner, weaken: true } }
        : {},
    );
    return result;
  }
  /** A whole authored piece/batch is ONE owner placement, even if it has several cells. */
  place(
    owner: string,
    cells: readonly ObstructionPlacement[],
    intent: PlacementIntent = 'hostile',
  ): MagicResolution {
    return this.deliver(owner, cells, intent, false);
  }
  /** An enemy transformation/pushed row has already introduced raw stone.
   * Apply the same owner modifiers and one-batch clock as a targeted arrival. */
  adopt(owner: string, cells: readonly ObstructionPlacement[]): MagicResolution {
    return this.deliver(owner, cells, 'hostile', true);
  }
  private deliver(
    owner: string,
    cells: readonly ObstructionPlacement[],
    intent: PlacementIntent,
    existing: boolean,
  ): MagicResolution {
    const before = this.checkpoint();
    const e = this.effect(owner),
      state = this.board.magicState();
    const originalKey = JSON.stringify(state);
    const fresh: [number, number][] = [];
    // Allies and player-applied Arcane effects may deliberately help the board.
    let allowClears = intent === 'helpful' || e.gravity > 0 || e.red > 0;
    for (const cell of cells) {
      let { x } = cell;
      const { y } = cell;
      const adopting =
        existing && state.grid[y]?.[x] === 'stone' && !state.obstructions[position(x, y)];
      if (
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        x < 0 ||
        y < 0 ||
        y >= this.board.height ||
        x >= this.board.width ||
        (required(state.grid[y])[x] !== null && !adopting)
      )
        continue;
      const neutral = e.nature > 0;

      if (e.wind > 0) {
        const nx = x + e.direction;
        const hitsActive = this.board.active?.cells.some(
          ([dx, dy]) =>
            required(this.board.active).x + dx === nx && required(this.board.active).y + dy === y,
        );
        if (
          nx >= 0 &&
          nx < this.board.width &&
          required(state.grid[y])[nx] === null &&
          (!adopting || !hitsActive)
        )
          x = nx;
      }
      if (
        this.board.active?.cells.some(
          ([dx, dy]) =>
            required(this.board.active).x + dx === x && required(this.board.active).y + dy === y,
        )
      )
        continue;
      const redirected = x !== cell.x;
      const playerAffected = neutral || redirected || e.gravity > 0;
      // A hostile stone must leave a gap, rather than finish a row now or gift
      // a completed row on the player's next lock. Validate the whole batch.
      if (
        intent === 'hostile' &&
        !adopting &&
        !playerAffected &&
        required(state.grid[y]).every((c, column) => column === x || c !== null)
      )
        continue;
      const previousTag = adopting ? (state.tags[y]?.[cell.x] ?? null) : null;
      if (adopting) {
        required(state.grid[y])[cell.x] = null;
        required(state.tags[y])[cell.x] = null;
      }
      if (!neutral && adopting) required(state.tags[y])[x] = previousTag;
      if (playerAffected) allowClears = true;
      if (neutral) e.nature--;
      if (e.wind > 0) e.wind--;
      required(state.grid[y])[x] = neutral ? 'neutral' : 'stone';
      fresh.push([x, y]);
      if (!neutral)
        state.obstructions[position(x, y)] = {
          id: `${owner}:${++this.serial}`,
          owner,
          strength: Math.max(1, Math.min(3, cell.strength)),
          anchored: e.gravity === 0,
          sequence: cell.sequence ?? [],
          step: 0,
          contacts: [],
        };
    }
    this.sync();
    const result = resolveMagic(state, { ...this.board.magicOwners, fresh, clears: allowClears });
    if (
      this.board.active?.cells.some(([dx, dy]) => {
        const x = required(this.board.active).x + dx,
          y = required(this.board.active).y + dy;
        return (
          y >= 0 && result.state.grid[y]?.[x] !== null && result.state.grid[y]?.[x] !== undefined
        );
      })
    ) {
      if (existing) {
        // A falling active piece is temporary support: keep adopted material
        // at its safe source until a physical lock can settle it.
        result.state = state;
        result.completed = [];
        result.rows = [];
        result.collapsedRows = [];
        result.removed = [];
      } else {
        this.restore(before);
        return {
          state: this.board.magicState(),
          completed: [],
          rows: [],
          collapsedRows: [],
          removed: [],
          changed: false,
        };
      }
    }
    this.board.adoptMagic(result.state);
    if (fresh.length === 0) return result;
    this.placements[owner] = (this.placements[owner] ?? 0) + 1;
    if (e.red > 0) e.red--;
    if (e.gravity > 0 && --e.gravity === 0) {
      for (const o of Object.values(this.board.obstructions))
        if (o.owner === owner) o.anchored = true;
      // Preview/commit equality includes re-anchoring after the final affected placement.
      result.state = this.board.magicState();
    }
    this.sync();
    result.changed = originalKey !== JSON.stringify(result.state);
    return result;
  }
  /** Delays obstruction delivery only; the opponent's other actions keep their own clock. */
  elapse(owner: string, dtMs: number): number {
    const e = this.effect(owner),
      consumed = Math.min(e.delayMs, Math.max(0, dtMs));
    e.delayMs -= consumed;
    return Math.max(0, dtMs - consumed);
  }
}
