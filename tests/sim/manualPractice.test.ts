import { describe, expect, it } from 'vitest';
import { Battle } from '../../src/battle/battle';
import { autoTarget } from '../../src/battle/autoCasting';
import type { LessonChallenge } from '../../src/battle/lesson';
import { createRng } from '../../src/core/rng';
import { MENTORS } from '../../src/data/mentors';
import { createHero } from '../../src/game/hero';
import { newKnownSpell } from '../../src/game/spells';
import { castReady } from './simulate';

function windPractice(mana = 12) {
  const hero = createHero();
  const battle = new Battle(
    {
      kind: 'lesson',
      spellId: 'gale',
      mentorId: 'kestrel',
      enemyId: MENTORS.kestrel!.trialFoe,
      difficulty: 1,
    },
    hero,
    createRng(1),
    { boardMagic: true },
  );
  battle.board.loadRows(['..........']);
  battle.board.grid[5]![4] = 'cyan';
  hero.mana.wind = mana;
  const lesson = battle.combat as LessonChallenge;
  lesson.shield = 'up';
  lesson.gauge = -100000;
  return { battle, hero, lesson };
}

describe('manual practice target policy', () => {
  it('breaks the taught Wind shield with a meaningful score-neutral shift', () => {
    const { battle, hero, lesson } = windPractice();
    expect(battle.magicCasting.preview('gale', { bottomRow: 5, direction: 1 }).reason).toBeNull();
    expect(autoTarget(battle.magicCasting, 'gale')).toBeNull();
    castReady(battle);
    expect(lesson.shield).toBe('broken');
    expect(hero.mana.wind).toBe(6);
    expect(battle.board.grid[5]![4]).toBeNull();
    expect(battle.board.grid[5]!.filter((cell) => cell === 'cyan')).toHaveLength(1);
    expect(hero.spells).toEqual({});
    expect(battle.autoCastCount).toBe(0);
  });

  it('does not apply the manual fallback to ordinary automatic combat', () => {
    const hero = createHero();
    hero.spells.gale = newKnownSpell();
    const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(2), {
      boardMagic: true,
      autoCast: true,
    });
    battle.board.loadRows(['..........']);
    battle.board.grid[5]![4] = 'cyan';
    hero.mana.wind = 12;
    const before = battle.board.magicState();
    expect(autoTarget(battle.magicCasting, 'gale')).toBeNull();
    castReady(battle);
    expect(battle.board.magicState()).toEqual(before);
    expect(hero.mana.wind).toBe(12);
    expect(battle.autoCastCount).toBe(0);
  });

  it('does not bypass a practiced spell’s mana requirement', () => {
    const { battle, hero, lesson } = windPractice(0);
    const before = battle.board.magicState();
    castReady(battle);
    expect(lesson.shield).toBe('up');
    expect(hero.mana.wind).toBe(0);
    expect(battle.board.magicState()).toEqual(before);
  });

  it('does not spend practice mana on a no-op when no target exists', () => {
    const { battle, hero, lesson } = windPractice();
    battle.board.loadRows(['..........']);
    castReady(battle);
    expect(lesson.shield).toBe('up');
    expect(hero.mana.wind).toBe(12);
  });
});
