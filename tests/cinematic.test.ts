import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  STONE_ORDER,
  actorPose,
  sample,
  shotKeyTimes,
  steady,
  type CinematicActor,
  type CinematicShot,
} from '../src/game/cinematic';
import { OPENING_CINEMATIC } from '../src/data/openingCinematic';
import { isCreatureId } from '../src/ui/art/creatures';

describe('sample', () => {
  const track = [
    { at: 100, value: 0 },
    { at: 300, value: 1 },
  ];

  it('holds the first value before the track starts and the last after it ends', () => {
    expect(sample(track, 0)).toBe(0);
    expect(sample(track, 1000)).toBe(1);
  });

  it('interpolates linearly between keys', () => {
    expect(sample(track, 200)).toBeCloseTo(0.5);
  });

  it('switches at the later of two keys that share a time, and reads an empty track as 0', () => {
    const jump = [
      { at: 0, value: 2 },
      { at: 0, value: 4 },
    ];
    expect(sample(jump, 0)).toBe(2);
    expect(sample(jump, 1)).toBe(4);
    expect(sample([], 10)).toBe(0);
    expect(sample(steady(0.7), 5000)).toBe(0.7);
  });
});

describe('actorPose', () => {
  const actor: CinematicActor = {
    sprite: 'char.026',
    keys: [
      { at: 0, x: 0, y: 100, facing: 'up', walking: true },
      { at: 1000, x: 0, y: 0, facing: 'down' },
    ],
  };

  it('moves in a straight line, keeping the facing and gait of the key it left', () => {
    expect(actorPose(actor, 500)).toEqual({
      x: 0,
      y: 50,
      facing: 'up',
      walking: true,
      sprite: 'char.026',
    });
  });

  it('settles on the last key, standing still unless told otherwise', () => {
    expect(actorPose(actor, 4000)).toEqual({
      x: 0,
      y: 0,
      facing: 'down',
      walking: false,
      sprite: 'char.026',
    });
  });

  it('turns on the spot when two keys share a time', () => {
    const turn: CinematicActor = {
      sprite: 'char.026',
      keys: [
        { at: 0, x: 5, y: 5, facing: 'up' },
        { at: 0, x: 5, y: 5, facing: 'left' },
        { at: 10, x: 5, y: 5, facing: 'right' },
      ],
    };
    expect(actorPose(turn, 5).facing).toBe('left');
  });

  it('switches sprite from the key that asks for it on, such as sitting down', () => {
    const sits: CinematicActor = {
      sprite: 'story.fernMuddy',
      keys: [
        { at: 0, x: 0, y: 0, facing: 'left', walking: true },
        { at: 100, x: 10, y: 0, facing: 'right', sprite: 'story.fernSitting' },
        { at: 200, x: 10, y: 0, facing: 'right' },
      ],
    };
    expect(actorPose(sits, 50).sprite).toBe('story.fernMuddy');
    expect(actorPose(sits, 150).sprite).toBe('story.fernSitting');
    expect(actorPose(sits, 500).sprite).toBe('story.fernSitting');
  });

  it('can start an actor on a sprite of its own', () => {
    const seated: CinematicActor = {
      sprite: 'story.fernMuddy',
      keys: [{ at: 0, x: 0, y: 0, facing: 'right', sprite: 'story.fernSitting' }],
    };
    expect(actorPose(seated, 0).sprite).toBe('story.fernSitting');
  });

  it('rejects an actor with nowhere to stand', () => {
    expect(() => actorPose({ sprite: 'char.026', keys: [] }, 0)).toThrow(/no keys/);
  });
});

describe('shotKeyTimes', () => {
  it('collects every key time from every track and actor', () => {
    const shot: CinematicShot = {
      id: 'x',
      setting: 'house',
      text: '',
      durationMs: 10,
      actors: [{ sprite: 'char.026', keys: [{ at: 7, x: 0, y: 0, facing: 'up' }] }],
      darkness: steady(0),
      fade: [{ at: 1, value: 0 }],
      door: [{ at: 2, value: 0 }],
      doorShake: [{ at: 3, value: 0 }],
      stones: [[{ at: 4, value: 1 }]],
    };
    expect(shotKeyTimes(shot).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 7]);
  });
});

/** The author's opening, paragraph by paragraph, as the sample document holds it. */
function sampleParagraphs(): string[] {
  const doc = readFileSync('docs/story-plans/samples/OPENING_SAMPLE.md', 'utf8');
  const body = doc.slice(doc.indexOf('## The last stop'), doc.indexOf('_(Draft from here on'));
  return body
    .split('\n\n')
    .filter((p) => p.trim() !== '' && !p.startsWith('## '))
    .map((p) => p.split(/\s+/).join(' ').trim());
}

