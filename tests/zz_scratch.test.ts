import { it } from 'vitest';
import { measure } from './sim/simulate';
it('scratch', () => {
  const out: string[] = [];
  const mentors = [['torva', 'emberWisp', 'fire'], ['maren', 'tideWisp', 'blizzard'], ['dorn', 'stoneWisp', 'quake'], ['kestrel', 'galeWisp', 'gale']] as const;
  for (const [d, L] of [[1, 1], [1, 2], [2, 3], [2, 4], [3, 6], [4, 8]] as const) {
    for (const [mentorId, enemyId, spellId] of mentors) {
      const spec = { kind: 'lesson', mentorId, enemyId, spellId, difficulty: d } as const;
      const g = measure(spec, L, 'good', 40);
      const s = measure(spec, L, 'sloppy', 40);
      out.push(`d${d} L${L} ${enemyId}: good ${(g.winRate * 100).toFixed(0)}% ${g.seconds.toFixed(0)}s sloppy ${(s.winRate * 100).toFixed(0)}%`);
    }
  }
  process.stderr.write(out.join('\n') + '\n');
}, 600000);
