import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_FLAGS as C,
  CAMPAIGN_RECOVERY_FLAG,
  CAMPAIGN_SUMMARY_FLAG,
} from '../src/data/campaignFlags';
import { MAPS } from '../src/data/maps';
import { SCENES, type SceneDef } from '../src/data/story';
import { createRng } from '../src/core/rng';
import { resolveBattle } from '../src/game/encounter';
import { campaignEpilogueFor, campaignSummaryDue } from '../src/game/ending';
import { itemCount, learnSpell } from '../src/game/hero';
import { deserialize, SAVE_VERSION, serialize } from '../src/game/save';
import { dueScenes, finishScene, migrateScenes, scenePages } from '../src/game/story';
import type { MapDef, MonsterEntity } from '../src/world/map';
import { activeEntities, newGame, type GameState } from '../src/world/state';
import { makeBattle } from './helpers';

/** Isolated content fixture for the lifecycle, independent of scene wording. */
function withScene(scene: SceneDef, check: () => void): void {
  const scenes = SCENES as SceneDef[];
  scenes.push(scene);
  try {
    check();
  } finally {
    scenes.splice(scenes.indexOf(scene), 1);
  }
}

const testScene: SceneDef = {
  id: 'runtimeFixture',
  title: 'A working test scene',
  flag: 'scene:runtimeFixture',
  map: 'overworld',
  requiresFlags: ['wyrmBeaten', 'scene:chapterEnd'],
  untilFlag: C.returned,
  sets: ['campaign:fixtureFinished', C.complete],
  beats: [{ stage: '*The helper finishes their work.*', gives: 'ether' }],
};

describe('campaign scene lifecycle', () => {
  it('waits for every milestone and the right map, then stops once obsolete or seen', () => {
    withScene(testScene, () => {
      const flags = new Set<string>();
      const fixtureDue = (map?: string) => dueScenes(flags, map).includes(testScene);
      expect(fixtureDue('overworld')).toBe(false);
      flags.add('wyrmBeaten');
      expect(fixtureDue('overworld')).toBe(false);
      flags.add('scene:chapterEnd');
      expect(fixtureDue()).toBe(false);
      expect(fixtureDue('mossvale')).toBe(false);
      expect(fixtureDue('overworld')).toBe(true);
      flags.add(C.returned);
      expect(fixtureDue('overworld')).toBe(false);
      flags.delete(C.returned);
      flags.add(testScene.flag);
      expect(fixtureDue('overworld')).toBe(false);
    });
  });

  it('replays an interrupted scene, commits gains once, and cannot grant battle completion', () => {
    withScene(testScene, () => {
      const state = newGame();
      state.mapId = 'overworld';
      state.x = 15;
      state.y = 19;
      state.flags.add('wyrmBeaten');
      state.flags.add('scene:chapterEnd');
      const before = itemCount(state.hero, 'ether');
      const reloaded = deserialize(serialize(state))!;
      expect(dueScenes(reloaded.flags, reloaded.mapId)).toContain(testScene);
      expect(reloaded.flags.has('campaign:fixtureFinished')).toBe(false);
      expect(finishScene(reloaded, testScene)).toEqual(['ether']);
      expect(reloaded.flags.has('campaign:fixtureFinished')).toBe(true);
      expect(reloaded.flags.has(C.complete)).toBe(false);
      expect(finishScene(reloaded, testScene)).toEqual([]);
      expect(itemCount(reloaded.hero, 'ether')).toBe(before + 1);
      const finished = deserialize(serialize(reloaded))!;
      expect(dueScenes(finished.flags, finished.mapId)).not.toContain(testScene);
      expect(finished.flags.has('campaign:fixtureFinished')).toBe(true);
    });
  });

  it('migrates only the original four scenes, leaving a newly due campaign scene unseen', () => {
    const scene: SceneDef = { ...testScene, map: undefined, requiresFlags: ['wyrmBeaten'] };
    withScene(scene, () => {
      const state = newGame();
      state.flags.add('wyrmBeaten');
      migrateScenes(state.flags, state.hero);
      expect(state.flags.has('scene:chapterEnd')).toBe(true);
      expect(state.flags.has(scene.flag)).toBe(false);
      expect(state.flags.has('campaign:fixtureFinished')).toBe(false);
      expect(dueScenes(state.flags)).toContain(scene);
    });
  });

  it('returns the hero only after the final page and never transports twice', () => {
    const scene: SceneDef = {
      ...testScene,
      map: 'innerWard',
      to: { map: 'overworld', x: 18, y: 19 },
    };
    const state = newGame();
    state.flags.add(C.descent);
    state.mapId = 'innerWard';
    state.x = 3;
    state.y = 19;
    const interrupted = deserialize(serialize(state))!;
    expect(interrupted.mapId).toBe('innerWard');
    expect(interrupted.flags.has(scene.flag)).toBe(false);
    finishScene(interrupted, scene);
    expect([interrupted.mapId, interrupted.x, interrupted.y]).toEqual(['overworld', 18, 19]);
    expect(interrupted.flags.has(scene.flag)).toBe(true);
    const finished = deserialize(serialize(interrupted))!;
    expect(finished.mapId).toBe('overworld');
    finished.mapId = 'mossvale';
    finished.x = 9;
    finished.y = 12;
    expect(finishScene(finished, scene)).toEqual([]);
    expect(finished.mapId).toBe('mossvale');
  });

  it('omits intimate mentor lines without an earned lesson bond', () => {
    const scene: SceneDef = {
      id: 'mentorFixture',
      title: 'Helpers',
      flag: 'scene:mentorFixture',
      beats: [
        { stage: '*Local helpers take the spare stations.*' },
        {
          stage: '*Torva tends the stone.*',
          who: 'torva',
          line: 'Familiar words.',
          requiresMentor: 'torva',
        },
      ],
    };
    const hero = newGame('ranger').hero;
    expect(scenePages(scene, hero)).toHaveLength(1);
    learnSpell(hero, 'wildfire');
    expect(scenePages(scene, hero)).toHaveLength(2);
    expect(scenePages(scene, hero)[1]!.speaker?.name).toBe('Torva');
  });
});

