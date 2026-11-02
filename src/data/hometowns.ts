import { SURFACE_SITES } from './surfaceLayout';
import type { Location } from '../world/map';

export interface Hometown {
  readonly classId: string;
  readonly map: string;
  readonly name: string;
  readonly start: Location;
  /** A settlement entrance and the safe tile on its regional side. */
  readonly region: string;
  readonly province: string;
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
    province: 'outdoor',
    entrance: [SURFACE_SITES.mossvale.x, SURFACE_SITES.mossvale.y],
    returnTo: { map: 'overworld', x: SURFACE_SITES.mossvale.x, y: SURFACE_SITES.mossvale.y + 1 },
  },
  {
    classId: 'knight',
    map: 'redrockVillage',
    name: 'Cairnwick',
    start: { map: 'redrockVillage', x: 18, y: 20 },
    region: 'overworld',
    province: 'quarry',
    entrance: [SURFACE_SITES.redrockVillage.x, SURFACE_SITES.redrockVillage.y],
    returnTo: {
      map: 'overworld',
      x: SURFACE_SITES.redrockVillage.x,
      y: SURFACE_SITES.redrockVillage.y + 1,
    },
  },
  {
    classId: 'mage',
    map: 'glasswaterVillage',
    name: 'Merehaven',
    start: { map: 'glasswaterVillage', x: 18, y: 20 },
    region: 'overworld',
    province: 'lake',
    entrance: [SURFACE_SITES.glasswaterVillage.x, SURFACE_SITES.glasswaterVillage.y],
    returnTo: {
      map: 'overworld',
      x: SURFACE_SITES.glasswaterVillage.x,
      y: SURFACE_SITES.glasswaterVillage.y + 1,
    },
  },
  {
    classId: 'rogue',
    map: 'thornwoodVillage',
    name: 'Bramblecross',
    start: { map: 'thornwoodVillage', x: 18, y: 20 },
    region: 'overworld',
    province: 'grove',
    entrance: [SURFACE_SITES.thornwoodVillage.x, SURFACE_SITES.thornwoodVillage.y],
    returnTo: {
      map: 'overworld',
      x: SURFACE_SITES.thornwoodVillage.x,
      y: SURFACE_SITES.thornwoodVillage.y + 1,
    },
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
