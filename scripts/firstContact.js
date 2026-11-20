'use strict';

/**
 * Plays many first calls with one customer sheet and reports what reactions
 * occurred, so it can be confirmed that her sheet and her five counts work
 * across sessions (Phil, 17 November). Each call is a fresh first contact:
 * she starts from her sheet every time, nothing carried.
 *
 * The middle of the call is free (Phil, 19 November; docs/card-rules.md,
 * 28-31). The opening is fixed and the case comes after; in between, the
 * apprentice chooses every move from what has happened so far: what she has
 * just said, which words she has put in play, what is still open, and how
 * many plays are left. No order is laid down. They can follow her lead, go
 * back, wander, fumble, look things up, or try a fix when they think they
 * have it.
 *
 *   node scripts/firstContact.js --sheet Y            (200 calls, 3 printed)
 *   node scripts/firstContact.js --sheet X --calls 500 --show 5
 *
 * Prints a few whole calls to read as a person would, how varied the paths
 * were and why calls were lost, what reactions occurred and how often, and
 * every place an answer went against her sheet. Her answer to the opening is
 * counted and checked with the rest.
 */

const { seededRng } = require('../src/call/rng');
const { SHEETS, KNOWS, shapeAnswer, describeShape } = require('../src/cards/answer');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
}

const sheet = SHEETS[arg('sheet', 'Y')];
const calls = Number(arg('calls', 200));
const show = Number(arg('show', 3));
if (!sheet) throw new Error('--sheet must be X, Y or Z');

const PLAYS = 9;
const OPENING = 'Thank you for contacting TLC, this is [Name]. How may I serve you?';
const IDENTIFY = ['name', 'number', 'account'];

/** The words each thing she says puts in play for the agent to ask about. */
const OPENS = {
  'cannot-transfer': ['transfer', 'draught', 'bag'],
  'pell-shut-out': ['pell', 'bag'],
  'leaves-in-the-morning': ['morning', 'contract'],
  'never-a-problem-before': ['before'],
  'at-it-since-last-night': ['tried'],
};

/** The suits that make sense for each word, the first the most natural. */
const SUITS = {
  working: ['what'], transfer: ['how', 'what'], draught: ['what', 'where'], bag: ['what', 'who', 'when'],
  pell: ['who', 'why', 'when'], morning: ['when'], contract: ['what', 'when'], before: ['when', 'what'],
  tried: ['what', 'how', 'when'], changed: ['what', 'when'], name: ['who'], number: ['what'], account: ['who', 'what'],
};

/** Phil's questions, as how often a new apprentice reaches for each. Guesses. */
const FOCUS = [
  ['what I did not understand', 0.35],
  ['what is most urgent', 0.3],
  ['what it told me', 0.2],
  ['what she did not tell me', 0.05],
  ['what is most interesting', 0.05],
  ['what is most concerning', 0.05],
];

/** How often a new apprentice reads what came back correctly (card rule 27). */
const READS_RIGHT = 0.65;

const pick = (list, rng) => list[Math.floor(rng() * list.length)];

function draw(table, rng) {
  let r = rng();
  for (const [name, weight] of table) {
    if (r < weight) return name;
    r -= weight;
  }
  return table[0][0];
}

/** How the apprentice's move came off: a draw on their own curve. */
function landing(rng) {
  const r = rng();
  if (r < 0.16) return 'misfire';
  if (r < 0.5) return 'flat';
  if (r < 0.93) return 'lands';
  return 'critical';
}

/** A question about a word, in a suit that fits it, now and then without choosing an angle. */
function question(word, rng, angle) {
  const random = rng() < 0.07;
  return {
    kind: 'question',
    suit: pick(SUITS[word] || ['what'], rng),
    angle: random ? 'random' : angle || pick(['expand', 'contract', 'contract', 'verify'], rng),
    subject: word,
    landing: random ? 'misfire' : landing(rng),
  };
}

/** What the agent knows so far, from the call itself. */
function freshState() {
  return { inPlay: ['working'], asked: [], identified: false, lookedUp: false, readRight: null, fixed: false, lastWord: 'working', lastGave: 2, baggageHeard: false };
}

/** The procedural steps still to do, in the order they depend on each other. */
function stepsLeft(st) {
  return (st.identified ? 0 : 1) + (st.lookedUp ? 0 : 1) + (st.fixed ? 0 : 1);
}

/** The next procedural step, as a move. */
function nextStep(st, rng) {
  if (!st.identified) return question(pick(IDENTIFY, rng), rng, 'expand');
  if (!st.lookedUp) return { kind: 'lookup' };
  return fixMove(st, rng);
}

/** A fix, right or not, from how the apprentice read what they looked up. */
function fixMove(st, rng) {
  if (st.readRight) return { kind: rng() < 0.3 ? 'unclear-fix' : 'fix' };
  return { kind: rng() < 0.33 ? 'blame' : 'wrong-fix' };
}