describe('campaign save compatibility', () => {
  const stored = (state: GameState, version: number) => ({
    ...JSON.parse(serialize(state)),
    version,
  });

  it.each([7, 8, 9])(
    'keeps the new threshold available to an old Wyrm-complete v%i save',
    (version) => {
      const old = newGame();
      old.mapId = 'overworld';
      old.x = 15;
      old.y = 19;
      old.flags.add('wyrmBeaten');
      if (version === 9) {
        old.flags.add('scene:opening');
        old.flags.add('scene:chapterEnd');
        old.flags.add('scene:wyrmFall');
      }
      const loaded = deserialize(JSON.stringify(stored(old, version)))!;
      expect(loaded).not.toBeNull();
      expect(loaded.flags.has(C.descent)).toBe(false);
      expect(loaded.flags.has(C.complete)).toBe(false);
      expect(
        dueScenes(loaded.flags, 'overworld').some((scene) => scene.id === 'campaignThreshold'),
      ).toBe(true);
    },
  );

  it('recovers obsolete v7 Sunken Ruins outside the ward without granting new progress', () => {
    const old = stored(newGame(), 7);
    old.mapId = 'sunkenRuins';
    old.x = 2;
    old.y = 2;
    old.respawn = { map: 'sunkenRuins', x: 3, y: 3 };
    const loaded = deserialize(JSON.stringify(old))!;
    expect([loaded.mapId, loaded.x, loaded.y]).toEqual(['overworld', 15, 19]);
    expect(loaded.flags.has(C.descent)).toBe(false);
    expect(SAVE_VERSION).toBe(14);
  });

  it('does not reinterpret a newly recognized campaign destination as an old earned location', () => {
    const old = stored(newGame(), 9);
    old.mapId = 'innerWard';
    old.x = 1;
    old.y = 1;
    old.respawn = { map: 'innerWard', x: 1, y: 1 };
    const loaded = deserialize(JSON.stringify(old))!;
    expect([loaded.mapId, loaded.x, loaded.y]).toEqual(['overworld', 15, 19]);
    expect(loaded.respawn.map).toBe('mossvale');
    expect(loaded.flags.has(C.wardReady)).toBe(false);
  });

  it('keeps a v10 save on a tile whose story entity is absent', () => {
    const original = MAPS.mossvale!;
    const map: MapDef = {
      ...original,
      entities: [
        { id: 'hiddenPerson', kind: 'npc', npcId: 'elder', x: 9, y: 13, requiresFlag: C.returned },
      ],
    };
    (MAPS as Record<string, MapDef>).mossvale = map;
    try {
      const state = newGame();
      state.x = 9;
      state.y = 13;
      const loaded = deserialize(serialize(state))!;
      expect([loaded.mapId, loaded.x, loaded.y]).toEqual(['mossvale', 9, 13]);
      expect(activeEntities(loaded)).not.toContainEqual(map.entities[0]);
      loaded.flags.add(C.returned);
      expect(activeEntities(loaded)).toContainEqual(map.entities[0]);
    } finally {
      (MAPS as Record<string, MapDef>).mossvale = original;
    }
  });

  it('does not relocate a hero standing where a departed actor or defeated boss used to be', () => {
    const original = MAPS.mossvale!;
    for (const entity of [
      {
        id: 'retiredPerson',
        kind: 'npc' as const,
        npcId: 'elder',
        x: 9,
        y: 13,
        untilFlag: C.returned,
      },
      { id: 'retiredBoss', kind: 'monster' as const, enemyId: 'slime', x: 9, y: 13, boss: true },
    ]) {
      (MAPS as Record<string, MapDef>).mossvale = { ...original, entities: [entity] };
      try {
        const state = newGame();
        state.x = 9;
        state.y = 13;
        state.flags.add(entity.kind === 'npc' ? C.returned : `defeated:${entity.id}`);
        const loaded = deserialize(serialize(state))!;
        expect([loaded.mapId, loaded.x, loaded.y]).toEqual(['mossvale', 9, 13]);
        expect(activeEntities(loaded)).not.toContainEqual(entity);
      } finally {
        (MAPS as Record<string, MapDef>).mossvale = original;
      }
    }
  });
});

