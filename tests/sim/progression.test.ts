import { learnSpell as learnFixtureSpell } from '../../src/game/hero';
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLASSES } from '../../src/data/classes';
import { MAPS } from '../../src/data/maps';
import { NPCS } from '../../src/data/npcs';
import { reachedFlag } from '../../src/data/story';
import { PIECE_NAMES } from '../../src/core/pieces';
import type { Resolution } from '../../src/game/encounter';
import { gainXp } from '../../src/game/hero';
import { pieceWeights } from '../../src/game/pieceOdds';
import { defeatedFlag, newGame, travel } from '../../src/world/state';
import type { BarterChallenge } from '../../src/battle/barter';
import { barterGain, simulateBattle } from './simulate';
import { pendingVision, WYRM_VOICE } from '../../src/game/story';
import {
  CAMPAIGN_PACES,
  campaignEncounters,
  campaignEnding,
  investEarnedPoints,
  progressionBattle,
  purchaseSupplies,
  runCampaign,
  gateFlags,
  MAX_GATE_ATTEMPTS,
  type CampaignResult,
} from './progression';

describe('attainable Chapter One resources', () => {
  it('starts with only the actual class resources and never invents a spell kit', () => {
    for (const classId of Object.keys(CLASSES)) {
      const { state, rows } = runCampaign({ classId, route: [] });
      const initial = newGame(classId);
      initial.flags.add('boardMagicEnabled');
      expect(state).toEqual(initial);
      expect(rows).toEqual([]);
      expect(investEarnedPoints(state.hero)).toBe(0);
    }
  });

  it('charges earned points for enhancements and cannot upgrade spells without a lesson', () => {
    const { hero } = newGame('ranger');
    learnFixtureSpell(hero, 'gale');
    for (let i = 0; i < 4; i++) gainXp(hero, hero.nextXp);
    const earned = hero.skillPoints;
    const spent = investEarnedPoints(hero);
    expect(spent).toBeGreaterThan(0);
    expect(spent + hero.skillPoints).toBe(earned);
    expect(hero.spells.gale!.level).toBe(1);
    expect(Object.values(hero.spells.gale!.step).reduce((sum, n) => sum + n, 0)).toBeGreaterThan(0);
    expect(hero.skillPoints).toBeGreaterThanOrEqual(0);
    expect(investEarnedPoints(hero)).toBe(0);
  });

  it('cannot buy gear or replenish consumables beyond the available gil', () => {
    const state = newGame();
    const shop: Resolution = {
      won: true,
      gains: [],
      speech: null,
      fell: false,
      shopId: 'brightwaterGeneral',
      priceMultiplier: 1,
      attitude: 'neutral',
    };
    state.hero.gil = 0;
    state.hero.items = {};
    const items = { ...state.hero.items };
    expect(purchaseSupplies(state, shop)).toBe(0);
    expect(state.hero.items).toEqual(items);
    expect(state.hero.armorId).toBeNull();
    state.hero.gil = 14;
    const spent = purchaseSupplies(state, shop);
    expect(spent).toBeGreaterThan(0);
    expect(state.hero.gil).toBe(14 - spent);
    expect(state.hero.gil).toBeGreaterThanOrEqual(0);
    expect(state.hero.armorId).toBeNull();
  });

  it('uses a full region/charm/alignment-weighted bag instead of a synthetic even bag', () => {
    const state = newGame('mage');
    state.mapId = 'forge';
    const weights = pieceWeights(MAPS.forge!, state.hero);
    const size = Object.values(weights).reduce((sum, n) => sum + n, 0);
    const battle = progressionBattle(state, { kind: 'combat', enemyId: 'slime' }, 119);
    const pieces = [battle.board.active!.name, ...battle.board.preview(size - 1)];
    for (const name of PIECE_NAMES)
      expect(pieces.filter((p) => p === name).length, name).toBe(weights[name]);
    expect(new Set(Object.values(weights)).size).toBeGreaterThan(1);
  });

  it('records closed map gates instead of granting progress to reach later areas', () => {
    const { rows, state } = runCampaign({ route: ['peaks', 'caves1'] });
    expect(rows.every((row) => row.blocked)).toBe(true);
    expect([...state.flags]).toEqual(['boardMagicEnabled']);
    expect(state.hero.level).toBe(1);
  });

  it('cannot reward a defeated boss again on repeat map visits', () => {
    const state = newGame();
    travel(state, { map: 'caves2', x: 2, y: 2 });
    const boss = MAPS.caves2!.entities.find((entity) => entity.kind === 'monster' && entity.boss)!;
    const ordinary = MAPS.caves2!.entities.find(
      (entity) => entity.kind === 'monster' && !entity.boss,
    )!;
    state.flags.add(defeatedFlag(boss.id));
    state.cleared.add(ordinary.id);
    expect(campaignEncounters(state).some((entity) => entity.id === boss.id)).toBe(false);
    expect(campaignEncounters(state).some((entity) => entity.id === ordinary.id)).toBe(false);
    travel(state, { map: 'caves1', x: 2, y: 2 });
    travel(state, { map: 'caves2', x: 2, y: 2 });
    expect(campaignEncounters(state).some((entity) => entity.id === boss.id)).toBe(false);
    expect(campaignEncounters(state).some((entity) => entity.id === ordinary.id)).toBe(true);
  });

  it('reports a timeout without granting victory rewards or applying a fake defeat', () => {
    const { rows, state } = runCampaign({ route: ['overworld'], battleLimitMs: 1 });
    expect(rows[0]!.timeouts).toBe(1);
    expect(rows[0]!.won).toBe(0);
    expect(rows[0]!.lost).toBe(0);
    expect(state.hero.gil).toBe(newGame().hero.gil);
    expect(state.victories).toBe(0);
    expect(state.hero.hp).toBe(state.hero.maxHp);
    expect(rows).toHaveLength(1);
  });

  it('applies canonical warp arrivals and dismisses their visions while preserving dialogue memory', () => {
    const { state } = runCampaign({ route: ['overworld'], battleLimitMs: 1 });
    expect(state.flags.has(reachedFlag('overworld'))).toBe(true);
    expect(state.flags.has('vision:1')).toBe(true);
    expect(state.talk[WYRM_VOICE]).toBeGreaterThan(0);
    expect(pendingVision(state)).toBeNull();
    expect(state.flags.has('wyrmBeaten')).toBe(false);
    expect(state.flags.has('scene:refusal')).toBe(true);
    expect(state.flags.has('got:wellStone')).toBe(true);
    expect(state.hero.items.wellStone).toBe(1);
  });

  it('plays every recorded puzzle through legal controls, and reports exhausted solver budgets', () => {
    for (const npc of Object.values(NPCS)) {
      if (!npc.challenge || npc.challenge.kind !== 'puzzle') continue;
      const battle = progressionBattle(newGame(), npc.challenge, 1);
      const result = simulateBattle(battle, 'prepared', 1500, 180_000, { challengeAware: true });
      expect(result.stopReason, npc.id).toBe('won');
      expect(battle.status).toBe('won');
    }
    const battle = progressionBattle(
      newGame(),
      { kind: 'puzzle', rows: ['###...####', '####.#####'], queue: ['I', 'T'], linesToClear: 2 },
      1,
    );
    const result = simulateBattle(battle, 'prepared', 1500, 180_000, {
      challengeAware: true,
      puzzleNodeBudget: 0,
    });
    expect(result.stopReason).toBe('solver-budget');
    expect(battle.status).toBe('ongoing');
    expect(battle.board.piecesPlaced).toBe(0);
  });

  it('values only unmet requested colours, including dual-piece clear tallies', () => {
    const battle = progressionBattle(
      newGame(),
      { kind: 'barter', wants: { blue: 2, violet: 1 }, pieceLimit: 5 },
      1,
    );
    const challenge = battle.challenge as BarterChallenge;
    challenge.collected.blue = 1;
    expect(barterGain({ blue: 8, violet: 2, red: 40 }, challenge)).toBe(2);
    challenge.collected.blue = 2;
    challenge.collected.violet = 1;
    expect(barterGain({ blue: 8, violet: 8 }, challenge)).toBe(0);
  });

  it('bounds gate attempts, traces actual goals, and pays current Browse prices on shop returns', () => {
    const result = runCampaign({ route: ['brightwater', 'brightwater'], seed: 3 });
    for (const id of new Set(
      result.trace.flatMap((entry) => (entry.gateFlags.length ? [entry.entityId] : [])),
    )) {
      const battles = result.trace.filter(
        (entry) => entry.entityId === id && ['won', 'lost'].includes(entry.outcome),
      );
      expect(battles.length).toBeLessThanOrEqual(MAX_GATE_ATTEMPTS);
      for (const entry of battles) {
        expect(entry.pieces).toBeGreaterThan(0);
        if (entry.outcome === 'won')
          for (const flag of entry.gateFlags) expect(entry.after.flags).toContain(flag);
      }
    }
    for (const entry of result.trace.filter((entry) => entry.phase === 'shop-preparation')) {
      if (entry.outcome === 'browsed') {
        expect(NPCS[entry.npcId!]!.shop).toBeDefined();
        expect(entry.pieces).toBe(0);
        expect(entry.after.gil).toBeLessThanOrEqual(entry.before.gil);
      } else {
        expect(NPCS[entry.npcId!]!.challenge?.kind).toBe('haggle');
        expect(entry.pieces).toBeGreaterThan(0);
      }
    }
    expect(result.chapterVictory).toBe(false);
    expect(result.completed).toBe(false);
    expect(result.sequelSealed).toBe(false);
    expect(gateFlags(MAPS.quarry!.entities[0]!)).toEqual(['ridgeCleared']);
  });

  it('keeps the once-only baseline available and reports required NPCs behind closed gates', () => {
    const baseline = runCampaign({ route: ['peaks'], policy: 'baseline' });
    expect(baseline.trace[0]!.gateFlags).toContain('peakGate');
    expect(baseline.trace[0]!.reason).toContain('apprentice');
    expect(baseline.trace[0]!.outcome).toBe('blocked');
  });

  it('counts the earned chapter ending without opening the canonical sealed sequel', () => {
    const state = newGame();
    expect(campaignEnding(state)).toEqual({
      chapterVictory: false,
      sequelSealed: false,
      completed: false,
    });
    state.flags.add('wyrmBeaten');
    expect(campaignEnding(state)).toEqual({
      chapterVictory: true,
      sequelSealed: true,
      completed: true,
    });
    expect(state.flags.has('ruinsOpen')).toBe(false);
    expect(MAPS.sunkenRuins).toBeUndefined();
  });
});

