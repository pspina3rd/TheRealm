import { describe, expect, it } from 'vitest';
import { autoSpellOrder } from '../src/battle/autoCasting';
import { BOARD_SPELLS } from '../src/battle/magicCasting';
import {
  createHero,
  learnSpell,
  gainXp,
  spendSkillPoints,
  raiseSpellLevel,
} from '../src/game/hero';
import { newKnownSpell, isReady } from '../src/game/spells';
import { lessonsFor, completeLesson } from '../src/game/lessons';
import { MENTORS } from '../src/data/mentors';
import { SPELLS } from '../src/data/spells';
import { CLASSES } from '../src/data/classes';
import { newGame } from '../src/world/state';
import { deserialize, serialize } from '../src/game/save';
const ids = Object.keys(BOARD_SPELLS);
describe('player-chosen spell progression', () => {
  it('starts every class at zero and preserves that through save/reload', () => {
    for (const id of Object.keys(CLASSES)) {
      const state = newGame(id);
      expect(state.hero.spells).toEqual({});
      expect(deserialize(serialize(state))!.hero.spells).toEqual({});
    }
  });
  it('covers all 15,625 base spellbooks, including empty books and mixed ranks', () => {
    const hero = createHero();
    hero.titleElement = 'fire';
    let checked = 0;
    for (let encoded = 0; encoded < 5 ** 6; encoded++) {
      let remaining = encoded;
      hero.spells = {};
      for (const id of ids) {
        const rank = remaining % 5;
        remaining = Math.floor(remaining / 5);
        if (rank) hero.spells[id] = { ...newKnownSpell(), level: rank };
      }
      const before = JSON.stringify(hero.spells);
      const order = autoSpellOrder(hero);
      const expected = ids
        .filter((id) => hero.spells[id])
        .sort(
          (a, b) =>
            hero.spells[b]!.level - hero.spells[a]!.level ||
            Number(BOARD_SPELLS[b] === 'fire') - Number(BOARD_SPELLS[a] === 'fire'),
        );
      expect(order).toEqual(expected);
      expect(JSON.stringify(hero.spells)).toBe(before);
      checked++;
    }
    expect(checked).toBe(15625);
  });
  it('allows every acquisition order through mentor offers without requiring another base school', () => {
    let prefixes = 0,
      completed = 0;
    const visit = (state: ReturnType<typeof newGame>, left: string[]): void => {
      prefixes++;
      expect(deserialize(serialize(state))!.hero.spells).toEqual(state.hero.spells);
      if (!left.length) {
        completed++;
        return;
      }
      for (const id of left) {
        const next = structuredClone(state);
        const mentor = Object.values(MENTORS).find((m) => m.element === BOARD_SPELLS[id])!;
        expect(
          lessonsFor(next, mentor).some((l) => l.spellId === id && l.level === 1),
          `${id} after ${Object.keys(next.hero.spells).join(',')}`,
        ).toBe(true);
        completeLesson(
          next.hero,
          {
            kind: 'lesson',
            mentorId: mentor.id,
            spellId: id,
            enemyId: mentor.trialFoe,
            difficulty: 1,
          },
          true,
        );
        expect(Object.keys(next.hero.spells)).toEqual([...Object.keys(state.hero.spells), id]);
        visit(
          next,
          left.filter((s) => s !== id),
        );
      }
    };
    const state = newGame();
    state.flags.add('boardMagicEnabled');
    visit(state, ids);
    expect(prefixes).toBe(1957);
    expect(completed).toBe(720);
  });
});

describe('mixed progression over reproducible histories', () => {
  it('keeps ownership, XP-paid upgrades, and save/reload consistent over generated choices', () => {
    for (let seed = 1; seed <= 64; seed++) {
      let state = newGame(),
        value = seed;
      const next = () => {
        value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
        return value >>> 8;
      };
      const acquired = new Set<string>();
      for (let turn = 0; turn < 40; turn++) {
        const id = ids[next() % ids.length]!;
        const choice = next() % 4;
        if (choice === 0) {
          learnSpell(state.hero, id);
          acquired.add(id);
        }
        if (choice === 1) gainXp(state.hero, state.hero.nextXp);
        if (choice === 2) {
          const attribute = (['power', 'efficiency', 'effect'] as const)[next() % 3]!;
          const before = state.hero.skillPoints;
          const paid = spendSkillPoints(state.hero, {
            stats: {},
            spells: { [id]: { [attribute]: 1 } },
          });
          expect(state.hero.skillPoints).toBeGreaterThanOrEqual(0);
          expect(state.hero.skillPoints <= before).toBe(true);
          if (!acquired.has(id)) expect(paid).toBe(false);
        }
        const known = state.hero.spells[id];
        if (choice === 3 && known && isReady(SPELLS[id]!, known)) raiseSpellLevel(state.hero, id);
        expect(Object.keys(state.hero.spells).sort()).toEqual([...acquired].sort());
        expect(autoSpellOrder(state.hero).every((spell) => acquired.has(spell))).toBe(true);
        const loaded = deserialize(serialize(state))!;
        expect(loaded.hero).toEqual(state.hero);
        state = loaded;
      }
    }
  });
  it('locks seventh-group Arcane lessons until the Moon Wyrm aftermath in board-magic play', () => {
    const state = newGame();
    state.flags.add('boardMagicEnabled');
    const mentor = Object.values(MENTORS).find((m) => m.element === 'arcane')!;
    expect(lessonsFor(state, mentor)).toEqual([]);
    state.flags.add('wyrmBeaten');
    expect(lessonsFor(state, mentor)).toEqual([]);
    state.flags.add('scene:chapterEnd');
    expect(lessonsFor(state, mentor).some((l) => l.spellId === 'shadow')).toBe(true);
  });
});
