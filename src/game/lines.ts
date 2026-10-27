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
 * Picks the next variant for `key` and counts it in `memory`. Without a
 * memory the first variant is said. An empty list says '...'.
 */
export function pickVariant(
  variants: readonly string[],
  memory?: LineMemory,
  key?: string,
): string {
  if (variants.length === 0) return '...';
  if (!memory || key === undefined) return variants[0] ?? '...';
  const count = memory[key] ?? 0;
  memory[key] = count + 1;
  return variants[count % variants.length] ?? '...';
}

/** Speaks a line in a mood, rotating under `key` when a memory is given. */
export function speak(line: Line, mood: Mood, memory?: LineMemory, key?: string): string {
  return pickVariant(variantsFor(line, mood), memory, key);
}

/** A run of text: spoken words, or a stage direction (narration, shown in italics). */
export interface Beat {
  readonly kind: 'speech' | 'stage';
  readonly text: string;
}

/**
 * Splits a line at its `*stage directions*`. An asterisk with no partner is
 * kept as written, and the spaces between beats stay with the speech.
 */
export function parseStage(text: string): Beat[] {
  const beats: Beat[] = [];
  const pattern = /\*([^*]+)\*/g;
  let last = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > last) beats.push({ kind: 'speech', text: text.slice(last, match.index) });
    beats.push({ kind: 'stage', text: match[1] ?? '' });
    last = match.index + match[0].length;
  }
  if (last < text.length) beats.push({ kind: 'speech', text: text.slice(last) });
  return beats;
}

/** The line as plain text, stage directions without their asterisks (for tooltips and tests). */
export function plainText(text: string): string {
  return parseStage(text)
    .map((beat) => beat.text)
    .join('');
}
