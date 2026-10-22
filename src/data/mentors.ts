import type { Element } from '../core/elements';
import type { Location } from '../world/map';

/** A place on a mentor's route; it joins the route once the hero has `requiresFlag`. */
export interface MentorStop extends Location {
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
  readonly motive: string;
  /** Said after a lesson is won. */
  readonly winText: string;
  /** Said after a lesson is lost. */
  readonly loseText: string;
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
    motive: 'My hands shake too much for the forge now. Someone has to carry the flame.',
    winText: 'There. The flame is yours to carry.',
    loseText: 'It went out. Find me again and we will relight it.',
    trialFoe: 'emberWisp',
    route: [
      { map: 'mossvale', x: 3, y: 11 },
      { map: 'overworld', x: 8, y: 6 },
      { map: 'brightwater', x: 23, y: 11 },
      { map: 'caves1', x: 9, y: 11, requiresFlag: 'cavePass' },
    ],
    moveEvery: 4,
  },
  maren: {
    id: 'maren',
    name: 'Maren',
    element: 'water',
    sprite: 'char.031',
    motive: 'The lake is clouding and I cannot watch it alone. Learn the tide with me.',
    winText: 'The water knows you now.',
    loseText: 'The tide pulled away. Come find me and we will try again.',
    trialFoe: 'tideWisp',
    route: [
      { map: 'overworld', x: 26, y: 9 },
      { map: 'brightwater', x: 7, y: 11 },
      { map: 'mossvale', x: 16, y: 2 },
    ],
    moveEvery: 5,
  },
  rook: {
    id: 'rook',
    name: 'Rook',
    element: 'lightning',
    sprite: 'char.005',
    motive:
      'Storms roll off the peaks faster every year. I need someone quick enough to meet them.',
    winText: 'Quick hands. The storm answers you.',
    loseText: 'Too slow. I will be chasing the clouds; catch me.',
    trialFoe: 'sparkWisp',
    route: [
      { map: 'overworld', x: 36, y: 6 },
      { map: 'brightwater', x: 17, y: 12 },
      { map: 'caves1', x: 4, y: 9, requiresFlag: 'cavePass' },
      { map: 'caves2', x: 12, y: 5, requiresFlag: 'defeated:c2-wyrm' },
    ],
    moveEvery: 3,
  },
  hazel: {
    id: 'hazel',
    name: 'Hazel',
    element: 'nature',
    sprite: 'char.002',
    motive: 'The spores are choking my meadows. Help me grow them green again.',
    winText: 'See? It grows back, a little stronger.',
    loseText: 'Roots take time. Look for me in the meadows.',
    trialFoe: 'mossWisp',
    route: [
      { map: 'overworld', x: 3, y: 10 },
      { map: 'mossvale', x: 17, y: 8 },
      { map: 'overworld', x: 20, y: 18 },
    ],
    moveEvery: 6,
  },
  dorn: {
    id: 'dorn',
    name: 'Dorn',
    element: 'earth',
    sprite: 'char.025',
    motive: 'The caves took my crew. I teach so nobody digs blind again.',
    winText: 'Solid. The ground will hold for you.',
    loseText: 'The rock won that one. I will be down by the stone; come back.',
    trialFoe: 'stoneWisp',
    route: [
      { map: 'overworld', x: 32, y: 4 },
      { map: 'caves1', x: 10, y: 7, requiresFlag: 'cavePass' },
      { map: 'caves2', x: 3, y: 5, requiresFlag: 'cavePass' },
      { map: 'brightwater', x: 14, y: 13 },
    ],
    moveEvery: 4,
  },
  selene: {
    id: 'selene',
    name: 'Selene',
    element: 'arcane',
    sprite: 'char.039',
    motive: 'Something below drinks the moonlight. I need a second mind to hold it.',
    winText: 'Two minds, one moon. Well held.',
    loseText: 'It slipped. Follow the moonlight to me and we begin again.',
    trialFoe: 'moonWisp',
    route: [
      { map: 'brightwater', x: 8, y: 2 },
      { map: 'overworld', x: 25, y: 4 },
      { map: 'caves2', x: 7, y: 2, requiresFlag: 'cavePass' },
    ],
    moveEvery: 5,
  },
  kestrel: {
    id: 'kestrel',
    name: 'Kestrel',
    element: 'wind',
    sprite: 'char.015',
    motive: 'My letters must reach every village. Teach you the wind and the roads get shorter.',
    winText: 'Ha! You flew. Keep it.',
    loseText: 'Blown off course. I am always on the road; catch me.',
    trialFoe: 'galeWisp',
    route: [
      { map: 'overworld', x: 17, y: 18 },
      { map: 'mossvale', x: 12, y: 12 },
      { map: 'brightwater', x: 19, y: 2 },
      { map: 'overworld', x: 30, y: 12 },
    ],
    moveEvery: 3,
  },
};
