/**
 * The M1 table (docs/ENCOUNTER_DESIGN.md §5.3 and its Author decisions):
 * every built encounter, Hazel's lessons and the grove's fights against
 * every bot, first try, plus the strain floor, with 95% intervals.
 * Skipped unless ENCOUNTERS is set: run it with `npm run sim
 * ENCOUNTERS=all` (or a comma-separated list of rows: encounter ids,
 * `guard+assist`, `lesson:hazel:1`, `fight:sproutling`…); RUNS seeds per
 * cell (default 200); SIM_OUT=file also writes the table.
 */
import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { STAKES } from '../../src/data/balance';
import { measureCell, type Bot, type Cell } from './encounters';

/** Every row: its band's name and the strain its floor is checked at. */
const ROWS: readonly { name: string; band: string; floor?: number; assisted?: boolean }[] = [
  { name: 'elder', band: 'Mossvale', floor: STAKES.strainMax },
  { name: 'kid', band: 'Mossvale (Pip: 20–40 s)', floor: STAKES.strainMax },
  { name: 'farmer', band: 'Mossvale', floor: STAKES.strainMax },
  { name: 'stallKeeper', band: 'Haggle', floor: STAKES.strainMax },
  { name: 'forager', band: 'Grove', floor: STAKES.strainMax },
  { name: 'guard', band: 'Threshold', floor: STAKES.thresholdStrainMax },
  { name: 'guard+assist', band: 'Threshold, assisted', assisted: true },
  { name: 'lesson:hazel:1', band: 'Lesson d1' },
  { name: 'lesson:hazel:2', band: 'Lesson d2' },
  { name: 'lesson:hazel:3', band: 'Lesson d3' },
  { name: 'fight:sproutling', band: 'Grove fight' },
  { name: 'fight:leafSprite', band: 'Grove fight' },
  { name: 'fight:thornTroll', band: 'Grove fight' },
];

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;
const show = (c: Cell): string =>
  `${(100 * c.winRate).toFixed(1)}% [${(100 * c.lower).toFixed(1)}, ${(100 * c.upper).toFixed(1)}]`;

describe.skipIf(!process.env.ENCOUNTERS)('M1 table (npm run sim ENCOUNTERS=…)', () => {
  it('prints every row against every bot', () => {
    const runs = Number(process.env.RUNS ?? 200);
    const only = process.env.ENCOUNTERS === 'all' ? null : process.env.ENCOUNTERS!.split(',');
    const bots: Bot[] = ['good', 'casual', 'beginner', 'dropper', 'idle'];
    const rows = [
      '| Row | Band | Good | Casual | Beginner | Dropper | Idle | Good, floor strain | Casual, floor strain | Good: time / pieces | Great (good) | Mean price (good / casual / dropper / idle) | Good fail causes |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ];
    for (const row of ROWS) {
      if (only && !only.includes(row.name)) continue;
      const name = row.name.replace('+assist', '');
      // Assistance is offered after two fails; cellTarget clears strain just like the game.
      const strain = row.assisted ? STAKES.thresholdStrainMax : 0;
      const opts = { strain, assisted: row.assisted ?? false };
      const cells = bots.map((bot) => measureCell(name, bot, runs, opts));
      const floors =
        row.floor === undefined
          ? null
          : ['good', 'casual'].map((bot) =>
              measureCell(name, bot as Bot, runs, { strain: row.floor }),
            );
      const floor = (bot: Bot): string => (floors ? show(floors[bot === 'good' ? 0 : 1]!) : '—');
      if (process.env.SIM_JSON)
        appendFileSync(process.env.SIM_JSON, JSON.stringify({ row, cells, floors }) + '\n');
      const [good] = cells as [Cell];
      const causes = Object.entries(good.causes)
        .filter(([cause]) => cause !== 'won')
        .map(([cause, n]) => `${cause} ${n}`)
        .join(', ');
      const prices =
        name === 'stallKeeper' ? [0, 1, 3, 4].map((i) => pct(cells[i]!.price)).join(' / ') : '—';
      const label = row.floor === undefined ? row.name : `${row.name} (floor s${row.floor})`;
      rows.push(
        `| ${label} | ${row.band} | ${cells.map(show).join(' | ')} | ${floor('good')} | ${floor('casual')} | ${good.seconds.toFixed(0)} s / ${good.pieces.toFixed(0)} | ${pct(good.greatRate)} | ${prices} | ${causes || '—'} |`,
      );
      process.stderr.write(rows.at(-1) + '\n');
      if (process.env.SIM_OUT) writeFileSync(process.env.SIM_OUT, rows.join('\n') + '\n');
    }
    const table = rows.join('\n') + '\n';
    process.stderr.write(table);
    if (process.env.SIM_OUT) writeFileSync(process.env.SIM_OUT, table);
  }, 7_200_000);
});
