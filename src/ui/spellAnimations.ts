/** Development visual workbench: the real resolver and renderer, with reproducible examples. */
import { Board } from '../core/board';
import { createRng } from '../core/rng';
import { createHero } from '../game/hero';
import { newKnownSpell } from '../game/spells';
import { ArcaneInterference } from '../battle/arcane';
import { MagicCasting } from '../battle/magicCasting';
import type { AutoCastFrame } from '../battle/battle';
import { drawAutoSpell } from './autoSpellAnimation';
import { drawCrystal, drawObstruction } from './boardView';
import { el } from './dom';
import { required } from '../core/required';
import './spellAnimations.css';
if (!import.meta.env.DEV) throw new Error('Animation workbench is development-only.');
const root = required(document.getElementById('animation-gallery'));
root.append(el('h1', { text: 'Spell animations' }));
const grid = el('div', { className: 'animation-grid' });
root.append(grid);
const examples = [
  { id: 'fire', name: 'Fire', rank: 2, rows: ['......', '.rr...', '...bb.'] },
  { id: 'blizzard', name: 'Ice', rank: 1, rows: ['.g....', 'rr.bbb'] },
  { id: 'thunder', name: 'Lightning', rank: 3, rows: ['......', '..#...'], strength: 3 },
  { id: 'natureConvert', name: 'Nature', rank: 1, rows: ['......', '..#...'], strength: 1 },
  {
    id: 'quake',
    name: 'Gravity',
    rank: 4,
    rows: ['.r....', '......', '...b..', '......', '......'],
  },
  { id: 'gale', name: 'Wind', rank: 1, rows: ['......', '.rr...'] },
];
for (const example of examples) {
  const board = new Board(createRng(42), 6, 10);
  board.magicEnabled = true;
  board.loadRows(example.rows);
  board.active = null;
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 6; x++)
      if (board.grid[y]?.[x] === 'stone')
        board.obstructions[`${x},${y}`] = {
          id: 'demo:stone',
          owner: 'enemy',
          strength: example.strength ?? 1,
          anchored: true,
          sequence: [],
          step: 0,
          contacts: [],
        };
  const hero = createHero();
  hero.spells[example.id] = { ...newKnownSpell(), level: example.rank };
  for (const key of Object.keys(hero.mana)) hero.mana[key as keyof typeof hero.mana] = 100;
  const casting = new MagicCasting(
    board,
    hero,
    new ArcaneInterference(board),
    new Set(),
    'enemy',
    8000,
  );
  const preview = casting.preview(example.id, { bottomRow: 9, direction: 1 }),
    before = board.magicState();
  const canvas = el('canvas');
  canvas.width = 180;
  canvas.height = 300;
  const phase = el('small');
  grid.append(el('section', {}, el('h2', { text: example.name }), canvas, phase));
  const ctx = required(canvas.getContext('2d'));
  const draw = (time: number) => {
    const elapsed = time % 2400;
    const part: AutoCastFrame['phase'] =
      elapsed < 500 ? 'target' : elapsed < 1400 ? 'effect' : 'result';
    const duration = part === 'effect' ? 900 : part === 'result' ? 1000 : 500;
    const position =
      part === 'target' ? elapsed : part === 'effect' ? elapsed - 500 : elapsed - 1400;
    const frame: AutoCastFrame = {
      preview,
      before,
      phase: part,
      durationMs: duration,
      remainingMs: duration - position,
      index: 1,
      total: 1,
    };
    const state = part === 'result' ? preview.resolution.state : before;
    ctx.fillStyle = '#0a0c17';
    ctx.fillRect(0, 0, 180, 300);
    ctx.strokeStyle = '#1d2238';
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 6; x++) {
        ctx.strokeRect(x * 30 + 0.5, y * 30 + 0.5, 30, 30);
        const cell = state.grid[y]?.[x];
        if (cell) drawCrystal(ctx, cell, x * 30, y * 30, 30);
        const obstruction = state.obstructions[`${x},${y}`];
        if (obstruction) drawObstruction(ctx, obstruction, x * 30, y * 30, time);
      }
    drawAutoSpell(ctx, frame, board, time, matchMedia('(prefers-reduced-motion: reduce)').matches);
    phase.textContent = part === 'target' ? 'Target' : part === 'effect' ? 'Cast' : 'Result';
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}
