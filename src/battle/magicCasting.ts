import { required } from '../core/required';
import { Board } from '../core/board';
import { createRng } from '../core/rng';
import type { BoardElement, MagicResolution, MagicState } from '../core/boardMagic';
import { ARCANE_BASE, arcaneRank, arcaneUnlocked } from '../game/arcane';
import { canAfford, spendMana, type Hero } from '../game/hero';
import { castSpellFor, isSealed, totalEnhancements } from '../game/spells';
import { SPELLS } from '../data/spells';
import type { ElementAmounts } from '../data/types';
import { ArcaneInterference } from './arcane';
export const BOARD_SPELLS: Readonly<Record<string, BoardElement>> = {
  fire: 'fire',
  blizzard: 'water',
  quake: 'earth',
  gale: 'wind',
  thunder: 'lightning',
  natureConvert: 'nature',
};
export const GRAVITY_NAMES = ['Gravity', 'Mudslide', 'Earthquake', 'Avalanche'] as const;
export interface MagicTarget {
  bottomRow: number;
  direction: -1 | 1;
}
export interface CastPreview {
  id: string;
  target: MagicTarget;
  name: string;
  rank: number;
  cost: ElementAmounts;
  resolution: MagicResolution;
  effects: ReturnType<ArcaneInterference['checkpoint']>;
  before: string;
  reason: string | null;
  powerScale: number;
  surge: number;
  element: BoardElement;
}
export class MagicCasting {
  constructor(
    readonly board: Board,
    readonly hero: Hero,
    readonly interference: ArcaneInterference,
    readonly flags: ReadonlySet<string>,
    readonly owner: string,
    readonly intervalMs: number,
    readonly book: () => Hero['spells'] = () => hero.spells,
    readonly unsealedId?: string,
  ) {}
  snapshotKey(): string {
    return this.fingerprint();
  }
  private fingerprint(): string {
    return JSON.stringify([
      this.board.magicState(),
      this.board.active,
      this.hero.mana,
      this.hero.spells,
      this.hero.arcane,
      this.hero.weaving,
      this.interference.checkpoint(),
      [...this.flags],
    ]);
  }
  preview(id: string, target: MagicTarget): CastPreview {
    const arcane = id.startsWith('arcane:');
    const element = arcane ? (id.slice(7) as BoardElement) : BOARD_SPELLS[id];
    if (!element || !Object.hasOwn(ARCANE_BASE, element)) throw new Error('Unknown board spell.');
    const base = arcane ? ARCANE_BASE[element] : id,
      def = SPELLS[base],
      known = this.book()[base];
    if (!def || !known) throw new Error("You don't know that spell.");
    const rank = arcane ? arcaneRank(this.hero, element) : known.level;
    if (rank < 1) throw new Error('Learn this Arcane technique first.');
    const cast = castSpellFor(def, known),
      cost = { ...cast.cost };
    if (arcane) {
      if (!arcaneUnlocked(this.flags))
        throw new Error('Arcane unlocks after the Moon Wyrm aftermath.');
      const shadow = this.hero.spells.shadow;
      if (!shadow || isSealed(this.hero, 'shadow')) throw new Error('Shadow Drain is unavailable.');
      const shadowCast = castSpellFor(required(SPELLS.shadow), shadow);
      for (const [key, n] of Object.entries(shadowCast.cost)) {
        const e = key as keyof typeof cost;
        cost[e] = (cost[e] ?? 0) + n;
      }
    }
    const copy = new Board(createRng(0), this.board.width, this.board.height);
    copy.adoptMagic(this.board.magicState());
    copy.active = structuredClone(this.board.active);
    const interference = new ArcaneInterference(copy);
    interference.restore(this.interference.checkpoint());
    const resolution = arcane
      ? interference.cast(
          this.owner,
          element,
          rank,
          target.bottomRow,
          target.direction,
          this.intervalMs,
        )
      : copy.resolveBoardMagic({ spell: { element, rank, ...target } });
    let reason: string | null = null;
    if (!this.board.magicEnabled) reason = 'Board magic is unavailable in this encounter.';
    else if (isSealed(this.hero, base) && base !== this.unsealedId)
      reason = 'This spell is sealed.';
    else if (!canAfford(this.hero, cost)) reason = 'Not enough mana.';
    else if (
      copy.active?.cells.some(([dx, dy]) => {
        const x = required(copy.active).x + dx,
          y = required(copy.active).y + dy;
        return y >= 0 && copy.grid[y]?.[x] !== null && copy.grid[y]?.[x] !== undefined;
      })
    )
      reason = 'The result would overlap your falling piece.';
    else if (
      meaningful(this.board.magicState(), this.interference) ===
      meaningful(resolution.state, interference)
    )
      reason = 'This cast would change nothing.';
    return {
      id,
      target: { ...target },
      name: arcane
        ? `Arcane + ${element === 'earth' ? 'Gravity' : element === 'water' ? 'Ice' : element}`
        : element === 'earth'
          ? required(GRAVITY_NAMES[rank - 1])
          : cast.name,
      rank,
      cost,
      resolution,
      effects: interference.checkpoint(),
      before: this.fingerprint(),
      reason,
      powerScale: 1 + 0.2 * totalEnhancements(known).power,
      surge: 3 * totalEnhancements(known).effect,
      element,
    };
  }
  commit(preview: CastPreview): MagicResolution {
    if (preview.before !== this.fingerprint())
      throw new Error('The board changed. Preview the cast again.');
    if (preview.reason) throw new Error(preview.reason);
    // Re-resolve, rather than trusting a mutable UI preview object.
    const actual = this.preview(preview.id, preview.target);
    if (actual.reason) throw new Error(actual.reason);
    spendMana(this.hero, actual.cost);
    this.board.adoptMagic(actual.resolution.state);
    this.interference.restore(actual.effects);
    return actual.resolution;
  }
}

function meaningful(state: MagicState, interference: ArcaneInterference): string {
  return JSON.stringify([
    state.grid,
    state.tags,
    Object.entries(state.obstructions).map(([key, o]) => [
      key,
      o.id,
      o.owner,
      o.strength,
      o.anchored,
      o.sequence,
      o.step,
    ]),
    Object.entries(interference.effects).filter(
      ([, e]) => e.red > 0 || e.wind > 0 || e.nature > 0 || e.gravity > 0 || e.delayMs > 0,
    ),
  ]);
}
