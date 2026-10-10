'use strict';

/**
 * Play the card call yourself.
 *
 * Every other script here plays a policy. This one stops at each of the nine
 * plays and asks a person. Nothing about the caller is shown that a player
 * would not have: no sheet, no wards, no hidden cause until the call is over.
 *
 *   node scripts/playCards.js                       (asks you, play by play)
 *   node scripts/playCards.js --case bag --seed 4
 *   node scripts/playCards.js --moves "id; look; what expand 1"   (no prompt)
 *
 * A move is typed as one of:
 *   <suit> <angle> <n>     ask about target n on the board, e.g.  how contract 3
 *                          suits: who what why when where how
 *                          angles: verify validate expand contract
 *   random <n>             let the dice choose the suit and the angle
 *   id                     ask her for something to search on
 *   look                   see what the record holds under what she gave you
 *   read <n>               read record row n
 *   ask short | ask long   ask Bram over your shoulder
 *   hold short | hold long put her on hold and brief Bram
 *   fix <n>                offer remedy n
 *   write <n>              write find n down, which frees its place
 *   transfer               hand the call on
 *   quit
 *
 * The call is seeded, so it replays from the seed and the moves so far. That
 * is why a line of moves can be passed in and why nothing here keeps state.
 */

const fs = require('fs');
const { seededRng } = require('../src/call/rng');
const { playCall, SUITS, ANGLES } = require('../src/cards/call');
const REC = require('../src/cards/record');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
}

const SCENARIOS = { batch: require('../src/cards/case'), bag: require('../src/cards/bag') };
const which = String(arg('case', 'batch')).toLowerCase();
const scenario = SCENARIOS[which] || SCENARIOS.batch;
const rec = scenario.record || REC.RECORD;
const seed = Number(arg('seed', Math.floor(Date.now() % 100000)));
const steer = arg('steer', undefined);
if (steer !== undefined && steer !== 'answer' && steer !== 'own') {
  console.log('--steer takes answer or own.');
  process.exit(1);
}
const scripted = arg('moves', null);

const WIDTH = 72;
function wrap(text, indent) {
  const rows = [];
  let row = '';
  for (const w of String(text).split(' ')) {
    if ((row + ' ' + w).trim().length > WIDTH - indent.length) {
      rows.push(row.trim());
      row = w;
    } else {
      row += ' ' + w;
    }
  }
  if (row.trim()) rows.push(row.trim());
  return rows.join('\n' + indent);
}

/** Play the call as far as the moves go, then stop for the next one. */
function run(moves) {
  let i = 0;
  const agent = {
    name: 'you',
    choose() {
      if (i < moves.length) return moves[i++];
      return { kind: 'pause' };
    },
  };
  return playCall({ agent, rng: seededRng(seed), scenario, steer });
}

function nameOf(t) {
  if (t.cls === 'record') {
    const n = REC.node(rec, t.id);
    return `${n ? n.spoken : t.id}  (record)`;
  }
  if (t.id.startsWith('heard:')) return `what she said about ${scenario.label(t.id.slice(6))}  (find)`;
  return scenario.label(t.id) + (t.find ? '  (find)' : '');
}

function show(view) {
  console.log(`\n--- ${view.left} of your plays left ---`);
  console.log('In front of you:');
  view.board.targets.forEach((t, n) => console.log(`  ${n + 1}. ${nameOf(t)}`));
  if (view.handle) console.log(`She has given you: ${view.handle}`);
  else console.log('She has given you nothing to search on yet.');
  const fixes = view.remedies || [];
  if (fixes.length) {
    console.log('Remedies you could offer:');
    fixes.forEach((f, n) => {
      const mark = view.candidates.includes(f) ? '  <- her own words point here' : '';
      const no = view.refused.includes(f) ? '  (she has turned this down)' : '';
      console.log(`  ${n + 1}. ${f}${mark}${no}`);
    });
  }
}

