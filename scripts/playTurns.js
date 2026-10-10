'use strict';

/**
 * Play the bag call in turns of one or two inquiries.
 *
 * Prints the conversation and nothing else. What she weighed, which inquiry
 * she took and why, her mood and her word choices are written to
 * `logs/bag-seed-<seed>.log` for anyone who wants them.
 *
 *   node scripts/playTurns.js                      (asks you, turn by turn)
 *   node scripts/playTurns.js --seed 4 --baggage no-one-told-her
 *   node scripts/playTurns.js --moves "what expand 1; what contract 2 + who expand 3"
 *   node scripts/playTurns.js --picks 2000         (how she chooses, counted)
 *
 * A turn is typed as one of:
 *   <suit> <angle> <n>                           one inquiry at target n
 *   <suit> <angle> <n> + <suit> <angle> <n>      two inquiries in one turn
 *   id · look · read <n> · fix <n> · transfer · quit
 */

const fs = require('fs');
const { seededRng } = require('../src/call/rng');
const { playTurns } = require('../src/cards/turn');
const REPLY = require('../src/cards/reply');
const SHEET = require('../src/cards/sheet');
const REC = require('../src/cards/record');
const { SUITS, ANGLES } = require('../src/cards/suits');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
}

const scenario = require('../src/cards/bag');
const rec = scenario.record || REC.RECORD;
const seed = Number(arg('seed', Math.floor(Date.now() % 100000)));
const baggage = arg('baggage', undefined);
const scripted = arg('moves', null);
const countPicks = arg('picks', null);
const HER = scenario.CALLER.name.split(' ')[0].toUpperCase();
const path = require('path');
const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG = path.join(LOG_DIR, `bag-seed-${seed}.log`);

/** Everything about her side of each turn, for the file and not the screen. */
function writeLog(out) {
  const rows = [`the bag call · seed ${seed} · she is carrying: ${out.sheet.baggage.id}`, ''];
  let turn = 0;
  for (const l of out.lines) {
    if (l.who === 'YOU') rows.push(`YOU   ${l.text}`);
    else if (l.who === 'HER') rows.push(`${HER}   ${l.text}`);
    else rows.push(`      ${l.text}`);
    if (!l.template) continue;
    turn += 1;
    const o = l.odds;
    const pc = (n) => `${Math.round(100 * n)}%`;
    rows.push(`      -- turn at her ${turn}: mood ${Number(l.mood).toFixed(1)} · odds first ${pc(o.first)} second ${pc(o.second)} both ${pc(o.both)} own way ${pc(o.random)}`);
    for (const r of REPLY.render(l.template, scenario.label)) rows.push(`      -- ${r}`);
    rows.push('');
  }
  if (!out.paused) rows.push(`ending: ${out.ending} · turns ${out.turns} · cause ${out.cause} · heard from her: ${out.found}`);
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(LOG, rows.join('\n') + '\n');
}


