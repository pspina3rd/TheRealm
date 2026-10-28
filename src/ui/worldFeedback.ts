/** Saved encounter outcomes projected into the world; rendering never changes progression. */
import { ENCOUNTER_DEFS, type SkinId, type WorldProp } from '../data/encounters';
import { NPCS } from '../data/npcs';
import { SPELLS, STARTING_SPELLS } from '../data/spells';
import type { GameState } from '../world/state';
import type { MapDef } from '../world/map';

export interface EncounterProp extends WorldProp {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly skin: SkinId;
  readonly won: boolean;
}

/** A failed repeat overrides an earlier win until that encounter is won again. */
export function encounterProps(
  state: Pick<GameState, 'encounters' | 'flags'>,
  map: MapDef,
): EncounterProp[] {
  return map.entities.flatMap((entity) => {
    if (entity.kind !== 'npc') return [];
    const def = ENCOUNTER_DEFS[entity.npcId];
    if (!def) return [];
    const record = state.encounters[def.id];
    const npc = NPCS[def.id];
    const legacyWin =
      (!!npc && state.flags.has(npc.completionFlag ?? `npc:${def.id}`)) ||
      (def.id === 'guard' && state.flags.has('cavePass'));
    const won = record ? record.fails === 0 && record.wins > 0 : legacyWin;
    if (!won && !(record && record.fails > 0)) return [];
    return [
      {
        ...def.world[won ? 'win' : 'fail'],
        id: def.id,
        x: def.world.x,
        y: def.world.y,
        skin: def.skin,
        won,
      },
    ];
  });
}

export interface GroveStone {
  readonly x: number;
  readonly y: number;
  /** 0: waiting, 1: grove helped, 2: grove helped and Hazel's magic learned. */
  readonly light: 0 | 1 | 2;
  readonly text: string;
}

/**
 * A visual response to earned grove progress, never a route requirement.
 * Existing saves can prove Hazel's teaching through a new or levelled nature spell (the starting Cure is excluded);
 * the new slice also records each lesson explicitly. A later lost rematch
 * cannot undo an earlier act of restoration.
 */
export function groveStone(
  state: Pick<GameState, 'encounters' | 'hero'>,
  mapId: string,
): GroveStone | null {
  if (mapId !== 'overworld') return null;
  const helped = (state.encounters.forager?.wins ?? 0) > 0;
  const taught =
    Object.entries(state.encounters).some(
      ([id, record]) => id.startsWith('lesson:hazel:') && record.wins > 0,
    ) ||
    Object.entries(state.hero.spells).some(
      ([id, spell]) =>
        SPELLS[id]?.category === 'nature' && (!STARTING_SPELLS.includes(id) || spell.level > 1),
    );
  const light = helped && taught ? 2 : helped || taught ? 1 : 0;
  return {
    x: 2,
    y: 15,
    light,
    text:
      light === 2
        ? 'The grove stone shines green; fresh moss grows around its foot.'
        : light === 1
          ? 'A green glimmer has returned to the grove stone.'
          : 'The grove stone is dim, its moss grey.',
  };
}
