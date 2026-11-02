import type { ThemeId, Location } from '../world/map';

export const SURFACE_SIZE = 256;
export interface SurfacePoint {
  readonly x: number;
  readonly y: number;
}
export const SURFACE_SITES = {
  mossvale: { x: 76, y: 76 },
  brightwater: { x: 166, y: 128 },
  grove: { x: 48, y: 190 },
  lake: { x: 188, y: 115 },
  quarry: { x: 126, y: 215 },
  forge: { x: 202, y: 194 },
  peaks: { x: 184, y: 43 },
  cliffs: { x: 110, y: 38 },
  ruins: { x: 52, y: 46 },
  redrockVillage: { x: 82, y: 210 },
  glasswaterVillage: { x: 217, y: 160 },
  thornwoodVillage: { x: 35, y: 174 },
  sunkenArchive: { x: 114, y: 136 },
  upwardRoad: { x: 142, y: 138 },
  innerWard: { x: 128, y: 132 },
} as const;

export const SURFACE_CENTER = { x: 128, y: 128 } as const;
export const SURFACE_PROVINCES: readonly {
  readonly id: string;
  readonly name: string;
  readonly theme: ThemeId;
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
}[] = [
  { id: 'grove', name: 'Thornwood', theme: 'grove', x: 48, y: 178, rx: 39, ry: 45 },
  { id: 'lake', name: 'Glasswater', theme: 'lake', x: 205, y: 131, rx: 40, ry: 46 },
  { id: 'quarry', name: 'Redrock', theme: 'quarry', x: 120, y: 215, rx: 52, ry: 29 },
  { id: 'forge', name: 'Forgefyre', theme: 'forge', x: 202, y: 198, rx: 33, ry: 36 },
  { id: 'peaks', name: 'Stormcrown', theme: 'peaks', x: 178, y: 45, rx: 43, ry: 34 },
  { id: 'cliffs', name: 'Windward', theme: 'cliffs', x: 111, y: 38, rx: 29, ry: 29 },
  { id: 'ruins', name: 'Moonfall', theme: 'ruins', x: 52, y: 45, rx: 35, ry: 30 },
];

const provinceCache = new Int8Array(SURFACE_SIZE * SURFACE_SIZE).fill(-2);
export function surfaceProvince(x: number, y: number) {
  const bounded =
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < SURFACE_SIZE &&
    y < SURFACE_SIZE;
  const key = y * SURFACE_SIZE + x;
  let index = bounded ? (provinceCache[key] ?? -2) : -2;
  if (index === -2) {
    index = SURFACE_PROVINCES.findIndex(
      (area) =>
        ((x - area.x) / area.rx) ** 2 + ((y - area.y) / area.ry) ** 2 <
        1 + 0.12 * Math.sin(x / 7) + 0.1 * Math.cos(y / 9) + 0.06 * Math.sin((x + y) / 13),
    );
    if (bounded) provinceCache[key] = index;
  }
  return index >= 0 ? SURFACE_PROVINCES[index] : undefined;
}

export const SURFACE_STONES = [
  { element: 'nature', region: 'grove', x: 119, y: 132 },
  { element: 'water', region: 'lake', x: 138, y: 127 },
  { element: 'earth', region: 'quarry', x: 128, y: 139 },
  { element: 'fire', region: 'forge', x: 136, y: 135 },
  { element: 'lightning', region: 'peaks', x: 136, y: 119 },
  { element: 'wind', region: 'cliffs', x: 126, y: 116 },
  { element: 'arcane', region: 'ruins', x: 119, y: 120 },
] as const;

/** The stone sanctuary has one surface entrance, through Mossvale village. */
export const STONE_APPROACH = { x: 112, y: 112 } as const;
export const STONE_ENCLOSURE_RADIUS = 27;

/** Provincial roads loop around the sanctuary; none enter the stone circle. */
export const SURFACE_ROADS: readonly (readonly (readonly [number, number])[])[] = [
  [
    [76, 76],
    [57, 115],
    [35, 148],
    [35, 174],
    [48, 190],
  ],
  [
    [35, 174],
    [54, 206],
    [82, 210],
    [103, 224],
    [126, 215],
  ],
  [
    [48, 190],
    [71, 150],
    [93, 153],
    [110, 170],
    [139, 184],
    [126, 215],
  ],
  [
    [126, 215],
    [157, 219],
    [182, 211],
    [202, 194],
  ],
  [
    [202, 194],
    [174, 171],
    [164, 160],
    [176, 123],
    [188, 115],
  ],
  [
    [217, 160],
    [221, 178],
    [193, 173],
    [181, 150],
    [176, 123],
  ],
  [
    [166, 128],
    [165, 123],
    [176, 123],
  ],
  [
    [76, 76],
    [102, 81],
    [124, 88],
    [153, 92],
    [162, 83],
    [179, 66],
    [184, 43],
  ],
  [
    [153, 92],
    [166, 107],
    [176, 123],
  ],
  [
    [184, 43],
    [151, 39],
    [126, 45],
    [110, 38],
    [88, 38],
    [73, 46],
    [52, 46],
  ],
  [
    [76, 76],
    [73, 46],
  ],
  [
    [124, 88],
    [113, 70],
    [110, 38],
  ],
  [
    [112, 112],
    [119, 128],
    [128, 128],
  ],
  [
    [114, 136],
    [119, 128],
  ],
  [
    [142, 138],
    [128, 128],
  ],
];

const LEGACY_ANCHORS = [
  [5, 5, 76, 76],
  [22, 11, 166, 128],
  [0, 16, 48, 190],
  [39, 12, 188, 115],
  [30, 23, 126, 215],
  [34, 3, 184, 43],
  [15, 20, 114, 136],
  [19, 18, 142, 138],
  [18, 20, 128, 132],
  [17, 20, 126, 132],
  [29, 17, 169, 143],
  [9, 3, 80, 70],
  [8, 9, 80, 95],
  [17, 12, 125, 143],
  [16, 7, 113, 100],
  [6, 17, 75, 170],
  [28, 16, 165, 170],
  [30, 8, 165, 90],
  [34, 7, 188, 67],
  [36, 6, 185, 52],
  [3, 10, 84, 118],
  [32, 4, 180, 47],
  [17, 18, 122, 162],
  [30, 12, 175, 130],
] as const;

/** Preserve the landmark a legacy point belonged to, rather than stretching its coordinates. */
export function legacySurfacePoint(x: number, y: number): SurfacePoint {
  let closest: (typeof LEGACY_ANCHORS)[number] = LEGACY_ANCHORS[0];
  for (const anchor of LEGACY_ANCHORS)
    if ((anchor[0] - x) ** 2 + (anchor[1] - y) ** 2 < (closest[0] - x) ** 2 + (closest[1] - y) ** 2)
      closest = anchor;
  return { x: closest[2] + x - closest[0], y: closest[3] + y - closest[1] };
}

export function expandedLocation(at: Location): Location {
  return at.map === 'overworld' ? { map: at.map, ...legacySurfacePoint(at.x, at.y) } : at;
}
