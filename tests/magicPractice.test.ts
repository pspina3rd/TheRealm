import { describe, expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import { BOARD_SPELLS } from '../src/battle/magicCasting';
import { createRng } from '../src/core/rng';
import { createHero } from '../src/game/hero';
import { newKnownSpell } from '../src/game/spells';
import { createArcane } from '../src/game/arcane';
import { PRACTICES, practiceProgress, setupPractice } from '../src/game/magicPractice';
const solutions: Readonly<Record<string, readonly number[]>> = {
  lightning: [17, 18, 18, 19, 19, 19],
  nature: [17, 18, 19],
  gravity: [14, 15],
  ice: [19],
  fire: [16, 18],
  wind: [18],
  arcane: [19],
};
function setup(index: number) {
  const lesson = PRACTICES[index]!;
  const hero = createHero();
  for (const id of [...Object.keys(BOARD_SPELLS), 'shadow'])
    hero.spells[id] = { ...newKnownSpell(), level: 4 };
  const flags = new Set(['wyrmBeaten', 'scene:chapterEnd']);
  createArcane(hero, flags, 'nature');
  if (!lesson.spell.startsWith('arcane:')) hero.spells[lesson.spell]!.level = 1;
  const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(42), {
    boardMagic: true,
    storyFlags: flags,
  });
  hero.manaCap = 100;
  for (const e of Object.keys(hero.mana)) hero.mana[e as keyof typeof hero.mana] = 100;
  battle.combat!.gauge = -1e9;
  battle.combat!.enemyHp = 10000;
  setupPractice(battle, lesson);
  return { battle, lesson };
}
describe('guided spell exercises', () => {
  it.each(PRACTICES.map((p, i) => [p.id, i] as const))(
    '%s has a real rank-one solution and a detectable finish',
    (_id, index) => {
      const { battle, lesson } = setup(index);
      expect(practiceProgress(battle, lesson).done).toBe(false);
      for (const bottomRow of solutions[lesson.id] ?? []) {
        const target = { bottomRow, direction: 1 as const };
        const preview = battle.magicCasting.preview(lesson.spell, target);
        expect(preview.reason).toBeNull();
        if (lesson.spell.startsWith('arcane:')) battle.castArcane(lesson.spell, target);
        else battle.combat!.castSpell(lesson.spell, target);
      }
      if (lesson.goal === 'incoming')
        battle.placeObstructions('slime', [{ x: 4, y: 18, strength: 2 }]);
      expect(practiceProgress(battle, lesson).done).toBe(true);
      expect(battle.interference.placements.slime ?? 0).toBe(lesson.goal === 'incoming' ? 1 : 0);
    },
  );
  it('does not call destroying the Nature targets a successful conversion', () => {
    const { battle, lesson } = setup(1);
    for (const y of [17, 18, 19])
      battle.combat!.castSpell('thunder', { bottomRow: y, direction: 1 });
    expect(Object.keys(battle.board.obstructions)).toHaveLength(0);
    expect(practiceProgress(battle, lesson).done).toBe(false);
  });
});
