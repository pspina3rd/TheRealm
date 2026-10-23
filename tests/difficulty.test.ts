import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/data/enemies';
import { measure, simulate, heroAt } from './sim/simulate';

const ORDINARY = ['slime', 'shroom', 'goblin', 'moonImp', 'shadeImp', 'brute'];

describe.skipIf(!process.env.SIM)('balance table (SIM=1)', () => {
  it('prints win rates', () => {
    const runs = Number(process.env.RUNS ?? 40);
    const rows: string[] = [];
    for (const id of [...ORDINARY, 'moonWyrm']) {
      const enemy = ENEMIES[id]!;
      const level = id === 'moonWyrm' ? Number(process.env.WYRM_LEVEL ?? 8) : enemy.level;
      const spec = { kind: 'combat', enemyId: id } as const;
      const good = measure(spec, level, 'good', runs);
      const sloppy = measure(spec, level, 'sloppy', runs);
      const drop = measure(spec, level, 'dropper', Math.min(runs, 10));
      rows.push(
        `${id.padEnd(9)} L${level} | good ${(good.winRate * 100).toFixed(0)}% ${good.seconds.toFixed(0)}s ${good.pieces.toFixed(0)}p hp${(good.hpLeft * 100).toFixed(0)}% of${good.overflows.toFixed(1)} | sloppy ${(sloppy.winRate * 100).toFixed(0)}% ${sloppy.seconds.toFixed(0)}s of${sloppy.overflows.toFixed(1)} | drop ${(drop.winRate * 100).toFixed(0)}%`,
      );
    }
    process.stderr.write(rows.join('\n') + '\n');
  }, 600_000);
});
