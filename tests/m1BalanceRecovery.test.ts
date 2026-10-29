import { expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import { createRng } from '../src/core/rng';
import { ENCOUNTERS } from '../src/data/balance';
import { createHero } from '../src/game/hero';
import { newGame } from '../src/world/state';
import { newRecord } from '../src/game/stakes';
import { encounterSpec, stakesCard } from '../src/game/encounterFlow';

it('gives an assisted threshold more placement time without easing the solo trial or adding lamps', () => {
  const state = newGame();
  state.encounters.guard = { ...newRecord(), tries: 2, fails: 2, strain: 1 };
  const solo = new Battle(encounterSpec(state, 'guard'), createHero(), createRng(1));
  const helpedSpec = encounterSpec(state, 'guard', true);
  const helped = new Battle(helpedSpec, createHero(), createRng(1));
  expect(solo.objective.piecesLeft).toBe(
    ENCOUNTERS.guard.pieceLimit + ENCOUNTERS.guard.strainPieces,
  );
  expect(solo.objective.lamps).toHaveLength(5);
  expect(helped.objective.piecesLeft).toBe(
    ENCOUNTERS.guard.pieceLimit + ENCOUNTERS.guard.assistPieces,
  );
  expect(helped.objective.lamps).toHaveLength(4);
  expect(stakesCard(state, helpedSpec, []).assist?.label).toContain(
    `+${ENCOUNTERS.guard.assistPieces} pieces`,
  );
});
