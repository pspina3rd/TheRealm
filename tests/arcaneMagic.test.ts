import { describe, expect, it } from 'vitest';
import { Board } from '../src/core/board';
import { createRng } from '../src/core/rng';
import { ArcaneInterference } from '../src/battle/arcane';
import { MagicCasting } from '../src/battle/magicCasting';
import { createHero } from '../src/game/hero';
import { newKnownSpell } from '../src/game/spells';
import { arcaneRank, createArcane, upgradeArcane } from '../src/game/arcane';
import { newGame } from '../src/world/state';
import { deserialize, serialize, SAVE_VERSION } from '../src/game/save';
const flags = new Set(['wyrmBeaten', 'scene:chapterEnd']);
function fixture() {
  const board = new Board(createRng(1), 6, 10);
  board.magicEnabled = true;
  const interference = new ArcaneInterference(board);
  const hero = createHero();
  for (const id of ['fire', 'blizzard', 'gale', 'quake', 'thunder', 'natureConvert', 'shadow'])
    hero.spells[id] = { ...newKnownSpell(), level: 4 };
  for (const e of Object.keys(hero.mana)) hero.mana[e as keyof typeof hero.mana] = 100;
  hero.manaCap = 100;
  return { board, interference, hero };
}
describe('Arcane owner placements', () => {
  it('settles immediately and expires only after the affected character places its Xth piece', () => {
    const { board, interference } = fixture();
    interference.place('enemy', [{ x: 1, y: 3, strength: 3 }]);
    interference.cast('enemy', 'earth', 2, 9, 1, 7000);
    expect(board.obstructions['1,9']?.anchored).toBe(false);
    board.spawn();
    board.hardDrop();
    expect(interference.effect('enemy').gravity).toBe(2);
    interference.place('ally', [{ x: 3, y: 4, strength: 2 }]);
    expect(interference.effect('enemy').gravity).toBe(2);
    interference.place('enemy', [{ x: 2, y: 4, strength: 2 }]);
    expect(interference.effect('enemy').gravity).toBe(1);
    expect(
      Object.values(board.obstructions).some(
        (o) => o.owner === 'enemy' && o.strength === 2 && !o.anchored,
      ),
    ).toBe(true);
    interference.place('enemy', [{ x: 4, y: 5, strength: 2 }]);
    expect(interference.effect('enemy').gravity).toBe(0);
    expect(
      Object.values(board.obstructions)
        .filter((o) => o.owner === 'enemy')
        .every((o) => o.anchored),
    ).toBe(true);
  });
  it('counts incoming Wind and Nature per obstruction, with conversion before redirection', () => {
    const { board, interference } = fixture();
    interference.cast('enemy', 'nature', 1, 9, 1, 7000);
    interference.cast('enemy', 'wind', 2, 9, -1, 7000);
    interference.place('enemy', [
      { x: 2, y: 5, strength: 3 },
      { x: 4, y: 5, strength: 2 },
    ]);
    expect(board.grid[5]![1]).toBe('neutral');
    expect(board.obstructions['3,5']?.strength).toBe(2);
    expect(interference.placements.enemy).toBe(1);
    expect(interference.effect('enemy').wind).toBe(0);
  });
  it('weakens only the target owner and never destroys with Arcane Lightning', () => {
    const { board, interference } = fixture();
    interference.place('enemy', [{ x: 1, y: 9, strength: 2 }]);
    interference.place('ally', [{ x: 3, y: 9, strength: 3 }]);
    interference.cast('enemy', 'lightning', 4, 9, 1, 7000);
    expect(board.obstructions['1,9']?.strength).toBe(1);
    expect(board.obstructions['3,9']?.strength).toBe(3);
  });
  it('refreshes without stacking and delays interference independently', () => {
    const { interference } = fixture();
    interference.cast('enemy', 'earth', 2, 9, 1, 7000);
    interference.cast('enemy', 'earth', 1, 9, 1, 7000);
    expect(interference.effect('enemy').gravity).toBe(2);
    interference.cast('enemy', 'water', 2, 9, 1, 7000);
    expect(interference.elapse('enemy', 5000)).toBe(0);
    expect(interference.effect('enemy').delayMs).toBe(9000);
    expect(interference.elapse('enemy', 10000)).toBe(1000);
  });
});
describe('cast preview and progression', () => {
  it('previews without paying or mutating, commits exactly that board, and rejects stale previews', () => {
    const { board, hero, interference } = fixture();
    board.grid[8]![1] = 'red';
    const casting = new MagicCasting(board, hero, interference, flags, 'enemy', 7000);
    const before = JSON.stringify([board.magicState(), hero, interference.checkpoint()]);
    const p = casting.preview('quake', { bottomRow: 9, direction: 1 });
    expect(p.reason).toBeNull();
    expect(JSON.stringify([board.magicState(), hero, interference.checkpoint()])).toBe(before);
    casting.commit(p);
    expect(board.magicState()).toEqual(p.resolution.state);
    expect(hero.mana.earth).toBeLessThan(100);
    expect(() => casting.commit(p)).toThrow('changed');
  });
  it('previews Arcane status changes and refuses ineffective or unaffordable casts without payment', () => {
    const { board, hero, interference } = fixture();
    hero.arcane = { wind: 2 };
    const casting = new MagicCasting(board, hero, interference, flags, 'enemy', 7000);
    const p = casting.preview('arcane:wind', { bottomRow: 9, direction: -1 });
    expect(p.effects.effects.enemy?.wind).toBe(2);
    expect(interference.effects.enemy).toBeUndefined();
    casting.commit(p);
    expect(interference.effect('enemy').wind).toBe(2);
    const again = casting.preview('arcane:wind', { bottomRow: 9, direction: -1 });
    expect(again.reason).toContain('nothing');
    hero.mana.fire = 0;
    const fire = casting.preview('fire', { bottomRow: 9, direction: 1 });
    expect(fire.reason).toContain('mana');
    expect(() => casting.commit(fire)).toThrow();
  });
  it('locks creation before the aftermath, gates ranks by both bases and spends existing skill points', () => {
    const { hero } = fixture();
    hero.skillPoints = 100;
    expect(createArcane(hero, new Set(['wyrmBeaten']), 'fire')).toBe(false);
    expect(createArcane(hero, flags, 'fire')).toBe(true);
    expect(arcaneRank(hero, 'fire')).toBe(1);
    expect(upgradeArcane(hero, flags, 'fire')).toBe(true);
    expect(hero.skillPoints).toBe(94);
    hero.spells.fire!.level = 2;
    expect(upgradeArcane(hero, flags, 'fire')).toBe(false);
  });
  it('migrates v12 without free upgrades and sanitizes v13 pair ranks', () => {
    const state = newGame();
    state.flags = flags;
    const old = JSON.parse(serialize(state));
    old.version = 12;
    delete old.hero.arcane;
    const loaded = deserialize(JSON.stringify(old))!;
    expect(loaded.hero.arcane).toEqual({});
    expect(loaded.flags.has('wyrmBeaten')).toBe(true);
    expect(SAVE_VERSION).toBe(13);
    loaded.hero.arcane = { fire: 99, wind: 2 };
    const clean = deserialize(serialize(loaded))!;
    expect(clean.hero.arcane).toEqual({ fire: 4, wind: 2 });
  });
});
