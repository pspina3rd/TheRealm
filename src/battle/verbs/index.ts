import { ENCOUNTER_DEFS, type EncounterDef } from '../../data/encounters';
import type { ChallengeSpec } from '../../data/types';
import type { BattleContext, Challenge } from '../types';
import { BuildChallenge } from './build';
import { ChargeChallenge } from './charge';
import { ContainChallenge } from './contain';
import { DigChallenge } from './dig';
import { DuelChallenge } from './duel';
import { PlantChallenge } from './plant';

export type EncounterSpec = Extract<ChallengeSpec, { kind: 'encounter' }>;

/** The definition behind an encounter spec; throws for an unknown one. */
export function encounterDef(spec: EncounterSpec): EncounterDef {
  const def = Object.hasOwn(ENCOUNTER_DEFS, spec.id) ? ENCOUNTER_DEFS[spec.id] : undefined;
  if (!def) throw new Error(`Unknown encounter: ${spec.id}`);
  return def;
}

/** The verb's challenge for an encounter, at the spec's strain (and demo, for the duel). */
export function createEncounterChallenge(ctx: BattleContext, spec: EncounterSpec): Challenge {
  const def = encounterDef(spec);
  const { spec: verb } = def;
  switch (verb.verb) {
    case 'dig':
      return new DigChallenge(ctx, verb.params, spec.strain);
    case 'build':
      return new BuildChallenge(ctx, verb.params, spec.strain);
    case 'plant':
      return new PlantChallenge(ctx, verb.params, spec.strain);
    case 'duel':
      return new DuelChallenge(ctx, verb.params, spec.strain, spec.demo);
    case 'contain':
      return new ContainChallenge(ctx, verb.params, spec.strain);
    case 'charge':
      return new ChargeChallenge(
        ctx,
        {
          ...verb.params,
          pieceLimit: verb.params.pieceLimit + (spec.assisted ? (def.assist?.extraPieces ?? 0) : 0),
        },
        spec.strain,
      );
  }
}
