import type { Element } from '../core/elements';

/** Addendum A rev 3 §3. Starting values, inactive until runtime integration. */
export const SYNERGY = {
  maximum: 100,
  mentorSurge: 10,
  latestTossLock: 10,
  minimumTossCells: 2,
  mentorReaction: 15,
  gaugeShare: 0.25,
  baseDamage: 18,
  damagePerDifficulty: 6,
  hazardCap: 4,
  ruleDelayPieces: 3,
} as const;

export type SynergyMentorId = 'hazel' | 'maren' | 'dorn';
/** Logical targets, including rules whose runtime adapters are still pending. */
export type SynergyRuleId = 'spores' | 'tide' | 'rockfall';

export const JOINT_SPELLS: Readonly<
  Record<SynergyMentorId, { readonly element: Element; readonly rule: SynergyRuleId }>
> = {
  hazel: { element: 'nature', rule: 'spores' },
  maren: { element: 'water', rule: 'tide' },
  dorn: { element: 'earth', rule: 'rockfall' },
};

export function isSynergyMentor(id: string): id is SynergyMentorId {
  return Object.hasOwn(JOINT_SPELLS, id);
}
