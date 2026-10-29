import type { ColorTouch } from '../core/boardMagic';
import { CRYSTAL_HEX } from './crystals';
const styles = new Set<string>();
/** Two seconds per color, with smooth transitions and permanent sequence marks. */
export function pulseName(sequence: readonly ColorTouch[]): string {
  const colors = sequence.map((s) => s.color),
    name = `magic-${colors.join('-')}`;
  if (!styles.has(name)) {
    const frames = [...colors, colors[0] ?? 'red']
      .map(
        (color, i) =>
          `${(100 * i) / colors.length}% { background-color: ${CRYSTAL_HEX[color]}; opacity: ${i % 2 === 0 ? '.7' : '1'}; }`,
      )
      .join('\n');
    const style = document.createElement('style');
    style.textContent = `@keyframes ${name} { ${frames} }`;
    document.head.append(style);
    styles.add(name);
  }
  return name;
}
export function pulsingColor(
  sequence: readonly ColorTouch[],
  timeMs: number,
  reduced: boolean,
): string {
  const first = sequence[0];
  if (!first) return '#fff';
  if (reduced || sequence.length === 1) return CRYSTAL_HEX[first.color];
  const at = Math.max(0, timeMs) / 2000,
    index = Math.floor(at) % sequence.length,
    next = (index + 1) % sequence.length;
  const a = CRYSTAL_HEX[sequence[index]?.color ?? first.color],
    b = CRYSTAL_HEX[sequence[next]?.color ?? first.color];
  const fraction = 0.5 - 0.5 * Math.cos(Math.PI * (at % 1));
  return `rgb(${[1, 3, 5].map((offset) => Math.round(parseInt(a.slice(offset, offset + 2), 16) * (1 - fraction) + parseInt(b.slice(offset, offset + 2), 16) * fraction)).join(',')})`;
}
