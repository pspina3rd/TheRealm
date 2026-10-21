/**
 * Shared data definitions. Everything under `src/data` is plain, serialisable
 * content so new enemies, NPCs and maps can be added without touching logic.
 */
import type { CrystalColor, PieceName } from '../core/pieces';

// ---------------------------------------------------------------- spells ---

export type SpellEffect =
  /** Damage the enemy. */
  | { readonly kind: 'damage'; readonly power: number }
  /** Restore hero HP. */
  | { readonly kind: 'heal'; readonly amount: number }
  /** Remove rows from the bottom of the board. */
  | { readonly kind: 'clearRows'; readonly rows: number }
  /** Damage the enemy and delay its next action by `pieces`. */
  | { readonly kind: 'freeze'; readonly power: number; readonly pieces: number };

export interface SpellDef {
  readonly id: string;
  readonly name: string;
  readonly mpCost: number;
  readonly description: string;
  readonly effect: SpellEffect;
}

// --------------------------------------------------------------- enemies ---

/** An action an enemy performs every `actEvery` pieces the hero places. */
export type EnemyMove =
  /** Physical or magical hit; damage is `power + enemy atk - hero defence`. */
  | { readonly kind: 'attack'; readonly name: string; readonly power: number }
  /** Pushes stone rows up from the bottom of the board. */
  | { readonly kind: 'curse'; readonly name: string; readonly rows: number }
  /** Doubles gravity speed for the hero's next `pieces` pieces. */
  | { readonly kind: 'haste'; readonly name: string; readonly pieces: number }
  /** Restores the enemy's HP. */
  | { readonly kind: 'heal'; readonly name: string; readonly amount: number }
  /** Burns the hero's MP. */
  | { readonly kind: 'drain'; readonly name: string; readonly mp: number };

export interface Drop {
  readonly itemId: string;
  /** Probability in [0, 1]. */
  readonly chance: number;
}

export interface EnemyDef {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly hp: number;
  readonly atk: number;
  readonly xp: number;
  readonly gil: number;
  /** Clearing crystals of this colour deals bonus damage. */
  readonly weakness?: CrystalColor;
  /** The enemy acts after this many hero pieces. */
  readonly actEvery: number;
  /** Moves are picked uniformly at random; repeat a move to weight it. */
  readonly moves: readonly EnemyMove[];
  readonly drops?: readonly Drop[];
  /** Sprite key resolved by the sprite registry. */
  readonly sprite: string;
  readonly description: string;
}

// ----------------------------------------------------------------- items ---

export type ItemKind = 'consumable' | 'weapon' | 'armor' | 'treasure' | 'service';

export interface ItemUse {
  readonly heal?: number;
  readonly mp?: number;
  /** Restores HP and MP to full and sets the respawn point (inns). */
  readonly rest?: boolean;
  /** Teaches a spell when used. */
  readonly learnSpell?: string;
}

export interface ItemDef {
  readonly id: string;
  readonly name: string;
  readonly kind: ItemKind;
  /** List price in gil. Treasures are not sold in shops. */
  readonly price: number;
  readonly description: string;
  readonly atk?: number;
  readonly def?: number;
  readonly use?: ItemUse;
}

// ------------------------------------------------------------ challenges ---

/** Every interaction in the realm is one of these falling-block challenges. */
export type ChallengeSpec =
  /** Fight an enemy: line clears deal damage, the enemy casts magic back. */
  | { readonly kind: 'combat'; readonly enemyId: string }
  /**
   * Offer an item: like casting a spell costs MP, presenting an offering costs
   * points. Score `targetScore` within `pieceLimit` pieces while holding the item.
   */
  | {
      readonly kind: 'offering';
      readonly itemId: string;
      readonly targetScore: number;
      readonly pieceLimit: number;
    }
  /** Trade crystals: clear the requested number of cells of each colour. */
  | {
      readonly kind: 'barter';
      readonly wants: Readonly<Partial<Record<CrystalColor, number>>>;
      readonly pieceLimit: number;
    }
  /**
   * Haggle: your line clears push the price down while the merchant pushes it
   * up over time. The final price applies to the shop that opens afterwards.
   */
  | { readonly kind: 'haggle'; readonly pieceLimit: number; readonly rivalIntervalMs: number }
  /** Solve a preset board with a fixed piece sequence. */
  | {
      readonly kind: 'puzzle';
      readonly rows: readonly string[];
      readonly queue: readonly PieceName[];
      readonly linesToClear: number;
    };

// --------------------------------------------------------------- rewards ---

export type Reward =
  | { readonly kind: 'gil'; readonly amount: number }
  | { readonly kind: 'item'; readonly itemId: string; readonly count: number }
  | { readonly kind: 'spell'; readonly spellId: string }
  | { readonly kind: 'flag'; readonly flag: string }
  | { readonly kind: 'shop'; readonly shopId: string };

// ------------------------------------------------------------------ NPCs ---

export interface NpcDef {
  readonly id: string;
  readonly name: string;
  readonly sprite: string;
  /** Shown before the challenge is offered. */
  readonly greeting: string;
  readonly challenge: ChallengeSpec;
  readonly rewards: readonly Reward[];
  readonly successText: string;
  readonly failText: string;
  /** If false, the NPC only challenges once; afterwards `doneText` is shown. */
  readonly repeatable: boolean;
  readonly doneText?: string;
  /** Hidden flag set when a non-repeatable NPC is completed. Defaults to `npc:<id>`. */
  readonly completionFlag?: string;
}

export interface ShopDef {
  readonly id: string;
  readonly name: string;
  readonly stock: readonly string[];
}
