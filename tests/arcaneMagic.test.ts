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
    expect(SAVE_VERSION).toBe(14);
    loaded.hero.arcane = { fire: 99, wind: 2 };
    const clean = deserialize(serialize(loaded))!;
    expect(clean.hero.arcane).toEqual({ fire: 4, wind: 2 });
  });
});

import { Battle } from '../src/battle/battle';
import type { LessonChallenge } from '../src/battle/lesson';
import { lessonsFor } from '../src/game/lessons';
import { MENTORS } from '../src/data/mentors';
it('delays actual opponent interference while ordinary enemy attacks continue on their independent clock', () => {
  const hero = createHero();
  hero.hp = hero.maxHp = 10000;
  const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(99), {
    boardMagic: true,
  });
  const combat = battle.combat!;
  battle.board.active = null;
  battle.interference.cast('slime', 'water', 4, 19, 1, combat.actMs);
  combat.nextMove = { kind: 'obstruct', name: 'Place', cells: [{ x: 2, y: 15, strength: 3 }] };
  combat.update(combat.actMs);
  expect(battle.interference.placements.slime ?? 0).toBe(0);
  combat.nextMove = { kind: 'attack', name: 'Attack while waiting', power: 1 };
  const hp = hero.hp;
  combat.update(combat.actMs);
  expect(hero.hp).toBeLessThan(hp);
  expect(battle.interference.placements.slime ?? 0).toBe(0);
  combat.gauge = -100000;
  combat.update(combat.actMs * 3);
  expect(battle.interference.placements.slime).toBe(1);
  expect(battle.board.obstructions['2,15']?.strength).toBe(3);
});
it('a blocked incoming batch consumes neither a character placement nor pending Arcane charges', () => {
  const { board, interference } = fixture();
  board.grid[5]![2] = 'red';
  interference.cast('enemy', 'earth', 2, 9, 1, 7000);
  interference.cast('enemy', 'nature', 1, 9, 1, 7000);
  interference.place('enemy', [{ x: 2, y: 5, strength: 2 }]);
  expect(interference.placements.enemy ?? 0).toBe(0);
  expect(interference.effect('enemy').gravity).toBe(2);
  expect(interference.effect('enemy').nature).toBe(1);
});
it('actual board casts award colored clears once and do not advance player-piece buffs or Arcane placement durations', () => {
  const hero = createHero();
  hero.spells.blizzard = newKnownSpell();
  const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(1), {
    boardMagic: true,
  });
  hero.mana.water = 20;
  battle.board.grid[19]![0] = 'red';
  battle.board.grid[19]![1] = 'red';
  battle.slowPieces = 4;
  battle.interference.cast('slime', 'earth', 2, 19, 1, 8500);
  const pieces = battle.board.piecesPlaced;
  battle.combat!.gauge = -100000;
  battle.combat!.castSpell('blizzard', { bottomRow: 19, direction: 1 });
  expect(battle.board.piecesPlaced).toBe(pieces);
  expect(battle.slowPieces).toBeGreaterThanOrEqual(4);
  expect(battle.interference.effect('slime').gravity).toBe(2);
  expect(hero.mana.fire).toBeGreaterThan(0);
  expect(battle.lines).toBe(1);
});
it('new Nature lessons have conversion targets and the lent board spell breaks their shield', () => {
  const state = newGame();
  expect(lessonsFor(state, MENTORS.hazel!).some((l) => l.spellId === 'natureConvert')).toBe(false);
  state.flags.add('boardMagicEnabled');
  expect(lessonsFor(state, MENTORS.hazel!).some((l) => l.spellId === 'natureConvert')).toBe(true);
  const battle = new Battle(
    {
      kind: 'lesson',
      mentorId: 'hazel',
      enemyId: 'slime',
      spellId: 'natureConvert',
      difficulty: 1,
    },
    state.hero,
    createRng(1),
    { boardMagic: true, storyFlags: state.flags },
  );
  const lesson = battle.challenge as LessonChallenge;
  lesson.shield = 'up';
  state.hero.mana.nature = 12;
  const obstruction = Object.keys(battle.board.obstructions)[0]!;
  const row = Number(obstruction.split(',')[1]);
  lesson.castSpell('natureConvert', { bottomRow: row, direction: 1 });
  expect(lesson.shield).toBe('broken');
  expect(battle.board.obstructions[obstruction]).toBeUndefined();
});
it('refuses empty Arcane Lightning instead of charging for a zero-valued status record', () => {
  const { board, hero, interference } = fixture();
  hero.arcane = { lightning: 1 };
  const casting = new MagicCasting(board, hero, interference, flags, 'enemy', 7000);
  const p = casting.preview('arcane:lightning', { bottomRow: 9, direction: 1 });
  expect(p.reason).toContain('nothing');
});

