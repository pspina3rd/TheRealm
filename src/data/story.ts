/**
 * The story's own text and beats, imported from the author's script
 * (docs/STORY.md): Vesper's lines and route, the Moon Wyrm's visions and
 * its lair words. See "Story" in docs/GAME_DESIGN.md.
 */
import type { NpcLines, Variants } from './types';
import type { Location } from '../world/map';

/** A vision of the Moon Wyrm, shown once as an interlude (see `src/game/story.ts`). */
export interface VisionDef {
  readonly id: string;
  /** Set once it has been seen. */
  readonly flag: string;
  /** Shown on the first warp out of this map... */
  readonly leaves?: string;
  /** ...or on the first warp into this one. */
  readonly enters?: string;
  readonly lines: Variants;
}

export const VISIONS: readonly VisionDef[] = [
  {
    id: 'vision1',
    flag: 'vision:1',
    leaves: 'mossvale',
    lines: [
      '*A heavy sky turns pitch black in your mind.* "You clear spores and patch wells, little creature. Do you truly think you can mend a world that is falling asleep?"',
      '*A low frequency hum vibrates in your bones.* "Every breath you take on the surface draws air from my cavern. Come down and claim it back."',
    ],
  },
  {
    id: 'vision2',
    flag: 'vision:2',
    enters: 'quarry',
    lines: [
      '*The cavern rock groans beneath your boots.* "Dig deeper, break the stone. Every rock you shift brings your heart closer to my coil."',
      '*A glowing blue eye reflects in a dark puddle.* "Your iron blades and small spells... they are toys forgotten in the mud."',
    ],
  },
  {
    id: 'vision3',
    flag: 'vision:3',
    enters: 'peaks',
    lines: [
      '*Lightning strikes the mountain beacon, forming glowing wyrm runes.* "They lock the iron gates to keep me out... or to keep you caged with your fear?"',
      '*Cold wind whispers through the peaks.* "The moon above is just my pale reflection. The real light lives in the dark."',
    ],
  },
];

/** What a monster says before its fight begins, shown as an interlude (the Wyrm's lair). */
export const PRELUDES: Readonly<Record<string, Variants>> = {
  moonWyrm: [
    '*The massive serpent coils around the moon-crystal, breath like frost.* "You come at last, wrapped in steel and hubris. I am the silence between stars. Show me why your brief life deserves the dawn."',
    'For centuries I drank the moonlight while your kind built huts in the mud. Let us see if your spirit burns or shatters.',
  ],
};

/** Set on the first arrival in a map (`reached:<map>`); story beats key off it. */
export function reachedFlag(mapId: string): string {
  return `reached:${mapId}`;
}

/** One of Vesper's appearances: where, the NPC met there, and the story flag that sends Vesper there. */
export interface VesperStop extends Location {
  readonly npcId: string;
  readonly requiresFlag: string;
}

/**
 * Vesper's route, always one step ahead: on the road out of Mossvale after
 * the first vision, by the quarry's ridge road after the second, on the
 * peaks' west road after the third, and at the Moon Caves' seal once the
 * hero reaches the Moonfall Ruins.
 */
export const VESPER_ROUTE: readonly VesperStop[] = [
  { npcId: 'vesperRoad', map: 'overworld', x: 8, y: 6, requiresFlag: 'vision:1' },
  { npcId: 'vesperRidge', map: 'quarry', x: 29, y: 14, requiresFlag: 'vision:2' },
  { npcId: 'vesperPeaks', map: 'peaks', x: 3, y: 4, requiresFlag: 'vision:3' },
  { npcId: 'vesperRuins', map: 'ruins', x: 12, y: 2, requiresFlag: reachedFlag('ruins') },
];

