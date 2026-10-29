/** Explicitly opt-in balance probes. These change isolated test memory, never production data. */
import { appendFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import type { BuildChallenge } from '../../src/battle/verbs/build';
import { ENCOUNTER_DEFS } from '../../src/data/encounters';
import { measureCell, type Bot } from './encounters';

const output = process.env.PROBE_OUT ?? '/tmp/m1-open-probes.jsonl';
describe.skipIf(!process.env.OPEN_PROBE)('open M1 balance probes', () => {
  it('measures tolerance of an otherwise finished tower with a few allowed internal cracks', () => {
    if (process.env.OPEN_PROBE !== 'pip') return;
    for (const limit of [1, 2, 3, 4]) {
      const def = ENCOUNTER_DEFS.kid!.spec;
      if (def.verb !== 'build') throw new Error('Pip builds');
      const original = def.params;
      Object.assign(def, { params: { ...original, crackLimit: limit } });
      try {
        for (const bot of ['good', 'casual'] as Bot[]) {
          const cell = measureCell('kid', bot, Number(process.env.RUNS ?? 50), {
            tweak(battle) {
              const build = battle.challenge as BuildChallenge;
              const status = build.status.bind(build);
              build.status = () => {
                if (
                  build.cracks > limit ||
                  build.wobbles > original.wobbleLimit ||
                  battle.board.toppedOut
                )
                  return 'lost';
                const closed = battle.board.grid.every((row, y) =>
                  row.every(
                    (cell, x) =>
                      !build.inOutline(x, y) ||
                      cell !== null ||
                      battle.board.grid.slice(0, y).some((above) => above[x] !== null),
                  ),
                );
                return closed ? 'won' : status();
              };
            },
          });
          appendFileSync(
            output,
            JSON.stringify({ kind: 'pip-crack-tolerance', limit, cell }) + '\n',
          );
        }
      } finally {
        Object.assign(def, { params: original });
      }
    }
  }, 600000);
  it('compares open, tileable well layouts without changing the teaching verb', () => {
    if (process.env.OPEN_PROBE !== 'rowan') return;
    const layouts = [
      ['mm..mm', 'mm..mm', 'm...mm', 'm...mm', 'mmP..m'],
      ['mm..mm', 'mm..mm', 'm...mm', 'm...mm', 'mm...m', 'mm...m', 'mmP..m'],
      ['mm..mm', 'mm..mm', 'm...mm', 'm...mm', 'mmm..m', 'mm...m', 'mm...m', 'mmP..m'],
    ];
    const def = ENCOUNTER_DEFS.elder!.spec;
    if (def.verb !== 'dig') throw new Error('Rowan digs');
    const original = def.params;
    try {
      for (const rows of layouts) {
        Object.assign(def, { params: { ...original, rows } });
        for (const bot of ['good', 'casual'] as Bot[]) {
          const cell = measureCell('elder', bot, Number(process.env.RUNS ?? 50));
          appendFileSync(output, JSON.stringify({ kind: 'well-layout', rows, cell }) + '\n');
        }
      }
    } finally {
      Object.assign(def, { params: original });
    }
  }, 600000);
  it('compares a bounded set of repair blocks after Pip’s original queue', () => {
    if (process.env.OPEN_PROBE !== 'pip-queue') return;
    const def = ENCOUNTER_DEFS.kid!.spec;
    if (def.verb !== 'build') throw new Error('Pip builds');
    const original = def.params;
    try {
      for (const extra of [['I'], ['O'], ['I', 'O'], ['I', 'O', 'O']] as const) {
        Object.assign(def, { params: { ...original, queue: [...original.queue, ...extra] } });
        for (const bot of ['good', 'casual'] as Bot[]) {
          const cell = measureCell('kid', bot, Number(process.env.RUNS ?? 50));
          appendFileSync(output, JSON.stringify({ kind: 'pip-repair-queue', extra, cell }) + '\n');
        }
      }
    } finally {
      Object.assign(def, { params: original });
    }
  }, 600000);
  it('compares restored top ring rows with the tuned budget', () => {
    if (process.env.OPEN_PROBE !== 'wren') return;
    const def = ENCOUNTER_DEFS.forager!.spec;
    if (def.verb !== 'contain') throw new Error('Wren contains');
    const original = def.params;
    try {
      for (const extra of [['on.nononon'], ['on.nononon', 'nononon.no']]) {
        Object.assign(def, { params: { ...original, rows: [...extra, ...original.rows] } });
        for (const bot of ['good', 'casual'] as Bot[]) {
          const cell = measureCell('forager', bot, Number(process.env.RUNS ?? 50));
          appendFileSync(output, JSON.stringify({ kind: 'wren-duration', extra, cell }) + '\n');
        }
      }
    } finally {
      Object.assign(def, { params: original });
    }
  }, 600000);
  it('compares a deeper rot root, keeping the first five ring rows intact', () => {
    if (process.env.OPEN_PROBE !== 'wren-root') return;
    const def = ENCOUNTER_DEFS.forager!.spec;
    if (def.verb !== 'contain') throw new Error('Wren contains');
    const original = def.params;
    try {
      for (const [pieceLimit, spreadEvery] of [
        [40, 5],
        [44, 5],
        [40, 6],
      ]) {
        Object.assign(def, {
          params: { ...original, rows: [...original.rows, 'Rnon..nonR'], pieceLimit, spreadEvery },
        });
        for (const bot of ['good', 'casual'] as Bot[]) {
          const cell = measureCell('forager', bot, Number(process.env.RUNS ?? 50));
          appendFileSync(
            output,
            JSON.stringify({ kind: 'wren-root', pieceLimit, spreadEvery, cell }) + '\n',
          );
        }
      }
    } finally {
      Object.assign(def, { params: original });
    }
  }, 600000);
});
