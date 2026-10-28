#!/usr/bin/env node
/**
 * `npm run sim [KEY=value …]`: the balance tables. Arguments of the form
 * KEY=value become environment settings, so `npm run sim ENCOUNTERS=all`
 * works as written (npm passes them on as arguments).
 *
 * - ENCOUNTERS=all or a list of NPC ids: the encounter table
 *   (tests/sim/encounters.test.ts), RUNS seeds per cell (default 200).
 * - Otherwise: the whole-game fight table (tests/sim/balance.test.ts), as
 *   before (RUNS, PACE, AREAS, SIM_OUT).
 */
import { spawnSync } from 'node:child_process';

const env = { ...process.env, SIM: '1' };
for (const arg of process.argv.slice(2)) {
  const match = /^([A-Z_]+)=(.*)$/.exec(arg);
  if (!match) {
    console.error(`Unknown argument "${arg}": use KEY=value, e.g. ENCOUNTERS=all`);
    process.exit(2);
  }
  env[match[1]] = match[2];
}
const file = env.ENCOUNTERS ? 'tests/sim/encounters.test.ts' : 'tests/sim/balance.test.ts';
const result = spawnSync('npx', ['vitest', 'run', file], { stdio: 'inherit', env });
process.exit(result.status ?? 1);
