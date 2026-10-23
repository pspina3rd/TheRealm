import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { totalAttack, totalDefense } from '../../src/game/hero';
import { heroAt } from '../sim/simulate';
it('hero', () => {
  for (const l of [1, 3, 5, 7, 8, 9, 11, 13]) {
    const h = heroAt(l);
    appendFileSync(
      process.env.OUT!,
      `L${l} hp${h.maxHp} atk${totalAttack(h)} def${totalDefense(h)}\n`,
    );
  }
});
