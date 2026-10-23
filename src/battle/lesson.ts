import type { LockResult } from '../core/board';
import { bestPlacement } from '../core/bestFit';
import { colorOfElement } from '../core/elements';
import { ENEMIES } from '../data/enemies';
import { MENTORS, type MentorDef } from '../data/mentors';
import { SPELLS } from '../data/spells';
import { heroHelpChance, scaledFoe, type LessonSpec } from '../game/lessons';
import { spellName } from '../game/spells';
import { CombatChallenge } from './combat';
import type { BattleContext, Objective } from './types';

/**
 * A mentor's lesson: a fight against a foe scaled to the lesson's
 * difficulty, fought side by side with the mentor. On every new piece the
 * mentor may (with `helpChance`) toss in the best-fitting shape instead:
 * it replaces the piece that came out of the bag and enters as usual, so
 * the hero still has to place it, but its crystals are in the mentor's
 * colour, so clearing them fills the mentor's mana.
 */
export class LessonChallenge extends CombatChallenge {
  readonly mentor: MentorDef;
  readonly spellId: string;
  /** Chance per piece that the mentor tosses one. */
  readonly helpChance: number;

  constructor(ctx: BattleContext, spec: LessonSpec) {
    const mentor = MENTORS[spec.mentorId];
    const foe = ENEMIES[spec.enemyId];
    if (!mentor || !foe) throw new Error(`Unknown lesson: ${spec.mentorId}/${spec.enemyId}`);
    super(ctx, scaledFoe(foe, spec.difficulty, ctx.hero.level));
    this.mentor = mentor;
    this.spellId = spec.spellId;
    this.helpChance = heroHelpChance(ctx.hero, mentor, spec.difficulty);
  }

  override onLock(result: LockResult): void {
    super.onLock(result);
    if (this.status() === 'ongoing' && this.ctx.rng.next() < this.helpChance) this.toss();
  }

  override objective(): Objective {
    const spell = SPELLS[this.spellId];
    return { ...super.objective(), label: `Lesson: ${spell ? spellName(spell) : this.spellId}` };
  }

  /** Replaces the new falling piece with the best-fitting shape, in the mentor's colour. */
  private toss(): void {
    const board = this.ctx.board;
    const best = bestPlacement(board.grid);
    const element = this.mentor.element;
    if (best && board.replaceActive(best.name, { color: colorOfElement(element) })) {
      this.ctx.emit({ kind: 'toss', element, piece: best.name });
    }
  }
}
