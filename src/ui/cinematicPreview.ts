/** Development entry for the same illustrated tome used by the Fern playtest. */
import { OPENING_CINEMATIC } from '../data/openingCinematic';
import { required } from '../core/required';
import { Atlas } from './art/atlas';
import { cinematicBook } from './cinematicBook';

if (!import.meta.env.DEV) throw new Error('The story scene preview is development-only.');
const params = new URLSearchParams(location.search);
const at = Number(params.get('t'));
const atlas = new Atlas();
await atlas.load(`${import.meta.env.BASE_URL}assets/`);
const book = cinematicBook({
  shots: OPENING_CINEMATIC,
  atlas,
  initialIndex: Number(params.get('shot') ?? 1) - 1,
  frozenAt: params.has('t') && Number.isFinite(at) ? Math.max(0, at) : null,
  onComplete: () => location.assign('./?opening=fern&at=dawn'),
});
required(document.getElementById('cinematic-preview')).append(book.element);
book.element.focus();
window.addEventListener('pagehide', book.dispose, { once: true });
