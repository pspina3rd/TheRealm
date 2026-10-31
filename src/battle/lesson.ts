import { standardName } from '../game/spellNames';
import type { MagicTarget } from './magicCasting';
import type { LockResult } from '../core/board';
import { bestPlacement } from '../core/bestFit';
import { colorOfElement, type Element } from '../core/elements';
import { SHIELD_AT } from '../data/balance';
import { ENEMIES } from '../data/enemies';
import { MENTORS, type MentorDef } from '../data/mentors';
import { SPELLS } from '../data/spells';
import type { Hero } from '../game/hero';
import { heroHelpChance, scaledFoe, type LessonSpec } from '../game/lessons';
import { castSpellFor, heroSpell, newKnownSpell, spellName, type CastSpell } from '../game/spells';
import { CombatChallenge } from './combat';
import {
  lessonPracticeIntent,
  prepareLessonPractice,
  type LessonPracticeIntent,
  type LessonPracticeRequest,
} from './lessonPractice';
import type { BattleContext, Objective } from './types';

/** Where a lesson's shield stands: not yet raised, up, or broken by the taught spell. */
export type ShieldState = 'none' | 'up' | 'broken';

/**
 * A mentor's lesson: a fight against a foe scaled to the lesson's
 * difficulty, fought side by side with the mentor. On every new piece the
 * mentor may (with `helpChance`) toss in the best-fitting shape instead:
 * it replaces the piece that came out of the bag and enters as usual, so
 * the hero still has to place it, but its crystals are in the mentor's
 * colour, so clearing them fills the mentor's mana.
 *
 * **The mentor's shield** (docs/ENCOUNTER_DESIGN.md §6.3): at `SHIELD_AT`
 * of its HP the foe raises a shield in the taught spell's colour, and
 * nothing gets through it but that spell. A hero who doesn't know the
 * spell yet has it lent for the lesson (cast at level 1, its mana from the
 * board), and a sealed one may be cast here: every lesson ends with the
 * hero casting what they are learning.
 */
export class LessonChallenge extends CombatChallenge {
  readonly mentor: MentorDef;
  readonly spellId: string;
  /** Chance per piece that the mentor tosses one. */
  /** Chance per piece that the mentor tosses one (the sims' sensitivity runs may set it). */
  helpChance: number;
  /** The share of the foe's HP where the shield goes up (`SHIELD_AT`; the sims may set it). */
  shieldAt: number = SHIELD_AT;
  shield: ShieldState = 'none';
  /** True while the taught spell's own cast is striking (it alone passes the shield). */
  private casting = false;

  constructor(ctx: BattleContext, spec: LessonSpec) {
    const mentor = MENTORS[spec.mentorId];
    const foe = ENEMIES[spec.enemyId];
    if (!mentor || !foe) throw new Error(`Unknown lesson: ${spec.mentorId}/${spec.enemyId}`);
    super(ctx, scaledFoe(foe, spec.difficulty, ctx.hero.level), { practice: true });
    this.mentor = mentor;
    this.spellId = spec.spellId;
    this.helpChance = heroHelpChance(ctx.hero, mentor, spec.difficulty);
    this.prepareMagicTargets();
  }

  /** The element the shield is ringed in: the taught spell's. */
  get shieldElement(): Element {
    return SPELLS[this.spellId]?.category ?? this.mentor.element;
  }

  /** True when the taught spell is lent: the hero doesn't know it yet. */
  get lent(): boolean {
    return heroSpell(this.ctx.hero, this.spellId) === null;
  }

  protected override spellFor(spellId: string): CastSpell | null {
    const own = super.spellFor(spellId);
    const spell = SPELLS[spellId];
    if (own || spellId !== this.spellId || !spell) return own;
    return castSpellFor(spell, newKnownSpell());
  }

  protected override unsealed(spellId: string): boolean {
    return spellId === this.spellId;
  }

  override spellBook(): Hero['spells'] {
    const own = super.spellBook();
    return this.lent ? { ...own, [this.spellId]: newKnownSpell() } : own;
  }

  /**
   * Casting the taught spell breaks a raised shield, whatever the spell
   * does (a heal breaks it as surely as a strike), and its own strike
   * passes the mark.
   */
  override castSpell(spellId: string, target?: MagicTarget): void {
    this.casting = spellId === this.spellId;
    try {
      super.castSpell(spellId, target);
      if (this.casting && this.shield === 'up') {
        this.shield = 'broken';
        this.ctx.emit({ kind: 'shield', up: false });
      }
    } finally {
      this.casting = false;
    }
  }

  /**
   * Hits pass as usual until the foe drops to the shield's mark; there the
   * shield goes up and holds HP at the mark. While it is up only the
   * taught spell's own strike gets through, and that breaks it.
   */
  protected override hitEnemy(
    amount: number,
    element: Element | null,
    affinity: 'weak' | 'resist' | null,
  ): void {
    const mark = Math.ceil(this.enemy.hp * this.shieldAt);
    if (this.shield === 'up') {
      if (!this.casting) return;
      this.shield = 'broken';
      this.ctx.emit({ kind: 'shield', up: false });
    } else if (this.shield === 'none' && this.enemyHp - amount <= mark) {
      if (this.casting) this.shield = 'broken';
      else {
        if (this.enemyHp > mark) super.hitEnemy(this.enemyHp - mark, element, affinity);
        this.shield = 'up';
        this.ctx.emit({ kind: 'shield', up: true });
        this.prepareMagicTargets();
        return;
      }
    }
    super.hitEnemy(amount, element, affinity);
  }

  override onLock(result: LockResult): void {
    super.onLock(result);
    if (this.status() === 'ongoing' && this.shield === 'up' && !this.practiceIntent?.target) {
      this.prepareMagicTargets();
    }
    if (this.status() === 'ongoing' && this.ctx.rng.next() < this.helpChance) this.toss();
  }

  /** Give board-spell lessons a usable target, including when a clear raises the shield. */
  private prepareMagicTargets(): void {
    prepareLessonPractice(this.ctx.board, this.practiceRequest);
  }

  private get practiceRequest(): LessonPracticeRequest {
    return {
      spellId: this.spellId,
      rank: this.spellFor(this.spellId)?.level ?? 1,
      owner: `lesson:${this.mentor.id}:${this.spellId}`,
    };
  }

  /** Current board purpose and safe target; reading this never changes the board. */
  get practiceIntent(): LessonPracticeIntent | null {
    return lessonPracticeIntent(this.ctx.board, this.practiceRequest);
  }

  override objective(): Objective {
    const spell = SPELLS[this.spellId];
    return {
      ...super.objective(),
      label: `Lesson: ${standardName(this.spellId) ?? (spell ? spellName(spell) : this.spellId)}`,
    };
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
