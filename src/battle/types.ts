import type { ArcaneInterference, ObstructionPlacement } from './arcane';
import type { MagicTarget } from './magicCasting';
import type { Board, CellTally, LockResult } from '../core/board';
import type { Landing } from '../core/landing';
import type { Element } from '../core/elements';
import type { PieceName } from '../core/pieces';
import type { EnemyMove, ElementAmounts } from '../data/types';
import type { Rng } from '../core/rng';
import type { Hero } from '../game/hero';

export type BattleStatus = 'ongoing' | 'won' | 'lost';

/**
 * Something that happened in a battle, for the screen to show (flashes,
 * effects, floating numbers). Events carry data, not text.
 */
export type BattleEvent =
  /** Lines cleared: their board rows (before collapsing) and contents. */
  | {
      readonly kind: 'lines';
      readonly rows: readonly number[];
      readonly lines: readonly CellTally[];
    }
  /** Mana gained from cleared crystals or effects. */
  | { readonly kind: 'mana'; readonly gained: ElementAmounts }
  /** An Ether: cleared crystals give double mana for this many pieces. */
  | { readonly kind: 'manaBoost'; readonly pieces: number }
  /** A cleared line's strongest element fired. `row` is where the line was. */
  | {
      readonly kind: 'surge';
      readonly element: Element;
      readonly power: number;
      readonly row: number;
    }
  /** The enemy took damage. `affinity` says if the element was a weakness or resisted. */
  | {
      readonly kind: 'enemyHit';
      readonly amount: number;
      readonly element: Element | null;
      readonly affinity: 'weak' | 'resist' | null;
    }
  | { readonly kind: 'enemyDefeated' }
  /** The enemy fell below its enrage threshold: it acts faster and curses harder. */
  | { readonly kind: 'enrage' }
  /** The next strike is critical (Luck); the hit that follows is already doubled. */
  | { readonly kind: 'crit' }
  /** The enemy used a move (its name is shown as a banner, as in classic RPGs). */
  | { readonly kind: 'enemyMove'; readonly move: EnemyMove }
  /** The enemy's move fizzled in the hero's Mist. */
  | { readonly kind: 'fizzle'; readonly move: EnemyMove }
  /** A mentor tossed the hero a piece in their element's colour (a lesson). */
  | { readonly kind: 'toss'; readonly element: Element; readonly piece: PieceName }
  | { readonly kind: 'enemyHeal'; readonly amount: number }
  | { readonly kind: 'heroHit'; readonly amount: number }
  | { readonly kind: 'heroHeal'; readonly amount: number }
  /** The earth ward changed (`total` is the new size). */
  | { readonly kind: 'ward'; readonly total: number }
  | { readonly kind: 'chill' }
  | { readonly kind: 'tailwind'; readonly pieces: number }
  | { readonly kind: 'haste'; readonly pieces: number }
  | { readonly kind: 'curse'; readonly rows: number }
  | { readonly kind: 'drain'; readonly element: Element; readonly amount: number }
  | { readonly kind: 'spell'; readonly spellId: string }
  | { readonly kind: 'item'; readonly itemId: string }
  | { readonly kind: 'overflow' }
  /** A spell or item took time: the enemy's gauge jumped `share` of a gauge. */
  | { readonly kind: 'gaugeJump'; readonly share: number }
  /** A placement left `holes` new covered holes: the enemy's gauge jumped. */
  | { readonly kind: 'rush'; readonly holes: number }
  /** A clear by the `steps`-th consecutive clearing piece after the first. */
  | { readonly kind: 'combo'; readonly steps: number }
  /** A multi-line clear right after another. */
  | { readonly kind: 'backToBack' }
  /** The enemy hid the next-piece preview for `pieces` pieces. */
  | { readonly kind: 'fog'; readonly pieces: number }
  /** The enemy sealed `column` for `pieces` pieces. */
  | { readonly kind: 'seal'; readonly column: number; readonly pieces: number }
  /** The enemy turned these board cells ([x, y]) to stone. */
  | { readonly kind: 'petrify'; readonly cells: readonly (readonly [number, number])[] }
  /** The enemy made pieces fall faster for `ms` milliseconds. */
  | { readonly kind: 'quicken'; readonly ms: number }
  | { readonly kind: 'revive' }
  /** A haggle price moved. */
  | { readonly kind: 'price'; readonly multiplier: number }
  /** The hero's first touch: the pre-roll is over, the clock starts. */
  | { readonly kind: 'begin' }
  /** The person showed how: their demo piece locked. */
  | { readonly kind: 'demo' }
  /** The person's face reacts (wordless): a hole, a big clear, danger. */
  | { readonly kind: 'face'; readonly face: Face }
  /** The person speaks one of their three lines. */
  | { readonly kind: 'beat'; readonly beat: Beat }
  /** Rows pushed up from below (rising mold, a merchant's counter-offer, a curse). */
  | { readonly kind: 'rise'; readonly rows: number; readonly source: PushSource }
  /** A placement left `count` new buried holes. */
  | { readonly kind: 'holes'; readonly count: number }
  /** A lamp lit, or the wind snuffed one. */
  | { readonly kind: 'lamp'; readonly index: number; readonly lit: boolean }
  /** The hazard spread into these cells ([x, y]). */
  | { readonly kind: 'spread'; readonly cells: readonly (readonly [number, number])[] }
  /** A protected cell was saved (picked), or lost. */
  | { readonly kind: 'saved' }
  | { readonly kind: 'lost' }
  /** Rows sent to a duel rival, or the rival topped out. */
  | { readonly kind: 'sent'; readonly rows: number }
  /** The foe raised the mentor's shield, or the taught spell broke it. */
  | { readonly kind: 'shield'; readonly up: boolean }
  /** A region rule's spore landed on, or spread into, these cells. */
  | { readonly kind: 'spores'; readonly cells: readonly (readonly [number, number])[] };