/** Turn what was typed into a move the engine takes. Returns a string on error. */
function parse(text, view) {
  const w = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!w.length) return 'Type a move, or quit.';
  const targetAt = (s) => {
    const n = Number(s);
    if (Number.isInteger(n) && n >= 1 && n <= view.board.targets.length) return view.board.targets[n - 1];
    return view.board.targets.find((t) => t.id === s) || null;
  };
  const [a, b, c] = w;
  if (a === 'quit') return { quit: true };
  if (a === 'id') return { kind: 'identify', suit: 'what', angle: 'contract' };
  if (a === 'look') return { kind: 'play', cls: 'record', target: null, suit: 'what', angle: 'expand' };
  if (a === 'read') {
    const t = targetAt(b);
    if (!t || t.cls !== 'record') return 'read needs the number of a record row on the board.';
    return { kind: 'play', cls: 'record', target: t.id, suit: 'what', angle: 'verify' };
  }
  if (a === 'ask' || a === 'hold') {
    const brief = b === 'short' || b === 'long' ? b : null;
    if (!brief) return `${a} needs short or long.`;
    return a === 'hold'
      ? { kind: 'hold', brief, suit: 'what', angle: 'expand' }
      : { kind: 'play', cls: 'coworker', target: 'bram', brief, suit: 'what', angle: 'expand' };
  }
  if (a === 'fix') {
    const n = Number(b);
    const f = (view.remedies || [])[n - 1];
    if (!f) return 'fix needs the number of a remedy.';
    return { kind: 'fix', fix: f, suit: 'what', angle: 'contract' };
  }
  if (a === 'write') {
    const t = targetAt(b);
    if (!t || !t.find) return 'write needs the number of a find on the board.';
    return { kind: 'write', target: t.id, suit: 'what', angle: 'contract' };
  }
  if (a === 'transfer') return { kind: 'transfer', suit: 'what', angle: 'contract' };
  if (a === 'random') {
    const t = targetAt(b);
    if (!t) return 'random needs the number of a target on the board.';
    return { kind: 'play', cls: t.cls === 'record' ? 'record' : 'customer', target: t.id, suit: 'random', angle: 'random' };
  }
  if (SUITS.includes(a)) {
    if (!ANGLES.includes(b)) return `After a suit comes an angle: ${ANGLES.join(', ')}.`;
    const t = targetAt(c);
    if (!t) return 'Then the number of a target on the board.';
    return { kind: 'play', cls: t.cls === 'record' ? 'record' : 'customer', target: t.id, suit: a, angle: b };
  }
  return 'Not a move. Suits: who what why when where how. Or: id, look, read n, ask short, hold short, fix n, write n, transfer.';
}

// Whatever arrived after the first line stays here for the next read, so a
// pasted or piped set of moves is not thrown away.
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

console.log(`\ncase: ${which} · seed ${seed}${steer ? ` · steer ${steer}` : ''}\n`);
const moves = [];
const queue = scripted ? scripted.split(';').map((s) => s.trim()).filter(Boolean) : null;
let printed = 0;
for (;;) {
  const out = run(moves);
  for (const l of out.lines.slice(printed)) {
    const tag = l.who.padEnd(6);
    console.log(tag + wrap(l.text, '      '));
  }
  printed = out.lines.length;
  if (!out.paused) {
    console.log(
      `\nending: ${out.ending} · plays used: ${out.plays} · the cause was: ${out.cause}` +
        ` · you ${out.found ? 'heard it from her' : 'did not hear it from her'}`,
    );
    break;
  }
  show(out.view);
  let move = null;
  while (!move) {
    const typed = queue ? queue.shift() : readLine('your move> ');
    if (typed === undefined || typed === null) {
      console.log('\n(stopped here — pass more moves, or run without --moves to be asked)');
      process.exit(0);
    }
    if (queue) console.log(`your move> ${typed}`);
    const m = parse(typed, out.view);
    if (typeof m === 'string') {
      console.log(m);
      if (queue) process.exit(1);
      continue;
    }
    if (m.quit) process.exit(0);
    move = m;
  }
  moves.push(move);
}
