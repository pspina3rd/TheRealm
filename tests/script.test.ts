/**
 * Import fidelity: the lines the author wrote in docs/STORY.md are the
 * game's lines, word for word (see `tests/storyScript.ts` for how a cell
 * is read).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLASSES } from '../src/data/classes';
import { ENCOUNTER_DEFS, type EncounterDef } from '../src/data/encounters';
import { MENTORS } from '../src/data/mentors';
import { HAREGUY, NPCS } from '../src/data/npcs';
import {
  CHAPTER_END,
  OPENING,
  PRELUDES,
  REFUSAL,
  VESPER_LINES,
  VISIONS,
  WARD_AFTER_WYRM,
  WYRM_FALL,
  type SceneDef,
} from '../src/data/story';
import type { Line, NpcLines, Variants } from '../src/data/types';
import { variantsOf, type Mood } from '../src/game/lines';
import { bulletText, cellVariants, loadScript, readScript, type Cell } from './storyScript';

const script = loadScript();
const WYRM = 'The Moon Wyrm (Visions & Lair Monologues)';
/** The Wyrm's rows, by the script's own names. */
const WYRM_ROWS: Readonly<Record<string, Variants>> = {
  'Vision 1 (Leaving Mossvale)': VISIONS.find((v) => v.id === 'vision1')!.lines,
  'Vision 2 (Redrock Quarry / Ridge)': VISIONS.find((v) => v.id === 'vision2')!.lines,
  'Vision 3 (Stormcrown Peaks)': VISIONS.find((v) => v.id === 'vision3')!.lines,
  'Lair Confrontation (Moon Caves Depths)': PRELUDES.moonWyrm!,
};
const MOODS: readonly Mood[] = ['cold', 'plain', 'warm'];
/** The scenes' sections, by the script's own names. */
const OPENING_BEATS = 'Opening: the night the stone dims';
const OPENING_CLASS = 'Opening: class lines (beat 4)';
const REFUSAL_BEATS = 'The Refusal: beats R1–R4';
const REFUSAL_CLASS = 'The Refusal: class lines (R1)';
const PETE = "Innkeeper Pete, on Rowan's son";
const ROAD_BACK = 'At the Road Back (second half, relighting their stone at Sevenstones)';
const WARD = "The Sunken Ruins' ward, after the Wyrm (map text)";
/** The scene tables' row names, beat by beat. */
const BEAT_ROWS: Readonly<Record<string, readonly string[]>> = {
  [OPENING_BEATS]: ['1', '2', '3', '4', '5'],
  [REFUSAL_BEATS]: ['R1', 'R2', 'R3', 'R4'],
  "The Moon Wyrm's fall": ['1', '2', '3'],
  'End of Chapter One': [
    '1 · Moonrise',
    '2 · Captain Vale',
    '3 · The seal',
    '4 · The voice',
    '5 · The footprints',
    '6 · The hook',
  ],
};
/** How the beats' tables name who speaks. */
const SHORT_NAMES: Readonly<Record<string, string>> = { elder: 'Rowan', kestrel: 'Kestrel' };
/** The mentors' new rows, by the script's own names. */
const MENTOR_ROWS = {
  'Arrives somewhere new': 'arrives',
  'Seeks you out': 'seeks',
  'After the lesson': 'afterLesson',
  'If you failed their lesson': 'failedLesson',
} as const;
const MOMENTS: Readonly<Record<string, keyof NpcLines>> = {
  Greeting: 'intro',
  'Confides (Devoted only)': 'confide',
  'Refuses (Hostile only)': 'refuse',
  'Takes on the task': 'accept',
  'You walk away': 'decline',
  'You succeed': 'win',
  'You succeed, already knowing the spell': 'winKnown',
  'You fail': 'lose',
  Afterwards: 'done',
};

/** The encounters' draft rows, by the script's own names. */
const ENCOUNTER_ROWS: Readonly<Record<string, (def: EncounterDef) => string | undefined>> = {
  'On the frame': (def) => def.objective,
  'Stakes card: if you fail': (def) => def.failText,
  'Stakes card: each strain step': (def) => def.strainText,
  'As the try starts': (def) => def.lines.start,
  'At the hazard': (def) => def.lines.hazard,
  'Nearly done': (def) => def.lines.nearly,
  'After the win line': (def) => def.winAdd,
};
/** An encounter's section: its title and the person's name. */
const encounterSection = (def: EncounterDef): string => `${def.title} (${NPCS[def.id]!.name})`;