/** Vesper's lines, shared by every appearance. */
export const VESPER_LINES: NpcLines = {
  intro: {
    cold: [
      '*A shadow detaches from the archway.* "You\'re blocking my light, surface-bug. The Wyrm shifts below; your footsteps annoy it."',
      '*Vesper traces a glowing rune on stone.* "Still patching wells while the roots rot under your feet? How delightfully futile."',
    ],
    plain: [
      '*Cold eyes watch you from under a dark cowl.* "Another traveler wandering into the dark. Turn back, or feed the deep."',
      '*A quiet, grating laugh echoes in the passage.* "The stars are dying out above. Can\'t you feel the chill creeping up?"',
    ],
    warm: [
      '*Vesper tilts their head, studying you with amused eyes.* "A bold face. The Master grows hungry for such spirit. Do you wish to see what lies below?"',
      'You move with purpose. Pity it will all be swallowed by the moonless tide.',
    ],
  },
  confide: {
    cold: "You think you're brave, but even brave meat burns in the Wyrm's throat.",
    plain: [
      "The Master gave me this shard to watch you crumble. Take it—let's see if you reach the Depths.",
      "I too once walked in the sun. Then I heard the serpent's whisper under the earth.",
    ],
    warm: 'I was like you once—seeking glory in ancient places. The Wyrm showed me the true coldness of the world, and I bowed.',
  },
  refuse: {
    cold: [
      'Away with you. Your blood soils the stone.',
      'The dark has no time for beggars or surface vermin.',
    ],
    plain: "My Master's secrets aren't for such feeble hands.",
    warm: "You're not worthy to stand in the shadow of the Moon Wyrm.",
  },
  accept: {
    cold: 'Let the darkness test what little resolve you have left.',
    plain: 'Show me if your little light flickers when the dark presses in.',
    warm: "Step into the puzzle, brave fool. Let's see what you're made of.",
  },
  decline: {
    cold: 'Run back to your little wooden houses.',
    plain: 'Yes, flee. It buys you a few more dawns before the tide comes.',
    warm: 'A wise choice. Darkness is patient; it will wait for you.',
  },
  win: {
    cold: [
      'A temporary spark. The Depths will swallow you whole.',
      "Enjoy your small triumph. The Wyrm doesn't even notice your existence.",
    ],
    plain: [
      'Impressive... for a creature of clay. The Wyrm still waits.',
      "You cleared it? Perhaps you'll last long enough to meet the Master.",
    ],
    warm: [
      'You continue to surprise me. The Depths will enjoy breaking you all the more.',
      'Fascinating. The Wyrm will take great pleasure in unraveling a mind like yours.',
    ],
  },
  lose: {
    cold: 'Pathetic. The dark claims another dreamer.',
    plain: 'As expected. Dust returns to dust.',
    warm: 'Is that all? I expected more from someone who made it this far.',
  },
  done: {
    cold: 'The dark holds its breath. Move along.',
    plain: 'The Master watches. Every step you take draws you closer.',
    warm: 'We shall meet again in the deep, traveler.',
  },
};

/**
 * One beat of a scene, as the script's table has it: the narration (stage
 * directions, or the author's narrated text), then what is said, if
 * anything, with who says it (shown with their face).
 */
export interface SceneBeat {
  /** Narration: `*stage directions*` and the author's narrated words. */
  readonly stage: string;
  /** What is said, quotes and any stage direction included. */
  readonly line?: string;
  /** Who says it: an NPC id, a mentor id, or `hero` (the class lines). */
  readonly who?: string;
  /** The hero's own line here, by class id. */
  readonly classLines?: Readonly<Record<string, string>>;
  /** An item handed to the hero here (once ever: never to a hero who has one). */
  readonly gives?: string;
}

/**
 * A scene: a run of interludes shown once, in order (see `dueScenes` in
 * `src/game/story.ts`). It is due once the hero holds `dueWith` (always,
 * if none), and seen once `flag` is set, after its last beat.
 */
export interface SceneDef {
  readonly id: string;
  /** The interludes' title. */
  readonly title: string;
  readonly flag: string;
  readonly dueWith?: string;
  readonly beats: readonly SceneBeat[];
}

/** Elder Rowan, in the scenes. */
const ROWAN = 'elder';

/** The opening (the Call): after class select, before the hero has control. */
export const OPENING: SceneDef = {
  id: 'opening',
  title: 'Sevenstones',
  flag: 'scene:opening',
  beats: [
    {
      stage:
        '*Night over Sevenstones. Seven standing crystals ring the land, each glowing its own colour: red, blue, gold, green, orange, violet, cyan.*',
    },
    {
      stage:
        '*The violet stone flickers and goes grey. The other six burn a little lower, like candles in a draught.*',
    },
    {
      stage:
        '*Far beneath the stones, something enormous breathes in. Every lamp in every village dims at once.*',
      line: '*A voice too deep to be heard, only felt:* "Sleep."',
    },
    {
      stage:
        "*Mossvale at dawn. As always, you're first up, lighting the lane lamps. Bean is already in her rows and Ordor is unbarring his stall. But the baker's shutters stay closed, and so do the Millers' and old Tess's. Three houses, and no one stirs.*",
      who: 'hero',
      classLines: {
        ranger:
          "The baker's never slept through a dawn in his life. And the wind hasn't moved since midnight.",
        knight:
          "The Millers' door is still barred. Old Tom's been up before me every day for ten years.",
        mage: "My candle burned all night and gave no light. Now three houses won't wake. Those two things are connected.",
        rogue:
          "Three houses, shutters closed, nobody home who'll answer. I could... no. Something's wrong.",
      },
    },
    {
      stage: '*At the well, Elder Rowan hauls up a bucket. The water inside is violet.*',
      line: '"Three houses still abed, and the well\'s gone purple. Something\'s wrong, kid."',
      who: ROWAN,
    },
  ],
};

