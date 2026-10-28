import { CombatChallenge, rollSpoils } from '../battle/combat';
import { HaggleChallenge } from '../battle/haggle';
import type { Battle } from '../battle/battle';
import type { Rng } from '../core/rng';
import { ENEMIES } from '../data/enemies';
import { START } from '../data/maps';
import { MENTORS, type MentorDef } from '../data/mentors';
import { NPCS } from '../data/npcs';
import type { ChallengeSpec, NpcDef, Reward } from '../data/types';
import type { EntityDef } from '../world/map';
import { markDefeated, travel, type GameState } from '../world/state';
import {
  ATTITUDE_PRICES,
  attitudeOf,
  challengeOnTerms,
  dealTerms,
  introFor,
  lineKey,
  moodFor,
  npcNow,
  rewardsOnTerms,
  say,
  type Attitude,
} from './attitude';
import { FINALE_FLAG, epilogueFor, type Epilogue } from './ending';
import { hiddenSlots, type HiddenSlot } from './hidden';
import { noteSaid, pickVariant, variantsFor, variantsOf } from './lines';
import { mentorGreeting } from './mentorLines';
import { preludeFor } from './story';
import { addItem, gainXp, itemCount, removeItem } from './hero';
import { completeLesson, lessonsFor, type Lesson } from './lessons';
import { grantRewards, type Gain } from './rewards';
import { isCategoryLocked, type FailedLesson } from './spells';
import { SKILL_POINTS_PER_LEVEL, dropBonus } from './stats';
import { FALL_HP_SHARE, HOME_FALL_HP_SHARE } from '../data/balance';
export { FALL_HP_SHARE, HOME_FALL_HP_SHARE } from '../data/balance';

/** Who is speaking in an interaction, for the conversation screen. */
interface Speaker {
  readonly title: string;
  /** Creature sprite key of the speaker. */
  readonly sprite: string;
  /** What they say. */
  readonly text: string;
  /** How an NPC feels about the hero (shown as a face); absent for monsters and mentors. */
  readonly attitude?: Attitude;
}

/** What happens when the hero bumps into an entity. */
export type Interaction =
  /** Just talk; no battle (a finished quest). */
  | (Speaker & { readonly kind: 'message' })
  /** An offering the hero can't make yet: shows the item they need. */
  | (Speaker & { readonly kind: 'needsItem'; readonly itemId: string })
  /** A mentor with lessons to teach: the player picks one, or leaves. */
  | (Speaker & {
      readonly kind: 'lessons';
      readonly mentorId: string;
      readonly lessons: readonly Lesson[];
      /** The lesson the hero lost here and must win to lift the lock, if any. */
      readonly failed: FailedLesson | null;
      /** The mentor's hidden spells still unrevealed, shown as silhouettes. */
      readonly silhouettes: readonly HiddenSlot[];
    })
  /** Offer a battle the player can accept or decline. */
  | (Speaker & {
      readonly kind: 'challenge';
      /** The challenge on the NPC's terms (harder when Wary). */
      readonly spec: ChallengeSpec;
      /** What winning earns (empty for monsters, whose spoils vary). */
      readonly rewards: readonly Reward[];
      /** What the NPC's warmth adds to the rewards. */
      readonly extras: readonly Reward[];
      /** The attitude an NPC deals on (Hostile essential NPCs deal as Wary). */
      readonly terms?: Attitude;
      /** What a boss says before its fight, shown as an interlude (the Wyrm's lair). */
      readonly prelude?: string;
      /** What an NPC says when the hero accepts or declines. */
      readonly replies?: Replies;
    });

/**
 * What an NPC says when the hero accepts or declines. Only one is ever
 * said, so neither is counted until it is (see `reply`).
 */
export interface Replies {
  readonly accept: string;
  readonly decline: string;
  /** The rotation keys the two lines count under. */
  readonly keys: { readonly accept: string; readonly decline: string };
}

/** Says the accept or decline reply: counts it, so that line rotates, and returns it. */
export function reply(state: GameState, replies: Replies, which: 'accept' | 'decline'): string {
  noteSaid(state.talk, replies.keys[which]);
  return replies[which];
}

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
  /** Price multiplier for that shop: the haggle's result times the keeper's attitude price. */
  readonly priceMultiplier: number;
  /** The terms an NPC dealt on (for a shop's face and secret stock); null for others. */
  readonly attitude: Attitude | null;
  /** Set when the battle ended the chapter. */
  readonly epilogue?: Epilogue;
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

