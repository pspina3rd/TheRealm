import { CombatChallenge, rollSpoils } from '../battle/combat';
import { HaggleChallenge } from '../battle/haggle';
import type { Battle } from '../battle/battle';
import type { Rng } from '../core/rng';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { NPCS } from '../data/npcs';
import type { ChallengeSpec, NpcDef } from '../data/types';
import type { EntityDef } from '../world/map';
import { markDefeated, travel, type GameState } from '../world/state';
import { addItem, gainXp, itemCount, removeItem } from './hero';
import { grantRewards } from './rewards';

/** What happens when the hero bumps into an entity. */
export type Interaction =
  /** Just show text; no battle (e.g. a finished quest, or a missing offering). */
  | { readonly kind: 'message'; readonly title: string; readonly text: string }
  /** Offer a battle the player can accept or decline. */
  | {
      readonly kind: 'challenge';
      readonly title: string;
      readonly text: string;
      readonly spec: ChallengeSpec;
    };

/** The result of a finished battle, after it has been applied to the game state. */
export interface Resolution {
  readonly won: boolean;
  readonly messages: string[];
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
      text: `${enemy.description} (Lv ${enemy.level})`,
      spec: { kind: 'combat', enemyId: enemy.id },
    };
  }

  const npc = npcFor(entity);
  if (!npc.repeatable && state.flags.has(npcCompletionFlag(npc))) {
    return { kind: 'message', title: npc.name, text: npc.doneText ?? '...' };
  }
  const spec = npc.challenge;
  if (spec.kind === 'offering' && itemCount(state.hero, spec.itemId) < 1) {
    const item = ITEMS[spec.itemId]?.name ?? spec.itemId;
    return { kind: 'message', title: npc.name, text: `${npc.greeting} (You need a ${item}.)` };
  }
  return { kind: 'challenge', title: npc.name, text: npc.greeting, spec };
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
  const messages: string[] = [];

  if (won) {
    const spoils = rollSpoils(combat.enemy, rng);
    messages.push(`${combat.enemy.name} defeated! +${spoils.xp} XP, +${spoils.gil} gil.`);
    hero.gil += spoils.gil;
    for (const itemId of spoils.drops) {
      addItem(hero, itemId);
      messages.push(`It dropped ${ITEMS[itemId]?.name ?? itemId}.`);
    }
    const levels = gainXp(hero, spoils.xp);
    if (levels > 0) messages.push(`LEVEL UP! You are now level ${hero.level}.`);
    markDefeated(state, entity);
  } else {
    const lost = Math.floor(hero.gil / 2);
    hero.gil -= lost;
    hero.hp = hero.maxHp;
    hero.mp = hero.maxMp;
    travel(state, state.respawn);
    messages.push(`You have fallen... You wake at a safe haven, ${lost} gil lighter.`);
  }
  return { won, messages, shopId: null, priceMultiplier: 1 };
}

function resolveNpc(state: GameState, npc: NpcDef, battle: Battle, won: boolean): Resolution {
  if (!won) return { won, messages: [npc.failText], shopId: null, priceMultiplier: 1 };

  const spec = npc.challenge;
  if (spec.kind === 'offering') removeItem(state.hero, spec.itemId);
  const outcome = grantRewards(state.hero, state.flags, npc.rewards);
  if (!npc.repeatable) state.flags.add(npcCompletionFlag(npc));
  const haggle = battle.challenge instanceof HaggleChallenge ? battle.challenge : null;
  return {
    won,
    messages: [npc.successText, ...outcome.messages],
    shopId: outcome.shopId,
    priceMultiplier: haggle?.multiplier ?? 1,
  };
}
