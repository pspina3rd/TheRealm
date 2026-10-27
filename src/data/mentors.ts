import type { Element } from '../core/elements';
import type { Location } from '../world/map';
import type { Variants } from './types';

/** A place on a mentor's route; it joins the route once the hero has `requiresFlag`. */
export interface MentorStop extends Location {
  /** A few words saying where on the map, e.g. "cave seal", shown with the map's name. */
  readonly landmark: string;
  readonly requiresFlag?: string;
}

/**
 * A mentor: a named character of one element who teaches its spells
 * through team-up battles. Each has a reason to teach (`motive`) and
 * travels a route of places, starting from home.
 */
export interface MentorDef {
  readonly id: string;
  readonly name: string;
  readonly element: Element;
  /** Creature key from `src/ui/art/creatures.ts`. */
  readonly sprite: string;
  /** What they say when you meet them: why they teach. */
  readonly motive: Variants;
  /** Said after a lesson is won. */
  readonly winText: Variants;
  /** Said after a lesson is lost. */
  readonly loseText: Variants;
  /** The trial foe they summon at home (an id in `ENEMIES`). */
  readonly trialFoe: string;
  /** Home first. Stops with a flag join the route once the hero has it. */
  readonly route: readonly [MentorStop, ...MentorStop[]];
  /** The mentor moves on to the next stop after this many won world battles. */
  readonly moveEvery: number;
}

/** The seven mentors, one per element. */
export const MENTORS: Readonly<Record<string, MentorDef>> = {
  torva: {
    id: 'torva',
    name: 'Torva',
    element: 'fire',
    sprite: 'char.020',
    motive: 'My hands shake too much for the anvil now. Someone has to carry the spark.',
    winText: 'There! The flame is yours to hold.',
    loseText: "It went cold. Find me again and we'll relight it.",
    trialFoe: 'emberWisp',
    route: [
      { map: 'forge', x: 15, y: 8, landmark: 'old forge' },
      { map: 'quarry', x: 12, y: 5, landmark: 'ridge road' },
      { map: 'brightwater', x: 23, y: 11, landmark: 'east square' },
      { map: 'mossvale', x: 3, y: 11, landmark: 'village green' },
      { map: 'caves1', x: 9, y: 11, requiresFlag: 'cavePass', landmark: 'moon pool' },
    ],
    moveEvery: 4,
  },
  maren: {
    id: 'maren',
    name: 'Maren',
    element: 'water',
    sprite: 'char.031',
    motive: 'The lake clouds over as the caves wake below. Learn the tide with me.',
    winText: 'The water knows your heart now.',
    loseText: 'The current swept you away. Catch me at the jetty.',
    trialFoe: 'tideWisp',
    route: [
      { map: 'lake', x: 20, y: 10, landmark: 'jetty' },
      { map: 'brightwater', x: 7, y: 11, landmark: 'fountain' },
      { map: 'grove', x: 10, y: 5, landmark: 'grove pond' },
      { map: 'mossvale', x: 16, y: 2, landmark: 'north houses' },
    ],
    moveEvery: 5,
  },
  rook: {
    id: 'rook',
    name: 'Rook',
    element: 'lightning',
    sprite: 'char.005',
    motive:
      'Storms roll off the peaks faster every winter. I need someone quick enough to catch them.',
    winText: 'Quick hands! The lightning answers you.',
    loseText: "Too slow! I'll be chasing the clouds; find me.",
    trialFoe: 'sparkWisp',
    route: [
      { map: 'peaks', x: 17, y: 4, landmark: 'storm beacon' },
      { map: 'cliffs', x: 22, y: 9, landmark: 'cliff road' },
      { map: 'overworld', x: 36, y: 6, landmark: 'north-east peaks' },
      { map: 'brightwater', x: 17, y: 12, landmark: 'fountain' },
      { map: 'caves1', x: 4, y: 9, requiresFlag: 'cavePass', landmark: 'west tunnels' },
      { map: 'caves2', x: 12, y: 5, requiresFlag: 'defeated:c2-wyrm', landmark: "wyrm's lair" },
    ],
    moveEvery: 3,
  },
  hazel: {
    id: 'hazel',
    name: 'Hazel',
    element: 'nature',
    sprite: 'char.002',
    motive: 'The spores are choking my meadows from below. Help me grow them green again.',
    winText: 'See? Life springs back, stronger than before.',
    loseText: 'Roots take time to anchor. Meet me in the meadow.',
    trialFoe: 'mossWisp',
    route: [
      { map: 'grove', x: 24, y: 8, landmark: 'old oak' },
      { map: 'overworld', x: 3, y: 10, landmark: 'west meadow' },
      { map: 'mossvale', x: 17, y: 8, landmark: 'east fields' },
      { map: 'lake', x: 4, y: 15, landmark: 'lake meadow' },
    ],
    moveEvery: 6,
  },
  dorn: {
    id: 'dorn',
    name: 'Dorn',
    element: 'earth',
    sprite: 'char.025',
    motive: 'The cave-collapse took my mining crew. I teach so nobody digs blind again.',
    winText: 'Solid as granite! The ground will hold.',
    loseText: 'The rock won that round. Come back down to the lifts.',
    trialFoe: 'stoneWisp',
    route: [
      { map: 'quarry', x: 8, y: 6, landmark: 'quarry lift' },
      { map: 'overworld', x: 32, y: 4, landmark: 'tunnel gate' },
      { map: 'forge', x: 25, y: 14, landmark: 'ridge' },
      { map: 'caves1', x: 10, y: 7, requiresFlag: 'cavePass', landmark: 'crystal hall' },
      { map: 'caves2', x: 3, y: 5, requiresFlag: 'cavePass', landmark: 'depths, west' },
      { map: 'brightwater', x: 14, y: 13, landmark: 'south square' },
    ],
    moveEvery: 4,
  },
  selene: {
    id: 'selene',
    name: 'Selene',
    element: 'arcane',
    sprite: 'char.039',
    motive: 'Something deep below drinks the moonlight. I need a second mind to hold the dark.',
    winText: 'Two minds, one moon. Beautifully held.',
    loseText: 'The focus slipped. Follow the moonlight to my tower.',
    trialFoe: 'moonWisp',
    route: [
      { map: 'ruins', x: 13, y: 6, landmark: 'moon tower' },
      { map: 'cliffs', x: 10, y: 13, landmark: 'cliff path' },
      { map: 'brightwater', x: 8, y: 2, landmark: 'north houses' },
      { map: 'caves2', x: 7, y: 2, requiresFlag: 'cavePass', landmark: "wyrm's lair" },
    ],
    moveEvery: 5,
  },
  kestrel: {
    id: 'kestrel',
    name: 'Kestrel',
    element: 'wind',
    sprite: 'char.015',
    motive: 'My letters must reach every village. Learn the winds and your road gets shorter.',
    winText: 'Ha! You flew! Keep that speed!',
    loseText: 'Blown off course! Catch me along the cliff path.',
    trialFoe: 'galeWisp',
    route: [
      { map: 'cliffs', x: 16, y: 6, landmark: 'eyrie' },
      { map: 'peaks', x: 5, y: 12, landmark: 'high pass' },
      { map: 'overworld', x: 17, y: 18, landmark: 'south road' },
      { map: 'mossvale', x: 12, y: 12, landmark: 'village gate' },
      { map: 'brightwater', x: 19, y: 2, landmark: 'north houses' },
      { map: 'overworld', x: 30, y: 12, landmark: 'east road' },
    ],
    moveEvery: 3,
  },
};
