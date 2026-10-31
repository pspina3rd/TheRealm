/** Purpose comes from the authored task, never from treating every speaker as an enemy. */
import { ELEMENT_NAMES, ELEMENT_OF_COLOR } from '../core/elements';
import type { CrystalColor } from '../core/pieces';
import { ENCOUNTER_DEFS } from '../data/encounters';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { MENTORS } from '../data/mentors';
import { NPCS } from '../data/npcs';
import type { ChallengeSpec, EnemyMove } from '../data/types';
import { standardName } from './spellNames';

export interface EncounterIntent {
  readonly role: 'battle' | 'practice' | 'cooperate' | 'contest' | 'trial';
  readonly label: string;
  readonly goal: string;
  readonly blocks: string;
  readonly pressure: string;
  readonly counterplay: string;
}

/** Identifies the same actor on the offer and in the live encounter. */
export function encounterActor(title: string): string | undefined {
  return (
    Object.values(NPCS).find((npc) => npc.name === title)?.id ??
    Object.values(MENTORS).find((mentor) => mentor.name === title)?.id
  );
}

const TASK_GOALS: Readonly<Record<string, string>> = {
  archiveDrain: 'Clear the pallet over the drain so Odile can dry the landing.',
  cisternTrial: 'Keep Odile’s test channel steady without opening the sleeping chambers.',
  rootTram: 'Brace the lifted rail so Rafe can run the tram safely.',
  ketterRescue: 'Secure the damaged lift before bringing Ketter out.',
  bellCircuit: 'Seat the fittings so Ketter’s return cord runs freely.',
  foundryProcedure: 'Complete the inspection rail in its recorded order.',
  ascentRepair: 'Support the fallen beam and reopen the ascent.',
  fennickRite: 'Complete Fennick’s outer stations before the rite.',
  foreman: 'Clear the rubble so Flint can reopen the ridge road.',
  apprentice: 'Help Cinda complete the forge work that opens the peak road.',
  fisher: 'Help Tam repair the torn fishing nets.',
  scholar: 'Relight Ivo’s darkened moon rune with violet crystals.',
  collector: 'Clean the Goblin Charm Nim asks you to bring.',
  beaconKeeper: 'Supply the crystals Ysolde needs for the beacon.',
  courier: 'Recover Twitch’s scattered letters.',
  sage: 'Repair Orrin’s storm-damaged roof lattice with the supplied pieces.',
  sealedChest: 'Fit the supplied pieces to release the chest’s seal.',
  hermit: 'Grind a Moon Shard into salves for the cave hermit.',
};

const VERB_INTENTS = {
  dig: {
    blocks:
      'The mold and debris cover the marked pipe. The pipe is the objective, not an enemy block.',
    pressure:
      'Mold rises from the well; new buried holes bring the next rise sooner. Rowan is helping clear it.',
    counterplay: 'Clear the pipe’s row before debris crosses the lip. Watch the warned rising row.',
  },
  build: {
    blocks:
      'The outline is Pip’s tower; the spare area is his toy box. Supplied pieces are building material.',
    pressure:
      'Misplaced pieces crack or unbalance the tower. Pip is not placing hostile obstructions.',
    counterplay: 'Fit pieces inside the outline; put unsuitable pieces in the spare area.',
  },
  plant: {
    blocks: 'Colored furrows want matching crystals. Inert soil ridges and paths are not crops.',
    pressure:
      'Sundown limits the available pieces. Bean supplies planting material rather than attacking the board.',
    counterplay:
      'Clear lines with matching colors in their furrows; use the zone markers to plan placements.',
  },
  contain: {
    blocks:
      'Marked rot is the hazard; young caps are protected. These have different roles even in the same row.',
    pressure:
      'Rot spreads into adjacent crystals and can kill young caps. Wren wants the caps saved.',
    counterplay:
      'Clear the rot and save enough young caps. The preview marks where rot can spread next.',
  },
  duel: {
    blocks:
      'Incoming rows are the merchant’s counter-offer in a price contest, not a physical attack.',
    pressure:
      'The merchant defends the asking price with warned sends. Your clears can cancel pending rows.',
    counterplay:
      'Use multi-line clears to send rows and improve the price; singles do not send rows.',
  },
  charge: {
    blocks:
      'Each lamp requests a color threshold. Only crystals of that color count toward its charge.',
    pressure:
      'Wind threatens lit lamps. Vale is protecting the wards, not sabotaging your progress.',
    counterplay:
      'Meet the blue and violet color counts to light all displayed lamps; watch the threatened lamp.',
  },
} as const;

