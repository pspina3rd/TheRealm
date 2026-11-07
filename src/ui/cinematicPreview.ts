/**
 * Development preview of the illustrated opening: plays each shot with its words, one page at a
 * time. `?shot=N&t=MS` freezes shot N (counting from 1) at MS milliseconds, for screenshots.
 */
import { OPENING_CINEMATIC } from '../data/openingCinematic';
import { required } from '../core/required';
import { Atlas } from './art/atlas';
import { CinematicView, STAGE_HEIGHT, STAGE_WIDTH } from './cinematicView';
import { el } from './dom';
import './cinematicPreview.css';

if (!import.meta.env.DEV) throw new Error('The story scene preview is development-only.');

const shots = OPENING_CINEMATIC;
const params = new URLSearchParams(location.search);
const frozenAt = params.has('t') ? Number(params.get('t')) : null;
let index = Math.min(Math.max(Number(params.get('shot') ?? 1) - 1, 0), shots.length - 1);

const root = required(document.getElementById('cinematic-preview'));
const canvas = el('canvas', { className: 'cinematic-stage' });
canvas.style.aspectRatio = `${STAGE_WIDTH} / ${STAGE_HEIGHT}`;
const counter = el('p', { className: 'cinematic-counter' });
const words = el('div', { className: 'cinematic-words' });
const button = (label: string, onClick: () => void): HTMLButtonElement => {
  const b = el('button', { text: label });
  b.addEventListener('click', onClick);
  return b;
};
root.append(
  canvas,
  counter,
  words,
  el(
    'nav',
    { className: 'cinematic-controls' },
    button('Previous', () => go(index - 1)),
    button('Replay', () => go(index)),
    button('Next', () => go(index + 1)),
  ),
);

const atlas = new Atlas();
await atlas.load(`${import.meta.env.BASE_URL}assets/`);
const view = new CinematicView(canvas, atlas);
let started = performance.now();

function go(next: number): void {
  index = Math.min(Math.max(next, 0), shots.length - 1);
  started = performance.now();
  const shot = required(shots[index]);
  counter.textContent = `Shot ${index + 1} of ${shots.length} · ${shot.id}`;
  words.replaceChildren(...shot.text.split('\n\n').map((p) => el('p', { text: p })));
}

function frame(now: number): void {
  const shot = required(shots[index]);
  view.draw(shot, frozenAt ?? Math.min(now - started, shot.durationMs));
  if (frozenAt === null) requestAnimationFrame(frame);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight' || event.key === 'Enter') go(index + 1);
  if (event.key === 'ArrowLeft') go(index - 1);
});
go(index);
requestAnimationFrame(frame);
