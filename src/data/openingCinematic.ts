/**
 * The opening as illustrated scenes: the patrol, Rowan's house and the return to the hill.
 * Staging follows docs/story-plans/cinematics/OPENING_SHOTS.md; the words are the author's, from
 * docs/story-plans/samples/OPENING_SAMPLE.md (a test keeps them identical). The stage is 320 x 180
 * pixels and an actor's x and y are where their feet touch the ground.
 */
import { steady, type CinematicShot } from '../game/cinematic';

export const OPENING_CINEMATIC: readonly CinematicShot[] = [
  {
    id: 'patrol-path',
    setting: 'hill',
    text: 'The night patrol ended at the stones. It always had. You followed the path north through the birches until, as you crested a barren hill, the glow could be seen.',
    durationMs: 3500,
    actors: [
      {
        sprite: 'char.026',
        keys: [
          { at: 0, x: 160, y: 200, facing: 'up', walking: true },
          { at: 2800, x: 160, y: 112, facing: 'up' },
        ],
      },
    ],
    stones: [steady(1), steady(1), steady(1), steady(1), steady(1), steady(1), steady(1)],
    darkness: steady(0.68),
    fade: [
      { at: 0, value: 1 },
      { at: 800, value: 0 },
    ],
  },
  {
    id: 'the-stones',
    setting: 'hill',
    text: 'There he stood, as countless others from Mossvale had stood before, basking in the light of the stones. In all the years of the watch, the stones had never changed, infused with ancient and powerful magic. Illuminating the night with their soft rainbow of colors.',
    durationMs: 3000,
    actors: [{ sprite: 'char.026', keys: [{ at: 0, x: 160, y: 112, facing: 'up' }] }],
    stones: [steady(1), steady(1), steady(1), steady(1), steady(1), steady(1), steady(1)],
    darkness: steady(0.68),
  },
  {
    id: 'turns-to-go',
    setting: 'hill',
    text: 'Fern sighed and waited a moment longer, as he had every night since his father died.\n\n"Well, that\'s enough of that. I\'m sure Rowan will have some training he wants me to do before the end of my shift..."',
    durationMs: 3500,
    actors: [
      {
        sprite: 'char.026',
        keys: [
          { at: 0, x: 160, y: 112, facing: 'up' },
          { at: 1800, x: 160, y: 112, facing: 'down' },
        ],
      },
    ],
    stones: [steady(1), steady(1), steady(1), steady(1), steady(1), steady(1), steady(1)],
    darkness: steady(0.68),
  },
  {
    id: 'the-flicker',
    setting: 'hill',
    text: 'He turned to go, and the stones seemed to dim. He turned back, and all seven were burning steadily, as if nothing had happened.\n\nFern stood very still.',
    durationMs: 3500,
    actors: [
      {
        sprite: 'char.026',
        keys: [
          { at: 0, x: 160, y: 112, facing: 'down' },
          { at: 1100, x: 160, y: 112, facing: 'up' },
        ],
      },
    ],
    stones: [
      [
        { at: 0, value: 1 },
        { at: 600, value: 1 },
        { at: 680, value: 0.25 },
        { at: 900, value: 1 },
      ],
      [
        { at: 0, value: 1 },
        { at: 600, value: 1 },
        { at: 680, value: 0.25 },
        { at: 900, value: 1 },
      ],
      [
        { at: 0, value: 1 },
        { at: 600, value: 1 },
        { at: 680, value: 0.25 },
        { at: 900, value: 1 },
      ],
      [
        { at: 0, value: 1 },
        { at: 600, value: 1 },
        { at: 680, value: 0.25 },
        { at: 900, value: 1 },
      ],
      [
        { at: 0, value: 1 },
        { at: 600, value: 1 },
        { at: 680, value: 0.25 },
        { at: 900, value: 1 },
      ],
      [
        { at: 0, value: 1 },
        { at: 600, value: 1 },
        { at: 680, value: 0.25 },
        { at: 900, value: 1 },
      ],
      [
        { at: 0, value: 1 },
        { at: 600, value: 1 },
        { at: 680, value: 0.25 },
        { at: 900, value: 1 },
      ],
    ],
    darkness: steady(0.68),
  },
  {
    id: 'head-shake',
    setting: 'hill',
    text: 'He had been awake since dusk. He had walked six miles in the dark. The hour had long passed when a hedge looks like a man and a man looks like a hedge. He watched the stones until his eyes watered. They glowed, unchanging, exactly as they had every night of his life.\n\n"You\'re tired," he muttered, shaking his head. "You\'re seeing things."',
    durationMs: 3500,
    actors: [
      {
        sprite: 'char.026',
        keys: [
          { at: 0, x: 160, y: 112, facing: 'up' },
          { at: 1400, x: 160, y: 112, facing: 'left' },
          { at: 1700, x: 160, y: 112, facing: 'right' },
          { at: 2000, x: 160, y: 112, facing: 'left' },
          { at: 2300, x: 160, y: 112, facing: 'up' },
        ],
      },
    ],
    stones: [steady(1), steady(1), steady(1), steady(1), steady(1), steady(1), steady(1)],
    darkness: steady(0.68),
  },
  {
    id: 'walks-away',
    setting: 'hill',
    text: 'He turned away again.\n\nHe felt it on the back of his neck before he saw it. His shadow on the path ahead of him went thin and grey.',
    durationMs: 3000,
    actors: [
      {
        sprite: 'char.026',
        keys: [
          { at: 0, x: 160, y: 112, facing: 'down', walking: true },
          { at: 2400, x: 160, y: 150, facing: 'down' },
        ],
      },
    ],
    stones: [steady(1), steady(1), steady(1), steady(1), steady(1), steady(1), steady(1)],
    darkness: steady(0.68),
  },
  {
    id: 'stones-go-out',
    setting: 'hill',
    text: 'The violet stone was out! The other six slowly followed: blue, then cyan, green and then gold, orange, and finally red, until the hill was awash in darkness.',
    durationMs: 5600,
    actors: [
      {
        sprite: 'char.026',
        keys: [
          { at: 0, x: 160, y: 150, facing: 'down' },
          { at: 200, x: 160, y: 150, facing: 'up' },
        ],
      },
    ],
    stones: [
      [
        { at: 0, value: 1 },
        { at: 400, value: 1 },
        { at: 900, value: 0 },
      ],
      [
        { at: 0, value: 1 },
        { at: 1200, value: 1 },
        { at: 1700, value: 0 },
      ],
      [
        { at: 0, value: 1 },
        { at: 2000, value: 1 },
        { at: 2500, value: 0 },
      ],
      [
        { at: 0, value: 1 },
        { at: 2800, value: 1 },
        { at: 3300, value: 0 },
      ],
      [
        { at: 0, value: 1 },
        { at: 3600, value: 1 },
        { at: 4100, value: 0 },
      ],
      [
        { at: 0, value: 1 },
        { at: 4400, value: 1 },
        { at: 4900, value: 0 },
      ],
      steady(1),
    ],
    darkness: [
      { at: 0, value: 0.68 },
      { at: 900, value: 0.72 },
      { at: 1700, value: 0.76 },
      { at: 2500, value: 0.8 },
      { at: 3300, value: 0.84 },
      { at: 4100, value: 0.88 },
      { at: 4900, value: 0.92 },
    ],
  },
  {
    id: 'fern-runs',
    setting: 'hill',
    text: 'Fern ran.',
    durationMs: 2400,
    actors: [
      {
        sprite: 'char.026',
        keys: [
          { at: 0, x: 160, y: 150, facing: 'up' },
          { at: 100, x: 160, y: 150, facing: 'down', walking: true },
          { at: 700, x: 160, y: 200, facing: 'down' },
        ],
      },
    ],
    stones: [
      steady(0),
      steady(0),
      steady(0),
      steady(0),
      steady(0),
      steady(0),
      [
        { at: 0, value: 1 },
        { at: 1500, value: 0 },
      ],
    ],
    darkness: [
      { at: 0, value: 0.92 },
      { at: 1500, value: 0.97 },
    ],
    fade: [
      { at: 0, value: 0 },
      { at: 1200, value: 0 },
      { at: 2200, value: 1 },
    ],
  },
  {
    id: 'rowan-wakes',
    setting: 'house',
    text: "Rowan yawned as he put on his captain's coat. Thirty-five years he had been part of the watch, with the last ten as captain. A role he took over because Bracken, Fern's father, never returned.",
    durationMs: 3000,
    actors: [{ sprite: 'story.rowanCoat', keys: [{ at: 0, x: 120, y: 128, facing: 'down' }] }],
    darkness: steady(0.62),
    fade: [
      { at: 0, value: 1 },
      { at: 800, value: 0 },
    ],
    door: steady(0),
  },
  {
    id: 'the-memory',
    setting: 'memory',
    text: 'The two had grown up together, and were lifelong friends. Rowan had been elated when Bracken announced he would become a father. He still remembered the night...',
    durationMs: 4000,
    actors: [
      {
        sprite: 'story.rowanYoung',
        keys: [
          { at: 0, x: 140, y: 120, facing: 'down' },
          { at: 2000, x: 140, y: 120, facing: 'right' },
        ],
      },
      {
        sprite: 'story.bracken',
        keys: [
          { at: 0, x: 180, y: 120, facing: 'down' },
          { at: 2000, x: 180, y: 120, facing: 'left' },
        ],
      },
    ],
    darkness: steady(0),
  },
  {
    id: 'pounding',
    setting: 'house',
    text: "Pounding at the door, and Fern's voice shouting, interrupted Rowan's musings.\n\n\"I wonder what it is this time... He's so desperate for excitement he's probably mistaken a bat for a dragon again...\"",
    durationMs: 3000,
    actors: [
      {
        sprite: 'story.rowanCoat',
        keys: [
          { at: 0, x: 120, y: 128, facing: 'down' },
          { at: 300, x: 120, y: 128, facing: 'right' },
        ],
      },
    ],
    darkness: steady(0.62),
    door: steady(0),
    doorShake: [
      { at: 0, value: 0 },
      { at: 200, value: 3 },
      { at: 1600, value: 3 },
      { at: 1800, value: 0 },
    ],
  },
  {
    id: 'door-opens',
    setting: 'house',
    text: '"Was it a little dragon again, or just a big bat", Rowan asks as he opens the door.',
    durationMs: 3000,
    actors: [
      {
        sprite: 'story.rowanCoat',
        keys: [
          { at: 0, x: 120, y: 128, facing: 'right', walking: true },
          { at: 1300, x: 240, y: 112, facing: 'up' },
        ],
      },
    ],
    darkness: steady(0.62),
    door: [
      { at: 0, value: 0 },
      { at: 1500, value: 0 },
      { at: 1700, value: 1 },
    ],
  },
  {
    id: 'fern-bursts-in',
    setting: 'house',
    text: 'Fern stumbles in shouting, "Rowan! The stones... they... I was at the top of the hill and they..."\n\n"The stones?"\n\n"Yes, they stopped glowing!!!"',
    durationMs: 3500,
    actors: [
      {
        sprite: 'story.rowanCoat',
        keys: [
          { at: 0, x: 240, y: 112, facing: 'left', walking: true },
          { at: 500, x: 204, y: 120, facing: 'right' },
        ],
      },
      {
        sprite: 'story.fernMuddy',
        keys: [
          { at: 0, x: 256, y: 92, facing: 'down', walking: true },
          { at: 700, x: 250, y: 128, facing: 'left' },
        ],
      },
    ],
    darkness: steady(0.62),
    door: steady(1),
  },
  {
    id: 'by-the-chair',
    setting: 'house',
    text: 'Rowan hesitates, the lad\'s face is white, his chest heaving, and there was mud all down one side of him.\n\n"Sit," Rowan said. "Breathe. Start from the beginning."\n\nFern dropped into the chair by the fire. He took a breath, then another.',
    durationMs: 3500,
    actors: [
      {
        sprite: 'story.rowanCoat',
        keys: [
          { at: 0, x: 204, y: 120, facing: 'left', walking: true },
          { at: 900, x: 160, y: 124, facing: 'left' },
        ],
      },
      {
        sprite: 'story.fernMuddy',
        keys: [
          { at: 0, x: 250, y: 128, facing: 'left', walking: true },
          { at: 600, x: 196, y: 146, facing: 'left', walking: true },
          { at: 1200, x: 118, y: 126, facing: 'right' },
        ],
      },
    ],
    darkness: steady(0.62),
    door: steady(1),
  },
  {
    id: 'the-report',
    setting: 'house',
    text: '"I was finishing the patrol and had stopped at the top of the hill, like I always do, and..." He shook his head. "When I turned to leave, I swear they dimmed, just for a split second. When I turned back... I thought I was going crazy."\n\n"Dimmed? The stones never dim."\n\n"I figured I was tired, it was a long day."\n\nRowan waited.',
    durationMs: 5000,
    actors: [
      { sprite: 'story.rowanCoat', keys: [{ at: 0, x: 160, y: 124, facing: 'left' }] },
      { sprite: 'story.fernMuddy', keys: [{ at: 0, x: 118, y: 126, facing: 'right' }] },
    ],
    darkness: steady(0.62),
    door: steady(1),
  },
  {
    id: 'the-report-ends',
    setting: 'house',
    text: '"I waited a few more minutes and left. As I walked away, my shadow started fading on the path in front of me. I spun around and the violet stone was out! Then they all started fading, blue, cyan, green, gold, orange, and just before red went out I ran."\n\n"All of them?"\n\n"It was pitch black as I reached the birches."\n\n"Are they still out?"\n\n"I didn\'t stay to find out."',
    durationMs: 5000,
    actors: [
      { sprite: 'story.rowanCoat', keys: [{ at: 0, x: 160, y: 124, facing: 'left' }] },
      { sprite: 'story.fernMuddy', keys: [{ at: 0, x: 118, y: 126, facing: 'right' }] },
    ],
    darkness: steady(0.62),
    door: steady(1),
  },
  {
    id: 'lantern',
    setting: 'house',
    text: '"Then we\'ll go and see."\n\nRowan grabbed the lantern from the hook by the door. Fern opened his mouth to argue, then closed it and followed him out.',
    durationMs: 3500,
    actors: [
      {
        sprite: 'story.rowanLantern',
        keys: [
          { at: 0, x: 160, y: 124, facing: 'right', walking: true },
          { at: 1500, x: 256, y: 92, facing: 'up' },
        ],
        lantern: true,
      },
      {
        sprite: 'story.fernMuddy',
        keys: [
          { at: 0, x: 118, y: 126, facing: 'right' },
          { at: 600, x: 118, y: 126, facing: 'right', walking: true },
          { at: 2400, x: 256, y: 92, facing: 'up' },
        ],
      },
    ],
    darkness: steady(0.62),
    fade: [
      { at: 0, value: 0 },
      { at: 2600, value: 0 },
      { at: 3400, value: 1 },
    ],
    door: steady(1),
  },
  {
    id: 'back-up-the-hill',
    setting: 'hill',
    text: 'Rowan was stern and silent. Fern kept glancing nervously at him, desperate for Rowan to believe him.',
    durationMs: 3600,
    actors: [
      {
        sprite: 'story.rowanLantern',
        keys: [
          { at: 0, x: 160, y: 200, facing: 'up', walking: true },
          { at: 3000, x: 160, y: 140, facing: 'up' },
        ],
        lantern: true,
      },
      {
        sprite: 'story.fernMuddy',
        keys: [
          { at: 0, x: 146, y: 224, facing: 'up', walking: true },
          { at: 1200, x: 146, y: 200, facing: 'left', walking: true },
          { at: 1500, x: 146, y: 194, facing: 'up', walking: true },
          { at: 2200, x: 146, y: 180, facing: 'left', walking: true },
          { at: 2500, x: 146, y: 174, facing: 'up', walking: true },
          { at: 3000, x: 146, y: 164, facing: 'up' },
        ],
      },
    ],
    stones: [steady(1), steady(1), steady(1), steady(1), steady(1), steady(1), steady(1)],
    darkness: steady(0.72),
    fade: [
      { at: 0, value: 1 },
      { at: 600, value: 0 },
    ],
  },
  {
    id: 'the-crest',
    setting: 'hill',
    text: 'As they crested the barren hill, Fern stopped dead.\n\nAll seven stones glowed brightly.',
    durationMs: 3000,
    actors: [
      {
        sprite: 'story.rowanLantern',
        keys: [
          { at: 0, x: 160, y: 140, facing: 'up', walking: true },
          { at: 1000, x: 176, y: 112, facing: 'up' },
        ],
        lantern: true,
      },
      {
        sprite: 'story.fernMuddy',
        keys: [
          { at: 0, x: 146, y: 164, facing: 'up', walking: true },
          { at: 1000, x: 144, y: 114, facing: 'up' },
        ],
      },
    ],
    stones: [steady(1), steady(1), steady(1), steady(1), steady(1), steady(1), steady(1)],
    darkness: steady(0.72),
  },
  {
    id: 'i-believe-you',
    setting: 'hill',
    text: '"No... no, no, no. They were out, Rowan! I swear they were out!"\n\n"I know."\n\nFern blinked. "You... you believe me?"\n\n"Lad, I\'ve known you since the day you were born, I know you. And your tells. You were pale as the grave, I don\'t know what happened or why, but I do believe you."\n\nThey stood there together for a long while, watching the stones glow.',
    durationMs: 5000,
    actors: [
      {
        sprite: 'story.rowanLantern',
        keys: [{ at: 0, x: 176, y: 112, facing: 'up' }],
        lantern: true,
      },
      {
        sprite: 'story.fernMuddy',
        keys: [
          { at: 0, x: 144, y: 114, facing: 'up' },
          { at: 300, x: 144, y: 114, facing: 'right' },
          { at: 4200, x: 144, y: 114, facing: 'up' },
        ],
      },
    ],
    stones: [steady(1), steady(1), steady(1), steady(1), steady(1), steady(1), steady(1)],
    darkness: steady(0.72),
  },
  {
    id: 'learn-magic',
    setting: 'hill',
    text: '"If they go out again..." Rowan said quietly. "Whatever is doing this, a sword won\'t stop it. Neither will a watch that only knows how to carry one."\n\n"So what do we do?"\n\nRowan turned to him. "You\'re going to learn magic."\n\n"Me? Magic?" A grin spread across Fern\'s face before he could stop it. "Real magic?"\n\n"Real magic. There are teachers out there, scattered across the land. You\'ll find them, and you\'ll learn whatever they can teach you."\n\n"Why not you? You\'re the captain."',
    durationMs: 5000,
    actors: [
      {
        sprite: 'story.rowanLantern',
        keys: [
          { at: 0, x: 176, y: 112, facing: 'up' },
          { at: 400, x: 176, y: 112, facing: 'left' },
        ],
        lantern: true,
      },
      {
        sprite: 'story.fernMuddy',
        keys: [
          { at: 0, x: 144, y: 114, facing: 'up' },
          { at: 200, x: 144, y: 114, facing: 'right' },
        ],
      },
    ],
    stones: [steady(1), steady(1), steady(1), steady(1), steady(1), steady(1), steady(1)],
    darkness: steady(0.72),
  },
  {
    id: 'someone-has-to-stay',
    setting: 'hill',
    text: '"Because..." Rowan looked back toward Mossvale. "...someone has to stay."\n\nFern paled slightly, realizing he would be leaving his home.',
    durationMs: 3500,
    actors: [
      {
        sprite: 'story.rowanLantern',
        keys: [
          { at: 0, x: 176, y: 112, facing: 'left' },
          { at: 500, x: 176, y: 112, facing: 'down' },
        ],
        lantern: true,
      },
      { sprite: 'story.fernMuddy', keys: [{ at: 0, x: 144, y: 114, facing: 'right' }] },
    ],
    stones: [steady(1), steady(1), steady(1), steady(1), steady(1), steady(1), steady(1)],
    darkness: steady(0.72),
  },
  {
    id: 'or-large-bats',
    setting: 'hill',
    text: '"And no," Rowan added, starting back down the path, "you can\'t use it on dragons."\n\nFern\'s eyes went wide at the idea of fighting a dragon.\n\n"Or large bats," Rowan said, chuckling.',
    durationMs: 4000,
    actors: [
      {
        sprite: 'story.rowanLantern',
        keys: [
          { at: 0, x: 176, y: 112, facing: 'down', walking: true },
          { at: 2600, x: 170, y: 200, facing: 'down' },
        ],
        lantern: true,
      },
      {
        sprite: 'story.fernMuddy',
        keys: [
          { at: 0, x: 144, y: 114, facing: 'right' },
          { at: 1200, x: 144, y: 114, facing: 'down' },
          { at: 1400, x: 144, y: 114, facing: 'down', walking: true },
          { at: 3400, x: 150, y: 200, facing: 'down' },
        ],
      },
    ],
    stones: [steady(1), steady(1), steady(1), steady(1), steady(1), steady(1), steady(1)],
    darkness: steady(0.72),
    fade: [
      { at: 0, value: 0 },
      { at: 2800, value: 0 },
      { at: 4000, value: 1 },
    ],
  },
];
