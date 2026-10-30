/** Team cases adapted to the durable GetPutTaco interaction contract. */
import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import { NPCS } from '../src/data/npcs';
import { ENCOUNTER_DEFS } from '../src/data/encounters';
import {
  describeInteraction,
  resolveBattle,
  commitBattleTry,
  lessonInteraction,
} from '../src/game/encounter';
import {
  halfPay,
  lessonKey,
  objectiveText,
  regionFixed,
  worldState,
} from '../src/game/encounterFlow';
import { innNight, regardOf, recordOf } from '../src/game/stakes';
import { lessonsFor } from '../src/game/lessons';
import { MENTORS } from '../src/data/mentors';
import { createRng } from '../src/core/rng';
import { newGame, type GameState } from '../src/world/state';
import type { EntityDef } from '../src/world/map';
import type { Battle } from '../src/battle/battle';
import { isIconId } from '../src/ui/art/icons';
import { makeBattle } from './helpers';

function entityOf(id: string): EntityDef {
  const entity = Object.values(MAPS)
    .flatMap((m) => m.entities)
    .find((e) => e.kind === 'npc' && e.npcId === id);
  if (!entity) throw new Error(id);
  return entity;
}
function offer(state: GameState, id: string) {
  const interaction = describeInteraction(state, entityOf(id));
  if (interaction.kind !== 'challenge') throw new Error(`${id} has no challenge`);
  return interaction;
}
function commit(state: GameState, battle: Battle) {
  while (battle.demoPlaying) battle.update(50);
  expect(commitBattleTry(state, battle)).toBe(true);
  battle.input('left');
}
function play(state: GameState, id: string, won: boolean, assisted = false) {
  const shown = offer(state, id);
  const spec = assisted ? shown.assistedSpec : shown.spec;
  if (!spec) throw new Error('Assistance not offered');
  const battle = makeBattle(spec, state.hero);
  commit(state, battle);
  Object.defineProperty(battle, 'status', { value: won ? 'won' : 'lost' });
  return {
    shown,
    battle,
    result: resolveBattle(state, entityOf(id), battle, createRng(1), shown.terms),
  };
}

describe('team M1 flow reconciliation', () => {
  it('shows authored stakes, actual rewards and regard before play', () => {
    const state = newGame();
    const shown = offer(state, 'elder');
    expect(shown.stakes).toMatchObject({
      rewards: [{ kind: 'spell', spellId: 'quake' }],
      regard: { current: 0, after: 1 },
      strain: 0,
      blockedReason: null,
    });
    expect(shown.stakes?.objective).toContain(ENCOUNTER_DEFS.elder!.objective);
    expect(shown.stakes?.objective).toContain('One correction per attempt');
    expect(shown.stakes?.fail).toContain('The mold spreads');
    expect(shown.spec).toMatchObject({ demo: true, strain: 0 });
    expect(recordOf(state, 'elder').tries).toBe(0);
  });
  it('fills the strain-dependent planting target', () => {
    expect(objectiveText(ENCOUNTER_DEFS.farmer!, 0)).toContain('19 sprouts');
    expect(objectiveText(ENCOUNTER_DEFS.farmer!, 2)).toContain('21 sprouts');
  });
  it('records loss then recovery, and remembers the latest outcome', () => {
    const state = newGame('knight');
    expect(worldState(state, 'elder')).toBeNull();
    play(state, 'elder', false);
    expect(recordOf(state, 'elder')).toMatchObject({ tries: 1, fails: 1, strain: 1 });
    expect(worldState(state, 'elder')).toBe('fail');
    const recovered = play(state, 'elder', true);
    expect(recovered.result.gains).toContainEqual({ kind: 'spell', spellId: 'quake' });
    expect(worldState(state, 'elder')).toBe('win');
    expect(state.flags.has('npc:elder')).toBe(true);
    expect(regardOf(state, 'elder')).toBe(0);
  });
  it('replays once a day at half item pay without farming regard', () => {
    const state = newGame();
    play(state, 'farmer', true);
    expect(offer(state, 'farmer').canAccept).toBe(false);
    innNight(state);
    const again = play(state, 'farmer', true);
    expect(again.shown.stakes?.rewards).toContainEqual({ kind: 'item', itemId: 'herb', count: 1 });
    expect(again.result.gains).toEqual([{ kind: 'item', itemId: 'herb', count: 1 }]);
    expect(regardOf(state, 'farmer')).toBe(1);
  });
  it('offers explicit threshold assistance after two failures and keeps its pass reward', () => {
    const state = newGame();
    play(state, 'guard', false);
    state.victories++;
    play(state, 'guard', false);
    expect(offer(state, 'guard')).toMatchObject({
      canAccept: false,
      assistedSpec: { assisted: true, strain: 0 },
      stakes: { assist: { mentorId: 'maren' } },
    });
    state.victories++;
    const helped = play(state, 'guard', true, true);
    expect(helped.result.gains).toEqual([{ kind: 'gil', amount: 20 }]);
    expect(state.flags.has('cavePass')).toBe(true);
    expect(regardOf(state, 'guard')).toBe(-2);
  });
  it('lets browse-only keepers sell without consuming a try', () => {
    const state = newGame();
    expect(describeInteraction(state, entityOf('smith'))).toMatchObject({
      kind: 'message',
      browse: { shopId: 'brightwaterSmith' },
    });
    expect(offer(state, 'stallKeeper')).toMatchObject({ browse: { shopId: 'mossvaleStall' } });
    expect(state.encounters).toEqual({});
  });
  it('halves pay without zero-count rewards', () => {
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
  it('brightens the grove from an earned Wren win', () => {
    const state = newGame();
    expect(regionFixed(state, 'grove')).toBe(false);
    play(state, 'forager', true);
    expect(regionFixed(state, 'grove')).toBe(true);
    expect(regionFixed(state, 'peaks')).toBe(false);
  });
  it('keeps Hazel retry costs bounded in their own record', () => {
    const state = newGame();
    const lesson = lessonsFor(state, MENTORS.hazel!)[0]!;
    const entity = { id: 'mentor:hazel', kind: 'mentor', mentorId: 'hazel', x: 0, y: 0 } as const;
    for (let i = 0; i < 2; i++) {
      const card = lessonInteraction(state, 'hazel', lesson);
      if (card.kind !== 'challenge') throw new Error('Hazel card');
      const battle = makeBattle(card.spec, state.hero);
      commit(state, battle);
      battle.giveUp();
      resolveBattle(state, entity, battle, createRng(1));
    }
    expect(recordOf(state, lessonKey(lesson.spellId))).toMatchObject({
      fails: 2,
      strain: 0,
      waitPast: state.victories,
    });
    expect(lessonInteraction(state, 'hazel', lesson)).toMatchObject({ canAccept: false });
  });
  it('maps every M1 encounter and prop icon to an actual person', () => {
    for (const def of Object.values(ENCOUNTER_DEFS)) {
      expect(NPCS[def.id]?.challenge).toMatchObject({ kind: 'encounter', id: def.id });
      expect(isIconId(def.world.win.icon)).toBe(true);
      expect(isIconId(def.world.fail.icon)).toBe(true);
      expect(entityOf(def.id)).toBeDefined();
    }
  });
});
