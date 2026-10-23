import { describe, expect, it } from 'vitest';
import { MAX_PAUSES, QUICKEN_SPEED } from '../src/battle/battle';
import {
  ATTACK_PERCENT,
  BACK_TO_BACK_MULTIPLIER,
  COMBO_STEP,
  HOLE_RUSH,
  LINE_DAMAGE,
  MAX_COMBO,
  MAX_HOLE_RUSH,
  OVERFLOW_PENALTY,
  strikeDamage,
  type CombatChallenge,
} from '../src/battle/combat';
import { SPAWN_COLUMNS } from '../src/core/board';
import { createRng } from '../src/core/rng';
import { gravityInterval } from '../src/core/scoring';
import { ENEMIES } from '../src/data/enemies';
import type { ChallengeSpec, EnemyDef, EnemyMove } from '../src/data/types';
import { addItem, createHero, gainXp, totalAttack } from '../src/game/hero';
import { NOVICE_FOE_HP, NOVICE_LEVEL, completeLesson, scaledFoe } from '../src/game/lessons';
import {
  ATK_PER_LEVEL,
  BOSS_BAND,
  HP_PER_LEVEL,
  LEVEL_BAND,
  MIN_XP_SHARE,
  effectiveLevel,
  scaledEnemy,
  xpShare,
} from '../src/game/scaling';
import { feedbackFor } from '../src/ui/art/feedback';
import { step } from '../src/world/movement';
import { newGame } from '../src/world/state';
import { forceQueue, makeBattle, place, setUpVerticalIClear } from './helpers';
import { heroAt, measure, simulate } from './sim/simulate';

const ORDINARY = ['slime', 'shroom', 'goblin', 'moonImp', 'shadeImp', 'brute'];

function fight(enemyId = 'slime') {
  const battle = makeBattle({ kind: 'combat', enemyId });
  return { battle, combat: battle.combat!, hero: battle.hero };
}

/** Makes `move` the enemy's only move, starting with its next one. */
function only(combat: CombatChallenge, move: EnemyMove): void {
  (combat as unknown as { enemy: EnemyDef }).enemy = { ...combat.enemy, moves: [move] };
  combat.nextMove = move;
}

const kinds = (battle: ReturnType<typeof makeBattle>) => battle.events.map((e) => e.event.kind);

describe('the action gauge', () => {
  it('fills in real time and moves the enemy when full', () => {
    const { battle, combat, hero } = fight('slime');
    only(combat, { kind: 'attack', name: 'Bounce', power: 3 });
    battle.update(combat.actMs / 2);
    expect(combat.gauge).toBe(combat.actMs / 2);
    expect(hero.hp).toBe(hero.maxHp);
    battle.update(combat.actMs / 2);
    expect(hero.hp).toBeLessThan(hero.maxHp);
    expect(combat.gauge).toBe(0);
  });

  it('stops while paused', () => {
    const { battle, combat } = fight();
    battle.paused = true;
    battle.update(5000);
    expect(combat.gauge).toBe(0);
  });

  it('stops once the fight is over', () => {
    const { combat } = fight();
    combat.enemyHp = 0;
    combat.update(5000);
    expect(combat.gauge).toBe(0);
  });

  it('runs faster once enraged', () => {
    const { combat } = fight('moonWyrm');
    const calm = combat.actMs;
    combat.enraged = true;
    expect(combat.actMs).toBeLessThan(calm);
  });

  it('jumps when a placement leaves new covered holes, capped', () => {
    const { battle, combat } = fight();
    // An O on a one-wide step leaves one covered hole.
    battle.board.loadRows(['#.........']);
    forceQueue(battle, ['O', 'T']);
    place(battle.board, 0, 0); // board-level drop: no rules
    expect(combat.gauge).toBe(0);
    battle.board.loadRows(['#.........']);
    forceQueue(battle, ['O', 'T']);
    battle.input('hardDrop'); // spawns over columns 4–5: no hole
    expect(combat.gauge).toBe(0);
    battle.board.loadRows(['.#........']);
    forceQueue(battle, ['O', 'T']);
    while (battle.board.move(-1, 0));
    battle.input('hardDrop');
    expect(combat.gauge).toBe(HOLE_RUSH * combat.actMs);
    expect(kinds(battle)).toContain('rush');
  });

  it('caps the rush and acts at once when the rush fills the gauge', () => {
    const { battle, combat, hero } = fight();
    only(combat, { kind: 'attack', name: 'Bounce', power: 3 });
    const quiet = { linesCleared: 0, clearedCells: {}, lines: [], rows: [], toppedOut: false };
    combat.onLock({ ...quiet, holesMade: 9 });
    expect(combat.gauge).toBe(MAX_HOLE_RUSH * combat.actMs);
    combat.gauge = combat.actMs - 1;
    combat.onLock({ ...quiet, holesMade: 1 });
    expect(battle.events.map((e) => e.event)).toContainEqual({ kind: 'rush', holes: 1 });
    expect(hero.hp).toBeLessThan(hero.maxHp);
    expect(combat.gauge).toBe(0);
    // Once the enemy is down, holes feed nothing.
    combat.enemyHp = 0;
    combat.onLock({ ...quiet, holesMade: 3 });
    expect(combat.gauge).toBe(0);
  });

  it('gives the enemy a free move when the hero overflows the board', () => {
    const { battle, combat, hero } = fight();
    only(combat, { kind: 'attack', name: 'Bounce', power: 3 });
    for (let y = 1; y < battle.board.height; y++) {
      battle.board.grid[y] = Array(battle.board.width).fill('stone');
      battle.board.grid[y]![0] = null;
    }
    combat.gauge = 1000;
    battle.input('hardDrop');
    const penalty = Math.ceil(hero.maxHp * OVERFLOW_PENALTY);
    const hit = 3 + combat.enemy.atk - hero.def;
    expect(hero.hp).toBe(hero.maxHp - penalty - hit);
    expect(combat.gauge).toBe(1000); // on top of its gauge
  });

  it('gives no free move for an overflow its own curse caused', () => {
    const { battle, combat } = fight();
    for (let y = 1; y < battle.board.height; y++) {
      battle.board.grid[y] = Array(battle.board.width).fill('stone');
      battle.board.grid[y]![0] = null;
    }
    only(combat, { kind: 'curse', name: 'Hex', rows: 2 });
    combat.gauge = combat.actMs;
    combat.update(0);
    expect(kinds(battle).filter((k) => k === 'enemyMove')).toHaveLength(1);
    expect(kinds(battle)).toContain('overflow');
  });
});

describe('strike damage', () => {
  const plain = { attack: 0, backToBack: false, combo: 0, affinity: 1 };

  it('makes single lines weak and big clears steep', () => {
    expect(LINE_DAMAGE).toEqual([0, 3, 12, 26, 48]);
    expect([1, 2, 3, 4].map((n) => strikeDamage(n, plain))).toEqual([3, 12, 26, 48]);
    expect(strikeDamage(5, plain)).toBe(48);
    expect(strikeDamage(1, { ...plain, affinity: 0 })).toBe(1);
  });

  it('turns attack into a percentage bonus', () => {
    expect(ATTACK_PERCENT).toBe(0.04);
    expect(strikeDamage(4, { ...plain, attack: 10 })).toBe(Math.round(48 * 1.4));
  });

  it('multiplies back-to-back and combo clears', () => {
    expect(strikeDamage(4, { ...plain, backToBack: true })).toBe(48 * BACK_TO_BACK_MULTIPLIER);
    expect(strikeDamage(2, { ...plain, combo: 2 })).toBe(12 * (1 + 2 * COMBO_STEP));
    expect(strikeDamage(2, { ...plain, combo: 99 })).toBe(12 * (1 + MAX_COMBO * COMBO_STEP));
  });

  it('tracks back-to-back and combos across pieces', () => {
    const { battle, combat } = fight('shroom');
    combat.enemyHp = 9999;
    const hits = () =>
      battle.events.flatMap((e) => (e.event.kind === 'enemyHit' ? [e.event.amount] : []));
    setUpVerticalIClear(battle.board, 2);
    battle.input('hardDrop');
    setUpVerticalIClear(battle.board, 2);
    battle.input('hardDrop'); // back-to-back, combo 1
    expect(kinds(battle)).toContain('backToBack');
    expect(battle.events.map((e) => e.event)).toContainEqual({ kind: 'combo', steps: 1 });
    const attack = totalAttack(battle.hero);
    expect(hits()).toEqual([
      strikeDamage(2, { attack, backToBack: false, combo: 0, affinity: 1 }),
      strikeDamage(2, { attack, backToBack: true, combo: 1, affinity: 1 }),
    ]);
    setUpVerticalIClear(battle.board, 1);
    battle.input('hardDrop'); // a single breaks back-to-back
    expect(combat.backToBack).toBe(false);
    expect(combat.combo).toBe(2);
    forceQueue(battle, ['O']);
    battle.input('hardDrop'); // no clear: the combo ends
    expect(combat.combo).toBe(-1);
  });
});

describe('board attacks', () => {
  it('fog hides the preview for some pieces', () => {
    const { battle, combat } = fight();
    only(combat, { kind: 'fog', name: 'Haze', pieces: 2 });
    combat.gauge = combat.actMs;
    combat.update(0);
    expect(battle.upcoming).toEqual([]);
    expect(battle.events.at(-1)?.event).toEqual({ kind: 'fog', pieces: 2 });
    battle.input('hardDrop');
    battle.input('hardDrop');
    expect(battle.upcoming.length).toBeGreaterThan(0);
  });

  it('seal blocks a column outside the spawn area for some pieces', () => {
    const { battle, combat } = fight();
    only(combat, { kind: 'seal', name: 'Stake', pieces: 2 });
    combat.gauge = combat.actMs;
    combat.update(0);
    const seal = battle.board.seal!;
    expect(SPAWN_COLUMNS).not.toContain(seal.column);
    expect(kinds(battle)).toContain('seal');
    // No piece can enter it, so its row can't fill.
    forceQueue(battle, ['I', 'I', 'I']);
    battle.board.rotate();
    const side = seal.column < 3 ? -1 : 1;
    while (battle.board.move(side, 0));
    expect(battle.board.active!.cells.map(([x]) => x + battle.board.active!.x)).not.toContain(
      seal.column,
    );
    battle.input('hardDrop');
    expect(battle.board.seal?.pieces).toBe(1);
    battle.input('hardDrop');
    expect(battle.board.seal).toBeNull();
  });

  it('never seals a column under the falling piece, and an overflow lifts the seal', () => {
    const { battle } = fight();
    const board = battle.board;
    forceQueue(battle, ['I']);
    while (board.move(-1, 0));
    expect(board.sealableColumns()).toEqual([7, 8, 9]);
    board.sealColumn(9, 3);
    board.reset();
    expect(board.seal).toBeNull();
    board.active = null;
    expect(board.sealableColumns()).toEqual([0, 1, 2, 7, 8, 9]);
  });

  it('petrify turns crystals to stone', () => {
    const { battle, combat } = fight();
    battle.board.loadRows(['rrr#......']);
    only(combat, { kind: 'petrify', name: 'Goo', cells: 5 });
    combat.gauge = combat.actMs;
    combat.update(0);
    expect(battle.board.count('stone')).toBe(4);
    expect(battle.board.count('red')).toBe(0);
    const event = battle.events.at(-1)?.event;
    expect(event?.kind === 'petrify' && event.cells).toHaveLength(3);
  });

  it('quicken speeds up gravity for a time', () => {
    const { battle, combat } = fight();
    const normal = battle.gravityMs;
    only(combat, { kind: 'quicken', name: 'Flit', ms: 3000 });
    combat.gauge = combat.actMs;
    combat.update(0);
    expect(battle.gravityMs).toBeCloseTo(normal / QUICKEN_SPEED);
    battle.update(3000);
    expect(battle.quickenMs).toBe(0);
    expect(battle.gravityMs).toBe(normal);
  });

  it('shows every new event', () => {
    expect(feedbackFor({ kind: 'rush', holes: 2 })).toContainEqual({ kind: 'rush' });
    expect(feedbackFor({ kind: 'combo', steps: 2 })[0]).toMatchObject({ text: '×3' });
    expect(feedbackFor({ kind: 'backToBack' })[0]).toMatchObject({ icon: 'lines' });
    expect(feedbackFor({ kind: 'fog', pieces: 2 })[0]).toMatchObject({ icon: 'eye' });
    expect(feedbackFor({ kind: 'seal', column: 0, pieces: 2 })[0]).toMatchObject({ icon: 'lock' });
    expect(feedbackFor({ kind: 'petrify', cells: [[0, 1]] })[0]).toEqual({
      kind: 'flashCells',
      cells: [[0, 1]],
    });
    expect(feedbackFor({ kind: 'quicken', ms: 1 })[0]).toMatchObject({ icon: 'hourglass' });
  });
});

describe('enemy scaling', () => {
  const slime = ENEMIES.slime!;
  const wyrm = ENEMIES.moonWyrm!;

  it('grows with the hero within a band, never below its own level', () => {
    expect(effectiveLevel(slime, 1)).toBe(1);
    expect(effectiveLevel(ENEMIES.brute!, 1)).toBe(ENEMIES.brute!.level);
    expect(effectiveLevel(slime, 3)).toBe(3);
    expect(effectiveLevel(slime, 20)).toBe(1 + LEVEL_BAND);
    expect(effectiveLevel(wyrm, 20)).toBe(wyrm.level + BOSS_BAND);
    expect(effectiveLevel({ ...slime, band: 0 }, 20)).toBe(1);
  });

  it('adds HP, attack and speed per level grown', () => {
    const grown = scaledEnemy(slime, 3);
    expect(grown).toMatchObject({
      level: 3,
      hp: Math.round(slime.hp * (1 + 2 * HP_PER_LEVEL)),
      atk: slime.atk + 2 * ATK_PER_LEVEL,
    });
    expect(grown.actMs).toBeLessThan(slime.actMs);
    expect(scaledEnemy(slime, 1)).toEqual(slime);
    const angry = scaledEnemy(wyrm, 20);
    expect(angry.enrage!.actMs).toBeLessThan(wyrm.enrage!.actMs);
  });

  it('cuts XP once the hero outgrows the band; bosses never', () => {
    expect(xpShare(4, 4)).toBe(1);
    expect(xpShare(6, 4)).toBe(0.5);
    expect(xpShare(30, 4)).toBe(MIN_XP_SHARE);
    expect(xpShare(30, 4, true)).toBe(1);
    expect(scaledEnemy(slime, 6).xp).toBe(Math.round(slime.xp * 1.3 * 0.5));
    expect(scaledEnemy(wyrm, 20).xp).toBeGreaterThan(wyrm.xp);
  });

  it('fights the scaled foe, at its own level’s gravity', () => {
    const hero = createHero();
    while (hero.level < 4) gainXp(hero, hero.nextXp);
    const battle = makeBattle({ kind: 'combat', enemyId: 'slime' }, hero);
    expect(battle.combat!.enemy.level).toBe(4);
    expect(battle.combat!.enemy.hp).toBeGreaterThan(slime.hp);
    expect(battle.gravityMs).toBe(gravityInterval(1) * (1 + 0.04 * hero.stats.agility));
  });
});

describe('no free safety nets', () => {
  it('lets a Phoenix Feather revive only once per fight', () => {
    const { combat, hero } = fight();
    addItem(hero, 'phoenixFeather', 2);
    only(combat, { kind: 'attack', name: 'Crush', power: 999 });
    combat.gauge = combat.actMs;
    combat.update(0);
    expect(hero.hp).toBe(Math.ceil(hero.maxHp / 2));
    combat.gauge = combat.actMs;
    combat.update(0);
    expect(combat.status()).toBe('lost');
    expect(hero.items.phoenixFeather).toBe(1);
  });

  it('caps pauses per battle; resuming is always allowed', () => {
    const { battle } = fight();
    for (let i = 0; i < MAX_PAUSES; i++) {
      expect(battle.togglePause()).toBe(true);
      expect(battle.paused).toBe(true);
      expect(battle.togglePause()).toBe(true);
    }
    expect(battle.pausesLeft).toBe(0);
    expect(battle.togglePause()).toBe(false);
    expect(battle.paused).toBe(false);
  });

  it('adds attack while enraged', () => {
    const { combat, hero } = fight('moonWyrm');
    only(combat, { kind: 'attack', name: 'Lunar Breath', power: 16 });
    combat.enraged = true;
    combat.gauge = combat.actMs;
    combat.update(0);
    const hit = 16 + combat.enemy.atk + combat.enemy.enrage!.atk! - hero.def;
    expect(hero.hp).toBe(Math.max(0, hero.maxHp - hit));
  });

  it('shows spell and item time as a gauge flash', () => {
    expect(feedbackFor({ kind: 'gaugeJump', share: 0.15 })).toEqual([{ kind: 'rush' }]);
  });
});

