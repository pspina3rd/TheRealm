/**
 * Mentor lessons: what a mentor can teach the hero, how hard each lesson
 * is, which foe it is fought against, how often the mentor helps, and what
 * winning or losing does.
 *
 * - A mentor teaches only spells of their element: the next level of a
 *   ready spell, the element's primary, its support (once the primary is
 *   known) and its combos (once their other element's spell is known).
 *   A hidden spell joins the list once revealed (see `hidden.ts`).
 * - Difficulty is the level taught (a new spell is level 1); a combo's is
 *   the number of its elements (2, or 3 for Meteor). A hidden spell is
 *   one harder (2, or 3 for Volcano).
 * - Losing a lesson for a spell the hero already knows seals that spell
 *   (it can't be cast) until the lesson is won back or the hero wins
 *   `STAKES.sealFights` monster fights; one seal at a time. A lesson for a
 *   new (lent) spell has nothing to seal: its cost is regard and the wait
 *   (see `src/game/stakes.ts`).
 */
import { relationOf, type Element, type ElementRelation } from '../core/elements';
import { ENEMIES } from '../data/enemies';
import { MAPS } from '../data/maps';
import { MENTORS, type MentorDef, type MentorStop } from '../data/mentors';
import { SPELLS } from '../data/spells';
import type { ChallengeSpec, EnemyDef, SpellDef } from '../data/types';
import { isAtHome, mentorPlace } from '../world/mentors';
import type { GameState } from '../world/state';
import { heroAlignment, learnSpell, raiseSpellLevel, type Hero } from './hero';
import { isRevealed, type Seeker } from './hidden';
import type { Gain } from './rewards';
import { ROLE_ORDER, isReady, isSealed, knownSpell, spellElements } from './spells';
import {
  HELP_BASE,
  HELP_PER_POINT,
  HELP_MIN,
  HELP_MAX,
  LESSON_FOE_STEPS,
  HIDDEN_DIFFICULTY,
  NOVICE_LEVEL,
  NOVICE_FOE_HP,
  STAKES,
} from '../data/balance';
export {
  HELP_BASE,
  HELP_PER_POINT,
  HELP_MIN,
  HELP_MAX,
  LESSON_FOE_STEPS,
  HIDDEN_DIFFICULTY,
  NOVICE_LEVEL,
  NOVICE_FOE_HP,
} from '../data/balance';

/** A lesson a mentor offers: the spell, the level it teaches (1 = new) and its difficulty. */
export interface Lesson {
  readonly spellId: string;
  readonly level: number;
  readonly difficulty: number;
}

/** A lesson's challenge spec, as passed to `Battle`. */
export type LessonSpec = Extract<ChallengeSpec, { kind: 'lesson' }>;

/**
 * …then scaled by how the mentor's element stands to the hero's title
 * element: the same, related (neutral), `weak` (the mentor's element beats
 * the hero's) or `strong` (the hero's beats the mentor's).
 */
export const HELP_RELATION: Readonly<Record<ElementRelation, number>> = {
  same: 1,
  related: 0.8,
  weak: 0.6,
  strong: 0.8,
};

/** The difficulty of teaching `spell` at `level`. */
export function lessonDifficulty(spell: SpellDef, level: number): number {
  const base = spell.role === 'combo' ? spellElements(spell).length : level;
  return spell.hidden ? base + HIDDEN_DIFFICULTY : base;
}

/**
 * Every lesson `mentor` can give the hero now, primary first, then
 * supports, then combos; hidden spells only once revealed.
 */
export function lessonsFor(seeker: Seeker, mentor: MentorDef): Lesson[] {
  const { hero } = seeker;
  return Object.values(SPELLS)
    .filter(
      (spell) =>
        spell.category === mentor.element &&
        (!spell.boardOnly || seeker.flags.has('boardMagicEnabled')),
    )
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
    .flatMap((spell): Lesson[] => {
      const known = knownSpell(hero, spell.id);
      const level = known ? known.level + 1 : 1;
      const open = known
        ? isReady(spell, known)
        : isRevealed(spell, seeker) && (spell.requires ?? []).every((id) => knownSpell(hero, id));
      return open ? [{ spellId: spell.id, level, difficulty: lessonDifficulty(spell, level) }] : [];
    });
}

/**
 * The chance per piece that the mentor tosses the best-fitting piece:
 * `HELP_BASE − HELP_PER_POINT × (alignment − difficulty)`, clamped to
 * `HELP_MIN`–`HELP_MAX`, times the `HELP_RELATION` factor.
 */
export function helpChance(
  alignment: number,
  difficulty: number,
  mentorElement: Element,
  titleElement: Element,
): number {
  const base = HELP_BASE - HELP_PER_POINT * (alignment - difficulty);
  const clamped = Math.min(HELP_MAX, Math.max(HELP_MIN, base));
  return clamped * HELP_RELATION[relationOf(titleElement, mentorElement)];
}

