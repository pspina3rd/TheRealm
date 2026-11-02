/** Native book staging is separate from the author's script and never changes story rewards. */
import { CLASSES } from '../data/classes';
import { NPCS } from '../data/npcs';
import { MENTORS } from '../data/mentors';
import { ENEMIES } from '../data/enemies';
import { CAMPAIGN_SPEAKERS } from '../data/campaignNpcs';
import { HOMETOWNS, hometownText } from '../data/hometowns';
import { OPENING, REFUSAL, type SceneDef } from '../data/story';
import { heroClass } from '../game/hero';
import { mentorsTaught } from '../game/ending';
import type { GameState } from '../world/state';
import { IMAGES } from '../ui/art/images';
import { isCreatureId, mapFrame } from '../ui/art/creatures';

export type TomeAction =
  | 'portrait'
  | 'stones'
  | 'dim'
  | 'breath'
  | 'dawn'
  | 'well'
  | 'road'
  | 'courier'
  | 'letter'
  | 'gift'
  | 'slacken'
  | 'sleep'
  | 'moonlight'
  | 'ward'
  | 'tracks'
  | 'lantern'
  | 'descend'
  | 'water'
  | 'lift'
  | 'steam'
  | 'gate'
  | 'transfer'
  | 'record'
  | 'reach'
  | 'signal'
  | 'duel'
  | 'retreat'
  | 'bells'
  | 'tools'
  | 'seven'
  | 'blockade'
  | 'transform'
  | 'beam'
  | 'diagram'
  | 'supplies'
  | 'repair'
  | 'contain'
  | 'release'
  | 'recovery';
