import { CombatChallenge, rollSpoils } from '../battle/combat';
import { HaggleChallenge } from '../battle/haggle';
import type { Battle } from '../battle/battle';
import type { Rng } from '../core/rng';
import { ENEMIES } from '../data/enemies';
import { NPCS } from '../data/npcs';
import type { ChallengeSpec, NpcDef, Reward } from '../data/types';
import type { EntityDef } from '../world/map';
import { markDefeated, travel, type GameState } from '../world/state';
import { addItem, fillMana, gainXp, itemCount, removeItem } from './hero';
import { grantRewards, type Gain } from './rewards';

/** Who is speaking in an interaction, for the conversation screen. */
interface Speaker {
  readonly title: string;
  /** Creature sprite key of the speaker. */
  readonly sprite: string;
  /** What they say. */
  readonly text: string;
}

/** What happens when the hero bumps into an entity. */
export type Interaction =
  /** Just talk; no battle (a finished quest). */
  | (Speaker & { readonly kind: 'message' })
  /** An offering the hero can't make yet: shows the item they need. */
  | (Speaker & { readonly kind: 'needsItem'; readonly itemId: string })
  /** Offer a battle the player can accept or decline. */
  | (Speaker & {
      readonly kind: 'challenge';
      readonly spec: ChallengeSpec;
      /** What winning earns (empty for monsters, whose spoils vary). */
      readonly rewards: readonly Reward[];
    });

/** The result of a finished battle, after it has been applied to the game state. */
export interface Resolution {
  readonly won: boolean;
  /** Everything gained or lost, for the results screen. */
  readonly gains: Gain[];
  /** What the NPC says afterwards, if anyone. */
  readonly speech: string | null;
  /** True when the hero fell and woke at the last inn. */
  readonly fell: boolean;
  /** Shop to open next, if the battle earned one. */
  readonly shopId: string | null;
  /** Price multiplier for that shop (from a haggle). */
  readonly priceMultiplier: number;
}

export function npcCompletionFlag(npc: NpcDef): string {
  return npc.completionFlag ?? `npc:${npc.id}`;
}

function npcFor(entity: EntityDef): NpcDef {
  if (entity.kind !== 'npc') throw new Error(`${entity.id} is not an NPC`);
  const npc = NPCS[entity.npcId];
  if (!npc) throw new Error(`Unknown NPC: ${entity.npcId}`);
  return npc;
}

/** Decides what bumping into `entity` does, given the current state. */
export function describeInteraction(state: GameState, entity: EntityDef): Interaction {
  if (entity.kind === 'monster') {
    const enemy = ENEMIES[entity.enemyId];
    if (!enemy) throw new Error(`Unknown enemy: ${entity.enemyId}`);
    return {
      kind: 'challenge',
      title: enemy.name,
      sprite: enemy.sprite,
      text: enemy.description,
      spec: { kind: 'combat', enemyId: enemy.id },
      rewards: [],
    };
  }

  const npc = npcFor(entity);
  const speaker = { title: npc.name, sprite: npc.sprite };
  if (!npc.repeatable && state.flags.has(npcCompletionFlag(npc))) {
    return { kind: 'message', ...speaker, text: npc.doneText ?? '...' };
  }
  const spec = npc.challenge;
  if (spec.kind === 'offering' && itemCount(state.hero, spec.itemId) < 1) {
    return { kind: 'needsItem', ...speaker, text: npc.greeting, itemId: spec.itemId };
  }
  return { kind: 'challenge', ...speaker, text: npc.greeting, spec, rewards: npc.rewards };
}

/**
 * Applies a finished battle to the game state: spoils and level-ups for
 * fights, item hand-overs and rewards for NPCs, and respawning on defeat.
 */
export function resolveBattle(
  state: GameState,
  entity: EntityDef,
  battle: Battle,
  rng: Rng,
): Resolution {
  const won = battle.status === 'won';
  return entity.kind === 'monster'
    ? resolveCombat(state, entity, battle, won, rng)
    : resolveNpc(state, npcFor(entity), battle, won);
}

function resolveCombat(
  state: GameState,
  entity: EntityDef,
  battle: Battle,
  won: boolean,
  rng: Rng,
): Resolution {
  const hero = state.hero;
  const combat = battle.challenge;
  if (!(combat instanceof CombatChallenge)) throw new Error('Expected a combat battle');
  const gains: Gain[] = [];

  if (won) {
    const spoils = rollSpoils(combat.enemy, rng);
    gains.push({ kind: 'xp', amount: spoils.xp }, { kind: 'gil', amount: spoils.gil });
    hero.gil += spoils.gil;
    for (const itemId of spoils.drops) {
      addItem(hero, itemId);
      gains.push({ kind: 'item', itemId, count: 1 });
    }
    if (gainXp(hero, spoils.xp) > 0) gains.push({ kind: 'level', level: hero.level });
    markDefeated(state, entity);
  } else {
    const lost = Math.floor(hero.gil / 2);
    hero.gil -= lost;
    hero.hp = hero.maxHp;
    fillMana(hero);
    travel(state, state.respawn);
    if (lost > 0) gains.push({ kind: 'gil', amount: -lost });
  }
  return { won, gains, speech: null, fell: !won, shopId: null, priceMultiplier: 1 };
}

function resolveNpc(state: GameState, npc: NpcDef, battle: Battle, won: boolean): Resolution {
  if (!won) {
    return { won, gains: [], speech: npc.failText, fell: false, shopId: null, priceMultiplier: 1 };
  }

  const spec = npc.challenge;
  const given: Gain[] = [];
  if (spec.kind === 'offering' && removeItem(state.hero, spec.itemId)) {
    given.push({ kind: 'item', itemId: spec.itemId, count: -1 });
  }
  const outcome = grantRewards(state.hero, state.flags, npc.rewards);
  if (!npc.repeatable) state.flags.add(npcCompletionFlag(npc));
  const haggle = battle.challenge instanceof HaggleChallenge ? battle.challenge : null;
  return {
    won,
    gains: [...given, ...outcome.gains],
    speech: npc.successText,
    fell: false,
    shopId: outcome.shopId,
    priceMultiplier: haggle?.multiplier ?? 1,
  };
}
