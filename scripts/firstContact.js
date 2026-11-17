'use strict';

/**
 * Plays many first calls with one customer sheet and reports what reactions
 * occurred, so it can be confirmed that her sheet and her five counts work
 * across sessions (Phil, 17 November). Each call is a fresh first contact:
 * she starts from her sheet every time, nothing carried.
 *
 * The agent is a new apprentice whose moves vary from call to call: what
 * they ask about, how, whether they paraphrase, ask who she is, or fumble,
 * and how each move lands. Her answers come from `src/cards/answer.js`.
 *
 *   node scripts/firstContact.js --sheet Y            (200 calls, 3 printed)
 *   node scripts/firstContact.js --sheet X --calls 500 --show 5
 *
 * Prints a few whole calls to read as a person would, what reactions
 * occurred and how often, and every place an answer went against her sheet.
 */

const { seededRng } = require('../src/call/rng');
const { SHEETS, KNOWS, shapeCall, describeShape } = require('../src/cards/answer');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
}

const sheet = SHEETS[arg('sheet', 'Y')];
const calls = Number(arg('calls', 200));
const show = Number(arg('show', 3));
if (!sheet) throw new Error('--sheet must be X, Y or Z');

const SUBJECTS = ['working', 'bag', 'draught', 'transfer', 'pell', 'morning', 'before', 'tried', 'changed'];
const SUITS = { working: 'what', bag: 'what', draught: 'what', transfer: 'how', pell: 'who', morning: 'when', before: 'when', tried: 'what', changed: 'what' };
const ANGLES = ['expand', 'contract', 'contract', 'verify'];
const pick = (list, rng) => list[Math.floor(rng() * list.length)];

/** How the apprentice's move came off: a draw on their own curve. */
function landing(rng) {
  const r = rng();
  if (r < 0.16) return 'misfire';
  if (r < 0.5) return 'flat';
  if (r < 0.93) return 'lands';
  return 'critical';
}

/**
 * Nine moves by a new apprentice. They open on the problem, find out who she
 * is somewhere in the first half, ask about what she has raised, sometimes
 * paraphrase or go back over a word, and fix it in the last plays, sometimes
 * wrongly first or in words she does not follow.
 */
function apprentice(rng) {
  const moves = [{ kind: 'question', suit: 'what', angle: 'expand', subject: 'working', landing: landing(rng) }];
  const nameAt = 1 + Math.floor(rng() * 4);
  let last = 'working';
  while (moves.length < 7) {
    if (moves.length === nameAt) {
      moves.push({ kind: 'question', suit: 'who', angle: 'expand', subject: pick(['name', 'name', 'number', 'account'], rng), landing: landing(rng) });
      continue;
    }
    const r = rng();
    const land = landing(rng);
    if (r < 0.15) moves.push({ kind: 'paraphrase', suit: 'what', angle: 'validate', subject: last, landing: land, stock: rng() < 0.3 });
    else if (r < 0.3) moves.push({ kind: 'question', suit: SUITS[last], angle: pick(ANGLES, rng), subject: last, landing: land });
    else if (r < 0.37) moves.push({ kind: 'question', suit: SUITS[last], angle: 'random', subject: last, landing: 'misfire' });
    else {
      last = pick(SUBJECTS, rng);
      moves.push({ kind: 'question', suit: SUITS[last], angle: pick(ANGLES, rng), subject: last, landing: land });
    }
  }
  const ending = rng();
  if (ending < 0.2) moves.push({ kind: 'wrong-fix' }, { kind: 'wrong-fix' });
  else if (ending < 0.35) moves.push({ kind: 'wrong-fix' }, { kind: 'fix' });
  else if (ending < 0.5) moves.push({ kind: 'question', suit: 'what', angle: 'contract', subject: last, landing: landing(rng) }, { kind: 'blame' });
  else if (ending < 0.65) moves.push({ kind: 'question', suit: 'what', angle: 'contract', subject: last, landing: landing(rng) }, { kind: 'unclear-fix' });
  else moves.push({ kind: 'question', suit: 'what', angle: 'contract', subject: last, landing: landing(rng) }, { kind: 'fix' });
  return moves;
}

