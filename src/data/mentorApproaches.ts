import { required } from '../core/required';
import { MENTORS } from './mentors';
import type { MapDef, MentorPassage } from '../world/map';

/** Existing regional work opens a physical route to the teacher. No spell is required. */
export const MENTOR_APPROACHES = [
  {
    mentorId: 'torva',
    taskId: 'apprentice',
    radius: 1,
    side: 'west',
    wall: '#',
    floor: 'o',
    text: 'The forge is cold. Help Cinda stoke it before Torva can teach.',
  },
  {
    mentorId: 'maren',
    taskId: 'fisher',
    radius: 2,
    side: 'west',
    wall: '~',
    floor: 'o',
    text: 'Maren is across the water. Help Tam mend his nets for passage.',
  },
  {
    mentorId: 'rook',
    taskId: 'beaconKeeper',
    radius: 2,
    side: 'east',
    wall: '^',
    floor: '.',
    text: 'The beacon approach is unsafe in this storm. Help Ysolde restore it.',
  },
  {
    mentorId: 'hazel',
    taskId: 'forager',
    radius: 2,
    side: 'west',
    wall: 'T',
    floor: '.',
    text: 'Rot blocks the oak path. Help Wren clear the infected ring.',
  },
  {
    mentorId: 'dorn',
    taskId: 'foreman',
    radius: 1,
    side: 'east',
    wall: 'X',
    floor: '.',
    text: 'The quarry lift is blocked. Help Flint clear the ridge road.',
  },
  {
    mentorId: 'selene',
    taskId: 'scholar',
    radius: 2,
    side: 'east',
    wall: 'k',
    floor: 'o',
    text: 'The moon tower is sealed. Help Ivo relight its rune.',
  },
  {
    mentorId: 'kestrel',
    taskId: 'courier',
    radius: 2,
    side: 'south',
    wall: '^',
    floor: '.',
    text: 'The eyrie crossing is raised. Help Twitch recover his letters and he will lower it.',
  },
] as const;

export function mentorAccessFlag(id: string): string {
  return `access:mentor:${id}`;
}

/** Author the clearings into the real collision map, with a single warned entrance. */
export function withMentorApproaches(
  base: Record<string, MapDef>,
): Readonly<Record<string, MapDef>> {
  const maps = { ...base };
  for (const approach of MENTOR_APPROACHES) {
    const home = required(MENTORS[approach.mentorId]).route[0];
    const map = required(maps[home.map]);
    const tiles = map.tiles.map((row) => row.split(''));
    const r = approach.radius;
    for (let y = home.y - r; y <= home.y + r; y++)
      for (let x = home.x - r; x <= home.x + r; x++) {
        required(tiles[y])[x] =
          x === home.x - r || x === home.x + r || y === home.y - r || y === home.y + r
            ? approach.wall
            : approach.floor;
      }
    const gate: MentorPassage = {
      x: home.x + (approach.side === 'west' ? -r : approach.side === 'east' ? r : 0),
      y: home.y + (approach.side === 'south' ? r : 0),
      interior: {
        left: home.x - r + 1,
        right: home.x + r - 1,
        top: home.y - r + 1,
        bottom: home.y + r - 1,
      },
      mentorId: approach.mentorId,
      taskId: approach.taskId,
      requiresFlag: mentorAccessFlag(approach.mentorId),
      text: approach.text,
    };
    required(tiles[gate.y])[gate.x] = approach.floor;
    maps[home.map] = {
      ...map,
      tiles: tiles.map((row) => row.join('')),
      passages: [...(map.passages ?? []), gate],
    };
  }
  return maps;
}