/** Where pushed rows come from. */
export type PushSource = 'curse' | 'rising' | 'send' | 'tug' | 'tide';

/** What kind of push it is: who sends it, and what the rows are made of. */
export interface RowPush {
  readonly source: PushSource;
  /** A boss's move (a boss's curse), as opposed to a region rule or an encounter's script. */
  readonly boss?: boolean;
  /** The rows' cells: stone with one gap (default), or mold (violet and green) with one gap. */
  readonly fill?: 'stone' | 'mold';
}

/** A person's wordless reaction (§4): a wince at a hole, a cheer at a 3+ clear, alarm at danger. */
export type Face = 'wince' | 'cheer' | 'alarm';

/** The three moments a person speaks in a challenge (§4). */
export type Beat = 'start' | 'hazard' | 'nearly';

/**
 * A board event marked ahead of time (§2, §7.1), as data: how many pieces
 * ahead it shows (`leadPieces`, `TELEGRAPH_LEAD`), and what it targets:
 * the cells it will touch (a spore's landing, the rot's next reach), rows
 * (a rising row, an incoming counter-offer) or a lamp about to be snuffed.
 */
export type Telegraph = { readonly leadPieces: number } & (
  | {
      readonly kind: 'cells';
      readonly what: 'spore' | 'spread';
      readonly cells: readonly (readonly [number, number])[];
    }
  | { readonly kind: 'rows'; readonly what: 'rise' | 'send'; readonly rows: number }
  | { readonly kind: 'lamp'; readonly index: number }
);

/** An event with its position in the battle, so the screen can play each one once. */
export interface NumberedEvent {
  readonly seq: number;
  readonly event: BattleEvent;
}

/** A count toward a goal, e.g. crystals collected or lines cleared. */
export interface Tally {
  readonly have: number;
  readonly want: number;
}

