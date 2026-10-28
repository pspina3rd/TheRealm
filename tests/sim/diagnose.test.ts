/**
 * Sensitivity runs for tuning diagnosis: one cell (a target with one bot)
 * per run, with knobs that change the bot or the board for this run only.
 * Skipped unless TARGET is set. Appends one table row to OUT (if set) and
 * prints it.
 *
 * - TARGET: an encounter id (`elder`, `guard`…), `lesson:<mentor>:<d>`
 *   (Torva, Maren, Kestrel, Hazel; d 1–3 at hero level 1/3/5), or
 *   `fight:<enemyId>` (at the enemy's level, with its map's region rule).
 * - BOT (good | casual | dropper | idle), STRAIN, RUNS (200), LABEL.
 * - Bot knobs (tests/sim/encounters.ts): NOISE, GHOST, HINT.
 * - Board knobs: PARAMS (JSON merged into the encounter's verb params),
 *   ASSISTED=1; HELP (the mentor's toss chance), SHIELD (its HP share),
 *   FOEHP (× the foe's HP), FOEATK (+ the foe's attack), SPORES
 *   (`land,spread,petrify`), RULE=none (no region rule).
 */
import { appendFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import type { Battle } from '../../src/battle/battle';
import { LessonChallenge } from '../../src/battle/lesson';
import { MAP_RULES, REGION_RULES, type RegionRuleId } from '../../src/data/balance';
import { ENCOUNTER_DEFS } from '../../src/data/encounters';
import { ENEMIES } from '../../src/data/enemies';
import { MAPS } from '../../src/data/maps';
import type { ChallengeSpec } from '../../src/data/types';
import { interval, playEncounter, type Bot } from './encounters';

const env = process.env;
const LESSONS: Readonly<Record<string, readonly [string, string]>> = {
  torva: ['emberWisp', 'fire'],
  maren: ['tideWisp', 'blizzard'],
  kestrel: ['galeWisp', 'gale'],
  hazel: ['mossWisp', 'cure'],
};
const LESSON_LEVELS = [0, 1, 3, 5];
const ENCOUNTER_LEVELS: Readonly<Record<string, number>> = { forager: 3, guard: 2 };

/** The spec, hero level and rule of a TARGET. */
function target(name: string): { spec: ChallengeSpec; level: number; rule?: RegionRuleId } {
  const [kind, a = '', b = '1'] = name.split(':');
  if (kind === 'lesson') {
    const [enemyId, spellId] = LESSONS[a]!;
    const difficulty = Number(b);
    return {
      spec: { kind: 'lesson', mentorId: a, enemyId, spellId, difficulty },
      level: LESSON_LEVELS[difficulty]!,
    };
  }
  if (kind === 'fight') {
    const map = Object.values(MAPS).find((m) =>
      m.entities.some((e) => e.kind === 'monster' && e.enemyId === a),
    );
    const rule = map ? MAP_RULES[map.id] : undefined;
    return {
      spec: { kind: 'combat', enemyId: a },
      level: ENEMIES[a]!.level,
      ...(rule ? { rule } : {}),
    };
  }
  const strain = Number(env.STRAIN ?? 0);
  return {
    spec: {
      kind: 'encounter',
      id: name,
      strain,
      demo: strain === 0,
      assisted: env.ASSISTED === '1',
    },
    level: ENCOUNTER_LEVELS[name] ?? 1,
  };
}

/** Applies the board knobs that live in data (restored by the process ending). */
function applyDataKnobs(spec: ChallengeSpec): void {
  if (env.PARAMS && spec.kind === 'encounter') {
    const def = ENCOUNTER_DEFS[spec.id]!.spec as { params: object };
    def.params = { ...def.params, ...(JSON.parse(env.PARAMS) as object) };
  }
  if ((env.FOEHP || env.FOEATK) && (spec.kind === 'lesson' || spec.kind === 'combat')) {
    const foe = ENEMIES[spec.enemyId] as { hp: number; atk: number };
    foe.hp = Math.round(foe.hp * Number(env.FOEHP ?? 1));
    foe.atk += Number(env.FOEATK ?? 0);
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
    const runs = Number(env.RUNS ?? 200);
    const { spec, level, rule } = target(name);
    applyDataKnobs(spec);
    const options = env.RULE === 'none' ? {} : rule ? { rule } : {};
    let wins = 0;
    let seconds = 0;
    let pieces = 0;
    const causes: Record<string, number> = {};
    for (let seed = 1; seed <= runs; seed++) {
      const result = playEncounter(spec, bot, seed * 7919 + 13, level, options, 900_000, tweak);
      if (result.won) wins++;
      seconds += result.seconds;
      pieces += result.pieces;
      const cause = result.cause.startsWith('price') ? 'price' : result.cause;
      causes[cause] = (causes[cause] ?? 0) + 1;
    }
    const { mean, half } = interval(wins, runs);
    const mix = Object.entries(causes)
      .filter(([c]) => c !== 'won')
      .map(([c, n]) => `${c} ${n}`)
      .join(', ');
    const row = `| ${name} | ${env.LABEL ?? bot} | ${(mean * 100).toFixed(0)}% ±${(half * 100).toFixed(1)} | ${(seconds / runs).toFixed(0)} s / ${(pieces / runs).toFixed(0)} | ${mix || '—'} |\n`;
    process.stderr.write(row);
    if (env.OUT) appendFileSync(env.OUT, row);
  }, 7_200_000);
});