/**
 * One move by a new apprentice, chosen from the call so far.
 *
 * When the plays left are no more than the steps still to do, they take the
 * next step (card rules; the apprentice's sheet of 14 November). Otherwise
 * they reach for one of Phil's questions and act on it.
 */
function choose(st, left, rng) {
  if (left <= stepsLeft(st)) return nextStep(st, rng);
  if (st.lookedUp && !st.fixed && rng() < 0.4) return fixMove(st, rng);
  const unasked = st.inPlay.filter((w) => !st.asked.includes(w));
  switch (draw(FOCUS, rng)) {
    case 'what I did not understand':
      // Her last answer left them short: go back to it. Otherwise something she raised.
      if (st.lastGave < 2) return question(st.lastWord, rng, 'contract');
      return question(unasked.length ? pick(unasked, rng) : pick(st.inPlay, rng), rng);
    case 'what is most urgent':
      if (st.inPlay.includes('morning') && !st.asked.includes('morning')) return question('morning', rng);
      return nextStep(st, rng);
    case 'what it told me':
      return { kind: 'paraphrase', suit: 'what', angle: 'validate', subject: st.lastWord, landing: landing(rng), stock: rng() < 0.3 };
    case 'what she did not tell me':
      return question(unasked.length ? pick(unasked, rng) : 'changed', rng);
    case 'what is most interesting':
      return question(st.baggageHeard && st.inPlay.includes('pell') ? 'pell' : pick(st.inPlay, rng), rng);
    default:
      return question('changed', rng, 'verify');
  }
}

/** What a move and her answer tell the agent, for choosing the next one. */
function learn(st, move, shape, rng) {
  const next = { ...st, asked: [...st.asked], inPlay: [...st.inPlay] };
  if (move.kind === 'lookup') return { ...next, lookedUp: true, readRight: rng() < READS_RIGHT };
  if (['fix', 'unclear-fix', 'blame'].includes(move.kind)) next.fixed = true;
  if (move.kind === 'wrong-fix') next.readRight = rng() < READS_RIGHT;
  if (move.subject) {
    if (!next.asked.includes(move.subject)) next.asked.push(move.subject);
    if (IDENTIFY.includes(move.subject) && shape.gives.some((g) => g.startsWith('her-'))) next.identified = true;
    if (!IDENTIFY.includes(move.subject)) { next.lastWord = move.subject; next.lastGave = shape.gives.length; }
  }
  for (const g of shape.gives) for (const w of OPENS[g] || []) if (!next.inPlay.includes(w)) next.inPlay.push(w);
  if (shape.labels.baggage) next.baggageHeard = true;
  return next;
}

/** The move in a few words, for the printed calls. */
function sayMove(m) {
  if (m.kind === 'paraphrase') return `paraphrase about ${m.subject}${m.stock ? ', with a stock line' : ''}`;
  if (m.kind === 'question') return `${m.suit}·${m.angle} ${m.subject} (${m.landing})`;
  return { lookup: '(looks her up in the record)', 'wrong-fix': 'a wrong fix', fix: 'the fix', 'unclear-fix': 'the fix, in words she may not follow', blame: 'the fix, said as her fault' }[m.kind];
}

/**
 * One first call: the opening, then up to nine plays chosen as it goes. A
 * right fix ends the customer's part of the call; the case comes after and
 * is not played here.
 */
function playCall(rng) {
  let current = sheet;
  let st = freshState();
  // Her answer to the opening, which is free (card rules 2 and 28). It is
  // part of what she has said, so later answers start from it.
  const openingMove = { kind: 'question', suit: 'what', angle: 'expand', subject: 'working' };
  const opening = shapeAnswer({ sheet: current, move: openingMove, rng });
  current = opening.sheet;
  st = learn(st, openingMove, opening, rng);
  const call = [];
  const history = [{ move: openingMove, shape: opening }];
  for (let play = 0; play < PLAYS && !st.fixed; play++) {
    const move = choose(st, PLAYS - play, rng);
    if (move.kind === 'lookup') {
      call.push({ move, shape: null });
      st = learn(st, move, null, rng);
      continue;
    }
    const shape = shapeAnswer({ sheet: current, move, history, rng });
    current = shape.sheet;
    history.push({ move, shape });
    call.push({ move, shape });
    st = learn(st, move, shape, rng);
  }
  return { opening, call, history, fixed: st.fixed, st };
}

/**
 * Every way an answer can go against her sheet, from the record's wording
 * for each band (settled.md section 8, Fields) and what she knows.
 */
