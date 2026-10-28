/**
 * An encounter from offer to aftermath (docs/ENCOUNTER_DESIGN.md §3, §4):
 * the Stakes card, settled tries (rewards, half pay, the assist, a Great),
 * Ordor's haggle prices, world props and the grove's stone, and the
 * lessons' and fights' stakes.
 */
import { describe, expect, it } from 'vitest';
import type { Battle } from '../src/battle/battle';
import type { ContainChallenge } from '../src/battle/verbs/contain';
import type { DuelChallenge } from '../src/battle/verbs/duel';
import type { PlantChallenge } from '../src/battle/verbs/plant';
import { createRng } from '../src/core/rng';
import { MAPS } from '../src/data/maps';
import { NPCS } from '../src/data/npcs';
import type { ChallengeSpec } from '../src/data/types';
import { attitudeOf } from '../src/game/attitude';
import { describeInteraction, resolveBattle } from '../src/game/encounter';
import {
  halfPay,
  lessonKey,
  objectiveText,
  regionFixed,
  worldState,
} from '../src/game/encounterFlow';
import { ENCOUNTER_DEFS } from '../src/data/encounters';
import { learnSpell } from '../src/game/hero';
import { lessonSpec } from '../src/game/lessons';
import { innNight, recordOf, regardOf } from '../src/game/stakes';
import type { EntityDef } from '../src/world/map';
import { newGame, type GameState } from '../src/world/state';
import { isIconId } from '../src/ui/art/icons';
import { makeBattle } from './helpers';

function entityOf(npcId: string): EntityDef {
  for (const map of Object.values(MAPS)) {
    const found = map.entities.find((e) => e.kind === 'npc' && e.npcId === npcId);
    if (found) return found;
  }
  throw new Error(npcId);
}

/** Offers `npcId`'s encounter and plays it to `won` (by fiat), as the hero would. */
function play(state: GameState, npcId: string, won: boolean, assisted = false) {
  const offer = describeInteraction(state, entityOf(npcId));
  if (offer.kind !== 'challenge') throw new Error(`${npcId} offers ${offer.kind}`);
  const spec = (assisted ? offer.assistSpec : offer.spec) as ChallengeSpec;
  const battle = makeBattle(spec, state.hero);
  Object.defineProperty(battle, 'status', { value: won ? 'won' : 'lost' });
  return {
    offer,
    battle,
    result: resolveBattle(state, entityOf(npcId), battle, createRng(1), offer.terms),
  };
}

describe('the Stakes card', () => {
  it('leads with the win, then the ask, the cost of failing and the retry rule', () => {
    const state = newGame();
    const offer = describeInteraction(state, entityOf('elder'));
    if (offer.kind !== 'challenge') throw new Error('Rowan offers his well');
    expect(offer.card).toMatchObject({
      title: 'The Well',
      objective: 'Scrape down to the pipe before the mold climbs over the lip.',
      win: {
        rewards: [{ kind: 'spell', spellId: 'quake' }],
        great: null,
        regard: 0,
        regardAfter: 1,
      },
      fail: { text: 'The mold spreads', strainText: 'one row worse next time', cools: true },
      retry: 'now',
      repeatable: false,
      strain: 0,
      blocked: null,
      assist: null,
    });
    expect(offer.spec).toMatchObject({ demo: true, strain: 0 });
  });

  it('names the warmer attitude one more good turn brings', () => {
    const state = newGame();
    // Charm until Bean is Neutral but one regard short of Friendly.
    for (let charm = 0; charm < 6; charm++) {
      state.hero.stats.charm = charm;
      if (attitudeOf(state.hero, NPCS.farmer!, 1) === 'friendly') break;
    }
    expect(attitudeOf(state.hero, NPCS.farmer!)).toBe('neutral');
    const offer = describeInteraction(state, entityOf('farmer'));
    if (offer.kind !== 'challenge') throw new Error('Bean offers her beds');
    expect(offer.card?.win.warmer).toBe('friendly');
    expect(describeInteraction(newGame(), entityOf('farmer'))).toMatchObject({
      card: { win: { warmer: null } },
    });
  });

  it('fills the target in at the try’s strain', () => {
    const bean = ENCOUNTER_DEFS.farmer!;
    expect(objectiveText(bean, 0)).toBe('Plant 12 sprouts in the furrows before sundown.');
    expect(objectiveText(bean, 2)).toBe('Plant 16 sprouts in the furrows before sundown.');
  });
});

