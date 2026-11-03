import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import { ENEMIES } from '../src/data/enemies';
import { HOMETOWNS } from '../src/data/hometowns';
import { SURFACE_CENTER, SURFACE_ROADS, STONE_APPROACH } from '../src/data/surfaceLayout';
import { tileAt, warpAt } from '../src/world/map';
import { activeEntities, currentMap, markDefeated, newGame, travel } from '../src/world/state';
import { travelDestinations, travelGuide } from '../src/game/travelGuide';
import { gainXp } from '../src/game/hero';
import { step } from '../src/world/movement';

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function huntingGround(x: number, y: number) {
  const map = MAPS.overworld!,
    size = 256;
  const monsters = map.entities.filter((e) => e.kind === 'monster');
  const occupied = new Set(map.entities.map((e) => e.y * size + e.x));
  const d = new Int32Array(size * size).fill(-1),
    queue = [y * size + x];
  d[queue[0]!] = 0;
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i]!,
      px = at % size,
      py = Math.floor(at / size);
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const nx = px + dx!,
        ny = py + dy!,
        key = ny * size + nx;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= size ||
        ny >= size ||
        d[key] !== -1 ||
        occupied.has(key) ||
        warpAt(map, nx, ny) ||
        !tileAt(map, nx, ny).walkable
      )
        continue;
      d[key] = d[at]! + 1;
      queue.push(key);
    }
  }
  return monsters.map((e) => ({
    ...e,
    steps: Math.min(
      ...[
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].map(([dx, dy]) => {
        const n = d[(e.y + dy!) * size + e.x + dx!];
        return n !== undefined && n >= 0 ? n + 1 : Infinity;
      }),
    ),
  }));
}

describe('encounters on the expanded travel routes', () => {
  for (const home of HOMETOWNS)
    it(`${home.name} has a visible, reachable zero-spell hunting circuit`, () => {
      const foes = huntingGround(home.returnTo.x, home.returnTo.y);
      const starter = foes
        .filter((e) => e.enemyId === 'slime' && e.steps <= 65)
        .sort((a, b) => a.steps - b.steps);
      expect(starter.length).toBeGreaterThanOrEqual(4);
      expect(starter[0]!.steps).toBeLessThanOrEqual(12);
      const hero = newGame(home.classId).hero;
      for (const e of starter.slice(0, 4)) gainXp(hero, ENEMIES[e.enemyId]!.xp);
      expect(hero.level).toBeGreaterThanOrEqual(2);
      expect(hero.spells).toEqual({});
      expect(
        foes.some((e) => ENEMIES[e.enemyId]!.level >= 4 && distance(e, home.returnTo) < 32),
      ).toBe(false);
    });
  it('gives the actual sanctuary path enough accessible fights to earn a first level', () => {
    const starter = huntingGround(STONE_APPROACH.x, STONE_APPROACH.y + 1).filter(
      (e) => e.enemyId === 'slime' && e.steps < 65,
    );
    expect(starter.length).toBeGreaterThanOrEqual(4);
    expect(Math.min(...starter.map((e) => e.steps))).toBeLessThanOrEqual(12);
  });
  it('keeps fights visible near travelled roads, without requiring a battle to cross them', () => {
    const map = MAPS.overworld!,
      foes = map.entities.filter((e) => e.kind === 'monster');
    expect(foes.length).toBeGreaterThanOrEqual(70);
    const samples: { x: number; y: number }[] = [];
    for (const road of SURFACE_ROADS)
      for (let i = 1; i < road.length; i++) {
        const a = road[i - 1]!,
          b = road[i]!,
          length = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
        for (let n = 0; n <= length; n += 4) {
          const p = {
            x: Math.round(a[0] + ((b[0] - a[0]) * n) / length),
            y: Math.round(a[1] + ((b[1] - a[1]) * n) / length),
          };
          if (tileAt(map, p.x, p.y).walkable && !warpAt(map, p.x, p.y)) samples.push(p);
        }
      }
    const covered = samples.filter((p) => foes.some((e) => distance(e, p) <= 22));
    expect(covered.length / samples.length).toBeGreaterThanOrEqual(0.9);
    for (const e of foes) expect(tileAt(map, e.x, e.y).walkable, e.id).toBe(true);
    expect(new Set(map.entities.map((e) => `${e.x},${e.y}`)).size).toBe(map.entities.length);
  });
  it('places every roadside and sanctuary fight in a physically reachable hunting ground', () => {
    const outside = huntingGround(76, 77);
    const inside = huntingGround(STONE_APPROACH.x, STONE_APPROACH.y + 1);
    const reachable = new Set(
      [...outside, ...inside].filter((e) => Number.isFinite(e.steps)).map((e) => e.id),
    );
    for (const foe of MAPS.overworld!.entities.filter((e) => e.kind === 'monster'))
      expect(reachable.has(foe.id), foe.id).toBe(true);
  });
  it('returns ordinary hunts after town visits without resetting learned spells or XP', () => {
    const state = newGame();
    travel(state, { map: 'overworld', x: 76, y: 77 });
    const foe = activeEntities(state).find((e) => e.id.startsWith('surface:home:mossvale:'))!;
    markDefeated(state, foe);
    gainXp(state.hero, 11);
    expect(activeEntities(state).some((e) => e.id === foe.id)).toBe(false);
    travel(state, { map: 'mossvale', x: 17, y: 24 });
    travel(state, { map: 'overworld', x: 76, y: 77 });
    expect(activeEntities(state).some((e) => e.id === foe.id)).toBe(true);
    expect(state.hero.xp).toBe(11);
    expect(state.hero.spells).toEqual({});
  });
});