/** The creature sprite key an entity is drawn with, or undefined for an unknown reference. */
export function entitySprite(entity: EntityDef): string | undefined {
  switch (entity.kind) {
    case 'monster':
      return ENEMIES[entity.enemyId]?.sprite;
    case 'npc':
      return NPCS[entity.npcId]?.sprite;
    case 'mentor':
      return MENTORS[entity.mentorId]?.sprite;
  }
}

/** How a person on the map feels about the hero; null for monsters, mentors and things. */
export function entityAttitude(state: GameState, entity: EntityDef): Attitude | null {
  if (entity.kind !== 'npc') return null;
  const npc = NPCS[entity.npcId];
  return npc && !npc.inanimate ? attitudeOf(state.hero, npc) : null;
}

function mentorFor(entity: EntityDef): MentorDef {
  if (entity.kind !== 'mentor') throw new Error(`${entity.id} is not a mentor`);
  const mentor = MENTORS[entity.mentorId];
  if (!mentor) throw new Error(`Unknown mentor: ${entity.mentorId}`);
  return mentor;
}

/**
 * Decides what bumping into `entity` does, given the current state. What is
 * said is counted in `state.talk`, so each call rotates the speaker's lines.
 */
export function describeInteraction(state: GameState, entity: EntityDef): Interaction {
  if (entity.kind === 'mentor') {
    const mentor = mentorFor(entity);
    const lessons = lessonsFor(state, mentor);
    const silhouettes = hiddenSlots(state, mentor.element).filter(
      (slot) => slot.state === 'hidden',
    );
    const speaker = {
      title: mentor.name,
      sprite: mentor.sprite,
      text: mentorGreeting(state, mentor),
    };
    return lessons.length + silhouettes.length > 0
      ? {
          kind: 'lessons',
          ...speaker,
          mentorId: mentor.id,
          lessons,
          failed: isCategoryLocked(state.hero, mentor.element)
            ? (state.hero.failedLessons[mentor.element] ?? null)
            : null,
          silhouettes,
        }
      : { kind: 'message', ...speaker };
  }
  if (entity.kind === 'monster') {
    const enemy = ENEMIES[entity.enemyId];
    if (!enemy) throw new Error(`Unknown enemy: ${entity.enemyId}`);
    const prelude = preludeFor(enemy.id, state.talk);
    return {
      kind: 'challenge',
      title: enemy.name,
      sprite: enemy.sprite,
      text: enemy.description,
      spec: { kind: 'combat', enemyId: enemy.id },
      rewards: [],
      extras: [],
      ...(prelude ? { prelude } : {}),
    };
  }

  const npc = npcNow(npcFor(entity), state.flags);
  const attitude = attitudeOf(state.hero, npc);
  const speaker = { title: npc.name, sprite: npc.sprite, ...(npc.inanimate ? {} : { attitude }) };
  if (!npc.repeatable && state.flags.has(npcCompletionFlag(npc))) {
    return {
      kind: 'message',
      ...speaker,
      text: say(npc.lines.done ?? '...', attitude, state.talk, lineKey(npc, 'done')),
    };
  }
  const terms = dealTerms(npc, attitude);
  if (!terms) {
    const text = say(npc.lines.refuse ?? '...', attitude, state.talk, lineKey(npc, 'refuse'));
    return { kind: 'message', ...speaker, text };
  }
  const text = introFor(npc, attitude, state.talk);
  const spec = challengeOnTerms(npc.challenge, terms);
  if (spec.kind === 'offering' && itemCount(state.hero, spec.itemId) < 1) {
    return { kind: 'needsItem', ...speaker, text, itemId: spec.itemId };
  }
  const { base, extras } = rewardsOnTerms(state.hero, npc, terms);
  return {
    kind: 'challenge',
    ...speaker,
    text,
    spec,
    rewards: base,
    extras,
    terms,
    replies: {
      accept: say(npc.lines.accept, terms, state.talk, lineKey(npc, 'accept'), false),
      decline: say(npc.lines.decline, terms, state.talk, lineKey(npc, 'decline'), false),
      keys: { accept: lineKey(npc, 'accept'), decline: lineKey(npc, 'decline') },
    },
  };
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
  terms?: Attitude,
): Resolution {
  const won = battle.status === 'won';
  if (entity.kind === 'mentor') return resolveLesson(state, mentorFor(entity), battle, won);
  if (entity.kind === 'monster') return resolveCombat(state, entity, battle, won, rng);
  if (!terms) throw new Error('An NPC battle needs the terms it was offered on');
  return resolveNpc(state, npcNow(npcFor(entity), state.flags), battle, won, terms);
}

