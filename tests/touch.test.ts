import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import type { MapDef } from '../src/world/map';
import { findPath, pathTo, type Passage } from '../src/world/path';
import { newGame } from '../src/world/state';
import { GESTURE, GestureRecognizer } from '../src/ui/art/gestures';

/** A grid from rows of characters: `#` blocked, `S` stop, anything else open. */
function grid(rows: readonly string[]): (x: number, y: number) => Passage {
  return (x, y) => {
    const c = rows[y]?.[x];
    return c === '#' ? 'blocked' : c === 'S' ? 'stop' : 'open';
  };
}

describe('findPath', () => {
  const rows = ['....', '.##.', '.S..', '....'];
  const passage = grid(rows);

  it('finds the shortest way around walls', () => {
    expect(findPath([0, 0], [3, 2], 4, 4, passage)).toEqual([
      'right',
      'right',
      'right',
      'down',
      'down',
    ]);
    expect(findPath([0, 0], [0, 0], 4, 4, passage)).toEqual([]);
  });

  it('ends on a stop tile but never walks through one', () => {
    expect(findPath([0, 2], [1, 2], 4, 4, passage)).toEqual(['right']);
    // The stop at (1,2) is in the way along row 2, so the path goes round it.
    expect(findPath([0, 2], [2, 2], 4, 4, passage)).toEqual(['down', 'right', 'right', 'up']);
  });

  it('refuses blocked, outside and unreachable targets', () => {
    expect(findPath([0, 0], [1, 1], 4, 4, passage)).toBeNull();
    expect(findPath([0, 0], [4, 0], 4, 4, passage)).toBeNull();
    expect(findPath([0, 0], [0, -1], 4, 4, passage)).toBeNull();
    expect(findPath([0, 0], [-1, 0], 4, 4, passage)).toBeNull();
    expect(findPath([0, 0], [0, 4], 4, 4, passage)).toBeNull();
    expect(findPath([0, 0], [2, 0], 3, 1, grid(['.#.']))).toBeNull();
  });
});

describe('pathTo', () => {
  const testMap: MapDef = {
    id: 'touch-test',
    name: 'Test',
    theme: 'outdoor',
    tiles: ['.....', '.TT..', '.....', '.....'],
    warps: [{ x: 4, y: 3, to: { map: 'touch-test', x: 0, y: 0 } }],
    entities: [{ id: 'tt-slime', kind: 'monster', enemyId: 'slime', x: 2, y: 2 }],
  };
  (MAPS as Record<string, MapDef>)[testMap.id] = testMap;
  const at = (x: number, y: number) => ({ ...newGame(), mapId: testMap.id, x, y });

  it('walks round trees and bumps into monsters and warps', () => {
    expect(pathTo(at(0, 0), 2, 2)).toEqual(['down', 'down', 'right', 'right']);
    expect(pathTo(at(0, 0), 4, 3)?.length).toBe(7);
    expect(pathTo(at(0, 0), 1, 1)).toBeNull();
    // Past the monster to the far side: the path goes around it.
    expect(pathTo(at(1, 2), 3, 2)).toEqual(['down', 'right', 'right', 'up']);
  });

  it('ignores beaten monsters', () => {
    const state = at(1, 2);
    state.cleared.add('tt-slime');
    expect(pathTo(state, 3, 2)).toEqual(['right', 'right']);
  });
});

