import type { Element } from '../core/elements';

/** Approved addendum ring, independent of shape and of the damage-affinity chart. */
export const REACTION_RING = [
  'wind',
  'fire',
  'earth',
  'water',
  'lightning',
  'arcane',
  'nature',
] as const satisfies readonly Element[];

export const REACTION_IDS = [
  'conflagration',
  'eruption',
  'quagmire',
  'conduction',
  'overload',
  'witchbloom',
  'seedstorm',
] as const;
export type ReactionId = (typeof REACTION_IDS)[number];

export interface ReactionDefinition {
  readonly id: ReactionId;
  readonly name: string;
  readonly primer: Element;
  readonly trigger: Element;
}

export const REACTION_DEFINITIONS: readonly ReactionDefinition[] = [
  { id: 'conflagration', name: 'Conflagration', primer: 'wind', trigger: 'fire' },
  { id: 'eruption', name: 'Eruption', primer: 'fire', trigger: 'earth' },
  { id: 'quagmire', name: 'Quagmire', primer: 'earth', trigger: 'water' },
  { id: 'conduction', name: 'Conduction', primer: 'water', trigger: 'lightning' },
  { id: 'overload', name: 'Overload', primer: 'lightning', trigger: 'arcane' },
  { id: 'witchbloom', name: 'Witchbloom', primer: 'arcane', trigger: 'nature' },
  { id: 'seedstorm', name: 'Seedstorm', primer: 'nature', trigger: 'wind' },
];

/** Starting values from ENCOUNTER_ADDENDUM rev 3; not a runtime feature switch. */
export const REACTION_PARAMETERS = {
  windowPieces: 2,
  conflagration: { baseDamage: 8, perCrystal: 2, stones: 2 },
  eruption: { damage: 6, rows: 1 },
  quagmire: { delayMs: 2000, gaugeFloorMs: -3000, repeatDamage: 4 },
  conduction: { multiplier: 1.5, repeatMultiplier: 1.25, totalMultiplierCap: 3 },
  overload: { manaPerPool: 2, repeatDamage: 4 },
  witchbloom: { heal: 6, perCrystal: 1, tags: 3, rowRadius: 1, repeatHeal: 3 },
  seedstorm: { tailwindPieces: 2, repeatDamage: 4 },
} as const;

export function reactionAfter(primer: Element): ReactionDefinition {
  const reaction = REACTION_DEFINITIONS.find((entry) => entry.primer === primer);
  if (!reaction) throw new Error(`Missing reaction successor: ${primer}`);
  return reaction;
}
