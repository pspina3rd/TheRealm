// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import { createRng } from '../src/core/rng';
import { createHero } from '../src/game/hero';
import { newKnownSpell } from '../src/game/spells';
import { openMagicTargeting } from '../src/ui/magicTargeting';
beforeEach(() => {
  document.body.replaceChildren();
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
function fixture() {
  const hero = createHero();
  hero.spells.quake = newKnownSpell();
  const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(1), {
    boardMagic: true,
  });
  hero.mana.earth = 12;
  battle.board.grid[15]![2] = 'red';
  return battle;
}
describe('board spell targeting', () => {
  it('Cancel restores pause state without committing input, mana or board changes', () => {
    const battle = fixture(),
      before = JSON.stringify([
        battle.board.magicState(),
        battle.hero,
        battle.interference.checkpoint(),
      ]);
    let committed = 0,
      done = 0;
    const dialog = openMagicTargeting(
      battle,
      'quake',
      () => {
        committed++;
        return true;
      },
      () => {
        done++;
      },
    );
    expect(battle.paused).toBe(true);
    dialog.querySelectorAll('button')[0]!.click();
    expect(dialog.isConnected).toBe(false);
    expect(battle.paused).toBe(false);
    expect(committed).toBe(0);
    expect(done).toBe(1);
    expect(
      JSON.stringify([battle.board.magicState(), battle.hero, battle.interference.checkpoint()]),
    ).toBe(before);
  });
  it('keeps Wind direction out of Gravity targeting and allows an affordable real cast', () => {
    const battle = fixture();
    const dialog = openMagicTargeting(battle, 'quake');
    expect(dialog.querySelector('select')!.hidden).toBe(true);
    const slider = dialog.querySelector('input')!;
    slider.value = '16';
    slider.dispatchEvent(new Event('input'));
    const cast = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Cast',
    )!;
    expect(cast.disabled).toBe(false);
    cast.click();
    expect(battle.hero.mana.earth).toBe(6);
    expect(battle.board.grid[19]![2]).toBe('red');
    expect(battle.paused).toBe(false);
  });
  it('does not reveal dark-region interiors in either preview panel', () => {
    const battle = fixture();
    Object.defineProperty(battle, 'rule', { value: { id: 'dark' } });
    battle.board.grid[19]![2] = 'blue';
    const dialog = openMagicTargeting(battle, 'quake');
    expect(dialog.querySelectorAll('[aria-label="Hidden"]').length).toBeGreaterThan(0);
  });
});
