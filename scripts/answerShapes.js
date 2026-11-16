'use strict';

/**
 * Plays the hand-played calls of 14-15 November through `src/cards/answer.js`
 * and prints the shape of each of her answers, Sheet X beside Sheet Y on the
 * same draws. Then measures the same three things in the new module and in
 * the original engine (`scripts/playTurns.js`, unchanged), side by side:
 * does her sheet change her answers, does her baggage come out, and does
 * it show when something is put to her a second time.
 *
 *   node scripts/answerShapes.js             (seed 1)
 *   node scripts/answerShapes.js --seed 7
 *   node scripts/answerShapes.js --calls 2000
 *
 * Green tests do not say whether she reads right. Read what this prints.
 */

const path = require('path');
const { execFileSync } = require('child_process');
const { seededRng } = require('../src/call/rng');
const { SHEETS, shapeCall, describeShape } = require('../src/cards/answer');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
}

const ask = (suit, angle, subject, extra = {}) => ({ kind: 'question', suit, angle, subject, ...extra });
const paraphrase = (subject, extra = {}) => ({ kind: 'paraphrase', suit: 'what', angle: 'validate', subject, ...extra });

/**
 * The moves aimed at her in three of the hand-played calls
 * (docs/playthroughs-14-nov-replay.md), with the landings drawn there.
 */
const CALLS = {
  'run 1 (ends in blame)': [
    ['How have you been trying to move the draught?', ask('how', 'contract', 'draught')],
    ['Can I take your name?', ask('who', 'expand', 'name', { landing: 'critical' })],
    ['Have you transferred anything to Pell before?', ask('when', 'expand', 'transfer', { landing: 'flat' })],
    ['So you have never transferred anything before... (paraphrase)', paraphrase('transfer')],
    ['Is anyone else in your party able to get into the bag?', ask('who', 'verify', 'bag', { landing: 'flat' })],
    ['It looks like you changed the bag... (the fix, said as blame)', { kind: 'blame', landing: 'misfire' }],
  ],
  'run 2 (three misfires)': [
    ['What do you mean by transfer?', ask('what', 'contract', 'transfer')],
    ['What happens when Pell tries the party bag?', ask('what', 'contract', 'bag', { landing: 'critical' })],
    ['So has something happened to the bag, or... (fishing)', ask('what', 'random', 'bag', { landing: 'misfire' })],
    ['Why does it need to be Pell who has it?', ask('why', 'expand', 'pell', { landing: 'critical' })],
    ['I completely understand. So Pell needs the draught. (stock paraphrase)', paraphrase('pell', { landing: 'misfire', stock: true })],
    ['Can I take your order number? (wrong thing asked for)', ask('what', 'random', 'number', { landing: 'misfire' })],
    ['Your party bag was changed to Admin Only... (the fix)', { kind: 'fix', landing: 'flat' }],
  ],
  'run 4 (a fix she is not told the meaning of)': [
    ['What is stopping you moving the draught?', ask('what', 'contract', 'draught', { landing: 'flat' })],
    ['When you say transfer, what are you looking for?', ask('what', 'contract', 'transfer')],
    ['Can I take your name?', ask('who', 'expand', 'name')],
    ['Has anything changed, as far as you know?', ask('when', 'verify', 'changed')],
    ['So everyone could open it until now... (paraphrase)', paraphrase('bag')],
    ['Which party are you with?', ask('who', 'expand', 'party')],
    ['It was on Admin Only. I have taken it off. (the fix, in our words)', { kind: 'unclear-fix', landing: 'misfire' }],
  ],
};

const seed = Number(arg('seed', 1));
const calls = Number(arg('calls', 1000));

// ---- the calls, X beside Y ------------------------------------------------
console.log(`Sheet X beside Sheet Y, on the same draws (seed ${seed})`);
for (const [name, rows] of Object.entries(CALLS)) {
  console.log(`\n${name}`);
  const moves = rows.map((r) => r[1]);
  const x = shapeCall({ sheet: SHEETS.X, moves, rng: seededRng(seed) });
  const y = shapeCall({ sheet: SHEETS.Y, moves, rng: seededRng(seed) });
  rows.forEach(([said], i) => {
    console.log(`  AGENT  ${said}`);
    console.log(`    X    ${describeShape(x[i].shape)}`);
    console.log(`    Y    ${describeShape(y[i].shape)}`);
  });
}

