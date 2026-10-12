'use strict';
// Every exchange in which she can answer neither on the bag call, from the
// tables themselves, then a check of played calls against the same tables.
const { seededRng } = require('../src/call/rng');
const BAG = require('../src/cards/bag');
const LIFE = require('../src/cards/sellaLife');
const { playTurns } = require('../src/cards/turn');
const src = require('fs').readFileSync(__dirname + '/measure-neither.js', 'utf8');
const anything = eval('(' + src.match(/function anything[\s\S]*?\n}\n/)[0] + ')');

const pairs = [];
const add = (who, line, table) => {
  for (const s of Object.keys(table)) for (const cell of Object.keys(table[s])) {
    const q = BAG.QUESTIONS[s] && BAG.QUESTIONS[s][cell];
    pairs.push({ who, s, cell, q: q ? (q.text || q) : null, line, needs: table[s][cell] });
  }
};
for (const b of Object.values(BAG.BAGGAGE)) add(`baggage ${b.id}`, b.line, b.inPlaceOf || {});
for (const m of LIFE.LIFE) if (m.inPlaceOf) add(`memory ${m.id}`, [...new Set(['guarded', 'ordinary', 'open'].map((h) => LIFE.say(m, h)))].join('  /  '), m.inPlaceOf);
console.log(`${pairs.length} possible exchanges\n`);
for (const p of pairs) console.log(`[${p.who}]${p.needs.length ? ` (only once ${p.needs.join(', ')} is in play)` : ''}\n  "${p.q}"\n  — "${p.line}"\n`);
const missing = pairs.filter((p) => !p.q);
console.log(`ties naming a question that does not exist: ${missing.length}`);

const seen = {}; let n = 0, bad = 0, first = 0, twice = 0, replies = 0;
const N = 2000;
for (let seed = 1; seed <= N; seed += 1) {
  const out = playTurns({ agent: { choose: anything(seed) }, rng: seededRng(seed), scenario: BAG });
  const said = new Set(); const intro = new Set(); let i = 0;
  for (const l of out.lines) {
    if (!l.template) continue;
    i += 1; replies += 1;
    const t = l.template; const o = t.own;
    if (!o) continue;
    n += 1;
    if (i === 1) first += 1;
    const key = o.life ? `memory ${o.life}` : `baggage ${out.sheet.baggage.id}`;
    if (said.has(key)) twice += 1;
    said.add(key);
    const table = o.life ? LIFE.LIFE.find((m) => m.id === o.life).inPlaceOf : out.sheet.baggage.inPlaceOf;
    // Recomputed from what she was asked, not from what the engine recorded.
    const lastQ = t.left[t.left.length - 1];
    const hit = lastQ && table && table[lastQ.subject] && table[lastQ.subject][`${lastQ.suit}/${lastQ.angle}`] ? lastQ : null;
    if (!hit) { bad += 1; console.log('NOT TIED', seed, l.text); continue; }
    const k = `${key} | ${hit.subject} ${hit.suit}/${hit.angle}`;
    seen[k] = (seen[k] || 0) + 1;
  }
}
console.log(`\nrandom agent, ${N} calls: neither ${n} of ${replies} replies (${(100 * n / replies).toFixed(1)}%) · not tied ${bad} · as first reply ${first} · same line twice in a call ${twice}`);
const never = pairs.filter((p) => !seen[`${p.who} | ${p.s} ${p.cell}`]);
console.log(`possible exchanges never seen in play: ${never.length}`);
for (const p of never) console.log(`  ${p.who} after ${p.s} ${p.cell}`);