describe('settled tries', () => {
  it('pays a first win with regard +1, then strain clears; a fail strains and cools', () => {
    const state = newGame('knight');
    const lost = play(state, 'elder', false).result;
    expect(lost.won).toBe(false);
    expect(lost.gains).toEqual([
      { kind: 'strain', level: 1 },
      { kind: 'regard', delta: -1, level: -1 },
    ]);
    expect(recordOf(state, 'elder')).toMatchObject({ tries: 1, fails: 1, strain: 1 });
    expect(worldState(state, 'elder')).toBe('fail');
    const second = play(state, 'elder', true);
    expect(second.offer.spec).toMatchObject({ strain: 1, demo: false });
    expect(second.result.gains).toEqual([
      { kind: 'gil', amount: 40 },
      { kind: 'regard', delta: 1, level: 0 },
    ]);
    expect(worldState(state, 'elder')).toBe('win');
    expect(state.flags.has('npc:elder')).toBe(true);
  });

  it('pays a repeatable’s repeat wins at half, once a day, with no regard', () => {
    const state = newGame();
    const first = play(state, 'farmer', true);
    expect(first.result.gains).toContainEqual({ kind: 'item', itemId: 'herb', count: 2 });
    expect(first.result.speech).toContain('Green you clear goes to your own green magic, too.');
    const blocked = describeInteraction(state, entityOf('farmer'));
    expect(blocked).toMatchObject({ card: { blocked: 'day' } });
    innNight(state);
    const again = play(state, 'farmer', true);
    expect(again.offer).toMatchObject({ rewards: [{ kind: 'item', itemId: 'herb', count: 1 }] });
    expect(again.result.gains).toEqual([{ kind: 'item', itemId: 'herb', count: 1 }]);
    expect(again.result.speech).not.toContain('Green you clear');
    expect(regardOf(state, 'farmer')).toBe(1);
  });

  it('adds a Great’s reward', () => {
    const state = newGame();
    const offer = describeInteraction(state, entityOf('farmer'));
    if (offer.kind !== 'challenge') throw new Error('Bean');
    const battle = makeBattle(offer.spec, state.hero);
    (battle.challenge as PlantChallenge).score = 16;
    battle.board.piecesPlaced = 26;
    const result = resolveBattle(state, entityOf('farmer'), battle, createRng(1), offer.terms);
    expect(result.gains).toEqual([
      { kind: 'item', itemId: 'herb', count: 2 },
      { kind: 'item', itemId: 'herb', count: 1 },
      { kind: 'regard', delta: 1, level: 1 },
    ]);
  });

  it('offers Vale’s assist after two fails: Maren, no strain; the win keeps the gil but not the bonus', () => {
    const state = newGame();
    state.hero.stats.charm = 6; // Friendly enough for a bonus
    play(state, 'guard', false);
    state.victories++;
    const second = play(state, 'guard', false);
    expect(second.offer.card?.assist).toBeNull();
    const offer = describeInteraction(state, entityOf('guard'));
    expect(offer).toMatchObject({
      card: { assist: 'Maren', blocked: 'wait', strain: 1 },
      assistSpec: { assisted: true, strain: 0 },
    });
    state.victories++;
    const helped = play(state, 'guard', true, true);
    expect(helped.result.gains).toEqual([{ kind: 'gil', amount: 20 }]);
    expect(state.flags.has('cavePass')).toBe(true);
    expect(regardOf(state, 'guard')).toBe(-2);
  });

  it('marks Ordor’s stall up after a failed haggle, and opens it at the new price', () => {
    const state = newGame();
    const offer = describeInteraction(state, entityOf('stallKeeper'));
    if (offer.kind !== 'shop' || !offer.haggle) throw new Error('Ordor haggles');
    expect(offer).toMatchObject({ shopId: 'mossvaleStall', multiplier: 1 });
    expect(offer.haggle.card).toMatchObject({ retry: 'day', fail: { strainText: null } });
    const battle: Battle = makeBattle(offer.haggle.spec, state.hero);
    const duel = battle.challenge as DuelChallenge;
    duel.meter = 1.2;
    duel.update(60_000);
    const result = resolveBattle(state, entityOf('stallKeeper'), battle, createRng(1), 'neutral');
    expect(result).toMatchObject({ won: false, shopId: 'mossvaleStall', priceMultiplier: 1.2 });
    expect(result.speech).toBe("Lost your nerve? Come back when you've got real silver.");
    expect(result.gains).toEqual([
      { kind: 'price', multiplier: 1.2 },
      { kind: 'regard', delta: -1, level: -1 },
    ]);
    // Once a day.
    expect(describeInteraction(state, entityOf('stallKeeper'))).toMatchObject({
      haggle: { card: { blocked: 'day' } },
      multiplier: 1.2,
    });
  });

  it('settles an Even haggle with no change', () => {
    const state = newGame();
    const offer = describeInteraction(state, entityOf('stallKeeper'));
    if (offer.kind !== 'shop' || !offer.haggle) throw new Error('Ordor haggles');
    const battle = makeBattle(offer.haggle.spec, state.hero);
    (battle.challenge as DuelChallenge).update(60_000);
    const result = resolveBattle(state, entityOf('stallKeeper'), battle, createRng(1), 'neutral');
    expect(result).toMatchObject({ won: true, gains: [], priceMultiplier: 1 });
  });

  it('lets a browse-only keeper just sell', () => {
    expect(describeInteraction(newGame(), entityOf('smith'))).toMatchObject({
      kind: 'shop',
      haggle: null,
    });
    expect(describeInteraction(newGame(), entityOf('smith'))).not.toHaveProperty('replies');
  });

  it('halves pay, dropping what rounds to nothing', () => {
    expect(
      halfPay([
        { kind: 'gil', amount: 15 },
        { kind: 'gil', amount: 1 },
        { kind: 'item', itemId: 'herb', count: 1 },
        { kind: 'flag', flag: 'x' },
      ]),
    ).toEqual([
      { kind: 'gil', amount: 7 },
      { kind: 'flag', flag: 'x' },
    ]);
  });
});

