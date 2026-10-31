import { describe, expect, it } from 'vitest';
import { Board } from '../src/core/board';
import { createRng } from '../src/core/rng';
import { ENEMIES } from '../src/data/enemies';
import type { EnemyMove } from '../src/data/types';
import { ArcaneInterference } from '../src/battle/arcane';
import { boardMagicEnemy, ENEMY_OBSTRUCTION_PROFILES } from '../src/battle/magicEncounters';
import {
  frozenObstructionStillLegal,
  legacyMoveUseful,
  planEnemyMove,
} from '../src/battle/obstructionIntent';

function board(): Board {
  const result = new Board(createRng(5));
  result.magicEnabled = true;
  result.setFixedQueue(['I', 'O', 'T']);
  result.spawn();
  return result;
}

function well(x = 9, top = 16): Board {
  const result = board();
  for (let y = top; y < result.height; y++)
    result.grid[y] = Array.from({ length: result.width }, (_, col) => (col === x ? null : 'blue'));
  return result;
}

function obstruction(move: EnemyMove): Extract<EnemyMove, { kind: 'obstruct' }> {
  if (move.kind !== 'obstruct') throw new Error('Expected a purposeful obstruction.');
  return move;
}

const packet = (x: number, y: number, strength = 1): EnemyMove => ({
  kind: 'obstruct',
  name: 'Authored packet',
  cells: [{ x, y, strength }],
});

