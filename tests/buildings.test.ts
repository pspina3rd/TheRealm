import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import { BUILDING_FOOTPRINTS } from '../src/world/buildings';
import { tileAt, warpAt, type MapDef } from '../src/world/map';
import { pathTo } from '../src/world/path';
import { step } from '../src/world/movement';
import { newGame, travel } from '../src/world/state';
import { OBJECTS } from '../src/ui/art/objects';
import { placeObject } from '../src/ui/art/themes';

describe('building ground plans', () => {
  it('blocks every decorated building body on every map, except authored entrances', () => {
    for (const map of Object.values(MAPS))
      for (const decor of map.decor ?? []) {
        const plan = BUILDING_FOOTPRINTS[decor.object];
        if (!plan) continue;
        for (let dy = 0; dy < plan.depth; dy++)
          for (let dx = plan.insetLeft ?? 0; dx < plan.width - (plan.insetRight ?? 0); dx++) {
            const x = decor.x + dx,
              y = decor.y - dy;
            if (!warpAt(map, x, y))
              expect(tileAt(map, x, y).walkable, `${map.id} ${decor.object} ${x},${y}`).toBe(false);
          }
      }
  });

  it('leaves the roof overhang walkable while blocking the four sides of its ground plan', () => {
    for (const [object, plan] of Object.entries(BUILDING_FOOTPRINTS)) {
      const map: MapDef = {
        id: 'test',
        name: 'test',
        theme: 'outdoor',
        tiles: Array.from({ length: 14 }, () => '.'.repeat(16)),
        warps: [],
        entities: [],
        decor: [{ object, x: 4, y: 8 }],
      };
      for (let x = 3; x <= 4 + plan.width; x++) {
        expect(tileAt(map, x, 8 - plan.depth).walkable).toBe(true);
        expect(tileAt(map, x, 9).walkable).toBe(true);
      }
      for (let y = 8 - plan.depth + 1; y <= 8; y++) {
        expect(tileAt(map, 3, y).walkable).toBe(true);
        expect(tileAt(map, 4 + plan.width, y).walkable).toBe(true);
      }
    }
  });

  it('agrees between tap paths and direct movement at the surface forge', () => {
    const state = newGame('ranger');
    travel(state, { map: 'overworld', x: 201, y: 195 });
    expect(pathTo(state, 201, 194)).toBeNull();
    expect(step(state, 'up').kind).toBe('blocked');
    expect(step(state, 'right').kind).toBe('moved');
    const warp = warpAt(MAPS.overworld!, 202, 194)!;
    if (warp.requiresFlag) state.flags.add(warp.requiresFlag);
    for (const flag of warp.requiresAnyFlag ?? []) state.flags.add(flag);
    const entrance = step(state, 'up');
    expect(entrance.kind).toBe('warp');
    if (entrance.kind === 'warp') expect(entrance.to.map).toBe('forge');
  });

  it('returns from facade entrances onto the street immediately below their doors', () => {
    for (const id of ['forge', 'cliffs'] as const) {
      const entrance = MAPS.overworld!.warps.find((warp) => warp.to.map === id)!;
      for (const exit of MAPS[id]!.warps.filter((warp) => warp.to.map === 'overworld')) {
        expect(exit.to).toEqual({ map: 'overworld', x: entrance.x, y: entrance.y + 1 });
        expect(tileAt(MAPS.overworld!, exit.to.x, exit.to.y).walkable).toBe(true);
      }
    }
  });

  it('keeps all three sleeping homes as reachable inspections, without interiors', () => {
    const state = newGame('ranger');
    for (const x of [5, 16, 26]) {
      travel(state, { map: 'mossvale', x, y: 7 });
      expect(pathTo(state, x, 6)).toEqual(['up']);
      const result = step(state, 'up');
      expect(result.kind).toBe('interact');
      if (result.kind === 'interact') expect(result.entity.kind).toBe('inspect');
      expect(warpAt(MAPS.mossvale!, x, 6)).toBeUndefined();
    }
  });

  it('centres the settlement gateway lane on the town entrance tile', () => {
    for (const art of [OBJECTS['settlement.red'], OBJECTS['settlement.blue']]) {
      const placed = placeObject(art, 10, 12, 1);
      const fenceWings = placed.details!.filter((detail) => detail.region.h === 64);
      expect(fenceWings.map((wing) => wing.px)).toEqual([9 * 32, 11 * 32]);
      // The central tile is a street between the wings, with homes on either side.
      expect(
        placed.details!.filter((detail) => detail.region.h === 38).map((door) => door.px),
      ).toEqual([10 * 32 - 48, 10 * 32 + 48]);
      expect(placed.baseParts).toHaveLength(5);
    }
  });
});
