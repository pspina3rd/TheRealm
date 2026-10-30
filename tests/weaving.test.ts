import { SPELLS } from '../src/data/spells';
import { describe, expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import { createRng } from '../src/core/rng';
import { createHero } from '../src/game/hero';
import { newKnownSpell } from '../src/game/spells';
import {
  saveWeave,
  upgradeWeave,
  weaveCost,
  WEAVE_SPELLS,
  type WeaveRecipe,
} from '../src/game/weaving';
import { deserialize, serialize } from '../src/game/save';
import { newGame } from '../src/world/state';
const flags = new Set(['wyrmBeaten', 'scene:chapterEnd']);
function fixture(pacing = 0) {
  const hero = createHero();
  for (const id of WEAVE_SPELLS) hero.spells[id] = { ...newKnownSpell(), level: 4 };
  const recipe: WeaveRecipe = {
    id: 'one',
    name: 'Emberfall',
    level: 1,
    stages: [
      { spell: 'fire', rank: 1 },
      { spell: 'quake', rank: 1 },
    ],
  };
  expect(saveWeave(hero, flags, recipe)).toBe(true);
  const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(42), {
    boardMagic: true,
    storyFlags: flags,
    autoCast: true,
    autoCastPacingMs: pacing,
  });
  hero.hp = hero.maxHp = 10000;
  hero.manaCap = 100;
  for (const e of Object.keys(hero.mana)) hero.mana[e as keyof typeof hero.mana] = 100;
  battle.combat!.enemyHp = 10000;
  battle.board.loadRows([
    '..........',
    '..b.......',
    '..........',
    '..........',
    '..r.......',
    '..........',
  ]);
  return { hero, battle, recipe };
}
const targets = [
  { bottomRow: 18, direction: 1 },
  { bottomRow: 15, direction: 1 },
] as const;
describe('independent custom Arcane Weaving', () => {
  it('keeps opponent Arcane ownership independent and requires the real unlock and learned bases', () => {
    const hero = createHero();
    const r: WeaveRecipe = {
      id: 'a',
      name: 'a',
      level: 1,
      stages: [
        { spell: 'fire', rank: 1 },
        { spell: 'quake', rank: 1 },
      ],
    };
    expect(saveWeave(hero, flags, r)).toBe(false);
    hero.spells.fire = { ...newKnownSpell(), level: 2 };
    hero.spells.quake = { ...newKnownSpell(), level: 2 };
    expect(saveWeave(hero, new Set(['wyrmBeaten']), r)).toBe(false);
    expect(saveWeave(hero, flags, r)).toBe(true);
    expect(hero.arcane).toEqual({});
    expect(hero.spells.shadow).toBeUndefined();
  });
  it('previews both stages without mutations and commits a single combined payment', () => {
    const { battle, hero } = fixture();
    const before = JSON.stringify([hero, battle.board.magicState()]);
    const p = battle.previewWeaving(structuredClone(targets));
    expect(p.reason).toBeNull();
    expect(p.stages).toHaveLength(2);
    expect(p.stages[0]!.preview.resolution.state.grid[18]![2]).toBeNull();
    expect(p.stages[1]!.before).toEqual(p.stages[0]!.preview.resolution.state);
    expect(p.stages[1]!.preview.resolution.state.grid[19]![2]).toBe('blue');
    expect(JSON.stringify([hero, battle.board.magicState()])).toBe(before);
    battle.castWeaving(p);
    expect(hero.mana.fire).toBe(100 - p.cost.fire!);
    expect(hero.mana.earth).toBe(100 - p.cost.earth!);
    expect(hero.mana.arcane).toBe(100);
    expect(battle.board.grid[19]![2]).toBe('blue');
  });
  it('executes reversed order to a different board', () => {
    const first = fixture(),
      second = fixture();
    second.hero.weaving!.recipes[0]!.stages.reverse();
    const forward = first.battle.previewWeaving(structuredClone(targets));
    const reverse = second.battle.previewWeaving([targets[1], targets[0]]);
    expect(forward.stages[1]!.preview.resolution.state.grid).not.toEqual(
      reverse.stages[1]!.preview.resolution.state.grid,
    );
    expect(reverse.stages[1]!.preview.resolution.state.grid[17]![2]).toBe('blue');
  });
  it('refuses insufficient total mana, sealed sources and stale previews without partial effects', () => {
    const { hero, battle } = fixture();
    const p = battle.previewWeaving(structuredClone(targets));
    hero.mana.earth = 0;
    const before = JSON.stringify([hero.mana, battle.board.magicState()]);
    expect(battle.previewWeaving(structuredClone(targets)).reason).toContain('both effects');
    expect(() => battle.castWeaving(p)).toThrow('again');
    expect(JSON.stringify([hero.mana, battle.board.magicState()])).toBe(before);
    hero.mana.earth = 100;
    hero.seal = { spellId: 'quake', fights: 2 };
    expect(battle.previewWeaving(structuredClone(targets)).reason).toContain('sealed');
  });
  it('does not trust a mutated preview result or cost', () => {
    const { hero, battle } = fixture();
    const p = battle.previewWeaving(structuredClone(targets));
    p.cost = {};
    p.stages[1]!.preview.resolution.state.grid[19]![2] = 'stone';
    battle.castWeaving(p);
    expect(hero.mana.fire).toBeLessThan(100);
    expect(battle.board.grid[19]![2]).toBe('blue');
  });
  it('sums repeated-source costs and preserves distinct selected strengths', () => {
    const { hero } = fixture();
    hero.skillPoints = 100;
    expect(upgradeWeave(hero, flags, 'one')).toBe(true);
    const recipe = structuredClone(hero.weaving!.recipes[0]!);
    recipe.stages = [
      { spell: 'fire', rank: 1 },
      { spell: 'fire', rank: 2 },
    ];
    expect(saveWeave(hero, flags, recipe)).toBe(true);
    expect(weaveCost(hero, recipe)).toEqual({ fire: 14 });
    expect(hero.skillPoints).toBe(94);
    expect(saveWeave(hero, flags, { ...recipe, level: 4 })).toBe(false);
  });
  it('shows two ordered effects and holds payment until the combined cast completes', () => {
    const { battle, hero } = fixture(500);
    battle.castWeaving(battle.previewWeaving(structuredClone(targets)));
    expect(battle.autoFrame?.source).toBe('weave');
    const before = JSON.stringify(battle.board.magicState()),
      gauge = battle.combat!.gauge;
    battle.update(500);
    battle.update(900);
    expect(battle.autoFrame?.phase).toBe('result');
    expect(hero.mana.fire).toBe(100);
    expect(JSON.stringify(battle.board.magicState())).toBe(before);
    battle.update(500);
    expect(battle.autoFrame?.index).toBe(2);
    expect(battle.combat!.gauge).toBe(gauge);
    battle.update(500);
    battle.update(900);
    expect(hero.mana.fire).toBeLessThan(100);
    expect(battle.board.grid[19]![2]).toBe('blue');
    battle.update(500);
    expect(battle.autoCastingBusy).toBe(false);
    expect(battle.autoCastCount).toBe(0);
  });
  it('round-trips recipes, equipment, Arcane techniques, and an empty spellbook independently', () => {
    const { hero } = fixture();
    const state = newGame();
    state.hero = hero;
    hero.arcane = { wind: 2 };
    const loaded = deserialize(serialize(state))!;
    expect(loaded.hero.weaving).toEqual(hero.weaving);
    expect(loaded.hero.arcane).toEqual({ wind: 2 });
    const old = JSON.parse(serialize(newGame()));
    old.version = 13;
    delete old.hero.weaving;
    expect(deserialize(JSON.stringify(old))!.hero.spells).toEqual({});
    expect(deserialize(JSON.stringify(old))!.hero.weaving).toEqual({ recipes: [], equipped: null });
  });
});