it('selected campaign enemies receive owned obstruction moves only in opt-in encounters and telegraph their footprint', () => {
  const ordinary = new Battle({ kind: 'combat', enemyId: 'slime' }, createHero(), createRng(1));
  expect(ordinary.combat!.enemy.moves.some((m) => m.kind === 'obstruct')).toBe(false);
  const enabled = new Battle({ kind: 'combat', enemyId: 'slime' }, createHero(), createRng(1), {
    boardMagic: true,
  });
  const move = enabled.combat!.enemy.moves.find((m) => m.kind === 'obstruct')!;
  enabled.combat!.nextMove = move;
  expect(
    enabled
      .telegraphs()
      .some((t) => t.kind === 'cells' && t.what === 'obstruction' && t.owner === 'slime'),
  ).toBe(true);
  enabled.combat!.update(enabled.combat!.actMs);
  expect(enabled.interference.placements.slime).toBe(1);
});

it('legacy Purify leaves owned obstructions intact and bottom-row sweeps cannot bypass their durability', () => {
  const hero = createHero();
  hero.spells.purify = newKnownSpell();
  hero.spells.bramble = newKnownSpell();
  const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(5), {
    boardMagic: true,
  });
  for (const e of Object.keys(hero.mana)) hero.mana[e as keyof typeof hero.mana] = 20;
  battle.placeObstructions('slime', [{ x: 2, y: 19, strength: 3 }]);
  battle.board.grid[18]![0] = 'stone';
  battle.combat!.gauge = -100000;
  battle.combat!.castSpell('purify');
  expect(battle.board.grid[18]![0]).toBe('blue');
  expect(battle.board.grid[19]![2]).toBe('stone');
  expect(battle.board.obstructions['2,19']?.strength).toBe(3);
  expect(battle.combat!.cannotCastReason('bramble')).toContain('resist');
  expect(() => battle.combat!.castSpell('bramble')).toThrow('resist');
});

it('Ice delays only the next interference packet, while later packets retain their own action timing', () => {
  const hero = createHero();
  hero.hp = hero.maxHp = 10000;
  const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(1), {
    boardMagic: true,
  });
  const combat = battle.combat!;
  battle.interference.cast('slime', 'water', 4, 19, 1, combat.actMs);
  combat.nextMove = { kind: 'obstruct', name: 'First', cells: [{ x: 1, y: 15, strength: 3 }] };
  combat.update(combat.actMs);
  expect(combat.delayedObstructions).toHaveLength(1);
  combat.nextMove = { kind: 'obstruct', name: 'Second', cells: [{ x: 3, y: 16, strength: 2 }] };
  combat.update(combat.actMs);
  expect(battle.interference.placements.slime).toBe(1);
  expect(battle.board.obstructions['3,16']).toBeDefined();
  expect(combat.delayedObstructions).toHaveLength(1);
  expect(
    battle.telegraphs().some((t) => t.owner === 'slime' && t.leadMs === combat.actMs * 3),
  ).toBe(true);
});
it('a falling NPC obstruction cannot overwrite the active piece or consume its Arcane duration', () => {
  const { board, interference } = fixture();
  board.grid[9]![1] = 'stone';
  board.spawn();
  board.active!.x = 1;
  board.active!.y = 8;
  board.active!.cells = [[0, 0]];
  interference.cast('enemy', 'earth', 1, 9, 1, 7000);
  interference.place('enemy', [{ x: 1, y: 3, strength: 2 }]);
  expect(board.grid[8]![1]).toBeNull();
  expect(Object.values(board.obstructions)).toEqual([]);
  expect(interference.effect('enemy').gravity).toBe(1);
  expect(interference.placements.enemy ?? 0).toBe(0);
});

