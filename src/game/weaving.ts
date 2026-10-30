/** A separate, equippable two-stage spell; Arcane techniques target opponents. */
import type { Hero } from './hero';
import { arcaneUnlocked } from './arcane';
import { castSpellFor, isSealed } from './spells';
import { SPELLS } from '../data/spells';
import type { ElementAmounts } from '../data/types';
export const WEAVE_UPGRADE_COSTS = [6, 12, 20] as const;
export const WEAVE_SPELLS = [
  'fire',
  'blizzard',
  'quake',
  'gale',
  'thunder',
  'natureConvert',
] as const;
export type WeaveSpell = (typeof WEAVE_SPELLS)[number];
export const WEAVE_NAMES: Record<WeaveSpell, string> = {
  fire: 'Fire',
  blizzard: 'Ice',
  quake: 'Gravity',
  gale: 'Wind',
  thunder: 'Lightning',
  natureConvert: 'Nature',
};
export interface WeaveStage {
  spell: WeaveSpell;
  rank: number;
}
export interface WeaveRecipe {
  id: string;
  name: string;
  level: number;
  stages: [WeaveStage, WeaveStage];
}
export interface Weaving {
  recipes: WeaveRecipe[];
  equipped: string | null;
}
export function emptyWeaving(): Weaving {
  return { recipes: [], equipped: null };
}
export function weaveCap(hero: Hero, stages: readonly WeaveStage[]): number {
  return Math.min(4, ...stages.map((s) => hero.spells[s.spell]?.level ?? 0));
}
export function weaveReason(
  hero: Hero,
  flags: ReadonlySet<string>,
  recipe: WeaveRecipe,
): string | null {
  if (!arcaneUnlocked(flags)) return 'Weaving unlocks after the Moon Wyrm aftermath.';
  if (recipe.stages.length !== 2) return 'Choose two effects in casting order.';
  if (recipe.stages.some((s) => !WEAVE_SPELLS.includes(s.spell))) return 'Unknown weaving effect.';
  if (weaveCap(hero, recipe.stages) < 2) return 'Learn both chosen spells to level 2 first.';
  if (!Number.isInteger(recipe.level) || recipe.level < 1 || recipe.level > 4)
    return 'Invalid weaving level.';
  if (
    recipe.stages.some(
      (s) =>
        !Number.isInteger(s.rank) ||
        s.rank < 1 ||
        s.rank > Math.min(recipe.level, hero.spells[s.spell]?.level ?? 0),
    )
  )
    return 'An effect exceeds its learned or weaving level.';
  if (recipe.stages.some((s) => isSealed(hero, s.spell))) return 'A chosen spell is sealed.';
  return null;
}
export function weaveCost(hero: Hero, recipe: WeaveRecipe): ElementAmounts {
  const cost: { -readonly [K in keyof ElementAmounts]: ElementAmounts[K] } = {};
  for (const stage of recipe.stages) {
    const known = hero.spells[stage.spell],
      def = SPELLS[stage.spell];
    if (!known || !def) throw new Error('Learn both chosen spells first.');
    const cast = castSpellFor(def, { ...known, level: stage.rank });
    for (const [element, amount] of Object.entries(cast.cost)) {
      const e = element as keyof ElementAmounts;
      cost[e] = (cost[e] ?? 0) + amount;
    }
  }
  return cost;
}
export function saveWeave(hero: Hero, flags: ReadonlySet<string>, recipe: WeaveRecipe): boolean {
  if (weaveReason(hero, flags, recipe)) return false;
  const book = (hero.weaving ??= emptyWeaving());
  const old = book.recipes.find((r) => r.id === recipe.id);
  // Editing cannot grant paid progression.
  if (recipe.level !== (old?.level ?? 1)) return false;
  const clean = structuredClone({ ...recipe, name: recipe.name.trim() || 'Custom spell' });
  if (old) book.recipes[book.recipes.indexOf(old)] = clean;
  else book.recipes.push(clean);
  book.equipped = recipe.id;
  return true;
}
export function upgradeWeave(hero: Hero, flags: ReadonlySet<string>, id: string): boolean {
  const recipe = hero.weaving?.recipes.find((r) => r.id === id);
  if (!recipe || weaveReason(hero, flags, recipe) || recipe.level >= weaveCap(hero, recipe.stages))
    return false;
  const cost = WEAVE_UPGRADE_COSTS[recipe.level - 1];
  if (cost === undefined || hero.skillPoints < cost) return false;
  hero.skillPoints -= cost;
  recipe.level++;
  return true;
}
export function sanitizeWeaving(value: unknown): Weaving {
  const result = emptyWeaving();
  if (!value || typeof value !== 'object') return result;
  const raw = value as Partial<Weaving>;
  for (const r of Array.isArray(raw.recipes) ? raw.recipes : []) {
    if (
      !r ||
      typeof r.id !== 'string' ||
      !r.id ||
      result.recipes.some((x) => x.id === r.id) ||
      !Array.isArray(r.stages) ||
      r.stages.length !== 2 ||
      !Number.isInteger(r.level) ||
      r.level < 1 ||
      r.level > 4 ||
      r.stages.some(
        (s) =>
          !s ||
          !WEAVE_SPELLS.includes(s.spell) ||
          !Number.isInteger(s.rank) ||
          s.rank < 1 ||
          s.rank > r.level,
      )
    )
      continue;
    result.recipes.push({
      id: r.id,
      name: typeof r.name === 'string' ? r.name : 'Custom spell',
      level: r.level,
      stages: r.stages.map((s) => ({ spell: s.spell, rank: s.rank })) as WeaveRecipe['stages'],
    });
  }
  if (typeof raw.equipped === 'string' && result.recipes.some((r) => r.id === raw.equipped))
    result.equipped = raw.equipped;
  return result;
}
