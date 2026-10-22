import { describe, expect, it } from 'vitest';
import type { LessonChallenge } from '../src/battle/lesson';
import { bestPlacement } from '../src/core/bestFit';
import { emptyCounts } from '../src/core/elements';
import { ENEMIES } from '../src/data/enemies';
import { MAPS } from '../src/data/maps';
import { MENTORS, type MentorDef } from '../src/data/mentors';
import { describeInteraction, entitySprite, resolveBattle } from '../src/game/encounter';
import { createHero, type Hero } from '../src/game/hero';
import {
  FOE_ATK_PER_DIFFICULTY,
  completeLesson,
  helpChance,
  heroHelpChance,
  lessonFoeId,
  lessonSpec,
  lessonsFor,
  scaledFoe,
  type LessonSpec,
} from '../src/game/lessons';
import { createRng } from '../src/core/rng';
import { enhancements, knownSpell } from '../src/game/spells';
import { isAtHome, mentorEntities, mentorOf, mentorStop, openStops } from '../src/world/mentors';
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

describe('lessonsFor', () => {
  it('offers a missing primary and the combos whose spell is known', () => {
    expect(lessonsFor(heroKnowing('gale', 'cure'), mentor('torva'))).toEqual([
      { spellId: 'fire', level: 1, difficulty: 1 },
      { spellId: 'wildfire', level: 1, difficulty: 2 },
    ]);
  });

  it('offers the support once the primary is known, and never a known spell again', () => {
    expect(lessonsFor(heroKnowing('gale'), mentor('kestrel'))).toEqual([
      { spellId: 'gust', level: 1, difficulty: 1 },
    ]);
    expect(lessonsFor(heroKnowing('gale', 'gust'), mentor('kestrel'))).toEqual([]);
  });

  it('raises a ready spell, with difficulty the level taught', () => {
    const hero = heroKnowing('gale', 'gust');
    hero.spells.gale = {
      level: 2,
      step: enhancements({ ...ready, power: 2 }),
      kept: enhancements(),
    };
    expect(lessonsFor(hero, mentor('kestrel'))).toEqual([
      { spellId: 'gale', level: 3, difficulty: 3 },
    ]);
    hero.spells.gale.step = enhancements(ready);
    expect(lessonsFor(hero, mentor('kestrel'))).toEqual([]);
  });

  it('offers Meteor (difficulty 3) once Quake and Shadow Drain are known', () => {
    const ids = (hero: Hero) => lessonsFor(hero, mentor('torva')).map((l) => l.spellId);
    expect(ids(heroKnowing('fire', 'quake'))).not.toContain('meteor');
    expect(lessonsFor(heroKnowing('fire', 'quake', 'shadow'), mentor('torva'))).toContainEqual({
      spellId: 'meteor',
      level: 1,
      difficulty: 3,
    });
  });

  it('only teaches the mentor’s own element', () => {
    const scholar = heroKnowing('fire', 'blizzard', 'thunder', 'cure', 'quake', 'shadow', 'gale');
    for (const m of Object.values(MENTORS)) {
      const lessons = lessonsFor(scholar, m);
      expect(lessons.length, m.id).toBeGreaterThan(0);
      for (const { spellId } of lessons) expect(SPELLS[spellId]?.category).toBe(m.element);
    }
  });
});

