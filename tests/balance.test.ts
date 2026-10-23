import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/data/enemies';
import { ITEMS } from '../src/data/items';
import { prepareLesson } from '../src/game/lessons';
import { sell, sellPrice, sellableItems } from '../src/game/shop';
import { makeBattle, setUpVerticalIClear } from './helpers';
import { createRng } from '../src/core/rng';
import { MAPS } from '../src/data/maps';
import { resolveBattle } from '../src/game/encounter';
import { FINALE_FLAG, FINALE_WORDS, mentorsTaught } from '../src/game/ending';
import { hiddenSlots, wantedBy } from '../src/game/hidden';
import { createHero, heroTitle, learnSpell } from '../src/game/hero';
import { feedbackFor } from '../src/ui/art/feedback';
import { warpStirs } from '../src/world/map';
import { step } from '../src/world/movement';
import { newGame, travel } from '../src/world/state';

describe('boss enrage', () => {
  const wyrm = ENEMIES.moonWyrm!;

  it('enrages the Moon Wyrm at half HP: faster moves, heavier curses', () => {
    expect(wyrm.enrage).toEqual({ below: 0.5, actMs: 5000, curseRows: 3, atk: 4 });
    const battle = makeBattle({ kind: 'combat', enemyId: 'moonWyrm' });
    const combat = battle.combat!;
    expect(combat.enraged).toBe(false);
    combat.enemyHp = wyrm.hp / 2 + 1;
    setUpVerticalIClear(battle.board, 1);
    battle.input('hardDrop');
    expect(combat.enraged).toBe(true);
    expect(battle.events.filter((e) => e.event.kind === 'enrage')).toHaveLength(1);
    expect(combat.actMs).toBe(5000);
    // Healing back above half doesn't calm it.
    combat.enemyHp = wyrm.hp;
    expect(combat.enraged).toBe(true);
  });

  it('curses with the enraged row count and acts on its faster gauge', () => {
    const battle = makeBattle({ kind: 'combat', enemyId: 'moonWyrm' });
    const combat = battle.combat!;
    combat.enraged = true;
    combat.nextMove = { kind: 'curse', name: 'Crystal Tomb', rows: 2 };
    combat.update(4999);
    expect(battle.events.some((e) => e.event.kind === 'curse')).toBe(false);
    combat.update(1);
    const curse = battle.events.find((e) => e.event.kind === 'curse')?.event;
    expect(curse).toEqual({ kind: 'curse', rows: 3 });
    expect(combat.gauge).toBe(0);
  });

  it('never enrages an enemy without an enrage', () => {
    const battle = makeBattle({ kind: 'combat', enemyId: 'slime' });
    battle.combat!.enemyHp = 1;
    expect(battle.combat!.enraged).toBe(false);
  });
});

describe('lessons', () => {
  it('heal the hero to full HP, but not mana, before each try', () => {
    const hero = createHero();
    hero.hp = 3;
    hero.mana.wind = 0;
    prepareLesson(hero);
    expect(hero.hp).toBe(hero.maxHp);
    expect(hero.mana.wind).toBe(0);
  });

  it('use gentle difficulty-1 wisps', () => {
    const wisp = ENEMIES.galeWisp!;
    expect([wisp.hp, wisp.atk, wisp.actMs]).toEqual([50, 5, 9000]);
    expect(wisp.moves).toContainEqual({ kind: 'quicken', name: 'Gust', ms: 4000 });
  });
});

describe('selling', () => {
  it('pays half the list price, rounded down', () => {
    expect(sellPrice(ITEMS.ironSword!)).toBe(40);
    expect(sellPrice(ITEMS.slimeGel!)).toBe(3);
    expect(sellPrice(ITEMS.blizzardTome!)).toBe(0);
  });

  it('sells only carried items worth something, never worn gear or services', () => {
    const state = newGame();
    const hero = state.hero;
    hero.items = { slimeGel: 2, blizzardTome: 1, innRest: 1, herb: 0 };
    hero.weaponId = 'copperSword';
    expect(sellableItems(hero).map((i) => i.id)).toEqual(['slimeGel']);
    const gil = hero.gil;
    expect(sell(state, 'slimeGel')).toContain('+3');
    expect(hero.gil).toBe(gil + 3);
    expect(hero.items.slimeGel).toBe(1);
    expect(() => sell(state, 'copperSword')).toThrow();
    expect(() => sell(state, 'nope')).toThrow();
  });
});