describe('GestureRecognizer', () => {
  const CELL = 30;
  const make = (): GestureRecognizer => new GestureRecognizer(CELL);

  it('taps rotate; slow presses do not', () => {
    const g = make();
    g.down(1, 100, 100, 0);
    expect(g.active).toBe(true);
    expect(g.move(1, 104, 103, 50)).toEqual([]);
    expect(g.up(1, 104, 103, 120)).toEqual(['rotate']);
    expect(g.active).toBe(false);
    g.down(1, 100, 100, 0);
    expect(g.up(1, 100, 100, GESTURE.tapMs + 1)).toEqual([]);
  });

  it('drags the piece column by column, following the finger both ways', () => {
    const g = make();
    g.down(1, 100, 100, 0);
    expect(g.move(1, 100 + CELL * 0.5, 102, 10)).toEqual([]);
    expect(g.move(1, 100 + CELL * 0.6, 102, 20)).toEqual(['right']);
    expect(g.move(1, 100 + CELL * 2.7, 104, 40)).toEqual(['right', 'right']);
    expect(g.move(1, 100 - CELL * 0.7, 104, 60)).toEqual(['left', 'left', 'left', 'left']);
    // A sideways drag never drops or rotates, even released fast downwards.
    expect(g.move(1, 100 - CELL * 0.7, 300, 70)).toEqual([]);
    expect(g.tick(500)).toEqual([]);
    expect(g.up(1, 100 - CELL * 0.7, 400, 80)).toEqual([]);
  });

  it('soft drops while a downward drag is held, pausing when the finger comes back up', () => {
    const g = make();
    g.down(1, 100, 100, 0);
    g.move(1, 101, 130, 50);
    expect(g.tick(100)).toEqual([]); // not held long enough yet
    expect(g.tick(50 + GESTURE.softDropDelayMs)).toEqual(['softDrop']);
    expect(g.tick(60 + GESTURE.softDropDelayMs)).toEqual([]);
    expect(g.tick(50 + GESTURE.softDropDelayMs + GESTURE.softDropRepeatMs)).toEqual(['softDrop']);
    g.move(1, 101, 105, 400);
    expect(g.tick(600)).toEqual([]);
    g.move(1, 101, 140, 700);
    expect(g.tick(800)).toEqual(['softDrop']);
    // Released slowly: no hard drop, and the soft drop stops.
    expect(g.up(1, 101, 141, 1000)).toEqual([]);
    expect(g.tick(1100)).toEqual([]);
  });

  it('hard drops on a fast flick down, without soft dropping first', () => {
    const g = make();
    g.down(1, 100, 100, 1000);
    g.move(1, 100, 125, 1020);
    expect(g.tick(1030)).toEqual([]);
    g.move(1, 101, 170, 1050);
    expect(g.up(1, 101, 200, 1070)).toEqual(['hardDrop']);
  });

  it('measures a flick over its last moments and needs enough travel', () => {
    const g = make();
    g.down(1, 100, 100, 0);
    // A slow drag down, then a pause: releasing is not a flick.
    for (let t = 10; t <= 600; t += 10) g.move(1, 100, 100 + t / 10, t);
    expect(g.up(1, 100, 160, 700)).toEqual([]);
    // Fast but too short.
    g.down(1, 100, 100, 0);
    g.move(1, 100, 115, 10);
    expect(g.up(1, 100, 120, 20)).toEqual([]);
  });

  it('ignores upward swipes', () => {
    const g = make();
    g.down(1, 100, 100, 0);
    expect(g.move(1, 100, 60, 30)).toEqual([]);
    expect(g.tick(500)).toEqual([]);
    expect(g.up(1, 100, 20, 60)).toEqual([]);
  });

  it('cancels on a second finger until every finger is lifted', () => {
    const g = make();
    g.down(1, 100, 100, 0);
    g.down(2, 200, 100, 10);
    expect(g.move(1, 200, 100, 20)).toEqual([]);
    expect(g.move(2, 300, 100, 20)).toEqual([]);
    expect(g.up(2, 300, 100, 30)).toEqual([]);
    expect(g.up(1, 100, 100, 40)).toEqual([]);
    expect(g.up(3, 100, 100, 40)).toEqual([]); // never down
    g.down(4, 100, 100, 100);
    expect(g.up(4, 100, 100, 150)).toEqual(['rotate']);
  });

  it('forgets a touch the browser cancels, and one locked out', () => {
    const g = make();
    g.down(1, 100, 100, 0);
    g.cancel(1);
    g.cancel(1);
    expect(g.active).toBe(false);
    g.down(1, 100, 100, 0);
    g.down(2, 100, 100, 0);
    g.cancel(2);
    expect(g.up(1, 100, 100, 10)).toEqual([]);
    g.down(1, 100, 100, 0);
    g.move(1, 100, 140, 20);
    g.lockout();
    expect(g.tick(1000)).toEqual([]);
    expect(g.up(1, 100, 300, 30)).toEqual([]);
    g.lockout(); // nothing to end
    g.down(1, 100, 100, 0);
    expect(g.up(1, 100, 100, 10)).toEqual(['rotate']);
  });
});