/** The help chance for a hero in a lesson of `mentor` at `difficulty`. */
export function heroHelpChance(
  hero: Pick<Hero, 'spells' | 'titleElement'>,
  mentor: MentorDef,
  difficulty: number,
): number {
  const alignment = heroAlignment(hero)[mentor.element];
  return helpChance(alignment, difficulty, mentor.element, hero.titleElement);
}

/**
 * Who a lesson is fought against: at home, the mentor's trial foe; away,
 * the toughest non-boss monster of the area (of the mentor's element if
 * there is one; the first listed on a tie), or the trial foe where there
 * are no monsters.
 */
export function lessonFoeId(mentor: MentorDef, stop: MentorStop): string {
  if (isAtHome(mentor, stop)) return mentor.trialFoe;
  const monsters = (MAPS[stop.map]?.entities ?? []).flatMap((e) =>
    e.kind === 'monster' && !e.boss && ENEMIES[e.enemyId] ? [ENEMIES[e.enemyId] as EnemyDef] : [],
  );
  const own = monsters.filter((enemy) => enemy.element === mentor.element);
  const pool = own.length > 0 ? own : monsters;
  const [first, ...rest] = pool;
  if (!first) return mentor.trialFoe;
  return rest.reduce((best, enemy) => (enemy.level > best.level ? enemy : best), first).id;
}

/** The `LESSON_FOE_STEPS` row for a difficulty (past the table, its last row). */
export function lessonFoeStep(difficulty: number): { readonly hp: number; readonly atk: number } {
  const index = Math.min(Math.max(difficulty, 1), LESSON_FOE_STEPS.length) - 1;
  return LESSON_FOE_STEPS[index] ?? { hp: 1, atk: 0 };
}

/**
 * A foe made harder for a lesson: more HP and attack by difficulty
 * (`LESSON_FOE_STEPS`), a level (speed) per difficulty above 1, no spoils. At difficulty 1 a hero below `NOVICE_LEVEL` meets it
 * with `NOVICE_FOE_HP` of its HP, so the first lessons stay gentle.
 */
export function scaledFoe(enemy: EnemyDef, difficulty: number, heroLevel = NOVICE_LEVEL): EnemyDef {
  const extra = Math.max(0, difficulty - 1);
  const novice = extra === 0 && heroLevel < NOVICE_LEVEL ? NOVICE_FOE_HP : 1;
  const step = lessonFoeStep(difficulty);
  return {
    ...enemy,
    level: enemy.level + extra,
    hp: Math.round(enemy.hp * step.hp * novice),
    atk: enemy.atk + step.atk,
    xp: 0,
    gil: 0,
    drops: [],
  };
}

/**
 * Before each lesson (and each retry) the mentor heals the hero to full
 * HP; mana is the hero's own to manage.
 */
export function prepareLesson(hero: Hero): void {
  hero.hp = hero.maxHp;
}

/** The battle for `lesson` with `mentorId`, wherever the mentor is now. */
export function lessonSpec(state: GameState, mentorId: string, lesson: Lesson): LessonSpec {
  const mentor = MENTORS[mentorId];
  if (!mentor) throw new Error(`Unknown mentor: ${mentorId}`);
  const stop = mentorPlace(mentor, state);
  return {
    kind: 'lesson',
    mentorId,
    spellId: lesson.spellId,
    enemyId: lessonFoeId(mentor, stop),
    difficulty: lesson.difficulty,
  };
}

/**
 * Applies a finished lesson to the hero. A win teaches the spell (or
 * raises it a level) and lifts its seal if it was sealed. A loss seals the
 * spell if the hero already knew it and nothing is sealed yet. Either way
 * the mentor patches the hero up to at least half HP. Returns what
 * changed, for the results screen.
 */
export function completeLesson(hero: Hero, spec: LessonSpec, won: boolean): Gain[] {
  const mentor = MENTORS[spec.mentorId];
  if (!mentor) throw new Error(`Unknown mentor: ${spec.mentorId}`);
  const known = knownSpell(hero, spec.spellId);
  hero.hp = Math.max(hero.hp, Math.ceil(hero.maxHp / 2));
  if (!won) {
    if (!known || hero.seal) return [];
    hero.seal = { spellId: spec.spellId, fights: STAKES.sealFights };
    return [{ kind: 'seal', spellId: spec.spellId }];
  }
  const gains: Gain[] = [];
  if (known) {
    raiseSpellLevel(hero, spec.spellId);
    gains.push({ kind: 'spellLevel', spellId: spec.spellId, level: known.level + 1 });
  } else if (learnSpell(hero, spec.spellId)) {
    gains.push({ kind: 'spell', spellId: spec.spellId });
  }
  if (isSealed(hero, spec.spellId)) {
    hero.seal = null;
    gains.push({ kind: 'unseal', spellId: spec.spellId });
  }
  return gains;
}

/**
 * A won monster fight eases the seal: one fight fewer to go, and the seal
 * lifts when none are left. Returns the gain to show when it lifts.
 */
export function easeSeal(hero: Hero): Gain[] {
  const seal = hero.seal;
  if (!seal) return [];
  seal.fights--;
  if (seal.fights > 0) return [];
  hero.seal = null;
  return [{ kind: 'unseal', spellId: seal.spellId }];
}
