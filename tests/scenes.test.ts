/**
 * The scenes (the opening, the Refusal, the Wyrm's fall, the end of
 * Chapter One), their save migration, the Focus Stone rule and the
 * mentors' new rows.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { MAPS } from '../src/data/maps';
import { MENTORS } from '../src/data/mentors';
import { HAREGUY, NPCS } from '../src/data/npcs';
import {
  CHAPTER_END,
  FINALE_FLAG,
  OPENING,
  REFUSAL,
  WYRM_FALL,
  type SceneDef,
} from '../src/data/story';
import { attitudeToward, introFor, linesNow, moodFor, npcNow } from '../src/game/attitude';
import { SHOPS } from '../src/data/shops';
import { resolveBattle } from '../src/game/encounter';
import { addItem, equip, itemCount, learnSpell, removeItem } from '../src/game/hero';
import { sayable, speak, variantsFor, variantsOf, type Mood } from '../src/game/lines';
import { mentorGreeting, mentorMoment, metFlag } from '../src/game/mentorLines';
import { deserialize, serialize } from '../src/game/save';
import {
  arrive,
  dueScenes,
  finishScene,
  migrateScenes,
  receivedFlag,
  scenePages,
} from '../src/game/story';
import { newGame, travel, type GameState } from '../src/world/state';
import { makeBattle } from './helpers';

/** Leaves Mossvale by its gate, as a warp does: the map changes, then `arrive`. */
function leaveMossvale(state: GameState) {
  travel(state, { map: 'overworld', x: 8, y: 7 });
  return arrive(state, 'mossvale');
}

/** A save of `state` as an older version wrote it. */
function asVersion(state: GameState, version: number): GameState {
  return deserialize(JSON.stringify({ ...JSON.parse(serialize(state)), version }))!;
}

describe('the opening', () => {
  it('is due once on a new game, and never again once seen', () => {
    const state = newGame('ranger');
    expect(dueScenes(state.flags)).toEqual([OPENING]);
    // Closed before the last beat: a reload shows it again.
    expect(dueScenes(deserialize(serialize(state))!.flags)).toEqual([OPENING]);
    finishScene(state, OPENING);
    expect(dueScenes(state.flags)).toEqual([]);
    expect(dueScenes(deserialize(serialize(state))!.flags)).toEqual([]);
  });

  it('has five beats; the fourth is the hero’s own class line, the fifth Rowan’s', () => {
    for (const [classId, name] of [
      ['ranger', 'Fern'],
      ['knight', 'Lance'],
      ['mage', 'Ares'],
      ['rogue', 'Vex'],
    ] as const) {
      const pages = scenePages(OPENING, newGame(classId).hero);
      expect(pages).toHaveLength(5);
      expect(pages[0]).toEqual({ text: OPENING.beats[0]!.stage, speaker: null });
      expect(pages[2]!.text).toContain('*A voice too deep to be heard, only felt:* "Sleep."');
      const line = OPENING.beats[3]!.classLines![classId]!;
      expect(pages[3]!.text).toBe(`${OPENING.beats[3]!.stage} "${line}"`);
      expect(pages[3]!.speaker?.name).toBe(name);
      expect(pages[4]!.speaker).toEqual({ name: 'Elder Rowan', sprite: NPCS.elder!.sprite });
    }
  });

  it('refuses a speaker it doesn’t know', () => {
    const scene: SceneDef = {
      id: 'x',
      title: 'X',
      flag: 'scene:x',
      beats: [{ stage: '*.*', who: 'nobody' }],
    };
    expect(() => scenePages(scene, newGame().hero)).toThrow('Unknown speaker: nobody');
  });
});

