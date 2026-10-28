import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import { weakTo } from '../src/core/elements';
import type { CrystalColor } from '../src/core/pieces';
import { CAMPAIGN_FLAGS as C } from '../src/data/campaignFlags';
import { MAPS } from '../src/data/maps';
import { NPCS } from '../src/data/npcs';
import { SPELLS } from '../src/data/spells';
import { attitudeOf } from '../src/game/attitude';
import { mentorsTaught } from '../src/game/ending';
import { newKnownSpell } from '../src/game/spells';
import { describeInteraction, resolveBattle } from '../src/game/encounter';
import { dueScenes, finishScene, scenePages } from '../src/game/story';
import { deserialize, serialize } from '../src/game/save';
import { DIRECTION_DELTAS, tileAt, warpAt, type Direction, type EntityDef } from '../src/world/map';
import { step } from '../src/world/movement';
import { activeEntities, currentMap, newGame, travel, type GameState } from '../src/world/state';
import { makeBattle, setUpVerticalIClear } from './helpers';

/**
 * Integration fixtures, not a balance bot: puzzles use authored inputs;
 * combat uses prepared four-line clears with no elapsed enemy time. This
 * tests earned resolution and gates, not attainable skill or playtime.
 */
const solutions: Record<string, readonly (readonly [number, number])[]> = {
  archiveDrain: [
    [0, 1],
    [0, 5],
  ],
  rootTram: [[0, 4]],
  ketterRescue: [
    [0, 0],
    [0, 4],
    [0, 8],
  ],
  bellCircuit: [
    [0, 2],
    [0, 6],
  ],
  foundryProcedure: [[1, 4]],
  fennickRite: [
    [0, 3],
    [1, 1],
  ],
};

function scenes(state: GameState, seen: string[] = []): string[] {
  for (let guard = 0; guard < 100; guard++) {
    const scene = dueScenes(state.flags, state.mapId)[0];
    if (!scene) return seen;
    expect(scenePages(scene, state.hero).length, scene.id).toBeGreaterThan(0);
    finishScene(state, scene);
    seen.push(scene.id);
  }
  throw new Error('Scene completion did not terminate');
}

function winFight(state: GameState, entity: EntityDef): void {
  if (entity.kind !== 'monster') throw new Error('Expected a monster');
  const battle = makeBattle({ kind: 'combat', enemyId: entity.enemyId }, state.hero);
  for (let clears = 0; clears < 100 && battle.status === 'ongoing'; clears++) {
    setUpVerticalIClear(battle.board, 4);
    battle.input('hardDrop');
  }
  expect(battle.status, entity.id).toBe('won');
  expect(resolveBattle(state, entity, battle, createRng(123)).won).toBe(true);
}

