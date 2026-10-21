import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLASSES } from '../src/data/classes';
import { ENEMIES } from '../src/data/enemies';
import { MAPS } from '../src/data/maps';
import { NPCS } from '../src/data/npcs';
import { FULL_TILE } from '../src/ui/art/autotile';
import {
  CREATURES,
  battleFrame,
  isCreatureId,
  isStripSprite,
  mapFrame,
} from '../src/ui/art/creatures';
import { IMAGES, type Region } from '../src/ui/art/images';
import { OBJECTS } from '../src/ui/art/objects';
import {
  TILE,
  backgroundFor,
  cellHash,
  placeObject,
  planGround,
  planObjects,
} from '../src/ui/art/themes';
import { EFFECTS, SPELL_EFFECTS, effectDuration, effectFrame } from '../src/ui/art/vfx';
import { SPELLS } from '../src/data/spells';
import { mapHeight, mapWidth, type MapDef } from '../src/world/map';

/** Reads width and height from a PNG file's IHDR chunk. */
function pngSize(path: string): [number, number] {
  const bytes = readFileSync(path);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function expectInside(region: Region, label: string): void {
  const image = IMAGES[region.image];
  expect(image, label).toBeDefined();
  expect(region.x >= 0 && region.y >= 0, label).toBe(true);
  expect(region.x + region.w, label).toBeLessThanOrEqual(image.width);
  expect(region.y + region.h, label).toBeLessThanOrEqual(image.height);
}

describe('images', () => {
  for (const [id, image] of Object.entries(IMAGES)) {
    it(`${id} exists with its declared size`, () => {
      expect(pngSize(resolve('public/assets', image.src))).toEqual([image.width, image.height]);
    });
  }
});

describe('sprite regions', () => {
  it('keeps every prop inside its image', () => {
    for (const [id, art] of Object.entries(OBJECTS)) expectInside(art.region, id);
  });

  it('keeps every creature frame inside its image', () => {
    for (const id of Object.keys(CREATURES)) {
      if (!isCreatureId(id)) continue;
      for (let t = 0; t < 2000; t += 125) {
        for (const facing of ['down', 'left', 'right', 'up'] as const) {
          expectInside(mapFrame(id, facing, true, t), `${id} ${facing}`);
        }
        expectInside(battleFrame(id, t), `${id} battle`);
      }
    }
  });

  it('keeps every effect frame inside its image and ends on time', () => {
    for (const id of Object.keys(EFFECTS) as (keyof typeof EFFECTS)[]) {
      const duration = effectDuration(id);
      for (let t = 0; t < duration; t += 10) expectInside(effectFrame(id, t)!, `${id}@${t}`);
      expect(effectFrame(id, duration)).toBeNull();
      expect(effectFrame(id, -1)).toBeNull();
    }
  });

  it('only maps spells that exist to effects that exist', () => {
    for (const [spell, effect] of Object.entries(SPELL_EFFECTS)) {
      expect(SPELLS[spell], spell).toBeDefined();
      expect(EFFECTS[effect], effect).toBeDefined();
    }
  });
});

describe('sprite keys in game data', () => {
  it('resolves every enemy, NPC and class sprite', () => {
    const keys = [
      ...Object.values(ENEMIES).map((e) => e.sprite),
      ...Object.values(NPCS).map((n) => n.sprite),
      ...Object.values(CLASSES).map((c) => c.sprite),
    ];
    for (const key of keys) expect(isCreatureId(key), key).toBe(true);
  });

  it('uses Fantasy Dreamland art outdoors and Pixel Battlers in the caves', () => {
    const spritesOn = (mapId: string) =>
      MAPS[mapId]!.entities.flatMap((e) =>
        e.kind === 'monster' ? [ENEMIES[e.enemyId]!.sprite] : [],
      );
    for (const key of spritesOn('overworld')) expect(isStripSprite(key as never)).toBe(false);
    for (const key of [...spritesOn('caves1'), ...spritesOn('caves2')]) {
      expect(isStripSprite(key as never), key).toBe(true);
    }
  });

  it('only places known decor', () => {
    for (const map of Object.values(MAPS)) {
      for (const decor of map.decor ?? []) expect(decor.object in OBJECTS, decor.object).toBe(true);
    }
  });
});

describe('map art planning', () => {
  const cells = (map: MapDef) =>
    Array.from({ length: mapHeight(map) }, (_, y) =>
      Array.from({ length: mapWidth(map) }, (_, x) => [x, y] as const),
    ).flat();

  for (const map of Object.values(MAPS)) {
    it(`${map.id} plans ground and props inside their images`, () => {
      for (const [x, y] of cells(map)) {
        for (const t of [0, 900]) {
          for (const layer of planGround(map, x, y, t)) expectInside(layer, `${map.id} ${x},${y}`);
        }
      }
      const props = planObjects(map);
      for (const prop of props) expectInside(prop.region, map.id);
      expect(props.map((p) => p.sortY)).toEqual(
        [...props.map((p) => p.sortY)].sort((a, b) => a - b),
      );
      expect(backgroundFor(map)).toMatch(/^#[0-9a-f]{6}$/);
    });
  }

  const tiny = (tiles: string[], theme: MapDef['theme'] = 'outdoor'): MapDef => ({
    id: 't',
    name: 't',
    theme,
    tiles,
    warps: [],
    entities: [],
  });

  it('draws the base grass under everything outdoors', () => {
    const [base] = planGround(tiny(['...']), 1, 0);
    expect(base).toMatchObject({
      image: 'ground',
      x: FULL_TILE[0] * TILE,
      y: (4 + FULL_TILE[1]) * TILE,
    });
  });

  it('blends terrain edges by neighbour', () => {
    const map = tiny(['.....', '.~~~.', '.~~~.', '.~~~.', '.....']);
    const centre = planGround(map, 2, 2)[1]!;
    const edge = planGround(map, 1, 1)[1]!;
    expect(centre.image).toBe('water');
    expect(centre).not.toEqual(edge);
  });

  it('animates water but not land', () => {
    const map = tiny(['~']);
    expect(planGround(map, 0, 0, 0)[1]).not.toEqual(planGround(map, 0, 0, 300)[1]);
    expect(planGround(tiny(['=']), 0, 0, 0)).toEqual(planGround(tiny(['=']), 0, 0, 300));
  });

  it('has no ground on cave rock and props only near floor', () => {
    expect(planGround(tiny(['X'], 'cave'), 0, 0)).toEqual([]);
    expect(planObjects(tiny(['XXXXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX'], 'cave'))).toEqual([]);
    expect(planObjects(tiny(['XXX', 'X:X', 'XXX'], 'cave'))).toHaveLength(8);
  });

  it('rejects unknown decor', () => {
    const map = { ...tiny(['.']), decor: [{ object: 'nope', x: 0, y: 0 }] };
    expect(() => planObjects(map)).toThrow('Unknown decor');
  });

  it('centres props on their footprint, bottom-aligned', () => {
    const house = OBJECTS['house.red'];
    const placed = placeObject(house, 2, 5);
    expect(placed.px).toBe(2 * TILE);
    expect(placed.py + house.region.h).toBe(6 * TILE);
    expect(placed.sortY).toBe(6 * TILE);
  });

  it('chooses stable variants per cell', () => {
    expect(cellHash(3, 4)).toBe(cellHash(3, 4));
    for (let i = 0; i < 100; i++) {
      const h = cellHash(i, i * 7);
      expect(h >= 0 && h < 1).toBe(true);
    }
  });
});

describe('creature frames', () => {
  it('walks only while moving, using the facing row', () => {
    expect(mapFrame('char.019', 'up', false, 5000)).toMatchObject({ x: 0, y: 3 * 48 });
    const walking = new Set([0, 130, 260, 390].map((t) => mapFrame('char.019', 'left', true, t).x));
    expect(walking.size).toBeGreaterThan(1);
  });

  it('loops strip animations through all frames', () => {
    const xs = new Set(
      Array.from({ length: 20 }, (_, i) => battleFrame('battler.brute', i * 170).x),
    );
    expect(xs.size).toBe(8);
  });

  it('uses the large sheet for overworld enemies in battle', () => {
    expect(battleFrame('enemy.slime', 0).image).toBe('enemy.001.large');
    expect(battleFrame('char.008', 0).image).toBe('char.008');
  });

  it('draws still props unchanged', () => {
    expect(mapFrame('chest', 'left', true, 999)).toEqual(battleFrame('chest', 0));
  });
});
