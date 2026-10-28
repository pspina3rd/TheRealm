import type { EntityDef, MapDef, MapEntity, ThemeId, Warp } from '../world/map';
import { CAMPAIGN_FLAGS as C } from './campaignFlags';

type Patch = readonly [string, number, number, number, number];
type Path = readonly [number, number, number, number];

/** Distinct rooms are authored below; clear routes connect landings and inhabited places. */
function ground(floor: string, patches: readonly Patch[], paths: readonly Path[]): string[] {
  const grid = Array.from({ length: 22 }, (_, y) =>
    Array.from({ length: 32 }, (_, x) =>
      x === 0 || y === 0 || x === 31 || y === 21 ? '#' : floor,
    ),
  );
  for (const [tile, x, y, width, height] of patches) {
    for (let row = y; row < y + height; row++)
      for (let col = x; col < x + width; col++) {
        const cells = grid[row];
        if (cells) cells[col] = tile;
      }
  }
  for (const [x1, y1, x2, y2] of paths) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
        const cells = grid[y];
        if (cells) cells[x] = floor;
      }
  }
  return grid.map((row) => row.join(''));
}

function npc(id: string, npcId: string, x: number, y: number, requiresFlag?: string): MapEntity {
  return { id, kind: 'npc', npcId, x, y, ...(requiresFlag ? { requiresFlag } : {}) };
}

function monster(id: string, enemyId: string, x: number, y: number): MapEntity {
  return { id, kind: 'monster', enemyId, x, y };
}

function boss(id: string, enemyId: string, x: number, y: number, requiresFlag: string): MapEntity {
  return { id, kind: 'monster', enemyId, x, y, boss: true, requiresFlag };
}

const loop: readonly Path[] = [
  [2, 2, 29, 2],
  [2, 19, 29, 19],
  [2, 2, 2, 19],
  [29, 2, 29, 19],
];

function region(
  id: string,
  name: string,
  theme: ThemeId,
  floor: string,
  patches: readonly Patch[],
  paths: readonly Path[],
  entities: readonly MapEntity[],
  warps: readonly Warp[],
  pieceBias: MapDef['pieceBias'],
): MapDef {
  const approaches: Path[] = entities.map((entity: EntityDef) => [
    entity.x,
    10,
    entity.x,
    entity.y,
  ]);
  const tiles = ground(floor, patches, [...loop, [2, 10, 29, 10], ...paths, ...approaches]);
  return { id, name, theme, music: 'music.cave', tiles, entities, warps, pieceBias };
}

function back(map: string): Warp {
  return { x: 2, y: 19, to: { map, x: 29, y: 3 } };
}

function onward(map: string, flag: string, lockedText: string): Warp {
  return { x: 29, y: 2, to: { map, x: 3, y: 19 }, requiresFlag: flag, lockedText };
}

