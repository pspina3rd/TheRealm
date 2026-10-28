import type { Battle } from '../battle/battle';
import { encounterOf } from '../data/encounters';
import { NPCS } from '../data/npcs';
import { ITEMS } from '../data/items';
import { SPELLS } from '../data/spells';
import { spellName } from './spells';
import { MENTORS } from '../data/mentors';
import type { ChallengeSpec, Reward } from '../data/types';
import type { GameState } from '../world/state';
import type { Attitude } from './attitude';
import {
  assistOffered,
  beginTry,
  blockedReason,
  firstTry,
  recordOf,
  strainFor,
  type StakesRules,
} from './stakes';

export interface StakesCard {
  readonly win: string;
  readonly objective: string;
  readonly fail: string;
  readonly strain: number;
  readonly retry: string;
  readonly blockedReason: string | null;
  readonly assist?: { readonly mentorId: string; readonly label: string };
}
export interface BrowseOffer {
  readonly shopId: string;
  readonly priceMultiplier: number;
  readonly attitude: Attitude;
}

/** Only the approved M1 slice adopts the new state flow. */
export function flowFor(spec: ChallengeSpec): { id: string; rules: StakesRules } | null {
  if (spec.kind === 'lesson' && spec.mentorId === 'hazel') {
    return {
      id: `lesson:${spec.mentorId}:${spec.spellId}`,
      rules: {
        personId: spec.mentorId,
        retry: 'nowOnce',
        repeatable: false,
        threshold: false,
        strains: false,
      },
    };
  }
  if (spec.kind !== 'encounter') return null;
  const def = encounterOf(spec.id);
  if (!def) return null;
  return {
    id: spec.id,
    rules: {
      personId: spec.id,
      retry: def.retry,
      repeatable: NPCS[spec.id]?.repeatable ?? false,
      threshold: !!def.assist,
      strains: true,
    },
  };
}

export function encounterSpec(
  state: GameState,
  id: string,
  assisted = false,
): Extract<ChallengeSpec, { kind: 'encounter' }> {
  return {
    kind: 'encounter',
    id,
    strain: strainFor(state, id, assisted),
    demo: firstTry(state, id),
    assisted,
  };
}

const RETRY = {
  now: 'Try again now.',
  nowOnce: 'One retry now; after that, win a monster fight before retrying.',
  wait: 'After a loss, win a monster fight before retrying.',
  day: 'One try per day. Rest at an inn to end the day.',
};

export function stakesCard(
  state: GameState,
  spec: ChallengeSpec,
  rewards: readonly Reward[],
): StakesCard {
  const flow = flowFor(spec);
  if (!flow) throw new Error('No M1 stakes for this challenge');
  const blocked = blockedReason(state, flow.id, flow.rules);
  const record = recordOf(state, flow.id);
  const blockedText =
    blocked === 'wait'
      ? 'Win a monster fight before trying again.'
      : blocked === 'day'
        ? 'Rest at an inn before trying again.'
        : null;
  if (spec.kind === 'lesson')
    return {
      win: `Learn or strengthen ${spellLabel(spec.spellId)}.`,
      objective: 'Break the mentor’s shield with the spell being taught, then win the fight.',
      fail: 'Regard falls. A spell you already know is sealed until you win its lesson or three monster fights. Only one spell can be sealed.',
      strain: 0,
      retry: RETRY.nowOnce,
      blockedReason: blockedText,
    };
  if (spec.kind !== 'encounter') throw new Error('Expected encounter');
  const def = encounterOf(spec.id);
  if (!def) throw new Error(`Unknown encounter: ${spec.id}`);
  const target =
    def.spec.verb === 'plant'
      ? def.spec.params.target + record.strain * def.spec.params.strainTarget
      : 0;
  const rewardText = rewards
    .map((reward) => {
      switch (reward.kind) {
        case 'gil':
          return `${record.wins > 0 ? Math.floor(reward.amount / 2) : reward.amount} gil`;
        case 'item':
          return `${reward.count} ${ITEMS[reward.itemId]?.name ?? reward.itemId}`;
        case 'spell':
          return spellLabel(reward.spellId);
        case 'shop':
          return 'lower shop prices until you leave town (an Even keeps prices unchanged)';
        case 'flag':
          return reward.flag === 'cavePass' ? 'a pass into the caves' : 'story progress';
      }
    })
    .join(', ');
  const assist =
    assistOffered(state, flow.id, flow.rules) && def.assist
      ? {
          mentorId: def.assist.mentorId,
          label: `With ${MENTORS[def.assist.mentorId]?.name ?? def.assist.mentorId}’s help (gil kept; no bonus or regard).`,
        }
      : undefined;
  return {
    win: `${rewardText ? rewardText + '. ' : ''}${def.world.win.text}.`,
    objective: def.objective.replace('{target}', String(target)),
    fail:
      def.spec.verb === 'duel'
        ? `${def.failText}. Browse prices rise until you win a haggle or two days pass. ${def.strainText}; regard falls.`
        : `${def.failText}. ${def.strainText}; regard falls.`,
    strain: record.strain,
    retry:
      RETRY[def.retry] +
      (flow.rules.repeatable
        ? ' After a win, replay next day for half gil; regard can only recover.'
        : ''),
    blockedReason: blockedText,
    ...(assist ? { assist } : {}),
  };
}

const committed = new WeakSet<Battle>();
export function battleTryCommitted(battle: Battle): boolean {
  return committed.has(battle);
}

/** Called immediately before an actual post-demo player input, then saved by App. */
export function commitBattleTry(state: GameState, battle: Battle): boolean {
  if (committed.has(battle)) return true;
  if (battle.demoPlaying || battle.paused || battle.status !== 'ongoing') return false;
  const flow = flowFor(battle.spec);
  if (!flow) return true;
  if (blockedReason(state, flow.id, flow.rules)) return false;
  if (
    battle.spec.kind === 'encounter' &&
    battle.spec.assisted &&
    !assistOffered(state, flow.id, flow.rules)
  )
    return false;
  beginTry(state, flow.id);
  if (battle.spec.kind === 'encounter' && battle.spec.assisted) {
    recordOf(state, flow.id).strain = 0;
  }
  committed.add(battle);
  return true;
}

function spellLabel(id: string): string {
  const spell = SPELLS[id];
  return spell ? spellName(spell) : id;
}
