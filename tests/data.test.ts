import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/data/balance';
import { ENEMIES } from '../src/data/enemies';
import { LEVEL_BAND } from '../src/game/scaling';
import { ITEMS } from '../src/data/items';
import { ELEMENTS } from '../src/core/elements';
import { MAPS, START } from '../src/data/maps';
import { MENTORS } from '../src/data/mentors';
import { NPCS } from '../src/data/npcs';
import { SHOPS } from '../src/data/shops';
import { SPELLS, STARTING_SPELLS } from '../src/data/spells';
import { DIRECTION_DELTAS, mapHeight, mapWidth, tileAt, warpAt } from '../src/world/map';
import { TILES } from '../src/world/tiles';
import { addItem, createHero } from '../src/game/hero';
import { makeBattle } from './helpers';

const allEntities = Object.values(MAPS).flatMap((m) => m.entities.map((e) => ({ map: m, e })));

/**
 * Flood-fills from the start through walkable tiles and warps (treating
 * locked warps as open, and monsters as passable since they can be beaten)
 * to find every tile the hero can stand on.
 */
function reachableTiles(): Set<string> {
  const seen = new Set<string>();
  const queue: [string, number, number][] = [[START.map, START.x, START.y]];
  // People (and mentors, wherever they may stand) block the way; monsters can be beaten.
  const blockers = new Set([
    ...allEntities
      .filter(({ e }) => e.kind === 'npc')
      .map(({ map, e }) => `${map.id}:${e.x},${e.y}`),
    ...Object.values(MENTORS).flatMap((m) => m.route.map((s) => `${s.map}:${s.x},${s.y}`)),
  ]);
  while (queue.length) {
    const [mapId, x, y] = queue.pop()!;
    const key = `${mapId}:${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const map = MAPS[mapId]!;
    const warp = warpAt(map, x, y);
    if (warp) queue.push([warp.to.map, warp.to.x, warp.to.y]);
    for (const [dx, dy] of Object.values(DIRECTION_DELTAS)) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= mapWidth(map) || ny >= mapHeight(map)) continue;
      if (!tileAt(map, nx, ny).walkable || blockers.has(`${mapId}:${nx},${ny}`)) continue;
      queue.push([mapId, nx, ny]);
    }
  }
  return seen;
}

const reachable = reachableTiles();

describe('maps', () => {
  for (const map of Object.values(MAPS)) {
    describe(map.id, () => {
      it('has rectangular rows of known tiles', () => {
        const width = mapWidth(map);
        for (const row of map.tiles) {
          expect(row).toHaveLength(width);
          for (const char of row) expect(TILES[char], `unknown tile "${char}"`).toBeDefined();
        }
      });

      it('has warps on walkable tiles leading to walkable, non-warp tiles', () => {
        for (const warp of map.warps) {
          expect(tileAt(map, warp.x, warp.y).walkable, `${warp.x},${warp.y}`).toBe(true);
          const dest = MAPS[warp.to.map];
          expect(dest, warp.to.map).toBeDefined();
          if (!dest) continue;
          expect(tileAt(dest, warp.to.x, warp.to.y).walkable).toBe(true);
          expect(warpAt(dest, warp.to.x, warp.to.y)).toBeUndefined();
          expect(dest.entities.some((e) => e.x === warp.to.x && e.y === warp.to.y)).toBe(false);
        }
      });

      it('places entities on walkable tiles away from warps', () => {
        for (const entity of map.entities) {
          expect(tileAt(map, entity.x, entity.y).walkable, entity.id).toBe(true);
          expect(warpAt(map, entity.x, entity.y), entity.id).toBeUndefined();
          if (entity.kind === 'npc') expect(NPCS[entity.npcId], entity.npcId).toBeDefined();
          else expect(ENEMIES[entity.enemyId], entity.enemyId).toBeDefined();
        }
      });
    });
  }

  it('uses unique entity ids across all maps', () => {
    const ids = allEntities.map(({ e }) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('starts on a walkable tile', () => {
    expect(tileAt(MAPS[START.map]!, START.x, START.y).walkable).toBe(true);
  });

  it('makes every map and entity reachable from the start', () => {
    const seen = reachable;
    const visitedMaps = new Set([...seen].map((k) => k.split(':')[0]));
    expect([...visitedMaps].sort()).toEqual(Object.keys(MAPS).sort());
    for (const { map, e } of allEntities) {
      const adjacent = Object.values(DIRECTION_DELTAS).some(([dx, dy]) =>
        seen.has(`${map.id}:${e.x + dx},${e.y + dy}`),
      );
      expect(adjacent || seen.has(`${map.id}:${e.x},${e.y}`), e.id).toBe(true);
    }
  });
});

describe('mentors', () => {
  const stops = Object.values(MENTORS).flatMap((m) => m.route.map((stop) => ({ m, stop })));

  it('has one mentor per element, each with a trial wisp of that element', () => {
    expect(new Set(Object.values(MENTORS).map((m) => m.element))).toEqual(new Set(ELEMENTS));
    for (const m of Object.values(MENTORS)) {
      expect(ENEMIES[m.trialFoe]?.element, m.id).toBe(m.element);
      expect(m.route[0].requiresFlag, m.id).toBeUndefined();
      expect(m.moveEvery).toBeGreaterThan(0);
      for (const stop of m.route) expect(stop.landmark.length, m.id).toBeGreaterThan(0);
    }
  });

  it('stops on walkable tiles, clear of warps, people, monsters and each other', () => {
    const seen = new Set<string>();
    for (const { m, stop } of stops) {
      const map = MAPS[stop.map];
      expect(map, stop.map).toBeDefined();
      if (!map) continue;
      const label = `${m.id} ${stop.map} ${stop.x},${stop.y}`;
      expect(tileAt(map, stop.x, stop.y).walkable, label).toBe(true);
      for (const [dx, dy] of [[0, 0], ...Object.values(DIRECTION_DELTAS)]) {
        expect(warpAt(map, stop.x + dx!, stop.y + dy!), label).toBeUndefined();
      }
      expect(
        map.entities.some((e) => e.x === stop.x && e.y === stop.y),
        label,
      ).toBe(false);
      const key = `${stop.map}:${stop.x},${stop.y}`;
      expect(seen.has(key), label).toBe(false);
      seen.add(key);
      if (stop.requiresFlag && !stop.requiresFlag.startsWith('defeated:')) {
        expect(['cavePass'], label).toContain(stop.requiresFlag);
      }
    }
  });

  it('can be reached at every stop', () => {
    for (const { m, stop } of stops) {
      const map = MAPS[stop.map]!;
      const adjacent = Object.values(DIRECTION_DELTAS).some(([dx, dy]) =>
        reachable.has(`${map.id}:${stop.x + dx},${stop.y + dy}`),
      );
      expect(adjacent, `${m.id} ${stop.map}`).toBe(true);
    }
  });
});

describe('content references', () => {
  it('uses ids that match their keys', () => {
    for (const table of [ENEMIES, ITEMS, NPCS, SHOPS, SPELLS, MAPS, MENTORS]) {
      for (const [key, value] of Object.entries(table)) expect(value.id).toBe(key);
    }
  });

  it('only references existing items and spells', () => {
    for (const spell of STARTING_SPELLS) expect(SPELLS[spell]).toBeDefined();
    for (const enemy of Object.values(ENEMIES)) {
      expect(enemy.moves.length).toBeGreaterThan(0);
      for (const drop of enemy.drops ?? []) expect(ITEMS[drop.itemId], drop.itemId).toBeDefined();
    }
    for (const shop of Object.values(SHOPS)) {
      for (const id of shop.stock) expect(ITEMS[id], id).toBeDefined();
    }
    for (const item of Object.values(ITEMS)) {
      if (item.use?.learnSpell) expect(SPELLS[item.use.learnSpell]).toBeDefined();
    }
    for (const spell of Object.values(SPELLS)) {
      for (const id of spell.requires ?? []) expect(SPELLS[id], id).toBeDefined();
    }
    for (const npc of Object.values(NPCS)) {
      for (const reward of npc.rewards) {
        if (reward.kind === 'item') expect(ITEMS[reward.itemId], reward.itemId).toBeDefined();
        if (reward.kind === 'spell') expect(SPELLS[reward.spellId], reward.spellId).toBeDefined();
        if (reward.kind === 'shop') expect(SHOPS[reward.shopId], reward.shopId).toBeDefined();
      }
      if (!npc.repeatable) expect(npc.lines.done, npc.id).toBeTruthy();
    }
  });

  it('makes every offered item obtainable from a monster drop', () => {
    const dropped = new Set(
      Object.values(ENEMIES).flatMap((e) => (e.drops ?? []).map((d) => d.itemId)),
    );
    for (const npc of Object.values(NPCS)) {
      if (npc.challenge.kind === 'offering')
        expect(dropped.has(npc.challenge.itemId), npc.id).toBe(true);
    }
  });

  it('asks barters for no more of a colour than full bags surely bring', () => {
    // Every bag of seven holds one piece (four crystals) of each colour.
    for (const npc of Object.values(NPCS)) {
      const spec = npc.challenge;
      if (spec.kind !== 'barter') continue;
      const sure = 4 * Math.floor(spec.pieceLimit / 7);
      for (const [color, wanted] of Object.entries(spec.wants)) {
        expect(wanted, `${npc.id} ${color}`).toBeLessThanOrEqual(sure);
      }
    }
  });
});

/** Known solutions for every NPC puzzle: `[rotations, leftmost column]` per piece. */
const PUZZLE_SOLUTIONS: Record<string, [number, number][]> = {
  elder: [
    [0, 3],
    [1, 1],
  ],
  kid: [
    [0, 6],
    [2, 3],
  ],
  sage: [
    [0, 7],
    [0, 4],
    [0, 3],
  ],
  sealedChest: [
    [0, 0],
    [1, 4],
  ],
  vesperRoad: [
    [0, 1],
    [0, 5],
  ],
  vesperPeaks: [
    [0, 2],
    [0, 1],
  ],
};

describe('puzzles', () => {
  const puzzles = Object.values(NPCS).filter((n) => n.challenge.kind === 'puzzle');

  it('has a recorded solution for every puzzle', () => {
    expect(puzzles.map((p) => p.id).sort()).toEqual(Object.keys(PUZZLE_SOLUTIONS).sort());
  });

  for (const npc of puzzles) {
    it(`${npc.id} is solvable with normal input`, () => {
      const battle = makeBattle(npc.challenge);
      for (const [turns, x] of PUZZLE_SOLUTIONS[npc.id] ?? []) {
        for (let i = 0; i < turns; i++) battle.input('rotate');
        const piece = battle.board.active!;
        const target = x - Math.min(...piece.cells.map(([cx]) => cx));
        while (piece.x > target) battle.input('left');
        while (piece.x < target) battle.input('right');
        battle.input('hardDrop');
      }
      expect(battle.status).toBe('won');
    });
  }
});

describe('the board is never optional', () => {
  it('no offering can be won by hard-dropping every piece without aiming', () => {
    for (const npc of Object.values(NPCS)) {
      const spec = npc.challenge;
      if (spec?.kind !== 'offering') continue;
      const hero = createHero();
      addItem(hero, spec.itemId);
      const battle = makeBattle(spec, hero);
      for (let i = 0; i < 500 && battle.status === 'ongoing'; i++) battle.input('hardDrop');
      expect(battle.status, npc.id).not.toBe('won');
    }
  });
});

/** Maps the hero can walk to holding `flags` (locked warps stay shut). */
function openMaps(flags: ReadonlySet<string>): Set<string> {
  const seen = new Set<string>([START.map]);
  const queue: string[] = [START.map];
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    for (const warp of MAPS[id]!.warps) {
      if (warp.requiresFlag && !flags.has(warp.requiresFlag)) continue;
      if (!seen.has(warp.to.map)) {
        seen.add(warp.to.map);
        queue.push(warp.to.map);
      }
    }
  }
  return seen;
}

/** Story flags the NPCs on `maps` can grant. */
function flagsOn(maps: ReadonlySet<string>): string[] {
  return [...maps].flatMap((id) =>
    MAPS[id]!.entities.flatMap((e) =>
      e.kind === 'npc'
        ? (NPCS[e.npcId]?.rewards ?? []).flatMap((r) => (r.kind === 'flag' ? [r.flag] : []))
        : [],
    ),
  );
}

describe('the world and its regions', () => {
  it('leads every warp back the way it came', () => {
    for (const map of Object.values(MAPS)) {
      for (const warp of map.warps) {
        if (warp.to.map === map.id) continue; // the Sunken Ruins' sealed door
        const back = MAPS[warp.to.map]!.warps.some((w) => w.to.map === map.id);
        expect(back, `${map.id} → ${warp.to.map}`).toBe(true);
      }
    }
  });

  it('opens every map in order, each gate’s flag earned before it is needed', () => {
    const flags = new Set<string>();
    const order: string[][] = [];
    for (;;) {
      const open = openMaps(flags);
      order.push([...open].filter((id) => !order.flat().includes(id)));
      const fresh = flagsOn(open).filter((f) => !flags.has(f));
      if (fresh.length === 0) break;
      for (const f of fresh) flags.add(f);
    }
    expect(order.flat().sort()).toEqual(Object.keys(MAPS).sort());
    expect(order[0]).toEqual(
      expect.arrayContaining(['mossvale', 'overworld', 'brightwater', 'grove', 'lake', 'quarry']),
    );
    const step = (id: string) => order.findIndex((maps) => maps.includes(id));
    expect(step('forge')).toBeGreaterThan(0);
    expect(step('peaks')).toBeGreaterThan(step('forge'));
    expect(step('cliffs')).toBe(step('peaks'));
    expect(step('ruins')).toBe(step('peaks'));
    expect(step('caves1')).toBeGreaterThan(0);
  });

  it('gives each region a level band its monsters keep to, rising along the road', () => {
    const regions = Object.entries(REGIONS);
    for (const [id, region] of regions) {
      expect(MAPS[id], id).toBeDefined();
      const [low, high] = region.monsterLevels;
      for (const e of MAPS[id]!.entities) {
        if (e.kind !== 'monster') continue;
        const enemy = ENEMIES[e.enemyId]!;
        expect(enemy.level, e.id).toBeGreaterThanOrEqual(low);
        expect(enemy.level, e.id).toBeLessThanOrEqual(high);
        if (!enemy.boss) expect(enemy.band ?? LEVEL_BAND, e.id).toBe(region.band);
      }
    }
    const entries = regions.map(([, r]) => r.entryLevel);
    expect(entries).toEqual([...entries].sort((a, b) => a - b));
  });

  it('gives every mentor a home region of their own and a stop a new hero can reach', () => {
    const start = openMaps(new Set());
    const homes = Object.values(MENTORS).map((m) => m.route[0].map);
    expect(new Set(homes).size).toBe(homes.length);
    for (const m of Object.values(MENTORS)) {
      expect(REGIONS, m.id).toHaveProperty(m.route[0].map);
      expect(
        m.route.some((stop) => !stop.requiresFlag && start.has(stop.map)),
        m.id,
      ).toBe(true);
      // The trial foe stays the mentor's own wisp; the region's monsters share their element.
      const own = MAPS[m.route[0].map]!.entities.filter(
        (e) => e.kind === 'monster' && ENEMIES[e.enemyId]!.element === m.element,
      );
      expect(own.length, m.id).toBeGreaterThan(0);
    }
  });

  it('gives every region a person with a need', () => {
    for (const id of ['grove', 'lake', 'quarry', 'forge', 'peaks', 'cliffs', 'ruins']) {
      // A person (not a chest) with a challenge that pays a reward.
      const needs = MAPS[id]!.entities.filter((e) => {
        if (e.kind !== 'npc') return false;
        const npc = NPCS[e.npcId]!;
        return !npc.inanimate && Boolean(npc.challenge?.kind) && npc.rewards.length > 0;
      });
      expect(needs.length, id).toBeGreaterThan(0);
    }
  });
});
