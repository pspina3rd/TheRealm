import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/data/enemies';
import { ITEMS } from '../src/data/items';
import { MAPS, START } from '../src/data/maps';
import { NPCS } from '../src/data/npcs';
import { SHOPS } from '../src/data/shops';
import { SPELLS, STARTING_SPELLS } from '../src/data/spells';
import { DIRECTION_DELTAS, mapHeight, mapWidth, tileAt, warpAt } from '../src/world/map';
import { TILES } from '../src/world/tiles';
import { makeBattle } from './helpers';

const allEntities = Object.values(MAPS).flatMap((m) => m.entities.map((e) => ({ map: m, e })));

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

  /**
   * Flood-fills from the start through walkable tiles and warps (treating
   * locked warps as open, and monsters as passable since they can be beaten)
   * to prove every map and every NPC can be reached.
   */
  it('makes every map and entity reachable from the start', () => {
    const seen = new Set<string>();
    const queue: [string, number, number][] = [[START.map, START.x, START.y]];
    const blockers = new Set(
      allEntities
        .filter(({ e }) => e.kind === 'npc')
        .map(({ map, e }) => `${map.id}:${e.x},${e.y}`),
    );
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

describe('content references', () => {
  it('uses ids that match their keys', () => {
    for (const table of [ENEMIES, ITEMS, NPCS, SHOPS, SPELLS, MAPS]) {
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
    for (const npc of Object.values(NPCS)) {
      for (const reward of npc.rewards) {
        if (reward.kind === 'item') expect(ITEMS[reward.itemId], reward.itemId).toBeDefined();
        if (reward.kind === 'spell') expect(SPELLS[reward.spellId], reward.spellId).toBeDefined();
        if (reward.kind === 'shop') expect(SHOPS[reward.shopId], reward.shopId).toBeDefined();
      }
      if (!npc.repeatable) expect(npc.doneText, npc.id).toBeTruthy();
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

  it('asks barters for no more crystals than the pieces can supply', () => {
    for (const npc of Object.values(NPCS)) {
      if (npc.challenge.kind !== 'barter') continue;
      const wanted = Object.values(npc.challenge.wants).reduce((a, b) => a + (b ?? 0), 0);
      expect(wanted, npc.id).toBeLessThanOrEqual(npc.challenge.pieceLimit * 4);
    }
  });
});

/** Known solutions for every NPC puzzle: `[rotations, leftmost column]` per piece. */
const PUZZLE_SOLUTIONS: Record<string, [number, number][]> = {
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