describe('the ending', () => {
  const wyrmEntity = MAPS.caves2!.entities.find((e) => e.id === 'c2-wyrm')!;

  it('ends the chapter when the Moon Wyrm falls', () => {
    const state = newGame('knight');
    learnSpell(state.hero, 'blizzard');
    learnSpell(state.hero, 'gale');
    const battle = makeBattle({ kind: 'combat', enemyId: 'moonWyrm' }, state.hero);
    battle.combat!.enemyHp = 0;
    const result = resolveBattle(state, wyrmEntity, battle, createRng(1));
    expect(state.flags.has(FINALE_FLAG)).toBe(true);
    expect(result.epilogue).toMatchObject({
      title: heroTitle(state.hero),
      level: state.hero.level,
      spells: Object.keys(state.hero.spells).length,
      speaker: { name: 'Captain Vale', text: FINALE_WORDS.text },
    });
    // Maren (water) and Kestrel (wind) taught beyond the Knight's start.
    expect(result.epilogue!.mentors.map((m) => m.id)).toEqual(['maren', 'kestrel']);
  });

  it('shows no epilogue for a lost finale or another fight', () => {
    const state = newGame();
    const lost = makeBattle({ kind: 'combat', enemyId: 'moonWyrm' }, state.hero);
    lost.board.toppedOut = true;
    expect(resolveBattle(state, wyrmEntity, lost, createRng(1)).epilogue).toBeUndefined();
    expect(state.flags.has(FINALE_FLAG)).toBe(false);
    const slime = MAPS.overworld!.entities.find((e) => e.kind === 'monster')!;
    const won = makeBattle({ kind: 'combat', enemyId: 'slime' }, state.hero);
    won.combat!.enemyHp = 0;
    expect(resolveBattle(state, slime, won, createRng(1)).epilogue).toBeUndefined();
  });

  it('stirs the Sunken Ruins’ seal, which stays shut', () => {
    const map = Object.values(MAPS).find((m) => m.warps.some((w) => w.stirs))!;
    const warp = map.warps.find((w) => w.stirs)!;
    const state = newGame();
    travel(state, { map: map.id, x: warp.x, y: warp.y - 1 });
    expect(step(state, 'down')).toEqual({ kind: 'locked', text: warp.lockedText });
    state.flags.add(FINALE_FLAG);
    expect(warpStirs(warp, state.flags)).toBe(true);
    expect(step(state, 'down')).toEqual({ kind: 'locked', text: warp.stirs!.text });
  });

  it('shows an enraged boss with a banner', () => {
    expect(feedbackFor({ kind: 'enrage' })).toContainEqual({ kind: 'banner', text: 'Enraged!' });
  });
});

describe('final tuning', () => {
  it('lists only mentors whose lessons were won', () => {
    const hero = newGame('knight').hero;
    learnSpell(hero, 'thunder'); // the sage's reward, not a lesson
    expect(mentorsTaught(hero)).toEqual([]);
    hero.spells.quake!.level = 2; // only a lesson raises a spell
    hero.spells.thunder!.level = 2;
    expect(mentorsTaught(hero).map((m) => m.id)).toEqual(['rook', 'dorn']);
  });

  it('shows progress on a hidden board-feat spell, and nothing once revealed', () => {
    const state = newGame();
    state.hero.feats['pure.lightning'] = 1;
    const slot = hiddenSlots(state, 'lightning').find((s) => s.spell.id === 'ballLightning');
    expect(slot?.progress).toEqual({ have: 1, want: 2 });
    state.hero.feats['pure.lightning'] = 2;
    expect(hiddenSlots(state, 'lightning')[0]).not.toHaveProperty('progress');
    expect(hiddenSlots(state, 'nature').every((s) => s.progress === undefined)).toBe(true);
  });

  it('names the mentor who still wants an item, until its spell is revealed', () => {
    const state = newGame();
    expect(wantedBy(state, 'sporeCap')?.id).toBe('hazel');
    expect(wantedBy(state, 'slimeGel')).toBeNull();
    state.flags.add('gift:bloom');
    expect(wantedBy(state, 'sporeCap')).toBeNull();
  });
});