describe.skipIf(!process.env.SIM_PROGRESSION)('attainable progression report', () => {
  it('reports gate success and actual chapter victories separately from instrumentation completion', () => {
    const runs = Number(process.env.RUNS ?? 5);
    if (!Number.isInteger(runs) || runs <= 0) throw new Error('RUNS must be a positive integer');
    const battleLimitMs = Number(process.env.BATTLE_LIMIT_MS ?? 180_000);
    if (!Number.isFinite(battleLimitMs) || battleLimitMs <= 0)
      throw new Error('BATTLE_LIMIT_MS must be finite and positive');
    const policies = process.env.COMPARE_BASELINE
      ? (['baseline', 'prepared'] as const)
      : ([process.env.POLICY === 'baseline' ? 'baseline' : 'prepared'] as const);
    const results: {
      classId: string;
      pace: number;
      seed: number;
      policy: string;
      result: CampaignResult;
    }[] = [];
    const regionLines = [
      '| Policy | Class | Pace ms | Seed | Area | Level in→out | Won/lost | Lessons won/tried | Battle seconds | HP | Gil | Spent | SP spent | Spells | Gear | Status |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ];
    const summaries: Record<string, unknown>[] = [];
    for (const policy of policies)
      for (const classId of Object.keys(CLASSES)) {
        for (const pace of CAMPAIGN_PACES) {
          const group: CampaignResult[] = [];
          for (let seed = 1; seed <= runs; seed++) {
            const result = runCampaign({ classId, pace, seed, policy, battleLimitMs });
            results.push({ classId, pace, seed, policy, result });
            group.push(result);
            for (const row of result.rows) {
              regionLines.push(
                `| ${[
                  policy,
                  classId,
                  pace,
                  seed,
                  row.area,
                  `${row.levelIn}→${row.levelOut}`,
                  `${row.won}/${row.lost}`,
                  `${row.lessonsWon}/${row.lessonsTried}`,
                  row.seconds.toFixed(0),
                  `${(row.hp * 100).toFixed(0)}%`,
                  row.gil,
                  row.spent,
                  row.pointsSpent,
                  row.spellLevels,
                  row.gear || 'starter',
                  row.blocked ? 'gate closed' : row.timeouts ? 'censored: see trace' : 'attempted',
                ].join(' | ')} |`,
              );
            }
          }
          const flags = ['cavePass', 'ridgeCleared', 'peakGate'];
          summaries.push({
            policy,
            classId,
            pace,
            reportedRuns: runs,
            battleLimitMs,
            uncensoredRuns: group.filter((result) => result.rows.every((row) => row.timeouts === 0))
              .length,
            chapterVictories: group.filter((result) => result.chapterVictory).length,
            sealedSequels: group.filter((result) => result.sequelSealed).length,
            completedChapters: group.filter((result) => result.completed).length,
            gateSuccesses: Object.fromEntries(
              flags.map((flag) => [
                flag,
                group.filter((result) => result.state.flags.has(flag)).length,
              ]),
            ),
            timeouts: group
              .flatMap((result) => result.trace)
              .filter((entry) => entry.outcome === 'timeout').length,
            solverStops: group
              .flatMap((result) => result.trace)
              .filter((entry) => entry.outcome.startsWith('solver-')).length,
          });
          process.stderr.write(`Finished ${policy} ${classId} ${pace}ms: ${runs} seeds\n`);
        }
      }
    const summaryLines = [
      '# Chapter One policy evidence',
      '',
      `Simulation limit per battle: ${battleLimitMs} ms. This is a reporting budget, not a game rule.`,
      '',
      'Instrumentation success does not mean balance acceptance. Counts below use deterministic seeds, not confidence estimates. Chapter One completion requires the earned Moon Wyrm victory flag; it is not full-campaign completion. The canonical sequel ward intentionally remains sealed and is reported separately. Battle seconds exclude walking and menus.',
      '',
      '| Policy | Class | Pace ms | Reported runs | Uncensored runs | Vale gate | Flint gate | Cinda gate | Chapter victories | Sealed sequels | Completed chapters | Solver stops | Timeouts |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      ...summaries.map((summary) => {
        const gates = summary.gateSuccesses as Record<string, number>;
        return `| ${[
          summary.policy,
          summary.classId,
          summary.pace,
          summary.reportedRuns,
          summary.uncensoredRuns,
          gates.cavePass,
          gates.ridgeCleared,
          gates.peakGate,
          summary.chapterVictories,
          summary.sealedSequels,
          summary.completedChapters,
          summary.solverStops,
          summary.timeouts,
        ].join(' | ')} |`;
      }),
      '',
      '## Region details',
      '',
      ...regionLines,
    ];
    const report = summaryLines.join('\n') + '\n';
    process.stderr.write(report);
    if (process.env.SIM_OUT) {
      writeFileSync(process.env.SIM_OUT, report);
      writeFileSync(`${process.env.SIM_OUT}.summary.json`, JSON.stringify(summaries, null, 2));
      writeFileSync(
        `${process.env.SIM_OUT}.trace.json`,
        JSON.stringify(
          results.map(({ classId, pace, seed, policy, result }) => ({
            classId,
            pace,
            seed,
            policy,
            chapterVictory: result.chapterVictory,
            sequelSealed: result.sequelSealed,
            completed: result.completed,
            trace: result.trace,
          })),
          null,
          2,
        ),
      );
    }
  }, 3_600_000);
});