describe('the world remembers', () => {
  it('shows no prop before a try, and brightens the grove’s stone once Wren’s ring is saved', () => {
    const state = newGame();
    expect(worldState(state, 'forager')).toBeNull();
    expect(regionFixed(state, 'grove')).toBe(false);
    expect(regionFixed(state, 'peaks')).toBe(false);
    const offer = describeInteraction(state, entityOf('forager'));
    if (offer.kind !== 'challenge') throw new Error('Wren');
    const battle = makeBattle(offer.spec, state.hero);
    const contain = battle.challenge as ContainChallenge;
    battle.board.loadRows(['Cn'], { C: { cell: 'green', tag: 'protected' } });
    contain.picked = 2;
    const result = resolveBattle(state, entityOf('forager'), battle, createRng(1), offer.terms);
    expect(result.gains.filter((g) => g.kind === 'item')).toEqual([
      { kind: 'item', itemId: 'herb', count: 2 },
      { kind: 'item', itemId: 'herb', count: 1 },
    ]);
    expect(regionFixed(state, 'grove')).toBe(true);
  });
});

describe('lessons and fights', () => {
  const torva = { id: 'mentor:torva', kind: 'mentor', mentorId: 'torva', x: 3, y: 11 } as const;

  it('retries a lesson at once, then after the next won fight', () => {
    const state = newGame('ranger');
    const lose = () => {
      const spec = lessonSpec(state, 'torva', { spellId: 'fire', level: 1, difficulty: 1 });
      const battle = makeBattle(spec, state.hero);
      state.hero.hp = 0;
      return resolveBattle(state, torva, battle, createRng(1));
    };
    lose();
    expect(describeInteraction(state, torva)).toMatchObject({ blocked: { fire: null } });
    lose();
    expect(describeInteraction(state, torva)).toMatchObject({ blocked: { fire: 'wait' } });
    // A lent spell: the tooth is the mentor's regard.
    expect(regardOf(state, 'torva')).toBe(-2);
    expect(recordOf(state, lessonKey('fire')).strain).toBe(0);
  });

  it('eases the seal with each won monster fight', () => {
    const state = newGame('ranger');
    learnSpell(state.hero, 'fire');
    state.hero.seal = { spellId: 'fire', fights: 1 };
    const slime = MAPS.overworld!.entities.find((e) => e.kind === 'monster')!;
    const battle = makeBattle({ kind: 'combat', enemyId: 'slime' }, state.hero);
    battle.combat!.enemyHp = 0;
    const result = resolveBattle(state, slime, battle, createRng(1));
    expect(result.gains).toContainEqual({ kind: 'unseal', spellId: 'fire' });
    expect(state.hero.seal).toBeNull();
  });
});

describe('every encounter person', () => {
  it('runs a defined encounter', () => {
    for (const id of Object.keys(ENCOUNTER_DEFS)) {
      expect(NPCS[id]?.challenge).toMatchObject({ kind: 'encounter', id });
    }
  });

  it('draws its world props with real icons, and the person stands on a map', () => {
    for (const def of Object.values(ENCOUNTER_DEFS)) {
      expect(isIconId(def.world.win.icon), def.id).toBe(true);
      expect(isIconId(def.world.fail.icon), def.id).toBe(true);
      expect(() => entityOf(def.id)).not.toThrow();
    }
    expect(isIconId('nope')).toBe(false);
  });
});
