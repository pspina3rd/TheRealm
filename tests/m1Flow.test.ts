import { describe, expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import { DEMO_SEND_MS, DuelChallenge } from '../src/battle/verbs/duel';
import { CombatChallenge } from '../src/battle/combat';
import { createRng } from '../src/core/rng';
import { NPCS } from '../src/data/npcs';
import {
  describeInteraction,
  resolveBattle,
  commitBattleTry,
  battleTryCommitted,
  lessonInteraction,
} from '../src/game/encounter';
import { encounterSpec } from '../src/game/encounterFlow';
import { learnSpell } from '../src/game/hero';
import { newRecord, recordOf, innNight, priceChange } from '../src/game/stakes';
import { deserialize, loadSave, SAVE_KEY, serialize } from '../src/game/save';
import { newGame, type GameState } from '../src/world/state';
import type { EntityDef } from '../src/world/map';

const rng = () => createRng(1234);
const npc = (id: string): EntityDef => ({ kind: 'npc', id, npcId: id, x: 1, y: 1 });
function attempt(state: GameState, id: string, assisted = false) {
  return new Battle({ ...encounterSpec(state, id, assisted), demo: false }, state.hero, rng());
}
function finish(battle: Battle, won: boolean) {
  // Control only the battle outcome; settlement remains real.
  battle.challenge.status = () => (won ? 'won' : 'lost');
}

describe('M1 commitment and settlement', () => {
  it('leaving a card or a completed demo stays free and preserves the first-try demo', () => {
    const state = newGame();
    const offer = describeInteraction(state, npc('elder'));
    expect(offer.kind).toBe('challenge');
    const battle = new Battle(encounterSpec(state, 'elder'), state.hero, rng());
    expect(commitBattleTry(state, battle)).toBe(false);
    for (let i = 0; i < 80 && battle.demo; i++) battle.update(100);
    expect(battle.demo).toBeNull();
    battle.giveUp();
    resolveBattle(state, npc('elder'), battle, rng(), 'neutral');
    expect(state.encounters).toEqual({});
    expect(encounterSpec(state, 'elder').demo).toBe(true);
  });

  it('commits once on player input, charges give-up once, and does not replay the demo', () => {
    const state = newGame();
    const battle = attempt(state, 'elder');
    expect(commitBattleTry(state, battle)).toBe(true);
    battle.input('left');
    expect(commitBattleTry(state, battle)).toBe(true);
    expect(recordOf(state, 'elder').tries).toBe(1);
    expect(battleTryCommitted(battle)).toBe(true);
    battle.giveUp();
    const first = resolveBattle(state, npc('elder'), battle, rng(), 'neutral');
    expect(resolveBattle(state, npc('elder'), battle, rng(), 'neutral')).toBe(first);
    expect(recordOf(state, 'elder')).toMatchObject({ fails: 1, strain: 1, tries: 1 });
    expect(state.regard.elder).toBe(-1);
    expect(encounterSpec(state, 'elder').demo).toBe(false);
  });

  it('rechecks Wait at commitment, then a monster victory unlocks it exactly once', () => {
    const state = newGame();
    const stale = attempt(state, 'forager');
    const failed = attempt(state, 'forager');
    commitBattleTry(state, failed);
    failed.giveUp();
    resolveBattle(state, npc('forager'), failed, rng(), 'neutral');
    expect(commitBattleTry(state, stale)).toBe(false);
    const monster: EntityDef = { kind: 'monster', id: 'test-slime', enemyId: 'slime', x: 0, y: 0 };
    const fight = new Battle({ kind: 'combat', enemyId: 'slime' }, state.hero, rng());
    finish(fight, true);
    resolveBattle(state, monster, fight, rng());
    resolveBattle(state, monster, fight, rng());
    expect(state.victories).toBe(1);
    expect(commitBattleTry(state, stale)).toBe(true);
  });

  it('assisted Vale grants the cave pass and full gil without bonus items or regard', () => {
    const state = newGame();
    state.encounters.guard = { ...newRecord(), fails: 2, tries: 2, strain: 1 };
    const offer = describeInteraction(state, npc('guard'));
    expect(offer.kind === 'challenge' && offer.assistedSpec).toMatchObject({
      assisted: true,
      strain: 0,
    });
    const battle = attempt(state, 'guard', true);
    expect(commitBattleTry(state, battle)).toBe(true);
    finish(battle, true);
    const before = state.hero.gil;
    const result = resolveBattle(state, npc('guard'), battle, rng(), 'neutral');
    expect(state.flags.has('cavePass')).toBe(true);
    expect(state.hero.gil - before).toBe(20);
    expect(result.gains.some((gain) => gain.kind === 'item' || gain.kind === 'regard')).toBe(false);
    expect(recordOf(state, 'guard').strain).toBe(0);
  });

  it('repeat Wren wins halve gil, restore lost regard, and cannot farm it above the first win', () => {
    const state = newGame();
    const win = () => {
      const battle = attempt(state, 'forager');
      expect(commitBattleTry(state, battle)).toBe(true);
      finish(battle, true);
      return resolveBattle(state, npc('forager'), battle, rng(), 'neutral');
    };
    expect(win().gains).toContainEqual({ kind: 'gil', amount: 15 });
    expect(state.regard.forager).toBe(1);
    innNight(state);
    state.regard.forager = 0;
    expect(win().gains).toContainEqual({ kind: 'gil', amount: 7 });
    expect(state.regard.forager).toBe(1);
    innNight(state);
    win();
    expect(state.regard.forager).toBe(1);
  });
});

describe('Ordor incoming-row demonstration', () => {
  it('blocks early commitment and input, then enables the first player try after the row arrives', () => {
    const state = newGame();
    const battle = new Battle(encounterSpec(state, 'stallKeeper'), state.hero, rng());
    expect(battle.demoPlaying).toBe(true);
    expect(commitBattleTry(state, battle)).toBe(false);
    battle.input('hardDrop');
    expect(battle.started).toBe(false);
    expect(battle.board.piecesPlaced).toBe(0);
    battle.update(DEMO_SEND_MS - 1);
    expect(battle.demoPlaying).toBe(true);
    battle.update(1);
    expect(battle.demoPlaying).toBe(false);
    expect(
      battle.challenge instanceof DuelChallenge && battle.challenge.pendingRows,
    ).toBeGreaterThan(0);
    expect(recordOf(state, 'stallKeeper').tries).toBe(0);
    expect(commitBattleTry(state, battle)).toBe(true);
    battle.input('left');
    expect(battle.started).toBe(true);
    expect(recordOf(state, 'stallKeeper').tries).toBe(1);
  });
});

describe('Ordor saved prices', () => {
  it('settles a loss into Browse markup and strain; inn expiry and a later win repair it', () => {
    const state = newGame();
    const fail = attempt(state, 'stallKeeper');
    commitBattleTry(state, fail);
    fail.giveUp();
    const result = resolveBattle(state, npc('stallKeeper'), fail, rng(), 'neutral');
    expect(result.shopId).toBe('mossvaleStall');
    expect(result.priceMultiplier).toBeGreaterThan(1);
    expect(recordOf(state, 'stallKeeper').strain).toBe(1);
    const blocked = describeInteraction(state, npc('stallKeeper'));
    expect(blocked.kind === 'challenge' && blocked.canAccept).toBe(false);
    innNight(state);
    const win = attempt(state, 'stallKeeper');
    expect(commitBattleTry(state, win)).toBe(true);
    expect(win.challenge).toBeInstanceOf(DuelChallenge);
    if (!(win.challenge instanceof DuelChallenge)) throw new Error('Expected duel');
    win.challenge.meter = 0.9;
    finish(win, true);
    resolveBattle(state, npc('stallKeeper'), win, rng(), 'neutral');
    expect(priceChange(state, 'mossvaleStall')).toBe(0.9);
    expect(recordOf(state, 'stallKeeper').strain).toBe(0);
  });
});

describe('lessons and free browsing', () => {
  it('offers Hazel Now-once, then Wait, with a seal that three monster wins release', () => {
    const state = newGame();
    learnSpell(state.hero, 'cure');
    const lesson = { spellId: 'cure', difficulty: 2, level: 2 };
    const card = lessonInteraction(state, 'hazel', lesson);
    expect(card.stakes?.retry).toContain('One retry');
    for (let i = 0; i < 2; i++) {
      const battle = new Battle(card.spec, state.hero, rng());
      expect(commitBattleTry(state, battle)).toBe(true);
      battle.giveUp();
      resolveBattle(
        state,
        { kind: 'mentor', id: 'hazel', mentorId: 'hazel', x: 0, y: 0 },
        battle,
        rng(),
      );
    }
    expect(lessonInteraction(state, 'hazel', lesson).canAccept).toBe(false);
    expect(state.hero.seal).toMatchObject({ spellId: 'cure', fights: 3 });
    for (let i = 0; i < 3; i++) {
      const fight = new Battle({ kind: 'combat', enemyId: 'slime' }, state.hero, rng());
      expect(fight.challenge).toBeInstanceOf(CombatChallenge);
      finish(fight, true);
      resolveBattle(
        state,
        { kind: 'monster', id: `slime-${i}`, enemyId: 'slime', x: 0, y: 0 },
        fight,
        rng(),
      );
    }
    expect(state.hero.seal).toBeNull();
    expect(lessonInteraction(state, 'hazel', lesson).canAccept).toBe(true);
  });

  it('offers every shop free Browse with saved markups, with new haggling only at Ordor', () => {
    const state = newGame();
    for (const keeper of Object.values(NPCS).filter((person) =>
      person.rewards.some((reward) => reward.kind === 'shop'),
    )) {
      const shop = keeper.rewards.find((reward) => reward.kind === 'shop');
      if (!shop || shop.kind !== 'shop') continue;
      state.prices[shop.shopId] = { multiplier: 1.1, map: null, day: state.day };
      const offer = describeInteraction(state, npc(keeper.id));
      expect(offer.kind).toBe('challenge');
      if (offer.kind !== 'challenge') continue;
      expect(offer.browse?.shopId).toBe(shop.shopId);
      expect(offer.canAccept).toBe(keeper.id === 'stallKeeper');
      expect(priceChange(state, shop.shopId)).toBe(1.1);
    }
    expect(state.encounters).toEqual({});
  });
});

describe('durable committed attempts', () => {
  it('reload settles a committed Wait encounter once and writes the recovered save immediately', () => {
    const state = newGame();
    const battle = attempt(state, 'forager');
    expect(commitBattleTry(state, battle)).toBe(true);
    const saved = new Map([[SAVE_KEY, serialize(state)]]);
    const store = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value);
      },
      removeItem: (key: string) => {
        saved.delete(key);
      },
    };
    const recovered = loadSave(store).state;
    expect(recovered).not.toBeNull();
    expect(recovered?.pendingAttempt).toBeNull();
    expect(recovered?.encounters.forager).toMatchObject({
      tries: 1,
      fails: 1,
      strain: 1,
      waitPast: 0,
    });
    expect(recovered?.regard.forager).toBe(-1);
    expect(JSON.parse(saved.get(SAVE_KEY) ?? '{}').pendingAttempt).toBeNull();
    expect(loadSave(store).state?.encounters.forager).toEqual(recovered?.encounters.forager);
  });

  it('a free pre-roll reload stays free, and a completed win never becomes an abandoned loss', () => {
    const state = newGame();
    const preview = deserialize(serialize(state));
    expect(preview?.encounters).toEqual({});
    const battle = attempt(state, 'elder');
    commitBattleTry(state, battle);
    finish(battle, true);
    resolveBattle(state, npc('elder'), battle, rng(), 'neutral');
    const recovered = deserialize(serialize(state));
    expect(recovered?.pendingAttempt).toBeNull();
    expect(recovered?.encounters.elder).toMatchObject({ tries: 1, wins: 1, fails: 0, strain: 0 });
    expect(recovered?.hero.gil).toBe(state.hero.gil);
    expect(recovered?.regard.elder).toBe(1);
  });

  it('interrupted Hazel lessons apply Now-once, bounded spell seal and subsequent Wait', () => {
    let state = newGame();
    learnSpell(state.hero, 'cure');
    const lesson = { spellId: 'cure', difficulty: 2, level: 2 };
    for (let i = 0; i < 2; i++) {
      const card = lessonInteraction(state, 'hazel', lesson);
      const battle = new Battle(card.spec, state.hero, rng());
      const hp = state.hero.hp;
      battle.update(30_000);
      expect(battle.started).toBe(false);
      expect(state.hero.hp).toBe(hp);
      expect(commitBattleTry(state, battle)).toBe(true);
      expect(battle.started).toBe(true); // A spell/item action also starts the clock.
      const recovered = deserialize(serialize(state));
      if (!recovered) throw new Error('Expected recoverable lesson');
      state = recovered;
      expect(state.hero.seal).toEqual({ spellId: 'cure', fights: 3 });
    }
    expect(lessonInteraction(state, 'hazel', lesson).canAccept).toBe(false);
    expect(state.encounters['lesson:hazel:cure']).toMatchObject({
      tries: 2,
      fails: 2,
      waitPast: 0,
    });
  });

  it('interrupted assisted Vale pays the ordinary failure cost and keeps the threshold locked', () => {
    const state = newGame();
    state.encounters.guard = { ...newRecord(), fails: 2, tries: 2, strain: 1 };
    const battle = attempt(state, 'guard', true);
    commitBattleTry(state, battle);
    const recovered = deserialize(serialize(state));
    expect(recovered?.encounters.guard).toMatchObject({
      fails: 3,
      strain: 1,
      tries: 3,
      waitPast: 0,
    });
    expect(recovered?.regard.guard).toBe(-1);
    expect(recovered?.flags.has('cavePass')).toBe(false);
    expect(recovered?.hero.gil).toBe(state.hero.gil);
  });

  it('interrupted Ordor applies the same markup, strain and day lock as Give up', () => {
    const state = newGame();
    const battle = attempt(state, 'stallKeeper');
    commitBattleTry(state, battle);
    const recovered = deserialize(serialize(state));
    battle.giveUp();
    resolveBattle(state, npc('stallKeeper'), battle, rng(), 'neutral');
    expect(recovered?.prices).toEqual(state.prices);
    expect(recovered?.encounters).toEqual(state.encounters);
    expect(recovered?.regard).toEqual(state.regard);
    expect(recovered && describeInteraction(recovered, npc('stallKeeper'))).toMatchObject({
      canAccept: false,
    });
  });

  it('migrates v11 with no pending try and rejects unknown or forged pending descriptors', () => {
    const state = newGame();
    const battle = attempt(state, 'elder');
    commitBattleTry(state, battle);
    const data = JSON.parse(serialize(state));
    const legacy = deserialize(JSON.stringify({ ...data, version: 11 }));
    expect(legacy?.pendingAttempt).toBeNull();
    expect(legacy?.encounters.elder).toMatchObject({ tries: 1, fails: 0 });
    for (const pendingAttempt of [
      { kind: 'encounter', id: 'ridgeGuard', assisted: false, try: 1 },
      { kind: 'encounter', id: 'elder', assisted: true, try: 1 },
      { kind: 'encounter', id: 'elder', assisted: false, try: 99 },
      { kind: 'lesson', spellId: 'cure', difficulty: 999, try: 1 },
      { kind: 'lesson', spellId: 'unknown', difficulty: 1, try: 1 },
    ]) {
      const recovered = deserialize(JSON.stringify({ ...data, pendingAttempt }));
      expect(recovered?.pendingAttempt).toBeNull();
      expect(recovered?.regard).toEqual({});
      expect(recovered?.encounters.elder).toMatchObject({ tries: 1, fails: 0 });
    }
  });
});