/** The move in a few words, for the printed calls. */
function sayMove(m) {
  if (m.kind === 'paraphrase') return `paraphrase about ${m.subject}${m.stock ? ', with a stock line' : ''}`;
  if (m.kind === 'question') return `${m.suit}·${m.angle} ${m.subject} (${m.landing})`;
  return { 'wrong-fix': 'a wrong fix', fix: 'the fix', 'unclear-fix': 'the fix, in words she may not follow', blame: 'the fix, said as her fault' }[m.kind];
}

/**
 * Every way an answer can go against her sheet, from the record's wording
 * for each band (settled.md section 8, Fields) and what she knows.
 */
function against(s, call, i) {
  const out = [];
  const { move, shape } = call[i];
  const earlier = call.slice(0, i);
  const ids = KNOWS.map((k) => k.id);
  for (const g of shape.gives) if (!ids.includes(g) && !g.startsWith('her-')) out.push(`gave something she does not know: ${g}`);
  if (shape.labels.baggage && shape.labels.baggage !== s.baggage) out.push(`baggage not hers: ${shape.labels.baggage}`);
  const firstRepeat = shape.degrees.likeness === 1 && earlier.every((h) => h.shape.degrees.likeness === 0);
  const expected = { low: 'reads it as not listening', middle: 'fine with it', high: 'settled by it' }[s.repetition];
  if (firstRepeat && shape.labels.repeat !== expected) out.push(`first repeat read as "${shape.labels.repeat}", sheet says "${expected}"`);
  if (s.repetition === 'middle' && shape.labels.repeat === 'reads it as not listening') out.push('middle tolerance read a repeat as not listening');
  if (s.empathy !== 'high' && ['lets them off', 'hears the stock line'].includes(shape.labels.towardAgent)) out.push(`${s.empathy} empathy: ${shape.labels.towardAgent}`);
  if (s.empathy === 'high' && ['gets short', 'no warmth'].includes(shape.labels.towardAgent)) out.push(`high empathy: ${shape.labels.towardAgent}`);
  if (s.pattern === 'low' && shape.labels.pattern) out.push(`low pattern sense heard: ${shape.labels.pattern}`);
  const misses = call.slice(0, i + 1).filter((h) => h.move.kind === 'wrong-fix').length;
  if (shape.labels.afterFix === 'asks for someone else' && s.nonPositive === 'low' && misses < 2) out.push('asked for someone else after one miss');
  if (shape.labels.afterFix === 'asks for someone else' && s.nonPositive === 'high') out.push('high tolerance asked for someone else');
  if (shape.belief) {
    const right = s.causes.includes('update') && !s.causes.includes('own-setting');
    if (shape.belief.right !== right) out.push(`belief right=${shape.belief.right} on a sheet where it is ${right}`);
  }
  if (move.kind === 'question' && move.subject && !['name', 'number', 'account', 'party'].includes(move.subject) && shape.degrees.ownPoint > 0) out.push('left a question about her own problem');
  return out;
}

const tally = {};
const count = (key) => { tally[key] = (tally[key] || 0) + 1; };
const problems = [];
let answers = 0;

console.log(`Sheet ${sheet.id}: ${sheet.baggage} · repetition ${sheet.repetition} · empathy ${sheet.empathy} · pattern ${sheet.pattern} · non-positive ${sheet.nonPositive} · ${sheet.reach} · ${sheet.causes.join(' + ')}`);
console.log(`${calls} first calls, each a fresh first contact.\n`);

for (let n = 1; n <= calls; n++) {
  const rng = seededRng(5000 + n);
  const moves = apprentice(rng);
  const call = shapeCall({ sheet, moves, rng });
  if (n <= show) {
    console.log(`Call ${n}`);
    for (const { move, shape } of call) console.log(`  AGENT  ${sayMove(move)}\n  SELLA  ${describeShape(shape)}`);
    console.log('');
  }
  call.forEach(({ shape }, i) => {
    answers++;
    count(`says ${shape.says}`);
    for (const [key, value] of Object.entries(shape.labels)) if (value && !(key === 'takes' && value === 'answers')) count(`${key}: ${value}`);
    for (const p of against(sheet, call, i)) problems.push(`call ${n}, play ${i + 1}: ${p}`);
  });
}

console.log(`What occurred, over ${answers} answers`);
for (const [key, n] of Object.entries(tally).sort()) console.log(`  ${key.padEnd(48)} ${n}`);
console.log(`\nAgainst her sheet: ${problems.length}`);
for (const p of problems.slice(0, 20)) console.log(`  ${p}`);
