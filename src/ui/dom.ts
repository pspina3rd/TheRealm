/** Small DOM helpers shared by the UI modules. */

/** Returns the element with `id`, throwing if the page is missing it. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el as T;
}

/** Creates an element with optional class and text. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: { className?: string; text?: string } = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
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

/** A list row with a title, a muted subtitle and trailing controls. */
export function listRow(title: string, subtitle: string, ...controls: Node[]): HTMLDivElement {
  return el(
    'div',
    { className: 'list-row' },
    el('div', {}, el('b', { text: title }), el('small', { text: subtitle })),
    el('div', {}, ...controls),
  );
}