export function encounterIntent(spec: ChallengeSpec, actorId?: string): EncounterIntent {
  if (spec.kind === 'encounter') {
    const def = ENCOUNTER_DEFS[spec.id];
    if (!def) throw new Error(`Unknown encounter intent: ${spec.id}`);
    const details = VERB_INTENTS[def.spec.verb];
    const target =
      def.spec.verb === 'plant'
        ? def.spec.params.target + spec.strain * def.spec.params.strainTarget
        : '';
    return {
      role: def.spec.verb === 'duel' ? 'contest' : 'cooperate',
      label: def.spec.verb === 'duel' ? 'Price contest' : 'Working together',
      goal:
        def.spec.verb === 'charge'
          ? `Light all ${def.spec.params.lamps.length + spec.strain * def.spec.params.strainLamps} ward lamps. Each clear needs at least ${def.spec.params.purity} crystals of its lamp’s color.`
          : def.objective.replace('{target}', String(target)),
      ...details,
    };
  }
  if (spec.kind === 'lesson') {
    const school = standardName(spec.spellId) ?? 'the taught spell';
    const mentor = MENTORS[spec.mentorId]?.name ?? 'The mentor';
    return {
      role: 'practice',
      label: 'Spell practice',
      goal: `Practice ${school}, break its matching shield, then win the lesson.`,
      blocks: `${mentor} provides a target for the taught effect. A practice target is not a random enemy attack.`,
      pressure:
        'The trial foe tests your timing. The mentor lends an unlearned spell and may supply helpful pieces.',
      counterplay:
        'Earn matching mana, then use the named Practice action. The spell becomes yours only after a win.',
    };
  }
  if (spec.kind === 'combat') {
    const enemy = ENEMIES[spec.enemyId];
    return {
      role: 'battle',
      label: 'Battle',
      goal: `Defeat ${enemy?.name ?? spec.enemyId} before your HP runs out.`,
      blocks: enemy?.description ?? 'Enemy board moves interfere with your placements.',
      pressure:
        spec.enemyId === 'slime'
          ? 'Goo clogs a supported landing space.'
          : spec.enemyId === 'goblin'
            ? 'Rubble blocks the mouth of an open clearing well.'
            : 'The opponent uses its authored attacks and board moves; its next move is shown before it acts.',
      counterplay:
        'Read the next move and its marked target. Use row clears, required color contacts or a suitable learned spell.',
    };
  }
  const taskGoal = actorId ? TASK_GOALS[actorId] : undefined;
  const imposed = actorId?.startsWith('vesper') === true;
  if (spec.kind === 'barter') {
    const wants = Object.entries(spec.wants)
      .map(
        ([color, amount]) =>
          `${amount} ${ELEMENT_NAMES[ELEMENT_OF_COLOR[color as CrystalColor]].toLowerCase()}`,
      )
      .join(', ');
    return {
      role: 'cooperate',
      label: 'Requested materials',
      goal: taskGoal ?? `Gather the requested crystals: ${wants}.`,
      blocks: `The requested colors are the materials for this task: ${wants}. Other colors do not fill those quotas.`,
      pressure: `You have ${spec.pieceLimit} pieces to finish the task. The requester does not inject enemy obstructions.`,
      counterplay:
        'Arrange clears that collect the requested colors, using the visible remaining quotas.',
    };
  }
  if (spec.kind === 'haggle')
    return {
      role: 'contest',
      label: 'Price negotiation',
      goal: 'Finish the negotiation at the best price you can achieve.',
      blocks:
        'Your clears represent the strength of your offer. No obstruction is secretly added by the merchant.',
      pressure: 'The merchant raises the price on a timer while you negotiate.',
      counterplay:
        'Clear lines to lower the price before the piece limit; the price meter shows the current offer.',
    };
  if (spec.kind === 'offering')
    return {
      role: 'trial',
      label: imposed ? 'Imposed trial' : 'Offering',
      goal: taskGoal ?? `Complete the offering with ${spec.targetScore} points.`,
      blocks: `The supplied board is the offering’s trial. The ${ITEMS[spec.itemId]?.name ?? spec.itemId} is its entry item, not an obstacle.`,
      pressure: `The trial ends after ${spec.pieceLimit} pieces; there is no hidden enemy obstruction routine.`,
      counterplay: 'Place carefully and clear lines to reach the displayed score target.',
    };
  return {
    role: imposed ? 'trial' : 'cooperate',
    label: imposed ? 'Imposed trial' : taskGoal ? 'Repair / task' : 'Arranged puzzle',
    goal:
      taskGoal ??
      `Complete the arranged puzzle by clearing ${spec.linesToClear} row${spec.linesToClear === 1 ? '' : 's'}.`,
    blocks:
      'The fixed blocks are the authored structure to solve. Supplied pieces are the available tools.',
    pressure:
      'The recorded layout and limited queue define the problem; no character adds random obstructions.',
    counterplay: 'Inspect the fixed layout and next pieces, then complete the required clears.',
  };
}