/**
 * The Refusal: the first time the hero leaves Mossvale, just before Vision
 * 1. In R4 Rowan gives the hero his rune stone, the Focus Stone
 * (`wellStone`), unless they ever received it (`got:wellStone`; an old
 * save that had it from his well): never a second stone.
 */
export const REFUSAL: SceneDef = {
  id: 'refusal',
  title: 'The Mossvale stile',
  flag: 'scene:refusal',
  dueWith: 'vision:1',
  beats: [
    {
      stage:
        '*The stile at the village edge. Beyond it, the road to Sevenstones runs grey under a dim sky. You stop.*',
      who: 'hero',
      classLines: {
        ranger: 'Never went past the second ridge. Never needed to.',
        knight: "My post is here. A knight doesn't leave his post.",
        mage: "My books are here. Whatever's out there isn't in them.",
        rogue: 'Not my village. Not my problem. Right?',
      },
    },
    {
      stage: '*A gust, and a woman drops out of the sky with a satchel full of letters. Kestrel.*',
      line: "\"Two letters. One from Selene at Moonfall, 'to whoever's still awake in Mossvale'. And one for Elder Rowan, from the inn at Brightwater.\"",
      who: 'kestrel',
    },
    {
      stage: '*Rowan reads his, then reads it again. His hands shake.*',
      line: '"My boy, Hareguy. Asleep three weeks at the inn, and they can\'t wake him. I can\'t make that road on these knees, kid."',
      who: ROWAN,
    },
    {
      stage: '*He presses the old rune stone into your palm.*',
      line: '"Found this the year I dug the well. Never knew what it was for. Maybe it was for this."',
      who: ROWAN,
      gives: 'wellStone',
    },
  ],
};

/** Set once the finale boss (the Moon Wyrm) falls: Chapter One ends. */
export const FINALE_FLAG = 'wyrmBeaten';

/** In the lair, when the Wyrm falls (after the results). */
export const WYRM_FALL: SceneDef = {
  id: 'wyrmFall',
  title: 'The Moon Wyrm falls',
  flag: 'scene:wyrmFall',
  dueWith: FINALE_FLAG,
  beats: [
    {
      stage:
        "*The great serpent's coil slackens around the moon-crystal. Its last word breaks off halfway, as if whatever was speaking simply stopped.*",
    },
    {
      stage:
        "*What's left is only an animal: grey, ancient, half-blind. It lowers its head and lets out a long, shaking breath.*",
    },
    {
      stage:
        '*Moonlight pours out of the crystal and up through the stone. The Wyrm closes its eye and sleeps, a real sleep this time.*',
    },
  ],
};

/** The end of Chapter One, after the Wyrm's fall; the stats summary follows. */
export const CHAPTER_END: SceneDef = {
  id: 'chapterEnd',
  title: 'End of Chapter One',
  flag: 'scene:chapterEnd',
  dueWith: FINALE_FLAG,
  beats: [
    {
      stage:
        '*Silver light climbs every well and crack. The violet stone of Sevenstones flickers, then glows. In Brightwater, sleepers stir and yawn.*',
    },
    {
      stage: 'After the Moon Wyrm falls, Captain Vale has the last word:',
      line: '"You came back, the realm owes you; so do I..."',
      who: 'guard',
    },
    {
      stage:
        "The Sunken Ruins' seal then glows, distracting everyone. *Across Sevenstones, the ancient ward flares silver. The watch turn to stare.*",
    },
    {
      stage:
        'Suddenly a voice is heard rumbling through the breeze. *It\'s the voice from every vision, but there\'s no Wyrm now to carry it. The grass flattens and the lamps gutter.* "A good throat. Old, and very obedient. **I have others.**"',
    },
    {
      stage:
        "*At the cave mouth, Vale's guards find a dark cloak, empty and soaked. Wet footprints lead across Sevenstones to the glowing ward.*",
    },
    {
      stage:
        '*An old man waits by the ward, holding a brass lantern with no flame. He looks at the footprints, then at you.* "Those prints. I\'d know them anywhere. I taught the boy who made them to walk."',
    },
  ],
};

/** Every scene, in story order. */
export const SCENES: readonly SceneDef[] = [OPENING, REFUSAL, WYRM_FALL, CHAPTER_END];

/** The Sunken Ruins' ward after the Wyrm: its map text, rotating. */
export const WARD_AFTER_WYRM: Variants = [
  'The ward hums with fresh moonlight. Wet footprints end at its edge.',
  'Below the ward, a bell rings once. It will open in the next chapter.',
];
