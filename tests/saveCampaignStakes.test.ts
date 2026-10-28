import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { CAMPAIGN_FLAGS as C } from '../src/data/campaignFlags';
import { MAPS, START } from '../src/data/maps';
import { resolveBattle } from '../src/game/encounter';
import { removeItem } from '../src/game/hero';
import { SAVE_VERSION, deserialize, serialize } from '../src/game/save';
import { beginTry, settle, settleHaggle } from '../src/game/stakes';
import { arrive, dueScenes, finishScene, scenePages } from '../src/game/story';
import { newGame, travel, type GameState } from '../src/world/state';
import { makeBattle, setUpVerticalIClear } from './helpers';

function finishDue(state: GameState): void {
  for (let guard = 0; guard < 30; guard++) {
    const scene = dueScenes(state.flags, state.mapId)[0];
    if (!scene) return;
    finishScene(state, scene);
  }
  throw new Error('Scene sequence did not finish');
}

/** Prepared combat inputs earn Chapter One; this fixture does not claim a full playthrough. */
function afterWyrm(): GameState {
  const state = newGame('mage');
  finishDue(state);
  travel(state, { map: 'overworld', x: 15, y: 19 });
  arrive(state, 'mossvale');
  finishDue(state);
  const wyrm = MAPS.caves2!.entities.find((e) => e.kind === 'monster' && e.enemyId === 'moonWyrm');
  if (!wyrm || wyrm.kind !== 'monster') throw new Error('Missing Wyrm');
  travel(state, { map: 'caves2', x: wyrm.x, y: wyrm.y - 1 });
  const battle = makeBattle({ kind: 'combat', enemyId: wyrm.enemyId }, state.hero);
  for (let i = 0; i < 100 && battle.status === 'ongoing'; i++) {
    setUpVerticalIClear(battle.board, 4);
    battle.input('hardDrop');
  }
  expect(battle.status).toBe('won');
  resolveBattle(state, wyrm, battle, createRng(23));
  finishDue(state);
  travel(state, { map: 'overworld', x: 15, y: 19 });
  return state;
}

function addStakes(state: GameState): void {
  state.day = 4;
  beginTry(state, 'elder');
  settle(
    state,
    'elder',
    {
      personId: 'elder',
      retry: 'now',
      repeatable: false,
      threshold: false,
      strains: true,
    },
    false,
  );
  settleHaggle(state, 'stallKeeper', 'mossvaleStall', 'fail', 1.1);
  state.hero.seal = { spellId: 'shadow', fights: 2 };
}

function archive(state: GameState): void {
  const entrance = MAPS.overworld!.warps.find((w) => w.to.map === 'sunkenArchive');
  if (!entrance) throw new Error('Missing archive entrance');
  travel(state, entrance.to);
  state.respawn = { map: state.mapId, x: state.x, y: state.y };
}

function asVersion(state: GameState, version: number) {
  return { ...JSON.parse(serialize(state)), version };
}

describe('unified campaign and stakes save migration', () => {
  it('round-trips earned campaign position, due scene and stakes together in version 11', () => {
    const state = afterWyrm();
    finishDue(state);
    expect(state.flags.has(C.descent)).toBe(true);
    archive(state);
    addStakes(state);
    state.flags.add('campaign:future-milestone');
    const scene = dueScenes(state.flags, state.mapId)[0]!;
    expect(scene.id).toBe('archiveRefuge');
    const pages = scenePages(scene, state.hero);
    // Viewing pages does not complete the scene; reload starts it again.
    const loaded = deserialize(serialize(state))!;
    expect(SAVE_VERSION).toBe(11);
    expect(loaded).toEqual(state);
    expect(scenePages(dueScenes(loaded.flags, loaded.mapId)[0]!, loaded.hero)).toEqual(pages);
    finishScene(loaded, scene);
    expect(deserialize(serialize(loaded))!.flags.has(scene.flag)).toBe(true);
  });

  it('loads the campaign-only version 10 with earned descent and no stakes or seal', () => {
    const state = afterWyrm();
    finishDue(state);
    archive(state);
    const old = asVersion(state, 10);
    delete old.day;
    delete old.regard;
    delete old.regardPeak;
    delete old.encounters;
    delete old.prices;
    delete old.hero.seal;
    old.hero.failedLessons = { arcane: { spellId: 'shadow', level: 2 } };
    const loaded = deserialize(JSON.stringify(old))!;
    expect(loaded.mapId).toBe('sunkenArchive');
    expect(loaded.respawn).toEqual(state.respawn);
    expect(loaded.flags).toEqual(state.flags);
    expect(loaded).toMatchObject({
      day: 0,
      regard: {},
      regardPeak: {},
      encounters: {},
      prices: {},
    });
    expect(loaded.hero.seal).toBeNull();
    expect(loaded.hero).not.toHaveProperty('failedLessons');
    expect(deserialize(serialize(loaded))).toEqual(loaded);
  });

  it('keeps stakes-only version 10 progress without granting descent from edited locations', () => {
    const state = newGame('mage');
    addStakes(state);
    archive(state);
    const loaded = deserialize(JSON.stringify(asVersion(state, 10)))!;
    expect(loaded.mapId).toBe(START.map);
    expect(loaded.respawn).toEqual(START);
    expect(loaded.flags.has(C.descent)).toBe(false);
    for (const key of ['day', 'regard', 'regardPeak', 'encounters', 'prices'] as const)
      expect(loaded[key]).toEqual(state[key]);
    expect(loaded.hero.seal).toEqual(state.hero.seal);
    expect(deserialize(serialize(loaded))).toEqual(loaded);
  });

  it.each([9, 10, 11])(
    'keeps the threshold pending until its final beat in version %i',
    (version) => {
      const state = afterWyrm();
      const scene = dueScenes(state.flags, state.mapId)[0]!;
      expect(scene.id).toBe('campaignThreshold');
      expect(state.flags.has(C.descent)).toBe(false);
      const loaded = deserialize(JSON.stringify(asVersion(state, version)))!;
      expect(loaded.flags.has(C.descent)).toBe(false);
      expect(dueScenes(loaded.flags, loaded.mapId)[0]?.id).toBe(scene.id);
      finishScene(loaded, scene);
      expect(loaded.flags.has(C.descent)).toBe(true);
    },
  );

  it.each([8, 10, 11])(
    'never grants a sold Focus Stone again after version %i migration',
    (version) => {
      const state = afterWyrm();
      expect(state.hero.items.wellStone).toBe(1);
      removeItem(state.hero, 'wellStone');
      const loaded = deserialize(JSON.stringify(asVersion(state, version)))!;
      const refusal = dueScenes(new Set(['vision:1']), 'overworld').find(
        (s) => s.id === 'refusal',
      )!;
      expect(finishScene(loaded, refusal)).toEqual([]);
      expect(loaded.hero.items.wellStone).toBeUndefined();
      expect(loaded.flags.has('got:wellStone')).toBe(true);
      expect(deserialize(serialize(loaded))!.hero.items.wellStone).toBeUndefined();
    },
  );
});
