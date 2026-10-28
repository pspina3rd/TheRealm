import { describe, expect, it } from 'vitest';
import { ENCOUNTER_DEFS } from '../src/data/encounters';
import { MAPS } from '../src/data/maps';
import { newRecord } from '../src/game/stakes';
import { deserialize, serialize } from '../src/game/save';
import { learnSpell } from '../src/game/hero';
import { encounterProps, groveStone } from '../src/ui/worldFeedback';
import { newGame } from '../src/world/state';
import { mapHeight, mapWidth, tileAt } from '../src/world/map';

const mossvale = MAPS.mossvale!;

describe('saved encounter changes on the map', () => {
  it('keeps untouched and merely started encounters visually unchanged', () => {
    const state = newGame();
    expect(encounterProps(state, mossvale)).toEqual([]);
    state.encounters.elder = { ...newRecord(), tries: 1, playedDay: 0 };
    expect(encounterProps(state, mossvale)).toEqual([]);
  });

  it('shows each M1 outcome next to its own NPC, only on that NPC’s map', () => {
    const state = newGame();
    const seen = new Set<string>();
    for (const [id, def] of Object.entries(ENCOUNTER_DEFS)) {
      const map = Object.values(MAPS).find((candidate) =>
        candidate.entities.some((entity) => entity.kind === 'npc' && entity.npcId === id),
      )!;
      state.encounters[id] = { ...newRecord(), tries: 1, fails: 1 };
      const failure = encounterProps(state, map).find((prop) => prop.id === id)!;
      expect(failure).toMatchObject({ ...def.world.fail, won: false, skin: def.skin });
      expect(failure.x).toBeGreaterThanOrEqual(0);
      expect(failure.x).toBeLessThan(mapWidth(map));
      expect(failure.y).toBeGreaterThanOrEqual(0);
      expect(failure.y).toBeLessThan(mapHeight(map));
      expect(tileAt(map, failure.x, failure.y).walkable).toBe(true);
      state.encounters[id] = { ...newRecord(), tries: 2, wins: 1 };
      expect(encounterProps(state, map).find((prop) => prop.id === id)).toMatchObject({
        ...def.world.win,
        won: true,
      });
      expect(encounterProps(state, MAPS.caves1!)).toEqual([]);
      seen.add(id);
    }
    expect(seen.size).toBe(6);
  });

  it('retains the latest failure after a previous win, and restores the prop after a new win', () => {
    const state = newGame();
    state.encounters.farmer = { ...newRecord(), tries: 2, wins: 1, fails: 1 };
    const loaded = deserialize(serialize(state))!;
    expect(encounterProps(loaded, mossvale)).toMatchObject([
      { id: 'farmer', text: 'Grey beds', won: false },
    ]);
    loaded.encounters.farmer!.fails = 0;
    loaded.encounters.farmer!.wins++;
    expect(encounterProps(loaded, mossvale)).toMatchObject([
      { id: 'farmer', text: 'Green beds, and a herb rack', won: true },
    ]);
  });

  it('recognizes legacy completion flags without overriding newer failed attempts', () => {
    const state = newGame();
    state.flags.add('npc:elder');
    state.flags.add('cavePass');
    expect(encounterProps(state, mossvale)).toMatchObject([{ id: 'elder', won: true }]);
    expect(encounterProps(state, MAPS.brightwater!)).toMatchObject([{ id: 'guard', won: true }]);
    state.encounters.elder = { ...newRecord(), fails: 1 };
    expect(encounterProps(state, mossvale)).toMatchObject([{ id: 'elder', won: false }]);
  });
});

describe('the grove’s Sevenstones feedback', () => {
  it('brightens with earned grove progress, survives reload, and creates no gate', () => {
    const state = newGame();
    state.mapId = 'overworld';
    const flags = [...state.flags];
    expect(groveStone(state, state.mapId)?.light).toBe(0);
    state.encounters.forager = { ...newRecord(), wins: 1 };
    expect(groveStone(state, state.mapId)?.light).toBe(1);
    state.encounters['lesson:hazel:regen'] = { ...newRecord(), wins: 1 };
    const loaded = deserialize(serialize(state))!;
    expect(groveStone(loaded, state.mapId)).toMatchObject({ light: 2, x: 2, y: 15 });
    expect([...state.flags]).toEqual(flags);
    expect(groveStone(state, 'grove')).toBeNull();
    state.encounters.forager!.fails = 1;
    expect(groveStone(state, state.mapId)?.light).toBe(2);
  });

  it('uses an already learned nature spell as teaching evidence for older saves', () => {
    const state = newGame();
    learnSpell(state.hero, 'regen');
    expect(groveStone(state, 'overworld')?.light).toBe(1);
    state.encounters.forager = { ...newRecord(), wins: 1 };
    expect(groveStone(state, 'overworld')?.light).toBe(2);
    const stone = groveStone(state, 'overworld')!;
    expect(tileAt(MAPS.overworld!, stone.x, stone.y).walkable).toBe(true);
    expect(MAPS.overworld!.warps.some((warp) => warp.x === stone.x && warp.y === stone.y)).toBe(
      false,
    );
  });
});
