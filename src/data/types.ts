/**
 * Shared data definitions. Everything under `src/data` is plain, serialisable
 * content so new enemies, NPCs and maps can be added without touching logic.
 */
import type { Element } from '../core/elements';
import type { CrystalColor, PieceName } from '../core/pieces';
import type { StatId } from './stats';

/** An amount per element, e.g. a spell's mana cost. */
export type ElementAmounts = Readonly<Partial<Record<Element, number>>>;

// ---------------------------------------------------------------- spells ---

export type SpellEffect =
  /** Damage the enemy. */
  | { readonly kind: 'damage'; readonly power: number }
  /** Restore hero HP. */
  | { readonly kind: 'heal'; readonly amount: number }
  /** Remove rows from the bottom of the board and damage the enemy. */
  | { readonly kind: 'clearRows'; readonly rows: number; readonly power: number }
  /** Damage the enemy and delay its next action by `pieces`. */
  | { readonly kind: 'freeze'; readonly power: number; readonly pieces: number }
  /** Damage the enemy and slow your falling pieces for `pieces` pieces. */
  | { readonly kind: 'tailwind'; readonly power: number; readonly pieces: number }
  /** Damage the enemy and heal `share` (0–1) of the damage dealt. */
  | { readonly kind: 'drain'; readonly power: number; readonly share: number }
  /** Burn the enemy for `power` after each of the hero's next `pieces` pieces. */
  | { readonly kind: 'burn'; readonly power: number; readonly pieces: number }
  /** The enemy's next `moves` moves fizzle. */
  | { readonly kind: 'mist'; readonly moves: number }
  /** Each of the next `clears` line clears also strikes for `power`. */
  | { readonly kind: 'charge'; readonly power: number; readonly clears: number }
  /** Heal `amount` HP after each of the hero's next `pieces` pieces. */
  | { readonly kind: 'regen'; readonly amount: number; readonly pieces: number }
  /** Add `amount` to the hero's ward. */
  | { readonly kind: 'ward'; readonly amount: number }
  /** Add `amount` mana to every pool except the spell's own element. */
  | { readonly kind: 'manaTap'; readonly amount: number }
  /** Swap the falling piece for the next one. */
  | { readonly kind: 'swap' }
  /** Turn every stone on the board into crystals of the spell's element. */
  | { readonly kind: 'purify' }
  /**
   * Damage the enemy by `power` for every crystal of the spell's element on
   * the board, at most `max` (before weakness or resistance).
   */
  | { readonly kind: 'resonate'; readonly power: number; readonly max: number }
  /** For the hero's next `pieces` pieces every element strikes the enemy as a weakness. */
  | { readonly kind: 'expose'; readonly pieces: number };

/**
 * A spell's place in its category's menu: the element's main spell (levels
 * 1–4), a support spell of its own, or a combo of several elements.
 */
export type SpellRole = 'primary' | 'support' | 'combo';

/**
 * What reveals a hidden spell, so its element's mentor will teach it:
 * - `stat`: a stat at `rank` or higher;
 * - `alignment`: at least this alignment in every listed element;
 * - `pattern`: a board feat done `count` times over the hero's life (see
 *   `src/game/feats.ts`); the mentor noticed and seeks the hero out;
 * - `quest`: a story flag;
 * - `item`: the item, brought to the element's mentor.
 */
export type HiddenUnlock =
  | { readonly kind: 'stat'; readonly stat: StatId; readonly rank: number }
  | { readonly kind: 'alignment'; readonly needs: ElementAmounts }
  | { readonly kind: 'pattern'; readonly feat: FeatId; readonly count: number }
  | { readonly kind: 'quest'; readonly flag: string }
  | { readonly kind: 'item'; readonly itemId: string };

/**
 * A board feat the hero's life counts: a cleared line all of one element
 * (`pure.<element>`: 8 of its 10 cells), or 3+ lines cleared at once under the enemy's haste.
 */
export type FeatId = `pure.${Element}` | 'hastedClear';

/** One level of a spell: its name, cost and effect at that level. */
export interface SpellLevel {
  readonly name: string;
  /** Mana spent from each elemental pool. */
  readonly cost: ElementAmounts;
  readonly effect: SpellEffect;
}