describe('purposeful creature profiles', () => {
  it('limits profiles to the two existing creature motives with fixed readable material', () => {
    expect(Object.keys(ENEMY_OBSTRUCTION_PROFILES).sort()).toEqual(['goblin', 'slime']);
    expect(ENEMY_OBSTRUCTION_PROFILES.slime).toMatchObject({
      strength: 1,
      sequence: [],
      maxCells: 1,
    });
    expect(ENEMY_OBSTRUCTION_PROFILES.goblin).toMatchObject({
      strength: 2,
      maxCells: 1,
      sequence: [{ color: 'orange', sides: ['top', 'right', 'bottom', 'left'] }],
    });
  });

  it('Slime clogs the actual supported landing instead of fixed arbitrary coordinates', () => {
    const field = board();
    const original = JSON.stringify(field.magicState());
    const plan = planEnemyMove(ENEMIES.slime!, field, createRng(1));
    const move = obstruction(plan.move);
    expect(plan).toMatchObject({ intent: 'clogLanding', label: 'Clog landing', fallback: false });
    expect(move.cells).toHaveLength(1);
    expect(move.cells[0]).toMatchObject({ y: 19, strength: 1, sequence: [] });
    expect(move.cells[0]!.x).toBeGreaterThanOrEqual(3);
    expect(move.cells[0]!.x).toBeLessThanOrEqual(6);
    expect(JSON.stringify(field.magicState())).toBe(original);
    expect(frozenObstructionStillLegal(plan.move, field)).toBe(true);
  });

  it('Slime follows a shifted supported landing area', () => {
    const field = board();
    field.active!.x = 0;
    field.grid[18]![1] = 'blue';
    const move = obstruction(planEnemyMove(ENEMIES.slime!, field, createRng(2)).move);
    expect(move.cells[0]).toMatchObject({ x: 1, y: 17 });
  });

  it('Goblin caps the visible clearing-well mouth without filling its nearly complete rows', () => {
    const field = well();
    const plan = planEnemyMove(ENEMIES.goblin!, field, createRng(3));
    expect(plan).toMatchObject({
      intent: 'blockWell',
      label: 'Block clearing well',
      fallback: false,
    });
    expect(obstruction(plan.move).cells).toEqual([
      {
        x: 9,
        y: 15,
        strength: 2,
        sequence: [{ color: 'orange', sides: ['top', 'right', 'bottom', 'left'] }],
      },
    ]);
    expect(frozenObstructionStillLegal(plan.move, field)).toBe(true);
  });

  it('moves the Goblin target with the well rather than cycling colours/strengths', () => {
    for (const x of [0, 2, 7, 9]) {
      const field = well(x, 14);
      const move = obstruction(planEnemyMove(ENEMIES.goblin!, field, createRng(x + 1)).move);
      expect(move.cells[0]).toMatchObject({ x, y: 13, strength: 2 });
      expect(move.cells[0]!.sequence?.[0]?.color).toBe('orange');
    }
  });

  it('uses an authored attack when no well or landing purpose exists', () => {
    expect(planEnemyMove(ENEMIES.goblin!, board(), createRng(1))).toMatchObject({
      intent: 'attack',
      fallback: true,
    });
    const field = board();
    field.active = null;
    expect(planEnemyMove(ENEMIES.slime!, field, createRng(1))).toMatchObject({
      intent: 'attack',
      fallback: true,
    });
  });

  it('does not stack obstruction attempts on consecutive enemy turns', () => {
    const field = board();
    const first = planEnemyMove(ENEMIES.slime!, field, createRng(1));
    const second = planEnemyMove(ENEMIES.slime!, field, createRng(1), { previousMove: first.move });
    expect(second.move.kind).toBe('attack');
    expect(
      planEnemyMove(ENEMIES.slime!, field, createRng(1), { previousMove: second.move }).intent,
    ).toBe('clogLanding');
  });

  it('re-evaluates a raised well lip before planning instead of reusing the old coordinates', () => {
    const field = well();
    field.grid[15]![8] = 'orange';
    const move = obstruction(planEnemyMove(ENEMIES.goblin!, field, createRng(1)).move);
    expect(move.cells[0]).toMatchObject({ x: 9, y: 14, strength: 2 });
    new ArcaneInterference(field).place('goblin', move.cells);
    expect(field.obstructions['9,14']).toMatchObject({ owner: 'goblin', strength: 2 });
  });

  it('allows orange added after the warning to clear the frozen arrival without retargeting', () => {
    const field = well();
    const plan = planEnemyMove(ENEMIES.goblin!, field, createRng(1));
    const move = obstruction(plan.move);
    expect(move.cells[0]).toMatchObject({ x: 9, y: 15 });
    const frozen = JSON.stringify(plan);
    field.grid[15]![8] = 'orange';
    expect(frozenObstructionStillLegal(move, field)).toBe(true);
    const resolved = new ArcaneInterference(field).place('goblin', move.cells);
    expect(resolved.removed).toContainEqual({ cell: 'stone', tag: null, cause: 'contact' });
    expect(field.grid[15]![9]).toBeNull();
    expect(Object.keys(field.obstructions)).toEqual([]);
    expect(JSON.stringify(plan)).toBe(frozen);
  });

  it('Slime goo has no arbitrary colour-contact auto-fulfillment', () => {
    const field = board();
    const move = obstruction(planEnemyMove(ENEMIES.slime!, field, createRng(1)).move);
    const { x, y } = move.cells[0]!;
    field.grid[y]![x === 0 ? 1 : x - 1] = 'green';
    expect(frozenObstructionStillLegal(move, field)).toBe(true);
    new ArcaneInterference(field).place('slime', move.cells);
    expect(field.obstructions[`${x},${y}`]).toMatchObject({ strength: 1, sequence: [] });
  });

  it('falls back rather than placing near the spawn area on a dangerously high stack', () => {
    const field = well(9, 4);
    expect(planEnemyMove(ENEMIES.goblin!, field, createRng(1)).move.kind).toBe('attack');
    for (let x = 0; x < 10; x++) field.grid[4]![x] = 'blue';
    expect(planEnemyMove(ENEMIES.slime!, field, createRng(1)).move.kind).toBe('attack');
  });

  it('never applies a hostile profile to lesson/practice or no-clear objective boards', () => {
    const field = well();
    const adapted = boardMagicEnemy(ENEMIES.goblin!, 10, 20);
    for (const hostile of [false]) {
      const plan = planEnemyMove(adapted, field, createRng(1), { hostile });
      expect(plan.move.kind).not.toBe('obstruct');
    }
    field.clearsEnabled = false;
    expect(planEnemyMove(adapted, field, createRng(1)).move.kind).not.toBe('obstruct');
    field.clearsEnabled = true;
    field.magicEnabled = false;
    expect(planEnemyMove(adapted, field, createRng(1)).move.kind).not.toBe('obstruct');
  });

  it.each(['target', 'protected', 'ridge'] as const)(
    'protects an authored %s objective even away from the planned target',
    (tag) => {
      const field = well();
      field.tags[18]![0] = tag;
      expect(planEnemyMove(ENEMIES.goblin!, field, createRng(1)).move.kind).toBe('attack');
      expect(frozenObstructionStillLegal(packet(9, 15), field)).toBe(false);
    },
  );

  it('freezes the whole planned payload through telegraph and a delayed delivery', () => {
    const field = well();
    const plan = planEnemyMove(ENEMIES.goblin!, field, createRng(1));
    const move = obstruction(plan.move);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(move)).toBe(true);
    expect(Object.isFrozen(move.cells)).toBe(true);
    expect(Object.isFrozen(move.cells[0])).toBe(true);
    expect(Object.isFrozen(move.cells[0]!.sequence?.[0]?.sides)).toBe(true);
    const before = JSON.stringify(move);
    field.grid[15]![9] = 'green';
    expect(frozenObstructionStillLegal(move, field)).toBe(false);
    expect(JSON.stringify(move)).toBe(before);
  });

  it('retains existing owner/anchor and Nature counterplay on actual placement', () => {
    const field = well();
    const move = obstruction(planEnemyMove(ENEMIES.goblin!, field, createRng(1)).move);
    const interference = new ArcaneInterference(field);
    interference.place('goblin', move.cells);
    expect(field.obstructions['9,15']).toMatchObject({
      owner: 'goblin',
      anchored: true,
      strength: 2,
    });
    const countered = well();
    const nature = new ArcaneInterference(countered);
    nature.cast('goblin', 'nature', 1, 19, 1, 8000);
    nature.place('goblin', move.cells);
    expect(countered.grid[15]![9]).toBe('neutral');
    expect(countered.obstructions['9,15']).toBeUndefined();
  });
});

