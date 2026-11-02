import type { Location } from '../world/map';

export interface Hometown {
  readonly classId: string;
  readonly map: string;
  readonly name: string;
  readonly start: Location;
  /** A settlement entrance and the safe tile on its regional side. */
  readonly region: string;
  readonly entrance: readonly [number, number];
  readonly returnTo: Location;
}

/** Four alternate openings of the same story, not four simultaneous copies of its cast. */
export const HOMETOWNS: readonly [Hometown, ...Hometown[]] = [
  {
    classId: 'ranger',
    map: 'mossvale',
    name: 'Mossvale',
    start: { map: 'mossvale', x: 18, y: 20 },
    region: 'overworld',
    entrance: [5, 5],
    returnTo: { map: 'overworld', x: 5, y: 6 },
  },
  {
    classId: 'knight',
    map: 'redrockVillage',
    name: 'Redrock Village',
    start: { map: 'redrockVillage', x: 18, y: 20 },
    region: 'quarry',
    entrance: [2, 21],
    returnTo: { map: 'quarry', x: 2, y: 20 },
  },
  {
    classId: 'mage',
    map: 'glasswaterVillage',
    name: 'Glasswater Village',
    start: { map: 'glasswaterVillage', x: 18, y: 20 },
    region: 'lake',
    entrance: [2, 19],
    returnTo: { map: 'lake', x: 2, y: 18 },
  },
  {
    classId: 'rogue',
    map: 'thornwoodVillage',
    name: 'Thornwood Village',
    start: { map: 'thornwoodVillage', x: 18, y: 20 },
    region: 'grove',
    entrance: [2, 19],
    returnTo: { map: 'grove', x: 2, y: 18 },
  },
];

export const DEFAULT_HOMETOWN = HOMETOWNS[0];
export const HOMETOWN_MAPS: ReadonlySet<string> = new Set(HOMETOWNS.map((home) => home.map));

export function hometownForClass(classId: string): Hometown {
  return HOMETOWNS.find((home) => home.classId === classId) ?? DEFAULT_HOMETOWN;
}

/** No marker means an existing Mossvale adventure, regardless of class. */
export function hometownOf(flags: ReadonlySet<string>): Hometown {
  const selected = HOMETOWNS.filter((home) => flags.has(`home:${home.map}`));
  return selected.length === 1 ? (selected[0] ?? DEFAULT_HOMETOWN) : DEFAULT_HOMETOWN;
}

/** Authored Mossvale wording remains intact; only the player's home place name varies. */
export function hometownText(text: string, flags: ReadonlySet<string>): string {
  const home = hometownOf(flags);
  return home.map === 'mossvale' ? text : text.replaceAll('Mossvale', home.name);
}

export function storyMap(mapId: string, flags: ReadonlySet<string>): string {
  return mapId === 'mossvale' ? hometownOf(flags).map : mapId;
}
