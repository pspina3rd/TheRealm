import { describe, expect, it } from 'vitest';
import { HOMETOWNS, HOMETOWN_MAPS, hometownOf } from '../src/data/hometowns';
import { MAPS } from '../src/data/maps';
import { MENTORS } from '../src/data/mentors';
import { OPENING, REFUSAL, SCENES } from '../src/data/story';
import { describeInteraction } from '../src/game/encounter';
import { itemCount } from '../src/game/hero';
import { openingLead } from '../src/game/opening';
import { deserialize, serialize } from '../src/game/save';
import {
  arrive,
  dismissVision,
  dueScenes,
  finishScene,
  scenePages,
  vesperEntities,
  visionOnWarp,
} from '../src/game/story';
import { DIRECTION_DELTAS, tileAt, warpAt, type Direction } from '../src/world/map';
import { mentorPlace } from '../src/world/mentors';
import { step } from '../src/world/movement';
import { activeEntities, currentMap, newGame, travel, type GameState } from '../src/world/state';

/** Walk actual collision maps without crossing monsters, NPCs or a locked mentor entrance. */
function safePath(state: GameState, goal: (x: number, y: number) => boolean): Direction[] | null {
  const map = currentMap(state);
  const queue: { x: number; y: number; path: Direction[] }[] = [
    { x: state.x, y: state.y, path: [] },
  ];
  const seen = new Set<string>();
  const blockers = activeEntities(state);
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i]!;
    if (seen.has(`${at.x},${at.y}`)) continue;
    seen.add(`${at.x},${at.y}`);
    if (goal(at.x, at.y)) return at.path;
    if (at.path.length && warpAt(map, at.x, at.y)) continue;
    for (const [direction, [dx, dy]] of Object.entries(DIRECTION_DELTAS)) {
      const x = at.x + dx,
        y = at.y + dy;
      if (
        !tileAt(map, x, y).walkable ||
        blockers.some((entity) => entity.x === x && entity.y === y)
      )
        continue;
      if (map.passages?.some((gate) => gate.x === x && gate.y === y)) continue;
      queue.push({ x, y, path: [...at.path, direction as Direction] });
    }
  }
  return null;
}

