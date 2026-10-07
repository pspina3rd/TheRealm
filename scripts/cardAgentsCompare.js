'use strict';

/**
 * Every agent sheet over the same seeds.
 *
 * A sheet is a claim about how someone works. This is the only way to find
 * out whether the engine can express that claim: if two dispositions produce
 * the same numbers, the engine is not listening to either of them.
 *
 *   node scripts/cardAgentsCompare.js --runs 2000
 */

const { seededRng } = require('../src/call/rng');
const { playCall } = require('../src/cards/call');
const A = require('../src/cards/cardAgents');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
}

const RUNS = Number(arg('runs', 2000));
const SCENARIOS = { batch: require('../src/cards/case'), bag: require('../src/cards/bag') };
const WHICH = String(arg('case', 'batch')).toLowerCase();
const scenario = SCENARIOS[WHICH] || SCENARIOS.batch;

const SHEETS = [
  ['apprentice', () => A.makeCardAgent({})],
  ['Pooh', () => A.makePooh()],
  ['Rabbit', () => A.makeRabbit()],
  ['Tigger', () => A.makeTigger()],
  ['Piglet', () => A.makePiglet()],
  ['Eeyore', () => A.makeEeyore()],
  ['Watson', () => A.makeWatson()],
  ['Holmes', () => A.makeHolmes()],
  ['dice', () => A.makeCardAgent({ randomMove: true })],
];

function pad(s, n) {
  return String(s).padEnd(n);
}
function num(s, n, d = 1) {
  return String(Number(s).toFixed(d)).padStart(n);
}

console.log(`\ncardAgentsCompare [${WHICH}]: ${RUNS} calls each, the same seeds for every sheet\n`);
console.log(
  `  ${pad('sheet', 11)}${pad('found', 8)}${pad('resolved', 10)}${pad('held', 7)}${pad('find@', 7)}${pad('plays', 7)}${pad('asked her', 11)}${pad('rows read', 11)}${pad('need', 7)}${pad('notes', 7)}${pad('wrong fix', 10)}${pad('misaim', 7)}`,
);

for (const [label, make] of SHEETS) {
  let found = 0;
  let turns = 0;
  let resolved = 0;
  let held = 0;
  let plays = 0;
  let her = 0;
  let rows = 0;
  let need = 0;
  let notes = 0;
  let wrong = 0;
  let misaim = 0;
  for (let seed = 0; seed < RUNS; seed += 1) {
    const out = playCall({ agent: make(), rng: seededRng(seed), scenario });
    if (out.found) {
      found += 1;
      turns += out.foundTurn;
    }
    if (out.ending === 'resolved') resolved += 1;
    if (out.ending === 'held') held += 1;
    plays += out.plays;
    her += out.stats.customerPlays || 0;
    rows += Object.entries(out.stats.pairs)
      .filter(([k]) => k.startsWith('record '))
      .reduce((a, [, v]) => a + v.plays, 0);
    if (out.stats.needSeen) need += 1;
    notes += out.board.written.length;
    // Counted from the engine, not by matching a line: a scenario can give
    // each wrong remedy its own refusal, and matching one phrasing missed
    // every one of them.
    wrong += (out.refused || []).length;
    misaim += out.stats.misaimed || 0;
  }
  console.log(
    `  ${pad(label, 11)}${pad(num(pct(found), 5) + '%', 8)}${pad(num(pct(resolved), 5) + '%', 10)}${pad(num(pct(held), 4) + '%', 7)}${pad(found ? num(turns / found, 4, 2) : '  — ', 7)}${pad(num(plays / RUNS, 4, 2), 7)}${pad(num(her / RUNS, 4, 2), 11)}${pad(num(rows / RUNS, 4, 2), 11)}${pad(num(pct(need), 4) + '%', 7)}${pad(notes, 7)}${pad(wrong, 10)}${pad(misaim, 7)}`,
  );
}

function pct(n) {
  return (n / RUNS) * 100;
}

console.log('\n  found    — the cause came out of her own mouth');
console.log('  find@    — mean play the find landed on, of nine');
console.log('  asked her/rows read — mean plays spent on each per call');
console.log('  wrong fix — remedies she refused, totalled over every call\n');