// ---- how she chooses, counted -------------------------------------------
if (countPicks) {
  const N = Number(countPicks);
  const subjects = scenario.SUBJECTS;
  const tally = (label, make) => {
    const t = { first: 0, second: 0, both: 0, random: 0 };
    for (let i = 0; i < N; i += 1) {
      const rng = seededRng(900 + i);
      const kinds = Object.values(scenario.BAGGAGE);
      const sheet = SHEET.newSheet({ who: 'x', baggage: kinds[i % kinds.length], rng, subjects });
      const inquiries = make(sheet, rng);
      t[REPLY.choose({ sc: scenario, sheet, inquiries, state: {}, rng })] += 1;
    }
    const pc = (n) => `${((100 * n) / N).toFixed(0)}%`.padStart(5);
    console.log(`  ${label.padEnd(52)} first ${pc(t.first)}  second ${pc(t.second)}  both ${pc(t.both)}  own way ${pc(t.random)}`);
  };
  const rand = (arr, rng) => arr[Math.floor(rng() * arr.length)];
  const fitting = (s) => (scenario.SUIT_FIT[s] || ['what'])[0];
  const wardOf = (sheet, w) => subjects.filter((s) => SHEET.ward(sheet, s) === w);
  console.log(`\nHow she chooses — ${N} callers per row, the bag call, first turn\n`);
  tally('one inquiry, a suit that fits', (sh, rng) => {
    const s = rand(subjects, rng);
    return [{ suit: fitting(s), angle: 'contract', subject: s }];
  });
  tally('one inquiry, a suit that makes no sense for it', (sh, rng) => {
    const s = rand(subjects.filter((x) => (scenario.SUIT_NONSENSE[x] || []).length), rng);
    return [{ suit: scenario.SUIT_NONSENSE[s][0], angle: 'contract', subject: s }];
  });
  tally('two inquiries, both fitting', (sh, rng) => {
    const a = rand(subjects, rng);
    const b = rand(subjects.filter((x) => x !== a), rng);
    return [{ suit: fitting(a), angle: 'contract', subject: a }, { suit: fitting(b), angle: 'contract', subject: b }];
  });
  tally('two: first on something she guards, second open', (sh, rng) => {
    const a = rand(wardOf(sh, 3).length ? wardOf(sh, 3) : subjects, rng);
    const open = wardOf(sh, 1).filter((x) => x !== a);
    const b = rand(open.length ? open : subjects.filter((x) => x !== a), rng);
    return [{ suit: fitting(a), angle: 'contract', subject: a }, { suit: fitting(b), angle: 'contract', subject: b }];
  });
  tally('two: first fits, second makes no sense', (sh, rng) => {
    const a = rand(subjects, rng);
    const b = rand(subjects.filter((x) => x !== a && (scenario.SUIT_NONSENSE[x] || []).length), rng);
    return [{ suit: fitting(a), angle: 'contract', subject: a }, { suit: scenario.SUIT_NONSENSE[b][0], angle: 'contract', subject: b }];
  });
  tally('two: both make no sense', (sh, rng) => {
    const pool = subjects.filter((x) => (scenario.SUIT_NONSENSE[x] || []).length);
    const a = rand(pool, rng);
    const b = rand(pool.filter((x) => x !== a), rng);
    return [{ suit: scenario.SUIT_NONSENSE[a][0], angle: 'contract', subject: a }, { suit: scenario.SUIT_NONSENSE[b][0], angle: 'contract', subject: b }];
  });
  process.exit(0);
}

// ---- play it --------------------------------------------------------------
const WIDTH = 74;
function wrap(text, indent) {
  return String(text)
    .split('\n')
    .map((para) => {
      const rows = [];
      let row = '';
      for (const w of para.split(' ')) {
        if ((row + ' ' + w).trim().length > WIDTH - indent.length) {
          rows.push(row.trim());
          row = w;
        } else row += ' ' + w;
      }
      if (row.trim()) rows.push(row.trim());
      return rows.join('\n' + indent);
    })
    .join('\n' + indent);
}

function run(moves) {
  let i = 0;
  const agent = { name: 'you', choose: () => (i < moves.length ? moves[i++] : { kind: 'pause' }) };
  return playTurns({ agent, rng: seededRng(seed), scenario, baggage });
}

function nameOf(t) {
  if (t.cls === 'record') {
    const n = REC.node(rec, t.id);
    return `${n ? n.spoken : t.id}  (record)`;
  }
  return (scenario.TALK.LABELS && scenario.TALK.LABELS[t.id]) || scenario.label(t.id);
}

function show(view) {
  console.log(`\n  ${view.left} of nine turns left. In front of you, and how you can ask:`);
  view.board.targets.forEach((t, n) => {
    let how = '';
    if (t.cls === 'customer') {
      const bySuit = {};
      for (const k of view.canAsk[t.id] || []) {
        const [suit, angle] = k.split('/');
        (bySuit[suit] = bySuit[suit] || []).push(angle);
      }
      // A suit with all four angles is shown by its name alone.
      how = Object.entries(bySuit).map(([suit, angles]) => (angles.length === 4 ? suit : `${suit} (${angles.join(' ')})`)).join(' · ');
    }
    console.log(`    ${n + 1}. ${nameOf(t).padEnd(28)}${how}`);
  });
  if (!view.handle) console.log('    (id asks her for something to search on)');
  else console.log('    (look shows what the record holds; read <n> opens a row)');
  if (view.candidates.length) {
    console.log('  You could offer:');
    view.candidates.forEach((f, n) => {
      const no = view.refused.includes(f) ? '  (she turned this down)' : '';
      console.log(`    fix ${n + 1}. "${view.remedyLines[f].slice(0, 56)}…"${no}`);
    });
  }
}

