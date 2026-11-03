import { required } from '../core/required';
import { MAPS } from '../data/maps';
import { MENTORS } from '../data/mentors';
import { NPCS } from '../data/npcs';
import { hometownMap } from '../world/hometowns';
import { HOMETOWNS, hometownOf } from '../data/hometowns';
import { regionFixed } from '../game/encounterFlow';
import { SURFACE_SITES, SURFACE_STONES } from '../data/surfaceLayout';
import { heroClass } from '../game/hero';
import { entityAttitude, entitySprite } from '../game/encounter';
import { seeksHero } from '../game/hidden';
import { lessonsFor } from '../game/lessons';
import { currentMap, activeEntities, type GameState } from '../world/state';
import { mapWidth, mapHeight, passageOpen, warpUnlocked, warpStirs } from '../world/map';
import { planGround, planObjects, backgroundFor, TILE, type PlacedObject } from '../ui/art/themes';
import { CREATURES, mapFrame, isCreatureId, isStripSprite } from '../ui/art/creatures';
import { ATTITUDE_ICONS, type IconId } from '../ui/art/icons';
import { ELEMENT_COLOR_OF } from '../ui/art/feedback';
import { encounterProps, groveStone } from '../ui/worldFeedback';
import { IMAGES, type Region } from '../ui/art/images';

