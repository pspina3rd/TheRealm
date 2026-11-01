import { step } from '../src/world/movement';
import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import { MENTORS } from '../src/data/mentors';
import { NPCS } from '../src/data/npcs';
import { REFUSAL } from '../src/data/story';
import { describeInteraction } from '../src/game/encounter';
import { itemCount, learnSpell } from '../src/game/hero';
import { openingLead } from '../src/game/opening';
import { deserialize, serialize } from '../src/game/save';
import { arrive, dueScenes, finishScene, vesperEntities } from '../src/game/story';
import { tileAt } from '../src/world/map';
import { mentorPlace } from '../src/world/mentors';
import { newGame, travel } from '../src/world/state';

const houses = MAPS.mossvale!.entities.filter((entity) => entity.kind === 'inspect');

describe('a playable opening', () => {
  it('leaving the village alone grants neither the Focus Stone nor an immediate antagonist', () => {
    const state = newGame();
    state.flags.add('scene:opening');
    travel(state, { map: 'overworld', x: 5, y: 6 });
    expect(arrive(state, 'mossvale')).toBeNull();
    expect(dueScenes(state.flags, state.mapId)).not.toContain(REFUSAL);
    expect(itemCount(state.hero, 'wellStone')).toBe(0);
    expect(vesperEntities(state)).toEqual([]);
    expect(state.hero.spells).toEqual({});
  });

  it('lets the player investigate sleeping neighbors and retain the discovery on reload', () => {
    const state = newGame();
    expect(houses).toHaveLength(3);
    expect(openingLead(state)).toBe('Check a shuttered house.');
    const result = describeInteraction(state, houses[0]!);
    expect(result.kind).toBe('message');
    expect(result.sprite).toBe('');
    expect(state.flags.has('opening:houseVisited')).toBe(true);
    expect(state.flags.has(houses[0]!.flag)).toBe(true);
    expect(openingLead(state)).toBe('Ask Rowan about the violet water.');
    expect(deserialize(serialize(state))!.flags.has(houses[0]!.flag)).toBe(true);
  });

  it('earns Rowan’s departure scene through investigation and the well, in either order', () => {
    for (const houseFirst of [true, false]) {
      const state = newGame();
      state.flags.add('scene:opening');
      if (houseFirst) describeInteraction(state, houses[0]!);
      else state.flags.add('npc:elder');
      expect(dueScenes(state.flags, 'mossvale')).not.toContain(REFUSAL);
      if (houseFirst) state.flags.add('npc:elder');
      else describeInteraction(state, houses[0]!);
      expect(dueScenes(state.flags, 'mossvale')).toContain(REFUSAL);
      expect(dueScenes(state.flags, 'overworld')).not.toContain(REFUSAL);
      expect(finishScene(state, REFUSAL)).toEqual(['wellStone']);
      expect(finishScene(state, REFUSAL)).toEqual([]);
    }
  });

  it('keeps Rowan’s Quake lesson as a chosen reward and preserves a different first school', () => {
    const state = newGame();
    expect(NPCS.elder!.essential).toBe(true);
    expect(NPCS.elder!.rewards).toContainEqual({
      kind: 'spell',
      spellId: 'quake',
      instead: { kind: 'gil', amount: 40 },
    });
    learnSpell(state.hero, 'fire');
    expect(mentorPlace(MENTORS.hazel!, state)).toBe(MENTORS.hazel!.route[0]);
    // Simply entering or inspecting the village never teaches another spell.
    describeInteraction(state, houses[0]!);
    expect(Object.keys(state.hero.spells)).toEqual(['fire']);
  });

  it('lets a player who chose other schools first return to Rowan and accept his well challenge', () => {
    const state = newGame();
    for (const id of ['blizzard', 'cure']) {
      learnSpell(state.hero, id);
      state.hero.spells[id] = { ...state.hero.spells[id]!, level: 4 };
    }
    state.hero.stats.charm = 0;
    const elder = MAPS.mossvale!.entities.find(
      (entity) => entity.kind === 'npc' && entity.npcId === 'elder',
    )!;
    const offer = describeInteraction(state, elder);
    expect(offer.kind).toBe('challenge');
    if (offer.kind === 'challenge') {
      expect(offer.canAccept).not.toBe(false);
      expect(offer.spec).toMatchObject({ kind: 'encounter', id: 'elder' });
    }
  });

  it('preserves a historical journey on migration without granting rewards or inventing visited places', () => {
    const original = newGame();
    travel(original, { map: 'quarry', x: 16, y: 1 });
    original.flags.add('vision:1');
    original.flags.add('vision:2');
    const raw = JSON.parse(serialize(original));
    raw.version = 14;
    const loaded = deserialize(JSON.stringify(raw))!;
    expect(loaded.flags.has('opening:legacyJourney')).toBe(true);
    expect(loaded.flags.has('got:wellStone')).toBe(false);
    expect(loaded.flags.has('reached:brightwater')).toBe(false);
    expect(loaded.hero.items).toEqual(original.hero.items);
    expect(loaded.hero.spells).toEqual(original.hero.spells);
    expect(vesperEntities(loaded)).toContainEqual(
      expect.objectContaining({ npcId: 'vesperRidge' }),
    );
    expect(deserialize(serialize(loaded))).toEqual(loaded);
    const fresh = deserialize(serialize(original))!;
    expect(fresh.flags.has('opening:legacyJourney')).toBe(false);
    expect(vesperEntities(fresh)).toEqual([]);
  });

  it('keeps Vesper away from the first exit even after the call to adventure', () => {
    const state = newGame();
    state.flags.add('scene:refusal');
    state.flags.add('got:wellStone');
    travel(state, { map: 'overworld', x: 5, y: 6 });
    expect(arrive(state, 'mossvale')?.id).toBe('vision1');
    expect(vesperEntities(state)).toEqual([]);
    state.flags.add('vision:2');
    travel(state, { map: 'quarry', x: 16, y: 1 });
    expect(vesperEntities(state)).toEqual([]); // No alternate-route early encounter.
    state.flags.delete('vision:2');
    travel(state, { map: 'overworld', x: 5, y: 6 });
    state.flags.add('reached:brightwater');
    expect(vesperEntities(state)).toContainEqual(
      expect.objectContaining({ npcId: 'vesperRoad', x: 29, y: 17 }),
    );
  });

  it('allows regional exploration first but requires the earned call before the Moon Caves', () => {
    const map = MAPS.ruins!,
      warp = map.warps.find((warp) => warp.to.map === 'caves1')!;
    const candidates = [
      [0, 1, 'up'],
      [0, -1, 'down'],
      [1, 0, 'left'],
      [-1, 0, 'right'],
    ] as const;
    const [dx, dy, direction] = candidates.find(
      ([dx, dy]) => tileAt(map, warp.x + dx, warp.y + dy).walkable,
    )!;
    for (const flag of ['scene:refusal', 'opening:legacyJourney']) {
      const state = newGame();
      state.flags.add('cavePass');
      travel(state, { map: 'ruins', x: warp.x + dx, y: warp.y + dy });
      expect(step(state, direction)).toEqual({ kind: 'locked', text: warp.missingAnyText });
      state.flags.add(flag);
      expect(step(state, direction)).toEqual({ kind: 'warp', to: warp.to });
    }
  });

  it('keeps unlocked regional roads reachable from the first overworld arrival', () => {
    const map = MAPS.overworld!;
    const queue: [number, number][] = [[5, 6]];
    const seen = new Set(['5,6']);
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i]!;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const next = `${x + dx},${y + dy}`;
        if (!seen.has(next) && tileAt(map, x + dx, y + dy).walkable) {
          seen.add(next);
          queue.push([x + dx, y + dy]);
        }
      }
    }
    for (const destination of ['mossvale', 'grove', 'lake', 'quarry', 'brightwater']) {
      const warp = map.warps.find((warp) => warp.to.map === destination)!;
      expect(warp.requiresFlag).toBeUndefined();
      expect(seen.has(`${warp.x},${warp.y}`), destination).toBe(true);
    }
  });
});
