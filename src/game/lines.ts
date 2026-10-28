/**
 * Lines and how they are spoken: picking a line's mood cell, rotating
 * through its variants, and splitting out its stage directions.
 *
 * Rotation: each speaker keeps a count per moment (`LineMemory`, saved with
 * the game). The n-th time a moment is spoken it says variant n mod count,
 * so a character with two or more variants never repeats the same sentence
 * back to back, and the order is the same in every game (deterministic).
 */
import type { Line, MoodLine, Variants } from '../data/types';

/** How a line is coloured: cold (Hostile, Wary), plain (Neutral) or warm (Friendly, Devoted). */
export type Mood = 'cold' | 'plain' | 'warm';

/** Times each `speaker.moment` has been spoken, for rotating its variants. */
export type LineMemory = Record<string, number>;

/** The cell to use when a mood's own is missing, nearest first. */
const FALLBACK: Readonly<Record<Mood, readonly Mood[]>> = {
  cold: ['cold', 'plain', 'warm'],
  plain: ['plain', 'warm', 'cold'],
  warm: ['warm', 'plain', 'cold'],
};

/** A cell's variants as a list. */
export function variantsOf(variants: Variants): readonly string[] {
  return typeof variants === 'string' ? [variants] : variants;
}

function isMoodLine(line: Line): line is MoodLine {
  return typeof line !== 'string' && !Array.isArray(line);
}

/** The variants a line has for this mood (falling back to the nearest mood's), or none. */
export function variantsFor(line: Line, mood: Mood): readonly string[] {
  if (!isMoodLine(line)) return variantsOf(line as Variants);
  for (const m of FALLBACK[mood]) {
    const cell = line[m];
    if (cell !== undefined && variantsOf(cell).length > 0) return variantsOf(cell);
  }
  return [];
}

/**
 * The next variant for `key`. It is counted in `memory` as said, unless
 * `commit` is false: a line offered but maybe never shown (an accept or a
 * decline) is counted with `noteSaid` once it is. Without a memory the
 * first variant is said; an empty list says '...'.
 */
export function pickVariant(
  variants: readonly string[],
  memory?: LineMemory,
  key?: string,
  commit = true,
): string {
  if (variants.length === 0) return '...';
  if (!memory || key === undefined) return variants[0] ?? '...';
  const count = memory[key] ?? 0;
  if (commit) noteSaid(memory, key);
  return variants[count % variants.length] ?? '...';
}

/** Counts one saying of `key`, so its next variant comes up. */
export function noteSaid(memory: LineMemory, key: string): void {
  memory[key] = (memory[key] ?? 0) + 1;
}

/** A line without the variants in `unsaid` (a cell left empty falls back like a missing one). */
export function sayable(line: Line, unsaid: readonly string[] = []): Line {
  const keep = (cell: Variants): string[] => variantsOf(cell).filter((v) => !unsaid.includes(v));
  if (!isMoodLine(line)) return keep(line as Variants);
  return Object.fromEntries(
    Object.entries(line).map(([mood, cell]) => [mood, keep(cell as Variants)]),
  ) as MoodLine;
}

/** Speaks a line in a mood, rotating under `key` when a memory is given (see `pickVariant`). */
export function speak(
  line: Line,
  mood: Mood,
  memory?: LineMemory,
  key?: string,
  commit = true,
): string {
  return pickVariant(variantsFor(line, mood), memory, key, commit);
}

/** A run of text: spoken words, or a stage direction (narration, shown in italics). */
export interface Beat {
  readonly kind: 'speech' | 'stage';
  readonly text: string;
}

/**
 * A stage direction: `*` at the start or after a space, text that neither
 * starts nor ends with a space, and `*` before a space, punctuation or the
 * end. So `5 * 3 * 2` and `**bold**` stay as written.
 */
const STAGE = /(^|\s)\*([^*\s](?:[^*]*[^*\s])?)\*(?=$|[\s.,;:!?"'’”)\]—–-])/g;

/**
 * Splits a line at its `*stage directions*`; anything else with asterisks
 * is kept as written, and the spaces between beats stay with the speech.
 * Single-word emphasis (the Elder's "purple *and* full of gravel") reads
 * the same way and renders in italics like narration.
 */
export function parseStage(text: string): Beat[] {
  const beats: Beat[] = [];
  let last = 0;
  for (const match of text.matchAll(STAGE)) {
    const start = match.index + (match[1]?.length ?? 0);
    if (start > last) beats.push({ kind: 'speech', text: text.slice(last, start) });
    beats.push({ kind: 'stage', text: match[2] ?? '' });
    last = match.index + match[0].length;
  }
  if (last < text.length) beats.push({ kind: 'speech', text: text.slice(last) });
  return beats;
}
