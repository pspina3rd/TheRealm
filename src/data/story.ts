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