function resolveLesson(
  state: GameState,
  mentor: MentorDef,
  battle: Battle,
  won: boolean,
): Resolution {
  const spec = battle.spec;
  if (spec.kind !== 'lesson') throw new Error('Expected a lesson');
  return {
    won,
    gains: completeLesson(state.hero, spec, won),
    speech: won
      ? pickVariant(variantsOf(mentor.winText), state.talk, `${mentor.id}.win`)
      : pickVariant(variantsOf(mentor.loseText), state.talk, `${mentor.id}.lose`),
    fell: false,
    shopId: null,
    priceMultiplier: 1,
    attitude: null,
  };
}

/**
 * What an NPC (as it speaks now, see `npcNow`) says on a won challenge: its
 * "already knowing the spell" line if it has one left, else its win line.
 */
function winSpeech(state: GameState, npc: NpcDef, terms: Attitude, knewSpell: boolean): string {
  const winKnown = npc.lines.winKnown;
  return knewSpell && winKnown && variantsFor(winKnown, moodFor(terms)).length > 0
    ? say(winKnown, terms, state.talk, lineKey(npc, 'winKnown'))
    : say(npc.lines.win, terms, state.talk, lineKey(npc, 'win'));
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
    const spoils = rollSpoils(combat.enemy, rng, dropBonus(hero.stats.luck));
    gains.push({ kind: 'xp', amount: spoils.xp }, { kind: 'gil', amount: spoils.gil });
    hero.gil += spoils.gil;
    for (const itemId of spoils.drops) {
      addItem(hero, itemId);
      gains.push({ kind: 'item', itemId, count: 1 });
    }
    const levels = gainXp(hero, spoils.xp);
    if (levels > 0) {
      gains.push({ kind: 'level', level: hero.level, points: levels * SKILL_POINTS_PER_LEVEL });
    }
    markDefeated(state, entity);
    if (combat.enemy.finale) state.flags.add(FINALE_FLAG);
  } else {
    const lost = Math.floor(hero.gil / 2);
    hero.gil -= lost;
    const share = state.respawn.map === START.map ? HOME_FALL_HP_SHARE : FALL_HP_SHARE;
    hero.hp = Math.max(1, Math.ceil(hero.maxHp * share));
    travel(state, state.respawn);
    if (lost > 0) gains.push({ kind: 'gil', amount: -lost });
  }
  return {
    won,
    gains,
    speech: null,
    fell: !won,
    shopId: null,
    priceMultiplier: 1,
    attitude: null,
    ...(won && combat.enemy.finale ? { epilogue: epilogueFor(hero) } : {}),
  };
}

/** Settles an NPC's challenge on the terms it was offered on (see `describeInteraction`). */
function resolveNpc(
  state: GameState,
  npc: NpcDef,
  battle: Battle,
  won: boolean,
  terms: Attitude,
): Resolution {
  const ended = { won, fell: false, attitude: terms };
  if (!won) {
    return {
      ...ended,
      gains: [],
      speech: say(npc.lines.lose, terms, state.talk, lineKey(npc, 'lose')),
      shopId: null,
      priceMultiplier: 1,
    };
  }

  const spec = npc.challenge;
  const given: Gain[] = [];
  if (spec.kind === 'offering' && removeItem(state.hero, spec.itemId)) {
    given.push({ kind: 'item', itemId: spec.itemId, count: -1 });
  }
  const { base, extras, knewSpell } = rewardsOnTerms(state.hero, npc, terms);
  const outcome = grantRewards(state.hero, state.flags, [...base, ...extras]);
  if (!npc.repeatable) state.flags.add(npcCompletionFlag(npc));
  const haggle = battle.challenge instanceof HaggleChallenge ? battle.challenge : null;
  return {
    ...ended,
    gains: [...given, ...outcome.gains],
    speech: winSpeech(state, npc, terms, knewSpell),
    shopId: outcome.shopId,
    priceMultiplier: (haggle?.multiplier ?? 1) * ATTITUDE_PRICES[terms],
  };
}
