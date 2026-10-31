import { describe, expect, it } from 'vitest';
import { STANDARD_SPELLS } from '../src/battle/magicCasting';
import { MENTORS } from '../src/data/mentors';
import { ENHANCEMENT_IDS, SPELLS } from '../src/data/spells';
import { gainXp, spendSkillPoints } from '../src/game/hero';
import { completeLesson, lessonsFor, type LessonSpec } from '../src/game/lessons';
import { deserialize, serialize } from '../src/game/save';
import { adjustEnhancement, EMPTY_PLAN, skillPlanCost } from '../src/game/skills';
import { heroSpell, newKnownSpell, totalEnhancements } from '../src/game/spells';
import { newGame } from '../src/world/state';

describe('independent paid upgrades for every primary school', () => {
  it.each(Object.keys(STANDARD_SPELLS))(
    '%s retains all four ranks, paid training, mentor lessons and save recovery',
    (id) => {
      const state = newGame();
      state.flags.add('boardMagicEnabled');
      // Arcane has its separate story gate; this is an upgrade-contract fixture,
      // not a claim that a new hero can learn it before the Wyrm.
      if (id === 'shadow') {
        state.flags.add('wyrmBeaten');
        state.flags.add('scene:chapterEnd');
      }
      const mentor = Object.values(MENTORS).find((m) => m.element === SPELLS[id]!.category)!;
      const spec: LessonSpec = {
        kind: 'lesson',
        spellId: id,
        mentorId: mentor.id,
        enemyId: mentor.trialFoe,
        difficulty: 1,
      };
      completeLesson(state.hero, spec, true);
      expect(state.hero.spells[id]).toEqual(newKnownSpell());
      for (const level of [1, 2, 3]) {
        const paid = [6, 12, 20][level - 1]!;
        while (state.hero.skillPoints < paid) gainXp(state.hero, state.hero.nextXp);
        let plan = EMPTY_PLAN;
        for (const attribute of ENHANCEMENT_IDS) plan = adjustEnhancement(plan, id, attribute, 1);
        for (let extra = 1; extra < level; extra++)
          plan = adjustEnhancement(plan, id, 'efficiency', 1);
        const before = state.hero.skillPoints;
        expect(skillPlanCost(state.hero, plan)).toBe(paid);
        expect(spendSkillPoints(state.hero, plan)).toBe(true);
        expect(state.hero.skillPoints).toBe(before - paid);
        expect(state.hero.spells[id]!.level).toBe(level);
        expect(lessonsFor(state, mentor)).toContainEqual({
          spellId: id,
          level: level + 1,
          difficulty: level + 1,
        });
        const training = totalEnhancements(state.hero.spells[id]!);
        completeLesson(state.hero, { ...spec, difficulty: level + 1 }, true);
        expect(state.hero.spells[id]!.level).toBe(level + 1);
        expect(totalEnhancements(state.hero.spells[id]!)).toEqual(training);
        const recovered = deserialize(serialize(state))!;
        expect(recovered.hero.spells).toEqual(state.hero.spells);
        expect(heroSpell(recovered.hero, id)).toEqual(heroSpell(state.hero, id));
        expect(Object.keys(recovered.hero.spells)).toEqual([id]);
      }
      expect(lessonsFor(state, mentor).some((lesson) => lesson.spellId === id)).toBe(false);
    },
  );
});
