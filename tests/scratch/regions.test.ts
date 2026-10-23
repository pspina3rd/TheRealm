import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { FULL_KIT, measure } from '../sim/simulate';

it('region sim', () => {
  const ids = (process.env.IDS ?? '').split(',').filter(Boolean);
  const runs = Number(process.env.RUNS ?? 12);
  for (const id of ids) {
    const e = ENEMIES[id]!;
    const lvl = Number(process.env.LVL ?? 0) || e.level;
    const kit = process.env.KIT ? FULL_KIT : [];
    const g = measure({ kind: 'combat', enemyId: id }, lvl, 'good', runs, 'ranger', kit);
    const p = process.env.PREP
      ? measure({ kind: 'combat', enemyId: id }, lvl, 'prepared', runs, 'ranger', kit)
      : null;
    appendFileSync(
      process.env.OUT ?? '/dev/null',
      `${id} L${lvl} good ${(g.winRate * 100).toFixed(0)}% ${g.seconds.toFixed(0)}s hp${(g.hpLeft * 100).toFixed(0)}%` +
        (p ? ` prep ${(p.winRate * 100).toFixed(0)}%` : '') +
        '\n',
    );
  }
}, 600_000);
