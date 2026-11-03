import { MAPS } from '../data/maps';
import { MENTORS } from '../data/mentors';
import { HOMETOWNS } from '../data/hometowns';
import { STONE_APPROACH, SURFACE_CENTER } from '../data/surfaceLayout';
import { currentMap, type GameState } from '../world/state';
import { pathTo } from '../world/path';
import { warpUnlocked, passageOpen, type Direction, type Location, type Warp } from '../world/map';
import type { Element } from '../core/elements';

const schools: Record<Element, string> = {
  fire: 'Fire',
  water: 'Ice',
  earth: 'Gravity',
  wind: 'Wind',
  lightning: 'Lightning',
  nature: 'Nature',
  arcane: 'Arcane',
};
export interface TravelDestination {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly locked: string | null;
}
export function travelDestinations(state: GameState): TravelDestination[] {
  const surface = currentMap({ ...state, mapId: 'overworld' });
  const destinations = surface.warps.filter(
    (w) =>
      !['sunkenArchive', 'upwardRoad', 'innerWard'].includes(w.to.map) &&
      !(w.x === STONE_APPROACH.x && w.y === STONE_APPROACH.y),
  );
  return [
    ...destinations.map((w) => {
      const name =
        HOMETOWNS.find((h) => h.map === w.to.map)?.name ?? MAPS[w.to.map]?.name ?? w.to.map;
      const mentor = Object.values(MENTORS).find((m) => m.route[0].map === w.to.map);
      const locked = warpUnlocked(w, state.flags)
        ? null
        : ((w.requiresFlag && !state.flags.has(w.requiresFlag) ? w.lockedText : w.missingAnyText) ??
          w.lockedText ??
          'The approach is closed.');
      return {
        id: w.to.map,
        name,
        label: `${name}${mentor ? ` · ${schools[mentor.element]} — ${mentor.name}` : ''}${locked ? ' · closed' : ''}`,
        locked,
      };
    }),
    { id: 'stones', name: 'Stone circle', label: 'Stone circle · through Mossvale', locked: null },
  ];
}
export interface TravelGuide {
  readonly destination: TravelDestination;
  readonly text: string;
  readonly next: Location | null;
  readonly path: readonly Direction[] | null;
}
function open(warp: Warp, state: GameState): boolean {
  return (
    warpUnlocked(warp, state.flags) && !(warp.closesWith && state.flags.has(warp.closesWith.flag))
  );
}
/** Choose a real first crossing, including multi-map exits such as the Moon Caves. */
function surfaceExits(state: GameState): readonly Warp[] {
  const distance = new Map<string, number>([['overworld', 0]]);
  const reverse = new Map<string, string[]>();
  for (const id of Object.keys(MAPS))
    for (const warp of currentMap({ ...state, mapId: id }).warps) {
      if (!open(warp, state)) continue;
      const incoming = reverse.get(warp.to.map) ?? [];
      incoming.push(id);
      reverse.set(warp.to.map, incoming);
    }
  const queue = ['overworld'];
  for (const at of queue)
    for (const id of reverse.get(at) ?? []) {
      if (distance.has(id)) continue;
      distance.set(id, (distance.get(at) ?? 0) + 1);
      queue.push(id);
    }
  const candidates = currentMap(state).warps.filter(
    (w) => open(w, state) && distance.has(w.to.map),
  );
  const nearest = Math.min(...candidates.map((w) => distance.get(w.to.map) ?? Infinity));
  return candidates.filter((w) => distance.get(w.to.map) === nearest);
}
/** Real, collision-aware next leg. A marker never unlocks a gate or teleports the hero. */
export function travelGuide(state: GameState, id: string): TravelGuide | null {
  const destination = travelDestinations(state).find((d) => d.id === id);
  if (!destination) return null;
  const map = currentMap(state);
  const here = state.mapId === 'overworld';
  const sanctuary = here && Math.hypot(state.x - SURFACE_CENTER.x, state.y - SURFACE_CENTER.y) < 25;
  let candidates: readonly Warp[] = [];
  let text: string;
  if (state.mapId === id) {
    const mentor = Object.values(MENTORS).find((m) => m.route[0].map === id);
    const gate = map.passages?.find((gate) => gate.mentorId === mentor?.id);
    text = mentor
      ? gate && !passageOpen(gate, state)
        ? gate.text
        : `Find ${mentor.name} at ${mentor.route[0].landmark}.`
      : `You are in ${destination.name}.`;
  } else if (id === 'stones' && sanctuary) {
    const path = pathTo(state, SURFACE_CENTER.x, SURFACE_CENTER.y);
    return {
      destination,
      text: 'The stones are inside this sanctuary.',
      next: { map: 'overworld', ...SURFACE_CENTER },
      path,
    };
  } else if (state.mapId === 'mossvale') {
    candidates = map.warps.filter((w) =>
      id === 'stones' ? w.y === 0 : w.y === map.tiles.length - 1,
    );
    text =
      id === 'stones'
        ? 'Take Mossvale’s north path to the stones.'
        : 'Leave Mossvale by the south gate for the provincial roads.';
  } else if (!here) {
    candidates = surfaceExits(state);
    const via = candidates[0]?.to.map;
    text =
      via === 'overworld'
        ? `Leave ${map.name} for the provincial road.`
        : via
          ? `Return toward the surface through ${MAPS[via]?.name ?? via}.`
          : 'The return route is not open yet.';
  } else if (sanctuary) {
    candidates = map.warps.filter((w) => w.x === STONE_APPROACH.x && w.y === STONE_APPROACH.y);
    text =
      'Return through the northwest gate to Mossvale, then leave by its south gate. The mountains do not lead to other regions.';
  } else {
    candidates = map.warps.filter(
      (w) =>
        w.to.map === (id === 'stones' ? 'mossvale' : id) &&
        !(w.x === STONE_APPROACH.x && w.y === STONE_APPROACH.y),
    );
    text =
      id === 'stones'
        ? 'Enter Mossvale, then take its north path to the stones.'
        : `Follow the provincial road to ${destination.name}.`;
  }
  const routes = candidates
    .map((w) => ({ next: { map: state.mapId, x: w.x, y: w.y }, path: pathTo(state, w.x, w.y) }))
    .filter((r) => r.path !== null)
    .sort((a, b) => (a.path?.length ?? 0) - (b.path?.length ?? 0));
  const route = routes[0];
  return {
    destination,
    text: [text, destination.locked].filter(Boolean).join('\n'),
    next: route?.next ?? null,
    path: route?.path ?? null,
  };
}
