/**
 * The encounter table (docs/ENCOUNTER_DESIGN.md §5.3): every built
 * encounter against every bot, at strain 0 (first try) and strain 2 (the
 * floor), with 95% intervals. Skipped unless ENCOUNTERS is set: run it
 * with `npm run sim ENCOUNTERS=all` (or a comma-separated list of ids);
 * RUNS seeds per cell (default 200); SIM_OUT=file also writes the table.
 */
import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { ENCOUNTER_DEFS } from '../../src/data/encounters';
import { measureEncounter, type Bot, type Cell } from './encounters';

/** Each encounter's band row and the hero level it is met at. */
const BANDS: Readonly<Record<string, { band: string; level: number }>> = {
  elder: { band: 'Mossvale', level: 1 },
  kid: { band: 'Mossvale', level: 1 },
  farmer: { band: 'Mossvale', level: 1 },
  stallKeeper: { band: 'Haggle', level: 1 },
  forager: { band: 'Grove', level: 3 },
  guard: { band: 'Threshold', level: 2 },
};

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;
const show = (c: Cell): string =>
  `${pct(c.winRate)} [${(c.lower * 100).toFixed(1)}, ${(c.upper * 100).toFixed(1)}]`;

describe.skipIf(!process.env.ENCOUNTERS)('encounter table (npm run sim ENCOUNTERS=…)', () => {
  it('prints every encounter against every bot', () => {
    const runs = Number(process.env.RUNS ?? 200);
    const only = process.env.ENCOUNTERS === 'all' ? null : process.env.ENCOUNTERS!.split(',');
    const bots: Bot[] = ['good', 'casual', 'dropper', 'idle'];
    const rows = [
      '| Encounter | Band | Good | Casual | Dropper | Idle | Good, strain 2 | Casual, strain 2 | Good: time / pieces | Great (good) | Mean price (good / casual / dropper / idle) | Good fail causes |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ];
    for (const id of Object.keys(ENCOUNTER_DEFS)) {
      if (only && !only.includes(id)) continue;
      const { band, level } = BANDS[id]!;
      const cells = bots.map((bot) => measureEncounter(id, bot, runs, 0, level));
      const good2 = measureEncounter(id, 'good', runs, 2, level);
      const casual2 = measureEncounter(id, 'casual', runs, 2, level);
      if (process.env.SIM_JSON)
        appendFileSync(process.env.SIM_JSON, JSON.stringify({ id, cells, good2, casual2 }) + '\n');
      const [good] = cells as [Cell];
      const causes = Object.entries(good.causes)
        .filter(([cause]) => cause !== 'won')
        .map(([cause, n]) => `${cause} ${n}`)
        .join(', ');
      const prices = id === 'stallKeeper' ? cells.map((c) => pct(c.price)).join(' / ') : '—';
      rows.push(
        `| ${id} | ${band} | ${cells.map(show).join(' | ')} | ${show(good2)} | ${show(casual2)} | ${good.seconds.toFixed(0)} s / ${good.pieces.toFixed(0)} | ${pct(good.greatRate)} | ${prices} | ${causes || '—'} |`,
      );
      process.stderr.write(rows.at(-1) + '\n');
      if (process.env.SIM_OUT) writeFileSync(process.env.SIM_OUT, rows.join('\n') + '\n');
    }
    const table = rows.join('\n') + '\n';
    process.stderr.write(table);
    if (process.env.SIM_OUT) writeFileSync(process.env.SIM_OUT, table);
  }, 7_200_000);
});
