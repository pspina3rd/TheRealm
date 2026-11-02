import { describe, expect, it } from 'vitest';
import { HOMETOWNS } from '../src/data/hometowns';
import { MAPS } from '../src/data/maps';
import { deserialize, serialize } from '../src/game/save';
import { tileAt } from '../src/world/map';
import { step } from '../src/world/movement';
import { pathTo } from '../src/world/path';
import { currentMap, newGame, travel } from '../src/world/state';
import { tileFor } from '../src/world/tiles';

describe('independent settlement regression review', () => {
  for (const home of HOMETOWNS)
    it(`${home.name}: reaches every sleeping home's door from the actual starting point`, () => {
      const state = newGame(home.classId);
      const doors = currentMap(state).entities.filter(
        (entity) => entity.kind === 'inspect' && entity.id.includes('-door'),
      );
      expect(doors).toHaveLength(3);
      for (const door of doors) {
        travel(state, home.start);
        const path = pathTo(state, door.x, door.y);
        expect(path, door.id).not.toBeNull();
        expect(path!.length).toBeGreaterThan(0);
        for (const direction of path!.slice(0, -1))
          expect(step(state, direction).kind, door.id).toBe('moved');
        const before = [state.x, state.y];
        const result = step(state, path!.at(-1)!);
        expect(result.kind, door.id).toBe('interact');
        if (result.kind === 'interact') expect(result.entity.id).toBe(door.id);
        expect([state.x, state.y]).toEqual(before);
      }
    });

  it('repairs a legacy position inside newly solid forge walls without losing the adventure', () => {
    const state = newGame('ranger');
    const inn = { ...state.respawn };
    state.flags.add('review:earned-progress');
    state.flags.add('npc:elder');
    state.hero.gil = 129;
    state.hero.items.herb = 3;
    state.day = 8;
    state.victories = 4;
    travel(state, { map: 'overworld', x: 201, y: 194 });
    const map = MAPS.overworld!;
    expect(tileFor(map.tiles[194]?.[201]).walkable).toBe(true);
    expect(tileAt(map, 201, 194).walkable).toBe(false);
    const loaded = deserialize(serialize(state));
    expect(loaded).not.toBeNull();
    expect([loaded!.mapId, loaded!.x, loaded!.y]).toEqual([inn.map, inn.x, inn.y]);
    expect(loaded!.flags).toEqual(state.flags);
    expect(loaded!.hero).toEqual(state.hero);
    expect([loaded!.day, loaded!.victories]).toEqual([8, 4]);
    expect(tileAt(currentMap(loaded!), loaded!.x, loaded!.y).walkable).toBe(true);
  });
});
