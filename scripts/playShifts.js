'use strict';

/**
 * Play the engine over many seeds and print what happened.
 *
 * Usage: node scripts/playShifts.js [runs] [--show N] [--competence x]
 */
const { seededRng } = require('../src/call/rng');
const { makeAgent } = require('../src/call/agents');
const { runCustomer } = require('../src/call/shift');
const { render } = require('../src/call/transcript');

const runs = Number(process.argv[2]) || 200;
const showIdx = process.argv.indexOf('--show');
const show = showIdx > -1 ? Number(process.argv[showIdx + 1]) : 2;
const compIdx = process.argv.indexOf('--competence');
const competence = compIdx > -1 ? Number(process.argv[compIdx + 1]) : 0.6;

const player = makeAgent({ name: 'you', competence });
const tally = {};
const causeTally = {};
const byCause = {};
let shown = 0;

for (let seed = 1; seed <= runs; seed++) {
  const rng = seededRng(seed);
  const { history, sheet } = runCustomer({
    who: { name: 'Sella Brandt', tier: ['Copper', 'Silver', 'Gold'][seed % 3] },
    calls: 3,
    player,
    rng,
  });
  for (const call of history) {
    if (!call.byPlayer) continue;
    tally[call.ending] = (tally[call.ending] || 0) + 1;
    causeTally[call.cause] = (causeTally[call.cause] || 0) + 1;
    byCause[call.cause] = byCause[call.cause] || {};
    byCause[call.cause][call.ending] = (byCause[call.cause][call.ending] || 0) + 1;
  }
  if (shown < show) {
    for (const call of history) {
      if (shown >= show) break;
      console.log(render(call, { title: `seed ${seed} · ${call.agent}${call.byPlayer ? ' (you)' : ''}` }));
      console.log('');
      shown += 1;
    }
    console.log(`   sheet after: opinion ${sheet.opinion}, knows [${sheet.knows.join(', ')}], `
      + `${sheet.calls.length} calls remembered`);
    console.log('');
  }
}

const total = Object.values(tally).reduce((a, b) => a + b, 0);
console.log(`=== ${total} calls taken by the player, competence ${competence} ===`);
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(10)} ${String(v).padStart(5)}  ${(100 * v / total).toFixed(1)}%`);
}
console.log('--- by cause ---');
for (const [cause, endings] of Object.entries(byCause)) {
  const n = causeTally[cause];
  const parts = Object.entries(endings)
    .sort((a, b) => b[1] - a[1])
    .map(([e, c]) => `${e} ${(100 * c / n).toFixed(0)}%`);
  console.log(`  ${cause.padEnd(22)} ${String(n).padStart(4)}  ${parts.join('  ')}`);
}