/** A move's purpose is player-facing behavior, not an implementation/profile label. */
export function enemyMovePurpose(move: EnemyMove): {
  goal: string;
  counterplay: string;
} {
  switch (move.kind) {
    case 'obstruct':
      return {
        goal: 'Block the marked placement space.',
        counterplay:
          'Fill the warned space before delivery to stop that placement, or deal with the block after it arrives. Wind can push it sideways; rows, matching contacts, Lightning or Nature can remove it.',
      };
    case 'petrify':
      return {
        goal: 'Turn usable crystals into inert enemy stone and deny their mana.',
        counterplay:
          'Clear the stone’s row, push it with Wind, break it with Lightning or convert it with Nature.',
      };
    case 'curse':
      return {
        goal: 'Raise the stack with rubble and reduce your remaining headroom.',
        counterplay:
          'Use the row gaps to clear rubble. Wind can move blocks; Lightning and Nature can deal with individual enemy stones.',
      };
    case 'seal':
      return {
        goal: `Close a column for ${move.pieces} placements, restricting where pieces can go.`,
        counterplay:
          'Place in the open columns until the seal expires. A column seal is not a removable stone block.',
      };
    case 'drain':
      return {
        goal: 'Drain mana from your fullest pool.',
        counterplay:
          'Use earned mana when a useful cast is available; the next move tells you when the drain is coming.',
      };
    case 'heal':
      return {
        goal: 'Restore the opponent’s HP and prolong the fight.',
        counterplay: 'Keep earning line strikes; healing does not add an obstruction to the board.',
      };
    case 'fog':
      return {
        goal: `Hide the next-piece preview for ${move.pieces} placements.`,
        counterplay:
          'Work from the current piece and keep landing space open until the preview returns.',
      };
    case 'haste':
      return {
        goal: `Make pieces fall faster for ${move.pieces} placements.`,
        counterplay: 'Keep the stack low and use the landing guide to place before pieces settle.',
      };
    case 'quicken':
      return {
        goal: 'Temporarily accelerate falling pieces.',
        counterplay: 'Plan shorter placements until the speed effect expires.',
      };
    case 'attack':
      return {
        goal: 'Reduce your HP.',
        counterplay:
          'Keep earning clears and use carried healing when needed. This move does not place blocks.',
      };
  }
}