/** Native draw list uses the campaign's exact atlas recipes and exported web icons. */
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
export interface NativeWorldAnimation {
  id: string;
  frames: number;
  fps: number;
  phase?: number;
  offsets?: readonly (readonly [number, number])[];
  motion?: 'bob' | 'leap';
}
export interface NativeWorldDecoration {
  id: string;
  kind: 'ellipse' | 'rect' | 'label';
  layer: 'under' | 'over' | 'label';
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  alpha?: number;
  stroke?: string;
  lineWidth?: number;
  pulseMean?: number;
  pulseAmplitude?: number;
  pulsePeriod?: number;
  text?: string;
  clampBottom?: boolean;
}
export interface NativeWorldViewport {
  readonly width: number;
  readonly height: number;
}
export const DEFAULT_WORLD_VIEWPORT: NativeWorldViewport = { width: 416, height: 640 };
export function nativeWorldViewport(width: number, height: number): NativeWorldViewport {
  return {
    width: Number.isFinite(width) ? Math.round(Math.max(240, Math.min(1024, width))) : 416,
    height: Number.isFinite(height) ? Math.round(Math.max(320, Math.min(1280, height))) : 640,
  };
}
/** Same camera convention as WorldView, including centred maps smaller than the viewport. */
export function nativeCamera(target: number, mapSize: number, viewSize: number): number {
  return mapSize <= viewSize
    ? (mapSize - viewSize) / 2
    : Math.max(0, Math.min(mapSize - viewSize, target));
}
let lastMap: ReturnType<typeof currentMap> | null = null;
let props: PlacedObject[] = [];
export function worldSnapshot(
  state: GameState,
  viewport: NativeWorldViewport = DEFAULT_WORLD_VIEWPORT,
  target: { readonly x: number; readonly y: number } | null = null,
) {
  const map = currentMap(state);
  const { width, height } = nativeWorldViewport(viewport.width, viewport.height);
  const camX = nativeCamera(state.x * TILE + TILE / 2 - width / 2, mapWidth(map) * TILE, width);
  const camY = nativeCamera(state.y * TILE + TILE / 2 - height / 2, mapHeight(map) * TILE, height);
  const sprites: NativeSprite[] = [];
  const animations: NativeWorldAnimation[] = [];
  const decorations: NativeWorldDecoration[] = [];
  let drawID = '';
  const visible = (x: number, y: number, w = 0, h = 0) =>
    !(x + w < camX - 64 || y + h < camY - 64 || x > camX + width + 64 || y > camY + height + 64);
  const drawSource = (
    source: string,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    x: number,
    y: number,
    w = sw,
    h = sh,
    alpha = 1,
  ) => {
    if (!visible(x, y, w, h)) return false;
    sprites.push({
      id: drawID,
      source,
      sx,
      sy,
      sw,
      sh,
      x: x - camX,
      y: y - camY,
      width: w,
      height: h,
      alpha,
    });
    return true;
  };
  const draw = (region: Region, x: number, y: number, w = region.w, h = region.h, alpha = 1) =>
    drawSource(IMAGES[region.image].src, region.x, region.y, region.w, region.h, x, y, w, h, alpha);
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
        if (region.image === 'water' || region.image === 'lava') {
          const fps = region.image === 'water' ? 4 : 3;
          const offsets = Array.from({ length: 8 }, (_, frame): readonly [number, number] => {
            const next = required(planGround(map, x, y, ((frame + 0.01) * 1000) / fps)[i]);
            return [next.x - region.x, next.y - region.y];
          });
          animations.push({ id: drawID, frames: 8, fps, offsets });
        }
      }
  const groundCount = sprites.length;
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
  const icon = (
    id: string,
    iconID: IconId,
    x: number,
    y: number,
    scale: number,
    depth = Infinity,
    motion?: 'bob' | 'leap',
    element?: string,
  ) => {
    layers.push({
      depth,
      draw: () => {
        drawID = id;
        if (
          drawSource(
            `native-visuals/icon-${iconID}${element ? `-${element}` : ''}.png`,
            0,
            0,
            12,
            12,
            x,
            y,
            12 * scale,
            12 * scale,
            id.startsWith('inspect:') ? 0.85 : 1,
          ) &&
          motion
        )
          animations.push({ id, frames: 1, fps: 0, motion });
      },
    });
  };
  const decorate = (d: NativeWorldDecoration) =>
    decorations.push({ ...d, x: d.x - camX, y: d.y - camY });
  if (target)
    decorate({
      id: 'walk-target',
      kind: 'rect',
      layer: 'under',
      x: target.x * TILE + 3,
      y: target.y * TILE + 3,
      width: 26,
      height: 26,
      color: '#000000',
      alpha: 0,
      stroke: '#f5d77b',
      lineWidth: 2,
      pulseMean: 0.35,
      pulseAmplitude: 0.25,
      pulsePeriod: 140,
    });
  for (const prop of encounterProps(state, map))
    layers.push({
      depth: (prop.y + 1) * TILE - 0.5,
      draw: () => {
        drawID = `feedback:${prop.id}`;
        if (
          drawSource(
            `native-visuals/world-${prop.id}-${prop.won ? 'win' : 'fail'}.png`,
            0,
            0,
            48,
            48,
            prop.x * TILE - 8,
            prop.y * TILE - 12,
          )
        ) {
          const period =
            prop.skin === 'tower' && prop.won
              ? (0.6 * Math.PI) / 2
              : prop.skin === 'lamps' && !prop.won
                ? 0.09 * 2 * Math.PI
                : 0;
          if (period) animations.push({ id: drawID, frames: 12, fps: 12 / period });
        }
      },
    });
  for (const gate of map.passages ?? []) {
    const open = passageOpen(gate, state),
      x = gate.x * TILE,
      y = gate.y * TILE;
    decorate({
      id: `gate:${gate.mentorId}`,
      kind: 'rect',
      layer: 'under',
      x,
      y,
      width: TILE,
      height: TILE,
      color: open ? '#4e7968' : '#544c62',
    });
    icon(`gate-icon:${gate.mentorId}`, open ? 'boot' : 'lock', x + 4, y + 4, 2, -Infinity);
    decorate({
      id: `gate-label:${gate.mentorId}`,
      kind: 'label',
      layer: 'label',
      x: x + TILE / 2,
      y: y - 21,
      text: open
        ? `${MENTORS[gate.mentorId]?.name ?? 'Teacher'} →`
        : `Help ${NPCS[gate.taskId]?.name ?? gate.taskId}`,
      color: open ? '#a5e9bf' : '#f5d77b',
      clampBottom: true,
    });
  }
  const labeled = new Set<string>();
  for (const [index, warp] of map.warps.entries()) {
    if (warpStirs(warp, state.flags))
      decorate({
        id: `seal:${index}`,
        kind: 'ellipse',
        layer: 'under',
        x: (warp.x + 0.5) * TILE,
        y: (warp.y + 0.5) * TILE,
        width: TILE * 1.4,
        height: TILE * 1.4,
        color: ELEMENT_COLOR_OF.arcane,
        pulseMean: 0.35,
        pulseAmplitude: 0.25,
        pulsePeriod: 260,
      });
    const x = warp.x * TILE + TILE / 2,
      y = warp.y * TILE;
    if (
      !warpUnlocked(warp, state.flags) ||
      (warp.closesWith && state.flags.has(warp.closesWith.flag)) ||
      !visible(x, y) ||
      labeled.has(warp.to.map)
    )
      continue;
    labeled.add(warp.to.map);
    decorate({
      id: `waymark:${warp.to.map}`,
      kind: 'label',
      layer: 'label',
      x,
      y: y - 20,
      text: `→ ${MAPS[warp.to.map]?.name ?? warp.to.map}`,
      color: '#f5d77b',
    });
  }
  for (const entity of activeEntities(state)) {
    if (entity.kind === 'inspect') {
      icon(
        `inspect:${entity.id}`,
        'eye',
        entity.x * TILE + 4,
        entity.y * TILE - 12,
        2,
        (entity.y + 1) * TILE,
      );
      continue;
    }
    const sprite = entitySprite(entity) ?? '';
    if (isCreatureId(sprite)) {
      const region = mapFrame(sprite, 'down', entity.kind === 'monster', 0);
      const stripSize = entity.kind === 'monster' && entity.boss ? 72 : 48;
      const w = isStripSprite(sprite) ? stripSize : region.w;
      const h = isStripSprite(sprite) ? stripSize : region.h;
      layers.push({
        depth: (entity.y + 1) * TILE,
        draw: () => {
          drawID = `actor:${entity.id}`;
          if (
            draw(region, entity.x * TILE + (TILE - w) / 2, entity.y * TILE + TILE - h + 2, w, h)
          ) {
            const art = CREATURES[sprite].map;
            if (art.kind === 'strip')
              animations.push({ id: drawID, frames: art.frames, fps: 6, phase: entity.x * 0.137 });
            else if (art.kind === 'walker' && entity.kind === 'monster')
              animations.push({ id: drawID, frames: 4, fps: 8, phase: entity.x * 0.137 });
          }
        },
      });
    }
    if (entity.kind === 'mentor') {
      const mentor = MENTORS[entity.mentorId];
      if (mentor) {
        decorate({
          id: `mentor-glow:${entity.id}`,
          kind: 'ellipse',
          layer: 'under',
          x: entity.x * TILE + 16,
          y: entity.y * TILE + 29,
          width: TILE * 0.9,
          height: TILE * 0.36,
          color: ELEMENT_COLOR_OF[mentor.element],
          pulseMean: 0.45,
          pulseAmplitude: 0.15,
          pulsePeriod: 300,
        });
        if (seeksHero(mentor, state))
          icon(
            `mentor-mark:${entity.id}`,
            'star',
            entity.x * TILE + 4,
            entity.y * TILE - 34,
            2,
            Infinity,
            'leap',
            mentor.element,
          );
        else if (lessonsFor(state, mentor).length > 0)
          icon(
            `mentor-mark:${entity.id}`,
            'scroll',
            entity.x * TILE + 4,
            entity.y * TILE - 30,
            2,
            Infinity,
            'bob',
          );
      }
    }
    const attitude = entityAttitude(state, entity);
    if (attitude)
      icon(
        `attitude:${entity.id}`,
        ATTITUDE_ICONS[attitude],
        entity.x * TILE + 20,
        entity.y * TILE - 22,
        1,
      );
  }
  // Hero facing comes from the same authored row lookup as the web renderer.
  const heroSprite = heroClass(state.hero).sprite;
  if (isCreatureId(heroSprite))
    layers.push({
      depth: (state.y + 1) * TILE + 0.25,
      draw: () => {
        drawID = 'hero';
        const frame = mapFrame(heroSprite, state.facing, false, 0);
        draw(frame, state.x * TILE + (TILE - frame.w) / 2, state.y * TILE + TILE - frame.h + 2);
      },
    });
  let overlayBase: number | null = null;
  layers
    .sort((a, b) => a.depth - b.depth)
    .forEach((layer) => {
      if (layer.depth === Infinity && overlayBase === null) overlayBase = sprites.length;
      layer.draw();
    });
  const nature = groveStone(state, map.id);
  return {
    mapId: map.id,
    background: backgroundFor(map),
    width,
    height,
    camX,
    camY,
    sprites,
    animations,
    decorations,
    groundCount,
    overlayBase: overlayBase ?? sprites.length,
    heroX: state.x,
    heroY: state.y,
    markers:
      map.id === 'overworld'
        ? SURFACE_STONES.map((s) => ({
            x: s.x * TILE + 16 - camX,
            y: s.y * TILE + 16 - camY,
            element: s.element,
            color: ELEMENT_COLOR_OF[s.element],
            lit: s.element === 'nature' && nature ? nature.light > 0 : regionFixed(state, s.region),
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