describe('the Refusal', () => {
  it('plays the first time the hero leaves Mossvale, before Vision 1, and only once', () => {
    const state = newGame('knight');
    finishScene(state, OPENING);
    expect(dueScenes(state.flags)).toEqual([]);
    const vision = leaveMossvale(state);
    expect(vision?.id).toBe('vision1');
    // The app plays the due scenes, then the vision.
    expect(dueScenes(state.flags)).toEqual([REFUSAL]);
    const pages = scenePages(REFUSAL, state.hero);
    expect(pages.map((p) => p.speaker?.name)).toEqual([
      'Lance',
      'Kestrel',
      'Elder Rowan',
      'Elder Rowan',
    ]);
    expect(pages[0]!.text).toContain('"My post is here. A knight doesn\'t leave his post."');
    finishScene(state, REFUSAL);
    travel(state, { map: 'mossvale', x: 10, y: 10 });
    expect(arrive(state, 'overworld')).toBeNull();
    expect(leaveMossvale(state)).toBeNull();
    expect(dueScenes(state.flags)).toEqual([]);
  });

  it('gives the Focus Stone in R4, once', () => {
    const state = newGame('ranger');
    leaveMossvale(state);
    expect(REFUSAL.beats[3]).toMatchObject({ gives: 'wellStone' });
    expect(finishScene(state, REFUSAL)).toEqual(['wellStone']);
    expect(itemCount(state.hero, 'wellStone')).toBe(1);
    expect(finishScene(state, REFUSAL)).toEqual([]);
    expect(itemCount(state.hero, 'wellStone')).toBe(1);
  });

  it('never gives a second stone: R4 still plays, but grants nothing to a hero with one', () => {
    for (const worn of [false, true]) {
      // An old save that had the stone from Rowan's well, in the bag or worn.
      const before = newGame('knight');
      addItem(before.hero, 'wellStone');
      if (worn) equip(before.hero, 'wellStone');
      const state = asVersion(before, 8);
      expect(state.flags.has(receivedFlag('wellStone'))).toBe(true);
      leaveMossvale(state);
      expect(dueScenes(state.flags)).toEqual([REFUSAL]);
      expect(scenePages(REFUSAL, state.hero)).toHaveLength(4);
      expect(finishScene(state, REFUSAL)).toEqual([]);
      expect(itemCount(state.hero, 'wellStone')).toBe(worn ? 0 : 1);
    }
  });

  it('never gives a second stone after the first is sold', () => {
    const state = newGame('ranger');
    finishScene(state, OPENING);
    leaveMossvale(state);
    expect(finishScene(state, REFUSAL)).toEqual(['wellStone']);
    removeItem(state.hero, 'wellStone'); // sold
    const reloaded = deserialize(serialize(state))!;
    expect(reloaded.flags.has(receivedFlag('wellStone'))).toBe(true);
    reloaded.flags.delete(REFUSAL.flag); // even were R4 to play again
    expect(finishScene(reloaded, REFUSAL)).toEqual([]);
    expect(itemCount(reloaded.hero, 'wellStone')).toBe(0);
  });

  it('gives an old save past the Refusal that never had the stone one, once', () => {
    const old = newGame('knight'); // knows Quake: his well would have paid the stone
    leaveMossvale(old);
    const loaded = asVersion(old, 8);
    expect(dueScenes(loaded.flags)).toEqual([]);
    expect(itemCount(loaded.hero, 'wellStone')).toBe(1);
    expect(loaded.flags.has(receivedFlag('wellStone'))).toBe(true);
    const again = deserialize(serialize(loaded))!;
    expect(itemCount(again.hero, 'wellStone')).toBe(1);
    // Not yet past it: the Refusal gives it later, as for anyone.
    expect(itemCount(asVersion(newGame('knight'), 8).hero, 'wellStone')).toBe(0);
  });

  it('the well no longer pays with the stone', () => {
    const rewards = JSON.stringify([NPCS.elder!.rewards, NPCS.elder!.bonus, NPCS.elder!.secret]);
    expect(rewards).not.toContain('wellStone');
    // Every unsaid line is one of his own, kept word for word.
    const all = JSON.stringify(NPCS.elder!.lines);
    for (const line of NPCS.elder!.unsaid!)
      expect(all).toContain(JSON.stringify(line).slice(1, -1));
    expect(sayable('a', ['a'])).toEqual([]);
  });

  it('there is one Focus Stone in the game: no one else gives or sells one', () => {
    const elsewhere = JSON.stringify([
      Object.values(NPCS).map((npc) => [npc.rewards, npc.bonus, npc.secret]),
      Object.values(SHOPS),
    ]);
    expect(elsewhere).not.toContain('wellStone');
    // Foreman Flint's Devoted secret is Dorn's crate: three Ethers.
    expect(NPCS.foreman!.secret).toEqual({ kind: 'item', itemId: 'ether', count: 3 });
  });

  it('Rowan speaks of the stone on his mantle only until he gives it', () => {
    const mantle =
      'Forty years ago I hit granite trying to dig this hole. Had to crack the rock with a rune stone I found in the dirt. Still keep it on the mantle.';
    expect(NPCS.elder!.saidUntil).toEqual({ flag: REFUSAL.flag, lines: [mantle] });
    const confide = (flags: string[]) => linesNow(NPCS.elder!, new Set(flags)).confide!;
    expect(variantsFor(confide([]), 'plain')).toContain(mantle);
    const after = confide([REFUSAL.flag]);
    expect(variantsFor(after, 'plain')).not.toContain(mantle);
    expect(variantsFor(after, 'plain')).toHaveLength(1);
    expect(npcNow(NPCS.foreman!, new Set())).toBe(NPCS.foreman);
  });

  it('Rowan’s Devoted confidence (the broken seal) is true at any time, with his last Ether', () => {
    const promise =
      '*Rowan glances down the shaft and lowers his voice.* "Forty years back I hit rock digging this well and cracked it with that old stone. Something breathed down there. I\'ve wondered ever since if I let it out. Clear the shaft, and take my last Ether for the road."';
    expect(variantsFor(NPCS.elder!.lines.confide!, 'warm')).toEqual([promise]);
    for (const flags of [[], [REFUSAL.flag]]) {
      expect(introFor(npcNow(NPCS.elder!, new Set(flags)), 'devoted')).toBe(promise);
    }
    expect(NPCS.elder!.secret).toEqual({ kind: 'item', itemId: 'ether', count: 1 });
  });

  it('has Innkeeper Pete speak of Rowan’s boy among his Neutral and Friendly greetings', () => {
    const intro = NPCS.innkeeper!.lines.intro as Record<Mood, readonly string[]>;
    expect(intro.plain).toContain(HAREGUY);
    expect(intro.warm).toContain(HAREGUY);
    expect(variantsOf(intro.cold)).not.toContain(HAREGUY);
  });
});

