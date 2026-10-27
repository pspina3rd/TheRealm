/** Small DOM helpers shared by the UI modules. */
import { parseStage } from '../game/lines';

/** Returns the element with `id`, throwing if the page is missing it. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el as T;
}

/** Creates an element with optional class, text and tooltip. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: { className?: string; text?: string; title?: string } = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.title) node.title = options.title;
  node.append(...children);
  return node;
}

/** Creates a button that calls `onClick`. */
export function button(
  label: string,
  onClick: () => void,
  options: { disabled?: boolean; title?: string } = {},
): HTMLButtonElement {
  const node = el('button', { text: label });
  node.type = 'button';
  node.disabled = options.disabled ?? false;
  if (options.title) node.title = options.title;
  node.addEventListener('click', onClick);
  return node;
}

/** A line as nodes: its `*stage directions*` become italic narration (`em.stage`). */
export function lineNodes(text: string): Node[] {
  return parseStage(text).map((beat) =>
    beat.kind === 'stage'
      ? el('em', { className: 'stage', text: beat.text })
      : document.createTextNode(beat.text),
  );
}
