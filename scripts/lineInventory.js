'use strict';

/**
 * What she can be asked, against what she can say back.
 *
 * A call reads as a conversation only if the reply depends on the question.
 * This counts both sides of every scenario, straight from the data the engine
 * speaks from, and then plays calls to count how often each kind of reply is
 * actually heard. It measures; it does not judge whether a line is good.
 *
 *   node scripts/lineInventory.js
 *   node scripts/lineInventory.js --runs 2000
 *   node scripts/lineInventory.js --csv /tmp/lines.csv   (one row per question)
 */

const fs = require('fs');
const { seededRng } = require('../src/call/rng');
const { playCall, SUITS, ANGLES } = require('../src/cards/call');
const { legal } = require('../src/cards/suits');
const A = require('../src/cards/cardAgents');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
}

const RUNS = Number(arg('runs', 2000));
const CSV = arg('csv', null);
const SCENARIOS = { batch: require('../src/cards/case'), bag: require('../src/cards/bag') };

/** The question the engine would ask, by replaying its own generator. */
function questionFor(sc, suit, angle, subject) {
  const written = sc.QUESTIONS && sc.QUESTIONS[subject] && sc.QUESTIONS[subject][`${suit}/${angle}`];
  return { text: written || null, written: !!written };
}

const rows = [];
const summary = [];

for (const [name, sc] of Object.entries(SCENARIOS)) {
  const subjects = sc.SUBJECTS;
  let cells = 0;
  let written = 0;
  let nonsense = 0;
  for (const subject of subjects) {
    for (const suit of SUITS) {
      for (const angle of ANGLES) {
        if (legal(suit, angle, 'customer')) continue;
        cells += 1;
        const q = questionFor(sc, suit, angle, subject);
        const odd = sc.nonsense(suit, subject);
        if (q.written) written += 1;
        if (odd) nonsense += 1;
        const reply = odd
          ? '(a clue from the fragment pool)'
          : sc.BASELINE[subject] || (sc.BELIEFS[subject] && sc.BELIEFS[subject].any) || "I couldn't say.";
        rows.push([name, subject, suit, angle, q.written ? 'written' : 'stem', odd ? 'nonsense cell' : 'sensible', q.text || '', reply]);
      }
    }
  }
  const landedLines = new Set(subjects.map((s) => sc.BASELINE[s]).filter(Boolean));
  const deflections = (sc.OBLIQUE || []).length || 6;
  const departures = sc.CAUSES.reduce((n, c) => n + c.departures.length, 0);
  const herrings = Object.keys(sc.HERRINGS || {}).length;
  const fragments =
    Object.values(sc.FRAGMENTS || {}).reduce((n, f) => n + f.length, 0) +
    (sc.FRAGMENT_FALLBACK || []).length;
  const sensible = cells - nonsense;
  summary.push({
    name,
    subjects: subjects.length,
    cells,
    written,
    nonsense,
    sensible,
    landedLines: landedLines.size,
    deflections,
    departures,
    herrings,
    fragments,
    perSuit: subjects.length * SUITS.length,
  });
}

console.log('== 1. WHAT CAN BE ASKED, AND WHAT CAN COME BACK (counted from the scenario data) ==');
for (const s of summary) {
  const herLines = s.landedLines + s.deflections + s.departures + s.herrings + s.fragments;
  console.log(`\n  ${s.name}`);
  console.log(`    subjects she can be asked about            ${s.subjects}`);
  console.log(`    questions the player can put to her        ${s.cells}   (subjects x 6 suits x 4 angles)`);
  console.log(`      written out by hand                      ${s.written}`);
  console.log(`      assembled from a stem and a label        ${s.cells - s.written}`);
  console.log(`      cells marked as making no sense          ${s.nonsense}`);
  console.log(`    lines she has, in total                    ${herLines}`);
  console.log(`      one stock answer per subject             ${s.landedLines}`);
  console.log(`      deflections, picked at random on a miss  ${s.deflections}`);
  console.log(`      ways of describing a cause               ${s.departures}`);
  console.log(`      true-but-innocent departures             ${s.herrings}`);
  console.log(`      clues for a question that made no sense  ${s.fragments}`);
  console.log(`    sensible questions per stock answer        ${(s.sensible / s.landedLines).toFixed(1)}`);
  console.log(`    answers needed for the reply to follow`);
  console.log(`      the suit (subjects x 6)                  ${s.perSuit}   — has ${s.landedLines}`);
}