describe('hostile placements cannot solve the player’s rows', () => {
  it.each([1, 2, 3])(
    'leaves the final gap open for a strength-%i enemy obstruction',
    (strength) => {
      const { board, interference } = fixture();
      board.grid[9] = ['red', 'red', 'red', 'red', 'red', null];
      const result = interference.place('enemy', [{ x: 5, y: 9, strength }]);
      expect(board.grid[9]).toEqual(['red', 'red', 'red', 'red', 'red', null]);
      expect(result.completed).toEqual([]);
      expect(interference.placements.enemy ?? 0).toBe(0);
      // No completed row is left waiting to reward an unrelated player action.
      expect(board.resolveBoardMagic({}).completed).toEqual([]);
    },
  );
  it('checks later cells in the same batch against the already placed cells', () => {
    const { board, interference } = fixture();
    board.grid[9] = ['red', 'red', null, 'red', 'red', null];
    const result = interference.place('enemy', [
      { x: 2, y: 9, strength: 3 },
      { x: 5, y: 9, strength: 1 },
    ]);
    expect(board.grid[9]).toEqual(['red', 'red', 'stone', 'red', 'red', null]);
    expect(board.obstructions['2,9']?.strength).toBe(3);
    expect(result.completed).toEqual([]);
    expect(interference.placements.enemy).toBe(1);
  });
  it('awards no line, mana, score or damage for an ordinary enemy placement', () => {
    const hero = createHero();
    const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(1), {
      boardMagic: true,
    });
    battle.board.grid[19] = Array.from({ length: 10 }, (_, x) => (x === 9 ? null : 'red'));
    const before = structuredClone({
      mana: hero.mana,
      score: battle.score,
      hp: battle.combat!.enemyHp,
    });
    battle.placeObstructions('slime', [{ x: 9, y: 19, strength: 1 }]);
    expect(battle.lines).toBe(0);
    expect(hero.mana).toEqual(before.mana);
    expect(battle.score).toBe(before.score);
    expect(battle.combat!.enemyHp).toBe(before.hp);
  });
  it('allows an explicitly helpful placement to complete a row', () => {
    const { board, interference } = fixture();
    board.grid[9] = ['red', 'red', 'red', 'red', 'red', null];
    const result = interference.place('ally', [{ x: 5, y: 9, strength: 1 }], 'helpful');
    expect(result.completed).toHaveLength(1);
    expect(board.grid[9]).toEqual(Array(6).fill(null));
  });
  it('preserves line clearing earned by converting the enemy’s send with Arcane Nature', () => {
    const hero = createHero();
    const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(1), {
      boardMagic: true,
    });
    battle.board.grid[19] = Array.from({ length: 10 }, (_, x) => (x === 9 ? null : 'red'));
    battle.interference.cast('slime', 'nature', 1, 19, 1, 8500);
    battle.placeObstructions('slime', [{ x: 9, y: 19, strength: 3 }]);
    expect(battle.lines).toBe(1);
    expect(hero.mana.fire).toBeGreaterThan(0);
    expect(battle.interference.effect('slime').nature).toBe(0);
  });
  it('preserves intentional row completion caused by Arcane Gravity', () => {
    const { board, interference } = fixture();
    board.grid[9] = ['red', 'red', 'red', 'red', 'red', null];
    interference.cast('enemy', 'earth', 1, 9, 1, 7000);
    const result = interference.place('enemy', [{ x: 5, y: 5, strength: 1 }]);
    expect(result.completed).toHaveLength(1);
    expect(board.grid[9]).toEqual(Array(6).fill(null));
    expect(interference.effect('enemy').gravity).toBe(0);
  });
});
