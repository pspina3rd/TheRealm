import { it } from 'vitest';
import { Battle } from '../../../src/battle/battle';
import { createRng } from '../../../src/core/rng';
import { execute, goodChoice, goodRanked, simHero } from '../encounters';

it('debug2', () => {
  const id = process.env.ID ?? 'elder';
  const b = new Battle(
    { kind: 'encounter', id, strain: 0, demo: true, assisted: false },
    simHero(1),
    createRng(Number(process.env.SEED ?? 5)),
  );
  for (let i = 0; i < 40; i++) b.update(100);
  const show = () =>
    b.board.grid
      .map((r, y) =>
        r.map((c, x) => (b.board.tagAt(x, y) ? 'T' : c ? (c === 'stone' ? '#' : c[0]) : '.')).join(''),
      )
      .slice(Number(process.env.FROM ?? 4))
      .join('\n');
  for (let n = 0; n < Number(process.env.N ?? 40) && b.status === 'ongoing'; n++) {
    const piece = b.board.active?.name;
    if (n === Number(process.env.DUMP ?? -1))
      for (const r of goodRanked(b).slice(0, 8))
        process.stderr.write(`  ${r.score.toFixed(1)} x=${r.landing.x} ${JSON.stringify(r.landing.cells)} hint=${b.challenge.hint?.(r.landing)}\n`);
    const c = goodChoice(b);
    if (c) execute(b, c, false, () => 0.5);
    else b.input('hardDrop');
    b.update(200);
    process.stderr.write(`#${n} ${piece} -> ${b.status} ${b.objective.counter}\n${show()}\n\n`);
  }
});
