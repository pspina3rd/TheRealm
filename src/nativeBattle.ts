import { nativeClone } from './core/nativeClone';
import { spanFor } from './core/boardMagic';
/** Headless native bridge. Uses the production battle engine; no browser or campaign save access. */
import { Battle, type BattleAction } from './battle/battle';
import { STANDARD_SPELLS } from './battle/magicCasting';
import { createHero } from './game/hero';
import { newKnownSpell, castSpellFor } from './game/spells';
import { SPELLS } from './data/spells';
import { PIECES } from './core/pieces';
import { cellColors } from './core/board';
import { createRng } from './core/rng';
import { required } from './core/required';

if (typeof globalThis.structuredClone !== 'function')
  globalThis.structuredClone = <T>(value: T): T => nativeClone(value);

export const NATIVE_SCHOOLS = [
  'none',
  'fire',
  'blizzard',
  'quake',
  'gale',
  'thunder',
  'natureConvert',
] as const;
export type NativeSchool = (typeof NATIVE_SCHOOLS)[number];
let battle: Battle | null = null;
let previousPiece: Battle['board']['active'] = null;
let pieceID = 0;
let ready = true;

function snapshot() {
  const b = required(battle, 'Start a battle first.');
  if (b.board.active !== previousPiece) {
    previousPiece = b.board.active;
    pieceID++;
  }
  return {
    version: 1,
    pieceID,
    ready,
    status: b.status,
    paused: b.paused,
    busy: b.autoCastingBusy,
    width: b.board.width,
    height: b.board.height,
    grid: b.board.grid,
    obstructions: b.board.obstructions,
    active: b.board.active
      ? {
          name: b.board.active.name,
          x: b.board.active.x,
          y: b.board.active.y,
          cells: b.board.active.cells,
          colors: b.board.active.colors,
        }
      : null,
    ghostY: b.board.ghostY(),
    next: b.upcomingPieces
      .slice(0, 3)
      .map((p) => ({ name: p.name, cells: PIECES[p.name].cells, colors: cellColors(p) })),
    heroHP: b.hero.hp,
    heroMaxHP: b.hero.maxHp,
    enemyHP: b.combat?.enemyHp ?? 0,
    enemyMaxHP: b.combat?.enemy.hp ?? 0,
    enemyMove: b.combat?.nextMove.name ?? '',
    enemyRemainingMs: b.combat ? Math.max(0, b.combat.actMs - b.combat.gauge) : 0,
    lines: b.lines,
    score: b.score,
    spells: Object.keys(b.hero.spells)
      .filter((id) => STANDARD_SPELLS[id])
      .map((id) => {
        const known = required(b.hero.spells[id]),
          spell = required(SPELLS[id]),
          cast = castSpellFor(spell, known);
        const element = required(STANDARD_SPELLS[id]);
        return {
          id,
          element,
          rank: known.level,
          mana: b.hero.mana[element],
          cost: cast.cost[element] ?? 0,
        };
      }),
    effect: b.autoFrame
      ? {
          school: b.autoFrame.preview.id,
          rank: b.autoFrame.preview.rank,
          phase: b.autoFrame.phase,
          rows: (() => {
            const [first, last] = spanFor(
              {
                element: b.autoFrame.preview.element,
                rank: b.autoFrame.preview.rank,
                bottomRow: b.autoFrame.preview.target.bottomRow,
                direction: b.autoFrame.preview.target.direction,
              },
              b.board.height,
            );
            return Array.from(
              { length: Math.max(0, last - first + 1) },
              (_, index) => first + index,
            );
          })(),
          remainingMs: b.autoFrame.remainingMs,
          durationMs: b.autoFrame.durationMs,
        }
      : null,
  };
}

/** JSON-only boundary also runs in Apple's JavaScriptCore, without a WebView. */
export function dispatch(json: string): string {
  try {
    const request: unknown = JSON.parse(json);
    if (!request || typeof request !== 'object') throw new Error('Invalid native request.');
    const r = request as Record<string, unknown>;
    if (r.type === 'start') {
      const school = r.school ?? 'none',
        rank = r.rank ?? 1,
        seed = r.seed ?? 73;
      if (
        !NATIVE_SCHOOLS.includes(school as NativeSchool) ||
        !Number.isInteger(rank) ||
        Number(rank) < 1 ||
        Number(rank) > 4 ||
        !Number.isInteger(seed)
      )
        throw new Error('Invalid test school, rank, or seed.');
      const hero = createHero();
      if (school !== 'none')
        hero.spells[String(school)] = { ...newKnownSpell(), level: Number(rank) };
      battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(Number(seed)), {
        boardMagic: true,
        autoCast: true,
        autoCastPacingMs: 450,
      });
      battle.paused = true;
      ready = true;
      previousPiece = null;
      pieceID = 0;
    } else {
      const b = required(battle, 'Start a battle first.');
      if (r.type === 'step') {
        const ms = Number(r.ms);
        if (!Number.isFinite(ms) || ms < 0) throw new Error('Invalid frame duration.');
        b.update(Math.min(100, ms));
      } else if (r.type === 'begin') {
        if (ready) {
          ready = false;
          b.paused = false;
        }
      } else if (r.type === 'pause') {
        if (typeof r.paused !== 'boolean') throw new Error('Invalid pause state.');
        b.paused = r.paused;
      } else if (r.type === 'input') {
        const actions: readonly string[] = ['left', 'right', 'rotate', 'softDrop', 'hardDrop'];
        if (!actions.includes(String(r.action))) throw new Error('Invalid battle action.');
        // The renderer's old piece can never command a newly spawned piece.
        snapshot();
        if (r.pieceID === pieceID && !b.paused && !b.autoCastingBusy && b.status === 'ongoing')
          b.input(r.action as BattleAction);
      } else if (r.type !== 'snapshot') throw new Error('Unknown native request.');
    }
    return JSON.stringify({ ok: true, state: snapshot() });
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : 'Native battle failed.',
    });
  }
}