/** A line's own cell for a mood (no fallback), as a list. */
function cell(line: Line | undefined, mood: Mood): readonly string[] {
  if (line === undefined) return [];
  if (typeof line === 'string' || Array.isArray(line)) return variantsOf(line);
  const own = (line as Record<Mood, Line | undefined>)[mood];
  return own === undefined ? [] : variantsOf(own as string | readonly string[]);
}

describe('reading the script', () => {
  it('splits bullets into variants and drops a lone sentence’s quotes', () => {
    expect(bulletText('• "Hello there."')).toBe('Hello there.');
    expect(bulletText('• *Bows.* "Hello."')).toBe('*Bows.* "Hello."');
    expect(cellVariants('• "a"<br>• "b"')).toEqual(['a', 'b']);
    const parsed = readScript('## A\n\n| Key | X |\n| --- | --- |\n| **Row** | • "v" |\n');
    expect(parsed.get('A')?.get('Row')).toEqual([['v']]);
  });
});

describe('the author’s script is the game’s text', () => {
  const people: Record<string, NpcLines> = {
    'Elder Rowan': NPCS.elder!.lines,
    'Farmer Bean': NPCS.farmer!.lines,
    Pip: NPCS.kid!.lines,
    'Shopkeeper Ordor': NPCS.stallKeeper!.lines,
    'Captain Vale': NPCS.guard!.lines,
    'Shrine Keeper Myst': NPCS.shrineKeeper!.lines,
    'Vesper, Thrall of the Depths': VESPER_LINES,
  };

  for (const [name, lines] of Object.entries(people)) {
    it(`${name}: every moment, every mood, every variant`, () => {
      const table = script.get(name);
      expect(table, name).toBeDefined();
      let checked = 0;
      for (const [row, moment] of Object.entries(MOMENTS)) {
        const cells = table?.get(row);
        if (!cells) {
          expect(lines[moment], `${name} ${row}`).toBeUndefined();
          continue;
        }
        MOODS.forEach((mood, i) => {
          expect(cell(lines[moment], mood), `${name} ${row} ${mood}`).toEqual(cells[i]);
          checked++;
        });
      }
      expect(checked).toBeGreaterThanOrEqual(18);
    });
  }

  /** A row of a table, failing loudly when the script has no such row. */
  const rowOf = (section: string, key: string): Cell[] => {
    const row = script.get(section)?.get(key);
    expect(row, `${section} › ${key}`).toBeDefined();
    return row ?? [];
  };

  it('the mentors’ reasons, wins and losses', () => {
    for (const mentor of Object.values(MENTORS)) {
      const [, , motive, win, lose] = rowOf('The Mentors', mentor.name);
      expect(variantsOf(mentor.motive), mentor.id).toEqual(motive);
      expect(variantsOf(mentor.winText), mentor.id).toEqual(win);
      expect(variantsOf(mentor.loseText), mentor.id).toEqual(lose);
    }
  });

  it('the opening: class names, hero names and descriptions', () => {
    for (const cls of Object.values(CLASSES)) {
      const [name, , , description] = rowOf('Opening', cls.name);
      expect([cls.heroName], cls.id).toEqual(name);
      expect([cls.description], cls.id).toEqual(description);
    }
  });

  it('the Moon Wyrm’s visions and lair, row by row', () => {
    for (const [row, lines] of Object.entries(WYRM_ROWS)) {
      expect(rowOf(WYRM, row)[0], row).toEqual(variantsOf(lines));
    }
  });

  it('the opening and the Refusal, beat by beat, with each class’s lines', () => {
    const tables: [string, SceneDef][] = [
      [OPENING_BEATS, OPENING],
      [REFUSAL_BEATS, REFUSAL],
    ];
    for (const [section, scene] of tables) {
      scene.beats.forEach((beat, i) => {
        const [stage, line] = rowOf(section, BEAT_ROWS[section]![i]!);
        expect([beat.stage], `${section} ${i}`).toEqual(stage);
        const said = beat.classLines
          ? '*(class line, below)*'
          : beat.line === undefined
            ? '—'
            : `${beat.who ? `${SHORT_NAMES[beat.who]}: ` : ''}${beat.line}`;
        expect([said], `${section} ${i}`).toEqual(line);
      });
    }
    for (const cls of Object.values(CLASSES)) {
      expect(rowOf(OPENING_CLASS, `${cls.name} ${cls.heroName}`)[0]).toEqual([
        OPENING.beats[3]!.classLines![cls.id],
      ]);
      expect(rowOf(REFUSAL_CLASS, cls.heroName)[0]).toEqual([
        REFUSAL.beats[0]!.classLines![cls.id],
      ]);
    }
    expect(rowOf(PETE, 'Greeting')[0]).toEqual([HAREGUY]);
  });

  it('the mentors’ new rows, every mood, and their Road Back lines', () => {
    for (const mentor of Object.values(MENTORS)) {
      for (const [row, field] of Object.entries(MENTOR_ROWS)) {
        const cells = rowOf(mentor.name, row);
        MOODS.forEach((mood, i) => {
          expect(cell(mentor[field], mood), `${mentor.id} ${row} ${mood}`).toEqual(cells[i]);
        });
      }
      expect(variantsOf(mentor.roadBack), mentor.id).toEqual(rowOf(ROAD_BACK, mentor.name)[0]);
    }
  });

  it('the Moon Wyrm’s fall and the end of Chapter One, beat by beat', () => {
    const tables: [string, SceneDef][] = [
      ["The Moon Wyrm's fall", WYRM_FALL],
      ['End of Chapter One', CHAPTER_END],
    ];
    for (const [section, scene] of tables) {
      scene.beats.forEach((beat, i) => {
        const text = beat.line === undefined ? beat.stage : `${beat.stage} ${beat.line}`;
        expect([text], `${section} ${i}`).toEqual(rowOf(section, BEAT_ROWS[section]![i]!)[0]);
      });
    }
    expect(rowOf(WARD, 'The ward')[0]).toEqual(variantsOf(WARD_AFTER_WYRM));
  });

  it('the encounters’ draft lines: objective, Stakes card, their three lines, after a win', () => {
    for (const def of Object.values(ENCOUNTER_DEFS)) {
      const table = script.get(encounterSection(def));
      expect(table, def.id).toBeDefined();
      for (const [row, field] of Object.entries(ENCOUNTER_ROWS)) {
        const text = field(def);
        const cells = table?.get(row);
        if (text === undefined) expect(cells, `${def.id} ${row}`).toBeUndefined();
        else expect(cells?.[0], `${def.id} ${row}`).toEqual([text]);
      }
    }
  });

  it('imports every table the script has: no row or section is left behind', () => {
    const known: Record<string, readonly string[]> = {
      ...Object.fromEntries(
        Object.keys(people).map((name) => [name, ['Moment', ...Object.keys(MOMENTS)]]),
      ),
      'The Mentors': ['Mentor', ...Object.values(MENTORS).map((m) => m.name)],
      Opening: ['Class', ...Object.values(CLASSES).map((c) => c.name)],
      [WYRM]: ['Sequence / Region', ...Object.keys(WYRM_ROWS)],
      ...Object.fromEntries(
        Object.entries(BEAT_ROWS).map(([section, rows]) => [section, ['Beat', ...rows]]),
      ),
      [OPENING_CLASS]: ['Class', ...Object.values(CLASSES).map((c) => `${c.name} ${c.heroName}`)],
      [REFUSAL_CLASS]: ['Class', ...Object.values(CLASSES).map((c) => c.heroName)],
      [PETE]: ['Moment', 'Greeting'],
      ...Object.fromEntries(
        Object.values(MENTORS).map((m) => [m.name, ['Moment', ...Object.keys(MENTOR_ROWS)]]),
      ),
      [ROAD_BACK]: ['Mentor', ...Object.values(MENTORS).map((m) => m.name)],
      [WARD]: ['Where', 'The ward'],
      ...Object.fromEntries(
        Object.values(ENCOUNTER_DEFS).map((def) => [
          encounterSection(def),
          ['Moment', ...Object.keys(ENCOUNTER_ROWS)],
        ]),
      ),
    };
    const unknown = [...script].flatMap(([section, table]) =>
      [...table.keys()]
        .filter((row) => !known[section]?.includes(row))
        .map((row) => `${section} › ${row}`),
    );
    expect(unknown, 'rows in docs/STORY.md the game does not import').toEqual([]);
  });

  it('a few lines, character for character', () => {
    const raw = readFileSync(new URL('../docs/STORY.md', import.meta.url), 'utf8');
    for (const line of [
      cell(NPCS.elder!.lines.lose, 'cold')[0]!,
      cell(VESPER_LINES.intro, 'cold')[0]!,
      variantsOf(VISIONS[2]!.lines)[1]!,
      cell(NPCS.kid!.lines.intro, 'warm')[1]!,
      // The author's own end-of-half words, exactly.
      '"You came back, the realm owes you; so do I..."',
      "The Sunken Ruins' seal then glows, distracting everyone.",
      'Suddenly a voice is heard rumbling through the breeze.',
    ]) {
      expect(raw).toContain(line);
    }
    expect(cell(NPCS.elder!.lines.lose, 'cold')[0]).toBe(
      'Great. Now the water’s purple *and* full of gravel. Get out of the way.',
    );
  });
});