describe('helpChance', () => {
  it('is 40% less 5% per alignment point above the difficulty', () => {
    expect(helpChance(1, 1, 'fire', 'fire')).toBeCloseTo(0.4);
    expect(helpChance(3, 1, 'fire', 'fire')).toBeCloseTo(0.3);
    expect(helpChance(1, 2, 'fire', 'fire')).toBeCloseTo(0.45);
  });

  it('is clamped to 10–50% before the relation factor', () => {
    expect(helpChance(0, 4, 'fire', 'fire')).toBeCloseTo(0.5);
    expect(helpChance(12, 1, 'fire', 'fire')).toBeCloseTo(0.1);
    expect(helpChance(12, 1, 'fire', 'nature')).toBeCloseTo(0.06);
  });

  it('scales by how the mentor stands to the hero’s title element', () => {
    expect(helpChance(1, 1, 'fire', 'earth')).toBeCloseTo(0.32); // related
    expect(helpChance(1, 1, 'fire', 'nature')).toBeCloseTo(0.24); // fire beats nature
    expect(helpChance(1, 1, 'fire', 'water')).toBeCloseTo(0.32); // water beats fire
  });

  it('uses the hero’s alignment and title', () => {
    const hero = heroKnowing('gale', 'cure');
    expect(heroHelpChance(hero, mentor('kestrel'), 1)).toBeCloseTo(0.4);
    // A ranger's title is wind, which beats fire.
    expect(heroHelpChance(hero, mentor('torva'), 1)).toBeCloseTo(0.45 * 0.8);
  });
});

