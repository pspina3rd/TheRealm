import { describe, expect, it } from 'vitest';
import type { Battle } from '../src/battle/battle';
import { WEAK_MULTIPLIER, elementMultiplier } from '../src/battle/elemental';
import type { LockResult } from '../src/core/board';
import { ELEMENTS } from '../src/core/elements';
import { MENTORS } from '../src/data/mentors';
import { SPELLS } from '../src/data/spells';
import type { SpellDef } from '../src/data/types';
import { describeInteraction } from '../src/game/encounter';
import { featCount, featsOfLock, recordFeats } from '../src/game/feats';
import { addItem, createHero, itemCount, learnSpell, type Hero } from '../src/game/hero';
import {
  bringItems,
  giftFlag,
  hiddenSlots,
  hiddenSpells,
  hiddenState,
  isRevealed,
  itemsFor,
  seeksHero,
} from '../src/game/hidden';
import { completeLesson, lessonsFor } from '../src/game/lessons';
import {
  castEffect,
  castPower,
  castSpellFor,
  castSummary,
  newKnownSpell,
} from '../src/game/spells';
import { statRanks } from '../src/game/stats';
import { mapDistance, mentorEntities, mentorPlace, seekingStop } from '../src/world/mentors';
import { newGame, type GameState } from '../src/world/state';
import { forceQueue, knownSpells, makeBattle, rowWithGaps, setUpVerticalIClear } from './helpers';

const spell = (id: string): SpellDef => SPELLS[id]!;
const mentor = (id: string) => MENTORS[id]!;

/** A ranger knowing `spells`, with no story flags. */
function seeker(...spells: string[]): { hero: Hero; flags: Set<string> } {
  const hero = createHero('ranger');
  hero.spells = knownSpells(...spells);
  return { hero, flags: new Set() };
}

/** A lock result clearing `lines`. */
function lock(lines: LockResult['lines']): LockResult {
  return {
    linesCleared: lines.length,
    clearedCells: {},
    lines,
    rows: [],
    toppedOut: false,
    holesMade: 0,
  };
}

describe('hidden spell data', () => {
  it('hides one single-level spell per element, using every kind of unlock', () => {
    const hidden = hiddenSpells();
    expect(hidden.map((s) => s.category)).toEqual([...ELEMENTS]);
    expect(hidden.every((s) => s.levels.length === 1)).toBe(true);
    expect(new Set(hidden.map((s) => s.hidden?.kind))).toEqual(
      new Set(['stat', 'alignment', 'pattern', 'quest', 'item']),
    );
    expect(hiddenSpells('arcane')).toEqual([spell('eclipse')]);
  });

  it('summarises and scores each hidden spell', () => {
    const rows = hiddenSpells().map((s) => {
      const cast = castSpellFor(s, newKnownSpell());
      return [castSummary(cast), castPower(cast.effect), castEffect(cast)];
    });
    expect(rows).toEqual([
      ['Volcano · Lv 1 · clear 3 rows · 40 damage', 40, 3],
      ['Purify · Lv 1 · stone becomes crystal', 0, 0],
      ['Ball Lightning · Lv 1 · 2 damage per crystal of its element (max 40)', 2, 0],
      ['Bloom · Lv 1 · heal 6 × 8 pieces', 6, 8],
      ['Fault Line · Lv 1 · every hit is a weakness × 4 pieces', 0, 4],
      ['Eclipse · Lv 1 · 36 damage · heal 100% of it', 36, 100],
      ['Tempest · Lv 1 · 34 damage · slow 8 pieces', 34, 8],
    ]);
  });
});