describe('custom mix, strength, and order coverage', () => {
  it('covers all 576 ordered two-effect strength combinations, including repeated schools', () => {
    const { hero } = fixture();
    let checked = 0;
    for (const first of WEAVE_SPELLS)
      for (const second of WEAVE_SPELLS) {
        hero.weaving = { recipes: [], equipped: null };
        hero.skillPoints = 38;
        const recipe: WeaveRecipe = {
          id: 'mix',
          name: 'mix',
          level: 1,
          stages: [
            { spell: first, rank: 1 },
            { spell: second, rank: 1 },
          ],
        };
        expect(saveWeave(hero, flags, recipe)).toBe(true);
        for (let i = 0; i < 3; i++) expect(upgradeWeave(hero, flags, 'mix')).toBe(true);
        expect(hero.skillPoints).toBe(0);
        for (const one of [1, 2, 3, 4])
          for (const two of [1, 2, 3, 4]) {
            recipe.level = 4;
            recipe.stages[0].rank = one;
            recipe.stages[1].rank = two;
            expect(saveWeave(hero, flags, recipe)).toBe(true);
            const expected: Record<string, number> = {};
            for (const stage of recipe.stages)
              for (const [element, n] of Object.entries(
                SPELLS[stage.spell]!.levels[stage.rank - 1]!.cost,
              ))
                expected[element] = (expected[element] ?? 0) + n;
            expect(weaveCost(hero, recipe)).toEqual(expected);
            expect(hero.weaving.recipes[0]!.stages).toEqual(recipe.stages);
            checked++;
          }
      }
    expect(checked).toBe(576);
  });
});