export interface SpellDef {
  readonly id: string;
  /**
   * The category the spell sits in (one per element). It is also the
   * element it strikes with, which decides weakness and resistance.
   */
  readonly category: Element;
  readonly role: SpellRole;
  /**
   * Every element whose alignment the spell builds (combos only; it
   * includes the category). Other spells build their category's alone.
   */
  readonly elements?: readonly Element[];
  /**
   * Spells the hero must know before a mentor will teach this one (a
   * support needs its category's primary; a combo another element's).
   */
  readonly requires?: readonly string[];
  /** Level 1 first. The effect's kind is the same at every level. */
  readonly levels: readonly [SpellLevel, ...SpellLevel[]];
  /** Set for hidden spells: what reveals them (see `src/game/hidden.ts`). */
  readonly hidden?: HiddenUnlock;
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
  /** Burns mana from the hero's fullest pool. */
  | { readonly kind: 'drain'; readonly name: string; readonly mana: number };

/** How an enemy changes once enraged. */
export interface EnrageDef {
  /** Enrages at or below this fraction of max HP, e.g. 0.5. */
  readonly below: number;
  /** Acts after this many pieces instead. */
  readonly actEvery: number;
  /** Its curses push this many stone rows instead. */
  readonly curseRows: number;
}

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
  /** The enemy's own element (used by its magic and shown in battle). */
  readonly element: Element;
  /**
   * Resistances beyond the element chart's (bosses only). Weaknesses and the
   * usual resistances come from the chart; see `src/battle/elemental.ts`.
   */
  readonly extraResist?: readonly Element[];
  /** The enemy acts after this many hero pieces. */
  readonly actEvery: number;
  /** Bosses: below `below` (a fraction of max HP) the enemy enrages for the rest of the fight. */
  readonly enrage?: EnrageDef;
  /** Beating it ends the chapter (see `src/game/ending.ts`). */
  readonly finale?: boolean;
  /** Moves are picked uniformly at random; repeat a move to weight it. */
  readonly moves: readonly EnemyMove[];
  readonly drops?: readonly Drop[];
  /** Sprite key resolved by the sprite registry. */
  readonly sprite: string;
  /** Washes the sprite in this element's colour (summoned wisps share one sprite). */
  readonly tint?: Element;
  readonly description: string;
}

// ----------------------------------------------------------------- items ---

export type ItemKind = 'consumable' | 'weapon' | 'armor' | 'accessory' | 'treasure' | 'service';

export interface ItemUse {
  readonly heal?: number;
  /** Mana restored to every elemental pool. */
  readonly mana?: number;
  /** Restores HP and MP to full and sets the respawn point (inns). */
  readonly rest?: boolean;
  /** Teaches a spell when used. */
  readonly learnSpell?: string;
}

export interface ItemDef {
  readonly id: string;
  readonly name: string;
  readonly kind: ItemKind;
  /**
   * List price in gil; shops buy at half (see `src/game/shop.ts`). 0 means
   * it can't be sold (a keepsake). Treasures are never stocked.
   */
  readonly price: number;
  readonly description: string;
  readonly atk?: number;
  readonly def?: number;
  /** For accessories: extra copies of each element's piece in every bag. */
  readonly pieceBias?: ElementAmounts;
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
  /**
   * A mentor's lesson: a fight against `enemyId`, made harder by
   * `difficulty`, with the mentor tossing helpful pieces. Winning teaches
   * `spellId` (or its next level).
   */
  | {
      readonly kind: 'lesson';
      readonly mentorId: string;
      readonly spellId: string;
      readonly enemyId: string;
      readonly difficulty: number;
    }
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
  /**
   * Teach a spell; a hero who already knows it gets `instead` (so a deed
   * is never repaid with nothing).
   */
  | { readonly kind: 'spell'; readonly spellId: string; readonly instead?: Reward }
  | { readonly kind: 'flag'; readonly flag: string }
  | { readonly kind: 'shop'; readonly shopId: string };

// ------------------------------------------------------------------ NPCs ---

/**
 * A line that changes with the NPC's attitude: `cold` (Hostile, Wary),
 * `plain` (Neutral) or `warm` (Friendly, Devoted).
 */
export interface MoodLine {
  readonly cold: string;
  readonly plain: string;
  readonly warm: string;
}

/** A line said the same way to everyone, or one that changes with attitude. */
export type Line = string | MoodLine;

/** Everything an NPC says (see "NPC dialogue rules" in docs/GAME_DESIGN.md). */
export interface NpcLines {
  /** Their need, said before the challenge is offered. */
  readonly intro: MoodLine;
  /** Said instead of the warm intro when Devoted: a confidence or a hint. */
  readonly confide?: string;
  /** Said when Hostile and they won't deal (NPCs who always deal have none). */
  readonly refuse?: string;
  readonly accept: Line;
  readonly decline: Line;
  readonly win: Line;
  /** Said on a win instead of `win` when the hero already knew the spell reward. */
  readonly winKnown?: Line;
  readonly lose: Line;
  /** Said once a non-repeatable NPC's task is done. */
  readonly done?: Line;
}

export interface NpcDef {
  readonly id: string;
  readonly name: string;
  readonly sprite: string;
  /** Their element: the hero's alignment around it sets their attitude. */
  readonly element: Element;
  readonly lines: NpcLines;
  readonly challenge: ChallengeSpec;
  readonly rewards: readonly Reward[];
  /** Added to the rewards when Friendly or Devoted. */
  readonly bonus?: Reward;
  /** Added on top of `bonus` when Devoted. Shops keep theirs in `ShopDef.secretStock`. */
  readonly secret?: Reward;
  /**
   * Progress depends on them, so a Hostile NPC still deals, at Wary terms,
   * instead of refusing.
   */
  readonly essential?: boolean;
  /** A thing, not a person (a chest): no attitude, always Neutral terms. */
  readonly inanimate?: boolean;
  /** If false, the NPC only challenges once; afterwards `lines.done` is shown. */
  readonly repeatable: boolean;
  /** Hidden flag set when a non-repeatable NPC is completed. Defaults to `npc:<id>`. */
  readonly completionFlag?: string;
}

export interface ShopDef {
  readonly id: string;
  readonly name: string;
  readonly stock: readonly string[];
  /** Extra stock shown only to a hero the keeper is Devoted to. */
  readonly secretStock?: readonly string[];
}
