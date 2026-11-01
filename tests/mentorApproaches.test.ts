import { deserialize, serialize } from '../src/game/save';
import { newRecord } from '../src/game/stakes';
import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import { MENTORS } from '../src/data/mentors';
import { MENTOR_APPROACHES, mentorAccessFlag } from '../src/data/mentorApproaches';
import { NPCS } from '../src/data/npcs';
import { grantRewards } from '../src/game/rewards';
import { passageOpen } from '../src/world/map';
import { mentorEntities, mentorPlace } from '../src/world/mentors';
import { step } from '../src/world/movement';
import { pathTo } from '../src/world/path';
import { newGame, travel } from '../src/world/state';

describe.each(MENTOR_APPROACHES)('$mentorId’s regional approach', (approach) => {
  const mentor = MENTORS[approach.mentorId]!;
  const home = mentor.route[0];
  const map = MAPS[home.map]!;
  const gate = map.passages!.find((gate) => gate.mentorId === mentor.id)!;
  const from = Object.values(MAPS)
    .flatMap((map) => map.warps)
    .find((warp) => warp.to.map === home.map)!.to;

  it('keeps the local task accessible with no spells, and prevents walking or tapping through the closed approach', () => {
    const state = newGame();
    travel(state, from);
    expect(state.hero.spells).toEqual({});
    const task = map.entities.find(
      (entity) => entity.kind === 'npc' && entity.npcId === approach.taskId,
    )!;
    expect(pathTo(state, task.x, task.y), 'local task must remain reachable').not.toBeNull();
    expect(mentorEntities(state).some((entity) => entity.mentorId === mentor.id)).toBe(true);
    expect(
      pathTo(state, home.x, home.y),
      'teacher must not be reachable before the task',
    ).toBeNull();
    expect(passageOpen(gate, state)).toBe(false);
    expect(NPCS[approach.taskId]!.essential).toBe(true);
    const x = gate.x + (approach.side === 'west' ? -1 : approach.side === 'east' ? 1 : 0);
    const y = gate.y + (approach.side === 'south' ? 1 : 0);
    travel(state, { map: home.map, x, y });
    const direction = approach.side === 'west' ? 'right' : approach.side === 'east' ? 'left' : 'up';
    expect(step(state, direction)).toEqual({ kind: 'locked', text: gate.text });
    expect([state.x, state.y]).toEqual([x, y]);
  });

  it('opens a real walking route after completing the relevant task, without teaching or requiring a spell', () => {
    const state = newGame();
    travel(state, from);
    const result = grantRewards(state.hero, state.flags, NPCS[approach.taskId]!.rewards);
    expect(state.flags.has(mentorAccessFlag(mentor.id))).toBe(true);
    expect(result.gains).toContainEqual({ kind: 'route', mentorId: mentor.id });
    expect(state.hero.spells).toEqual({});
    const path = pathTo(state, home.x, home.y);
    expect(path).not.toBeNull();
    let resultOfStep;
    for (const direction of path!) resultOfStep = step(state, direction);
    expect(resultOfStep).toMatchObject({
      kind: 'interact',
      entity: { kind: 'mentor', mentorId: mentor.id },
    });
    // The teacher stays put while the player chooses their first lesson.
    expect(mentorPlace(mentor, { ...state, victories: 60 })).toBe(home);
  });

  it('lets an older save inside the new boundary walk or tap out without unlocking entry', () => {
    const before = newGame();
    // Clear interior tiles were valid saved positions before the new approach.
    const x =
      approach.side === 'west' ? gate.x + 1 : approach.side === 'east' ? gate.x - 1 : gate.x;
    const y = approach.side === 'south' ? gate.y - 1 : gate.y;
    travel(before, { map: home.map, x, y });
    const state = deserialize(serialize(before))!;
    expect(state.mapId).toBe(home.map);
    const outside = {
      x: gate.x + (approach.side === 'west' ? -1 : approach.side === 'east' ? 1 : 0),
      y: gate.y + (approach.side === 'south' ? 1 : 0),
    };
    const path = pathTo(state, outside.x, outside.y);
    expect(path).not.toBeNull();
    for (const direction of path!) expect(step(state, direction)).toEqual({ kind: 'moved' });
    expect([state.x, state.y]).toEqual([outside.x, outside.y]);
    expect(passageOpen(gate, state)).toBe(false);
    const inward = approach.side === 'west' ? 'right' : approach.side === 'east' ? 'left' : 'up';
    expect(step(state, inward)).toEqual({ kind: 'locked', text: gate.text });
    expect(state.hero.spells).toEqual({});
  });

  it('honors completed work and prior meetings in existing saves', () => {
    const state = newGame();
    state.flags.add(`npc:${approach.taskId}`);
    expect(passageOpen(gate, state)).toBe(true);
    state.flags.clear();
    state.flags.add(`met:${mentor.id}:0`);
    expect(passageOpen(gate, state)).toBe(true);
    state.flags.clear();
    state.encounters[approach.taskId] = { ...newRecord(), wins: 1 };
    expect(passageOpen(gate, state)).toBe(true);
  });
});
