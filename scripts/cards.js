'use strict';

/**
 * Play the card call and print it.
 *
 * Green tests do not tell you whether a call works. This prints the dialogue
 * so it can be read.
 *
 *   node scripts/cards.js --seed 3
 *   node scripts/cards.js --seed 3 --random
 *   node scripts/cards.js --seed 3 --cause 2 --baggage blamed
 */

const { seededRng } = require('../src/call/rng');
const { playCall } = require('../src/cards/call');
const { makeCardAgent, makeWatson, makeHolmes } = require('../src/cards/cardAgents');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
}

const seed = Number(arg('seed', 1));
const randomMove = process.argv.includes('--random');
const causeIndex = arg('cause', undefined);
const baggage = arg('baggage', undefined);

const rng = seededRng(seed);
const who = arg('agent', 'apprentice');
const agent =
  who === 'watson'
    ? makeWatson()
    : who === 'holmes'
      ? makeHolmes()
      : makeCardAgent({ name: randomMove ? 'dice' : 'apprentice', randomMove });
const out = playCall({
  agent,
  rng,
  baggage,
  causeIndex: causeIndex === undefined ? undefined : Number(causeIndex),
});

const WIDTH = 72;
function wrap(text, indent) {
  const words = String(text).split(' ');
  const rows = [];
  let row = '';
  for (const w of words) {
    if ((row + ' ' + w).trim().length > WIDTH - indent.length) {
      rows.push(row.trim());
      row = w;
    } else row += ' ' + w;
  }
  if (row.trim()) rows.push(row.trim());
  return rows.map((r, i) => (i === 0 ? r : indent + r)).join('\n');
}

console.log(`\nseed ${seed} — ${agent.name}${randomMove ? ' (dice)' : ''} — hidden cause: ${out.cause}`);
console.log(`baggage: ${out.sheet.baggage.id} — "${out.sheet.baggage.line}"`);
console.log(`patience ${out.sheet.patience}, empathy ${out.sheet.empathy}\n`);
for (const l of out.lines) {
  const tag = l.who.padEnd(5);
  console.log(`${tag} ${wrap(l.text, ' '.repeat(6))}`);
}
console.log(
  `\nending: ${out.ending} · cause found: ${out.found}${out.foundTurn ? ` on play ${out.foundTurn}` : ''} · plays used: ${out.plays}`,
);
console.log(
  `bounces ${out.stats.bounces} · criticals ${out.stats.criticals} · need seen ${out.stats.needSeen}${out.stats.needSeen ? (out.stats.needOblique ? ' (obliquely)' : ' (directly)') : ''} · written ${out.board.written.join(', ') || 'nothing'} · dropped ${out.stats.dropped}`,
);
