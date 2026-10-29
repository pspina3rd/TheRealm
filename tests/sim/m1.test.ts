/** Extended M1 cells: M1_SIM=1 RUNS=200 npx vitest run tests/sim/m1.test.ts. */
import { appendFileSync, writeFileSync } from 'node:fs';
import { newGame } from '../../src/world/state';
import { MENTORS } from '../../src/data/mentors';
import { lessonsFor } from '../../src/game/lessons';
import { describe, expect, it } from 'vitest';
import type { ChallengeSpec } from '../../src/data/types';
import type { Element } from '../../src/core/elements';
import type { Landing } from '../../src/core/landing';
import {
  interval,
  cellTarget,
  measureBattle,
  playEncounter,
  summarize,
  type Bot,
  type Cell,
} from './encounters';

it('reports finite Wilson bounds for zero and all wins', () => {
  expect(interval(0, 200).lower).toBe(0);
  expect(interval(0, 200).upper).toBeCloseTo(0.01885, 4);
  expect(interval(200, 200).lower).toBeCloseTo(0.98115, 4);
  expect(interval(200, 200).upper).toBe(1);
});

it('clears assisted threshold strain like the production offer', () => {
  expect(cellTarget('guard', 1, true).spec).toMatchObject({
    strain: 0,
    assisted: true,
    demo: false,
  });
  expect(cellTarget('guard', 1, false).spec).toMatchObject({ strain: 1, assisted: false });
});

it('uses an actually offered first Hazel lesson for the default class', () => {
  const { spec } = cellTarget('lesson:hazel:1');
  if (spec.kind !== 'lesson') throw new Error('Expected lesson');
  const state = newGame(process.env.CLASS ?? 'ranger');
  expect(lessonsFor(state, MENTORS.hazel!)).toContainEqual(
    expect.objectContaining({ spellId: spec.spellId, difficulty: 1 }),
  );
});

const pct = (n: number): string => (n * 100).toFixed(1);
const show = (c: Cell): string => `${pct(c.winRate)}% [${pct(c.lower)}, ${pct(c.upper)}]`;
const runs = Number(process.env.RUNS ?? 200);
const output = process.env.M1_OUT ?? '/tmp/m1-extended-200.md';
const bots: Bot[] = ['good', 'casual', 'dropper', 'idle'];
const rows: { id: string; spec: ChallengeSpec; level: number }[] = [
  { id: 'grove:sproutling', spec: { kind: 'combat', enemyId: 'sproutling' }, level: 2 },
  { id: 'grove:leafSprite', spec: { kind: 'combat', enemyId: 'leafSprite' }, level: 3 },
  { id: 'grove:thornTroll', spec: { kind: 'combat', enemyId: 'thornTroll' }, level: 4 },
  {
    id: 'guard:strain1',
    spec: { kind: 'encounter', id: 'guard', strain: 1, demo: false, assisted: false },
    level: 2,
  },
  ...(
    [
      ['d1', 'regen', 1, 2],
      ['d2', 'cure', 2, 3],
      ['d3', 'cure', 3, 5],
      ['hidden', 'bloom', 2, 5],
    ] as const
  ).map(([label, spellId, difficulty, level]) => ({
    id: `hazel:${label}`,
    spec: { kind: 'lesson', mentorId: 'hazel', enemyId: 'mossWisp', spellId, difficulty } as const,
    level,
  })),
];