/** Walk normally to an adjacent tile, avoiding people, live monsters, and exits. */
function approach(state: GameState, target: { x: number; y: number }): Direction {
  const map = currentMap(state);
  const blocked = new Set(activeEntities(state).map((e) => `${e.x},${e.y}`));
  const queue: { x: number; y: number; path: Direction[] }[] = [
    { x: state.x, y: state.y, path: [] },
  ];
  const visited = new Set<string>();
  for (const point of queue) {
    const key = `${point.x},${point.y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    const facing = (
      Object.entries(DIRECTION_DELTAS) as [Direction, readonly [number, number]][]
    ).find(([, [dx, dy]]) => point.x + dx === target.x && point.y + dy === target.y)?.[0];
    if (facing) {
      for (const direction of point.path) expect(step(state, direction).kind).toBe('moved');
      return facing;
    }
    for (const [direction, [dx, dy]] of Object.entries(DIRECTION_DELTAS) as [
      Direction,
      readonly [number, number],
    ][]) {
      const x = point.x + dx;
      const y = point.y + dy;
      if (!tileAt(map, x, y).walkable || blocked.has(`${x},${y}`) || warpAt(map, x, y)) continue;
      queue.push({ x, y, path: [...point.path, direction] });
    }
  }
  throw new Error(`No walking approach to ${state.mapId}:${target.x},${target.y}`);
}

function cross(state: GameState, targetMap: string, expected: 'warp' | 'locked' = 'warp'): void {
  const warp = currentMap(state).warps.find((w) => w.to.map === targetMap);
  expect(warp, `${state.mapId} -> ${targetMap}`).toBeDefined();
  if (!warp) return;
  const direction = approach(state, warp);
  const result = step(state, direction);
  expect(result.kind, `${state.mapId} -> ${targetMap}`).toBe(expected);
  if (result.kind === 'warp') {
    travel(state, result.to);
    scenes(state);
  }
}

function task(state: GameState, npcId: string): void {
  const entity = activeEntities(state).find((e) => e.kind === 'npc' && e.npcId === npcId);
  expect(entity, `${state.mapId}: ${npcId}`).toBeDefined();
  if (!entity) return;
  expect(step(state, approach(state, entity)).kind).toBe('interact');
  const interaction = describeInteraction(state, entity);
  expect(interaction.kind, npcId).toBe('challenge');
  if (interaction.kind !== 'challenge') return;
  const battle = makeBattle(interaction.spec, state.hero);
  if (interaction.spec.kind === 'barter') {
    // A prepared-clear fixture exercises the colour accounting and resolution,
    // without claiming these boards were attained by a human or balance bot.
    for (const color of Object.keys(interaction.spec.wants) as CrystalColor[]) {
      if (battle.status !== 'ongoing') break;
      setUpVerticalIClear(battle.board, 4, color);
      battle.input('hardDrop');
    }
  }
  for (const [turns, x] of solutions[npcId] ?? []) {
    for (let i = 0; i < turns; i++) battle.input('rotate');
    const piece = battle.board.active;
    if (!piece) throw new Error(`Queue ended for ${npcId}`);
    const target = x - Math.min(...piece.cells.map(([cx]) => cx));
    for (let moves = 0; moves < 20 && piece.x !== target; moves++) {
      battle.input(piece.x > target ? 'left' : 'right');
    }
    expect(piece.x, npcId).toBe(target);
    battle.input('hardDrop');
  }
  expect(battle.status, npcId).toBe('won');
  resolveBattle(state, entity, battle, createRng(456), interaction.terms);
  scenes(state);
}

function boss(state: GameState, id: string): void {
  const entity = activeEntities(state).find((e) => e.id === id);
  expect(entity, `${state.mapId}: ${id}`).toBeDefined();
  if (!entity) return;
  expect(step(state, approach(state, entity)).kind).toBe('interact');
  winFight(state, entity);
  scenes(state);
  expect(activeEntities(state).some((e) => e.id === id)).toBe(false);
}

function chapterOneFixture(classId: string): GameState {
  const state = newGame(classId);
  const wyrm = MAPS.caves2!.entities.find((e) => e.kind === 'monster' && e.enemyId === 'moonWyrm');
  if (!wyrm) throw new Error('The canonical Wyrm is missing');
  // Begin at the established first-half endpoint; this is not a first-half playthrough.
  travel(state, { map: 'caves2', x: wyrm.x, y: wyrm.y - 1 });
  winFight(state, wyrm);
  scenes(state);
  expect(state.flags.has('wyrmBeaten')).toBe(true);
  expect(state.flags.has(C.complete)).toBe(false);
  travel(state, { map: 'overworld', x: 15, y: 19 });
  scenes(state);
  return state;
}

describe('playable second-half progression', () => {
  it('keeps the new route gated before Chapter One is won', () => {
    const state = newGame();
    travel(state, { map: 'overworld', x: 15, y: 19 });
    cross(state, 'sunkenArchive', 'locked');
    expect(state.flags.has(C.descent)).toBe(false);
    expect(state.flags.has(C.complete)).toBe(false);
  });

  for (const classId of ['ranger', 'knight', 'mage', 'rogue']) {
    it(`${classId} can earn the route and final milestone without optional lessons`, () => {
      let state = chapterOneFixture(classId);
      expect(state.flags.has(C.descent)).toBe(true);
      cross(state, 'innerWard', 'locked');
      cross(state, 'sunkenArchive');
      cross(state, 'cisternMarches', 'locked');
      task(state, 'archiveDrain');
      cross(state, 'cisternMarches');
      expect(activeEntities(state).some((e) => e.id === 'campaign-irdrath')).toBe(false);
      cross(state, 'rootways', 'locked');
      task(state, 'cisternTrial');
      boss(state, 'campaign-irdrath');
      expect(state.flags.has(C.irdrath)).toBe(true);
      expect(state.flags.has(C.complete)).toBe(false);
      cross(state, 'rootways');
      cross(state, 'glassWarrens', 'locked');
      task(state, 'rootTram');
      cross(state, 'glassWarrens');
      expect(activeEntities(state).some((e) => e.id === 'campaign-vesper')).toBe(false);
      task(state, 'ketterRescue');
      boss(state, 'campaign-vesper');
      state = deserialize(serialize(state))!;
      expect(state).not.toBeNull();
      expect(state.flags.has(C.vesper)).toBe(true);
      expect(state.flags.has(C.accepted)).toBe(false);
      cross(state, 'bellHollows');
      task(state, 'bellCircuit');
      cross(state, 'quietFoundry');
      expect(activeEntities(state).some((e) => e.id === 'campaign-lishal')).toBe(false);
      task(state, 'foundryProcedure');
      expect(state.flags.has(C.procedure)).toBe(true);
      expect(state.flags.has(C.accepted)).toBe(true);
      boss(state, 'campaign-lishal');
      expect(state.flags.has(C.complete)).toBe(false);
      cross(state, 'upwardRoad');
      cross(state, 'overworld', 'locked');
      task(state, 'ascentRepair');
      cross(state, 'overworld');
      expect(state.flags.has(C.returned)).toBe(true);
      cross(state, 'innerWard', 'locked');
      task(state, 'fennickRite');
      expect(state.flags.has(C.wardReady)).toBe(true);
      expect(state.flags.has(C.complete)).toBe(false);
      cross(state, 'innerWard');
      boss(state, 'campaign-malificat');
      expect(state.flags.has(C.complete)).toBe(true);
      expect(state.flags.has(C.malificat)).toBe(true);
      expect(state.flags.has('wyrmBeaten')).toBe(true);
      expect(state.mapId).toBe('overworld');
      cross(state, 'innerWard', 'locked');
      expect(mentorsTaught(state.hero)).toEqual([]);
      expect(state.hero.seal).toBeNull();
      const restored = deserialize(serialize(state));
      expect(restored?.flags.has(C.complete)).toBe(true);
      expect(restored && activeEntities(restored).some((e) => e.id === 'campaign-malificat')).toBe(
        false,
      );
    });
  }

  it('offers every mandatory task regardless of hostile alignment or empty inventory', () => {
    const state = newGame('rogue');
    state.hero.items = {};
    state.hero.gil = 0;
    state.hero.stats.charm = 0;
    for (const id of [
      'archiveDrain',
      'cisternTrial',
      'rootTram',
      'ketterRescue',
      'bellCircuit',
      'foundryProcedure',
      'ascentRepair',
      'fennickRite',
    ]) {
      const npc = NPCS[id]!;
      state.hero.spells = Object.fromEntries(
        weakTo(npc.element).map((element) => {
          const spell = Object.values(SPELLS).find(
            (s) => s.category === element && s.role === 'primary',
          )!;
          return [spell.id, { ...newKnownSpell(), level: 4 }];
        }),
      );
      expect(npc.essential, id).toBe(true);
      expect(['puzzle', 'barter'], id).toContain(npc.challenge.kind);
      if (!npc.inanimate) expect(attitudeOf(state.hero, npc), id).toBe('hostile');
      const interaction = describeInteraction(state, {
        id: `qa-${id}`,
        kind: 'npc',
        npcId: id,
        x: 1,
        y: 1,
      });
      expect(interaction.kind, id).toBe('challenge');
    }
  });

  it('keeps a failed task and a lost boss retryable without losing earned route work', () => {
    const state = chapterOneFixture('ranger');
    cross(state, 'sunkenArchive');
    const drain = activeEntities(state).find(
      (e) => e.kind === 'npc' && e.npcId === 'archiveDrain',
    )!;
    const offered = describeInteraction(state, drain);
    if (offered.kind !== 'challenge') throw new Error('Drain should offer its puzzle');
    const puzzle = makeBattle(offered.spec, state.hero);
    for (let drops = 0; drops < 10 && puzzle.status === 'ongoing'; drops++)
      puzzle.input('hardDrop');
    expect(puzzle.status).toBe('lost');
    const failure = resolveBattle(state, drain, puzzle, createRng(789), offered.terms);
    expect(failure.fell).toBe(false);
    expect(state.flags.has(C.drain)).toBe(false);
    expect(describeInteraction(state, drain).kind).toBe('challenge');
    task(state, 'archiveDrain');
    cross(state, 'cisternMarches');
    task(state, 'cisternTrial');
    const irdrath = activeEntities(state).find((e) => e.id === 'campaign-irdrath')!;
    if (irdrath.kind !== 'monster') throw new Error('Irdrath must be a monster');
    const battle = makeBattle({ kind: 'combat', enemyId: irdrath.enemyId }, state.hero);
    state.hero.hp = 0;
    expect(battle.status).toBe('lost');
    const loss = resolveBattle(state, irdrath, battle, createRng(321));
    expect(loss.fell).toBe(true);
    expect(state.mapId).toBe(state.respawn.map);
    expect(state.flags.has(C.trial)).toBe(true);
    expect(state.flags.has(C.irdrath)).toBe(false);
    expect(state.flags.has(C.complete)).toBe(false);
    cross(state, 'overworld');
    cross(state, 'sunkenArchive');
    cross(state, 'cisternMarches');
    boss(state, 'campaign-irdrath');
    expect(state.flags.has(C.irdrath)).toBe(true);
  });
});
