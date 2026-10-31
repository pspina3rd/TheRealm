import { describe, expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import type { LessonChallenge } from '../src/battle/lesson';
import { lessonPracticeIntent, prepareLessonPractice } from '../src/battle/lessonPractice';
import { Board } from '../src/core/board';
import { spanFor } from '../src/core/boardMagic';
import { emptyCounts } from '../src/core/elements';
import { createRng } from '../src/core/rng';
import { ENEMIES } from '../src/data/enemies';
import { createHero } from '../src/game/hero';
import { newKnownSpell } from '../src/game/spells';

const schools = [
  ['fire', 'torva', 'fire'],
  ['blizzard', 'maren', 'water'],
  ['quake', 'dorn', 'earth'],
  ['gale', 'kestrel', 'wind'],
  ['thunder', 'rook', 'lightning'],
  ['natureConvert', 'hazel', 'nature'],
] as const;

function board(): Board {
  const result = new Board(createRng(61));
  result.magicEnabled = true;
  result.spawn();
  return result;
}

function prepare(spellId: string, rank = 1, subject = board()) {
  const request = { spellId, rank, owner: `practice:${spellId}` };
  const intent = prepareLessonPractice(subject, request);
  return { board: subject, request, intent };
}

describe('school-specific practice demonstrations', () => {
  for (const [spellId, , element] of schools) {
    it.each([1, 2, 3, 4])(`${spellId} rank %s has a useful actual spell span`, (rank) => {
      const { board: subject, intent } = prepare(spellId, rank);
      expect(intent?.target).not.toBeNull();
      expect(intent?.rank).toBe(rank);
      const target = intent!.target!;
      const [top, bottom] = spanFor({ element, rank, bottomRow: target.bottomRow }, subject.height);
      expect(intent?.rows).toEqual(Array.from({ length: bottom - top + 1 }, (_, i) => top + i));
      const before = subject.magicState();
      const resolution = subject.resolveBoardMagic({ spell: { element, rank, ...target } });
      expect(resolution.changed).toBe(true);
      if (element === 'fire') {
        expect(
          resolution.removed.filter((cell) => cell.cause === 'spell').length,
        ).toBeGreaterThanOrEqual(rank);
        expect(Object.keys(before.obstructions)).toHaveLength(0);
      } else if (element === 'water') {
        expect(resolution.completed).toHaveLength(rank);
        expect(resolution.removed.every((removed) => removed.cell === 'neutral')).toBe(true);
      } else if (element === 'earth') {
        expect(intent!.landingCells.length).toBeGreaterThan(0);
        expect(
          resolution.visual?.some((block) => block.from && block.to && block.to[1] > block.from[1]),
        ).toBe(true);
        expect(resolution.removed).toHaveLength(0);
      } else if (element === 'wind') {
        expect(
          resolution.visual?.some(
            (block) => block.from && block.to && block.to[0] !== block.from[0],
          ),
        ).toBe(true);
        expect(Object.keys(before.obstructions)).toHaveLength(0);
      } else {
        const obstructions = Object.values(before.obstructions);
        expect(obstructions).toHaveLength(rank % 2 === 0 ? 2 : 1);
        expect(obstructions.every((o) => o.strength === (rank >= 3 ? 2 : 1))).toBe(true);
        expect(Object.keys(resolution.state.obstructions)).toHaveLength(0);
        if (element === 'nature') expect(subject.count('neutral')).toBe(obstructions.length);
        else expect(subject.count('stone')).toBe(0);
      }
    });
  }

  it('Arcane faces its opponent and does not add a stone or loose crystal', () => {
    const subject = board();
    const before = subject.magicState();
    const { intent } = prepare('shadow', 4, subject);
    expect(intent).toMatchObject({ school: 'Arcane', rank: 4, target: null, rows: [], cells: [] });
    expect(intent?.goal).toContain('opponent');
    expect(subject.magicState()).toEqual(before);
  });

  it('does nothing for legacy boards or non-board support lessons', () => {
    const subject = board();
    subject.magicEnabled = false;
    expect(prepare('fire', 1, subject).intent).toBeNull();
    subject.magicEnabled = true;
    expect(prepare('cure', 1, subject).intent).toBeNull();
    expect(subject.grid.flat().every((cell) => cell === null)).toBe(true);
  });
});

describe('practice placement safety and bounded replacement', () => {
  it.each(schools)('%s leaves the current piece, ghost and existing cells untouched', (spellId) => {
    const subject = board();
    while (subject.move(-1, 0));
    const active = structuredClone(subject.active!);
    const ghostY = subject.ghostY();
    const reserved = new Set(
      active.cells.flatMap(([dx, dy]) => [
        `${active.x + dx},${active.y + dy}`,
        `${active.x + dx},${ghostY + dy}`,
      ]),
    );
    subject.grid[12]![8] = 'gold';
    subject.tags[12]![8] = 'protected';
    const before = subject.grid.map((row) => row.slice());
    prepare(spellId, 4, subject);
    let additions = 0;
    for (let y = 0; y < subject.height; y++)
      for (let x = 0; x < subject.width; x++) {
        if (before[y]![x] !== null) expect(subject.grid[y]![x]).toBe(before[y]![x]);
        if (subject.grid[y]![x] !== before[y]![x]) {
          additions++;
          expect(reserved.has(`${x},${y}`)).toBe(false);
          expect(y).toBeGreaterThanOrEqual(12);
          expect(['neutral', 'stone']).toContain(subject.grid[y]![x]);
        }
      }
    expect(additions).toBeLessThanOrEqual(8);
    expect(subject.tags[12]![8]).toBe('protected');
    expect(subject.active).toEqual(active);
    expect(subject.ghostY()).toBe(ghostY);
    expect(subject.toppedOut).toBe(false);
    expect(subject.grid.some((row) => row.every((cell) => cell !== null))).toBe(false);
  });

  it('preserves existing useful work instead of replacing it with a template', () => {
    const subject = board();
    subject.grid[18]![0] = 'red';
    subject.tags[18]![0] = 'protected';
    const before = subject.magicState();
    expect(prepare('fire', 1, subject).intent?.target).not.toBeNull();
    expect(subject.magicState()).toEqual(before);
  });

  it.each(schools)(
    '%s keeps a usable layout instead of seeding another on repeated calls',
    (spellId) => {
      const { board: subject, request } = prepare(spellId, 4);
      const before = subject.magicState();
      for (let i = 0; i < 6; i++) prepareLessonPractice(subject, request);
      expect(subject.magicState()).toEqual(before);
    },
  );

  it('does not seed a last gap that would passively complete a row', () => {
    const subject = board();
    subject.grid[16] = Array.from({ length: subject.width }, (_, x) =>
      x === 0 ? null : 'neutral',
    );
    const before = subject.magicState();
    const { intent } = prepare('thunder', 1, subject);
    expect(intent?.target).toBeNull();
    expect(intent?.goal).toContain('Clear space');
    expect(subject.magicState()).toEqual(before);
  });

  it('does not make targets on a full board and never mutates through the intent getter', () => {
    const subject = board();
    for (let y = 4; y < subject.height; y++) subject.grid[y]!.fill('neutral');
    const before = subject.magicState();
    const request = { spellId: 'thunder', rank: 4, owner: 'practice:test' };
    prepareLessonPractice(subject, request);
    lessonPracticeIntent(subject, request);
    expect(subject.magicState()).toEqual(before);
  });

  it.each(schools)('%s reserves the first spawn and ghost before a piece exists', (spellId) => {
    const subject = new Board(createRng(91));
    subject.magicEnabled = true;
    prepare(spellId, 4, subject);
    expect(subject.spawn()).toBe(true);
    const active = subject.active!;
    const ghost = subject.ghostY();
    for (const [dx, dy] of active.cells) {
      expect(subject.grid[active.y + dy]?.[active.x + dx]).toBeNull();
      expect(subject.grid[ghost + dy]?.[active.x + dx]).toBeNull();
    }
  });
});

function lessonBattle(spellId: string, mentorId: string, rank: number, known = true) {
  const hero = createHero('mage');
  if (known) hero.spells[spellId] = { ...newKnownSpell(), level: rank };
  const battle = new Battle(
    {
      kind: 'lesson',
      mentorId,
      spellId,
      enemyId: 'goblin',
      difficulty: rank,
    },
    hero,
    createRng(440),
    { boardMagic: true },
  );
  const lesson = battle.challenge as LessonChallenge;
  lesson.gauge = -1e9;
  lesson.helpChance = 0;
  return { hero, battle, lesson };
}

/** A real three-line crystal clear pays for a cast and drives the foe to its shield. */
function earnLessonMana(battle: Battle, color: string): void {
  const lesson = battle.challenge as LessonChallenge;
  for (let attempt = 0; attempt < 6 && lesson.shield === 'none'; attempt++) {
    battle.board.loadRows(Array.from({ length: 3 }, () => `.${color.repeat(9)}`));
    battle.board.setFixedQueue(['I', 'O', 'T']);
    battle.board.active = null;
    battle.board.spawn();
    battle.board.rotate();
    while (battle.board.move(-1, 0));
    battle.input('hardDrop');
  }
}

describe('real lessons keep mana, taught ranks and shields honest', () => {
  it.each([
    ['fire', 'torva', 'r'],
    ['blizzard', 'maren', 'b'],
    ['quake', 'dorn', 'o'],
    ['gale', 'kestrel', 'c'],
    ['thunder', 'rook', 'g'],
    ['natureConvert', 'hazel', 'n'],
    ['shadow', 'selene', 'v'],
  ])(
    '%s starts empty and its paid taught cast breaks the real shield',
    (spellId, mentorId, color) => {
      const { hero, battle, lesson } = lessonBattle(spellId, mentorId, 1);
      expect(hero.mana).toEqual(emptyCounts());
      expect(battle.score).toBe(0);
      expect(battle.events.some(({ event }) => event.kind === 'mana')).toBe(false);
      expect(lesson.cannotCastReason(spellId)).toContain('mana');
      expect(lesson.enemy.moves).toEqual(ENEMIES.goblin!.moves);
      earnLessonMana(battle, color);
      expect(lesson.shield).toBe('up');
      const before = { ...hero.mana };
      const intent = lesson.practiceIntent;
      const target = intent?.target ?? {
        bottomRow: battle.board.height - 1,
        direction: 1 as const,
      };
      lesson.castSpell(spellId, target);
      expect(lesson.shield).toBe('broken');
      expect(Object.values(hero.mana).reduce((a, b) => a + b, 0)).toBeLessThan(
        Object.values(before).reduce((a, b) => a + b, 0),
      );
      expect(hero.spells[spellId]!.level).toBe(1);
    },
  );

  it('known rank 4 remains rank 4 while an unknown taught spell is lent at rank 1', () => {
    const known = lessonBattle('thunder', 'rook', 4);
    expect(known.lesson.practiceIntent?.rank).toBe(4);
    expect(Object.values(known.battle.board.obstructions).every((o) => o.strength === 2)).toBe(
      true,
    );
    const lent = lessonBattle('thunder', 'rook', 4, false);
    expect(lent.lesson.lent).toBe(true);
    expect(lent.lesson.practiceIntent?.rank).toBe(1);
    expect(lent.hero.spells.thunder).toBeUndefined();
    expect(lent.hero.mana).toEqual(emptyCounts());
  });

  it('lends a real paid cast without adding it to the saved spell book', () => {
    const { battle, lesson, hero } = lessonBattle('thunder', 'rook', 1, false);
    expect(hero.spells.thunder).toBeUndefined();
    earnLessonMana(battle, 'g');
    expect(lesson.shield).toBe('up');
    const target = lesson.practiceIntent!.target!;
    lesson.castSpell('thunder', target);
    expect(lesson.shield).toBe('broken');
    expect(hero.spells.thunder).toBeUndefined();
    expect(lesson.spellBook().thunder?.level).toBe(1);
  });

  it('a no-op board cast never breaks the shield or spends mana', () => {
    const { battle, lesson, hero } = lessonBattle('thunder', 'rook', 1);
    earnLessonMana(battle, 'g');
    expect(lesson.shield).toBe('up');
    battle.board.loadRows([]);
    const mana = { ...hero.mana };
    expect(() => lesson.castSpell('thunder', { bottomRow: 19, direction: 1 })).toThrow(
      /change nothing/,
    );
    expect(lesson.shield).toBe('up');
    expect(hero.mana).toEqual(mana);
    expect(battle.board.grid.flat().every((cell) => cell === null)).toBe(true);
  });

  it('the wrong taught school cannot bypass a raised shield', () => {
    const { battle, lesson, hero } = lessonBattle('thunder', 'rook', 1);
    hero.spells.shadow = newKnownSpell();
    earnLessonMana(battle, 'v');
    expect(lesson.shield).toBe('up');
    const enemyHp = lesson.enemyHp;
    lesson.castSpell('shadow');
    expect(lesson.shield).toBe('up');
    expect(lesson.enemyHp).toBe(enemyHp);
  });

  it('retries a crowded shield checkpoint only after a physical lock makes room', () => {
    const { battle, lesson, hero } = lessonBattle('thunder', 'rook', 1);
    battle.board.obstructions = {};
    for (let y = 12; y < battle.board.height; y++) battle.board.grid[y]!.fill('neutral');
    lesson.shield = 'up';
    const noTarget = lesson.practiceIntent;
    expect(noTarget?.target).toBeNull();
    expect(noTarget?.goal).toContain('Clear space');
    const full = battle.board.magicState();
    expect(lesson.practiceIntent).toEqual(noTarget);
    expect(battle.board.magicState()).toEqual(full);
    // This controlled clear frees the crowded lower board through the normal
    // lock path; no direct mana assignment or synthetic reward is involved.
    battle.board.loadRows(['.nnnnnnnnn']);
    battle.board.setFixedQueue(['I', 'O']);
    battle.board.active = null;
    battle.board.spawn();
    battle.board.rotate();
    while (battle.board.move(-1, 0));
    battle.input('hardDrop');
    expect(lesson.shield).toBe('up');
    expect(lesson.practiceIntent?.target).not.toBeNull();
    expect(
      Object.values(battle.board.obstructions).every((o) => o.owner.startsWith('lesson:')),
    ).toBe(true);
    expect(hero.mana.lightning).toBe(0);
  });
});