describe('lesson foes', () => {
  it('summons the trial wisp at home', () => {
    const torva = mentor('torva');
    expect(lessonFoeId(torva, torva.route[0])).toBe('emberWisp');
    expect(ENEMIES.emberWisp?.tint).toBe('fire');
  });

  it('fights the toughest local monster away, preferring the mentor’s element', () => {
    expect(lessonFoeId(mentor('torva'), { map: 'overworld', x: 8, y: 6 })).toBe('goblin');
    expect(lessonFoeId(mentor('dorn'), { map: 'caves1', x: 10, y: 7 })).toBe('brute');
    expect(lessonFoeId(mentor('hazel'), { map: 'overworld', x: 20, y: 18 })).toBe('shroom');
    expect(lessonFoeId(mentor('rook'), { map: 'caves2', x: 12, y: 5 })).toBe('shadeImp');
  });

  it('falls back to the wisp where there are no monsters', () => {
    expect(lessonFoeId(mentor('kestrel'), { map: 'mossvale', x: 12, y: 12 })).toBe('galeWisp');
  });

  it('scales the foe with difficulty and drops its spoils', () => {
    const wisp = ENEMIES.emberWisp!;
    expect(scaledFoe(wisp, 1)).toMatchObject({ hp: wisp.hp, atk: wisp.atk, level: wisp.level });
    expect(scaledFoe(ENEMIES.goblin!, 3)).toMatchObject({
      hp: ENEMIES.goblin!.hp * 2,
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
    state.victories = 9; // Kestrel moves every 3 wins: stop 3, the east road
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

  it('raises a ready spell and lifts the lock on a win', () => {
    const hero = heroKnowing('gale');
    hero.spells.gale!.step = enhancements(ready);
    hero.lockedCategories = ['wind'];
    expect(completeLesson(hero, spec('gale'), true)).toEqual([
      { kind: 'spellLevel', spellId: 'gale', level: 2 },
      { kind: 'unlock', element: 'wind' },
    ]);
    expect(hero.spells.gale?.level).toBe(2);
    expect(hero.lockedCategories).toEqual([]);
  });

  it('locks the category once on a loss and patches the hero up to half HP', () => {
    const hero = heroKnowing('gale');
    hero.hp = 0;
    expect(completeLesson(hero, spec('gust'), false)).toEqual([{ kind: 'lock', element: 'wind' }]);
    completeLesson(hero, spec('gust'), false);
    expect(hero.lockedCategories).toEqual(['wind']);
    expect(hero.hp).toBe(Math.ceil(hero.maxHp / 2));
    hero.hp = hero.maxHp;
    completeLesson(hero, spec('gust'), false);
    expect(hero.hp).toBe(hero.maxHp);
    expect(knownSpell(hero, 'gust')).toBeUndefined();
  });

  it('keeps the lesson open after a loss, then a win unlocks', () => {
    const hero = heroKnowing('gale');
    completeLesson(hero, spec('gust'), false);
    expect(lessonsFor(hero, mentor('kestrel'))).toEqual([
      { spellId: 'gust', level: 1, difficulty: 1 },
    ]);
    completeLesson(hero, spec('gust'), true);
    expect(hero.lockedCategories).toEqual([]);
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
    const stops = [0, 2, 3, 6, 9, 12].map((wins) =>
      k.route.indexOf(mentorStop(k, new Set(), wins)),
    );
    expect(stops).toEqual([0, 0, 1, 2, 3, 0]);
    expect(mentorStop(k, new Set(), 7)).toBe(mentorStop(k, new Set(), 7));
  });

  it('adds flagged stops as the story opens them', () => {
    const torva = mentor('torva');
    expect(openStops(torva, new Set())).toHaveLength(3);
    expect(mentorStop(torva, new Set(), 12)).toBe(torva.route[0]);
    expect(mentorStop(torva, new Set(['cavePass']), 12)).toBe(torva.route[3]);
  });

  it('knows home', () => {
    const torva = mentor('torva');
    expect(isAtHome(torva, torva.route[0])).toBe(true);
    expect(isAtHome(torva, torva.route[1]!)).toBe(false);
  });

  it('puts mentors on the map they stand on, as entities', () => {
    const state = newGame('ranger');
    expect(mentorEntities(state)).toEqual([
      { id: 'mentor:torva', kind: 'mentor', mentorId: 'torva', x: 3, y: 11 },
    ]);
    travel(state, { map: 'overworld', x: 5, y: 6 });
    expect(
      activeEntities(state)
        .filter((e) => e.kind === 'mentor')
        .map((e) => e.id),
    ).toEqual(['mentor:maren', 'mentor:rook', 'mentor:hazel', 'mentor:dorn', 'mentor:kestrel']);
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
    });
    state.hero.spells = knownSpells('fire', 'kindle', 'wildfire');
    expect(describeInteraction(state, torva)).toEqual({
      kind: 'message',
      title: 'Torva',
      sprite: 'char.020',
      text: MENTORS.torva!.motive,
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

  it('resolves a lost lesson into a lock, without falling', () => {
    const state = newGame('ranger');
    const spec = lessonSpec(state, 'torva', { spellId: 'fire', level: 1, difficulty: 1 });
    const battle = makeBattle(spec, state.hero);
    state.hero.hp = 0;
    const result = resolveBattle(state, torva, battle, createRng(1));
    expect(result).toMatchObject({ won: false, speech: MENTORS.torva!.loseText, fell: false });
    expect(state.mapId).toBe('mossvale');
    expect(state.hero.lockedCategories).toEqual(['fire']);
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
    challenge.countdown = 99;
    return { battle, challenge, hero };
  }

  it('fights a scaled foe at the scaled speed, as a lesson', () => {
    const { battle, challenge } = lesson(2);
    expect(challenge.enemy.hp).toBe(45);
    expect(battle.level).toBe(3);
    expect(challenge.objective().label).toBe('Lesson: Fire');
    expect(challenge.helpChance).toBeCloseTo(0.5 * 0.8);
  });

  it('tosses the best-fitting piece in the mentor’s colour, whose crystals give her mana', () => {
    const { battle, challenge, hero } = lesson();
    (challenge as { helpChance: number }).helpChance = 1;
    const board = battle.board;
    for (let y = 16; y < 20; y++) board.grid[y] = rowWithGaps(10, [9]);
    battle.input('hardDrop'); // lands in the middle, clearing nothing
    const best = bestPlacement(board.grid);
    expect(best).toMatchObject({ name: 'I', x: 9, lines: 4 });
    expect(board.active).toMatchObject({ name: 'I', color: 'red', recolored: true, x: 9 });
    expect(battle.events.at(-1)?.event).toEqual({ kind: 'toss', element: 'fire', piece: 'I' });
    battle.input('hardDrop');
    expect(battle.lines).toBe(4);
    expect(hero.mana.fire).toBe(4);
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