function parseInquiry(text, view) {
  const [a, b, c] = text.trim().toLowerCase().split(/\s+/);
  if (!SUITS.includes(a)) return `"${a}" is not a suit: ${SUITS.join(' ')}.`;
  if (!ANGLES.includes(b)) return `After a suit comes an angle: ${ANGLES.join(' ')}.`;
  const n = Number(c);
  const t = Number.isInteger(n) ? view.board.targets[n - 1] : view.board.targets.find((x) => x.id === c);
  if (!t) return 'Then the number of something in front of you.';
  if (t.cls === 'record') return 'That one is a record row — use read.';
  if (!(view.canAsk[t.id] || []).includes(`${a}/${b}`)) {
    return `There is no ${a} ${b} question for ${scenario.label(t.id)} yet. Try one of the ones listed.`;
  }
  return { suit: a, angle: b, target: t.id };
}

function parse(text, view) {
  const w = text.trim().toLowerCase();
  if (!w) return 'Type a turn, or quit.';
  if (w === 'quit') return { quit: true };
  if (w === 'id') return { kind: 'identify' };
  if (w === 'look') return { kind: 'look' };
  if (w === 'transfer') return { kind: 'transfer' };
  const [a, b] = w.split(/\s+/);
  if (a === 'read') {
    const t = view.board.targets[Number(b) - 1];
    if (!t || t.cls !== 'record') return 'read needs the number of a record row.';
    return { kind: 'read', target: t.id };
  }
  if (a === 'fix') {
    const f = view.candidates[Number(b) - 1];
    if (!f) return 'fix needs the number of a remedy her words have pointed at.';
    return { kind: 'fix', fix: f };
  }
  const parts = w.split('+').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 2) return 'One or two inquiries a turn.';
  const inquiries = [];
  for (const p of parts) {
    const q = parseInquiry(p, view);
    if (typeof q === 'string') return q;
    inquiries.push(q);
  }
  return { kind: 'ask', inquiries };
}

let pending = '';
function readLine(prompt) {
  process.stdout.write(prompt);
  const buf = Buffer.alloc(1024);
  for (;;) {
    const at = pending.indexOf('\n');
    if (at !== -1) {
      const line = pending.slice(0, at);
      pending = pending.slice(at + 1);
      return line;
    }
    let n = 0;
    try {
      n = fs.readSync(0, buf, 0, buf.length, null);
    } catch (e) {
      if (e.code === 'EAGAIN') continue;
      return null;
    }
    if (n === 0) {
      const rest = pending;
      pending = '';
      return rest || null;
    }
    pending += buf.toString('utf8', 0, n);
  }
}

console.log(`\nthe bag call · seed ${seed}\n`);
const moves = [];
const queue = scripted ? scripted.split(';').map((s) => s.trim()).filter(Boolean) : null;
let printed = 0;
for (;;) {
  const out = run(moves);
  for (const l of out.lines.slice(printed)) {
    if (l.quiet) continue;
    if (l.who === 'NOTE') {
      const text = l.text
        .replace(/^\[record\]\s*/, 'On your screen: ')
        .replace(/^\[off the board\]\s*/, 'No longer in front of you: ')
        .replace(/^\[[^\]]+\]\s*/, '');
      console.log(`       (${wrap(text, '        ')})`);
    } else {
      console.log((l.who === 'HER' ? HER : 'YOU').padEnd(7) + wrap(l.text, '       '));
    }
  }
  printed = out.lines.length;
  writeLog(out);
  if (!out.paused) {
    console.log(`\n  The call ended: ${out.ending}, after ${out.turns} of nine turns.`);
    console.log(`  (details in logs/bag-seed-${seed}.log)`);
    break;
  }
  show(out.view);
  let move = null;
  while (!move) {
    const typed = queue ? queue.shift() : readLine('\nyour turn> ');
    if (typed === undefined || typed === null) {
      console.log('\n  (stopped here)');
      process.exit(0);
    }
    if (queue) console.log(`\nyour turn> ${typed}`);
    const m = parse(typed, out.view);
    if (typeof m === 'string') {
      console.log(`  ${m}`);
      if (queue) process.exit(1);
      continue;
    }
    if (m.quit) process.exit(0);
    move = m;
  }
  moves.push(move);
}
