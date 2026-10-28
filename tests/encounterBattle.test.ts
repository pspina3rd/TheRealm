/**
 * The shared encounter systems in a running battle (docs/ENCOUNTER_DESIGN.md
 * §2, §3.4, §4, §6.3, §7.1): the pre-roll, the person's demo, giving up,
 * faces and lines, the threshold assist, the mentor's shield and lent
 * spell, sealed spells, and the region rules (spores, the dark).
 */
import { describe, expect, it } from 'vitest';
import { steeredLanding } from '../src/battle/assist';
import { Battle, DEMO_DELAY_MS, DEMO_ROW_MS } from '../src/battle/battle';
import type { LessonChallenge } from '../src/battle/lesson';
import type { SporeRule } from '../src/battle/rules';
import { DarkRule, createRule, visibleCells } from '../src/battle/rules';
import type { BattleContext, BattleEvent } from '../src/battle/types';
import type { DigChallenge } from '../src/battle/verbs/dig';
import { Board } from '../src/core/board';
import { createRng } from '../src/core/rng';
import { REGION_RULES, SHIELD_AT, STAKES } from '../src/data/balance';
import { ENCOUNTER_DEFS, encounterOf } from '../src/data/encounters';
import { createHero, learnSpell } from '../src/game/hero';
import { feedbackFor } from '../src/ui/art/feedback';
import { EMPTY_LOCK, charge, makeBattle, rowWithGaps } from './helpers';

const kinds = (battle: Battle): string[] => battle.events.map((e) => e.event.kind);
const events = (battle: Battle): BattleEvent[] => battle.events.map((e) => e.event);

function encounter(id: string, options: { demo?: boolean; assisted?: boolean } = {}): Battle {
  return makeBattle({
    kind: 'encounter',
    id,
    strain: 0,
    demo: options.demo ?? false,
    assisted: options.assisted ?? false,
  });
}

describe('the pre-roll', () => {
  it('runs no clock and drops nothing until the first touch, which commits the hero', () => {
    const battle = encounter('stallKeeper');
    expect(battle.started).toBe(false);
    const piece = battle.board.active!;
    battle.update(30_000);
    expect(battle.board.active).toBe(piece);
    expect(piece.y).toBe(0);
    battle.input('left');
    expect(battle.started).toBe(true);
    expect(events(battle).slice(0, 2)).toEqual([
      { kind: 'begin' },
      { kind: 'beat', beat: 'start' },
    ]);
    for (let i = 0; i < 60; i++) battle.update(1_000);
    expect(battle.board.piecesPlaced).toBeGreaterThan(0);
  });

  it('starts fights and lessons at once', () => {
    expect(makeBattle({ kind: 'combat', enemyId: 'slime' }).started).toBe(true);
  });
});

describe('the person’s demo (first try)', () => {
  it('places Rowan’s own O into the gap; the row vanishes; the queue is untouched', () => {
    const battle = encounter('elder', { demo: true });
    const queued = battle.board.preview(2);
    expect(battle.board.active?.name).toBe('O');
    expect(battle.demo).not.toBeNull();
    // Input waits while the person plays.
    battle.input('left');
    expect(battle.started).toBe(false);
    battle.update(DEMO_DELAY_MS - 10);
    expect(battle.board.active?.y).toBe(0);
    for (let i = 0; i < 40 && battle.demo; i++) battle.update(DEMO_ROW_MS);
    expect(battle.demo).toBeNull();
    expect(kinds(battle)).toEqual(expect.arrayContaining(['demo', 'lines']));
    // r6 cleared; the O's top half sits on r5.
    expect((battle.challenge as DigChallenge).rowsAbove()).toBe(5);
    // The piece the O displaced comes next.
    expect(battle.board.active?.name).toBe(queued[0]);
    expect(battle.started).toBe(false);
  });

  it('places Pip’s first piece from the queue itself', () => {
    const battle = encounter('kid', { demo: true });
    for (let i = 0; i < 60 && battle.demo; i++) battle.update(100);
    expect(battle.board.grid[19]!.slice(4, 6)).toEqual(['gold', 'gold']);
    expect(battle.board.active?.name).toBe('S');
  });

  it('has no demo for an encounter without one, or when the piece can’t enter', () => {
    expect(encounter('forager', { demo: true }).demo).toBeNull();
    const battle = new Battle(
      { kind: 'encounter', id: 'elder', strain: 0, demo: false, assisted: false },
      createHero(),
      createRng(3),
    );
    // Fill the top so the O can't be swapped in.
    battle.board.grid[0] = Array(6).fill('stone');
    battle.board.grid[1] = Array(6).fill('stone');
    (battle as unknown as { startDemo(d: unknown): void }).startDemo(ENCOUNTER_DEFS.elder!.demo);
    expect(battle.demo).toBeNull();
  });
});