describe('queued target reservations', () => {
  it('reserves queued goo only for future selection without changing the frozen packet', () => {
    const field = board();
    const queued = obstruction(planEnemyMove(ENEMIES.slime!, field, createRng(1)).move);
    const before = JSON.stringify(queued);
    const reservedCells = queued.cells.map(({ x, y }) => [x, y] as const);
    const next = planEnemyMove(ENEMIES.slime!, field, createRng(1), {
      reservedCells,
      previousMove: { kind: 'attack', name: 'Bounce', power: 3 },
    });
    expect(next.move.kind).toBe('obstruct');
    expect(obstruction(next.move).cells.map(({ x, y }) => [x, y])).not.toEqual(reservedCells);
    expect(frozenObstructionStillLegal(queued, field)).toBe(true);
    expect(JSON.stringify(queued)).toBe(before);
    for (const { x, y } of queued.cells) expect(field.grid[y]![x]).toBeNull();
  });

  it('attacks when the only useful well mouth is reserved by a queued packet', () => {
    const field = well();
    const queued = obstruction(planEnemyMove(ENEMIES.goblin!, field, createRng(1)).move);
    const next = planEnemyMove(ENEMIES.goblin!, field, createRng(1), {
      reservedCells: queued.cells.map(({ x, y }) => [x, y] as const),
      previousMove: { kind: 'attack', name: 'Stab', power: 4 },
    });
    expect(next).toMatchObject({ intent: 'attack', fallback: true });
    expect(frozenObstructionStillLegal(queued, field)).toBe(true);
  });
});