describe.skipIf(!process.env.M1_SIM)('extended M1 balance cells', () => {
  it('prints Hazel and grove cells plus assisted Vale within three tries', () => {
    const only = process.env.M1_ONLY?.split(',');
    writeFileSync(
      output,
      '| Cell | Good (95% Wilson) | Casual | Dropper | Idle | Good seconds / pieces | Good fail causes |\n| --- | --- | --- | --- | --- | --- | --- |\n',
    );
    for (const row of rows) {
      if (only && !only.includes(row.id)) continue;
      const cells = bots.map((bot) =>
        measureBattle(row.id, row.spec, bot, runs, row.level, { rule: 'spores' }),
      );
      const good = cells[0]!;
      const causes = Object.entries(good.causes)
        .map(([cause, n]) => `${cause}:${n}`)
        .join(', ');
      const line = `| ${row.id} (Lv ${row.level}) | ${cells.map(show).join(' | ')} | ${good.seconds.toFixed(1)} s / ${good.pieces.toFixed(1)} | ${causes} |\n`;
      appendFileSync(output, line);
      if (process.env.M1_JSON)
        appendFileSync(process.env.M1_JSON, JSON.stringify({ row, cells }) + '\n');
      process.stderr.write(line);
    }
    if (!only || only.includes('guard:assisted')) {
      const outcomes = Array.from({ length: runs }, (_, seed) => {
        let result = playEncounter(
          { kind: 'encounter', id: 'guard', strain: 0, demo: false, assisted: true },
          'casual',
          (seed + 1) * 7919 + 13,
          2,
        );
        let seconds = result.seconds;
        let pieces = result.pieces;
        for (let attempt = 1; attempt < 3 && !result.won; attempt++) {
          result = playEncounter(
            { kind: 'encounter', id: 'guard', strain: 0, demo: false, assisted: true },
            'casual',
            (seed + 1) * 7919 + 13 + attempt * 104729,
            2,
          );
          seconds += result.seconds;
          pieces += result.pieces;
        }
        return { ...result, seconds, pieces };
      });
      const cell = summarize('guard:assisted-within3', 'casual', 0, outcomes);
      appendFileSync(output, `| Assisted Vale within 3 | — | ${show(cell)} | — | — | — | — |\n`);
      if (process.env.M1_JSON)
        appendFileSync(process.env.M1_JSON, JSON.stringify({ assisted: cell }) + '\n');
      process.stderr.write(`Assisted Vale within 3: ${show(cell)}\n`);
    }
  }, 7_200_000);
});

/** Parameter-only probes; never change production data on disk. */
describe.skipIf(!process.env.M1_EXPERIMENT)('Vale parameter probes', () => {
  it('reports assisted casual within-three under paired seeds', async () => {
    const { ENCOUNTER_DEFS } = await import('../../src/data/encounters');
    const { STAKES } = await import('../../src/data/balance');
    const { ChargeChallenge } = await import('../../src/battle/verbs/charge');
    // Isolated diagnostic for a hint that forgets already-completed colors.
    const prototype = ChargeChallenge.prototype as unknown as {
      elements(): Element[];
      nextLamp(element: Element): number;
      hint(landing: Landing): number;
    };
    const originalElements = prototype.elements;
    const originalHint = prototype.hint;
    const holePenalty = Number(process.env.M1_HINT_HOLES ?? 0);
    if (holePenalty > 0)
      prototype.hint = function (landing) {
        let holes = 0;
        for (let x = 0; x < (landing.grid[0]?.length ?? 0); x++) {
          let covered = false;
          for (const row of landing.grid) {
            if (row[x] !== null) covered = true;
            else if (covered) holes++;
          }
        }
        return originalHint.call(this, landing) - holePenalty * holes;
      };
    if (process.env.M1_HINT_FILTER)
      prototype.elements = function () {
        return originalElements.call(this).filter((element) => this.nextLamp(element) >= 0);
      };
    const def = ENCOUNTER_DEFS.guard!.spec;
    if (def.verb !== 'charge') throw new Error('Vale must use CHARGE');
    const holder = def as { params: typeof def.params };
    const original = holder.params;
    const variants = [
      { name: 'baseline', purity: 7, snuffEvery: 14, pieceLimit: 36 },
      { name: 'no-wind', purity: 7, snuffEvery: 0, pieceLimit: 36 },
      { name: 'purity6', purity: 6, snuffEvery: 14, pieceLimit: 36 },
      { name: 'purity5', purity: 5, snuffEvery: 14, pieceLimit: 36 },
      { name: 'purity6-longwind', purity: 6, snuffEvery: 20, pieceLimit: 36 },
      { name: 'purity5-longwind', purity: 5, snuffEvery: 20, pieceLimit: 36 },
      { name: 'purity5-no-wind', purity: 5, snuffEvery: 0, pieceLimit: 36 },
      { name: 'purity6-morepieces', purity: 6, snuffEvery: 20, pieceLimit: 48 },
      { name: 'purity5-morepieces', purity: 5, snuffEvery: 20, pieceLimit: 48 },
    ];
    const path = process.env.M1_OUT ?? '/tmp/m1-vale-probes.md';
    writeFileSync(
      path,
      `All four lamps preserved; assist toss ${(STAKES.assistToss * 100).toFixed(0)}%; ${runs} paired seed groups, up to three assisted casual attempts. No production edits. Filter completed colors: ${Boolean(process.env.M1_HINT_FILTER)}; hole penalty: ${holePenalty}.\n\n| Variant | Purity | Snuff every | Piece limit | Win (Wilson 95%) | Final fail causes |\n| --- | --- | --- | --- | --- | --- |\n`,
    );
    try {
      for (const variant of variants) {
        if (process.env.M1_ONLY && !process.env.M1_ONLY.split(',').includes(variant.name)) continue;
        holder.params = {
          ...original,
          purity: variant.purity,
          snuffEvery: variant.snuffEvery,
          pieceLimit: variant.pieceLimit,
        };
        const outcomes = Array.from({ length: runs }, (_, seed) => {
          let result = playEncounter(
            { kind: 'encounter', id: 'guard', strain: 0, demo: false, assisted: true },
            'casual',
            (seed + 1) * 7919 + 13,
            2,
          );
          for (let attempt = 1; attempt < 3 && !result.won; attempt++)
            result = playEncounter(
              { kind: 'encounter', id: 'guard', strain: 0, demo: false, assisted: true },
              'casual',
              (seed + 1) * 7919 + 13 + attempt * 104729,
              2,
            );
          return result;
        });
        const cell = summarize(variant.name, 'casual', 0, outcomes);
        appendFileSync(
          path,
          `| ${variant.name} | ${variant.purity} | ${variant.snuffEvery} | ${variant.pieceLimit} | ${show(cell)} | ${JSON.stringify(cell.causes)} |\n`,
        );
        if (process.env.M1_JSON)
          appendFileSync(
            process.env.M1_JSON,
            JSON.stringify({
              variant,
              filterCompleted: Boolean(process.env.M1_HINT_FILTER),
              holePenalty,
              cell,
            }) + '\n',
          );
      }
    } finally {
      holder.params = original;
      prototype.elements = originalElements;
      prototype.hint = originalHint;
    }
  }, 7_200_000);
});