export interface TomeActor {
  id: string;
  name: string;
  source: string;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  walker: boolean;
}
export interface TomePage {
  id: string;
  title: string;
  setting: string;
  action: TomeAction;
  dialogue: string;
  speaker: string;
  actors: TomeActor[];
  caption: string;
  /** Describes the visual action for VoiceOver; never printed on the page. */
  actionDescription: string;
  subject?: string;
  target?: string;
  environment?: 'village' | 'surface' | 'underground' | 'ward';
}
interface Staging {
  setting: string;
  cast: string[];
  shots: Partial<Record<number, TomeAction>>;
  voices?: Partial<Record<number, string>>;
  /** Quoted words in stage prose are dialogue only where the script actually speaks them. */
  stageSpeech?: readonly number[];
  casts?: Partial<Record<number, readonly string[]>>;
  subjects?: Partial<Record<number, string>>;
  targets?: Partial<Record<number, string>>;
}
/** Authored shot list: no keyword guessing and no stage directions used as subtitles. */
export const TOME_STAGING: Readonly<Record<string, Staging>> = {
  opening: {
    setting: 'Sevenstones',
    cast: ['hero', 'elder', 'farmer', 'stallKeeper'],
    shots: { 0: 'stones', 1: 'dim', 2: 'breath', 3: 'dawn', 4: 'well' },
    voices: { 2: 'master' },
    casts: {
      0: [],
      1: [],
      2: ['moonWyrm'],
      3: ['hero', 'farmer', 'stallKeeper'],
      4: ['hero', 'elder'],
    },
    subjects: { 2: 'moonWyrm', 3: 'hero', 4: 'elder' },
  },
  refusal: {
    setting: 'home',
    cast: ['hero', 'elder', 'kestrel'],
    shots: { 0: 'road', 1: 'courier', 2: 'letter', 3: 'gift' },
    subjects: { 0: 'hero', 1: 'kestrel', 2: 'elder', 3: 'elder' },
    targets: { 3: 'hero' },
  },
  wyrmFall: {
    setting: 'Moon Caves',
    cast: ['hero', 'moonWyrm'],
    shots: { 0: 'slacken', 1: 'sleep', 2: 'moonlight' },
    subjects: { 0: 'moonWyrm', 1: 'moonWyrm' },
  },
  chapterEnd: {
    setting: 'Sevenstones',
    cast: ['hero', 'guard', 'fennick'],
    shots: { 0: 'moonlight', 1: 'portrait', 2: 'ward', 3: 'breath', 4: 'tracks', 5: 'lantern' },
    voices: { 3: 'master', 5: 'fennick' },
    stageSpeech: [3, 5],
    casts: {
      0: ['hero', 'pete'],
      1: ['hero', 'guard'],
      2: ['hero', 'guard'],
      3: ['hero', 'guard'],
      4: ['hero', 'guard'],
      5: ['hero', 'fennick'],
    },
    subjects: { 5: 'fennick' },
  },
  campaignThreshold: {
    subjects: { 4: 'fennick', 5: 'hero', 10: 'fennick' },
    setting: 'Sevenstones',
    cast: ['hero', 'guard', 'fennick'],
    shots: { 0: 'tracks', 4: 'diagram', 5: 'descend', 10: 'reach' },
  },
  archiveRefuge: {
    subjects: { 5: 'odile', 9: 'odile' },
    setting: 'Archive refuge',
    cast: ['hero', 'odile'],
    shots: { 0: 'sleep', 5: 'lift', 9: 'water' },
  },
  archiveDrained: {
    subjects: { 0: 'odile', 4: 'odile' },
    setting: 'Archive refuge',
    cast: ['hero', 'odile'],
    shots: { 0: 'lift', 4: 'record' },
  },
  irdrathCistern: {
    subjects: { 0: 'irdrath', 2: 'irdrath', 8: 'irdrath', 10: 'irdrath' },
    setting: 'Cistern',
    cast: ['hero', 'odile', 'irdrath'],
    shots: { 0: 'steam', 2: 'steam', 8: 'gate', 10: 'diagram' },
  },
  irdrathTrial: {
    subjects: { 5: 'odile', 10: 'hero' },
    setting: 'Cistern',
    cast: ['hero', 'odile', 'irdrath'],
    shots: { 0: 'water', 4: 'gate', 5: 'transfer', 10: 'blockade' },
  },
  irdrathYielded: {
    subjects: { 0: 'irdrath', 2: 'odile', 3: 'irdrath', 5: 'odile' },
    setting: 'Cistern',
    cast: ['hero', 'odile', 'irdrath'],
    shots: { 0: 'moonlight', 2: 'transfer', 3: 'release', 5: 'transfer' },
  },
  rootwaysRecord: {
    subjects: { 0: 'hero', 4: 'hero', 5: 'vesperDuel', 9: 'vesperDuel' },
    setting: 'Rootways',
    cast: ['hero', 'vesper'],
    shots: { 0: 'record', 4: 'record', 5: 'letter', 9: 'reach' },
  },
  ketterStranded: {
    subjects: { 0: 'ketter', 2: 'ketter' },
    setting: 'Lift shaft',
    cast: ['hero', 'ketter'],
    shots: { 0: 'lantern', 2: 'lift' },
  },
  ketterRescued: {
    targets: { 15: 'hero' },
    subjects: { 0: 'ketter', 6: 'ketter', 7: 'vesperDuel', 13: 'vesperDuel', 15: 'vesperDuel' },
    setting: 'Lift shaft',
    cast: ['hero', 'ketter', 'vesper'],
    shots: { 0: 'lift', 6: 'signal', 7: 'reach', 13: 'release', 15: 'duel' },
  },
  vesperRetreated: {
    subjects: { 0: 'vesperDuel', 1: 'hero' },
    setting: 'Rootways',
    cast: ['hero', 'vesper'],
    shots: { 0: 'retreat', 1: 'repair' },
  },
  bellShift: {
    subjects: { 0: 'ketter', 3: 'ketter' },
    setting: 'Signal landing',
    cast: ['hero', 'ketter'],
    shots: { 0: 'bells', 3: 'signal' },
  },
  bellRelief: {
    subjects: { 0: 'worker', 2: 'ketter', 5: 'ketter', 6: 'ketter', 9: 'ketter' },
    setting: 'Signal landing',
    cast: ['hero', 'ketter'],
    shots: { 0: 'signal', 2: 'reach', 5: 'record', 6: 'diagram', 9: 'tools' },
    voices: { 2: 'worker' },
    stageSpeech: [2],
    casts: { 0: ['hero', 'ketter', 'worker'], 2: ['hero', 'ketter', 'worker'] },
  },
  lishalRefusal: {
    subjects: {
      0: 'lishal',
      1: 'lishal',
      2: 'worker',
      3: 'lishal',
      5: 'lishal',
      6: 'lishal',
      7: 'worker',
      8: 'lishal',
      9: 'lishal',
      10: 'lishal',
      12: 'ketter',
      13: 'ketter',
      14: 'lishal',
    },
    setting: 'Sounding frame',
    cast: ['hero', 'ketter', 'lishal', 'worker'],
    voices: { 2: 'worker', 7: 'worker' },
    stageSpeech: [2, 7],
    shots: {
      0: 'seven',
      1: 'transfer',
      2: 'road',
      3: 'portrait',
      5: 'tools',
      6: 'transfer',
      7: 'reach',
      8: 'release',
      9: 'blockade',
      10: 'seven',
      12: 'blockade',
      13: 'transfer',
      14: 'seven',
    },
  },
  vesperAcceptance: {
    subjects: {
      0: 'hero',
      2: 'master',
      4: 'vesperDuel',
      6: 'hero',
      9: 'vesperDuel',
      12: 'vesperDuel',
      15: 'vesperDuel',
      16: 'vesperDuel',
      18: 'vesperDuel',
      20: 'hero',
      21: 'lishal',
      23: 'lishal',
      25: 'lishal',
      26: 'lishal',
      27: 'lishal',
    },
    setting: 'Inspection gallery',
    cast: ['hero', 'vesper', 'ketter'],
    shots: {
      0: 'diagram',
      2: 'breath',
      4: 'transform',
      6: 'blockade',
      9: 'reach',
      12: 'release',
      15: 'transform',
      16: 'transform',
      18: 'retreat',
      20: 'dim',
      21: 'reach',
      23: 'tools',
      25: 'repair',
      26: 'road',
      27: 'seven',
    },
    voices: { 2: 'master', 4: 'master' },
    stageSpeech: [2, 4],
  },
  lishalSilenced: {
    subjects: { 0: 'lishal', 2: 'hero' },
    setting: 'Sounding frame',
    cast: ['hero', 'ketter'],
    shots: { 0: 'dim', 2: 'road' },
  },
  ascentLanding: {
    subjects: { 0: 'worker', 4: 'ketter', 7: 'hero' },
    setting: 'Service ascent',
    cast: ['hero', 'odile', 'ketter'],
    shots: { 0: 'beam', 4: 'repair', 7: 'lift' },
  },
  ascentOpened: {
    subjects: { 0: 'worker', 2: 'courier', 5: 'odile' },
    setting: 'Service ascent',
    cast: ['hero', 'odile', 'ketter', 'kestrel'],
    shots: { 0: 'lift', 2: 'courier', 5: 'transfer' },
    voices: { 2: 'courier' },
    stageSpeech: [2],
  },
  campaignReturn: {
    subjects: { 0: 'fennick', 4: 'hero', 7: 'fennick', 9: 'hero', 11: 'fennick' },
    setting: 'Sevenstones',
    cast: ['hero', 'fennick'],
    shots: { 0: 'diagram', 4: 'diagram', 7: 'reach', 9: 'record', 11: 'reach' },
  },
  hareguyVisit: { setting: 'Brightwater', cast: ['hero', 'pete'], shots: { 0: 'sleep' } },
  rowanReturn: {
    subjects: { 0: 'elder', 4: 'elder', 7: 'hero' },
    setting: 'home',
    cast: ['hero', 'elder'],
    shots: { 0: 'tools', 4: 'reach', 7: 'diagram' },
  },
  mossvaleSupplies: {
    subjects: { 0: 'farmer', 3: 'farmer', 7: 'stallKeeper' },
    setting: 'home',
    cast: ['hero', 'farmer', 'stallKeeper'],
    shots: { 0: 'supplies', 3: 'reach', 7: 'supplies' },
  },
  campaignRite: {
    subjects: {
      0: 'fennick',
      1: 'torva',
      8: 'hero',
      9: 'fennick',
      12: 'hero',
      14: 'fennick',
      15: 'hero',
      23: 'guard',
    },
    setting: 'Sevenstones',
    cast: ['hero', 'fennick', 'ketter', 'guard'],
    shots: {
      0: 'stones',
      1: 'repair',
      8: 'diagram',
      9: 'diagram',
      12: 'lantern',
      14: 'repair',
      15: 'contain',
      23: 'ward',
    },
  },
  malificatRisen: {
    subjects: { 0: 'vesperDuel', 4: 'master', 5: 'fennick', 6: 'vesperDuel', 9: 'vesperDuel' },
    setting: 'Inner ward',
    cast: ['hero', 'vesper', 'fennick'],
    shots: { 0: 'transform', 4: 'breath', 5: 'lantern', 6: 'contain', 9: 'transform' },
    voices: { 4: 'master' },
    stageSpeech: [4],
  },
  malificatFallen: {
    subjects: { 0: 'vesperDuel', 1: 'vesperDuel', 2: 'guard', 3: 'guard' },
    setting: 'Inner ward',
    cast: ['hero', 'vesper', 'fennick', 'guard'],
    shots: { 0: 'slacken', 1: 'reach', 2: 'blockade', 3: 'contain' },
    voices: { 1: 'master' },
    stageSpeech: [1],
  },
  campaignRecovery: {
    targets: { 2: 'vesperDuel' },
    subjects: { 0: 'fennick', 2: 'fennick', 4: 'fennick', 5: 'courier', 6: 'odile', 7: 'hero' },
    setting: 'Sevenstones',
    cast: ['hero', 'fennick', 'vesper', 'odile', 'ketter'],
    shots: { 0: 'transfer', 2: 'gift', 4: 'portrait', 5: 'courier', 6: 'recovery', 7: 'dawn' },
  },
  mossvaleRecovery: {
    subjects: { 0: 'elder', 3: 'elder', 6: 'elder', 8: 'hero' },
    setting: 'home',
    cast: ['hero', 'elder', 'kid'],
    shots: { 0: 'letter', 3: 'reach', 6: 'letter', 8: 'dawn' },
  },
};
const VOICES: Readonly<Record<string, string>> = { master: 'A voice' };
function actorID(id: string): string {
  return id === 'vesper' ? 'vesperDuel' : id === 'pete' ? 'innkeeper' : id;
}
function actor(id: string, state: GameState): TomeActor | null {
  id = actorID(id);
  if (VOICES[id]) return null;
  const person =
    id === 'hero'
      ? { name: state.hero.name, sprite: heroClass(state.hero).sprite }
      : id === 'worker'
        ? { name: 'Worker', sprite: 'char.025' }
        : id === 'courier'
          ? { name: 'Courier', sprite: 'char.008' }
          : (CAMPAIGN_SPEAKERS[id] ?? NPCS[id] ?? MENTORS[id] ?? ENEMIES[id]);
  if (!person || !isCreatureId(person.sprite)) throw new Error(`Missing tome actor ${id}`);
  const frame = mapFrame(person.sprite, 'down', false, 0);
  return {
    id,
    name: person.name,
    source: IMAGES[frame.image].src,
    sx: frame.x,
    sy: frame.y,
    sw: frame.w,
    sh: frame.h,
    walker: frame.w === 48 && frame.h === 48,
  };
}
/** Asterisks mark directions; inline quoted terms and emphasis remain part of the spoken line. */
export function spokenText(text: string): string {
  const clean = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*[^*]+\*/g, '')
    .trim();
  return clean.startsWith('"') && clean.endsWith('"') ? clean.slice(1, -1).trim() : clean;
}
function actionDescription(text: string, state: GameState): string {
  return hometownText(text.replace(/\*+/g, ''), state.flags).trim();
}
export function tomePages(scene: SceneDef, state: GameState): TomePage[] {
  const staging = TOME_STAGING[scene.id];
  if (!staging) throw new Error(`Missing book staging for ${scene.id}`);
  const taught = new Set(mentorsTaught(state.hero).map((m) => m.id));
  return scene.beats.flatMap((beat, index) => {
    if (beat.requiresMentor && !taught.has(beat.requiresMentor)) return [];
    const classLine = beat.classLines?.[state.hero.classId];
    const dialogue =
      classLine !== undefined
        ? spokenText(classLine)
        : beat.line
          ? spokenText(beat.line)
          : staging.stageSpeech?.includes(index)
            ? [...beat.stage.matchAll(/"([^"\n]+)"/g)]
                .map((m) => m[1])
                .join('\n')
                .replace(/\*+/g, '')
            : '';
    const who = beat.who ?? staging.voices?.[index];
    const speaker = who ? (VOICES[who] ?? actor(who, state)?.name ?? '') : '';
    const action = staging.shots[index] ?? 'portrait';
    const subject = staging.subjects?.[index] ?? (action === 'portrait' ? who : undefined);
    const target = staging.targets?.[index];
    const ids = [
      ...(staging.casts?.[index] ?? staging.cast),
      ...(who ? [who] : []),
      ...(subject ? [subject] : []),
      ...(target ? [target] : []),
    ];
    const cast = [...new Set(ids.map(actorID))]
      .map((id) => actor(id, state))
      .filter((a): a is TomeActor => !!a);
    const home = HOMETOWNS.find((h) => h.map === state.mapId)?.name ?? 'Mossvale';
    return [
      {
        id: `${scene.id}:${index}`,
        title: scene.title,
        setting:
          staging.setting === 'home' ||
          (scene.id === 'opening' && index >= 3) ||
          (scene.id === 'campaignRecovery' && index === 7)
            ? home
            : staging.setting,
        action,
        dialogue: hometownText(dialogue, state.flags),
        speaker,
        actors: cast,
        caption: '',
        actionDescription: actionDescription(beat.stage, state),
        ...(subject ? { subject: actorID(subject) } : {}),
        ...(target ? { target: actorID(target) } : {}),
        environment:
          staging.setting === 'home' ||
          (scene.id === 'opening' && index >= 3) ||
          (scene.id === 'campaignRecovery' && index === 7)
            ? 'village'
            : staging.setting === 'Inner ward'
              ? 'ward'
              : ['Sevenstones', 'Brightwater'].includes(staging.setting)
                ? 'surface'
                : 'underground',
      },
    ];
  });
}
export function heroBook(classID: string): TomePage[] {
  const hero = CLASSES[classID],
    home = HOMETOWNS.find((h) => h.classId === classID);
  if (!hero || !home) throw new Error('Choose a hero.');
  const region = mapFrame(isCreatureId(hero.sprite) ? hero.sprite : 'char.026', 'down', false, 0);
  const portrait: TomeActor = {
    id: 'hero',
    name: hero.heroName,
    source: IMAGES[region.image].src,
    sx: region.x,
    sy: region.y,
    sw: region.w,
    sh: region.h,
    walker: true,
  };
  return [
    {
      id: `hero:${classID}:0`,
      title: hero.heroName,
      setting: home.name,
      action: 'dawn',
      dialogue: OPENING.beats[3]?.classLines?.[classID] ?? '',
      speaker: hero.heroName,
      actors: [portrait],
      caption: '',
      actionDescription:
        OPENING.beats[3]?.stage.replace(/\*+/g, '').replaceAll('Mossvale', home.name) ?? '',
      subject: 'hero',
      environment: 'village',
    },
    {
      id: `hero:${classID}:1`,
      title: hero.heroName,
      setting: home.name,
      action: 'road',
      dialogue: REFUSAL.beats[0]?.classLines?.[classID] ?? '',
      speaker: hero.heroName,
      actors: [portrait],
      caption: '',
      actionDescription:
        REFUSAL.beats[0]?.stage.replace(/\*+/g, '').replaceAll('Mossvale', home.name) ?? '',
      subject: 'hero',
      environment: 'village',
    },
  ];
}

