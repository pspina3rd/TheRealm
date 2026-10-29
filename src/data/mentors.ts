import type { Element } from '../core/elements';
import type { Location } from '../world/map';
import type { MoodLine, Variants } from './types';

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
  /**
   * The script's new rows (see "Mentors" in docs/GAME_DESIGN.md), said in
   * the hero's mood with them: on meeting at a new stop of their route...
   */
  readonly arrives: MoodLine;
  /** ...while they seek the hero out (a board feat they noticed)... */
  readonly seeks: MoodLine;
  /** ...once a lesson of theirs is won... */
  readonly afterLesson: MoodLine;
  /** ...and while their category is locked by a lost lesson. */
  readonly failedLesson: MoodLine;
  /** At the Road Back (second half, relighting their stone): kept for it, not yet said. */
  readonly roadBack: Variants;
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
    arrives: {
      cold: '*Torva warms her hands over a stranger\'s hearth and scowls at it.* "Call this a fire? Hmph."',
      plain: [
        "Came for coal. Stayed because the fire here's even sadder than mine.",
        '*She flexes her fingers.* "Road\'s good for the hands. Some days."',
      ],
      warm: "There you are, spark! Knew I'd find you somewhere warm.",
    },
    seeks: {
      cold: "You. Still carrying my flame? Don't let it go out on me.",
      plain: [
        "Didn't walk all this way for the view. Got a lesson burning a hole in me.",
        'The forge was too quiet without the noise you make.',
      ],
      warm: '*She grips your shoulder. Her hand barely shakes.* "Steadier today. Must be the company. Come on, spark, one more."',
    },
    afterLesson: {
      cold: "Flame's yours. Don't make me take it back.",
      plain: [
        "You hold heat better than my apprentice. Don't tell Cinda.",
        'The fire likes you. Took it years to like me.',
      ],
      warm: "Watching you work the flame... that's the best my hands have felt all year.",
    },
    failedLesson: {
      cold: "Cold. Come back when you've got some fire in you.",
      plain: ["Coals don't relight themselves. Find me again.", "Fire's sulking. So am I. Later."],
      warm: "We'll relight it, spark. I've burned more than that in my day.",
    },
    roadBack:
      '*Her hands are steady on the red stone.* "Look at that. Not a shake. Must be you, spark."',
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
    arrives: {
      cold: '*Maren kneels at a puddle and frowns at it.* "Even this water is restless."',
      plain: [
        "I follow the water. It's been running toward the caves lately.",
        'Every spring I pass is a little murkier than the last.',
      ],
      warm: 'Ah, love. I followed the river and it led me to you.',
    },
    seeks: {
      cold: "The tide doesn't care whether you like me. Come and learn it anyway.",
      plain: [
        "The lake sent me. That's how it feels, anyway. Shall we?",
        "You've been near deep water. I can tell. Let me teach you to read it.",
      ],
      warm: '*She tucks a damp strand of hair behind her ear.* "I missed you at the jetty, love. Come, the current\'s gentle today."',
    },
    afterLesson: {
      cold: 'The water knows you. That will have to do.',
      plain: [
        'Myst says her spring ran clear the day you passed. Water remembers kindness.',
        "Listen to the lake when you sleep. It's trying to warn us.",
      ],
      warm: "My lake is clouding, but you aren't. That's comfort enough, love.",
    },
    failedLesson: {
      cold: 'The water turned you away. Come back calmer.',
      plain: [
        'The tide went out on you. It comes back. So should you.',
        "Rest. Water can't be rushed.",
      ],
      warm: 'Oh, love, everyone gets pulled under once. Find me at the jetty.',
    },
    roadBack:
      "The lake cleared the day you went down. I've been waiting at this stone ever since, love.",
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
    arrives: {
      cold: '*Rook squints at the sky, ignoring you.* "No storm here. Waste of a walk."',
      plain: [
        'Chased a cloud halfway across Sevenstones. It got away. Rude.',
        '*His hair is standing on end.* "Don\'t touch me. I\'m still charged."',
      ],
      warm: "Ha! Knew you'd be under the loudest sky!",
    },
    seeks: {
      cold: "Oi. Still slow? Let's fix that.",
      plain: [
        "Storm's coming in three minutes. Lesson takes two. Move!",
        "Ran down off the peaks for this. You'd better be quick.",
      ],
      warm: "There's my lightning rod! Come on, the clouds won't wait for either of us.",
    },
    afterLesson: {
      cold: 'Quick enough. For now.',
      plain: [
        "The storms are getting stranger. Shapes in them. You'll want that speed.",
        'Struck twice and still standing. I like you better already.',
      ],
      warm: "Watch the next storm with me sometime. We'll name the bolts.",
    },
    failedLesson: {
      cold: 'Too slow. Come back faster.',
      plain: [
        'The bolt beat you. Happens. Not twice, though.',
        "I'll be chasing clouds. Catch me if you can. Ha!",
      ],
      warm: "Bah, the sky cheated. We'll get it next time, friend.",
    },
    roadBack: "Stone's dark, sky's dark, and you're late! Ha! Light it with me.",
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
    arrives: {
      cold: '*Hazel pulls a grey cap out of the ground and crushes it.* "Here too. Of course."',
      plain: [
        'Following the spore threads. They all run downward.',
        "Your road's got good soil under the rot. Nice to see.",
      ],
      warm: "Oh, look at you, sprout! You've grown since the grove.",
    },
    seeks: {
      cold: 'Wipe that look off your face and pick up a trowel.',
      plain: [
        "The meadows can spare me for an afternoon. Let's grow something.",
        "I've seeds that want planting and hands that want help.",
      ],
      warm: '*She presses a seed into your palm.* "Kept this one for you. Come plant it with me, sprout."',
    },
    afterLesson: {
      cold: "It grew. Don't let it go to your head.",
      plain: [
        'Bean sends her thanks. Her rows are green again.',
        'Life springs back if you give it half a chance.',
      ],
      warm: "Every green thing I see on the road, I think, 'my sprout did that'.",
    },
    failedLesson: {
      cold: "Shallow roots. Come back when you've learned patience.",
      plain: ['Roots take time. So do you.', 'The rot won that bed. Not the meadow.'],
      warm: 'Even oaks start as stubborn little acorns, sprout. Find me in the meadow.',
    },
    roadBack: "Grey moss all the way up the stone. We'll grow it back, sprout. We always do.",
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
    arrives: {
      cold: '*Dorn taps the ground with his boot and listens.* "Hollow. Don\'t stand there."',
      plain: [
        "Came to check the ground. It's been moving.",
        '*He studies a crack in the wall.* "Fresh. That wasn\'t here last month."',
      ],
      warm: "Good. You're on solid rock. Stay there.",
    },
    seeks: {
      cold: 'Lesson. Now. Before you dig yourself into a hole.',
      plain: [
        "Flint says you cleared the ridge. Let's see if you know why it fell.",
        "Came up from the lifts. Don't make me regret it.",
      ],
      warm: '*He hands you a lamp.* "Never go under without one. Come on. One more lesson."',
    },
    afterLesson: {
      cold: 'Ground holds. Keep it that way.',
      plain: [
        'You read rock better than my last crew did. Better than me, back then.',
        'If you go down the caves, test every step.',
      ],
      warm: "My crew would've liked you. Promise me you come back up.",
    },
    failedLesson: {
      cold: 'Rock won. Come back.',
      plain: [
        "Learn the ground before you trust it. I'll be by the lift.",
        "That's how it starts. One bad step.",
      ],
      warm: "Rock's patient. So am I. Come back down when you're ready.",
    },
    roadBack: 'You came back up. I said you would. Hold the lamp while I steady the stone.',
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
    arrives: {
      cold: '*Selene looks up at the dim moon and makes a note.* "Fainter. You wouldn\'t notice."',
      plain: [
        "I came to measure the moonlight here. There's less of it than there should be.",
        "The stars over this town are thinner. I'm keeping count.",
      ],
      warm: 'Ah. I hoped our paths would cross under a clear sky.',
    },
    seeks: {
      cold: "Your focus is poor. I've come to correct it.",
      plain: [
        'I came down from the tower. That should tell you how much it matters.',
        'Something drinks the moon. I need your mind clear before you meet it.',
      ],
      warm: '*She sets a hand lightly on yours.* "Two minds. Let\'s hold the moon together once more."',
    },
    afterLesson: {
      cold: 'Adequate. The dark will test you harder.',
      plain: [
        "The violet stone at Sevenstones dimmed first. I don't think that's chance.",
        'Keep your thoughts quiet below. Something listens.',
      ],
      warm: "Few people can hold the dark with me. I'm glad it's you.",
    },
    failedLesson: {
      cold: 'The focus broke. Come back composed.',
      plain: [
        'It slipped. Follow the moonlight to my tower.',
        "Rest your mind. It's tired, and so is the moon.",
      ],
      warm: "Don't be hard on yourself. The moon is weak tonight. Come back.",
    },
    roadBack: 'The violet stone went first, and it will go last. Hold it with me, one more time.',
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
    arrives: {
      cold: '*Kestrel lands from a gust, already reading a letter.* "Not for you. Move."',
      plain: [
        "Three villages before lunch. This one's the fourth!",
        "Post! Anyone? No? Fine, I'll leave it on the well.",
      ],
      warm: 'Ha! Caught you on my route. Lucky me!',
    },
    seeks: {
      cold: "Got a letter with your name on it. It says 'learn faster'.",
      plain: [
        'Took a shortcut off a cliff to find you. Lesson?',
        'The wind kept blowing me your way. Took the hint.',
      ],
      warm: '*She drops a letter in your hand. It\'s blank.* "Didn\'t have one for you, so I made an excuse. Come fly!"',
    },
    afterLesson: {
      cold: 'Faster. Good. Keep up.',
      plain: [
        'Letters are all bad news lately. Nice to deliver something good: you.',
        "The road's shorter when you know the wind.",
      ],
      warm: "If I ever retire, you're taking my route. No arguments!",
    },
    failedLesson: {
      cold: 'Blown off course. Typical.',
      plain: [
        "Gusts got you. I'll be on the cliff path.",
        "Wind'll still be there tomorrow. So will I, probably.",
      ],
      warm: "Ha! I've crashed worse. Catch me on the road and we'll go again!",
    },
    roadBack:
      "Every village sent a letter, and they all say the same thing: 'Is the hero back?' Yes. Yes, they are.",
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