describe('the end of Chapter One', () => {
  const wyrm = MAPS.caves2!.entities.find((e) => e.id === 'c2-wyrm')!;

  it('follows the Wyrm’s fall, in the author’s order', () => {
    const state = newGame('mage');
    finishScene(state, OPENING);
    const battle = makeBattle({ kind: 'combat', enemyId: 'moonWyrm' }, state.hero);
    battle.combat!.enemyHp = 0;
    expect(resolveBattle(state, wyrm, battle, createRng(1)).epilogue).toBeDefined();
    expect(dueScenes(state.flags)).toEqual([WYRM_FALL, CHAPTER_END]);
    expect(scenePages(WYRM_FALL, state.hero)).toHaveLength(3);
    const pages = scenePages(CHAPTER_END, state.hero);
    const at = (text: string): number => pages.findIndex((p) => p.text.includes(text));
    const order = [
      'Silver light climbs every well and crack.',
      'After the Moon Wyrm falls, Captain Vale has the last word: "You came back, the realm owes you; so do I..."',
      "The Sunken Ruins' seal then glows, distracting everyone.",
      'Suddenly a voice is heard rumbling through the breeze.',
      'Wet footprints lead across Sevenstones to the glowing ward.',
      'I taught the boy who made them to walk.',
    ].map(at);
    expect(order).toEqual([0, 1, 2, 3, 4, 5]);
    expect(pages[1]!.speaker?.name).toBe('Captain Vale');
    finishScene(state, WYRM_FALL);
    expect(dueScenes(state.flags)).toEqual([CHAPTER_END]);
    finishScene(state, CHAPTER_END);
    expect(dueScenes(state.flags)).toEqual([]);
  });
});

