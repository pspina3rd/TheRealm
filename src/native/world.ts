import { required } from '../core/required';
import { MAPS } from '../data/maps';
import { hometownMap } from '../world/hometowns';
import { HOMETOWNS, hometownOf } from '../data/hometowns';
import { regionFixed } from '../game/encounterFlow';
import { SURFACE_SITES, SURFACE_STONES } from '../data/surfaceLayout';
import { heroClass } from '../game/hero';
import { entitySprite } from '../game/encounter';
import { currentMap, activeEntities, type GameState } from '../world/state';
import { mapWidth, mapHeight } from '../world/map';
import { planGround, planObjects, backgroundFor, TILE, type PlacedObject } from '../ui/art/themes';
import { mapFrame, isCreatureId } from '../ui/art/creatures';
import { IMAGES, type Region } from '../ui/art/images';

/** Native draw list uses the campaign's atlas recipes, including assembled building facades. */
export interface NativeSprite {
  id: string;
  source: string;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
}
let lastMap: ReturnType<typeof currentMap> | null = null;
let props: PlacedObject[] = [];
export function worldSnapshot(state: GameState) {
  const map = currentMap(state);
  const width = 416,
    height = 640;
  const camX = Math.max(0, Math.min(mapWidth(map) * TILE - width, state.x * TILE + 16 - width / 2));
  const camY = Math.max(
    0,
    Math.min(mapHeight(map) * TILE - height, state.y * TILE + 16 - height / 2),
  );
  const sprites: NativeSprite[] = [];
  let drawID = '';
  const draw = (region: Region, x: number, y: number, w = region.w, h = region.h, alpha = 1) => {
    if (x + w < camX - 64 || y + h < camY - 64 || x > camX + width + 64 || y > camY + height + 64)
      return;
    sprites.push({
      id: drawID,
      source: IMAGES[region.image].src,
      sx: region.x,
      sy: region.y,
      sw: region.w,
      sh: region.h,
      x: x - camX,
      y: y - camY,
      width: w,
      height: h,
      alpha,
    });
  };
  for (
    let y = Math.max(0, Math.floor(camY / TILE) - 2);
    y <= Math.min(mapHeight(map) - 1, Math.ceil((camY + height) / TILE) + 2);
    y++
  )
    for (
      let x = Math.max(0, Math.floor(camX / TILE) - 2);
      x <= Math.min(mapWidth(map) - 1, Math.ceil((camX + width) / TILE) + 2);
      x++
    )
      for (const [i, region] of planGround(map, x, y).entries()) {
        drawID = `ground:${x}:${y}:${i}`;
        draw(region, x * TILE, y * TILE);
      }
  if (map !== lastMap) {
    props = planObjects(map);
    lastMap = map;
  }
  const layers: { depth: number; draw: () => void }[] = props.map((p, index) => ({
    depth: p.sortY,
    draw: () => {
      const covers =
        p.sortY > (state.y + 1) * TILE &&
        state.x * TILE + 16 >= p.px &&
        state.x * TILE + 16 <= p.px + p.region.w &&
        state.y * TILE + 16 >= p.py &&
        state.y * TILE + 16 <= p.py + (p.height ?? p.region.h);
      for (const [i, part] of [...(p.baseParts ?? [p]), ...(p.details ?? [])].entries()) {
        drawID = `prop:${index}:${i}`;
        draw(part.region, part.px, part.py, undefined, undefined, covers ? 0.55 : 1);
      }
    },
  }));
  const standing = (sprite: string, x: number, y: number, hero = false, id = sprite) => {
    if (!isCreatureId(sprite)) return;
    const region = mapFrame(sprite, hero ? state.facing : 'down', false, 0);
    const w = region.w > 48 ? 48 : region.w,
      h = region.h > 48 ? 48 : region.h;
    layers.push({
      depth: (y + 1) * TILE + (hero ? 0.25 : 0),
      draw: () => {
        drawID = hero ? 'hero' : `actor:${id}`;
        draw(region, x * TILE + (TILE - w) / 2, y * TILE + TILE - h + 2, w, h);
      },
    });
  };
  for (const entity of activeEntities(state))
    standing(entitySprite(entity) ?? '', entity.x, entity.y, false, entity.id);
  standing(heroClass(state.hero).sprite, state.x, state.y, true);
  layers.sort((a, b) => a.depth - b.depth).forEach((layer) => layer.draw());
  return {
    mapId: map.id,
    background: backgroundFor(map),
    width,
    height,
    camX,
    camY,
    sprites,
    heroX: state.x,
    heroY: state.y,
    markers:
      map.id === 'overworld'
        ? SURFACE_STONES.map((s) => ({
            x: s.x * TILE + 16 - camX,
            y: s.y * TILE + 16 - camY,
            element: s.element,
            lit: regionFixed(state, s.region),
          }))
        : [],
  };
}

/** Compact terrain for the native map sheet; selecting the map never moves the hero. */
export function overviewSnapshot(state: GameState) {
  const map = hometownMap(required(MAPS.overworld), state.flags);
  const home = hometownOf(state.flags);
  return {
    tiles: map.tiles,
    x:
      state.mapId === 'overworld'
        ? state.x
        : (SURFACE_SITES[state.mapId as keyof typeof SURFACE_SITES]?.x ?? SURFACE_SITES.mossvale.x),
    y:
      state.mapId === 'overworld'
        ? state.y
        : (SURFACE_SITES[state.mapId as keyof typeof SURFACE_SITES]?.y ?? SURFACE_SITES.mossvale.y),
    sites: Object.entries(SURFACE_SITES)
      .filter(
        ([id]) =>
          !['innerWard', 'upwardRoad', 'sunkenArchive'].includes(id) &&
          (!HOMETOWNS.some((town) => town.map === id) || id === home.map || id === 'mossvale'),
      )
      .map(([id, point]) => ({
        x: point.x,
        y: point.y,
        name: HOMETOWNS.find((home) => home.map === id)?.name ?? MAPS[id]?.name ?? id,
      })),
  };
}
