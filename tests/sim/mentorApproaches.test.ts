/** Bounded reachability evidence: real zero-spell boards, never charged endgame fixtures. */
import { describe, expect, it } from 'vitest';
import { Battle } from '../../src/battle/battle';
import { createRng } from '../../src/core/rng';
import { NPCS } from '../../src/data/npcs';
import { MENTOR_APPROACHES } from '../../src/data/mentorApproaches';
import { createHero } from '../../src/game/hero';
import { goodChoice, execute } from './encounters';

describe.skipIf(!process.env.OPENING_ROUTE_SIM)('zero-spell mentor approach tasks', () => {
  it.each(MENTOR_APPROACHES)(
    '$taskId is completable before learning any spell',
    (approach) => {
      let wins = 0;
      for (const seed of [31, 73, 151]) {
        const hero = createHero();
        expect(hero.spells).toEqual({});
        const battle = new Battle(NPCS[approach.taskId]!.challenge!, hero, createRng(seed));
        for (let turn = 0; turn < 60 && battle.status === 'ongoing'; turn++) {
          const choice = goodChoice(battle);
          if (!choice) break;
          execute(battle, choice, null, () => 0.5);
        }
        if (battle.status === 'won') wins++;
        expect(hero.spells).toEqual({});
        expect(
          battle.events.some(({ event }) => event.kind === 'spell' || event.kind === 'autoSpell'),
        ).toBe(false);
      }
      expect(
        wins,
        'At least one of three bounded zero-spell runs must complete the route task. This is not balance acceptance.',
      ).toBeGreaterThan(0);
    },
    60000,
  );
});
