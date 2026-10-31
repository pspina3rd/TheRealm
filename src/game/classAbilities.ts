/**
 * Pure awakening/trade transitions. The caller owns Hero, derived-stat
 * refresh, persistence and the feature gate; importing this module enables
 * nothing. No save-version number is reserved here.
 */
import type { StatId, StatRanks } from '../data/stats';

export type AbilityClassId = 'ranger' | 'knight' | 'mage' | 'rogue';

export const ABILITY_AWAKE_FLAG = 'ability:awake';
export const OUTSIDE_LESSON_FLAG = 'ability:lessonOutsideMossvale';

export const CLASS_ABILITY_TRADES: Readonly<Record<AbilityClassId, StatId>> = {
  ranger: 'agility',
  knight: 'vitality',
  mage: 'focus',
  rogue: 'strength',
};

export interface ClassAbilityProgress {
  readonly classId: string;
  readonly stats: Readonly<StatRanks>;
  readonly flags: ReadonlySet<string>;
}

/** The caller applies this rank change, refreshes derived stats and saves atomically. */
export interface AbilityTrade {
  readonly classId: AbilityClassId;
  readonly stat: StatId;
  readonly before: number;
  readonly after: number;
}

export interface AbilityProgressTransition {
  readonly status: 'unchanged' | 'awakened' | 'repaired' | 'invalid';
  readonly stats: StatRanks;
  readonly flags: Set<string>;
  readonly trade: AbilityTrade | null;
}

export interface AwakeningLesson {
  readonly kind: 'mentorLesson';
  readonly mapId: string;
  readonly mentorId: string;
  /** Both outcomes awaken; this field makes the caller's completed outcome explicit. */
  readonly outcome: 'won' | 'lost';
}

export interface ClassAbilityMigrationProof {
  /** Trusted lesson history, not a guess from level, map, class or starting spells. */
  readonly pastOutsideMossvaleLesson: boolean;
}

export function abilityClassId(classId: string): AbilityClassId | null {
  return Object.hasOwn(CLASS_ABILITY_TRADES, classId) ? (classId as AbilityClassId) : null;
}

export function abilityTradeFlag(classId: AbilityClassId): string {
  return `ability:trade:${classId}`;
}

/** Activation requires both receipt and payment, not a lone edited awake flag. */
export function hasAwakenedClassAbility(
  progress: Pick<ClassAbilityProgress, 'classId' | 'flags'>,
): boolean {
  const classId = abilityClassId(progress.classId);
  return (
    classId !== null &&
    progress.flags.has(ABILITY_AWAKE_FLAG) &&
    progress.flags.has(abilityTradeFlag(classId))
  );
}

function unchanged(
  progress: ClassAbilityProgress,
  status: 'unchanged' | 'invalid' = 'unchanged',
): AbilityProgressTransition {
  return { status, stats: { ...progress.stats }, flags: new Set(progress.flags), trade: null };
}

/**
 * Record receipt and payment together. An awake-only old record still owes
 * its trade; a paid record never pays twice, even if its awake flag was lost.
 * Malformed ranks are rejected without changing any progress.
 */
function applyAwakening(progress: ClassAbilityProgress): AbilityProgressTransition {
  const classId = abilityClassId(progress.classId);
  if (!classId) return unchanged(progress, 'invalid');
  const paidFlag = abilityTradeFlag(classId);
  const wasAwake = progress.flags.has(ABILITY_AWAKE_FLAG);
  if (progress.flags.has(paidFlag)) {
    const result = unchanged(progress);
    if (!wasAwake) {
      result.flags.add(ABILITY_AWAKE_FLAG);
      result.flags.add(OUTSIDE_LESSON_FLAG);
      return { ...result, status: 'repaired' };
    }
    return result;
  }
  const stat = CLASS_ABILITY_TRADES[classId];
  const before = progress.stats[stat];
  if (!Number.isInteger(before) || before < 1) return unchanged(progress, 'invalid');
  const flags = new Set(progress.flags);
  flags.add(ABILITY_AWAKE_FLAG);
  flags.add(OUTSIDE_LESSON_FLAG);
  flags.add(paidFlag);
  const after = before - 1;
  return {
    status: wasAwake ? 'repaired' : 'awakened',
    stats: { ...progress.stats, [stat]: after },
    flags,
    trade: { classId, stat, before, after },
  };
}

/** A completed first lesson outside Mossvale awakens on a win or a loss. */
export function awakenClassAbility(
  progress: ClassAbilityProgress,
  lesson: AwakeningLesson,
): AbilityProgressTransition {
  if (lesson.mapId === 'mossvale' || !lesson.mapId || !lesson.mentorId) {
    return unchanged(progress);
  }
  return applyAwakening(progress);
}

/**
 * Called by the eventual save migration only after its existing validation.
 * Rev 3 applies the same rank trade to old and new heroes; it does not mint
 * a skill point. Existing ability receipt/payment markers are also evidence.
 */
export function migrateClassAbility(
  progress: ClassAbilityProgress,
  proof: ClassAbilityMigrationProof,
): AbilityProgressTransition {
  const classId = abilityClassId(progress.classId);
  const knownReceipt =
    progress.flags.has(ABILITY_AWAKE_FLAG) ||
    progress.flags.has(OUTSIDE_LESSON_FLAG) ||
    (classId !== null && progress.flags.has(abilityTradeFlag(classId)));
  return proof.pastOutsideMossvaleLesson || knownReceipt
    ? applyAwakening(progress)
    : unchanged(progress);
}
