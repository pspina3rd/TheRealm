/** A legal CHARGE replay: real seeded dual pieces, timed public input, no grid edits. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Battle, type BattleAction } from '../../src/battle/battle';
import { createRng } from '../../src/core/rng';
import type { CrystalColor, PieceName } from '../../src/core/pieces';
import { dualChance } from '../../src/game/pieceOdds';
import { playEncounter, simHero } from './encounters';

const path = 'tests/sim/fixtures/vale-legal-win.json';
type Step = { input: BattleAction } | { updates: number } | { preview: true };
interface Replay {
  id?: string;
  seed: number;
  level: number;
  dualChance: number;
  source: string;
  seconds: number;
  pieces: { name: PieceName; second: CrystalColor | null }[];
  steps: Step[];
}

function record(seed: number, id = 'guard'): Replay | null {
  const steps: Step[] = [];
  const pieces: Replay['pieces'] = [];
  const input = Battle.prototype.input;
  const update = Battle.prototype.update;
  const preview = Object.getOwnPropertyDescriptor(Battle.prototype, 'upcomingPieces')!;
  Battle.prototype.input = function (action) {
    steps.push({ input: action });
    input.call(this, action);
  };
  Battle.prototype.update = function (ms) {
    if (ms !== 50) throw new Error('Replay records fixed 50ms simulation steps');
    const previous = steps.at(-1);
    if (previous && 'updates' in previous) previous.updates++;
    else steps.push({ updates: 1 });
    update.call(this, ms);
  };
  Object.defineProperty(Battle.prototype, 'upcomingPieces', {
    ...preview,
    get() {
      steps.push({ preview: true });
      return preview.get!.call(this);
    },
  });
  try {
    const result = playEncounter(
      { kind: 'encounter', id, strain: 0, demo: id !== 'guard', assisted: false },
      'good',
      seed,
      2,
      {},
      600_000,
      (battle) => {
        const piece = battle.board.active!;
        pieces.push({ name: piece.name, second: piece.second });
      },
    );
    if (!result.won || !pieces.some((piece) => piece.second !== null)) return null;
    return {
      id,
      seed,
      level: 2,
      dualChance: dualChance(simHero(2)),
      source:
        'Team 5aa90cd authored layout/hint and shared HINT=1; public timed inputs and preview reads only',
      seconds: result.seconds,
      pieces,
      steps,
    };
  } finally {
    Battle.prototype.input = input;
    Battle.prototype.update = update;
    Object.defineProperty(Battle.prototype, 'upcomingPieces', preview);
  }
}

function replay(fixture: Replay): Battle {
  const hero = simHero(fixture.level);
  expect(dualChance(hero)).toBe(fixture.dualChance);
  const battle = new Battle(
    {
      kind: 'encounter',
      id: fixture.id ?? 'guard',
      strain: 0,
      demo: Boolean(fixture.id && fixture.id !== 'guard'),
      assisted: false,
    },
    hero,
    createRng(fixture.seed),
    { dualChance: dualChance(hero) },
  );
  for (const step of fixture.steps) {
    if ('input' in step) battle.input(step.input);
    else if ('preview' in step) void battle.upcomingPieces;
    else for (let i = 0; i < step.updates; i++) battle.update(50);
  }
  return battle;
}

describe.skipIf(!process.env.RECORD_VALE)('find a real CHARGE win', () => {
  it('records the first legal seeded win containing dual pieces', () => {
    for (let index = 1; index <= 200; index++) {
      const fixture = record(index * 7919 + 13);
      if (!fixture) continue;
      const battle = replay(fixture);
      expect(battle.status).toBe('won');
      expect(battle.objective.progress).toBe(1);
      mkdirSync('tests/sim/fixtures', { recursive: true });
      writeFileSync(path, JSON.stringify(fixture, null, 2) + '\n');
      return;
    }
    throw new Error('No legal dual-piece win in the first 200 seeds');
  }, 7_200_000);
});

it.skipIf(!existsSync(path))('replays Vale with real dual chance and no board mutation', () => {
  const fixture = JSON.parse(readFileSync(path, 'utf8')) as Replay;
  expect(fixture.dualChance).toBeGreaterThan(0);
  expect(fixture.pieces.some((piece) => piece.second !== null)).toBe(true);
  const battle = replay(fixture);
  expect(battle.status).toBe('won');
  expect(battle.board.piecesPlaced).toBe(fixture.pieces.length);
  expect(battle.objective.progress).toBe(1);
});

describe.skipIf(!process.env.RECORD_REPLAYS)('refresh revised board proofs', () => {
  it('records legal Rowan and Wren wins with real dual pieces', () => {
    for (const id of ['elder', 'forager']) {
      let found = false;
      for (let index = 1; index <= 200; index++) {
        const fixture = record(index * 7919 + 13, id);
        if (!fixture) continue;
        expect(replay(fixture).status).toBe('won');
        mkdirSync('tests/sim/fixtures', { recursive: true });
        writeFileSync(
          `tests/sim/fixtures/${id}-legal-win.json`,
          JSON.stringify(fixture, null, 2) + '\n',
        );
        found = true;
        break;
      }
      expect(found, id).toBe(true);
    }
  }, 120000);
});
for (const id of ['elder', 'forager']) {
  it(`replays revised ${id} with real dual pieces and public inputs`, () => {
    const fixture = JSON.parse(
      readFileSync(`tests/sim/fixtures/${id}-legal-win.json`, 'utf8'),
    ) as Replay;
    expect(fixture.pieces.some((piece) => piece.second !== null)).toBe(true);
    expect(replay(fixture).status).toBe('won');
  });
}