const shot = (id: string): CinematicShot => {
  const found = OPENING_CINEMATIC.find((s) => s.id === id);
  if (!found) throw new Error(`No shot ${id}`);
  return found;
};

describe('the opening cinematic', () => {
  it("shows the author's words exactly, in order, with nothing left out", () => {
    const shown = OPENING_CINEMATIC.flatMap((s) => s.text.split('\n\n'));
    expect(shown).toEqual(sampleParagraphs());
  });

  it('gives every shot a unique id and keeps every event inside the shot', () => {
    expect(new Set(OPENING_CINEMATIC.map((s) => s.id)).size).toBe(OPENING_CINEMATIC.length);
    for (const s of OPENING_CINEMATIC)
      for (const at of shotKeyTimes(s)) {
        expect(at, s.id).toBeGreaterThanOrEqual(0);
        expect(at, s.id).toBeLessThanOrEqual(s.durationMs);
      }
  });

  it('only uses sprites the game can draw, and seven stones where stones appear', () => {
    for (const s of OPENING_CINEMATIC) {
      for (const actor of s.actors) {
        expect(isCreatureId(actor.sprite), actor.sprite).toBe(true);
        for (const key of actor.keys)
          if (key.sprite) expect(isCreatureId(key.sprite), key.sprite).toBe(true);
      }
      if (s.stones) expect(s.stones, s.id).toHaveLength(STONE_ORDER.length);
      if (s.stones) expect(s.setting, s.id).toBe('hill');
    }
  });

  it('puts the stones out one at a time from violet to orange, leaving red for Fern to run from', () => {
    const outs = shot('stones-go-out');
    const stones = outs.stones ?? [];
    const outAt = stones.map((track) => track.find((key) => key.value === 0)?.at ?? Infinity);
    expect(outAt.slice(0, 6)).toEqual([...outAt.slice(0, 6)].sort((a, b) => a - b));
    expect(new Set(outAt.slice(0, 6)).size).toBe(6);
    expect(sample(stones[6] ?? [], outs.durationMs)).toBe(1);
    const runs = shot('fern-runs');
    expect(sample(runs.stones?.[6] ?? [], runs.durationMs)).toBe(0);
  });

  it('darkens the hill as each stone goes out', () => {
    const outs = shot('stones-go-out');
    expect(sample(outs.darkness, outs.durationMs)).toBeGreaterThan(sample(outs.darkness, 0));
  });

  it('dips every stone for a moment in the flicker, then lights them again', () => {
    const flicker = shot('the-flicker');
    for (const track of flicker.stones ?? []) {
      expect(Math.min(...track.map((key) => key.value))).toBeLessThan(0.5);
      expect(sample(track, flicker.durationMs)).toBe(1);
    }
  });

  it('keeps the door shut until Rowan opens it, then open', () => {
    expect(sample(shot('pounding').door ?? [], 3000)).toBe(0);
    const opens = shot('door-opens').door ?? [];
    expect(sample(opens, 0)).toBe(0);
    expect(sample(opens, 3000)).toBe(1);
    expect(sample(shot('fern-bursts-in').door ?? [], 0)).toBe(1);
  });

  it('shows Fern clean before the run and muddy from the moment he bursts in', () => {
    const order = OPENING_CINEMATIC.map((s) => s.id);
    const burst = order.indexOf('fern-bursts-in');
    OPENING_CINEMATIC.forEach((s, i) => {
      const sprites = s.actors.map((a) => a.sprite);
      if (i < burst) expect(sprites, s.id).not.toContain('story.fernMuddy');
      else if (s.setting !== 'memory' && sprites.some((id) => id.startsWith('char.026')))
        expect.fail(`${s.id} shows clean Fern after the run`);
    });
  });

  it('seats Fern in the chair for his report, until he gets up to follow Rowan', () => {
    for (const id of ['the-report', 'the-report-ends']) {
      const fern = shot(id).actors.find((a) => a.sprite === 'story.fernMuddy');
      expect(fern && actorPose(fern, 0).sprite, id).toBe('story.fernSitting');
    }
    const leaving = shot('lantern').actors.find((a) => a.sprite === 'story.fernMuddy');
    expect(leaving && actorPose(leaving, 0).sprite).toBe('story.fernSitting');
    expect(leaving && actorPose(leaving, 2000).sprite).toBe('story.fernMuddy');
  });

  it('lights the way with Rowan’s lantern from the moment he takes it', () => {
    const order = OPENING_CINEMATIC.map((s) => s.id);
    const takes = order.indexOf('lantern');
    OPENING_CINEMATIC.slice(takes).forEach((s) => {
      const rowan = s.actors.find((a) => a.sprite === 'story.rowanLantern');
      expect(rowan?.lantern, s.id).toBe(true);
    });
  });
});
