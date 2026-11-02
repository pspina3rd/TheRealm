import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import { HOMETOWNS } from '../src/data/hometowns';
import { MENTORS } from '../src/data/mentors';
import {
  SURFACE_CENTER,
  STONE_APPROACH,
  SURFACE_SITES,
  SURFACE_SIZE,
  expandedLocation,
  legacySurfacePoint,
} from '../src/data/surfaceLayout';
import { deserialize, serialize } from '../src/game/save';
import { visionOnWarp } from '../src/game/story';
import { step } from '../src/world/movement';
import { activeEntities, currentMap, newGame, travel, type GameState } from '../src/world/state';
import { tileAt, warpAt } from '../src/world/map';

/** Physical route distance, avoiding fights, people, signs and other map entrances. */
function safeDistance(state: GameState, to: { x: number; y: number }): number {
  const map = currentMap(state),
    size = SURFACE_SIZE;
  const blocked = new Set(activeEntities(state).map((entity) => entity.y * size + entity.x));
  const distance = new Int32Array(size * size).fill(-1),
    queue = new Int32Array(size * size);
  let head = 0,
    tail = 0;
  const start = state.y * size + state.x;
  queue[tail++] = start;
  distance[start] = 0;
  while (head < tail) {
    const at = queue[head++]!,
      x = at % size,
      y = Math.floor(at / size);
    if (x === to.x && y === to.y) return distance[at]!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx!,
        ny = y + dy!,
        next = ny * size + nx;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= size ||
        ny >= size ||
        distance[next] !== -1 ||
        blocked.has(next) ||
        !tileAt(map, nx, ny).walkable
      )
        continue;
      if (warpAt(map, nx, ny) && !(nx === to.x && ny === to.y)) continue;
      distance[next] = distance[at]! + 1;
      queue[tail++] = next;
    }
  }
  return -1;
}

