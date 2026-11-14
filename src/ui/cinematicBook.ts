/** The illustrated web tome, shared by the preview and the isolated Fern playtest. */
import type { CinematicShot } from '../game/cinematic';
import type { Atlas } from './art/atlas';
import { required } from '../core/required';
import { CinematicView, STAGE_HEIGHT, STAGE_WIDTH } from './cinematicView';
import { button, el } from './dom';
import './cinematicPreview.css';

export interface CinematicBookOptions {
  readonly shots: readonly CinematicShot[];
  readonly atlas: Atlas;
  readonly onComplete: () => void;
  readonly initialIndex?: number;
  readonly frozenAt?: number | null;
}

/** Disposing stops animation and listeners, including on Skip and the final page. */
export function cinematicBook(options: CinematicBookOptions): {
  readonly element: HTMLElement;
  readonly dispose: () => void;
} {
  const { shots, atlas, onComplete } = options;
  if (!shots.length) throw new Error('The book needs a page.');
  const requestedIndex = options.initialIndex ?? 0;
  const finiteIndex = Number.isFinite(requestedIndex) ? requestedIndex : 0;
  let index = Math.min(Math.max(Math.floor(finiteIndex), 0), shots.length - 1);
  let started = performance.now();
  let guardUntil = started + 250;
  let closed = false;
  let request = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const element = el('section', { className: 'cinematic-book' });
  element.tabIndex = -1;
  element.setAttribute('aria-label', 'Fern — the night the stones went out');
  const heading = el('h2', { className: 'cinematic-title', text: 'The Night Watch' });
  const canvas = el('canvas', { className: 'cinematic-stage' });
  canvas.style.aspectRatio = `${STAGE_WIDTH} / ${STAGE_HEIGHT}`;
  canvas.setAttribute('role', 'img');
  const view = new CinematicView(canvas, atlas);
  const words = el('div', { className: 'cinematic-words' });
  words.setAttribute('aria-live', 'polite');
  const counter = el('p', { className: 'cinematic-counter' });
  const previous = button('Previous', () => go(index - 1));
  const replay = button('Replay', () => go(index));
  const next = button('Next page', () => go(index + 1));
  const skip = button('Skip opening', complete);
  const controls = el('nav', { className: 'cinematic-controls' }, previous, replay, next);
  controls.setAttribute('aria-label', 'Book pages');
  element.append(
    heading,
    canvas,
    words,
    el('footer', { className: 'cinematic-footer' }, skip, counter, controls),
  );

  function dispose(): void {
    closed = true;
    cancelAnimationFrame(request);
    element.removeEventListener('keydown', onKey, true);
  }
  function complete(): void {
    if (closed || performance.now() < guardUntil) return;
    dispose();
    onComplete();
  }
  function go(to: number): void {
    if (closed || performance.now() < guardUntil) return;
    if (to >= shots.length) return complete();
    index = Math.max(0, to);
    started = performance.now();
    guardUntil = started + 250;
    show();
  }
  function show(): void {
    const shot = required(shots[index]);
    element.dataset.shot = shot.id;
    counter.textContent = `${index + 1} / ${shots.length}`;
    canvas.setAttribute('aria-label', shot.description ?? shot.text);
    words.replaceChildren(
      ...shot.text
        .split('\n\n')
        .filter(Boolean)
        .map((text) => el('p', { className: 'cinematic-narration', text })),
      ...(shot.dialogue ?? []).map((line) =>
        el(
          'p',
          { className: 'cinematic-dialogue' },
          el('b', { text: line.speaker }),
          el('span', { text: line.text }),
        ),
      ),
    );
    previous.disabled = index === 0;
    replay.disabled = reducedMotion.matches;
    next.textContent = index === shots.length - 1 ? 'Walk onward' : 'Next page';
    draw(started);
  }
  function draw(now: number): void {
    const shot = required(shots[index]);
    const elapsed =
      options.frozenAt ??
      (reducedMotion.matches ? shot.durationMs : Math.min(now - started, shot.durationMs));
    view.draw(shot, elapsed);
  }
  function frame(now: number): void {
    if (closed) return;
    draw(now);
    request = requestAnimationFrame(frame);
  }
  function onKey(event: KeyboardEvent): void {
    // Enter/Space activate focused buttons through the browser's default action.
    // Catch repeats before that action, so holding a key cannot turn many pages.
    if (event.repeat && ['Enter', ' ', 'ArrowRight', 'ArrowLeft', 'Escape'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!['ArrowRight', 'ArrowLeft', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return;
    if (event.key === 'Escape') complete();
    else go(index + (event.key === 'ArrowRight' ? 1 : -1));
  }
  element.addEventListener('keydown', onKey, true);
  show();
  request = requestAnimationFrame(frame);
  return { element, dispose };
}
