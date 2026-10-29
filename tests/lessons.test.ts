import { describe, expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import type { LessonChallenge } from '../src/battle/lesson';
import { bestPlacement } from '../src/core/bestFit';
import { emptyCounts } from '../src/core/elements';
import { ENEMIES } from '../src/data/enemies';
import { MAPS } from '../src/data/maps';
import { MENTORS, type MentorDef } from '../src/data/mentors';
import { describeInteraction, entitySprite, resolveBattle } from '../src/game/encounter';
import { createHero, learnSpell, type Hero } from '../src/game/hero';
import {
  FOE_ATK_PER_DIFFICULTY,
  FOE_HP_PER_DIFFICULTY,
  completeLesson,
  easeSeal,
  helpChance,
  heroHelpChance,
  lessonFoeId,
  lessonSpec,
  lessonsFor,
  scaledFoe,
  type LessonSpec,
} from '../src/game/lessons';
import { createRng } from '../src/core/rng';
import { enhancements, isSealed, knownSpell } from '../src/game/spells';
import { STAKES } from '../src/data/balance';
import {
  isAtHome,
  mentorEntities,
  mentorOf,
  mentorPlace,
  mentorStop,
  openStops,
} from '../src/world/mentors';
import { activeEntities, markDefeated, newGame, travel } from '../src/world/state';
import { SPELLS } from '../src/data/spells';
import { knownSpells, makeBattle, rowWithGaps, setUpVerticalIClear } from './helpers';

const mentor = (id: string): MentorDef => MENTORS[id]!;
const ready = { power: 1, efficiency: 1, effect: 1 };

/** A ranger who knows `spells` (level 1, nothing enhanced). */
function heroKnowing(...spells: string[]): Hero {
  const hero = createHero('ranger');
  hero.spells = knownSpells(...spells);
  return hero;
}

/** The hero with no story flags, as `lessonsFor` reads them. */
const seek = (hero: Hero) => ({ hero, flags: new Set<string>() });

describe('lessonsFor', () => {
  it('offers a missing primary and the combos whose spell is known', () => {
    expect(lessonsFor(seek(heroKnowing('gale', 'cure')), mentor('torva'))).toEqual([
      { spellId: 'fire', level: 1, difficulty: 1 },
      { spellId: 'wildfire', level: 1, difficulty: 2 },
    ]);
  });

  it('offers the support once the primary is known, and never a known spell again', () => {
    expect(lessonsFor(seek(heroKnowing('gale')), mentor('kestrel'))).toEqual([
      { spellId: 'gust', level: 1, difficulty: 1 },
    ]);
    expect(lessonsFor(seek(heroKnowing('gale', 'gust')), mentor('kestrel'))).toEqual([]);
  });

  it('raises a ready spell, with difficulty the level taught', () => {
    const hero = heroKnowing('gale', 'gust');
    hero.spells.gale = {
      level: 2,
      step: enhancements({ ...ready, power: 2 }),
      kept: enhancements(),
    };
    expect(lessonsFor(seek(hero), mentor('kestrel'))).toEqual([
      { spellId: 'gale', level: 3, difficulty: 3 },
    ]);
    hero.spells.gale.step = enhancements(ready);
    expect(lessonsFor(seek(hero), mentor('kestrel'))).toEqual([]);
  });

  it('offers Meteor (difficulty 3) once Quake and Shadow Drain are known', () => {
    const ids = (hero: Hero) => lessonsFor(seek(hero), mentor('torva')).map((l) => l.spellId);
    expect(ids(heroKnowing('fire', 'quake'))).not.toContain('meteor');
    expect(
      lessonsFor(seek(heroKnowing('fire', 'quake', 'shadow')), mentor('torva')),
    ).toContainEqual({
      spellId: 'meteor',
      level: 1,
      difficulty: 3,
    });
  });

  it('only teaches the mentor’s own element', () => {
    const scholar = heroKnowing('fire', 'blizzard', 'thunder', 'cure', 'quake', 'shadow', 'gale');
    for (const m of Object.values(MENTORS)) {
      const lessons = lessonsFor(seek(scholar), m);
      expect(lessons.length, m.id).toBeGreaterThan(0);
      for (const { spellId } of lessons) expect(SPELLS[spellId]?.category).toBe(m.element);
    }
  });
});

describe('helpChance', () => {
  it('is 30% less 5% per alignment point above the difficulty, clamped to 5–10%', () => {
    expect(helpChance(5, 1, 'fire', 'fire')).toBeCloseTo(0.1);
    expect(helpChance(6, 1, 'fire', 'fire')).toBeCloseTo(0.05);
    expect(helpChance(1, 1, 'fire', 'fire')).toBeCloseTo(0.1); // 30% before the clamp
    expect(helpChance(0, 4, 'fire', 'fire')).toBeCloseTo(0.1);
    expect(helpChance(12, 1, 'fire', 'fire')).toBeCloseTo(0.05);
    expect(helpChance(12, 1, 'fire', 'nature')).toBeCloseTo(0.03);
  });

  it('scales by how the mentor stands to the hero’s title element', () => {
    expect(helpChance(1, 1, 'fire', 'earth')).toBeCloseTo(0.08); // related
    expect(helpChance(1, 1, 'fire', 'nature')).toBeCloseTo(0.06); // fire beats nature
    expect(helpChance(1, 1, 'fire', 'water')).toBeCloseTo(0.08); // water beats fire
  });

  it('uses the hero’s alignment and title', () => {
    const hero = heroKnowing('gale', 'cure');
    expect(heroHelpChance(hero, mentor('kestrel'), 1)).toBeCloseTo(0.1);
    // A ranger's title is wind, which beats fire.
    expect(heroHelpChance(hero, mentor('torva'), 1)).toBeCloseTo(0.1 * 0.8);
  });
});

describe('lesson foes', () => {
  it('summons the trial wisp at home', () => {
    const torva = mentor('torva');
    expect(lessonFoeId(torva, torva.route[0])).toBe('emberWisp');
    expect(ENEMIES.emberWisp?.tint).toBe('fire');
  });

  it('fights the toughest local monster away, preferring the mentor’s element', () => {
    // The quarry has no fire monster: its toughest, the Stone Ogre.
    expect(lessonFoeId(mentor('torva'), mentor('torva').route[1]!)).toBe('stoneOgre');
    expect(lessonFoeId(mentor('dorn'), mentor('dorn').route[1]!)).toBe('goblin');
    expect(lessonFoeId(mentor('hazel'), mentor('hazel').route[1]!)).toBe('shroom');
    expect(lessonFoeId(mentor('rook'), mentor('rook').route[4]!)).toBe('shadeImp');
    expect(lessonFoeId(mentor('kestrel'), mentor('kestrel').route[1]!)).toBe('thunderhide');
  });

  it('falls back to the wisp where there are no monsters', () => {
    expect(lessonFoeId(mentor('kestrel'), mentor('kestrel').route[3]!)).toBe('galeWisp');
  });

  it('scales the foe with difficulty and drops its spoils', () => {
    const wisp = ENEMIES.emberWisp!;
    expect(scaledFoe(wisp, 1)).toMatchObject({ hp: wisp.hp, atk: wisp.atk, level: wisp.level });
    expect(scaledFoe(ENEMIES.goblin!, 3)).toMatchObject({
      hp: Math.round(ENEMIES.goblin!.hp * (1 + 2 * FOE_HP_PER_DIFFICULTY)),
      atk: ENEMIES.goblin!.atk + 2 * FOE_ATK_PER_DIFFICULTY,
      level: ENEMIES.goblin!.level + 2,
      xp: 0,
      gil: 0,
      drops: [],
    });
  });

  it('builds a lesson spec for wherever the mentor is now', () => {
    const state = newGame('ranger');
    const lesson = { spellId: 'gust', level: 1, difficulty: 1 };
    expect(lessonSpec(state, 'kestrel', lesson)).toEqual({
      kind: 'lesson',
      mentorId: 'kestrel',
      spellId: 'gust',
      enemyId: 'galeWisp',
      difficulty: 1,
    });
    state.victories = 15; // Kestrel moves every 3 wins: stop 5, the east road
    expect(lessonSpec(state, 'kestrel', lesson).enemyId).toBe('goblin');
    expect(() => lessonSpec(state, 'nobody', lesson)).toThrow('Unknown mentor');
  });
});

describe('completeLesson', () => {
  const spec = (spellId: string, mentorId = 'kestrel'): LessonSpec => ({
    kind: 'lesson',
    mentorId,
    spellId,
    enemyId: 'galeWisp',
    difficulty: 1,
  });

  it('teaches a new spell on a win', () => {
    const hero = heroKnowing('gale');
    expect(completeLesson(hero, spec('gust'), true)).toEqual([{ kind: 'spell', spellId: 'gust' }]);
    expect(knownSpell(hero, 'gust')?.level).toBe(1);
  });

  it('raises a ready spell, lifting its seal', () => {
    const hero = heroKnowing('gale');
    hero.spells.gale!.step = enhancements(ready);
    hero.seal = { spellId: 'gale', fights: 2 };
    expect(completeLesson(hero, spec('gale'), true)).toEqual([
      { kind: 'spellLevel', spellId: 'gale', level: 2 },
      { kind: 'unseal', spellId: 'gale' },
    ]);
    expect(hero.spells.gale?.level).toBe(2);
    expect(hero.seal).toBeNull();
  });

  it('seals a known spell whose lesson is lost, and patches the hero up to half HP', () => {
    const hero = heroKnowing('gale');
    hero.spells.gale!.step = enhancements(ready);
    hero.hp = 0;
    expect(completeLesson(hero, spec('gale'), false)).toEqual([{ kind: 'seal', spellId: 'gale' }]);
    expect(hero.seal).toEqual({ spellId: 'gale', fights: STAKES.sealFights });
    expect(isSealed(hero, 'gale')).toBe(true);
    expect(hero.hp).toBe(Math.ceil(hero.maxHp / 2));
    hero.hp = hero.maxHp;
    completeLesson(hero, spec('gale'), false);
    expect(hero.hp).toBe(hero.maxHp);
  });

  it('has nothing to seal for a lent spell (a lesson for a new one)', () => {
    const hero = heroKnowing('gale');
    expect(completeLesson(hero, spec('gust'), false)).toEqual([]);
    expect(hero.seal).toBeNull();
    expect(knownSpell(hero, 'gust')).toBeUndefined();
  });

  it('keeps one seal at a time: the first stays', () => {
    const hero = heroKnowing('gale', 'gust');
    completeLesson(hero, spec('gale'), false);
    completeLesson(hero, spec('gust'), false);
    expect(hero.seal?.spellId).toBe('gale');
    // Winning a different lesson teaches it but leaves the seal.
    expect(completeLesson(hero, spec('moonwind'), true)).toEqual([
      { kind: 'spell', spellId: 'moonwind' },
    ]);
    expect(hero.seal?.spellId).toBe('gale');
  });

  it('lifts a seal after enough won monster fights', () => {
    const hero = heroKnowing('gale');
    expect(easeSeal(hero)).toEqual([]);
    hero.seal = { spellId: 'gale', fights: 2 };
    expect(easeSeal(hero)).toEqual([]);
    expect(hero.seal).toEqual({ spellId: 'gale', fights: 1 });
    expect(easeSeal(hero)).toEqual([{ kind: 'unseal', spellId: 'gale' }]);
    expect(hero.seal).toBeNull();
  });

  it('rejects unknown mentors', () => {
    expect(() => completeLesson(createHero(), spec('gust', 'nobody'), true)).toThrow(
      'Unknown mentor',
    );
  });
});

describe('mentor movement', () => {
  it('starts every mentor at home', () => {
    for (const m of Object.values(MENTORS)) expect(mentorStop(m, new Set(), 0)).toBe(m.route[0]);
  });

  it('moves one stop every moveEvery wins, wrapping, deterministically', () => {
    const k = mentor('kestrel');
    const stops = [0, 2, 3, 6, 9, 18].map((wins) =>
      k.route.indexOf(mentorStop(k, new Set(), wins)),
    );
    expect(stops).toEqual([0, 0, 1, 2, 3, 0]);
    expect(mentorStop(k, new Set(), 7)).toBe(mentorStop(k, new Set(), 7));
  });

  it('adds flagged stops as the story opens them', () => {
    const torva = mentor('torva');
    expect(openStops(torva, new Set())).toHaveLength(4);
    expect(mentorStop(torva, new Set(), 16)).toBe(torva.route[0]);
    expect(mentorStop(torva, new Set(['cavePass']), 16)).toBe(torva.route[4]);
  });

  it('never arrives on the hero’s tile: they wait at the stop before', () => {
    const k = mentor('kestrel');
    const pass = k.route[1]!; // reached after 3 wins
    expect(mentorStop(k, new Set(), 3, { map: 'mossvale', x: 9, y: 12 })).toBe(pass);
    expect(mentorStop(k, new Set(), 3, pass)).toBe(k.route[0]);
    expect(mentorStop(k, new Set(), 0, k.route[0])).toBe(k.route[5]);
    const state = { ...newGame('ranger'), victories: 3, mapId: 'peaks', x: pass.x, y: pass.y };
    expect(mentorEntities(state).map((e) => e.mentorId)).toEqual([]);
    expect(mentorPlace(k, { ...state, x: pass.x + 1 })).toBe(pass);
  });

  it('knows home', () => {
    const torva = mentor('torva');
    expect(isAtHome(torva, torva.route[0])).toBe(true);
    expect(isAtHome(torva, torva.route[1]!)).toBe(false);
  });

  it('puts mentors on the map they stand on, as entities', () => {
    const state = newGame('ranger');
    // Every mentor starts in their own region, so nobody is in Mossvale.
    expect(mentorEntities(state)).toEqual([]);
    travel(state, { map: 'forge', x: 1, y: 15 });
    expect(mentorEntities(state)).toEqual([
      { id: 'mentor:torva', kind: 'mentor', mentorId: 'torva', x: 15, y: 8 },
    ]);
    travel(state, { map: 'overworld', x: 5, y: 6 });
    state.victories = 4;
    expect(
      activeEntities(state)
        .filter((e) => e.kind === 'mentor')
        .map((e) => e.id),
    ).toEqual(['mentor:dorn']);
  });

  it('counts monster victories, which move the mentors', () => {
    const state = newGame();
    const slime = MAPS.overworld!.entities[0]!;
    markDefeated(state, slime);
    markDefeated(state, MAPS.mossvale!.entities[0]!);
    expect(state.victories).toBe(1);
  });

  it('finds the mentor of each element', () => {
    expect(mentorOf('earth')?.id).toBe('dorn');
  });
});

describe('mentor encounters', () => {
  const torva = { id: 'mentor:torva', kind: 'mentor', mentorId: 'torva', x: 3, y: 11 } as const;

  it('offers lessons, or just talks when there is nothing to teach', () => {
    const state = newGame('ranger');
    expect(describeInteraction(state, torva)).toMatchObject({
      kind: 'lessons',
      title: 'Torva',
      sprite: 'char.020',
      mentorId: 'torva',
      lessons: [{ spellId: 'fire' }, { spellId: 'wildfire' }],
      sealed: null,
      silhouettes: [{ spell: SPELLS.volcano, state: 'hidden' }],
    });
    state.hero.seal = { spellId: 'fire', fights: 3 };
    expect(describeInteraction(state, torva)).toMatchObject({ sealed: 'fire' });
    state.hero.seal = null;
    // Nothing to teach but the hidden spell's silhouette…
    state.hero.spells = knownSpells('fire', 'kindle', 'wildfire');
    expect(describeInteraction(state, torva)).toMatchObject({
      lessons: [],
      silhouettes: [{ spell: SPELLS.volcano, state: 'hidden' }],
    });
    // …and once that is known too, the mentor just talks.
    state.hero.spells = knownSpells('fire', 'kindle', 'wildfire', 'volcano');
    expect(describeInteraction(state, torva)).toEqual({
      kind: 'message',
      title: 'Torva',
      sprite: 'char.020',
      // She has taught: her After the lesson row (warm, toward a fire hero).
      text: MENTORS.torva!.afterLesson.warm,
    });
    expect(entitySprite(torva)).toBe('char.020');
    expect(entitySprite(MAPS.overworld!.entities[0]!)).toBe('enemy.slime');
    expect(entitySprite(MAPS.mossvale!.entities[0]!)).toBe('char.038');
    expect(() => describeInteraction(state, { ...torva, mentorId: 'nobody' })).toThrow(
      'Unknown mentor',
    );
  });

  it('resolves a won lesson into the spell and the mentor’s words', () => {
    const state = newGame('ranger');
    const spec = lessonSpec(state, 'torva', { spellId: 'fire', level: 1, difficulty: 1 });
    const battle = makeBattle(spec, state.hero);
    battle.combat!.enemyHp = 0;
    const result = resolveBattle(state, torva, battle, createRng(1));
    expect(result).toMatchObject({
      won: true,
      gains: [{ kind: 'spell', spellId: 'fire' }],
      speech: MENTORS.torva!.winText,
      fell: false,
    });
    expect(state.victories).toBe(0);
  });

  it('resolves a lost lesson into a seal, without falling', () => {
    const state = newGame('ranger');
    learnSpell(state.hero, 'fire');
    const spec = lessonSpec(state, 'torva', { spellId: 'fire', level: 2, difficulty: 2 });
    const battle = makeBattle(spec, state.hero);
    state.hero.hp = 0;
    const result = resolveBattle(state, torva, battle, createRng(1));
    expect(result).toMatchObject({ won: false, speech: MENTORS.torva!.loseText, fell: false });
    expect(state.mapId).toBe('mossvale');
    expect(state.hero.seal).toEqual({ spellId: 'fire', fights: STAKES.sealFights });
  });

  it('rejects a mentor battle that is not a lesson', () => {
    const state = newGame();
    const battle = makeBattle({ kind: 'combat', enemyId: 'slime' }, state.hero);
    expect(() => resolveBattle(state, torva, battle, createRng(1))).toThrow('Expected a lesson');
  });
});

describe('LessonChallenge', () => {
  /** A lesson with Torva against her wisp; the hero's pools start empty. */
  function lesson(difficulty = 1) {
    const hero = heroKnowing('gale', 'cure');
    hero.mana = emptyCounts();
    const spec: LessonSpec = {
      kind: 'lesson',
      mentorId: 'torva',
      spellId: 'fire',
      enemyId: 'emberWisp',
      difficulty,
    };
    const battle = makeBattle(spec, hero);
    const challenge = battle.challenge as LessonChallenge;
    challenge.gauge = -1e9; // the enemy never moves
    return { battle, challenge, hero };
  }

  it('fights a scaled foe at the scaled speed, as a lesson', () => {
    const { battle, challenge } = lesson(2);
    expect(challenge.enemy.hp).toBe(Math.round(50 * (1 + FOE_HP_PER_DIFFICULTY)));
    expect(battle.level).toBe(3);
    expect(challenge.objective().label).toBe('Lesson: Fire');
    expect(challenge.helpChance).toBeCloseTo(0.1 * 0.8);
  });

  it('tosses the best-fitting shape in the mentor’s colour, entering as usual', () => {
    const { battle, challenge, hero } = lesson();
    (challenge as { helpChance: number }).helpChance = 1;
    const board = battle.board;
    for (let y = 16; y < 20; y++) board.grid[y] = rowWithGaps(10, [9]);
    battle.input('hardDrop'); // lands in the middle, clearing nothing
    expect(bestPlacement(board.grid)).toMatchObject({ name: 'I', x: 9, lines: 4 });
    // The hero still has to place it: it spawns flat at the usual column.
    expect(board.active).toMatchObject({ name: 'I', color: 'red', recolored: true, x: 3, y: 0 });
    expect(battle.events.at(-1)?.event).toEqual({ kind: 'toss', element: 'fire', piece: 'I' });
    battle.input('rotate');
    for (let i = 0; i < 10; i++) battle.input('right');
    battle.input('hardDrop');
    expect(battle.lines).toBe(4);
    // Its four crystals were red: the mentor's fire mana (×2 for four lines).
    expect(hero.mana.fire).toBe(8);
  });

  it('is a real fight: hard-dropping in place with no spells usually loses', () => {
    let losses = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const hero = createHero('ranger');
      const spec = lessonSpec(newGame('ranger'), 'kestrel', {
        spellId: 'gust',
        level: 1,
        difficulty: 1,
      });
      const battle = new Battle(spec, hero, createRng(seed));
      for (let i = 0; i < 400 && battle.status === 'ongoing'; i++) battle.input('hardDrop');
      if (battle.status === 'lost') losses++;
    }
    expect(losses).toBeGreaterThanOrEqual(8);
  });

  it('never tosses without luck', () => {
    const { battle, challenge } = lesson();
    (challenge as { helpChance: number }).helpChance = 0;
    for (let i = 0; i < 8; i++) battle.input('hardDrop');
    expect(battle.events.some((e) => e.event.kind === 'toss')).toBe(false);
  });

  it('does not toss once the foe is down', () => {
    const { battle, challenge } = lesson();
    (challenge as { helpChance: number }).helpChance = 1;
    challenge.enemyHp = 1;
    challenge.shield = 'broken';
    setUpVerticalIClear(battle.board, 1);
    battle.input('hardDrop');
    expect(battle.status).toBe('won');
    expect(battle.events.some((e) => e.event.kind === 'toss')).toBe(false);
  });

  it('rejects unknown lessons', () => {
    expect(() =>
      makeBattle({
        kind: 'lesson',
        mentorId: 'x',
        spellId: 'fire',
        enemyId: 'slime',
        difficulty: 1,
      }),
    ).toThrow('Unknown lesson');
  });
});
