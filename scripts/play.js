'use strict';

/**
 * Play a call by hand, one decision at a time.
 *
 * The engine drives; you supply the moves. Because everything is seeded,
 * the whole call replays from the seed plus the moves already made, so
 * each invocation can stop at the next decision and print it.
 *
 *   node scripts/play.js --seed 12
 *   node scripts/play.js --seed 12 --moves "crm/contract"
 *   node scripts/play.js --seed 12 --moves "crm/contract:1,3"
 *
 * A move is `source/mode`, optionally `:picks` (1-based card numbers from
 * the hand it printed), optionally `-n` before the picks to discard card n
 * first. `hold` and `offer` are moves of their own.
 */
const { seededRng } = require('../src/call/rng');
const { playCall } = require('../src/call/engine');
const { newSheet } = require('../src/call/customer');

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const seed = Number(arg('--seed', 12));
const moves = (arg('--moves', '') || '').split(';').map((m) => m.trim()).filter(Boolean);

const PAUSE = Symbol('pause');

/** Turn "customer/expand-2:1,4" into its parts. */
function parse(move) {
  const [head, picks] = move.split(':');
  const tell = head.includes('!');
  const [sm, discard] = head.replace('!', '').split('-');
  const [source, mode] = sm.split('/');
  return {
    source, mode, direction: tell ? 'state' : 'ask',
    discard: discard ? Number(discard) : null,
    picks: picks ? picks.split(',').map(Number) : null,
  };
}

const hand = { shown: null };
let pausedAt = null;

const scripted = {
  knowsApothecaries: false,
  index: 0,
  chooseTurn(view) {
    const move = moves[this.index];
    if (!move) { pausedAt = { stage: 'turn', view, log: view.log }; throw PAUSE; }
    if (move === 'hold') return { kind: 'hold' };
    if (move === 'offer') return { kind: 'offer' };
    const p = parse(move);
    return { kind: 'inquiry', source: p.source, mode: p.mode, direction: p.direction };
  },
  chooseDiscard(cards, view) {
    const p = parse(moves[this.index] || '');
    if (!p.picks) { hand.shown = cards; pausedAt = { stage: 'cards', view, cards }; throw PAUSE; }
    return p.discard ? cards[p.discard - 1] : null;
  },
  choosePlays(cards, view) {
    const move = moves[this.index];
    const p = parse(move || '');
    this.index += 1;
    if (!p.picks) { hand.shown = cards; pausedAt = { stage: 'cards', view, cards, log: view.log }; throw PAUSE; }
    return p.picks.map((n) => cards[n - 1]).filter(Boolean);
  },
};

const rng = seededRng(seed);
const sheet = newSheet({ name: 'Sella Brandt' }, rng);
let result = null;
try {
  result = playCall({ sheet, agent: scripted, rng });
} catch (e) {
  if (e !== PAUSE) throw e;
}

const { render } = require('../src/call/transcript');

if (result) {
  console.log(render(result, { title: `seed ${seed} — finished` }));
  process.exit(0);
}

// Replay what has happened so far, then print the pending decision.
const replay = [];
const spy = Object.assign({}, scripted, { index: 0 });
console.log(`— seed ${seed} — her tier: ${sheet.tier} —`);
console.log(`turns used: ${9 - pausedAt.view.turnsLeft} of 9   (${pausedAt.view.turnsLeft} left)`);
console.log(`identified: ${pausedAt.view.identified ? 'yes' : 'no'}`
  + `   holds: ${pausedAt.view.holds}`
  + `   candidates in hand: ${(pausedAt.view.candidates || []).join(', ') || 'none'}`);
console.log(`records read: ${(pausedAt.view.fieldsRead || []).join(' · ') || 'none'}`);
console.log(`she has answered on: ${(pausedAt.view.said || []).join(' · ') || 'nothing yet'}`);
console.log(`in play: ${pausedAt.view.pool.join(' · ')}`);
console.log('');

if (pausedAt.log && pausedAt.log.length > 1) {
  console.log('SO FAR:');
  for (const e of pausedAt.log.slice(1)) {
    const bits = [`  ${e.turn}. ${e.kind}`];
    if (e.played) bits.push(`played: ${e.played.join(' + ')}`);
    console.log(bits.join('  '));
    if (e.result) console.log(`     → ${e.result}`);
    if (e.fix) console.log(`     YOU      ${e.fix}`);
    if (e.reply) console.log(`     CALLER   ${e.reply}`);
    if (e.seeded && e.seeded.length) console.log(`     + in play: ${e.seeded.join(' · ')}`);
  }
  console.log('');
}

if (pausedAt.stage === 'turn') {
  console.log('YOUR MOVE — pick a source and a mode, or hold, or offer:');
  console.log('  customer/expand · customer/contract · customer/random');
  console.log('  crm/expand · crm/contract · crm/random');
  console.log('  hold · offer');
} else {
  console.log('DEALT:');
  pausedAt.cards.forEach((c, i) => {
    const tag = c.source === 'find' ? '  ← a find you are holding'
      : c.source === 'crm' ? '  (record)' : '';
    console.log(`  ${i + 1}. ${c.word}${c.flavour === 'plain' ? '' : ` (${c.flavour})`}${tag}`);
  });
  console.log('');
  console.log('Play up to two, or discard one and play one.');
  console.log('Add ! to make it a STATEMENT rather than a question — a confirmation that invites a No.');
  console.log(`  e.g. --moves "${moves.concat(['…:1,3']).join(';')}"`);
}
void replay; void spy;