describe('revealing hidden spells', () => {
  it('stat: Fault Line at Insight 5', () => {
    const s = seeker();
    s.hero.stats.insight = 4;
    expect(isRevealed(spell('faultLine'), s)).toBe(false);
    s.hero.stats.insight = 5;
    expect(isRevealed(spell('faultLine'), s)).toBe(true);
  });

  it('alignment: Volcano at fire 4 and earth 4', () => {
    // Magma and Meteor count toward both elements.
    const s = seeker('fire', 'kindle', 'magma', 'meteor', 'quake');
    expect(isRevealed(spell('volcano'), s)).toBe(false); // earth 3
    learnSpell(s.hero, 'stoneskin');
    expect(isRevealed(spell('volcano'), s)).toBe(true);
  });

  it('pattern: Ball Lightning after 2 pure lightning lines, Tempest after a hasted clear', () => {
    const s = seeker();
    s.hero.feats = { 'pure.lightning': 1, 'pure.fire': 9 };
    expect(isRevealed(spell('ballLightning'), s)).toBe(false);
    expect(isRevealed(spell('tempest'), s)).toBe(false);
    recordFeats(s.hero, ['pure.lightning', 'hastedClear']);
    expect(isRevealed(spell('ballLightning'), s)).toBe(true);
    expect(isRevealed(spell('tempest'), s)).toBe(true);
  });

  it('quest: Purify once the shrine is restored', () => {
    const s = seeker();
    expect(isRevealed(spell('purify'), s)).toBe(false);
    s.flags.add('shrineRestored');
    expect(isRevealed(spell('purify'), s)).toBe(true);
  });

  it('item: Eclipse once the Moon Shard is brought to the arcane mentor', () => {
    const s = seeker();
    expect(bringItems(s, mentor('selene'))).toEqual([]); // nothing to bring
    expect(itemsFor(s, mentor('selene'))).toEqual([]);
    expect(isRevealed(spell('eclipse'), s)).toBe(false);
    addItem(s.hero, 'moonShard', 2);
    // Selene asks for it (the hero may keep it); the wrong mentor doesn't.
    expect(itemsFor(s, mentor('selene'))).toEqual(['moonShard']);
    expect(itemsFor(s, mentor('torva'))).toEqual([]);
    expect(bringItems(s, mentor('torva'))).toEqual([]);
    expect(bringItems(s, mentor('selene'))).toEqual([
      { kind: 'item', itemId: 'moonShard', count: -1 },
    ]);
    expect(s.flags.has(giftFlag('eclipse'))).toBe(true);
    expect(isRevealed(spell('eclipse'), s)).toBe(true);
    // Once revealed, no second shard is taken.
    expect(itemsFor(s, mentor('selene'))).toEqual([]);
    expect(bringItems(s, mentor('selene'))).toEqual([]);
    expect(itemCount(s.hero, 'moonShard')).toBe(1);
  });

  it('treats ordinary spells as revealed', () => {
    expect(isRevealed(spell('fire'), seeker())).toBe(true);
  });
});

describe('silhouettes', () => {
  it('derives hidden, unlocked and known', () => {
    const s = seeker();
    expect(hiddenState(spell('purify'), s)).toBe('hidden');
    s.flags.add('shrineRestored');
    expect(hiddenState(spell('purify'), s)).toBe('unlocked');
    learnSpell(s.hero, 'purify');
    expect(hiddenState(spell('purify'), s)).toBe('known');
  });

  it('lists the hidden spells not yet known, with their state', () => {
    const s = seeker('purify');
    s.hero.stats.insight = 5;
    const slots = hiddenSlots(s);
    expect(slots.map((slot) => slot.spell.id)).toEqual([
      'volcano',
      'ballLightning',
      'bloom',
      'faultLine',
      'eclipse',
      'tempest',
    ]);
    expect(slots.find((slot) => slot.spell.id === 'faultLine')?.state).toBe('unlocked');
    expect(hiddenSlots(s, 'water')).toEqual([]);
  });
});

