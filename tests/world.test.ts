import { describe, expect, it } from 'vitest';
import { MAPS, START } from '../src/data/maps';
import type { MapDef } from '../src/world/map';
import { mapHeight, mapWidth, tileAt, warpAt } from '../src/world/map';
import { step } from '../src/world/movement';
import {
  activeEntities,
  currentMap,
  defeatedFlag,
  markDefeated,
  newGame,
  travel,
} from '../src/world/state';
import { VOID_TILE, tileFor } from '../src/world/tiles';

describe('map helpers', () => {
  const map = MAPS.mossvale!;

  it('reports size and tiles, with void outside the map', () => {
    expect(mapWidth(map)).toBe(20);
    expect(mapHeight(map)).toBe(15);
    expect(tileAt(map, 0, 0).name).toBe('tree');
    expect(tileAt(map, -1, 0)).toBe(VOID_TILE);
    expect(tileFor('?')).toBe(VOID_TILE);
  });

  it('handles an empty map', () => {
    const empty: MapDef = {
      id: 'e',
      name: 'e',
      theme: 'outdoor',
      tiles: [],
      warps: [],
      entities: [],
    };
    expect(mapWidth(empty)).toBe(0);
  });

  it('finds warps by position', () => {
    expect(warpAt(map, 9, 14)?.to.map).toBe('overworld');
    expect(warpAt(map, 1, 1)).toBeUndefined();
  });
});

describe('game state', () => {
  it('starts a new game at the start location', () => {
    const state = newGame('mage', 'Ren');
    expect(state.hero.name).toBe('Ren');
    expect(state.hero.classId).toBe('mage');
    expect([state.mapId, state.x, state.y]).toEqual([START.map, START.x, START.y]);
    expect(currentMap(state).id).toBe(START.map);
  });

  it('throws for unknown maps', () => {
    const state = newGame();
    state.mapId = 'nowhere';
    expect(() => currentMap(state)).toThrow();
    expect(() => travel(newGame(), { map: 'nowhere', x: 0, y: 0 })).toThrow();
  });

  it('hides defeated monsters until the hero leaves the map', () => {
    const state = newGame();
    travel(state, { map: 'overworld', x: 5, y: 6 });
    const slime = activeEntities(state).find((e) => e.id === 'ow-slime-1')!;
    markDefeated(state, slime);
    expect(activeEntities(state).some((e) => e.id === 'ow-slime-1')).toBe(false);
    travel(state, { map: 'overworld', x: 6, y: 6 });
    expect(activeEntities(state).some((e) => e.id === 'ow-slime-1')).toBe(false);
    travel(state, { map: 'mossvale', x: 9, y: 13 });
    travel(state, { map: 'overworld', x: 5, y: 6 });
    expect(activeEntities(state).some((e) => e.id === 'ow-slime-1')).toBe(true);
  });

  it('keeps bosses defeated permanently', () => {
    const state = newGame();
    travel(state, { map: 'caves2', x: 8, y: 9 });
    const wyrm = activeEntities(state).find((e) => e.id === 'c2-wyrm')!;
    markDefeated(state, wyrm);
    expect(state.flags.has(defeatedFlag('c2-wyrm'))).toBe(true);
    travel(state, { map: 'caves1', x: 20, y: 13 });
    travel(state, { map: 'caves2', x: 8, y: 9 });
    expect(activeEntities(state).some((e) => e.id === 'c2-wyrm')).toBe(false);
  });

  it('ignores NPCs when marking defeats', () => {
    const state = newGame();
    const elder = activeEntities(state).find((e) => e.kind === 'npc')!;
    markDefeated(state, elder);
    expect(state.cleared.size).toBe(0);
  });
});

describe('step', () => {
  it('moves onto walkable tiles and records facing', () => {
    const state = newGame();
    expect(step(state, 'left')).toEqual({ kind: 'moved' });
    expect([state.x, state.y, state.facing]).toEqual([START.x - 1, START.y, 'left']);
  });

  it('is blocked by solid tiles', () => {
    const state = newGame();
    state.x = 1;
    state.y = 1;
    expect(step(state, 'up')).toEqual({ kind: 'blocked' });
    expect([state.x, state.y]).toEqual([1, 1]);
  });

  it('returns an interaction when bumping an entity, without moving', () => {
    const state = newGame();
    state.x = 6;
    state.y = 7; // just below Elder Rowan
    const result = step(state, 'up');
    expect(result.kind).toBe('interact');
    expect(result.kind === 'interact' && result.entity.id).toBe('mv-elder');
    expect(state.y).toBe(7);
  });

  it('returns a warp without moving', () => {
    const state = newGame();
    state.x = 9;
    state.y = 13;
    expect(step(state, 'down')).toEqual({ kind: 'warp', to: { map: 'overworld', x: 5, y: 6 } });
    expect(state.mapId).toBe('mossvale');
  });

  it('blocks locked warps until the flag is set', () => {
    const state = newGame();
    travel(state, { map: 'overworld', x: 34, y: 4 });
    const locked = step(state, 'up');
    expect(locked.kind).toBe('locked');
    state.flags.add('peakGate');
    expect(step(state, 'up').kind).toBe('warp');
  });

  it('uses a default message for locked warps without text', () => {
    const state = newGame();
    const original = MAPS.mossvale!;
    const patched: MapDef = {
      ...original,
      warps: [{ x: START.x - 1, y: START.y, to: START, requiresFlag: 'never' }],
    };
    (MAPS as Record<string, MapDef>).mossvale = patched;
    try {
      expect(step(state, 'left')).toEqual({ kind: 'locked', text: 'The way is sealed.' });
    } finally {
      (MAPS as Record<string, MapDef>).mossvale = original;
    }
  });
});
