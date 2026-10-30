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
const elements = [
  { id: 'fire', name: 'Fire' },
  { id: 'blizzard', name: 'Ice' },
  { id: 'thunder', name: 'Lightning' },
  { id: 'natureConvert', name: 'Nature' },
  { id: 'quake', name: 'Gravity' },
  { id: 'gale', name: 'Wind' },
];
for (const element of elements)
  for (const rank of [1, 2, 3, 4]) {
    const isStrike = element.id === 'thunder' || element.id === 'natureConvert';
    const rows =
      element.id === 'quake'
        ? [
            '.r....',
            '......',
            '...b..',
            '......',
            '.g....',
            '......',
            '...r..',
            '.b....',
            '....g.',
            '......',
          ]
        : element.id === 'blizzard'
          ? ['.g....', 'rr.bbb', 'bb.rrr', 'gg.bbb', 'rr.ggg']
          : isStrike
            ? ['......', '..#...', '...#..']
            : ['......', '.rr...', '...bb.', '.gg...', '...rr.'];
    const example = { ...element, rank, rows, strength: element.id === 'natureConvert' ? 2 : 3 };
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
    const preview = casting.preview(example.id, {
        bottomRow: example.id === 'quake' ? 8 : 9,
        direction: 1,
      }),
      before = board.magicState();
    const canvas = el('canvas');
    canvas.width = 180;
    canvas.height = 300;
    const phase = el('small');
    const rowCount =
      example.id === 'quake' ? [1, 2, 4, 10][rank - 1] : isStrike ? (rank % 2 === 0 ? 2 : 1) : rank;
    const description = `${rowCount === 10 ? 'Whole board' : `${rowCount} row${rowCount === 1 ? '' : 's'}`}${isStrike ? ` · ${rank >= 3 ? 2 : 1} ${example.id === 'thunder' ? 'strike' : 'conversion'}${rank >= 3 ? 's' : ''}` : ''}`;
    const card = el(
      'section',
      {},
      el('h2', { text: `${example.name} · Lv ${rank}` }),
      el('p', { text: description }),
      canvas,
      phase,
    );
    card.dataset.spell = example.id;
    card.dataset.rank = String(rank);
    grid.append(card);
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
      drawAutoSpell(
        ctx,
        frame,
        board,
        time,
        matchMedia('(prefers-reduced-motion: reduce)').matches,
      );
      phase.textContent = part === 'target' ? 'Target' : part === 'effect' ? 'Cast' : 'Result';
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }
