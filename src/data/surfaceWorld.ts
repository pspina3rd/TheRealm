import { required } from '../core/required';
import { habitatPosition, roadsideEncounters } from './surfaceEncounters';
import { MENTORS } from './mentors';
import { VESPER_ROUTE } from './story';
import type { MapDef, MapEntity, Warp } from '../world/map';
import {
  SURFACE_SIZE,
  STONE_APPROACH,
  STONE_ENCLOSURE_RADIUS,
  SURFACE_SITES,
  SURFACE_ROADS,
  SURFACE_CENTER,
  SURFACE_STONES,
  SURFACE_PROVINCES,
  surfaceProvince,
  legacySurfacePoint,
  expandedLocation,
} from './surfaceLayout';

const SIZE = SURFACE_SIZE;
const coast = [
  [42, 20],
  [90, 10],
  [145, 15],
  [184, 28],
  [218, 45],
  [233, 85],
  [238, 137],
  [227, 176],
  [214, 212],
  [178, 238],
  [135, 245],
  [90, 234],
  [51, 215],
  [27, 182],
  [19, 134],
  [25, 82],
] as const;

function onLand(x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = coast.length - 1; i < coast.length; j = i++) {
    const a = required(coast[i]),
      b = required(coast[j]);
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0])
      inside = !inside;
  }
  return inside;
}

function grain(x: number, y: number): number {
  const n = Math.imul(x + 1709, 374761393) ^ Math.imul(y + 3181, 668265263);
  return ((Math.imul(n ^ (n >>> 13), 1274126177) >>> 0) % 10000) / 10000;
}

/** A fixed continent with authored roads, rivers, clearings and encounters. */
export function withExpandedSurface(base: Record<string, MapDef>): Record<string, MapDef> {
  const maps: Record<string, MapDef> = {};
  for (const [id, map] of Object.entries(base)) {
    const landing = ['sunkenArchive', 'upwardRoad', 'innerWard'].includes(id)
      ? SURFACE_SITES[id as keyof typeof SURFACE_SITES]
      : undefined;
    maps[id] = {
      ...map,
      warps: map.warps.map((warp) => ({
        ...warp,
        to:
          landing && warp.to.map === 'overworld'
            ? { map: 'overworld', x: landing.x, y: landing.y - 1 }
            : expandedLocation(warp.to),
      })),
    };
  }
  const old = required(base.overworld);
  const grid: string[][] = Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) => {
      if (!onLand(x, y)) return '~';
      const area = surfaceProvince(x, y),
        noise = grain(x, y);
      const patch = Math.sin(x / 6.5) + Math.cos(y / 7.7) + Math.sin((x + y) / 12.5) * 0.65;
      if (area?.id === 'peaks')
        return Math.abs(y - (40 + 8 * Math.sin(x / 14))) < 4 || (patch > 1.1 && noise < 0.8)
          ? '^'
          : noise < 0.025
            ? 'T'
            : '.';
      if (area?.id === 'quarry')
        return (Math.abs(x - (113 + 11 * Math.sin(y / 10))) < 2 ||
          Math.abs(x - (142 + 7 * Math.sin(y / 12))) < 2) &&
          noise < 0.9
          ? '^'
          : noise < 0.02
            ? 'T'
            : '.';
      if (area?.id === 'forge')
        return patch > 1.15 && noise < 0.75 ? '^' : noise < 0.025 ? 'T' : '.';
      if (area?.id === 'grove') return patch > -0.1 && noise < 0.7 ? 'T' : noise < 0.04 ? ',' : '.';
      if (area?.id === 'ruins')
        return patch > 0.4 && noise < 0.45 ? 'T' : noise < 0.045 ? '^' : '.';
      if (area?.id === 'cliffs')
        return Math.abs(y - (30 + 7 * Math.sin(x / 10))) < 2 && noise < 0.85
          ? '^'
          : patch > 0.8 && noise < 0.3
            ? 'T'
            : '.';
      return patch > 0.8 && noise < 0.32 ? 'T' : noise < 0.03 ? ',' : '.';
    }),
  );
  const put = (x: number, y: number, tile: string): void => {
    if (x >= 1 && y >= 1 && x < SIZE - 1 && y < SIZE - 1) required(grid[y])[x] = tile;
  };
  const disk = (x: number, y: number, radius: number, tile: string): void => {
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++)
        if (dx * dx + dy * dy <= radius * radius) put(x + dx, y + dy, tile);
  };
  const line = (
    a: readonly [number, number],
    b: readonly [number, number],
    visit: (x: number, y: number) => void,
  ): void => {
    const length = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    for (let i = 0; i <= length; i++)
      visit(
        Math.round(a[0] + ((b[0] - a[0]) * i) / Math.max(1, length)),
        Math.round(a[1] + ((b[1] - a[1]) * i) / Math.max(1, length)),
      );
  };
  const river = [
    [143, 46],
    [148, 76],
    [143, 101],
    [157, 116],
    [164, 145],
    [181, 163],
    [220, 178],
  ] as const;
  for (let i = 1; i < river.length; i++)
    line(required(river[i - 1]), required(river[i]), (x, y) => disk(x, y, 2, '~'));
  for (let y = 89; y < 158; y++)
    for (let x = 184; x < 233; x++) {
      if (((x - 208) / 20) ** 2 + ((y - 125) / 29) ** 2 < 1) put(x, y, '~');
    }
  disk(209, 202, 11, '!');
  disk(211, 201, 5, '^');
  disk(SURFACE_CENTER.x, SURFACE_CENTER.y, 17, 'o');
  const roadPoints: (readonly [number, number])[] = [];
  for (const road of SURFACE_ROADS)
    for (let i = 1; i < road.length; i++)
      line(required(road[i - 1]), required(road[i]), (x, y) => {
        roadPoints.push([x, y]);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const existing = grid[y + dy]?.[x + dx];
            put(
              x + dx,
              y + dy,
              existing === '!' || existing === 'L'
                ? 'L'
                : existing === '~' || existing === 'B'
                  ? 'B'
                  : '=',
            );
          }
      });
  const warps: Warp[] = old.warps.map((warp) => ({
    ...warp,
    ...legacySurfacePoint(warp.x, warp.y),
    to: expandedLocation(warp.to),
  }));
  warps.push(
    {
      ...SURFACE_SITES.forge,
      to: { map: 'forge', x: 1, y: 15 },
      requiresFlag: 'ridgeCleared',
      lockedText: 'The ridge road is closed. Help Flint clear the quarry rockslide.',
    },
    {
      ...SURFACE_SITES.cliffs,
      to: { map: 'cliffs', x: 30, y: 10 },
      requiresFlag: 'peakGate',
      requiresAnyFlag: [
        'reached:peaks',
        'reached:cliffs',
        'reached:ruins',
        'opening:legacyJourney',
      ],
      missingAnyText: 'Follow the ridge from the Stormcrown pass before taking this approach.',
      lockedText: 'Storms close the high road. The Forgefyre smiths can open the mountain gate.',
    },
    {
      ...SURFACE_SITES.ruins,
      to: { map: 'ruins', x: 30, y: 10 },
      requiresFlag: 'peakGate',
      requiresAnyFlag: ['reached:cliffs', 'reached:ruins', 'opening:legacyJourney'],
      missingAnyText: 'Reach Windward before taking the old road into Moonfall.',
      lockedText:
        'The old road is lost beyond the ridge. Reach Windward before taking this approach.',
    },
  );
  // Interregional exits now lead onto the road outside the site, not into a distant province.
  for (const id of ['grove', 'lake', 'quarry', 'forge', 'peaks', 'cliffs', 'ruins'] as const) {
    const map = required(maps[id]);
    const point = SURFACE_SITES[id];
    maps[id] = {
      ...map,
      warps: map.warps.map((warp) => {
        if (warp.to.map.startsWith('caves')) return warp;
        // These entrances sit in a building facade: arrive on the street below its door.
        const doorstep = id === 'forge' || id === 'cliffs';
        return {
          ...warp,
          to: {
            map: 'overworld',
            x: doorstep
              ? point.x
              : point.x + (warp.x === 0 ? -2 : warp.x >= required(map.tiles[0]).length - 1 ? 2 : 0),
            y: doorstep
              ? point.y + 1
              : point.y + (warp.y === 0 ? -2 : warp.y >= map.tiles.length - 1 ? 2 : 0),
          },
        };
      }),
    };
  }
  const entities: MapEntity[] = old.entities.map((entity) => ({
    ...entity,
    ...legacySurfacePoint(entity.x, entity.y),
  }));
  const travellingStops = [
    ...Object.values(MENTORS).flatMap((mentor) =>
      mentor.route.filter((stop) => stop.map === 'overworld'),
    ),
    ...VESPER_ROUTE.filter((stop) => stop.map === 'overworld'),
  ];
  const reserved = (x: number, y: number): boolean =>
    travellingStops.some((stop) => stop.x === x && stop.y === y);
  const families: Readonly<Record<string, readonly string[]>> = {
    grove: ['sproutling', 'leafSprite', 'thornTroll'],
    lake: ['drip', 'lakeLurker', 'tideOgre'],
    quarry: ['goblinDigger', 'quarryHound', 'stoneOgre'],
    forge: ['cinder', 'forgeImp', 'magmaDrake'],
    peaks: ['sparkPup', 'stormGoblin', 'thunderhide'],
    cliffs: ['puffball', 'galeBat', 'skyRam'],
    ruins: ['watcher', 'nightBat', 'gloomToad'],
  };
  const habitatSites: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
    grove: [
      [53, 153],
      [62, 177],
      [44, 194],
    ],
    lake: [
      [178, 117],
      [223, 164],
      [185, 147],
    ],
    quarry: [
      [117, 199],
      [105, 221],
      [140, 225],
    ],
    forge: [
      [185, 204],
      [202, 181],
      [219, 215],
    ],
    peaks: [
      [173, 69],
      [195, 50],
      [168, 37],
    ],
    cliffs: [
      [112, 60],
      [95, 40],
      [124, 29],
    ],
    ruins: [
      [69, 61],
      [45, 35],
      [60, 41],
    ],
  };
  for (const area of SURFACE_PROVINCES) {
    const foes = required(families[area.id]);
    const places = required(habitatSites[area.id]);
    for (let i = 0; i < places.length; i++) {
      const place = habitatPosition(required(places[i]), area.id, grid, roadPoints, [
        ...entities,
        ...warps,
        ...travellingStops,
      ]);
      if (!place) continue;
      const { x, y } = place;
      disk(x, y, 1, '.');
      entities.push({
        id: `surface:${area.id}:foe:${i}`,
        kind: 'monster',
        enemyId: required(foes[i % foes.length]),
        x,
        y,
      });
    }
    const point = required(SURFACE_SITES[area.id as keyof typeof SURFACE_SITES]);
    const shift = reserved(point.x - 4, point.y + 4) ? 5 : 4;
    const x = point.x - shift,
      y = point.y + shift;
    disk(x, y, 2, '.');
    line([x, y], [point.x, point.y], (px, py) => put(px, py, '='));
    entities.push({
      id: `surface:waystone:${area.id}`,
      kind: 'inspect',
      x,
      y,
      title: `${area.name} trail marker`,
      text: `${area.name}. The regional entrance is just northeast of this marker.`,
      flag: `world:waystone:${area.id}`,
    });
  }
  const signs = [
    {
      x: 96,
      y: 130,
      title: 'West road',
      text: 'Mossvale northwest. Thornwood southwest. Reach the stones through Mossvale.',
    },
    {
      x: 150,
      y: 131,
      title: 'Lake road',
      text: 'Brightwater here. Glasswater east. Forgefyre southeast.',
    },
    {
      x: 125,
      y: 163,
      title: 'South road',
      text: 'Redrock and Cairnwick south. Thornwood west. For the stones, follow Mossvale northwest.',
    },
    {
      x: 127,
      y: 97,
      title: 'High road',
      text: 'Windward north. Stormcrown northeast. Moonfall northwest.',
    },
    {
      x: 57,
      y: 150,
      title: 'Forest fork',
      text: 'Bramblecross southwest. Thornwood south. Mossvale north.',
    },
  ];
  for (const sign of signs) {
    disk(sign.x, sign.y, 2, '.');
    entities.push({
      ...sign,
      id: `surface:sign:${sign.x}:${sign.y}`,
      kind: 'inspect',
      flag: `world:sign:${sign.x}:${sign.y}`,
    });
  }
  entities.push(
    ...roadsideEncounters(grid, roadPoints, [...entities, ...warps, ...travellingStops]),
  );
  for (const entity of [...entities, ...travellingStops]) {
    let nearest = required(roadPoints[0]);
    for (const point of roadPoints)
      if (
        (point[0] - entity.x) ** 2 + (point[1] - entity.y) ** 2 <
        (nearest[0] - entity.x) ** 2 + (nearest[1] - entity.y) ** 2
      )
        nearest = point;
    line([entity.x, entity.y], nearest, (x, y) => {
      for (let dy = 0; dy <= 1; dy++)
        for (let dx = 0; dx <= 1; dx++) {
          const tile = grid[y + dy]?.[x + dx];
          if (tile === 'T' || tile === '^' || tile === ',') put(x + dx, y + dy, '.');
        }
    });
    disk(entity.x, entity.y, 1, '.');
  }

  for (const stop of travellingStops) disk(stop.x, stop.y, 1, '.');
  for (const point of Object.values(SURFACE_SITES)) disk(point.x, point.y, 3, '=');
  for (const stone of SURFACE_STONES) disk(stone.x, stone.y, 1, 'o');
  for (const warp of warps) {
    put(
      warp.x,
      warp.y,
      warp.to.map === 'mossvale'
        ? 'M'
        : warp.to.map === 'brightwater'
          ? 'W'
          : warp.to.map === 'peaks'
            ? 'C'
            : warp.to.map === 'ruins' ||
                warp.to.map === 'sunkenArchive' ||
                warp.to.map === 'innerWard'
              ? 'R'
              : '=',
    );
  }
  // Apply the boundary last so trails, signs and site clearings cannot cut shortcuts.
  // The village's north path is the only surface gateway into this sanctuary.
  for (let y = 98; y <= 158; y++)
    for (let x = 98; x <= 158; x++) {
      const distance = Math.hypot(x - SURFACE_CENTER.x, y - SURFACE_CENTER.y);
      if (distance >= STONE_ENCLOSURE_RADIUS - 2 && distance <= STONE_ENCLOSURE_RADIUS)
        put(x, y, '^');
    }
  put(STONE_APPROACH.x, STONE_APPROACH.y, 'M');
  warps.push({ ...STONE_APPROACH, to: { map: 'mossvale', x: 20, y: 1 } });
  maps.overworld = {
    ...old,
    name: 'Sevenstones',
    tiles: grid.map((row) => row.join('')),
    warps,
    entities,
    decor: [
      { object: 'mush.house', x: 45, y: 189 },
      { object: 'dock', x: 187, y: 115 },
      { object: 'mine.beige', x: 125, y: 215 },
      { object: 'forge.hall', x: 199, y: 194 },
      { object: 'hut', x: 107, y: 38 },
      ...signs.map((sign) => ({ object: 'sign', x: sign.x, y: sign.y })),
      ...entities
        .filter((entity) => entity.id.startsWith('surface:waystone:'))
        .map((entity) => ({ object: 'sign', x: entity.x, y: entity.y })),
    ],
  };
  return maps;
}