// ---- the same three measures, new module and original engine --------------
const pct = (n, of) => `${Math.round((100 * n) / of)}%`;

function measureNew() {
  let answers = 0;
  let differ = 0;
  let withBaggage = 0;
  let repeats = 0;
  let reacted = 0;
  let total = 0;
  for (let s = 1; s <= calls; s++) {
    for (const rows of Object.values(CALLS)) {
      const moves = rows.map((r) => r[1]);
      const x = shapeCall({ sheet: SHEETS.X, moves, rng: seededRng(s) });
      const y = shapeCall({ sheet: SHEETS.Y, moves, rng: seededRng(s) });
      total += 2;
      for (const call of [x, y]) if (call.some((h) => h.shape.labels.baggage)) withBaggage++;
      x.forEach((h, i) => {
        answers++;
        if (describeShape(h.shape) !== describeShape(y[i].shape)) differ++;
        for (const one of [h, y[i]]) {
          if (one.move.kind !== 'paraphrase') continue;
          repeats++;
          // Fine with it, or settled by it, is nothing the agent would hear.
          if (one.shape.labels.repeat && !['fine with it', 'settled by it'].includes(one.shape.labels.repeat)) reacted++;
        }
      });
    }
  }
  return {
    differ: `${pct(differ, answers)} of answers differ between X and Y`,
    baggage: `${pct(withBaggage, total)} of calls`,
    repeat: `${pct(reacted, repeats)} of the time`,
  };
}

/** Her lines from one call of the original engine, as printed. */
function originalCall(baggage, s) {
  const moves = 'what expand 1; who expand 6; what contract 7; what validate 4; what validate 3; what expand 2 + who expand 5; id; look; read 7';
  let out;
  try {
    out = execFileSync('node', [path.join(__dirname, 'playTurns.js'), '--seed', String(s), '--baggage', baggage, '--moves', moves], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    // It exits non-zero when a scripted move is not on the board; what it
    // printed up to there is still her side of the call.
    out = err.stdout || '';
  }
  const lines = [];
  let hers = false;
  for (const row of out.split('\n')) {
    if (row.startsWith('SELLA')) { hers = true; lines.push(row.slice(5).trim()); } else if (hers && /^ {7}[^(\s]/.test(row)) lines[lines.length - 1] += ` ${row.trim()}`;
    else hers = false;
  }
  return lines;
}

function measureOriginal() {
  const kinds = { 'no-one-told-her': 'Nobody has ever sat down', 'pell-gets-hurt': "that's on me" };
  const seeds = [1, 2, 3, 4, 5, 6];
  let answers = 0;
  let differ = 0;
  let withBaggage = 0;
  let asked = 0;
  let reacted = 0;
  for (const s of seeds) {
    const x = originalCall('no-one-told-her', s);
    const y = originalCall('pell-gets-hurt', s);
    const n = Math.max(x.length, y.length);
    answers += n;
    for (let i = 0; i < n; i++) if (x[i] !== y[i]) differ++;
    for (const [kind, call] of [['no-one-told-her', x], ['pell-gets-hurt', y]]) {
      if (call.some((l) => l.includes(kinds[kind]))) withBaggage++;
      // "And the bag itself seems all right?" is put to her twice running.
      const twice = call.filter((l) => l.startsWith("The bag's fine"));
      asked++;
      if (twice.length < 2 || twice[0] !== twice[1]) reacted++;
    }
  }
  return {
    differ: `${pct(differ, answers)} of answers differ between the two kinds of baggage`,
    baggage: `${pct(withBaggage, seeds.length * 2)} of calls`,
    repeat: `${pct(reacted, asked)} of the time`,
  };
}

const fresh = measureNew();
const old = measureOriginal();
console.log('\nThe same three measures');
console.log(`  Does her sheet change her answers?`);
console.log(`    new module       ${fresh.differ} (${calls} seeds, three calls each)`);
console.log(`    original engine  ${old.differ} (6 seeds, one call each)`);
console.log(`  Does her baggage come out during a call?`);
console.log(`    new module       ${fresh.baggage}`);
console.log(`    original engine  ${old.baggage}`);
console.log("  Say her own words back, or ask the same thing twice: does it show?");
console.log(`    new module       ${fresh.repeat}`);
console.log(`    original engine  ${old.repeat}`);