describe('board feats', () => {
  it('counts a cleared line with 7 or more crystals of one element as pure', () => {
    expect(
      featsOfLock(
        lock([{ gold: 10 }, { gold: 7, red: 3 }, { cyan: 7, stone: 3 }, { gold: 6, red: 4 }]),
        false,
      ),
    ).toEqual(['pure.lightning', 'pure.lightning', 'pure.wind']);
    expect(featsOfLock(lock([{ stone: 10 }, { gold: 6, stone: 4 }]), false)).toEqual([]);
  });

  it('counts a clear of two or more lines only under haste', () => {
    const double = lock([
      { red: 5, cyan: 5 },
      { red: 5, cyan: 5 },
    ]);
    expect(featsOfLock(double, true)).toEqual(['hastedClear']);
    expect(featsOfLock(double, false)).toEqual([]);
    expect(featsOfLock(lock(double.lines.slice(1)), true)).toEqual([]);
  });

  it('adds up over the hero’s life', () => {
    const hero = createHero();
    expect(featCount(hero, 'pure.fire')).toBe(0);
    recordFeats(hero, ['pure.fire', 'pure.fire', 'hastedClear']);
    recordFeats(hero, ['pure.fire']);
    expect(hero.feats).toEqual({ 'pure.fire': 3, hastedClear: 1 });
  });

  it('are recorded only in fights, never on a puzzle or trade board', () => {
    const battle = makeBattle({ kind: 'combat', enemyId: 'slime' });
    battle.combat!.enemyHp = 999;
    setUpVerticalIClear(battle.board, 4, 'cyan'); // the I is cyan too: four pure wind lines
    battle.hastePieces = 2;
    battle.input('hardDrop');
    expect(battle.hero.feats).toEqual({ 'pure.wind': 4, hastedClear: 1 });

    const barter = makeBattle({ kind: 'barter', wants: { red: 4 }, pieceLimit: 9 });
    setUpVerticalIClear(barter.board, 1, 'red');
    barter.input('hardDrop');
    expect(barter.hero.feats).toEqual({});

    const puzzle = makeBattle({ kind: 'puzzle', rows: [], queue: ['I'], linesToClear: 4 });
    setUpVerticalIClear(puzzle.board, 4, 'cyan');
    puzzle.input('hardDrop');
    expect(puzzle.hero.feats).toEqual({});
  });
});

describe('mentors teaching hidden spells', () => {
  it('offers a hidden spell only once revealed, one harder than usual', () => {
    const s = seeker('thunder', 'static');
    expect(lessonsFor(s, mentor('rook'))).toEqual([]);
    s.hero.feats['pure.lightning'] = 2;
    expect(lessonsFor(s, mentor('rook'))).toEqual([
      { spellId: 'ballLightning', level: 1, difficulty: 2 },
    ]);
    const torva = seeker(
      'fire',
      'kindle',
      'magma',
      'meteor',
      'quake',
      'stoneskin',
      'gale',
      'wildfire',
    );
    expect(lessonsFor(torva, mentor('torva'))).toEqual([
      { spellId: 'volcano', level: 1, difficulty: 3 },
    ]);
  });

  it('teaches a revealed hidden spell by winning the lesson', () => {
    const s = seeker('cure');
    s.flags.add('shrineRestored');
    const gains = completeLesson(
      s.hero,
      { kind: 'lesson', mentorId: 'maren', spellId: 'purify', enemyId: 'tideWisp', difficulty: 2 },
      true,
    );
    expect(gains).toEqual([{ kind: 'spell', spellId: 'purify' }]);
    expect(lessonsFor(s, mentor('maren')).map((l) => l.spellId)).not.toContain('purify');
  });

  it('shows the mentor’s unrevealed hidden spells as silhouettes', () => {
    const state = newGame('ranger');
    const selene = { id: 'mentor:selene', kind: 'mentor' as const, mentorId: 'selene', x: 0, y: 0 };
    expect(describeInteraction(state, selene)).toMatchObject({
      silhouettes: [{ spell: spell('eclipse'), state: 'hidden' }],
    });
    state.flags.add(giftFlag('eclipse'));
    expect(describeInteraction(state, selene)).toMatchObject({
      silhouettes: [],
      lessons: expect.arrayContaining([expect.objectContaining({ spellId: 'eclipse' })]),
    });
  });
});