/** What the player is trying to do, as data for the battle screen to draw. */
export interface Objective {
  /** Short name for screen readers, e.g. "Barter crystals". */
  readonly label: string;
  /** Completion in [0, 1]. */
  readonly progress: number;
  /** Pieces left before the challenge ends, or null if unlimited. */
  readonly piecesLeft: number | null;
  /** Crystals wanted per element (barter). */
  readonly crystals?: readonly (Tally & { readonly element: Element })[];
  /** Points scored toward a target (offering). */
  readonly score?: Tally;
  /** Lines cleared toward a target (puzzle). */
  readonly lines?: Tally;
  /** Current price multiplier and its bounds (haggle). */
  readonly price?: { readonly value: number; readonly min: number; readonly max: number };
  /** The counter beside the objective on the board's frame, e.g. "Sprouts 4/12". */
  readonly counter?: string;
  /** Lamps on the frame (CHARGE): each one's element and whether it's lit. */
  readonly lamps?: readonly { readonly element: Element; readonly lit: boolean }[];
  /** A scripted rival's stack, drawn as a mini board (DUEL). */
  readonly rival?: {
    readonly rows: number;
    readonly top: number;
    readonly pending: number;
    readonly secondsLeft: number;
  };
}

/** The parts of a running battle that challenge rules may read or change. */
export interface BattleContext {
  readonly interference?: ArcaneInterference;
  placeObstructions?(owner: string, cells: readonly ObstructionPlacement[]): void;
  castBoardSpell?(id: string, target: MagicTarget): void;
  readonly board: Board;
  readonly hero: Hero;
  readonly rng: Rng;
  readonly score: number;
  /** Pieces remaining with doubled gravity (set by enemy haste). */
  hastePieces: number;
  /** Pieces remaining with slowed gravity (set by wind). */
  slowPieces: number;
  /** Pieces remaining in which cleared crystals give double mana (an Ether). */
  manaBoostPieces: number;
  /** Pieces remaining with the next-piece preview hidden (enemy fog). */
  fogPieces: number;
  /** Milliseconds remaining of quickened gravity (enemy quicken). */
  quickenMs: number;
  emit(event: BattleEvent): void;
  /**
   * Pushes `count` rows up from the bottom of the board: the one way any
   * row enters (an enemy's curse, rising mold, a merchant's send, later
   * tugs and the tide), so abilities can see and change every push.
   * Returns the rows actually pushed.
   */
  pushRows(push: RowPush, count: number): number;
}

/**
 * The rules layer of a battle. The `Battle` runner handles movement, gravity
 * and scoring; a challenge decides what clears mean and when the battle ends.
 */
export interface Challenge {
  /** A restoration closure for the two introductory encounters' one correction. */
  checkpoint?(): () => void;
  /** Called after every piece locks. */
  onLock(result: LockResult): void;
  /** Called every frame while the battle is ongoing (after the pre-roll). */
  update(dtMs: number): void;
  status(): BattleStatus;
  objective(): Objective;
  /** Pieces always shown ahead, whatever the hero's Insight (BUILD shows 3). */
  readonly previews?: number;
  /** True when the pre-roll waits for the hero's first touch before the clock runs. */
  readonly preroll?: boolean;
  /**
   * A placement's worth under this challenge's rules, added to a plain
   * stacker's judgement: the shared hint that steers the sim's good and
   * casual bots alike, and the threshold assist's tosses.
   */
  hint?(landing: Landing): number;
  /** Runs during the pre-roll, before the first touch (a scripted demo). */
  prerollUpdate?(dtMs: number): void;
  /** What's marked on the board one piece ahead. */
  telegraphs?(): readonly Telegraph[];
}

/** Pieces remaining before a piece-limited challenge runs out. */
export function piecesLeft(ctx: BattleContext, pieceLimit: number): number {
  return Math.max(0, pieceLimit - ctx.board.piecesPlaced);
}