describe('earned full-campaign completion', () => {
  const finalBoss: MonsterEntity = {
    id: 'campaign-malificat',
    kind: 'monster',
    enemyId: 'malificat',
    x: 1,
    y: 1,
    boss: true,
  };

  it('requires the final actor, a real won combat, and both rite milestones', () => {
    for (const milestones of [[], [C.rite], [C.wardReady], [C.rite, C.wardReady]]) {
      const state = newGame();
      for (const flag of milestones) state.flags.add(flag);
      const battle = makeBattle({ kind: 'combat', enemyId: 'malificat' }, state.hero);
      battle.combat!.enemyHp = 0;
      resolveBattle(state, finalBoss, battle, createRng(1));
      expect(state.flags.has(C.complete)).toBe(milestones.length === 2);
    }
    const state = newGame();
    state.flags.add(C.rite);
    state.flags.add(C.wardReady);
    const lost = makeBattle({ kind: 'combat', enemyId: 'malificat' }, state.hero);
    state.hero.hp = 0;
    resolveBattle(state, finalBoss, lost, createRng(1));
    expect(state.flags.has(C.complete)).toBe(false);
    expect(state.flags.has(C.malificat)).toBe(false);
  });

  it('does not grant completion for a differently placed enemy or the Wyrm', () => {
    const state = newGame();
    state.flags.add(C.rite);
    state.flags.add(C.wardReady);
    const unearned = makeBattle({ kind: 'combat', enemyId: 'malificat' }, state.hero);
    unearned.combat!.enemyHp = 0;
    resolveBattle(state, { ...finalBoss, id: 'not-the-final-actor' }, unearned, createRng(1));
    expect(state.flags.has(C.complete)).toBe(false);
    const wyrm = makeBattle({ kind: 'combat', enemyId: 'moonWyrm' }, state.hero);
    wyrm.combat!.enemyHp = 0;
    resolveBattle(state, { ...finalBoss, id: 'c2-wyrm', enemyId: 'moonWyrm' }, wyrm, createRng(1));
    expect(state.flags.has('wyrmBeaten')).toBe(true);
    expect(state.flags.has(C.complete)).toBe(false);
  });

  it('waits for recovery before a one-time campaign summary, including after reload', () => {
    const state = newGame();
    expect(campaignSummaryDue(state.flags)).toBe(false);
    state.flags.add(C.complete);
    expect(campaignSummaryDue(state.flags)).toBe(false);
    state.flags.add(CAMPAIGN_RECOVERY_FLAG);
    const reloaded = deserialize(serialize(state))!;
    expect(campaignSummaryDue(reloaded.flags)).toBe(true);
    expect(campaignEpilogueFor(reloaded.hero)).toMatchObject({
      campaign: true,
      level: reloaded.hero.level,
      spells: Object.keys(reloaded.hero.spells).length,
    });
    reloaded.flags.add(CAMPAIGN_SUMMARY_FLAG);
    expect(campaignSummaryDue(deserialize(serialize(reloaded))!.flags)).toBe(false);
  });
});
