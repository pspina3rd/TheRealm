/**
 * The M0 feasibility gate (docs/ENCOUNTER_DESIGN.md §9) for the M1 boards
 * that can be checked exactly: Pip's authored queue (recorded solution,
 * solver, the greedy bot fails), Bean's furrows (shape-fit), the supply
 * rule, and the overlay budget. The random-queue boards' gate is the
 * 200-seed good-bot run (`npm run sim ENCOUNTERS=all`).
 */
import { describe, expect, it } from 'vitest';
import type { Battle } from '../src/battle/battle';
import type { BuildChallenge } from '../src/battle/verbs/build';
import { scoreGrid } from '../src/core/bestFit';
import { landingsOf, type Landing } from '../src/core/landing';
import { shapeFits, solveQueue } from '../src/core/solver';
import { ENCOUNTER_DEFS, overlaysOf, supplyRuleHolds } from '../src/data/encounters';
import { makeBattle } from './helpers';

const pip = (): { battle: Battle; build: BuildChallenge } => {
  const battle = makeBattle({
    kind: 'encounter',
    id: 'kid',
    strain: 0,
    demo: false,
    assisted: false,
  });
  return { battle, build: battle.challenge as BuildChallenge };
};

describe('Pip’s tower: an authored queue', () => {
  it('has 1–4 solution classes (which two pieces go in the toy box)', () => {
    const { battle, build } = pip();
    const def = ENCOUNTER_DEFS.kid!.spec;
    if (def.verb !== 'build') throw new Error('Pip builds');
    const { queue } = def.params;
    // The tower (36 cells) takes 9 of the 11 pieces; the toy box, apart from it, the other 2.
    // A class is the pair sent to the box: the decision the traps test. The tower's own tilings
    // vary freely and are not counted.
    const region = (inside: (x: number, y: number) => boolean) => ({
      solved: (board: { grid: readonly (readonly (string | null)[])[] }) =>
        board.grid.every((row, y) => row.every((c, x) => c !== null || !build.inOutline(x, y))) ||
        !inside(4, 19),
      dead: (landing: Landing) =>
        landing.placed.some(([x, y]) => !inside(x, y)) || build.cracksOn(landing.grid) > 0,
    });
    const tower = region((x, y) => build.inOutline(x, y));
    const box = region((x, y) => build.inSpare(x, y));
    const classes: string[] = [];
    for (let i = 0; i < queue.length; i++) {
      for (let j = i + 1; j < queue.length; j++) {
        const rest = queue.filter((_, k) => k !== i && k !== j);
        if (solveQueue(battle.board, rest, tower, 1).classes.length === 0) continue;
        if (solveQueue(battle.board, [queue[i]!, queue[j]!], box, 1).classes.length === 0) continue;
        classes.push(`${i}${queue[i]} ${j}${queue[j]}`);
      }
    }
    expect(classes.length).toBeGreaterThanOrEqual(1);
    expect(classes.length).toBeLessThanOrEqual(4);
    // The worked solution's: the S and the Z are the ugly ones.
    expect(classes).toContain('1S 5Z');
  }, 120_000);

  it('beats the greedy bot (one piece at a time, tidy plus the hint)', () => {
    const { battle, build } = pip();
    while (battle.status === 'ongoing') {
      const piece = battle.board.active!;
      const best = landingsOf(battle.board, piece.name)
        .map((l) => ({ l, score: scoreGrid(l.grid, l.lines) + build.hint(l) }))
        .sort((a, b) => b.score - a.score)[0]!.l;
      battle.board.active!.cells = [...best.cells];
      battle.board.active!.x = best.x;
      battle.input('hardDrop');
    }
    expect(battle.status).toBe('lost');
  });
});

describe('shape-fit (§2)', () => {
  it('tiles Bean’s 2-wide furrow with upright S pieces seated on its ridge', () => {
    expect(shapeFits('S', 2, 6, { 0: 1 })).toBe(true);
    // Without the ridge an S buries a hole.
    expect(shapeFits('S', 2, 2)).toBe(false);
    expect(shapeFits('O', 2, 4)).toBe(true);
    expect(shapeFits('I', 1, 4)).toBe(true);
  });
});

describe('the supply rule (§2)', () => {
  it('holds for every colour encounter at every strain', () => {
    for (const def of Object.values(ENCOUNTER_DEFS)) {
      // Thresholds hold one strain step at most (§3.2).
      const steps = def.assist ? [0, 1] : [0, 1, 2];
      for (const strain of steps) expect(supplyRuleHolds(def.spec, strain), def.id).toBe(true);
    }
  });

  it('catches a board that asks too much', () => {
    const bean = ENCOUNTER_DEFS.farmer!.spec;
    if (bean.verb !== 'plant') throw new Error('Bean plants');
    expect(
      supplyRuleHolds({
        verb: 'plant',
        params: { ...bean.params, target: bean.params.pieceLimit + 1 },
      }),
    ).toBe(false);
    const vale = ENCOUNTER_DEFS.guard!.spec;
    if (vale.verb !== 'charge') throw new Error('Vale charges');
    expect(supplyRuleHolds({ verb: 'charge', params: { ...vale.params, purity: 8 } })).toBe(false);
  });
});

describe('the overlay budget (§2)', () => {
  it('draws at most one hazard family and one objective family on every board', () => {
    const families = Object.values(ENCOUNTER_DEFS).map((def) => overlaysOf(def.spec));
    for (const overlays of families) {
      expect(Object.keys(overlays)).toEqual(['hazard', 'objective']);
    }
    expect(families).toContainEqual({ hazard: 'tags', objective: 'targets' });
    expect(families).toContainEqual({ hazard: null, objective: null });
  });
});