/** Playable underground route: ordinary encounters, resident work, rest, and separate bosses. */
export const CAMPAIGN_MAPS: Readonly<Record<string, MapDef>> = {
  sunkenArchive: region(
    'sunkenArchive',
    'Sunken Archive',
    'cave',
    ':',
    [
      ['w', 9, 4, 4, 13],
      ['X', 17, 4, 10, 2],
      ['X', 17, 14, 9, 2],
      ['k', 5, 4, 2, 4],
      ['w', 21, 7, 5, 5],
    ],
    [
      [9, 8, 13, 8],
      [9, 15, 13, 15],
      [15, 3, 15, 19],
      [16, 6, 27, 6],
    ],
    [
      npc('archive-odile', 'archiveDrain', 6, 14),
      npc('archive-quill', 'archiveMerchant', 5, 17),
      monster('archive-eel-1', 'archiveEel', 15, 16),
      monster('archive-eel-2', 'archiveEel', 16, 7),
      monster('archive-echo-1', 'glassEcho', 26, 13),
      monster('archive-eel-3', 'archiveEel', 23, 17),
    ],
    [
      { x: 2, y: 19, to: { map: 'overworld', x: 15, y: 19 } },
      onward(
        'cisternMarches',
        C.drain,
        'The lift landing is flooded. Odile needs help clearing its drain.',
      ),
    ],
    { water: 1 },
  ),

  cisternMarches: region(
    'cisternMarches',
    'Cistern Marches',
    'forge',
    ':',
    [
      ['w', 10, 4, 5, 4],
      ['w', 18, 13, 8, 4],
      ['X', 7, 3, 1, 14],
      ['k', 21, 5, 3, 3],
      ['X', 13, 14, 2, 4],
    ],
    [
      [7, 7, 7, 9],
      [7, 15, 8, 15],
      [15, 4, 15, 17],
      [18, 16, 26, 16],
    ],
    [
      npc('cistern-trial', 'cisternTrial', 6, 15),
      monster('cistern-mote-1', 'cinderMote', 13, 12),
      monster('cistern-mote-2', 'cinderMote', 19, 7),
      monster('cistern-eel-1', 'archiveEel', 25, 17),
      monster('cistern-mote-3', 'cinderMote', 16, 4),
      boss('campaign-irdrath', 'irdrath', 24, 5, C.trial),
    ],
    [
      back('sunkenArchive'),
      onward(
        'rootways',
        C.irdrath,
        'Irdrath’s ash blocks the maintenance route. The trial channel must be tested first.',
      ),
    ],
    { fire: 1, water: 1 },
  ),

  rootways: region(
    'rootways',
    'The Rootways',
    'grove',
    '.',
    [
      ['T', 6, 4, 6, 4],
      ['T', 18, 3, 4, 6],
      ['T', 9, 13, 4, 5],
      ['w', 20, 13, 7, 3],
      ['f', 15, 4, 1, 13],
    ],
    [
      [4, 8, 15, 8],
      [15, 7, 15, 11],
      [15, 15, 15, 17],
      [17, 17, 28, 17],
    ],
    [
      npc('rootways-rafe', 'rootTram', 16, 15),
      monster('rootways-root-1', 'rootSentinel', 6, 12),
      monster('rootways-root-2', 'rootSentinel', 24, 6),
      monster('rootways-root-3', 'rootSentinel', 20, 17),
      monster('rootways-mote', 'cinderMote', 12, 4),
    ],
    [
      back('cisternMarches'),
      onward(
        'glassWarrens',
        C.tram,
        'The tram rail is lifted by roots. Rafe needs a straight brace.',
      ),
    ],
    { nature: 1, earth: 1 },
  ),

  glassWarrens: region(
    'glassWarrens',
    'Glass Warrens',
    'cave',
    ':',
    [
      ['k', 6, 4, 2, 13],
      ['k', 12, 4, 2, 13],
      ['k', 18, 4, 2, 13],
      ['k', 24, 4, 2, 13],
      ['w', 9, 13, 2, 4],
    ],
    [
      [5, 6, 27, 6],
      [5, 16, 27, 16],
      [16, 3, 16, 19],
    ],
    [
      npc('glass-ketter', 'ketterRescue', 10, 15),
      monster('glass-echo-1', 'glassEcho', 5, 7),
      monster('glass-echo-2', 'glassEcho', 16, 14),
      monster('glass-echo-3', 'glassEcho', 23, 17),
      monster('glass-bellwisp', 'bellWisp', 21, 4),
      boss('campaign-vesper', 'vesperDuel', 27, 5, C.rescue),
    ],
    [
      back('rootways'),
      onward(
        'bellHollows',
        C.vesper,
        'Vesper controls the upper relay. Keep Ketter’s lamp feed intact and confront them.',
      ),
    ],
    { arcane: 1 },
  ),

  bellHollows: region(
    'bellHollows',
    'Bell Hollows',
    'cave',
    ':',
    [
      ['w', 7, 4, 6, 12],
      ['w', 20, 6, 6, 11],
      ['X', 15, 3, 2, 4],
      ['X', 15, 13, 2, 5],
      ['k', 4, 4, 2, 3],
    ],
    [
      [7, 7, 13, 7],
      [7, 15, 13, 15],
      [20, 8, 26, 8],
      [20, 16, 26, 16],
    ],
    [
      npc('bells-ketter', 'bellCircuit', 16, 10),
      npc('bells-ash', 'bellMerchant', 5, 17),
      monster('bells-wisp-1', 'bellWisp', 13, 6),
      monster('bells-wisp-2', 'bellWisp', 19, 15),
      monster('bells-wisp-3', 'bellWisp', 26, 5),
      monster('bells-echo', 'glassEcho', 15, 18),
    ],
    [
      back('glassWarrens'),
      onward(
        'quietFoundry',
        C.bells,
        'The local return bell is jammed. Ketter needs a relief circuit before leaving.',
      ),
    ],
    { wind: 1 },
  ),

  quietFoundry: region(
    'quietFoundry',
    'Quiet Foundry',
    'forge',
    'o',
    [
      ['X', 6, 4, 5, 4],
      ['X', 20, 4, 5, 4],
      ['X', 6, 13, 5, 4],
      ['X', 20, 13, 5, 4],
      ['k', 14, 4, 4, 4],
      ['w', 14, 14, 4, 4],
    ],
    [
      [4, 8, 27, 8],
      [4, 13, 27, 13],
      [16, 8, 16, 13],
    ],
    [
      npc('foundry-procedure', 'foundryProcedure', 13, 11),
      monster('foundry-relay-1', 'relayKeeper', 5, 6),
      monster('foundry-relay-2', 'relayKeeper', 26, 7),
      monster('foundry-relay-3', 'relayKeeper', 19, 16),
      monster('foundry-bellwisp', 'bellWisp', 12, 17),
      boss('campaign-lishal', 'lishal', 27, 4, C.accepted),
    ],
    [
      back('bellHollows'),
      onward(
        'upwardRoad',
        C.lishal,
        'The Lishal keep the manual relay turning. Stop it before taking the ascent.',
      ),
    ],
    { lightning: 1, fire: 1 },
  ),

  upwardRoad: region(
    'upwardRoad',
    'The Upward Road',
    'quarry',
    ':',
    [
      ['X', 5, 4, 19, 2],
      ['X', 8, 8, 19, 2],
      ['X', 5, 13, 19, 2],
      ['X', 8, 17, 19, 1],
      ['k', 25, 13, 2, 3],
    ],
    [
      [5, 6, 5, 12],
      [26, 5, 26, 13],
      [7, 12, 7, 19],
      [24, 10, 24, 19],
    ],
    [
      npc('ascent-ketter', 'ascentRepair', 16, 16),
      monster('ascent-golem-1', 'ascentGolem', 5, 7),
      monster('ascent-golem-2', 'ascentGolem', 26, 12),
      monster('ascent-golem-3', 'ascentGolem', 7, 16),
      monster('ascent-relay', 'relayKeeper', 23, 6),
    ],
    [
      back('quietFoundry'),
      {
        x: 29,
        y: 2,
        to: { map: 'overworld', x: 18, y: 19 },
        requiresFlag: C.ascent,
        lockedText: 'The fallen beam blocks the upper landing. Ketter needs someone on the wheel.',
      },
    ],
    { earth: 1 },
  ),

  innerWard: region(
    'innerWard',
    'Sevenstones — Inner Ward',
    'cave',
    ':',
    [
      ['k', 7, 4, 2, 4],
      ['k', 23, 4, 2, 4],
      ['k', 7, 14, 2, 4],
      ['k', 23, 14, 2, 4],
      ['w', 13, 5, 6, 3],
      ['w', 13, 14, 6, 3],
    ],
    [
      [16, 8, 16, 13],
      [5, 11, 27, 11],
    ],
    [
      monster('ward-echo-1', 'glassEcho', 10, 12),
      monster('ward-relay-1', 'relayKeeper', 21, 12),
      boss('campaign-malificat', 'malificat', 16, 10, C.wardReady),
    ],
    [{ x: 2, y: 19, to: { map: 'overworld', x: 18, y: 19 } }],
    { arcane: 1 },
  ),
};
