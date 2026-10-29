/**
 * Sensitivity runs for tuning diagnosis: one cell (a target with one bot)
 * per run, with knobs that change the bot or the board for this run only.
 * Skipped unless TARGET is set. Appends one table row to OUT (if set) and
 * prints it.
 *
 * - TARGET: an encounter id (`elder`, `guard`…), `lesson:<mentor>:<d>`
 *   (Torva, Maren, Kestrel, Hazel; d 1–3 at hero level 1/3/5), or
 *   `fight:<enemyId>` (at the enemy's level, with its map's region rule).
 * - BOT (good | casual | beginner | dropper | idle), STRAIN, RUNS (200), LABEL.
 * - Bot knobs (tests/sim/encounters.ts): NOISE, GOOD_NOISE, GHOST, HINT.
 * - Board knobs: PARAMS (JSON merged into the encounter's verb params),
 *   ASSISTED=1; HELP (the mentor's toss chance), SHIELD (its HP share),
 *   FOEHP (× the foe's HP), FOEATK (+ the foe's attack), FOEACT (× its
 *   act interval), SPORES
 *   (`land,spread,petrify`), RULE=none (no region rule).
 */
import { appendFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import type { Battle } from '../../src/battle/battle';
import { LessonChallenge } from '../../src/battle/lesson';
import { REGION_RULES } from '../../src/data/balance';
import { ENCOUNTER_DEFS } from '../../src/data/encounters';
import { ENEMIES } from '../../src/data/enemies';
import { cellTarget, measureCell, type Bot } from './encounters';

const env = process.env;

/** Applies the board knobs that live in data (restored by the process ending). */
function applyDataKnobs(name: string): void {
  const { spec } = cellTarget(name);
  if (env.PARAMS && spec.kind === 'encounter') {
    const def = ENCOUNTER_DEFS[spec.id]!.spec as { params: object };
    def.params = { ...def.params, ...(JSON.parse(env.PARAMS) as object) };
  }
  if (
    (env.FOEHP || env.FOEATK || env.FOEACT) &&
    (spec.kind === 'lesson' || spec.kind === 'combat')
  ) {
    const foe = ENEMIES[spec.enemyId] as { hp: number; atk: number; actMs: number };
    foe.hp = Math.round(foe.hp * Number(env.FOEHP ?? 1));
    foe.atk += Number(env.FOEATK ?? 0);
    foe.actMs = Math.round(foe.actMs * Number(env.FOEACT ?? 1));
  }
  if (env.SPORES) {
    const [landEvery, spreadEvery, petrifyAt] = env.SPORES.split(',').map(Number);
    Object.assign(REGION_RULES.spores, { landEvery, spreadEvery, petrifyAt });
  }
}

/** The knobs that live on the battle. */
function tweak(battle: Battle): void {
  const lesson = battle.challenge;
  if (!(lesson instanceof LessonChallenge)) return;
  if (env.HELP) lesson.helpChance = Number(env.HELP);
  if (env.SHIELD) lesson.shieldAt = Number(env.SHIELD);
}

describe.skipIf(!env.TARGET)('sensitivity cell (TARGET=…)', () => {
  it('plays one cell', () => {
    const name = env.TARGET!;
    const bot = (env.BOT ?? 'good') as Bot;
    applyDataKnobs(name);
    const cell = measureCell(name, bot, Number(env.RUNS ?? 200), {
      strain: Number(env.STRAIN ?? 0),
      assisted: env.ASSISTED === '1',
      noRule: env.RULE === 'none',
      tweak,
    });
    const mix = Object.entries(cell.causes)
      .filter(([c]) => c !== 'won')
      .map(([c, n]) => `${c} ${n}`)
      .join(', ');
    const price = name === 'stallKeeper' ? ` · price ${(cell.price * 100).toFixed(0)}%` : '';
    const row = `| ${name} | ${env.LABEL ?? bot} | ${(cell.winRate * 100).toFixed(0)}% ±${(cell.half * 100).toFixed(1)} | ${cell.seconds.toFixed(0)} s / ${cell.pieces.toFixed(0)}${price} | ${mix || '—'} |\n`;
    process.stderr.write(row);
    if (env.OUT) appendFileSync(env.OUT, row);
  }, 7_200_000);
});
