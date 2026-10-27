/**
 * Import fidelity: the lines the author wrote in docs/STORY.md are the
 * game's lines, word for word (see `tests/storyScript.ts` for how a cell
 * is read).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLASSES } from '../src/data/classes';
import { MENTORS } from '../src/data/mentors';
import { NPCS } from '../src/data/npcs';
import { PRELUDES, VESPER_LINES, VISIONS } from '../src/data/story';
import type { Line, NpcLines } from '../src/data/types';
import { variantsOf, type Mood } from '../src/game/lines';
import { bulletText, cellVariants, loadScript, readScript } from './storyScript';

const script = loadScript();
const MOODS: readonly Mood[] = ['cold', 'plain', 'warm'];
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
    'Farmer Bea': NPCS.farmer!.lines,
    Pip: NPCS.kid!.lines,
    'Stall Keeper Odo': NPCS.stallKeeper!.lines,
    'Captain Vale': NPCS.guard!.lines,
    'Shrine Keeper Ilse': NPCS.shrineKeeper!.lines,
    'Vesper, Thrall of the Depths': VESPER_LINES,
  };

  for (const [name, lines] of Object.entries(people)) {
    it(`${name}: every moment, every mood, every variant`, () => {
      const table = script.get(name)!;
      expect(table, name).toBeDefined();
      let checked = 0;
      for (const [row, moment] of Object.entries(MOMENTS)) {
        const cells = table.get(row);
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

  it('the mentors’ reasons, wins and losses', () => {
    const table = script.get('The Mentors')!;
    for (const mentor of Object.values(MENTORS)) {
      const [, , motive, win, lose] = table.get(mentor.name)!;
      expect(variantsOf(mentor.motive), mentor.id).toEqual(motive);
      expect(variantsOf(mentor.winText), mentor.id).toEqual(win);
      expect(variantsOf(mentor.loseText), mentor.id).toEqual(lose);
    }
  });

  it('the opening: class names, hero names and descriptions', () => {
    const table = script.get('Opening')!;
    for (const cls of Object.values(CLASSES)) {
      const [name, , , description] = table.get(cls.name)!;
      expect([cls.heroName], cls.id).toEqual(name);
      expect([cls.description], cls.id).toEqual(description);
    }
  });

  it('the Moon Wyrm’s visions and lair', () => {
    const table = script.get('The Moon Wyrm (Visions & Lair Monologues)')!;
    const rows = [...table.values()].slice(1).map(([text]) => text);
    expect(rows).toEqual([
      ...VISIONS.map((v) => variantsOf(v.lines)),
      variantsOf(PRELUDES.moonWyrm!),
    ]);
  });

  it('a few lines, character for character', () => {
    const raw = readFileSync(new URL('../docs/STORY.md', import.meta.url), 'utf8');
    for (const line of [
      cell(NPCS.elder!.lines.lose, 'cold')[0]!,
      cell(VESPER_LINES.intro, 'cold')[0]!,
      variantsOf(VISIONS[2]!.lines)[1]!,
      cell(NPCS.kid!.lines.intro, 'warm')[1]!,
    ]) {
      expect(raw).toContain(line);
    }
    expect(cell(NPCS.elder!.lines.lose, 'cold')[0]).toBe(
      'Great. Now the water’s purple *and* full of gravel. Get out of the way.',
    );
  });
});
