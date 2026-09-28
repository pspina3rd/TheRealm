'use strict';

/**
 * Count what actually happens in played calls, not just how they end.
 *
 * Endings alone hid three real problems: fields that never pay out, a
 * hold that reaches nobody, and causes surfacing with no turn left to
 * act on them. This prints the pathologies so a claim about the engine
 * can be checked rather than believed.
 *
 * Usage: node scripts/audit.js [runs] [--competence x]
 */
const { seededRng } = require('../src/call/rng');
const { makeAgent } = require('../src/call/agents');
const { runCustomer } = require('../src/call/shift');
const { score } = require('../src/call/score');

const runs = Number(process.argv[2]) || 300;
const ci = process.argv.indexOf('--competence');
const competence = ci > -1 ? Number(process.argv[ci + 1]) : 0.8;

const player = makeAgent({ name: 'you', competence });
const count = (obj, k) => { obj[k] = (obj[k] || 0) + 1; };

const endings = {};
const perspectives = {};
const turnKinds = {};
const results = {};
const fieldPlays = {};
const fieldPayouts = {};
const holdOutcomes = {};
const briefSizes = {};
let calls = 0;
let turns = 0;
let wasted = 0;
let lateCause = 0;
let causeFound = 0;
let identTurns = 0;
let identCalls = 0;

for (let seed = 1; seed <= runs; seed++) {
  const { history } = runCustomer({
    who: { name: 'Sella Brandt', tier: ['Copper', 'Silver', 'Gold'][seed % 3] },
    calls: 3,
    player,
    rng: seededRng(seed),
    playerShare: 1,
  });
  for (const call of history) {
    calls += 1;
    count(endings, call.ending);
    const s = score(call.ledger);
    for (const [who, axes] of Object.entries(s)) {
      perspectives[who] = perspectives[who] || {};
      for (const [cat, val] of Object.entries(axes)) {
        const row = perspectives[who][cat] || { won: 0, lost: 0, even: 0, live: 0 };
        row.live += 1;
        if (val > 0) row.won += 1; else if (val < 0) row.lost += 1; else row.even += 1;
        perspectives[who][cat] = row;
      }
    }
    let identAt = null;
    let foundAt = null;
    for (const e of call.log) {
      if (e.kind === 'opening') continue;
      turns += 1;
      count(turnKinds, e.kind);
      if (e.result) count(results, String(e.result).split(' —')[0].split(' ·')[0]);
      if (typeof e.result === 'string' && e.result.startsWith('wasted')) wasted += 1;
      if (e.kind === 'inquiry' && e.source === 'crm' && e.played) {
        const paid = e.paid || [];
        for (const p of e.played) {
          const word = p.replace(/ \(.*\)$/, '');
          count(fieldPlays, word);
          // Per word, not per turn: a dead field played beside a live
          // one must not be credited with the live one's result.
          if (paid.includes(word)) count(fieldPayouts, word);
        }
      }
      if (e.kind === 'hold') {
        const key = String(e.result).startsWith('brief') ? 'reached someone' : String(e.result);
        count(holdOutcomes, key);
        if (e.seeded) count(briefSizes, e.seeded.length);
      }
      if (e.result === 'identified') identAt = e.turn;
      if (typeof e.result === 'string' && e.result.startsWith('identified')) identAt = e.turn;
      if (e.result === 'cause surfaced') foundAt = e.turn;
    }
    if (identAt) { identTurns += identAt - 1; identCalls += 1; }
    if (foundAt) {
      causeFound += 1;
      if (foundAt === 9) lateCause += 1;
    }
  }
}

const pc = (n, d) => `${((100 * n) / d).toFixed(1)}%`;
console.log(`=== ${calls} calls, ${turns} turns, competence ${competence} ===\n`);

console.log('endings');
for (const [k, v] of Object.entries(endings).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(12)} ${String(v).padStart(5)}  ${pc(v, calls)}`);
}

console.log(`\nwasted turns: ${wasted} of ${turns}  ${pc(wasted, turns)}`);
console.log('turn kinds');
for (const [k, v] of Object.entries(turnKinds).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(12)} ${String(v).padStart(5)}  ${pc(v, turns)}`);
}

console.log('\nCRM fields — played vs paid out');
for (const [k, v] of Object.entries(fieldPlays).sort((a, b) => b[1] - a[1])) {
  const paid = fieldPayouts[k] || 0;
  const flag = paid === 0 ? '   <- never pays' : '';
  console.log(`  ${k.padEnd(20)} played ${String(v).padStart(5)}  paid ${String(paid).padStart(5)}  ${pc(paid, v)}${flag}`);
}

console.log('\nholds');
for (const [k, v] of Object.entries(holdOutcomes).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(k).padEnd(34)} ${String(v).padStart(5)}`);
}
console.log('brief sizes');
for (const [k, v] of Object.entries(briefSizes).sort()) {
  console.log(`  ${k} words  ${String(v).padStart(5)}`);
}

console.log(`\ncause found: ${causeFound} of ${calls}  ${pc(causeFound, calls)}`);
console.log(`  found on the last turn, no turn to act: ${lateCause}  ${pc(lateCause, causeFound || 1)} of finds`);
console.log(`identification cost: ${(identTurns / (identCalls || 1)).toFixed(2)} turns on average`
  + `, and failed entirely in ${calls - identCalls} calls (${pc(calls - identCalls, calls)})`);


console.log('\n=== what each perspective got, by category ===');
console.log('(live = calls where the axis was in play at all)\n');
for (const [who, cats] of Object.entries(perspectives)) {
  console.log(who);
  const rows = Object.entries(cats).sort((a, b) => (b[1].won - b[1].lost) - (a[1].won - a[1].lost));
  for (const [cat, r] of rows) {
    const bar = `won ${pc(r.won, r.live).padStart(6)}  lost ${pc(r.lost, r.live).padStart(6)}`;
    const live = r.live === calls ? '' : `   live in ${pc(r.live, calls)} of calls`;
    console.log(`  ${cat.padEnd(18)} ${bar}${live}`);
  }
  console.log('');
}