describe('mentor travel guidance', () => {
  for (const [map, exit] of [
    ['caves1', 'ruins'],
    ['caves2', 'caves1'],
  ])
    it(`takes the actual ${map} crossing toward ${exit}`, () => {
      const state = newGame();
      const warp = MAPS[map!]!.warps.find((w) => w.to.map === exit)!;
      const start = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ]
        .map(([dx, dy]) => ({ map: map!, x: warp.x + dx!, y: warp.y + dy! }))
        .find((p) => tileAt(MAPS[map!]!, p.x, p.y).walkable && !warpAt(MAPS[map!]!, p.x, p.y))!;
      travel(state, start);
      const guide = travelGuide(state, 'grove')!;
      expect(guide.next).toEqual({ map, x: warp.x, y: warp.y });
      expect(guide.path?.length).toBeGreaterThan(0);
      expect(state.flags.size).toBe(0);
    });
  it('shows the available schools and actual remaining road requirements', () => {
    const state = newGame();
    const destinations = travelDestinations(state);
    expect(destinations.find((d) => d.id === 'grove')?.label).toContain('Nature — Hazel');
    expect(destinations.find((d) => d.id === 'lake')?.locked).toBeNull();
    expect(destinations.find((d) => d.id === 'forge')?.locked).toContain('Flint');
    expect(state.flags.size).toBe(0);
  });
  it('routes out of the sanctuary through Mossvale instead of toward the mountain wall', () => {
    const state = newGame();
    travel(state, { map: 'overworld', ...SURFACE_CENTER });
    const guide = travelGuide(state, 'grove')!;
    expect(guide.text).toContain('south gate');
    expect(guide.next).toEqual({ map: 'overworld', ...STONE_APPROACH });
    expect(guide.path?.length).toBeGreaterThan(0);
    let last;
    for (const direction of guide.path!) last = step(state, direction);
    expect(last).toMatchObject({ kind: 'warp', to: { map: 'mossvale', x: 20, y: 1 } });
  });
  it('uses Mossvale’s south gate for other regions, keeping the north path for the stones', () => {
    const state = newGame();
    expect(travelGuide(state, 'lake')!.next?.y).toBe(currentMap(state).tiles.length - 1);
    expect(travelGuide(state, 'stones')!.next?.y).toBe(0);
    expect(state.hero.spells).toEqual({});
  });
});
