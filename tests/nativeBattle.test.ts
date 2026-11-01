import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { NATIVE_SCHOOLS } from '../src/nativeBattle';

type State = {
  pieceID: number;
  ready: boolean;
  paused: boolean;
  status: string;
  active: { x: number; y: number; cells: number[][] };
  enemyRemainingMs: number;
  spells: { id: string; rank: number; mana: number }[];
};
function engine() {
  const context = vm.createContext({});
  vm.runInContext(
    readFileSync('ios/ManaCrystalsPlaytest/Engine/battle-engine.js', 'utf8'),
    context,
  );
  return (request: Record<string, unknown>) =>
    JSON.parse(context.ManaCrystalsNative.dispatch(JSON.stringify(request))) as {
      ok: boolean;
      state: State;
      error?: string;
    };
}

describe('bundled native battle boundary', () => {
  it('loads without browser globals and starts with zero spells and no running timer', () => {
    const send = engine();
    const initial = send({ type: 'start', seed: 73 });
    expect(initial.ok).toBe(true);
    expect(initial.state.spells).toEqual([]);
    expect(initial.state.ready).toBe(true);
    expect(initial.state.paused).toBe(true);
    expect(send({ type: 'step', ms: 10000 }).state).toEqual(initial.state);
  });
  it.each(NATIVE_SCHOOLS.filter((s) => s !== 'none'))(
    'preserves all four learned ranks of %s without free mana',
    (school) => {
      const send = engine();
      for (let rank = 1; rank <= 4; rank++) {
        const reply = send({ type: 'start', school, rank, seed: 73 });
        expect(reply.ok).toBe(true);
        expect(reply.state.spells).toHaveLength(1);
        expect(reply.state.spells[0]).toMatchObject({ id: school, rank, mana: 0 });
      }
    },
  );
  it('rejects old-piece input after a drop and ignores paused input', () => {
    const send = engine(),
      first = send({ type: 'start', seed: 73 }).state;
    send({ type: 'begin' });
    const next = send({ type: 'input', action: 'hardDrop', pieceID: first.pieceID }).state;
    expect(next.pieceID).not.toBe(first.pieceID);
    expect(send({ type: 'input', action: 'left', pieceID: first.pieceID }).state.active).toEqual(
      next.active,
    );
    const paused = send({ type: 'pause', paused: true }).state;
    expect(send({ type: 'input', action: 'rotate', pieceID: paused.pieceID }).state.active).toEqual(
      paused.active,
    );
    expect(send({ type: 'step', ms: 10000 }).state.enemyRemainingMs).toBe(paused.enemyRemainingMs);
  });
  it('rejects unsupported prototype modes and malformed input without destroying the battle', () => {
    const send = engine(),
      first = send({ type: 'start', seed: 73 }).state;
    for (const request of [
      { type: 'start', school: 'shadow' },
      { type: 'start', rank: 5 },
      { type: 'step', ms: -1 },
      { type: 'input', action: 'teleport' },
    ])
      expect(send(request).ok).toBe(false);
    expect(send({ type: 'snapshot' }).state).toEqual(first);
  });
});

// The native shim must retain engine metadata and cannot share mutable preview state.
describe('native data cloning', () => {
  it('clones cycles, optional values, maps and sets without JSON flattening', async () => {
    const { nativeClone } = await import('../src/core/nativeClone');
    const data: { optional: undefined; values: Map<string, Set<number>>; self?: unknown } = {
      optional: undefined,
      values: new Map([['colors', new Set([1, 2])]]),
    };
    data.self = data;
    const copy = nativeClone(data);
    expect(copy).not.toBe(data);
    expect(copy.self).toBe(copy);
    expect(Object.hasOwn(copy, 'optional')).toBe(true);
    expect(copy.values).not.toBe(data.values);
    expect(copy.values.get('colors')).toEqual(new Set([1, 2]));
  });
});
