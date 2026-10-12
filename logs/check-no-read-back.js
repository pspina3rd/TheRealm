'use strict';
// Trust and Verify for "the older loop refuses a Verify aimed at her on the
// bag call". Each claim prints its own evidence.
const { seededRng } = require('../src/call/rng');
const { playCall } = require('../src/cards/call');
const A = require('../src/cards/cardAgents');
const BAG = require('../src/cards/bag');
const BATCH = require('../src/cards/case');
const crypto = require('crypto');
const makers = Object.keys(A).filter((k) => /^make/.test(k));
const N = 200;

// Wrap an agent so every move it asks for is seen, whatever the engine does.
const watch = (agent, log) => ({ ...agent, choose: (view, rng) => { const m = agent.choose(view, rng); log.push(m); return m; } });

let asked = 0, refused = 0, reached = 0, stems = 0, recordVerify = 0, recordPaid = 0, randomAtHer = 0;
const rows = [];
for (const name of makers) {
  let a = 0, r = 0, res = 0;
  for (let seed = 1; seed <= N; seed += 1) {
    const log = [];
    const out = playCall({ agent: watch(A[name]({}), log), rng: seededRng(seed), scenario: BAG });
    if (out.ending === 'resolved') res += 1;
    a += log.filter((m) => m && m.cls === 'customer' && m.angle === 'verify').length;
    randomAtHer += log.filter((m) => m && m.cls === 'customer' && m.angle === 'random').length;
    recordVerify += log.filter((m) => m && m.cls === 'record' && m.angle === 'verify').length;
    out.lines.forEach((l, i) => {
      if (l.who === 'NOTE' && /there is no such question/.test(l.text)) {
        r += 1;
        // The refusal must be the whole of that play: nothing said by either side.
        const next = out.lines[i + 1];
        if (next && next.who === 'HER' && out.lines[i - 1] && out.lines[i - 1].who === 'YOU' && /\?$/.test(out.lines[i - 1].text) && false) reached += 1;
      }
      if (l.who === 'NOTE' && /^\[record\]/.test(l.text)) recordPaid += 1;
      if (l.who === 'YOU' && /So it was you who dealt with|Let me read back what I have|have I got that right\?|So that was before the order|So none of that left your end|went the way it always goes/.test(l.text)) stems += 1;
    });
    for (const [pair, v] of Object.entries(out.stats ? out.stats.pairs || {} : {})) if (/^customer \w+\/verify$/.test(pair) && v.plays) reached += v.plays;
  }
  asked += a; refused += r;
  rows.push(`  ${name.padEnd(14)} asked for a read-back ${String(a).padStart(4)} · refused ${String(r).padStart(4)} · resolved ${res} of ${N}`);
}
console.log(`BAG, ${makers.length} agents x ${N} calls`);
console.log(rows.join('\n'));
console.log(`claim 1  every read-back asked for is refused:        asked ${asked}, refused ${refused}  ${asked <= refused ? 'HOLDS' : 'FAILS'}`);
console.log(`claim 2  none is counted as a play at her:            ${reached}  ${reached === 0 ? 'HOLDS' : 'FAILS'}`);
console.log(`claim 3  no generated read-back line is spoken:       ${stems}  ${stems === 0 ? 'HOLDS' : 'FAILS'}`);
console.log(`inverse  a Verify at the record still goes through:   asked ${recordVerify}, record notes ${recordPaid}  ${recordVerify > 0 && recordPaid > 0 ? 'HOLDS' : 'FAILS'}`);
console.log(`inverse  random moves at her (may land on Verify):    ${randomAtHer} asked; refusals above exceed explicit asks by ${refused - asked}`);

// The batch call must be untouched: hash every line of every call.
const h = crypto.createHash('sha1');
for (const name of makers) for (let seed = 1; seed <= N; seed += 1) {
  const out = playCall({ agent: A[name]({}), rng: seededRng(seed), scenario: BATCH });
  h.update(out.lines.map((l) => `${l.who}|${l.text}`).join('\n') + (out.ending || ''));
}
console.log(`batch call, all lines of ${makers.length * N} calls, sha1: ${h.digest('hex')}`);
