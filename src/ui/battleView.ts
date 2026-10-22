import type { Battle } from '../battle/battle';
import type { Atlas } from './art/atlas';
import type { CreatureId } from './art/creatures';
import { feedbackFor } from './art/feedback';
import { BoardView } from './boardView';
import { byId } from './dom';
import { HeroPanel } from './heroPanel';
import { Stage } from './stage';

/**
 * The battle screen. Each frame it turns new battle events into feedback
 * (flashes, numbers, effects, glows) for the board, the stage and the
 * hero panel, then draws them.
 */
export class BattleView {
  readonly hero = new HeroPanel();
  private readonly board = new BoardView(
    byId<HTMLCanvasElement>('board-canvas'),
    byId<HTMLCanvasElement>('next-canvas'),
  );
  private readonly stage: Stage;
  private readonly pauseButton = byId<HTMLButtonElement>('pause-button');
  private nextSeq = 0;

  constructor(atlas: Atlas) {
    this.stage = new Stage(byId<HTMLCanvasElement>('stage-canvas'), atlas);
  }

  start(opponent: CreatureId | null, heroSprite: CreatureId): void {
    this.nextSeq = 0;
    this.board.reset();
    this.stage.show(opponent, heroSprite);
  }

  render(battle: Battle, dtMs: number, timeMs: number, finished: boolean): void {
    for (const { seq, event } of battle.eventsSince(this.nextSeq)) {
      this.nextSeq = seq + 1;
      for (const feedback of feedbackFor(event)) {
        this.board.play(feedback);
        this.stage.play(feedback);
        this.hero.play(feedback);
      }
    }
    this.board.render(battle.board, battle, dtMs, timeMs, battle.paused || finished);
    this.stage.render(battle, dtMs, timeMs);
    this.hero.render(battle);
    this.pauseButton.setAttribute('aria-pressed', String(battle.paused));
    this.pauseButton.textContent = battle.paused ? '▶' : '❚❚';
  }
}
