import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { MAPS } from '../../src/data/maps';
import { Battle, type BattleOptions } from '../../src/battle/battle';
import { hometownForClass } from '../../src/data/hometowns';
import { MAP_RULES } from '../../src/data/balance';
import { surfaceProvince } from '../../src/data/surfaceLayout';
import { dualChance, pieceWeights } from '../../src/game/pieceOdds';
import type { Hero } from '../../src/game/hero';
import { createRng } from '../../src/core/rng';
import { newGame, travel, activeEntities } from '../../src/world/state';
import { resolveBattle } from '../../src/game/encounter';
import { walkRegen } from '../../src/game/hero';
import { simulateBattle } from './simulate';
import { createHero } from '../../src/game/hero';
import { simulate } from './simulate';
function optionsAt(hero: Hero, point: { x: number; y: number }): BattleOptions {
  const map = MAPS.overworld!;
  const province = surfaceProvince(point.x, point.y)?.id;
  const local = province ? { ...map, pieceBias: MAPS[province]?.pieceBias } : map;
  const rule = MAP_RULES[province ?? 'overworld'];
  return {
    boardMagic: true,
    autoCast: true,
    autoCastPacingMs: 500,
    dualChance: dualChance(hero),
    weights: pieceWeights(local, hero),
    ...(rule ? { rule } : {}),
  };
}
it.skipIf(!process.env.SIM_SURFACE)(
  'measures the actual unequipped zero-spell opening',
  () => {
    const report: unknown[] = [];
    for (const classId of ['ranger', 'knight', 'mage', 'rogue']) {
      const home = hometownForClass(classId);
      const point = MAPS.overworld!.entities.find((e) => e.id === `surface:home:${home.map}:0`)!;
      for (const enemyId of ['slime', 'shroom']) {
        const results = Array.from({ length: 12 }, (_, i) =>
          simulate(
            { kind: 'combat', enemyId },
            createHero(classId),
            'tidy',
            9300 + i,
            2200,
            180000,
            optionsAt(createHero(classId), point),
          ),
        );
        if (enemyId === 'slime')
          expect(results.filter((r) => r.won).length, classId).toBeGreaterThanOrEqual(9);
        report.push({
          classId,
          enemyId,
          province: surfaceProvince(point.x, point.y)?.id ?? 'heartland',
          rule: optionsAt(createHero(classId), point).rule ?? null,
          wins: results.filter((r) => r.won).length,
          seconds: results.reduce((n, r) => n + r.ms, 0) / results.length / 1000,
        });
      }
    }
    const monsters = MAPS.overworld!.entities.filter((e) => e.kind === 'monster');
    writeFileSync(
      process.env.SURFACE_SIM_OUT ?? '/tmp/surface-opening-balance.json',
      JSON.stringify({ monsters: monsters.length, report }, null, 2),
    );
  },
  120000,
);

it.skipIf(!process.env.SIM_SURFACE)(
  'earns level two through actual early fights and walking recovery, without equipment or spells',
  () => {
    for (const classId of ['ranger', 'knight', 'mage', 'rogue']) {
      const state = newGame(classId);
      const home = hometownForClass(classId);
      travel(state, home.returnTo);
      const foes = activeEntities(state)
        .filter((e) => e.id.startsWith(`surface:home:${home.map}:`))
        .slice(0, 4);
      expect(foes.length).toBe(4);
      for (const [i, entity] of foes.entries()) {
        if (entity.kind !== 'monster') throw new Error('Expected a real enemy');
        for (let steps = 0; steps < 60; steps++) walkRegen(state.hero, true);
        const battle = new Battle(
          { kind: 'combat', enemyId: entity.enemyId },
          state.hero,
          createRng(9400 + i),
          optionsAt(state.hero, entity),
        );
        const result = simulateBattle(battle, 'tidy', 2200, 180000);
        expect(result.won, `${classId} fight ${i + 1}`).toBe(true);
        resolveBattle(state, entity, battle, createRng(9500 + i));
      }
      expect(state.hero.level, classId).toBeGreaterThanOrEqual(2);
      expect(state.hero.spells).toEqual({});
      expect(state.hero.weaponId).toBeNull();
      expect(state.hero.armorId).toBeNull();
    }
  },
  120000,
);