export function heroBookJSON(classID: string): string {
  return JSON.stringify(heroBook(classID));
}
export function conversationPage(
  title: string,
  text: string,
  source: string | undefined,
  state: GameState,
  caption = '',
): TomePage {
  const person = source && isCreatureId(source) ? mapFrame(source, 'down', false, 0) : null;
  const actors: TomeActor[] = person
    ? [
        {
          id: source ?? 'speaker',
          name: title,
          source: IMAGES[person.image].src,
          sx: person.x,
          sy: person.y,
          sw: person.w,
          sh: person.h,
          walker: person.w === 48,
        },
      ]
    : [];
  return {
    id: `conversation:${title}:${text}`,
    title,
    setting: HOMETOWNS.find((h) => h.map === state.mapId)?.name ?? MAP_TITLES[state.mapId] ?? '',
    action: title.includes('Rowan') ? 'well' : 'portrait',
    dialogue: hometownText(spokenText(text), state.flags),
    speaker: title,
    actors,
    caption,
    actionDescription: '',
    subject: source,
    environment: HOMETOWNS.some((home) => home.map === state.mapId) ? 'village' : 'surface',
  };
}
const MAP_TITLES: Readonly<Record<string, string>> = {
  overworld: 'Sevenstones',
  grove: 'Thornwood',
  lake: 'Glasswater',
  quarry: 'Redrock',
  forge: 'Forgefyre',
  peaks: 'Stormcrown',
  cliffs: 'Windward',
  ruins: 'Moonfall',
};
