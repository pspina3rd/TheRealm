import { it } from 'vitest';
import { Battle } from '../../../src/battle/battle';
import { createRng } from '../../../src/core/rng';
import { simHero } from '../encounters';

it('debug', () => {
  const id = process.env.ID ?? 'elder';
  const b = new Battle(
    { kind: 'encounter', id, strain: 0, demo: true, assisted: false },
    simHero(1),
    createRng(5),
  );
  for (let i = 0; i < 40; i++) b.update(100);
  const show = () =>
    b.board.grid
      .map((r, y) =>
        r.map((c, x) => (b.board.tagAt(x, y) ? 'T' : c ? (c === 'stone' ? '#' : c[0]) : '.')).join(''),
      )
      .join('\n');
  process.stderr.write(`${show()}\n${b.status} ${b.board.active?.name} ${JSON.stringify(b.objective)}\n`);
});