describe('giving up', () => {
  it('counts as a fail, once', () => {
    const battle = encounter('farmer');
    battle.giveUp();
    expect(battle.status).toBe('lost');
    battle.giveUp();
    expect(battle.gaveUp).toBe(true);
  });
});

describe('faces and lines', () => {
  it('cheers a 3+ clear, cries out near the top, winces at a hole, and says “nearly” once', () => {
    const battle = encounter('farmer');
    const react = (result: typeof EMPTY_LOCK) =>
      (battle as unknown as { react(r: typeof EMPTY_LOCK): void }).react(result);
    react({ ...EMPTY_LOCK, linesCleared: 3 });
    expect(events(battle).at(-1)).toEqual({ kind: 'face', face: 'cheer' });
    react({ ...EMPTY_LOCK, holesMade: 1 });
    expect(events(battle).at(-1)).toEqual({ kind: 'face', face: 'wince' });
    battle.board.grid[2] = rowWithGaps(10, [0]);
    react(EMPTY_LOCK);
    expect(events(battle).at(-1)).toEqual({ kind: 'face', face: 'alarm' });
    battle.board.grid[2] = rowWithGaps(10, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const before = battle.events.length;
    react(EMPTY_LOCK);
    expect(battle.events.length).toBe(before);
    (battle.challenge as unknown as { score: number }).score = 11;
    react(EMPTY_LOCK);
    react(EMPTY_LOCK);
    expect(events(battle).filter((e) => e.kind === 'beat' && e.beat === 'nearly')).toHaveLength(1);
  });

  it('turns faces, lines and the new encounter events into feedback', () => {
    expect(feedbackFor({ kind: 'face', face: 'cheer' })).toEqual([{ kind: 'face', face: 'cheer' }]);
    expect(feedbackFor({ kind: 'beat', beat: 'start' })).toEqual([{ kind: 'beat', beat: 'start' }]);
    expect(feedbackFor({ kind: 'begin' })).toEqual([]);
    expect(feedbackFor({ kind: 'holes', count: 2 })).toEqual([]);
    expect(feedbackFor({ kind: 'demo' })).toHaveLength(1);
    expect(feedbackFor({ kind: 'rise', rows: 1, source: 'rising' })).toEqual([
      { kind: 'shake', target: 'board' },
    ]);
    expect(feedbackFor({ kind: 'rise', rows: 1, source: 'curse' })).toEqual([]);
    expect(feedbackFor({ kind: 'lamp', index: 0, lit: true })[0]).toMatchObject({ icon: 'star' });
    expect(feedbackFor({ kind: 'lamp', index: 0, lit: false })[0]).toMatchObject({ icon: 'wind' });
    expect(feedbackFor({ kind: 'spread', cells: [[1, 2]] })).toEqual([
      { kind: 'flashCells', cells: [[1, 2]] },
    ]);
    expect(feedbackFor({ kind: 'spores', cells: [] })).toHaveLength(1);
    expect(feedbackFor({ kind: 'saved' })).toHaveLength(1);
    expect(feedbackFor({ kind: 'lost' })).toHaveLength(1);
    expect(feedbackFor({ kind: 'sent', rows: 2 })[0]).toMatchObject({ text: '+2' });
    expect(feedbackFor({ kind: 'shield', up: true })).toHaveLength(1);
    expect(feedbackFor({ kind: 'shield', up: false })).toHaveLength(2);
  });
});

describe('the threshold assist', () => {
  it('lets Maren toss a J or T now and then, steered by the lamps’ hint, in its own colour', () => {
    const battle = encounter('guard', { assisted: true });
    expect(battle.assist).toMatchObject({ mentorId: 'maren', shapes: ['J', 'T'] });
    let tosses = 0;
    for (let i = 0; i < 30 && battle.status === 'ongoing'; i++) {
      battle.input('hardDrop');
      const last = events(battle).at(-1);
      if (last?.kind === 'toss') {
        tosses++;
        expect(['J', 'T']).toContain(last.piece);
        expect(battle.board.active?.recolored).toBe(false);
      }
    }
    expect(tosses).toBeGreaterThan(0);
    expect(encounter('guard').assist).toBeNull();
    expect(STAKES.assistToss).toBe(0.3);
  });

  it('can recolour its tosses, and does nothing when no shape fits or the mentor is unknown', () => {
    const battle = encounter('guard', { assisted: true });
    const toss = (assist: object) =>
      (battle as unknown as { assistToss(a: object): void }).assistToss(assist);
    toss({ mentorId: 'torva', shapes: ['O'], recolor: true });
    expect(battle.board.active).toMatchObject({ name: 'O', color: 'red', recolored: true });
    const before = battle.events.length;
    toss({ mentorId: 'nobody', shapes: ['O'], recolor: false });
    expect(battle.events.length).toBe(before);
    expect(steeredLanding(battle.board, [], undefined)).toBeNull();
    expect(steeredLanding(battle.board, ['I'], undefined)?.name).toBe('I');
  });
});

describe('the mentor’s shield and the lent spell', () => {
  function lesson(known: boolean) {
    const hero = createHero('ranger');
    if (known) learnSpell(hero, 'cure');
    else delete hero.spells.cure;
    const battle = makeBattle(
      { kind: 'lesson', mentorId: 'hazel', spellId: 'cure', enemyId: 'mossWisp', difficulty: 1 },
      hero,
    );
    const challenge = battle.challenge as LessonChallenge;
    challenge.gauge = -1e9;
    return { battle, challenge, hero };
  }

  it('lends a spell the hero doesn’t know, and lists it in the fight’s spell book', () => {
    const { challenge } = lesson(false);
    expect(challenge.lent).toBe(true);
    expect(challenge.spellBook()).toHaveProperty('cure');
    expect(challenge.cannotCastReason('cure')).toBe('Not enough mana!');
    const known = lesson(true);
    expect(known.challenge.lent).toBe(false);
    expect(known.challenge.spellBook()).toBe(known.hero.spells);
    expect(challenge.shieldElement).toBe('nature');
    expect(challenge.cannotCastReason('fire')).toBe("You don't know that spell.");
  });

  it('raises the shield at 25% HP; only the taught spell gets through, and breaks it', () => {
    const { battle, challenge, hero } = lesson(false);
    const mark = Math.ceil(challenge.enemy.hp * SHIELD_AT);
    challenge.enemyHp = mark + 2;
    const strike = (n: number) =>
      (challenge as unknown as { hitEnemy(n: number, e: null, a: null): void }).hitEnemy(
        n,
        null,
        null,
      );
    strike(10);
    expect(challenge.enemyHp).toBe(mark);
    expect(challenge.shield).toBe('up');
    expect(events(battle)).toContainEqual({ kind: 'shield', up: true });
    strike(10);
    expect(challenge.enemyHp).toBe(mark);
    hero.hp = 1; // Cure needs room to heal
    charge(hero);
    challenge.castSpell('cure');
    expect(challenge.shield).toBe('broken');
    expect(events(battle)).toContainEqual({ kind: 'shield', up: false });
    strike(5);
    expect(challenge.enemyHp).toBe(mark - 5);
  });

  it('lets a striking taught spell break the shield and land its blow', () => {
    const hero = createHero('ranger');
    const battle = makeBattle(
      { kind: 'lesson', mentorId: 'torva', spellId: 'fire', enemyId: 'emberWisp', difficulty: 1 },
      hero,
    );
    const challenge = battle.challenge as LessonChallenge;
    const mark = Math.ceil(challenge.enemy.hp * SHIELD_AT);
    challenge.enemyHp = mark;
    challenge.shield = 'up';
    charge(hero);
    challenge.castSpell('fire');
    expect(challenge.shield).toBe('broken');
    expect(challenge.enemyHp).toBeLessThan(mark);
    expect(events(battle).filter((e) => e.kind === 'shield')).toHaveLength(1);
  });

  it('lets the taught spell itself carry the foe past the mark: no shield then', () => {
    const { challenge } = lesson(false);
    const mark = Math.ceil(challenge.enemy.hp * SHIELD_AT);
    challenge.enemyHp = mark + 1;
    (challenge as unknown as { casting: boolean }).casting = true;
    (challenge as unknown as { hitEnemy(n: number, e: null, a: null): void }).hitEnemy(
      5,
      null,
      null,
    );
    expect(challenge.shield).toBe('broken');
    expect(challenge.enemyHp).toBe(mark - 4);
  });

  it('drops a foe exactly onto the mark without a zero hit', () => {
    const { battle, challenge } = lesson(false);
    const mark = Math.ceil(challenge.enemy.hp * SHIELD_AT);
    challenge.enemyHp = mark;
    const hits = battle.events.length;
    (challenge as unknown as { hitEnemy(n: number, e: null, a: null): void }).hitEnemy(
      3,
      null,
      null,
    );
    expect(challenge.shield).toBe('up');
    expect(battle.events.slice(hits).map((e) => e.event.kind)).toEqual(['shield']);
  });

  it('lets a sealed spell be cast in its own lesson, but not in a fight', () => {
    const { challenge, hero } = lesson(true);
    hero.seal = { spellId: 'cure', fights: 3 };
    hero.hp = 1;
    charge(hero);
    expect(challenge.cannotCastReason('cure')).toBeNull();
    const fight = makeBattle({ kind: 'combat', enemyId: 'slime' }, hero);
    charge(hero);
    expect(fight.combat!.cannotCastReason('cure')).toMatch('Sealed');
  });
});

describe('region rules', () => {
  function sporeFight() {
    const battle = new Battle(
      { kind: 'combat', enemyId: 'sproutling' },
      createHero(),
      createRng(4),
      {
        rule: 'spores',
      },
    );
    battle.combat!.gauge = -1e9;
    return { battle, rule: battle.rule as SporeRule };
  }

  it('brings Hazel’s spores to her lessons and the grove’s fights; nothing to encounters', () => {
    expect(sporeFight().rule.id).toBe('spores');
    const lesson = makeBattle({
      kind: 'lesson',
      mentorId: 'hazel',
      spellId: 'cure',
      enemyId: 'mossWisp',
      difficulty: 1,
    });
    expect(lesson.rule?.id).toBe('spores');
    expect(makeBattle({ kind: 'combat', enemyId: 'slime' }).rule).toBeNull();
    expect(
      new Battle(
        { kind: 'encounter', id: 'elder', strain: 0, demo: false, assisted: false },
        createHero(),
        createRng(1),
        { rule: 'spores' },
      ).rule,
    ).toBeNull();
  });

  it('lands a spore every 5 pieces on a top crystal marked a piece ahead, and spreads every 3', () => {
    const { battle, rule } = sporeFight();
    battle.board.grid[19] = rowWithGaps(10, [9], 'green');
    battle.board.grid[18] = rowWithGaps(10, [8, 9], 'green');
    for (let i = 0; i < 3; i++) rule.onLock();
    expect(rule.next).toBeNull();
    rule.onLock();
    expect(rule.next).not.toBeNull();
    const marked = rule.next!;
    expect(battle.telegraphs()).toEqual([
      { kind: 'cells', what: 'spore', cells: [marked], leadPieces: 1 },
    ]);
    rule.onLock();
    expect(battle.board.tagAt(...marked)).toBe('spore');
    expect(rule.untilLand).toBe(REGION_RULES.spores.landEvery);
    rule.onLock(); // spread (the 6th piece)
    expect(battle.board.countTag('spore')).toBe(2);
    expect(kinds(battle)).toContain('spores');
  });

  it('petrifies a cluster of four, and picks again when the marked crystal is gone', () => {
    const { battle, rule } = sporeFight();
    const board = battle.board;
    board.grid[19] = rowWithGaps(10, [], 'green');
    for (const x of [0, 1, 2, 3]) board.setTag(x, 19, 'spore');
    rule.untilSpread = 99;
    rule.onLock();
    expect(board.grid[19]!.slice(0, 4)).toEqual(['stone', 'stone', 'stone', 'stone']);
    expect(board.countTag('spore')).toBe(0);
    expect(kinds(battle)).toContain('petrify');
    rule.next = [0, 5];
    rule.untilLand = 1;
    rule.onLock();
    expect(board.countTag('spore')).toBe(1);
  });

  it('lands nothing on an empty board, and a lone spore with nothing beside it stays put', () => {
    const { battle, rule } = sporeFight();
    rule.untilLand = 1;
    rule.onLock();
    expect(battle.board.countTag('spore')).toBe(0);
    battle.board.grid[19] = rowWithGaps(10, [1, 2, 3, 4, 5, 6, 7, 8, 9], 'green');
    battle.board.setTag(0, 19, 'spore');
    rule.untilSpread = 1;
    rule.onLock();
    expect(battle.board.countTag('spore')).toBe(1);
  });

  it('keeps the grove’s spores on through a fight', () => {
    const { battle } = sporeFight();
    for (let i = 0; i < 6; i++) battle.input('hardDrop');
    expect(battle.board.countTag('spore')).toBeGreaterThan(0);
  });

  it('darkens all but the rows near the falling piece, the skyline and the landing ghost', () => {
    const board = new Board(createRng(1));
    board.loadRows(['#.........', '##........', '###.......', '####......', '#####.....']);
    expect(visibleCells(board).every((row) => row.every(Boolean))).toBe(true);
    board.setFixedQueue(['O']);
    board.spawn();
    const lit = visibleCells(board, 3);
    expect(lit[0]![0]).toBe(true); // near the piece
    expect(lit[4]![0]).toBe(true);
    expect(lit[5]![0]).toBe(false);
    expect(lit[15]![0]).toBe(true); // the skyline (column 0's top)
    expect(lit[16]![0]).toBe(false); // the interior below it
    const ghost = board.ghostY();
    expect(lit[ghost]![4]).toBe(true);
    expect(lit[ghost + 1]![4]).toBe(true);
    const dark = createRule({} as BattleContext, 'dark');
    expect(dark).toBeInstanceOf(DarkRule);
    dark.onLock(EMPTY_LOCK);
    expect(dark.telegraphs()).toEqual([]);
  });
});

describe('encounter lookups', () => {
  it('finds a person’s encounter, or none', () => {
    expect(encounterOf('elder')?.title).toBe('The Well');
    expect(encounterOf('merchant')).toBeUndefined();
    expect(encounterOf('toString')).toBeUndefined();
  });
});
