import { describe, expect, it } from 'vitest';
import { FERN_DAWN, FERN_DAWN_LOCATION, finishFernOpening } from '../src/game/fernOpening';
import { openingLead } from '../src/game/opening';
import { dueScenes, pendingVision } from '../src/game/story';
import { itemCount } from '../src/game/hero';
import { deserialize, serialize } from '../src/game/save';
import { currentMap, travel, activeEntities, newGame } from '../src/world/state';
import { pathTo } from '../src/world/path';
import { SURFACE_SITES } from '../src/data/surfaceLayout';
import { MAPS } from '../src/data/maps';
import { MENTORS } from '../src/data/mentors';
import { NPCS } from '../src/data/npcs';
import { grantRewards } from '../src/game/rewards';
import { lessonsFor } from '../src/game/lessons';
import { warpUnlocked } from '../src/world/map';
import { step } from '../src/world/movement';

describe('Fern’s dawn handoff', () => {
  it('hands control to a spell-less Fern on a walkable road without an old sleep interlude or item effect', () => {
    const state = newGame('ranger');
    const heroBefore = structuredClone(state.hero);
    expect(finishFernOpening(state)).toBe(true);
    expect(state).toMatchObject({
      mapId: 'overworld',
      x: FERN_DAWN_LOCATION.x,
      y: FERN_DAWN_LOCATION.y,
      facing: 'up',
      day: 1,
    });
    expect(state.hero).toEqual(heroBefore);
    expect(state.hero.spells).toEqual({});
    expect(itemCount(state.hero, 'wellStone')).toBe(0);
    expect(state.flags.has('fern:runeStone')).toBe(true);
    expect(dueScenes(state.flags, state.mapId)).toEqual([]);
    expect(pendingVision(state)).toBeNull();
    expect(step(state, 'up').kind).toBe('moved');
    expect(step(state, 'right').kind).toBe('moved');
  });

  it('walks into Windward before the old mountain gate, retaining Twitch’s local challenge', () => {
    const state = newGame('ranger');
    finishFernOpening(state);
    const oldEntrance = MAPS.overworld!.warps.find((w) => w.to.map === 'cliffs')!;
    expect(warpUnlocked(oldEntrance, state.flags)).toBe(false);
    const route = pathTo(state, SURFACE_SITES.cliffs.x, SURFACE_SITES.cliffs.y);
    expect(route).not.toBeNull();
    for (const direction of route!) {
      const result = step(state, direction);
      if (result.kind === 'warp') travel(state, result.to);
      else expect(result.kind).toBe('moved');
    }
    expect(state.mapId).toBe('cliffs');
    expect(state.flags.has('peakGate')).toBe(false);
    expect(state.flags.has('opening:legacyJourney')).toBe(false);
    expect(state.flags.has('reached:peaks')).toBe(false);
    const gate = currentMap(state).passages!.find((p) => p.mentorId === 'kestrel')!;
    expect(state.flags.has(gate.requiresFlag)).toBe(false);
    const courier = activeEntities(state).find((e) => e.kind === 'npc' && e.npcId === 'courier')!;
    expect(pathTo(state, courier.x, courier.y)).not.toBeNull();
    // Settle the existing courier reward table as a won regional task, not a mountain milestone.
    grantRewards(state.hero, state.flags, NPCS.courier!.rewards);
    expect(state.flags.has(gate.requiresFlag)).toBe(true);
    const kestrel = activeEntities(state).find(
      (e) => e.kind === 'mentor' && e.mentorId === 'kestrel',
    )!;
    expect(pathTo(state, kestrel.x, kestrel.y)).not.toBeNull();
    expect(
      lessonsFor(state, MENTORS.kestrel!).some((l) => l.spellId === 'gale' && l.level === 1),
    ).toBe(true);
    expect(state.hero.spells).toEqual({});
  });

  it('preserves the completed handoff and later movement across reload and a repeated completion', () => {
    const state = newGame('ranger');
    finishFernOpening(state);
    step(state, 'up');
    const saved = serialize(state);
    const restored = deserialize(saved)!;
    expect(restored.flags.has(FERN_DAWN)).toBe(true);
    expect(finishFernOpening(restored)).toBe(false);
    expect(serialize(restored)).toBe(saved);
  });

  it('does not rewrite another hero and stops the first-teacher hint after a lesson', () => {
    const other = newGame('knight');
    const before = serialize(other);
    expect(finishFernOpening(other)).toBe(false);
    expect(serialize(other)).toBe(before);
    const fern = newGame('ranger');
    finishFernOpening(fern);
    expect(openingLead(fern)).toContain('Other teachers');
    fern.flags.add('taught:mentor:dorn');
    expect(openingLead(fern)).toBe('');
  });
});