describe('frozen footprint safety', () => {
  it('rejects occupied, tagged, active, sealed, out-of-bounds and invalid-strength targets', () => {
    const field = board();
    field.grid[19]![0] = 'blue';
    field.tags[19]![1] = 'spore';
    field.active!.y = 5;
    field.seal = { column: 8, pieces: 2 };
    for (const move of [
      packet(0, 19),
      packet(1, 19),
      packet(3, 6),
      packet(8, 19),
      packet(-1, 19),
      packet(10, 19),
      packet(2, 2),
      packet(2, 20),
      packet(2, 19, 0),
      packet(2, 19, 4),
    ])
      expect(frozenObstructionStillLegal(move, field), JSON.stringify(move)).toBe(false);
  });

  it('rejects an empty template and duplicate packet cells', () => {
    const field = board();
    expect(
      frozenObstructionStillLegal({ kind: 'obstruct', name: 'Template', cells: [] }, field),
    ).toBe(false);
    expect(
      frozenObstructionStillLegal(
        {
          kind: 'obstruct',
          name: 'Duplicate',
          cells: [
            { x: 2, y: 19, strength: 1 },
            { x: 2, y: 19, strength: 1 },
          ],
        },
        field,
      ),
    ).toBe(false);
  });

  it('does not complete a row or gift a new clear on the current piece landing', () => {
    const field = board();
    field.grid[19] = Array.from({ length: 10 }, (_, x) => (x === 4 ? null : 'blue'));
    expect(frozenObstructionStillLegal(packet(4, 19), field)).toBe(false);
    field.grid[19] = Array.from({ length: 10 }, (_, x) => (x < 5 ? null : 'blue'));
    field.active!.x = 0;
    expect(frozenObstructionStillLegal(packet(4, 19), field)).toBe(false);
  });

  it('keeps one legal gap across a whole packet, not merely cell-by-cell', () => {
    const field = board();
    field.active = null;
    field.grid[19] = Array.from({ length: 10 }, (_, x) => (x < 2 ? null : 'blue'));
    expect(
      frozenObstructionStillLegal(
        {
          kind: 'obstruct',
          name: 'No gap',
          cells: [
            { x: 0, y: 19, strength: 1 },
            { x: 1, y: 19, strength: 1 },
          ],
        },
        field,
      ),
    ).toBe(false);
  });

  it('is reproducible and never mutates board/RNG-independent authored content over 200 cases', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const field = seed % 2 ? well(seed % 10, 12 + (seed % 6)) : board();
      const enemy = seed % 2 ? ENEMIES.goblin! : ENEMIES.slime!;
      const before = JSON.stringify([field.magicState(), field.active, enemy]);
      const a = planEnemyMove(enemy, field, createRng(seed));
      const b = planEnemyMove(enemy, field, createRng(seed));
      expect(a).toEqual(b);
      expect(JSON.stringify([field.magicState(), field.active, enemy])).toBe(before);
      if (a.move.kind === 'obstruct') expect(frozenObstructionStillLegal(a.move, field)).toBe(true);
    }
  });
});

describe('authored move compatibility', () => {
  it('keeps the conversion signature but emits a non-executable profile template, not fixed stones', () => {
    const slime = boardMagicEnemy(ENEMIES.slime!, 10, 20);
    expect(slime.moves.find((move) => move.kind === 'obstruct')).toMatchObject({
      name: 'Sticky Goo',
      cells: [],
    });
    expect(ENEMIES.slime!.moves.some((move) => move.kind === 'obstruct')).toBe(false);
    expect(boardMagicEnemy(ENEMIES.moonWyrm!, 10, 20)).toBe(ENEMIES.moonWyrm);
    expect(boardMagicEnemy(ENEMIES.shroom!, 10, 20)).toBe(ENEMIES.shroom);
  });

  it('leaves other authored moves and boss selection policy unchanged by default', () => {
    const heal: EnemyMove = { kind: 'heal', name: 'Glimmer', amount: 12 };
    const other = { ...ENEMIES.shroom!, moves: [heal] };
    expect(planEnemyMove(other, board(), createRng(1), { enemyHp: other.hp }).move).toEqual(heal);
    const boss = { ...other, boss: true };
    expect(
      planEnemyMove(boss, board(), createRng(1), { enemyHp: boss.hp, filterLegacy: true }).move,
    ).toEqual(heal);
  });

  it('filters known no-op utilities only when explicitly asked', () => {
    const field = board();
    const options = { enemyHp: 58, heroMana: 0, fogPieces: 4, hastePieces: 4, quickenMs: 5000 };
    const useless: EnemyMove[] = [
      { kind: 'heal', name: 'Heal', amount: 5 },
      { kind: 'drain', name: 'Drain', mana: 4 },
      { kind: 'fog', name: 'Fog', pieces: 3 },
      { kind: 'haste', name: 'Haste', pieces: 3 },
      { kind: 'quicken', name: 'Quicken', ms: 4000 },
      { kind: 'petrify', name: 'Stone', cells: 2 },
    ];
    for (const move of useless)
      expect(legacyMoveUseful(move, field, options, ENEMIES.slime)).toBe(false);
    const other = {
      ...ENEMIES.slime!,
      id: 'unprofiled',
      moves: [...useless, { kind: 'attack' as const, name: 'Bounce', power: 3 }],
    };
    expect(
      planEnemyMove(other, field, createRng(1), { ...options, filterLegacy: true }).move.kind,
    ).toBe('attack');
    field.grid[19]![0] = 'green';
    expect(legacyMoveUseful(useless[5]!, field)).toBe(true);
  });
});