describe.each(HOMETOWNS)('$classId begins in $name', (home) => {
  it('starts with no spells, a safe home respawn, and only one familiar opening cast', () => {
    const state = newGame(home.classId);
    expect([state.mapId, state.x, state.y]).toEqual([home.map, home.start.x, home.start.y]);
    expect(state.respawn).toEqual(home.start);
    expect(state.hero.spells).toEqual({});
    expect(openingLead(state)).toBe('Check a shuttered house.');
    for (const town of HOMETOWNS) {
      travel(state, town.start);
      const neighbors = activeEntities(state).filter((entity) => entity.kind === 'npc');
      expect(neighbors.map((entity) => entity.npcId).sort()).toEqual(
        town.map === home.map ? ['elder', 'farmer', 'kid', 'stallKeeper'] : [],
      );
    }
  });

  it('puts investigation, the earned departure, and its words in the selected hometown', () => {
    const state = newGame(home.classId);
    const opening = scenePages(OPENING, state.hero, state.flags)
      .map((page) => page.text)
      .join(' ');
    expect(opening).toContain(`Dawn in ${home.name}.`);
    if (home.map !== 'mossvale') expect(opening).not.toContain('Mossvale');
    finishScene(state, OPENING);
    const house = activeEntities(state).find((entity) => entity.kind === 'inspect')!;
    describeInteraction(state, house);
    expect(dueScenes(state.flags, home.map)).not.toContain(REFUSAL);
    expect(itemCount(state.hero, 'wellStone')).toBe(0);
    expect(vesperEntities(state)).toEqual([]);
    state.flags.add('npc:elder'); // Well victory; puzzle mechanics are covered in verb tests.
    expect(dueScenes(state.flags, home.map)).toContain(REFUSAL);
    if (home.map !== 'mossvale') expect(dueScenes(state.flags, 'mossvale')).not.toContain(REFUSAL);
    expect(
      scenePages(REFUSAL, state.hero, state.flags)
        .map((page) => page.text)
        .join(' '),
    ).toContain(home.name);
    expect(finishScene(state, REFUSAL)).toEqual(['wellStone']);
    expect(finishScene(state, REFUSAL)).toEqual([]);
    expect(itemCount(state.hero, 'wellStone')).toBe(1);
    expect(state.hero.spells).toEqual({});
  });

  it('walks out onto its own regional road, returns through that entrance, and keeps visions ordered', () => {
    const state = newGame(home.classId);
    state.flags.add('got:wellStone');
    const path = safePath(state, (x, y) => !!warpAt(currentMap(state), x, y));
    expect(path).not.toBeNull();
    for (const direction of path!) {
      const result = step(state, direction);
      if (result.kind === 'warp') {
        expect(result.to).toEqual(home.returnTo);
        travel(state, result.to);
      } else expect(result.kind).toBe('moved');
    }
    expect(state.mapId).toBe(home.region);
    expect(arrive(state, home.map)?.id).toBe('vision1');
    dismissVision(state, 'vision1');
    expect(visionOnWarp(home.map, home.region, state.flags)?.id).not.toBe('vision1');
    const entrance = currentMap(state).warps.find((warp) => warp.to.map === home.map)!;
    expect(entrance).toBeDefined();
    const back = step(state, home.region === 'overworld' ? 'up' : 'down');
    expect(back.kind).toBe('warp');
    if (back.kind === 'warp') travel(state, back.to);
    expect(state.mapId).toBe(home.map);
    expect(arrive(state, home.region)).toBeNull();
    if (home.region === 'quarry') {
      expect(visionOnWarp('quarry', 'forge', state.flags)?.id).toBe('vision2');
      state.flags.add('vision:2');
      expect(visionOnWarp('overworld', 'peaks', state.flags)?.id).toBe('vision3');
    }
  });

  it('offers a route to Sevenstones without requiring a fight or moving any regional mentor', () => {
    const state = newGame(home.classId);
    travel(state, home.returnTo);
    if (home.region !== 'overworld') {
      const path = safePath(
        state,
        (x, y) => warpAt(currentMap(state), x, y)?.to.map === 'overworld',
      );
      expect(
        path,
        `${home.name} must not force a level-one hero through a regional monster`,
      ).not.toBeNull();
    }
    for (const mentor of Object.values(MENTORS)) {
      expect(mentorPlace(mentor, state)).toBe(mentor.route[0]);
    }
  });

  it('returns to the same neighbors for the late story and recovery', () => {
    const state = newGame(home.classId);
    finishScene(state, OPENING);
    for (const id of ['rowanReturn', 'mossvaleSupplies', 'mossvaleRecovery']) {
      const scene = SCENES.find((candidate) => candidate.id === id)!;
      const flags = new Set(state.flags);
      if (scene.dueWith) flags.add(scene.dueWith);
      for (const flag of scene.requiresFlags ?? []) flags.add(flag);
      expect(dueScenes(flags, home.map)).toContain(scene);
      if (home.map !== 'mossvale') expect(dueScenes(flags, 'mossvale')).not.toContain(scene);
      const words = scenePages(scene, state.hero, flags)
        .map((page) => page.text)
        .join(' ');
      if (home.map !== 'mossvale') expect(words).not.toContain('Mossvale');
    }
  });

  it('preserves the chosen home while away and recovers an invalid inn to that home', () => {
    const state = newGame(home.classId);
    travel(state, { map: 'brightwater', x: 12, y: 18 });
    state.flags.add('scene:opening');
    const loaded = deserialize(serialize(state))!;
    expect(loaded).toEqual(state);
    expect(hometownOf(loaded.flags).map).toBe(home.map);
    const raw = JSON.parse(serialize(state));
    raw.mapId = 'gone';
    raw.respawn = { map: 'gone', x: 0, y: 0 };
    const recovered = deserialize(JSON.stringify(raw))!;
    expect([recovered.mapId, recovered.x, recovered.y]).toEqual([
      home.map,
      home.start.x,
      home.start.y,
    ]);
  });

  it('preserves an older protagonist’s Mossvale origin without resetting their story', () => {
    const state = newGame(home.classId);
    travel(state, { map: 'brightwater', x: 12, y: 18 });
    state.respawn = { map: 'mossvale', x: 18, y: 20 };
    state.flags.add('scene:opening');
    state.flags.add('scene:refusal');
    state.flags.add('got:wellStone');
    const raw = JSON.parse(serialize(state));
    raw.version = 15;
    raw.flags = raw.flags.filter((flag: string) => !flag.startsWith('home:'));
    const loaded = deserialize(JSON.stringify(raw))!;
    expect(hometownOf(loaded.flags).map).toBe('mossvale');
    expect(loaded.mapId).toBe('brightwater');
    expect(loaded.flags).toEqual(new Set(raw.flags));
    expect(loaded.hero).toEqual(state.hero);
  });
});

it('does not expose the other alternate hometown roads or relocate mentor stops', () => {
  for (const home of HOMETOWNS) {
    const state = newGame(home.classId);
    for (const region of ['overworld', 'quarry', 'lake', 'grove']) {
      travel(state, { map: region, x: 1, y: 1 });
      const destinations = currentMap(state).warps.filter((warp) => HOMETOWN_MAPS.has(warp.to.map));
      expect(
        destinations.every((warp) => warp.to.map === home.map || warp.to.map === 'mossvale'),
      ).toBe(true);
    }
  }
  expect(
    Object.values(MENTORS)
      .map((mentor) => mentor.route[0].map)
      .sort(),
  ).toEqual(['forge', 'lake', 'peaks', 'grove', 'quarry', 'ruins', 'cliffs'].sort());
  expect(MAPS.mossvale!.name).toBe('Mossvale');
});
