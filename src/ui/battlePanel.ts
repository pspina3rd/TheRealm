import type { Battle } from '../battle/battle';
import { ITEMS } from '../data/items';
import { SPELLS } from '../data/spells';
import { cannotUseReason } from '../game/hero';
import { drawBoard, drawNext } from './boardView';
import { button, byId, el } from './dom';

/** Keeps the battle screen (board, objective, magic, items, log) in sync with a `Battle`. */
export class BattlePanel {
  private readonly boardCtx: CanvasRenderingContext2D;
  private readonly nextCtx: CanvasRenderingContext2D;
  private readonly combatPanel = byId('combat-panel');
  private readonly spellList = byId('spell-list');
  private readonly itemList = byId('battle-items');
  private readonly log = byId('battle-log');
  private readonly pauseButton = byId<HTMLButtonElement>('pause-button');
  /** Signature of the last rebuilt button lists, to avoid rebuilding every frame. */
  private controlsKey = '';
  private logKey: unknown = null;

  /** Called when the player casts a spell or uses an item from the panel. */
  onCast: (spellId: string) => void = () => {};
  onItem: (itemId: string) => void = () => {};

  constructor() {
    this.boardCtx = context(byId<HTMLCanvasElement>('board-canvas'));
    this.nextCtx = context(byId<HTMLCanvasElement>('next-canvas'));
  }

  render(battle: Battle, overlay?: string): void {
    drawBoard(this.boardCtx, battle.board, overlay ?? (battle.paused ? 'PAUSED' : undefined));
    drawNext(this.nextCtx, battle.board.preview(1)[0]);

    const objective = battle.objective;
    byId('objective-label').textContent = objective.label;
    byId('objective-detail').textContent = objective.detail;
    byId('objective-bar').style.width = `${Math.round(objective.progress * 100)}%`;
    byId('battle-score').textContent = String(battle.score);
    byId('battle-lines').textContent = String(battle.lines);
    this.pauseButton.textContent = battle.paused ? 'Resume' : 'Pause';

    this.renderControls(battle);
    this.renderLog(battle);
  }

  private renderControls(battle: Battle): void {
    const combat = battle.combat;
    this.combatPanel.hidden = !combat;
    if (!combat) return;

    const hero = battle.hero;
    const ongoing = battle.status === 'ongoing' && !battle.paused;
    const key = JSON.stringify([hero.mp, hero.hp, hero.items, hero.spells, ongoing]);
    if (key === this.controlsKey) return;
    this.controlsKey = key;

    this.spellList.replaceChildren(
      ...hero.spells.map((id, index) => {
        const spell = SPELLS[id];
        if (!spell) return el('span');
        const reason = combat.cannotCastReason(id);
        const node = button('', () => this.onCast(id), {
          disabled: !ongoing || reason !== null,
          title: `${spell.description}${reason ? ` (${reason})` : ''}`,
        });
        node.append(
          el('b', { text: `${index + 1}. ${spell.name}` }),
          el('small', { text: `${spell.mpCost} MP` }),
        );
        return node;
      }),
    );

    const usable = Object.entries(hero.items).filter(([id]) => ITEMS[id]?.kind === 'consumable');
    this.itemList.replaceChildren(
      ...(usable.length
        ? usable.map(([id, count]) => {
            const item = ITEMS[id];
            if (!item) return el('span');
            const reason = cannotUseReason(hero, item);
            const node = button('', () => this.onItem(id), {
              disabled: !ongoing || reason !== null,
              title: `${item.description}${reason ? ` (${reason})` : ''}`,
            });
            node.append(el('b', { text: item.name }), el('small', { text: `× ${count}` }));
            return node;
          })
        : [el('small', { className: 'muted', text: 'No usable items.' })]),
    );
  }

  private renderLog(battle: Battle): void {
    const newest = battle.events[0];
    if (newest === this.logKey) return;
    this.logKey = newest;
    this.log.replaceChildren(
      ...battle.events.map((e) => el('p', { className: e.tone, text: e.text })),
    );
  }
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not supported');
  return ctx;
}
