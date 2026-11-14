/**
 * Fern's illustrated opening, through the dawn handoff. Visible words match
 * docs/story-plans/samples/OPENING_SAMPLE.md. Descriptions are accessible staging,
 * not duplicate page narration. Actors use 320 x 180 staging coordinates within
 * the wider 480 x 270 canvas; x/y mark their feet.
 */
import type { CinematicShot } from '../game/cinematic';

export const OPENING_CINEMATIC: readonly CinematicShot[] = [
  {
    id: 'patrol-path',
    setting: 'hill',
    text: 'The night patrol ended at the stones.',
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
    stones: [
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
    ],
    darkness: [{ at: 0, value: 0.68 }],
    fade: [
      { at: 0, value: 1 },
      { at: 800, value: 0 },
    ],
    description: 'At night, Fern walks up the birch path toward seven glowing standing stones.',
  },
  {
    id: 'the-stones',
    setting: 'hill',
    text: 'Bracken had walked this patrol, too. Ten years after his death, Fern still paused here.',
    durationMs: 3000,
    actors: [{ sprite: 'char.026', keys: [{ at: 0, x: 160, y: 112, facing: 'up' }] }],
    stones: [
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
    ],
    darkness: [{ at: 0, value: 0.68 }],
    dialogue: [{ speaker: 'Fern', text: "Seven lit. All's well." }],
    description: 'Fern pauses at the crest, facing the seven steady lights.',
  },
  {
    id: 'turns-to-go',
    setting: 'hill',
    text: '',
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
    stones: [
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
    ],
    darkness: [{ at: 0, value: 0.68 }],
    dialogue: [
      { speaker: 'Fern', text: 'Rowan will have more training for me if I stay here all night.' },
    ],
    description: 'Fern turns back toward Mossvale.',
  },
  {
    id: 'the-flicker',
    setting: 'hill',
    text: '',
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
    darkness: [{ at: 0, value: 0.68 }],
    description: 'All seven lights dip briefly. Fern turns back; the stones are steady again.',
  },
  {
    id: 'head-shake',
    setting: 'hill',
    text: '',
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
    stones: [
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
    ],
    darkness: [{ at: 0, value: 0.68 }],
    dialogue: [{ speaker: 'Fern', text: "You're tired. You're seeing things." }],
    description: 'Fern looks to either side, then back at the stones.',
  },
  {
    id: 'walks-away',
    setting: 'hill',
    text: '',
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
    stones: [
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
    ],
    darkness: [{ at: 0, value: 0.68 }],
    description: 'Fern starts down the path.',
  },
  {
    id: 'stones-go-out',
    setting: 'hill',
    text: '',
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
      [{ at: 0, value: 1 }],
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
    description:
      'Violet goes dark, followed by blue, cyan, green, gold and orange. The hill darkens. Red still glows.',
  },
  {
    id: 'fern-runs',
    setting: 'hill',
    text: '',
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
      [{ at: 0, value: 0 }],
      [{ at: 0, value: 0 }],
      [{ at: 0, value: 0 }],
      [{ at: 0, value: 0 }],
      [{ at: 0, value: 0 }],
      [{ at: 0, value: 0 }],
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
    description: 'As red fades, Fern runs down the path. The scene fades to black.',
  },
  {
    id: 'rowan-wakes',
    setting: 'house',
    text: '',
    durationMs: 3000,
    actors: [{ sprite: 'story.rowanCoat', keys: [{ at: 0, x: 120, y: 128, facing: 'down' }] }],
    darkness: [{ at: 0, value: 0.62 }],
    fade: [
      { at: 0, value: 1 },
      { at: 800, value: 0 },
    ],
    door: [{ at: 0, value: 0 }],
    description: "In Rowan's cottage, the captain turns from the fire toward his door.",
  },
  {
    id: 'pounding',
    setting: 'house',
    text: '',
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
    darkness: [{ at: 0, value: 0.62 }],
    door: [{ at: 0, value: 0 }],
    doorShake: [
      { at: 0, value: 0 },
      { at: 200, value: 3 },
      { at: 1600, value: 3 },
      { at: 1800, value: 0 },
    ],
    dialogue: [{ speaker: 'Fern', text: 'Rowan!' }],
    description: 'The cottage door shakes. Fern calls from outside.',
  },
  {
    id: 'door-opens',
    setting: 'house',
    text: '',
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
    darkness: [{ at: 0, value: 0.62 }],
    door: [
      { at: 0, value: 0 },
      { at: 1500, value: 0 },
      { at: 1700, value: 1 },
    ],
    dialogue: [{ speaker: 'Rowan', text: 'A little dragon this time, or a big bat?' }],
    description: 'Rowan crosses to the door and opens it.',
  },
  {
    id: 'fern-bursts-in',
    setting: 'house',
    text: '',
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
    darkness: [{ at: 0, value: 0.62 }],
    door: [{ at: 0, value: 1 }],
    dialogue: [{ speaker: 'Fern', text: 'The stones. They went out.' }],
    description: 'Fern rushes in, pale and muddy. Rowan steps aside.',
  },
  {
    id: 'by-the-chair',
    setting: 'house',
    text: '',
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
          { at: 1200, x: 106, y: 128, facing: 'left' },
          { at: 1300, x: 104, y: 117, facing: 'right', sprite: 'story.fernSitting' },
        ],
      },
    ],
    darkness: [{ at: 0, value: 0.62 }],
    door: [{ at: 0, value: 1 }],
    dialogue: [{ speaker: 'Rowan', text: 'Sit. Breathe. Start from the beginning.' }],
    description: 'Rowan leads Fern to the fire. Fern sits and catches his breath.',
  },
  {
    id: 'the-report',
    setting: 'house',
    text: '',
    durationMs: 5000,
    actors: [
      { sprite: 'story.rowanCoat', keys: [{ at: 0, x: 160, y: 124, facing: 'left' }] },
      {
        sprite: 'story.fernMuddy',
        keys: [{ at: 0, x: 104, y: 117, facing: 'right', sprite: 'story.fernSitting' }],
      },
    ],
    darkness: [{ at: 0, value: 0.62 }],
    door: [{ at: 0, value: 1 }],
    dialogue: [
      {
        speaker: 'Fern',
        text: 'They flickered. I thought I was tired. Then they started going out, one after another.',
      },
    ],
    description: 'Fern reports from the chair; Rowan stays beside him and listens.',
  },
  {
    id: 'the-report-ends',
    setting: 'house',
    text: '',
    durationMs: 5000,
    actors: [
      { sprite: 'story.rowanCoat', keys: [{ at: 0, x: 160, y: 124, facing: 'left' }] },
      {
        sprite: 'story.fernMuddy',
        keys: [{ at: 0, x: 104, y: 117, facing: 'right', sprite: 'story.fernSitting' }],
      },
    ],
    darkness: [{ at: 0, value: 0.62 }],
    door: [{ at: 0, value: 1 }],
    dialogue: [
      { speaker: 'Rowan', text: 'All seven?' },
      { speaker: 'Fern', text: 'I ran when the red one started to fade.' },
    ],
    description: 'Rowan asks about the last stone. Fern looks up at him.',
  },
  {
    id: 'are-they-still-out',
    setting: 'house',
    text: '',
    durationMs: 2800,
    actors: [
      { sprite: 'story.rowanCoat', keys: [{ at: 0, x: 160, y: 124, facing: 'left' }] },
      {
        sprite: 'story.fernMuddy',
        keys: [{ at: 0, x: 104, y: 117, facing: 'right', sprite: 'story.fernSitting' }],
      },
    ],
    darkness: [{ at: 0, value: 0.62 }],
    door: [{ at: 0, value: 1 }],
    dialogue: [
      { speaker: 'Rowan', text: 'Are they still out?' },
      { speaker: 'Fern', text: "I didn't stay to find out." },
    ],
    description: 'Rowan waits for Fern to answer before taking his lantern.',
  },
  {
    id: 'lantern',
    setting: 'house',
    text: '',
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
          { at: 0, x: 104, y: 117, facing: 'right', sprite: 'story.fernSitting' },
          { at: 600, x: 108, y: 126, facing: 'right', walking: true, sprite: 'story.fernMuddy' },
          { at: 2400, x: 256, y: 92, facing: 'up' },
        ],
      },
    ],
    darkness: [{ at: 0, value: 0.62 }],
    fade: [
      { at: 0, value: 0 },
      { at: 2600, value: 0 },
      { at: 3400, value: 1 },
    ],
    door: [{ at: 0, value: 1 }],
    dialogue: [{ speaker: 'Rowan', text: "Then we'll go and see." }],
    description: 'Rowan takes his lantern. Fern stands and follows him outside.',
  },
  {
    id: 'back-up-the-hill',
    setting: 'hill',
    text: '',
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
          { at: 1200, x: 146, y: 200, facing: 'right', walking: true },
          { at: 1500, x: 146, y: 194, facing: 'up', walking: true },
          { at: 2200, x: 146, y: 180, facing: 'right', walking: true },
          { at: 2500, x: 146, y: 174, facing: 'up', walking: true },
          { at: 3000, x: 146, y: 164, facing: 'up' },
        ],
      },
    ],
    stones: [
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
    ],
    darkness: [{ at: 0, value: 0.72 }],
    fade: [
      { at: 0, value: 1 },
      { at: 600, value: 0 },
    ],
    description: 'Rowan leads up the path. Fern glances right toward him, waiting for a response.',
  },
  {
    id: 'the-crest',
    setting: 'hill',
    text: '',
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
    stones: [
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
    ],
    darkness: [{ at: 0, value: 0.72 }],
    dialogue: [{ speaker: 'Fern', text: 'They were out. I swear they were.' }],
    description: 'They reach the hilltop together. All seven stones are glowing.',
  },
  {
    id: 'i-believe-you',
    setting: 'hill',
    text: '',
    durationMs: 2200,
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
          { at: 300, x: 144, y: 114, facing: 'right' },
          { at: 1800, x: 144, y: 114, facing: 'up' },
        ],
      },
    ],
    stones: [
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
    ],
    darkness: [{ at: 0, value: 0.72 }],
    dialogue: [{ speaker: 'Rowan', text: 'I believe you, lad.' }],
    description: 'Fern turns to Rowan. Rowan turns toward Fern instead of looking away.',
  },
  {
    id: 'learn-magic',
    setting: 'hill',
    text: '',
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
    stones: [
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
    ],
    darkness: [{ at: 0, value: 0.72 }],
    dialogue: [
      {
        speaker: 'Rowan',
        text: "A sword won't help us if the stones fail. You're going to learn magic.",
      },
      { speaker: 'Fern', text: 'Me? Real magic?' },
    ],
    description: 'Rowan faces Fern, who turns toward him.',
  },
  {
    id: 'someone-has-to-stay',
    setting: 'hill',
    text: '',
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
    stones: [
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
    ],
    darkness: [{ at: 0, value: 0.72 }],
    dialogue: [
      { speaker: 'Rowan', text: 'Real magic.' },
      { speaker: 'Fern', text: "Why not you? You're the captain." },
      { speaker: 'Rowan', text: 'Someone has to stay.' },
    ],
    description: 'Rowan looks down the path toward Mossvale. Fern stays beside him.',
  },
  {
    id: 'or-large-bats',
    setting: 'hill',
    text: '',
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
    stones: [
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
    ],
    darkness: [{ at: 0, value: 0.72 }],
    fade: [
      { at: 0, value: 0 },
      { at: 2800, value: 0 },
      { at: 4000, value: 1 },
    ],
    dialogue: [
      { speaker: 'Rowan', text: 'And no using it on dragons.' },
      { speaker: 'Fern', text: 'Dragons?' },
      { speaker: 'Rowan', text: 'Or large bats.' },
    ],
    description: 'Rowan heads down the path. Fern hesitates, then follows.',
  },
  {
    id: 'the-morning-after',
    setting: 'house',
    text: 'By morning, nobody else had seen the stones go out.',
    description: 'Daylight fills the cottage. Fern and Rowan speak alone by the hearth.',
    dialogue: [
      {
        speaker: 'Rowan',
        text: "Usual patrols. From dusk to dawn, someone stays at the stones. Watch and report. I'll take tonight.",
      },
    ],
    durationMs: 3200,
    actors: [
      { sprite: 'char.026', keys: [{ at: 0, x: 104, y: 128, facing: 'right' }] },
      { sprite: 'story.rowanCoat', keys: [{ at: 0, x: 160, y: 124, facing: 'left' }] },
    ],
    darkness: [{ at: 0, value: 0.12 }],
    door: [{ at: 0, value: 0 }],
  },
  {
    id: 'keep-it-between-us',
    setting: 'house',
    text: '',
    description: 'Rowan faces Fern. There is no one else in the cottage.',
    dialogue: [
      { speaker: 'Rowan', text: 'What you saw stays between us for now.' },
      { speaker: 'Fern', text: 'What do I tell the teachers?' },
      { speaker: 'Rowan', text: 'Tell them exactly what happened.' },
    ],
    durationMs: 3000,
    actors: [
      { sprite: 'char.026', keys: [{ at: 0, x: 104, y: 128, facing: 'right' }] },
      { sprite: 'story.rowanCoat', keys: [{ at: 0, x: 160, y: 124, facing: 'left' }] },
    ],
    darkness: [{ at: 0, value: 0.12 }],
  },
  {
    id: 'the-rune-stone',
    setting: 'house',
    text: '',
    description: 'Rowan passes a small, unlit rune stone to Fern. Fern keeps it.',
    dialogue: [{ speaker: 'Rowan', text: 'I found this when I dug the well. Keep it safe.' }],
    durationMs: 3500,
    actors: [
      { sprite: 'char.026', keys: [{ at: 0, x: 104, y: 128, facing: 'right' }] },
      { sprite: 'story.rowanCoat', keys: [{ at: 0, x: 160, y: 124, facing: 'left' }] },
    ],
    darkness: [{ at: 0, value: 0.12 }],
    runeStone: {
      x: [
        { at: 0, value: 148 },
        { at: 1000, value: 148 },
        { at: 2100, value: 116 },
      ],
      y: [
        { at: 0, value: 111 },
        { at: 2100, value: 111 },
      ],
    },
  },
  {
    id: 'a-teacher-to-start-with',
    setting: 'house',
    text: '',
    description:
      'Rowan names a teacher. Fern listens; the route is a recommendation, not a compulsory lesson.',
    dialogue: [
      {
        speaker: 'Rowan',
        text: 'Try Kestrel at Windward Cliffs. She takes beginners. Wind would suit a scout.',
      },
    ],
    durationMs: 3000,
    actors: [
      { sprite: 'char.026', keys: [{ at: 0, x: 104, y: 128, facing: 'right' }] },
      { sprite: 'story.rowanCoat', keys: [{ at: 0, x: 160, y: 124, facing: 'left' }] },
    ],
    darkness: [{ at: 0, value: 0.12 }],
  },
  {
    id: 'rowans-watch',
    setting: 'hill',
    text: 'That night, Rowan took the watch himself.',
    description: 'Rowan keeps watch alone beside seven steady stones, from dusk toward dawn.',
    durationMs: 4000,
    actors: [
      {
        sprite: 'story.rowanLantern',
        keys: [{ at: 0, x: 160, y: 140, facing: 'up' }],
        lantern: true,
      },
    ],
    darkness: [
      { at: 0, value: 0.72 },
      { at: 3000, value: 0.72 },
      { at: 4000, value: 0.22 },
    ],
    stones: [
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
      [{ at: 0, value: 1 }],
    ],
    fade: [
      { at: 0, value: 1 },
      { at: 600, value: 0 },
    ],
  },
  {
    id: 'dawn-on-the-north-road',
    setting: 'road',
    text: 'At dawn, Rowan alone saw Fern off. Mossvale was quiet behind them.',
    description:
      'Fern and Rowan stand at the fork: the north road continues ahead, the path to the stones branches right.',
    dialogue: [
      {
        speaker: 'Rowan',
        text: 'All seven held steady. North for Windward. Keep that stone close.',
      },
    ],
    durationMs: 3000,
    actors: [
      { sprite: 'char.026', keys: [{ at: 0, x: 160, y: 140, facing: 'left' }] },
      { sprite: 'story.rowanCoat', keys: [{ at: 0, x: 128, y: 144, facing: 'right' }] },
    ],
    darkness: [{ at: 0, value: 0.1 }],
  },
  {
    id: 'beyond-the-patrol',
    setting: 'road',
    text: 'The path to the stones turned away. Fern kept going. He had never walked beyond the patrol before.',
    description:
      'Fern turns north and takes a few steps past the fork. Rowan stays behind. The player takes control here.',
    durationMs: 2200,
    actors: [
      {
        sprite: 'char.026',
        keys: [
          { at: 0, x: 160, y: 140, facing: 'up', walking: true },
          { at: 1600, x: 160, y: 110, facing: 'up' },
        ],
      },
      { sprite: 'story.rowanCoat', keys: [{ at: 0, x: 128, y: 144, facing: 'right' }] },
    ],
    darkness: [{ at: 0, value: 0.1 }],
  },
];
