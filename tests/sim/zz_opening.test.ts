import { it } from 'vitest';
import { createHero, refreshStats, addItem, equip } from '../../src/game/hero';
import { simulate, type Style } from './simulate';
it.skipIf(!process.env.SIM)(
  'opening',
  () => {
    const runs = Number(process.env.RUNS ?? 30);
    const out: string[] = [
      '| Foe | Sword | Start HP | Pace | Good | Tidy | Sloppy | Good HP left |',
      '|---|---|---|---|---|---|---|---|',
    ];
    for (const enemyId of ['slime', 'shroom', 'goblin'])
      for (const sword of [false, true])
        for (const share of [0.5, 0.8, 1])
          for (const pace of [1500, 2200]) {
            const cells: string[] = [];
            let hpLeft = 0;
            for (const style of ['good', 'tidy', 'sloppy'] as Style[]) {
              let wins = 0;
              for (let seed = 1; seed <= runs; seed++) {
                const hero = createHero('ranger');
                if (sword) {
                  addItem(hero, 'copperSword');
                  equip(hero, 'copperSword');
                }
                refreshStats(hero);
                hero.hp = Math.round(hero.maxHp * share);
                const r = simulate({ kind: 'combat', enemyId }, hero, style, seed * 7919, pace);
                if (r.won) {
                  wins++;
                  if (style === 'good') hpLeft += r.hpLeft;
                }
                if (style === 'good' && seed === runs) hpLeft = hpLeft / Math.max(1, wins);
              }
              cells.push(`${Math.round((100 * wins) / runs)}%`);
            }
            out.push(
              `| ${enemyId} | ${sword ? 'copper' : 'none'} | ${share * 100}% | ${pace} | ${cells.join(' | ')} | ${Math.round(hpLeft * 100)}% |`,
            );
          }
    process.stderr.write(out.join('\n') + '\n');
  },
  3_600_000,
);
