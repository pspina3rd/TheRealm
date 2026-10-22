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
  seeksHero,
} from '../src/game/hidden';
import { completeLesson, lessonsFor } from '../src/game/lessons';
import { statRanks } from '../src/game/stats';
import { mapDistance, mentorEntities, mentorPlace, seekingStop } from '../src/world/mentors';
import { newGame, type GameState } from '../src/world/state';
import { knownSpells, makeBattle, rowWithGaps, setUpVerticalIClear } from './helpers';

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
  return { linesCleared: lines.length, clearedCells: {}, lines, rows: [], toppedOut: false };
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

  it('pattern: Ball Lightning after 6 pure lightning lines, Tempest after a hasted quad', () => {
    const s = seeker();
    s.hero.feats = { 'pure.lightning': 5, 'pure.fire': 9 };
    expect(isRevealed(spell('ballLightning'), s)).toBe(false);
    expect(isRevealed(spell('tempest'), s)).toBe(false);
    recordFeats(s.hero, ['pure.lightning', 'hastedQuad']);
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
    expect(isRevealed(spell('eclipse'), s)).toBe(false);
    addItem(s.hero, 'moonShard', 2);
    expect(bringItems(s, mentor('torva'))).toEqual([]); // the wrong mentor
    expect(bringItems(s, mentor('selene'))).toEqual([
      { kind: 'item', itemId: 'moonShard', count: -1 },
    ]);
    expect(s.flags.has(giftFlag('eclipse'))).toBe(true);
    expect(isRevealed(spell('eclipse'), s)).toBe(true);
    // Once revealed, no second shard is taken.
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
  it('counts each cleared line of one element alone as pure', () => {
    expect(featsOfLock(lock([{ gold: 10 }, { gold: 9, red: 1 }, { cyan: 10, red: 0 }]), false)).toEqual(
      ['pure.lightning', 'pure.wind'],
    );
    expect(featsOfLock(lock([{ stone: 10 }, { gold: 7, stone: 3 }]), false)).toEqual([]);
  });

  it('counts a four-line clear only under haste', () => {
    const quad = lock([{ red: 9, cyan: 1 }, { red: 9, cyan: 1 }, { red: 9, cyan: 1 }, { red: 9, cyan: 1 }]);
    expect(featsOfLock(quad, true)).toEqual(['hastedQuad']);
    expect(featsOfLock(quad, false)).toEqual([]);
    expect(featsOfLock(lock(quad.lines.slice(1)), true)).toEqual([]);
  });

  it('adds up over the hero’s life', () => {
    const hero = createHero();
    expect(featCount(hero, 'pure.fire')).toBe(0);
    recordFeats(hero, ['pure.fire', 'pure.fire', 'hastedQuad']);
    recordFeats(hero, ['pure.fire']);
    expect(hero.feats).toEqual({ 'pure.fire': 3, hastedQuad: 1 });
  });

  it('are recorded by battles of every kind', () => {
    const battle = makeBattle({ kind: 'combat', enemyId: 'slime' });
    battle.combat!.enemyHp = 999;
    setUpVerticalIClear(battle.board, 4, 'cyan'); // the I is cyan too: four pure wind lines
    battle.hastePieces = 2;
    battle.input('hardDrop');
    expect(battle.hero.feats).toEqual({ 'pure.wind': 4, hastedQuad: 1 });

    const barter = makeBattle({ kind: 'barter', wants: { red: 4 }, pieceLimit: 9 });
    setUpVerticalIClear(barter.board, 1, 'red');
    barter.input('hardDrop');
    expect(barter.hero.feats).toEqual({});
  });
});

describe('mentors teaching hidden spells', () => {
  it('offers a hidden spell only once revealed, one harder than usual', () => {
    const s = seeker('thunder', 'static');
    expect(lessonsFor(s, mentor('rook'))).toEqual([]);
    s.hero.feats['pure.lightning'] = 6;
    expect(lessonsFor(s, mentor('rook'))).toEqual([
      { spellId: 'ballLightning', level: 1, difficulty: 2 },
    ]);
    const torva = seeker('fire', 'kindle', 'magma', 'meteor', 'quake', 'stoneskin', 'gale', 'wildfire');
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
    expect(describeInteraction(state, selene)).toMatchObject({ silhouettes: [spell('eclipse')] });
    state.flags.add(giftFlag('eclipse'));
    expect(describeInteraction(state, selene)).toMatchObject({
      silhouettes: [],
      lessons: [expect.objectContaining({ spellId: 'eclipse' })],
    });
  });
});

describe('a mentor who noticed seeks the hero out', () => {
  const rook = mentor('rook');
  /** A game where Rook noticed the hero's pure lightning lines. */
  function noticed(map: string, x = 1, y = 1): GameState {
    const state = newGame('ranger');
    Object.assign(state, { mapId: map, x, y });
    state.hero.feats['pure.lightning'] = 6;
    return state;
  }

  it('counts map crossings by warps', () => {
    expect(mapDistance('mossvale', 'mossvale')).toBe(0);
    expect(mapDistance('mossvale', 'overworld')).toBe(1);
    expect(mapDistance('mossvale', 'brightwater')).toBe(2);
    expect(mapDistance('mossvale', 'caves2')).toBe(3);
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
    // Rook's open stops: north-east peaks (overworld) and the Brightwater fountain.
    expect(mentorPlace(rook, noticed('brightwater'))).toMatchObject({ map: 'brightwater' });
    expect(mentorPlace(rook, noticed('mossvale'))).toMatchObject({ map: 'overworld' });
    expect(mentorEntities(noticed('brightwater'))).toContainEqual(
      expect.objectContaining({ mentorId: 'rook', x: 17, y: 12 }),
    );
    // Without the feat, Rook keeps to his route (home, the overworld peaks).
    const state = noticed('brightwater');
    state.hero.feats = {};
    expect(mentorPlace(rook, state)).toMatchObject({ map: 'overworld', x: 36, y: 6 });
  });

  it('never arrives on the hero’s tile', () => {
    const flags = new Set<string>();
    expect(seekingStop(rook, flags, { map: 'brightwater', x: 17, y: 12 })).toMatchObject({
      map: 'overworld',
    });
    // A mentor with one open stop stays there even then.
    const loner = { ...rook, route: [rook.route[0]] as const };
    expect(seekingStop(loner, flags, { map: 'overworld', x: 36, y: 6 })).toBe(rook.route[0]);
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
    combat.countdown = 99;
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
    // Every cleared crystal counts as a weakness: +2 strike damage each.
    setUpVerticalIClear(battle.board, 1, 'orange');
    battle.input('hardDrop');
    expect(combat.exposed).toBe(3);
    const hit = battle.events.filter((e) => e.event.kind === 'enemyHit')[0]?.event;
    expect(hit).toMatchObject({ amount: 8 + battle.hero.atk + 2 * 9 + 0, affinity: 'weak' });
    for (let i = 0; i < 3; i++) battle.input('hardDrop');
    expect(combat.exposed).toBe(0);
    expect(combat.multiplier(resisted)).toBeLessThan(1);
  });

  it('Eclipse heals all the damage it deals', () => {
    const { battle, combat, hero } = fight('eclipse');
    hero.hp = 1;
    combat.castSpell('eclipse');
    const dealt = 999 - combat.enemyHp;
    expect(dealt).toBe(Math.round((36 + level(battle)) * elementMultiplier(combat.enemy, 'arcane')));
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