console.log('\n== 2. WHAT IS ACTUALLY HEARD (played calls, every agent sheet) ==');
const SHEETS = [
  ['apprentice', () => A.makeCardAgent({})],
  ['Pooh', () => A.makePooh()],
  ['Rabbit', () => A.makeRabbit()],
  ['Tigger', () => A.makeTigger()],
  ['Piglet', () => A.makePiglet()],
  ['Eeyore', () => A.makeEeyore()],
  ['Watson', () => A.makeWatson()],
  ['Holmes', () => A.makeHolmes()],
];
for (const [name, sc] of Object.entries(SCENARIOS)) {
  const stock = new Set(sc.SUBJECTS.map((s) => sc.BASELINE[s]).filter(Boolean));
  const deflect = new Set(sc.OBLIQUE || [
    "That's more Hald's end than mine.",
    "I'd have to look, and I've the hall to open.",
    "Does that matter? It came back wrong, that's what matters.",
    "I couldn't tell you offhand.",
    "You'd have to ask Hald about that one.",
    "I've not got that in front of me.",
  ]);
  const t = { exchanges: 0, stock: 0, deflect: 0, other: 0, calls: 0, callsRepeat: 0 };
  // Things the agent says to her that are not questions about a subject:
  // asking for a number, a hold, a remedy, the closing. Her replies to those
  // are fixed by design and would inflate every figure below.
  const notQuestions = new Set([
    'Have you got a number on anything in front of you?',
    'Can you hold while I check with someone?',
    "This one's Dispatch. Putting you through.",
    "We've got that documented, and are forwarding the case for follow-up later today.",
    'Let me get you someone senior. One moment.',
  ]);
  for (const c of sc.CAUSES) notQuestions.add(c.fix.line);
  for (const r of Object.values(sc.REMEDIES || {})) notQuestions.add(r.line);
  const perSheet = Math.max(1, Math.floor(RUNS / SHEETS.length));
  for (const [, make] of SHEETS) {
    for (let i = 0; i < perSheet; i += 1) {
      const out = playCall({ agent: make(), rng: seededRng(1000 + i), scenario: sc });
      t.calls += 1;
      const said = [];
      for (let k = 0; k < out.lines.length - 1; k += 1) {
        const a = out.lines[k];
        const b = out.lines[k + 1];
        if (a.who !== 'YOU' || b.who !== 'HER') continue;
        if (notQuestions.has(a.text)) continue;
        t.exchanges += 1;
        if (stock.has(b.text)) t.stock += 1;
        else if (deflect.has(b.text)) t.deflect += 1;
        else t.other += 1;
        said.push(b.text);
      }
      if (new Set(said).size < said.length) t.callsRepeat += 1;
    }
  }
  const pct = (n, d) => `${((100 * n) / d).toFixed(1)}%`;
  console.log(`\n  ${name}   ${t.calls} calls, ${t.exchanges} questions put to her`);
  console.log(`    her reply was the subject's one stock line      ${pct(t.stock, t.exchanges)}`);
  console.log(`    her reply was a deflection picked at random     ${pct(t.deflect, t.exchanges)}`);
  console.log(`    her reply was anything else                     ${pct(t.other, t.exchanges)}   (a cause described, an innocent departure, a clue)`);
  console.log(`    calls where two questions got the same sentence ${pct(t.callsRepeat, t.calls)}`);
}

console.log('\n== 3. HOW FAST SHE RUNS OUT (one player, the same scenario, call after call) ==');
for (const [name, sc] of Object.entries(SCENARIOS)) {
  const TRIALS = 200;
  const marks = [1, 3, 5, 10, 20];
  const seenAt = marks.map(() => 0);
  const newAt = marks.map(() => 0);
  let pool = 0;
  for (let trial = 0; trial < TRIALS; trial += 1) {
    const seen = new Set();
    for (let call = 1; call <= 20; call += 1) {
      const out = playCall({ agent: A.makeCardAgent({}), rng: seededRng(trial * 100 + call), scenario: sc });
      let fresh = 0;
      let total = 0;
      for (const l of out.lines) {
        if (l.who !== 'HER') continue;
        total += 1;
        if (!seen.has(l.text)) fresh += 1;
        seen.add(l.text);
      }
      const m = marks.indexOf(call);
      if (m !== -1) {
        seenAt[m] += seen.size;
        newAt[m] += total ? fresh / total : 0;
      }
    }
    pool = Math.max(pool, seen.size);
  }
  console.log(`\n  ${name}   (most distinct lines any one player heard from her in 20 calls: ${pool})`);
  console.log('    after call   distinct lines heard so far   share of that call she had not said before');
  marks.forEach((m, i) => {
    console.log(`    ${String(m).padStart(10)}   ${(seenAt[i] / TRIALS).toFixed(1).padStart(27)}   ${`${((100 * newAt[i]) / TRIALS).toFixed(0)}%`.padStart(42)}`);
  });
}

if (CSV) {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ['scenario', 'subject', 'suit', 'angle', 'question source', 'cell', 'written question', 'her reply if it lands'];
  fs.writeFileSync(CSV, [head, ...rows].map((r) => r.map(esc).join(',')).join('\n') + '\n');
  console.log(`\nwrote ${rows.length} rows to ${CSV}`);
}
