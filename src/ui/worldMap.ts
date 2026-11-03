import { MAPS } from '../data/maps';
import { HOMETOWNS, hometownOf } from '../data/hometowns';
import {
  SURFACE_SIZE,
  STONE_APPROACH,
  SURFACE_SITES,
  SURFACE_CENTER,
  SURFACE_PROVINCES,
  surfaceProvince,
} from '../data/surfaceLayout';
import { hometownMap } from '../world/hometowns';
import { warpUnlocked, type MapDef } from '../world/map';
import type { GameState } from '../world/state';
import { el } from './dom';
import { travelGuide } from '../game/travelGuide';

const COLORS: Readonly<Record<string, string>> = {
  grove: '#47764d',
  lake: '#749e69',
  quarry: '#b98b67',
  forge: '#766468',
  peaks: '#c8d3d4',
  cliffs: '#a5ae78',
  ruins: '#9990ad',
};

export function surfaceDistrict(x: number, y: number): string {
  if (Math.hypot(x - SURFACE_CENTER.x, y - SURFACE_CENTER.y) < 22) return 'Stone circle';
  if (x < 104 && y < 112 && !surfaceProvince(x, y)) return 'Mossvale valley';
  return surfaceProvince(x, y)?.name ?? 'Heartland roads';
}

/** A navigational map, not a giant offscreen render of every full-size sprite. */
export function drawSurfaceOverview(canvas: HTMLCanvasElement, map: MapDef): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const scale = canvas.width / SURFACE_SIZE;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < SURFACE_SIZE; y++)
    for (let x = 0; x < SURFACE_SIZE; x++) {
      const tile = map.tiles[y]?.[x],
        province = surfaceProvince(x, y);
      ctx.fillStyle =
        tile === '~'
          ? '#294867'
          : tile === '!'
            ? '#b95e45'
            : tile === 'B' || tile === 'L'
              ? '#d8bd83'
              : tile === '='
                ? '#d0bc8e'
                : tile === 'o'
                  ? '#b4ad91'
                  : tile === '^'
                    ? province?.id === 'peaks'
                      ? '#718395'
                      : '#655f65'
                    : tile === 'T'
                      ? province?.id === 'grove'
                        ? '#284f3c'
                        : '#3b6247'
                      : (province && COLORS[province.id]) || '#819760';
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  ctx.font = `600 ${Math.max(11, scale * 6)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const province of SURFACE_PROVINCES) {
    const x = province.x * scale,
      y = (province.y + 11) * scale;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#172638db';
    ctx.strokeText(province.name, x, y);
    ctx.fillStyle = '#fff3d1';
    ctx.fillText(province.name, x, y);
  }
  ctx.strokeStyle = '#e9d7a6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(SURFACE_CENTER.x * scale, SURFACE_CENTER.y * scale, 10 * scale, 0, Math.PI * 2);
  ctx.stroke();
  // This connector passes through the village interior, not an open provincial road.
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#e9d7a6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SURFACE_SITES.mossvale.x * scale, SURFACE_SITES.mossvale.y * scale);
  ctx.lineTo(STONE_APPROACH.x * scale, STONE_APPROACH.y * scale);
  ctx.stroke();
  ctx.restore();
}

export function worldMapBody(state: GameState): HTMLElement {
  const map = hometownMap(MAPS.overworld as MapDef, state.flags);
  const home = hometownOf(state.flags);
  const canvas = el('canvas', { className: 'world-overview' }) as HTMLCanvasElement;
  canvas.width = 768;
  canvas.height = 768;
  canvas.style.cssText =
    'display:block;width:100%;height:auto;max-width:640px;margin:auto;border-radius:8px;border:1px solid #64738c;touch-action:pan-y';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute(
    'aria-label',
    'Sevenstones world map showing the seven provinces, roads, towns and your location',
  );
  const title = el('p', {
    text:
      state.mapId === 'overworld'
        ? `You are in ${surfaceDistrict(state.x, state.y)}.`
        : `Surface routes from ${MAPS[state.mapId]?.name ?? 'your location'}.`,
  });
  const info = el('p', {
    text: 'North is up. The stone circle is reached only through Mossvale’s north path.',
  });
  info.setAttribute('role', 'status');
  const legend = el('div');
  legend.style.cssText =
    'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px';
  const destinations = map.warps.filter(
    (warp) =>
      !['sunkenArchive', 'upwardRoad', 'innerWard'].includes(warp.to.map) &&
      !(warp.x === STONE_APPROACH.x && warp.y === STONE_APPROACH.y),
  );
  let selected = '';
  const paint = (): void => {
    drawSurfaceOverview(canvas, map);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scale = canvas.width / SURFACE_SIZE;
    for (const warp of destinations) {
      const active = warp.to.map === selected;
      ctx.fillStyle = warpUnlocked(warp, state.flags) ? '#f0ddb0' : '#8892a3';
      ctx.strokeStyle = active ? '#ffffff' : '#182438';
      ctx.lineWidth = active ? 3 : 2;
      ctx.beginPath();
      ctx.arc((warp.x + 0.5) * scale, (warp.y + 0.5) * scale, active ? 8 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    const here =
      state.mapId === 'overworld'
        ? state
        : SURFACE_SITES[state.mapId as keyof typeof SURFACE_SITES];
    if (here) {
      ctx.fillStyle = '#ffe471';
      ctx.strokeStyle = '#152138';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc((here.x + 0.5) * scale, (here.y + 0.5) * scale, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.font = 'bold 17px system-ui';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f5edd4';
    ctx.fillText('↑ N', 20, 28);
  };
  for (const warp of destinations) {
    const settlement = HOMETOWNS.find((town) => town.map === warp.to.map);
    const name = settlement?.name ?? MAPS[warp.to.map]?.name ?? warp.to.map;
    const accessible = warpUnlocked(warp, state.flags);
    const button = el('button', {
      text: `${name}${warp.to.map === home.map ? ' · home' : accessible ? '' : ' · closed'}`,
    });
    button.style.cssText = 'min-height:44px;text-align:left;white-space:normal';
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      selected = warp.to.map;
      for (const peer of legend.querySelectorAll('button'))
        peer.setAttribute('aria-pressed', String(peer === button));
      info.textContent = travelGuide(state, warp.to.map)?.text ?? `${name} is marked on the map.`;
      paint();
    });
    legend.append(button);
  }
  paint();
  return el('div', {}, title, canvas, info, legend);
}
