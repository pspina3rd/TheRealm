/**
 * Reads the author's script (docs/STORY.md) for the import-fidelity tests.
 * Each `### Name` section's table becomes rows of cells; a cell is a list
 * of variants (its `•` bullets, split at `<br>`). A bullet that is one
 * quoted sentence loses its quotes (the table's notation for "said aloud");
 * a bullet with a `*stage direction*` keeps them, since they part the
 * speech from the narration.
 */
import { readFileSync } from 'node:fs';

export type Cell = string[];
export type Table = Map<string, Cell[]>;

/** A bullet as the game stores it. */
export function bulletText(bullet: string): string {
  const text = bullet.replace(/^•\s*/, '').trim();
  const quoted = /^"[^"]*"$/.test(text);
  return quoted ? text.slice(1, -1) : text;
}

/** A table cell as its variants. */
export function cellVariants(cell: string): Cell {
  return cell
    .split('<br>')
    .map(bulletText)
    .filter((text) => text.length > 0);
}

/** Every table under a heading (`## ` or `### `), keyed by the heading's text; rows keyed by their first cell. */
export function readScript(markdown: string): Map<string, Table> {
  const sections = new Map<string, Table>();
  let table: Table | null = null;
  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    const heading = /^#{2,3} (.+)$/.exec(line);
    if (heading) {
      table = new Map();
      sections.set(heading[1]!, table);
      continue;
    }
    if (!table || !line.startsWith('|') || /^\|\s*-/.test(line)) continue;
    const cells = line
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());
    const [key = '', ...rest] = cells;
    table.set(key.replace(/\*\*/g, ''), rest.map(cellVariants));
  }
  return sections;
}

export function loadScript(): Map<string, Table> {
  return readScript(readFileSync(new URL('../docs/STORY.md', import.meta.url), 'utf8'));
}
