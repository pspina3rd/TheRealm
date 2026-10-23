import type { Battle } from '../battle/battle';
import type { Atlas } from './art/atlas';
import type { CreatureId } from './art/creatures';
import { ELEMENT_COLOR_OF, feedbackFor } from './art/feedback';
import { BoardView } from './boardView';
import { byId } from './dom';
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

  /** The mentor's portrait beside the next piece, during lessons. */
  private readonly helper = byId('battle-helper');
  private readonly atlas: Atlas;

  constructor(atlas: Atlas) {
    this.atlas = atlas;
    this.hero = new HeroPanel(atlas);
    this.stage = new Stage(byId<HTMLCanvasElement>('stage-canvas'), atlas);
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

  render(
    battle: Battle,
    flags: ReadonlySet<string>,
    dtMs: number,
    timeMs: number,
    finished: boolean,
  ): void {
    for (const { seq, event } of battle.eventsSince(this.nextSeq)) {
      this.nextSeq = seq + 1;
      for (const feedback of feedbackFor(event)) {
        if (feedback.kind === 'toss') this.pulseHelper();
        this.board.play(feedback);
        this.stage.play(feedback);
        this.hero.play(feedback);
      }
    }
    this.board.render(battle.board, battle, dtMs, timeMs, battle.paused || finished);
    this.stage.render(battle, dtMs, timeMs);
    this.hero.render(battle, flags);
    this.pauseButton.setAttribute('aria-pressed', String(battle.paused));
    // Pauses left beside the pause sign (resume is always possible).
    this.pauseButton.textContent = battle.paused ? '▶' : `❚❚ ${battle.pausesLeft}`;
    this.pauseButton.disabled = !battle.paused && battle.pausesLeft <= 0;
  }
}