describe('a mentor who noticed seeks the hero out', () => {
  const rook = mentor('rook');
  /** A game where Rook noticed the hero's pure lightning lines. */
  function noticed(map: string, x = 1, y = 1): GameState {
    const state = newGame('ranger');
    Object.assign(state, { mapId: map, x, y });
    state.hero.feats['pure.lightning'] = 2;
    return state;
  }

  it('counts map crossings by warps', () => {
    expect(mapDistance('mossvale', 'mossvale')).toBe(0);
    expect(mapDistance('mossvale', 'overworld')).toBe(1);
    expect(mapDistance('mossvale', 'brightwater')).toBe(2);
    expect(mapDistance('mossvale', 'caves2')).toBe(6);
    // Locked warps don't count for a hero without their flags.
    expect(mapDistance('mossvale', 'peaks', new Set())).toBe(Infinity);
    expect(mapDistance('mossvale', 'peaks', new Set(['peakGate']))).toBe(2);
    expect(mapDistance('mossvale', 'nowhere')).toBe(Infinity);
  });

  it('only seeks while a pattern-revealed spell is untaught', () => {
    const state = noticed('mossvale');
    expect(seeksHero(rook, state)).toBe(true);
    learnSpell(state.hero, 'ballLightning');
    expect(seeksHero(rook, state)).toBe(false);
    // Other unlocks don't make a mentor seek the hero.
    const maren = newGame();
    maren.flags.add('shrineRestored');
    expect(seeksHero(mentor('maren'), maren)).toBe(false);
  });

  it('waits on the hero’s map, or the open stop fewest crossings away', () => {
    // Rook's open stops the hero can reach: north-east peaks (overworld) and the Brightwater fountain.
    expect(mentorPlace(rook, noticed('brightwater'))).toMatchObject({ map: 'brightwater' });
    expect(mentorPlace(rook, noticed('mossvale'))).toMatchObject({ map: 'overworld' });
    expect(mentorEntities(noticed('brightwater'))).toContainEqual(
      expect.objectContaining({ mentorId: 'rook', x: 17, y: 12 }),
    );
    // Without the feat, Rook keeps to his route (home, the storm beacon).
    const state = noticed('brightwater');
    state.hero.feats = {};
    expect(mentorPlace(rook, state)).toMatchObject({ map: 'peaks', x: 17, y: 4 });
  });

  it('never arrives on the hero’s tile', () => {
    const flags = new Set<string>();
    expect(seekingStop(rook, flags, { map: 'brightwater', x: 17, y: 12 })).toMatchObject({
      map: 'overworld',
    });
    // A mentor with one open stop stays there even then.
    const loner = { ...rook, route: [rook.route[0]] as const };
    expect(seekingStop(loner, flags, { ...rook.route[0] })).toBe(rook.route[0]);
  });
});