describe('save version 9 (scenes)', () => {
  it('shows an old save none of the scenes it is past', () => {
    // In Mossvale, never left: past the opening, the Refusal still to come.
    const home = asVersion(newGame(), 8);
    expect(home.flags.has(OPENING.flag)).toBe(true);
    expect(dueScenes(home.flags)).toEqual([]);
    leaveMossvale(home);
    expect(dueScenes(home.flags)).toEqual([REFUSAL]);
    // Past Mossvale: no opening, no Refusal.
    const road = newGame();
    leaveMossvale(road);
    expect(dueScenes(asVersion(road, 8).flags)).toEqual([]);
    // Past the Wyrm: it saw the old ending.
    const won = newGame();
    won.flags.add(FINALE_FLAG);
    expect(dueScenes(asVersion(won, 7).flags)).toEqual([]);
  });

  it('marks every due scene seen', () => {
    const flags = new Set(['vision:1', FINALE_FLAG]);
    migrateScenes(flags, newGame().hero);
    expect([...flags].filter((f) => f.startsWith('scene:'))).toEqual([
      OPENING.flag,
      REFUSAL.flag,
      WYRM_FALL.flag,
      CHAPTER_END.flag,
    ]);
  });
});

describe('the mentors’ new rows', () => {
  const torva = MENTORS.torva!;
  /** Torva's first variant of a row, in the hero's mood with her. */
  const first = (state: GameState, row: 'arrives' | 'afterLesson' | 'failedLesson' | 'seeks') =>
    speak(torva[row], moodFor(attitudeToward(state.hero, torva.element)));

  it('says why they teach on meeting, then Arrives somewhere new at each new stop', () => {
    const state = newGame('ranger');
    expect(mentorMoment(state, torva)).toBe('motive');
    expect(mentorGreeting(state, torva)).toBe(torva.motive);
    expect(state.flags.has(metFlag('torva', 0))).toBe(true);
    state.victories = torva.moveEvery; // she moves on to the ridge road
    expect(mentorMoment(state, torva)).toBe('arrives');
    expect(mentorGreeting(state, torva)).toBe(first(state, 'arrives'));
    expect(state.flags.has(metFlag('torva', 0))).toBe(false);
    expect(state.flags.has(metFlag('torva', 1))).toBe(true);
    // Said once per stop; home is never "somewhere new".
    expect(mentorMoment(state, torva)).toBe('motive');
    state.victories = 0;
    expect(mentorMoment(state, torva)).toBe('motive');
  });

  it('first met away from home, a mentor still says why they teach', () => {
    const state = newGame('ranger');
    state.victories = torva.moveEvery;
    expect(mentorMoment(state, torva)).toBe('motive');
  });

  it('says After the lesson once one is won, and If you failed while a spell is sealed', () => {
    const state = newGame('ranger');
    learnSpell(state.hero, 'wildfire');
    expect(mentorMoment(state, torva)).toBe('afterLesson');
    expect(mentorGreeting(state, torva)).toBe(first(state, 'afterLesson'));
    state.hero.seal = { spellId: 'wildfire', fights: 3 };
    expect(mentorMoment(state, torva)).toBe('failedLesson');
    expect(mentorGreeting(state, torva)).toBe(first(state, 'failedLesson'));
  });

  it('says Seeks you out while seeking the hero', () => {
    const rook = MENTORS.rook!;
    const state = newGame('ranger');
    state.hero.feats['pure.lightning'] = 2;
    expect(mentorMoment(state, rook)).toBe('seeks');
    const mood = moodFor(attitudeToward(state.hero, rook.element));
    expect(mentorGreeting(state, rook)).toBe(speak(rook.seeks, mood));
  });

  it('keeps the Road Back row for the second half', () => {
    for (const mentor of Object.values(MENTORS))
      expect(variantsOf(mentor.roadBack)).toHaveLength(1);
  });
});