describe.skipIf(!process.env.M1_LEGACY_COMBAT)('grove approved combat-policy check', () => {
  it('runs the original corrected good combat bot with spores at touch pace', async () => {
    const { heroAt, simulate } = await import('./simulate');
    const path = process.env.M1_OUT ?? '/tmp/m1-grove-legacy-good-200.md';
    writeFileSync(
      path,
      '| Grove foe | Original good policy (Wilson 95%) | Seconds / pieces | Endings |\n| --- | --- | --- | --- |\n',
    );
    for (const [enemyId, level] of [
      ['sproutling', 2],
      ['leafSprite', 3],
      ['thornTroll', 4],
    ] as const) {
      const outcomes = Array.from({ length: runs }, (_, seed) => {
        const result = simulate(
          { kind: 'combat', enemyId },
          heroAt(level),
          'good',
          (seed + 1) * 7919,
          2200,
          600_000,
          { rule: 'spores' },
        );
        return {
          won: result.won,
          ending: result.won
            ? ('won' as const)
            : result.stopReason === 'timeout'
              ? ('timeout' as const)
              : ('lost' as const),
          seconds: result.ms / 1000,
          pieces: result.pieces,
          cause: result.stopReason,
          great: false,
          price: 1,
        };
      });
      const cell = summarize(enemyId, 'good', 0, outcomes);
      appendFileSync(
        path,
        `| ${enemyId} (Lv ${level}) | ${show(cell)} | ${cell.seconds.toFixed(1)} s / ${cell.pieces.toFixed(1)} | ${JSON.stringify(cell.causes)} |\n`,
      );
      if (process.env.M1_JSON)
        appendFileSync(process.env.M1_JSON, JSON.stringify({ enemyId, level, cell }) + '\n');
    }
  }, 7_200_000);
});
