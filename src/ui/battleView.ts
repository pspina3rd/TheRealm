import { ENCOUNTER_DEFS } from '../data/encounters';
import { LessonChallenge } from '../battle/lesson';
import { spellName } from '../game/spells';
import { SPELLS } from '../data/spells';
import type { Battle } from '../battle/battle';
import type { Atlas } from './art/atlas';
import type { CreatureId } from './art/creatures';
import { ELEMENT_COLOR_OF, feedbackFor } from './art/feedback';
import { BoardView } from './boardView';
import { byId, el } from './dom';
import { HeroPanel } from './heroPanel';
import { spritePortrait } from './screens/widgets';
import { Stage, type StageOptions } from './stage';

/**
 * The battle screen. Each frame it turns new battle events into feedback
 * (flashes, numbers, effects, glows) for the board, the stage and the
 * hero panel, then draws them.
 */
export class BattleView {
  readonly hero: HeroPanel;
  private readonly board = new BoardView(
    byId<HTMLCanvasElement>('board-canvas'),
    byId<HTMLCanvasElement>('next-canvas'),
  );
  private readonly stage: Stage;
  private readonly pauseButton = byId<HTMLButtonElement>('pause-button');
  private nextSeq = 0;
  private readonly objective = el('div', { className: 'board-objective' });
  private readonly objectiveText = el('b');
  private readonly counter = el('span', { className: 'objective-counter' });
  private readonly lamps = el('span', { className: 'frame-lamps' });
  private readonly lessonHint = el('div', { className: 'lesson-affordance' });
  private frameKey = '';

  /** The mentor's portrait beside the next piece, during lessons. */
  private readonly helper = byId('battle-helper');
  private readonly atlas: Atlas;

  constructor(atlas: Atlas) {
    this.atlas = atlas;
    this.hero = new HeroPanel(atlas);
    this.stage = new Stage(byId<HTMLCanvasElement>('stage-canvas'), atlas);
    this.objective.append(this.objectiveText, this.counter, this.lamps);
    byId('board-canvas').parentElement?.prepend(this.objective);
    this.helper.after(this.lessonHint);
    this.objective.setAttribute('aria-label', 'Battle objective');
  }

  /** Flashes the mentor's portrait when they toss a piece. */
  private pulseHelper(): void {
    this.helper.classList.remove('tossed');
    void this.helper.offsetWidth; // restart the animation
    this.helper.classList.add('tossed');
  }

  /**
   * Resets the screen for a new battle. In a lesson, `options` carry the
   * foe's colour and the mentor, whose portrait sits by the next piece.
   */
  start(opponent: CreatureId | null, heroSprite: CreatureId, options: StageOptions = {}): void {
    this.nextSeq = 0;
    this.frameKey = '';
    this.board.reset();
    this.hero.reset();
    this.stage.show(opponent, heroSprite, options);
    const ally = options.ally;
    this.helper.hidden = !ally;
    this.helper.replaceChildren(...(ally ? [spritePortrait(this.atlas, ally, 48)] : []));
    if (options.allyElement) {
      this.helper.style.setProperty('--helper', ELEMENT_COLOR_OF[options.allyElement]);
    }
  }

  private renderFrame(battle: Battle): void {
    const objective = battle.objective;
    const def = battle.spec.kind === 'encounter' ? ENCOUNTER_DEFS[battle.spec.id] : undefined;
    const boardFrame = this.objective.parentElement;
    if (!boardFrame) return;
    boardFrame.dataset.skin =
      def?.skin ??
      (battle.rule?.id === 'spores' ? 'grove' : battle.rule?.id === 'dark' ? 'dark' : 'plain');
    boardFrame.style.setProperty('--board-ratio', String(battle.board.width / battle.board.height));
    const lesson = battle.combat instanceof LessonChallenge ? battle.combat : null;
    const key = JSON.stringify([
      objective,
      battle.demoPlaying,
      battle.started,
      lesson?.shield,
      lesson?.lent,
      battle.telegraphs(),
    ]);
    if (key === this.frameKey) return;
    this.frameKey = key;
    this.objectiveText.textContent = objective.label;
    this.counter.textContent = [
      objective.counter,
      objective.piecesLeft !== null && Number.isFinite(objective.piecesLeft)
        ? `${objective.piecesLeft} pieces`
        : '',
      battle.demoPlaying ? 'Watch…' : !battle.started ? 'Your first move begins' : '',
    ]
      .filter(Boolean)
      .join(' · ');
    const threatened = new Set(
      battle.telegraphs().flatMap((mark) => (mark.kind === 'lamp' ? [mark.index] : [])),
    );
    this.lamps.replaceChildren(
      ...(objective.lamps ?? []).map((lamp, i) => {
        const node = el('span', {
          className: `frame-lamp${lamp.lit ? ' lit' : ''}${threatened.has(i) ? ' threatened' : ''}`,
          title: `${lamp.element}: ${lamp.lit ? 'lit' : 'unlit'}`,
        });
        node.style.setProperty('--lamp', ELEMENT_COLOR_OF[lamp.element]);
        node.setAttribute('aria-label', node.title);
        return node;
      }),
    );
    this.lessonHint.hidden = !lesson;
    const taughtSpell = lesson && SPELLS[lesson.spellId];
    this.lessonHint.textContent = lesson
      ? `${lesson.lent ? 'Lent: ' : 'Taught: '}${taughtSpell ? spellName(taughtSpell) : lesson.spellId}${lesson.shield === 'up' ? ' · break the shield' : ''}`
      : '';
  }

  render(
    battle: Battle,
    flags: ReadonlySet<string>,
    dtMs: number,
    timeMs: number,
    finished: boolean,
  ): void {
    this.renderFrame(battle);
    for (const { seq, event } of battle.eventsSince(this.nextSeq)) {
      this.nextSeq = seq + 1;
      for (const feedback of feedbackFor(event)) {
        if (feedback.kind === 'beat' && battle.spec.kind === 'encounter') {
          const line = ENCOUNTER_DEFS[battle.spec.id]?.lines[feedback.beat];
          if (line) this.stage.play({ kind: 'banner', text: line });
        }
        if (feedback.kind === 'toss') this.pulseHelper();
        this.board.play(feedback);
        this.stage.play(feedback);
        this.hero.play(feedback);
      }
    }
    this.board.render(battle.board, battle, dtMs, timeMs, battle.paused || finished);
    this.stage.render(battle, dtMs, timeMs);
    this.hero.render(battle, flags);
    const lesson = battle.combat instanceof LessonChallenge ? battle.combat : null;
    document
      .querySelector<HTMLElement>(`[data-action="${lesson?.spellId}"]`)
      ?.classList.toggle('lent-spell', Boolean(lesson?.lent));
    this.pauseButton.setAttribute('aria-pressed', String(battle.paused));
    // Pauses left beside the pause sign (resume is always possible).
    this.pauseButton.textContent = battle.paused ? '▶' : `❚❚ ${battle.pausesLeft}`;
    this.pauseButton.disabled = !battle.paused && battle.pausesLeft <= 0;
  }
}
