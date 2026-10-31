/** Stable school names across learning, practice, upgrades and automatic casting. */
const SCHOOL_NAMES: Readonly<Record<string, string>> = {
  fire: 'Fire',
  blizzard: 'Ice',
  quake: 'Gravity',
  gale: 'Wind',
  thunder: 'Lightning',
  natureConvert: 'Nature',
  shadow: 'Arcane',
};
export function standardName(id: string): string | null {
  return Object.hasOwn(SCHOOL_NAMES, id) ? (SCHOOL_NAMES[id] ?? null) : null;
}
