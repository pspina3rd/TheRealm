import { tileFor, type TileDef } from './tiles';

export type Direction = 'up' | 'down' | 'left' | 'right';

export const DIRECTION_DELTAS: Readonly<Record<Direction, readonly [number, number]>> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export interface Location {
  readonly map: string;
  readonly x: number;
  readonly y: number;
}

/** A tile that moves the hero to another location when stepped on. */
export interface Warp {
  readonly x: number;
  readonly y: number;
  readonly to: Location;
  /** If set, the warp is blocked until the hero has this flag. */
  readonly requiresFlag?: string;
  /** Shown when a locked warp is bumped. */
  readonly lockedText?: string;
}

interface EntityBase {
  /** Unique across all maps; used to track defeated monsters. */
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface NpcEntity extends EntityBase {
  readonly kind: 'npc';
  readonly npcId: string;
}

export interface MonsterEntity extends EntityBase {
  readonly kind: 'monster';
  readonly enemyId: string;
  /** Bosses stay defeated forever; other monsters return when you leave the map. */
  readonly boss?: boolean;
}

export type EntityDef = NpcEntity | MonsterEntity;

export interface MapDef {
  readonly id: string;
  readonly name: string;
  /** Audio key for background music, resolved by the audio layer. */
  readonly music?: string;
  /** Rows of tile characters; every row must be the same length. */
  readonly tiles: readonly string[];
  readonly warps: readonly Warp[];
  readonly entities: readonly EntityDef[];
}

export function mapWidth(map: MapDef): number {
  return map.tiles[0]?.length ?? 0;
}

export function mapHeight(map: MapDef): number {
  return map.tiles.length;
}

export function tileAt(map: MapDef, x: number, y: number): TileDef {
  return tileFor(map.tiles[y]?.[x]);
}

export function warpAt(map: MapDef, x: number, y: number): Warp | undefined {
  return map.warps.find((w) => w.x === x && w.y === y);
}
