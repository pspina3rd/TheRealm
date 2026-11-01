import type { GameState } from '../world/state';

/** One immediate, optional lead. No checklist of future systems on the opening screen. */
export function openingLead(state: Pick<GameState, 'flags' | 'mapId'>): string {
  if (state.flags.has('scene:refusal')) return '';
  if (state.mapId !== 'mossvale') return 'Rowan is waiting by the village well.';
  if (!state.flags.has('opening:houseVisited')) return 'Check a shuttered house.';
  if (!state.flags.has('npc:elder')) return 'Ask Rowan about the violet water.';
  return 'Return to Rowan at the well.';
}