describe('a full Sevenstones surface world', () => {
  it('returns underground exits to their matching surface landings', () => {
    for (const id of ['sunkenArchive', 'upwardRoad', 'innerWard'] as const)
      for (const warp of MAPS[id]!.warps.filter((exit) => exit.to.map === 'overworld')) {
        const point = SURFACE_SITES[id];
        expect(Math.abs(warp.to.x - point.x) + Math.abs(warp.to.y - point.y)).toBeLessThanOrEqual(
          2,
        );
      }
  });
  it('contains a 256-square continent with real terrain and regional roads', () => {
    const map = MAPS.overworld!;
    expect(map.tiles).toHaveLength(256);
    expect(map.tiles.every((row) => row.length === 256)).toBe(true);
    for (const tile of ['~', 'T', '^', '=', 'B', '!'])
      expect(map.tiles.some((row) => row.includes(tile))).toBe(true);
    expect(map.entities.filter((entity) => entity.id.startsWith('surface:sign:'))).toHaveLength(5);
  });

  for (const home of HOMETOWNS)
    it(`${home.name} reaches the stones only by passing through Mossvale`, () => {
      const state = newGame(home.classId);
      state.x = 17;
      state.y = 24;
      const exit = step(state, 'down');
      expect(exit.kind).toBe('warp');
      if (exit.kind !== 'warp') throw new Error('Missing hometown exit');
      expect(exit.to).toEqual(home.returnTo);
      travel(state, exit.to);
      expect(state.mapId).toBe('overworld');
      expect(safeDistance(state, SURFACE_CENTER)).toBe(-1);
      const distance = safeDistance(state, SURFACE_SITES.mossvale);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(700);
      travel(state, { map: 'mossvale', x: 17, y: 24 });
      expect(safeDistance(state, { x: 20, y: 0 })).toBeGreaterThan(0);
      travel(state, { map: 'mossvale', x: 20, y: 1 });
      const north = step(state, 'up');
      expect(north.kind).toBe('warp');
      if (north.kind !== 'warp') throw new Error('Missing Mossvale north path');
      travel(state, north.to);
      expect(safeDistance(state, SURFACE_CENTER)).toBeGreaterThan(0);
      travel(state, { map: 'overworld', x: STONE_APPROACH.x, y: STONE_APPROACH.y + 1 });
      expect(step(state, 'up')).toMatchObject({
        kind: 'warp',
        to: { map: 'mossvale', x: 20, y: 1 },
      });
      expect(state.hero.spells).toEqual({});
      expect(state.flags.has('got:wellStone')).toBe(false);
    });

  for (const id of ['grove', 'lake', 'quarry', 'forge', 'peaks', 'cliffs', 'ruins'] as const)
    it(`${id} is reached through a provincial road, not a distant local-map jump`, () => {
      const state = newGame();
      travel(state, {
        map: 'overworld',
        x: SURFACE_SITES.mossvale.x,
        y: SURFACE_SITES.mossvale.y + 1,
      });
      for (const flag of ['ridgeCleared', 'peakGate', 'reached:cliffs']) state.flags.add(flag);
      expect(safeDistance(state, SURFACE_SITES[id])).toBeGreaterThan(40);
      travel(state, { map: 'overworld', ...SURFACE_CENTER });
      expect(safeDistance(state, SURFACE_SITES[id])).toBe(-1);
      for (const warp of MAPS[id]!.warps)
        expect(warp.to.map === 'overworld' || warp.to.map.startsWith('caves')).toBe(true);
    });

  for (const [id, flag] of [
    ['forge', 'ridgeCleared'],
    ['peaks', 'peakGate'],
    ['cliffs', 'peakGate'],
    ['ruins', 'reached:cliffs'],
  ] as const)
    it(`${id} retains its earned progression gate`, () => {
      const state = newGame(),
        point = SURFACE_SITES[id];
      if (id === 'cliffs') state.flags.add('reached:peaks');
      if (id === 'ruins') state.flags.add('peakGate');
      travel(state, { map: 'overworld', x: point.x, y: point.y + 1 });
      expect(step(state, 'up').kind).toBe('locked');
      state.flags.add(flag);
      expect(step(state, 'up')).toMatchObject({ kind: 'warp', to: { map: id } });
    });

  it('gives only Mossvale a north path into the sanctuary', () => {
    for (const home of HOMETOWNS) {
      const north = MAPS[home.map]!.warps.filter((warp) => warp.y === 0);
      expect(north).toHaveLength(home.map === 'mossvale' ? 1 : 0);
    }
  });

  it('does not move the mentors’ original regional homes', () => {
    expect(
      Object.values(MENTORS)
        .map((mentor) => mentor.route[0].map)
        .sort(),
    ).toEqual(['forge', 'lake', 'grove', 'quarry', 'peaks', 'cliffs', 'ruins'].sort());
  });

  it('migrates a version-16 overworld position and respawn once, without granting progress', () => {
    const state = newGame('mage');
    state.flags.add('scene:opening');
    const raw = JSON.parse(serialize(state));
    Object.assign(raw, {
      version: 16,
      mapId: 'overworld',
      x: 5,
      y: 6,
      respawn: { map: 'overworld', x: 22, y: 12 },
    });
    const loaded = deserialize(JSON.stringify(raw))!;
    expect([loaded.mapId, loaded.x, loaded.y]).toEqual([
      'overworld',
      legacySurfacePoint(5, 6).x,
      legacySurfacePoint(5, 6).y,
    ]);
    expect(loaded.respawn).toEqual(expandedLocation(raw.respawn));
    expect(loaded.hero).toEqual(state.hero);
    expect(loaded.flags).toEqual(state.flags);
    expect(deserialize(serialize(loaded))).toEqual(loaded);
  });
});

it('cannot use a current-save reload to turn a Cave Pass into unearned road keys', () => {
  const state = newGame();
  state.flags.add('cavePass');
  const loaded = deserialize(serialize(state))!;
  expect(loaded.flags.has('ridgeCleared')).toBe(false);
  expect(loaded.flags.has('peakGate')).toBe(false);
});

it('preserves the vision order when regional school visits precede the call', () => {
  const flags = new Set([
    'got:wellStone',
    'ridgeCleared',
    'peakGate',
    'reached:quarry',
    'reached:forge',
  ]);
  expect(visionOnWarp('mossvale', 'overworld', flags)?.id).toBe('vision1');
  flags.add('vision:1');
  expect(visionOnWarp('overworld', 'peaks', flags)?.id).toBe('vision2');
  flags.add('vision:2');
  expect(visionOnWarp('peaks', 'overworld', flags)?.id).toBe('vision3');
});