describe('hidden spells in combat', () => {
  /** A fight against a slime knowing `spells`, with full mana and a quiet enemy. */
  function fight(...spells: string[]) {
    const battle = makeBattle({ kind: 'combat', enemyId: 'slime' });
    const combat = battle.combat!;
    battle.hero.spells = knownSpells(...spells);
    battle.hero.stats = statRanks();
    battle.hero.mana = Object.fromEntries(ELEMENTS.map((e) => [e, 30])) as Hero['mana'];
    battle.hero.manaCap = 30;
    combat.enemyHp = 999;
    combat.gauge = -1e9; // the enemy never moves
    return { battle, combat, hero: battle.hero };
  }
  const level = (battle: Battle) => 2 * battle.hero.level;

  it('Volcano clears 3 rows and strikes as fire, with no level bonus', () => {
    const { battle, combat } = fight('volcano');
    for (let y = 17; y < 20; y++) battle.board.grid[y] = rowWithGaps(10, [0]);
    combat.castSpell('volcano');
    expect(battle.board.count('stone')).toBe(0);
    expect(combat.enemyHp).toBe(999 - Math.round(40 * elementMultiplier(combat.enemy, 'fire')));
  });

  it('Purify turns every stone into water crystals, and needs stone', () => {
    const { battle, combat } = fight('purify');
    expect(combat.cannotCastReason('purify')).toBe('No stone to purify.');
    battle.board.grid[19] = rowWithGaps(10, [3]);
    battle.board.grid[18] = rowWithGaps(10, [0, 1], 'red');
    combat.castSpell('purify');
    expect(battle.board.count('stone')).toBe(0);
    expect(battle.board.count('blue')).toBe(9);
    expect(battle.board.count('red')).toBe(8);
  });

  it('Ball Lightning strikes per lightning crystal on the board', () => {
    const { battle, combat } = fight('ballLightning');
    battle.board.grid[19] = rowWithGaps(10, [0, 1, 2], 'gold');
    combat.castSpell('ballLightning');
    expect(combat.enemyHp).toBe(
      999 - Math.round(2 * 7 * elementMultiplier(combat.enemy, 'lightning')),
    );
  });

  it('Ball Lightning needs lightning crystals and strikes for at most 40', () => {
    const { battle, combat } = fight('ballLightning');
    expect(combat.cannotCastReason('ballLightning')).toBe(
      'No crystals of its element on the board.',
    );
    for (let y = 16; y < 20; y++) battle.board.grid[y] = rowWithGaps(10, [0], 'gold'); // 36
    combat.castSpell('ballLightning');
    expect(combat.enemyHp).toBe(
      999 - Math.round(40 * elementMultiplier(combat.enemy, 'lightning')),
    );
  });

  it('keeps the stronger heal-over-time: Regen never cuts Bloom short', () => {
    const { combat, hero } = fight('bloom', 'regen');
    hero.hp = 1;
    combat.castSpell('bloom');
    combat.castSpell('regen');
    expect(combat.regen).toEqual({ amount: 6, pieces: 8 });
    combat.regen = { amount: 0, pieces: 0 };
    combat.castSpell('regen');
    combat.castSpell('bloom');
    expect(combat.regen).toEqual({ amount: 6, pieces: 8 });
  });

  it('Fault Line exposes Kindle’s burn on each of its 4 pieces, like every other hit', () => {
    const { battle, combat } = fight('faultLine', 'kindle');
    // A fire foe resists fire: Kindle's 4 burns for 2, or 6 while exposed.
    Object.assign(combat, { enemy: { ...combat.enemy, element: 'fire' } });
    combat.castSpell('faultLine');
    combat.castSpell('kindle');
    const burns = () =>
      battle.events.flatMap((e) =>
        e.event.kind === 'enemyHit' && e.event.element === 'fire' ? [e.event.amount] : [],
      );
    forceQueue(battle, ['O', 'O', 'O', 'O', 'O']);
    for (let i = 0; i < 5; i++) battle.input('hardDrop');
    expect(burns()).toEqual([6, 6, 6, 6, 2]);
  });

  it('Eclipse heals all the damage it actually deals, Fault Line included', () => {
    const { combat, hero } = fight('faultLine', 'eclipse');
    hero.hp = 1;
    combat.castSpell('faultLine');
    combat.castSpell('eclipse');
    const dealt = 999 - combat.enemyHp;
    expect(dealt).toBe(Math.round((36 + 2 * hero.level) * WEAK_MULTIPLIER));
    expect(hero.hp).toBe(Math.min(hero.maxHp, 1 + dealt));
  });

  it('Bloom heals after each of the next 8 pieces', () => {
    const { battle, combat, hero } = fight('bloom');
    hero.hp = 1;
    combat.castSpell('bloom');
    expect(combat.regen).toEqual({ amount: 6, pieces: 8 });
    battle.input('hardDrop');
    expect(hero.hp).toBe(7);
  });

  it('Fault Line makes every element a weakness for 4 pieces', () => {
    const { battle, combat } = fight('faultLine');
    const resisted = combat.resistances()[0]!;
    combat.castSpell('faultLine');
    expect(combat.weaknesses()).toEqual([...ELEMENTS]);
    expect(combat.resistances()).toEqual([]);
    expect(combat.multiplier(resisted)).toBe(WEAK_MULTIPLIER);
    // Every cleared crystal counts as a weakness: the strike is ×1.5.
    setUpVerticalIClear(battle.board, 1, 'orange');
    battle.input('hardDrop');
    expect(combat.exposed).toBe(3);
    const hit = battle.events.filter((e) => e.event.kind === 'enemyHit')[0]?.event;
    expect(hit).toMatchObject({
      amount: Math.round(3 * (1 + 0.04 * battle.hero.atk) * 1.5),
      affinity: 'weak',
    });
    forceQueue(battle, ['O', 'O', 'O']);
    for (let i = 0; i < 3; i++) battle.input('hardDrop');
    expect(combat.exposed).toBe(0);
    expect(combat.multiplier(resisted)).toBeLessThan(1);
  });

  it('Eclipse heals all the damage it deals', () => {
    const { battle, combat, hero } = fight('eclipse');
    hero.hp = 1;
    combat.castSpell('eclipse');
    const dealt = 999 - combat.enemyHp;
    expect(dealt).toBe(
      Math.round((36 + level(battle)) * elementMultiplier(combat.enemy, 'arcane')),
    );
    expect(hero.hp).toBe(Math.min(hero.maxHp, 1 + dealt));
  });

  it('Tempest strikes and slows the next 8 pieces', () => {
    const { battle, combat } = fight('tempest');
    battle.hastePieces = 3;
    combat.castSpell('tempest');
    expect(battle.slowPieces).toBe(8);
    expect(battle.hastePieces).toBe(0);
    expect(combat.enemyHp).toBe(
      999 - Math.round((34 + level(battle)) * elementMultiplier(combat.enemy, 'wind')),
    );
  });
});