describe('gentler first lessons', () => {
  it('gives difficulty-1 foes less HP while the hero is below level 3', () => {
    const wisp = ENEMIES.emberWisp!;
    expect(scaledFoe(wisp, 1, 1).hp).toBe(Math.round(wisp.hp * NOVICE_FOE_HP));
    expect(scaledFoe(wisp, 1, NOVICE_LEVEL).hp).toBe(wisp.hp);
    expect(scaledFoe(wisp, 2, 1).hp).toBeGreaterThan(wisp.hp);
  });

  it('patches up a winner to at least half HP', () => {
    const hero = createHero();
    hero.hp = 1;
    const spec = {
      kind: 'lesson',
      mentorId: 'kestrel',
      spellId: 'gust',
      enemyId: 'galeWisp',
      difficulty: 1,
    } as const;
    completeLesson(hero, spec, true);
    expect(hero.hp).toBe(Math.ceil(hero.maxHp / 2));
  });
});

describe('recovery', () => {
  it('heals a little per step on the map while below half HP', () => {
    const state = newGame();
    state.hero.hp = 1;
    const results = (['left', 'right', 'up', 'down'] as const).map((d) => step(state, d));
    const moved = results.filter((r) => r.kind === 'moved').length;
    expect(moved).toBeGreaterThan(0);
    expect(state.hero.hp).toBe(1 + moved);
  });
});

describe('the simulated player', () => {
  it('loses every ordinary fight by hard-dropping in place', { timeout: 60_000 }, () => {
    for (const id of ORDINARY) {
      for (let seed = 1; seed <= 3; seed++) {
        const result = simulate(
          { kind: 'combat', enemyId: id },
          heroAt(ENEMIES[id]!.level),
          'dropper',
          seed,
        );
        expect(result.won, `${id} seed ${seed}`).toBe(false);
      }
    }
  });

  it('beats ordinary fights most of the time with good play', () => {
    const good = measure({ kind: 'combat', enemyId: 'slime' }, 1, 'good', 8);
    expect(good.winRate).toBeGreaterThan(0.5);
    const sloppy = measure({ kind: 'combat', enemyId: 'goblin' }, 3, 'sloppy', 6);
    expect(sloppy.winRate).toBeLessThan(0.5);
    expect(createRng(1).next()).toBeLessThan(1);
  }, 60_000);
});

describe.skipIf(!process.env.SIM)('balance table (SIM=1)', () => {
  const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
  const row = (name: string, level: number, spec: ChallengeSpec, runs: number): string => {
    const good = measure(spec, level, 'good', runs);
    const prepared = measure(spec, level, 'prepared', runs);
    const spam = measure(spec, level, 'spammer', runs);
    const sloppy = measure(spec, level, 'sloppy', runs);
    const drop = measure(spec, level, 'dropper', Math.min(runs, 10));
    return `| ${name} | ${level} | ${pct(good.winRate)} | ${good.seconds.toFixed(0)} s / ${good.pieces.toFixed(0)} | ${pct(good.hpLeft)} | ${pct(prepared.winRate)} | ${pct(spam.winRate)} | ${spam.seconds.toFixed(0)} s | ${pct(sloppy.winRate)} | ${pct(drop.winRate)} |`;
  };

  it('prints win rates', () => {
    const runs = Number(process.env.RUNS ?? 40);
    const rows: string[] = [];
    for (const id of [...ORDINARY, 'moonWyrm']) {
      const enemy = ENEMIES[id]!;
      const level = id === 'moonWyrm' ? Number(process.env.WYRM_LEVEL ?? 8) : enemy.level;
      rows.push(row(id, level, { kind: 'combat', enemyId: id }, runs));
    }
    const lessons = [
      ['torva', 'emberWisp', 'fire'],
      ['maren', 'tideWisp', 'blizzard'],
      ['kestrel', 'galeWisp', 'gale'],
    ] as const;
    for (const [difficulty, level] of [
      [1, 1],
      [2, 3],
      [3, 5],
    ] as const) {
      for (const [mentorId, enemyId, spellId] of lessons) {
        const spec = { kind: 'lesson', mentorId, enemyId, spellId, difficulty } as const;
        rows.push(row(`${enemyId} d${difficulty}`, level, spec, runs));
      }
    }
    process.stderr.write(rows.join('\n') + '\n');
  }, 600_000);
});
