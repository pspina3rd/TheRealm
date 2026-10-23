import { it } from 'vitest';
import { Battle } from '../src/battle/battle';
import { measure, simulate, heroAt } from './sim/simulate';
it('scratch', () => {
  const out: string[] = [];
  for (const id of ['slime', 'goblin', 'brute']) {
    const lvl = { slime: 1, goblin: 3, brute: 5 }[id]!;
    for (const st of ['good', 'spammer', 'tidy'] as const) {
      const r = measure({ kind: 'combat', enemyId: id }, lvl, st, 30);
      out.push(`${id} ${st}: ${(r.winRate * 100).toFixed(0)}% ${r.seconds.toFixed(0)}s of${r.overflows.toFixed(1)}`);
    }
  }
  process.stderr.write(out.join('\n') + '\n');
  void Battle; void simulate; void heroAt;
}, 600000);
