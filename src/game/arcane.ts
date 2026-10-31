import { standardName } from './spellNames';
import type { BoardElement } from '../core/boardMagic';
import type { Hero } from './hero';
export const ARCANE_ELEMENTS: readonly BoardElement[] = [
  'fire',
  'water',
  'wind',
  'lightning',
  'nature',
  'earth',
];
export const ARCANE_BASE: Readonly<Record<BoardElement, string>> = {
  fire: 'fire',
  water: 'blizzard',
  wind: 'gale',
  lightning: 'thunder',
  nature: 'natureConvert',
  earth: 'quake',
};
export function arcaneTechniqueName(element: BoardElement): string {
  return `Arcane + ${standardName(ARCANE_BASE[element]) ?? element}`;
}
export const ARCANE_PURPOSE: Readonly<Record<BoardElement, string>> = {
  fire: 'Lets red contacts answer this opponent’s marked color requirements for the affected batches.',
  water:
    'Delays the next obstruction batch only. Later batches and ordinary attacks keep their normal timing.',
  wind: 'Shifts the next affected obstruction blocks sideways if there is room.',
  lightning: 'Weakens this opponent’s existing obstructions, leaving at least one durability.',
  nature: 'Makes the next affected obstruction blocks arrive as harmless, colorless blanks.',
  earth:
    'Removes this opponent’s vertical anchoring for the affected placement batches, allowing their blocks to fall.',
};
export const ARCANE_UPGRADE_COSTS = [6, 12, 20] as const;
export function arcaneUnlocked(flags: ReadonlySet<string>): boolean {
  return flags.has('wyrmBeaten') && flags.has('scene:chapterEnd');
}
export function arcaneCap(hero: Hero, element: BoardElement): number {
  return Math.min(hero.spells.shadow?.level ?? 0, hero.spells[ARCANE_BASE[element]]?.level ?? 0, 4);
}
export function arcaneRank(hero: Hero, element: BoardElement): number {
  return Math.min(arcaneCap(hero, element), hero.arcane?.[element] ?? 0);
}
export function createArcane(
  hero: Hero,
  flags: ReadonlySet<string>,
  element: BoardElement,
): boolean {
  if (!arcaneUnlocked(flags) || arcaneCap(hero, element) < 2 || arcaneRank(hero, element) > 0)
    return false;
  (hero.arcane ??= {})[element] = 1;
  return true;
}
export function upgradeArcane(
  hero: Hero,
  flags: ReadonlySet<string>,
  element: BoardElement,
): boolean {
  const rank = arcaneRank(hero, element),
    cost = ARCANE_UPGRADE_COSTS[rank - 1];
  if (
    !arcaneUnlocked(flags) ||
    rank < 1 ||
    rank >= arcaneCap(hero, element) ||
    cost === undefined ||
    hero.skillPoints < cost
  )
    return false;
  hero.skillPoints -= cost;
  (hero.arcane ??= {})[element] = rank + 1;
  return true;
}
export function sanitizeArcane(value: unknown): Partial<Record<BoardElement, number>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    ARCANE_ELEMENTS.flatMap((e) => {
      const n = (value as Record<string, unknown>)[e];
      return typeof n === 'number' && Number.isFinite(n) && n >= 1
        ? [[e, Math.min(4, Math.floor(n))]]
        : [];
    }),
  );
}
