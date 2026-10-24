/**
 * The whole game's balance table: every region's monsters at the hero level
 * they are meant to be met at, the Moon Wyrm, and mentor lessons, against
 * every bot. Skipped unless SIM is set; run it with `npm run sim` (RUNS
 * seeds per cell, default 12; SIM_OUT=file also writes the table there;
 * PACE=ms per piece, default 1500, the keyboard pace (touch players take
 * about 2200); AREAS=comma-separated map ids and/or `lessons` limits the rows).
 * The balance pass tunes `src/data/balance.ts` and `src/data/enemies.ts`
 * against the "Balance targets" in docs/GAME_DESIGN.md.
 */
import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { REGIONS } from '../../src/data/balance';
import { ENEMIES } from '../../src/data/enemies';
import { MAPS } from '../../src/data/maps';
import type { ChallengeSpec } from '../../src/data/types';
import { economy } from './economy';
import { FULL_KIT, measure } from './simulate';

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

/** One table row: the same fight for every bot. */
function row(area: string, name: string, level: number, spec: ChallengeSpec, runs: number) {
  const pace = Number(process.env.PACE ?? 1500);
  const good = measure(spec, level, 'good', runs, 'ranger', [], pace);
  const goodKit = measure(spec, level, 'good', runs, 'ranger', FULL_KIT, pace);
  const prepared = measure(spec, level, 'prepared', runs, 'ranger', [], pace);
  const preparedKit = measure(spec, level, 'prepared', runs, 'ranger', FULL_KIT, pace);
  const singles = measure(spec, level, 'spammer', runs, 'ranger', [], pace);
  const sloppy = measure(spec, level, 'sloppy', runs, 'ranger', [], pace);
  const cells = [
    area,
    name,
    level,
    pct(good.winRate),
    pct(goodKit.winRate),
    pct(prepared.winRate),
    pct(preparedKit.winRate),
    pct(singles.winRate),
    pct(sloppy.winRate),
    `${good.seconds.toFixed(0)} s / ${good.pieces.toFixed(0)}`,
    pct(good.hpLeft),
  ];
  return `| ${cells.join(' | ')} |`;
}

describe.skipIf(!process.env.SIM)('whole-game balance table (npm run sim)', () => {
  it('prints every fight against every bot', () => {
    const runs = Number(process.env.RUNS ?? 12);
    const rows = [
      '| Area | Fight | Hero Lv | Good (starter spells) | Good (full kit) | Prepared | Prepared (full kit) | Singles + spells | Sloppy | Good: time / pieces | Good: HP left |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ];
    const only = process.env.AREAS?.split(',');
    for (const id of Object.keys(REGIONS)) {
      if (only && !only.includes(id)) continue;
      const map = MAPS[id]!;
      const foes = [
        ...new Set(map.entities.flatMap((e) => (e.kind === 'monster' ? [e.enemyId] : []))),
      ];
      for (const enemyId of foes) {
        const enemy = ENEMIES[enemyId]!;
        rows.push(row(map.name, enemy.name, enemy.level, { kind: 'combat', enemyId }, runs));
      }
    }
    const lessons = [
      ['torva', 'emberWisp', 'fire'],
      ['maren', 'tideWisp', 'blizzard'],
      ['kestrel', 'galeWisp', 'gale'],
    ] as const;
    for (const [difficulty, level] of (only && !only.includes('lessons')
      ? []
      : [
          [1, 1],
          [2, 3],
          [3, 5],
        ]) as readonly (readonly [number, number])[]) {
      for (const [mentorId, enemyId, spellId] of lessons) {
        const spec = { kind: 'lesson', mentorId, enemyId, spellId, difficulty } as const;
        rows.push(row('Lesson', `${ENEMIES[enemyId]!.name} d${difficulty}`, level, spec, runs));
      }
    }
    const table = rows.join('\n') + '\n';
    process.stderr.write(table);
    if (process.env.SIM_OUT) writeFileSync(process.env.SIM_OUT, table);
  }, 3_600_000);

  it('prints the one-pass economy and level curve', () => {
    const rows = [
      '| Area | Hero Lv entering | XP gained | Gil in | Gil spent | Gil left at exit | Still wanted |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      ...economy(Object.keys(REGIONS)).map(
        (r) =>
          `| ${r.area} | ${r.levelIn} | ${r.xp} | ${r.gilIn} | ${r.spent} | ${r.left} | ${r.wanted.join(', ') || '—'} |`,
      ),
    ];
    const table = rows.join('\n') + '\n';
    process.stderr.write(table);
    if (process.env.SIM_OUT) writeFileSync(`${process.env.SIM_OUT}.economy.md`, table);
  });
});
