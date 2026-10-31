import { standardSpellText } from '../src/ui/standardSpellText';
import { castSpellFor } from '../src/game/spells';
import { SPELLS } from '../src/data/spells';
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Battle } from '../src/battle/battle';
import { createRng } from '../src/core/rng';
import { createHero } from '../src/game/hero';
import { newKnownSpell } from '../src/game/spells';
import { HeroPanel } from '../src/ui/heroPanel';
import { openWeavingEditor } from '../src/ui/weavingEditor';
import type { Atlas } from '../src/ui/art/atlas';
const html = readFileSync('index.html', 'utf8');
beforeEach(() => {
  document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});
describe('automatic and custom casting affordances', () => {
  it('shows actual mixed ranks and costs without standard buttons or number-key casting', () => {
    const hero = createHero();
    hero.spells = { fire: { ...newKnownSpell(), level: 2 }, quake: newKnownSpell() };
    const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(1), {
      boardMagic: true,
      autoCast: true,
    });
    const panel = new HeroPanel({ draw: () => {} } as unknown as Atlas),
      cast = vi.fn();
    panel.onCast = cast;
    panel.render(battle, new Set());
    expect(document.querySelector('[data-spell=fire]')?.textContent).toContain('Fire · Lv 2');
    expect(document.querySelector('[data-spell=fire]')?.textContent).toContain(
      'Held 0 · Cost 8 fire',
    );
    expect(document.querySelector('[data-spell=quake]')?.textContent).toContain('Gravity · Lv 1');
    expect(document.querySelectorAll('#spell-list button')).toHaveLength(0);
    const fireMeter = document.querySelector('[data-spell=fire] [role=progressbar]')!;
    expect(fireMeter.getAttribute('aria-valuenow')).toBe('0');
    expect(fireMeter.getAttribute('aria-valuemax')).toBe('8');
    hero.mana.fire = 4;
    panel.render(battle, new Set());
    expect(
      document.querySelector<HTMLElement>('[data-spell=fire] .spell-charge-fill')?.style.width,
    ).toBe('50%');
    hero.mana.fire = 12;
    panel.render(battle, new Set());
    expect(
      document.querySelector<HTMLElement>('[data-spell=fire] .spell-charge-fill')?.style.width,
    ).toBe('100%');
    expect(
      document
        .querySelector('[data-spell=fire] [role=progressbar]')
        ?.getAttribute('aria-valuetext'),
    ).toBe('12 of 8 mana, charged');
    expect(panel.pick(1)).toBe(false);
    (document.querySelector('[data-spell=fire]') as HTMLElement).click();
    expect(cast).not.toHaveBeenCalled();
  });
  it('makes a paid strength unlock available before first equip and explains the cap', () => {
    const hero = createHero();
    hero.skillPoints = 6;
    hero.spells = {
      fire: { ...newKnownSpell(), level: 2 },
      quake: { ...newKnownSpell(), level: 2 },
    };
    const dialog = openWeavingEditor(hero, new Set(['wyrmBeaten', 'scene:chapterEnd']), vi.fn());
    expect(dialog.querySelector('.weave-mastery')?.textContent).toContain('capped at Lv 1');
    const unlock = [...dialog.querySelectorAll('button')].find(
      (b) => b.textContent === 'Unlock Lv 2 strengths · 6 points',
    )!;
    expect(unlock.disabled).toBe(false);
    unlock.click();
    expect(hero.weaving?.equipped).toBeNull();
    expect(hero.skillPoints).toBe(0);
    expect(hero.weaving?.recipes[0]?.level).toBe(2);
    const select = dialog.querySelector<HTMLSelectElement>('[aria-label="Effect 1 strength"]')!;
    expect(select.querySelector<HTMLOptionElement>('[value="2"]')?.disabled).toBe(false);
  });
});

it('keeps a recovered custom recipe with missing sources from crashing the combat panel', () => {
  const hero = createHero();
  hero.spells.shadow = { ...newKnownSpell(), level: 2 };
  hero.weaving = {
    equipped: 'old',
    recipes: [
      {
        id: 'old',
        name: 'Old recipe',
        level: 1,
        stages: [
          { spell: 'fire', rank: 1 },
          { spell: 'quake', rank: 1 },
        ],
      },
    ],
  };
  const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(1), {
    boardMagic: true,
    autoCast: true,
  });
  const panel = new HeroPanel({ draw: () => {} } as unknown as Atlas);
  expect(() => panel.render(battle, new Set(['wyrmBeaten', 'scene:chapterEnd']))).not.toThrow();
  expect(document.querySelector<HTMLButtonElement>('.equipped-weaving')?.disabled).toBe(true);
  expect(document.querySelector('[data-spell=shadow]')?.textContent).toContain('Arcane · Lv 2');
});

it('teaches current board/character effects rather than legacy damage and synthetic row sweeps', () => {
  const description = (id: string, level: number) =>
    standardSpellText(id, castSpellFor(SPELLS[id]!, { ...newKnownSpell(), level }));
  expect(description('fire', 2)).toBe('Burn ordinary blocks in 2 rows.');
  expect(description('natureConvert', 3)).toContain('1 row 2 times');
  expect(description('natureConvert', 3)).toContain('blank blocks with no mana');
  expect(description('natureConvert', 3)).not.toContain('0 damage');
  expect(description('shadow', 2)).toContain('Opponent: 29 base damage');
  expect(description('quake', 4)).toContain('whole board');
});