function against(s, history, i) {
  const out = [];
  const { move, shape } = history[i];
  const earlier = history.slice(0, i);
  const ids = KNOWS.map((k) => k.id);
  for (const g of shape.gives) if (!ids.includes(g) && !g.startsWith('her-')) out.push(`gave something she does not know: ${g}`);
  if (shape.labels.baggage && shape.labels.baggage !== s.baggage) out.push(`baggage not hers: ${shape.labels.baggage}`);
  const firstRepeat = shape.degrees.likeness === 1 && earlier.every((h) => h.shape.degrees.likeness === 0);
  const expected = { low: 'reads it as not listening', middle: 'fine with it', high: 'settled by it' }[s.repetition];
  if (firstRepeat && shape.labels.repeat !== expected) out.push(`first repeat read as "${shape.labels.repeat}", sheet says "${expected}"`);
  if (s.repetition === 'middle' && shape.labels.repeat === 'reads it as not listening') out.push('middle tolerance read a repeat as not listening');
  if (s.repetition === 'low' && ['fine with it', 'settled by it'].includes(shape.labels.repeat)) out.push(`low tolerance was ${shape.labels.repeat}`);
  if (s.empathy !== 'high' && ['lets them off', 'hears the stock line'].includes(shape.labels.towardAgent)) out.push(`${s.empathy} empathy: ${shape.labels.towardAgent}`);
  if (s.empathy === 'high' && ['gets short', 'no warmth'].includes(shape.labels.towardAgent)) out.push(`high empathy: ${shape.labels.towardAgent}`);
  if (s.pattern === 'low' && shape.labels.pattern) out.push(`low pattern sense heard: ${shape.labels.pattern}`);
  const misses = history.slice(0, i + 1).filter((h) => h.move.kind === 'wrong-fix').length;
  if (shape.labels.afterFix === 'asks for someone else' && s.nonPositive === 'low' && misses < 2) out.push('asked for someone else after one miss');
  if (shape.labels.afterFix === 'asks for someone else' && s.nonPositive === 'high') out.push('high tolerance asked for someone else');
  if (shape.belief) {
    const right = s.causes.includes('update') && !s.causes.includes('own-setting');
    if (shape.belief.right !== right) out.push(`belief right=${shape.belief.right} on a sheet where it is ${right}`);
  }
  if (move.kind === 'question' && move.subject && !IDENTIFY.includes(move.subject) && shape.degrees.ownPoint > 0) out.push('left a question about her own problem');
  return out;
}

const tally = {};
const count = (key) => { tally[key] = (tally[key] || 0) + 1; };
const problems = [];
const paths = new Set();
const firstMoves = {};
const identifiedAt = {};
const endings = {};
const lost = {};
let answers = 0;

console.log(`Sheet ${sheet.id}: ${sheet.baggage} · repetition ${sheet.repetition} · empathy ${sheet.empathy} · pattern ${sheet.pattern} · non-positive ${sheet.nonPositive} · ${sheet.reach} · ${sheet.causes.join(' + ')}`);
console.log(`${calls} first calls, each a fresh first contact. The middle of each is chosen as it goes.\n`);

for (let n = 1; n <= calls; n++) {
  const rng = seededRng(5000 + n);
  const { opening, call, history, fixed, st } = playCall(rng);
  if (n <= show) {
    console.log(`Call ${n}`);
    console.log(`  AGENT  ${OPENING}\n  SELLA  ${describeShape(opening)}`);
    for (const { move, shape } of call) console.log(`  AGENT  ${sayMove(move)}${shape ? `\n  SELLA  ${describeShape(shape)}` : ''}`);
    console.log(`  (the case is written after; ${call.length} plays used, ${fixed ? 'fixed' : 'not fixed'})\n`);
  }
  paths.add(call.map((c) => sayMove(c.move).replace(/ \(.*\)$/, '')).join(' > '));
  const first = sayMove(call[0].move).replace(/ \(.*\)$/, '');
  firstMoves[first] = (firstMoves[first] || 0) + 1;
  const at = call.findIndex((c) => c.move.subject && IDENTIFY.includes(c.move.subject));
  const where = at === -1 ? 'never' : `play ${at + 1}`;
  identifiedAt[where] = (identifiedAt[where] || 0) + 1;
  const end = `${fixed ? 'fixed' : 'not fixed'}, ${call.length} plays`;
  endings[end] = (endings[end] || 0) + 1;
  if (!fixed) {
    const why = !st.identified ? 'never found out who she is, so never looked her up' : 'misread the record, and the last fix was wrong';
    lost[why] = (lost[why] || 0) + 1;
  }
  // Every answer she gave, the opening included, is tallied and checked.
  history.forEach(({ shape }, i) => {
    answers++;
    count(`says ${shape.says}`);
    for (const [key, value] of Object.entries(shape.labels)) if (value && !(key === 'takes' && value === 'answers')) count(`${key}: ${value}`);
    for (const p of against(sheet, history, i)) problems.push(`call ${n}, answer ${i}: ${p}`);
  });
}

const sorted = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
console.log(`How free the middle was`);
console.log(`  different paths through the call: ${paths.size} of ${calls}`);
console.log(`  first move after the opening: ${sorted(firstMoves).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`  asked who she is at: ${sorted(identifiedAt).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`  how calls ended: ${sorted(endings).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`  why calls were not fixed: ${sorted(lost).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`\nWhat occurred, over ${answers} answers`);
for (const [key, n] of Object.entries(tally).sort()) console.log(`  ${key.padEnd(48)} ${n}`);
console.log(`\nAgainst her sheet: ${problems.length}`);
for (const p of problems.slice(0, 20)) console.log(`  ${p}`);
