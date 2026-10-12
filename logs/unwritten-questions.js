'use strict';
// Every question a scripted agent puts to her in the older loop that is not
// one of the scenario's written questions: how many, and what they say.
const { seededRng } = require('../src/call/rng');
const { playCall, ask } = require('../src/cards/call');
const A = require('../src/cards/cardAgents');
const makers = Object.keys(A).filter((k) => /^make/.test(k));
for (const [name, sc] of [['bag', require('../src/cards/bag')], ['batch', require('../src/cards/case')]]) {
  let cells = 0; for (const s of Object.keys(sc.QUESTIONS || {})) cells += Object.keys(sc.QUESTIONS[s]).length;
  const written = new Set(); for (const s of Object.keys(sc.QUESTIONS || {})) for (const k of Object.keys(sc.QUESTIONS[s])) written.add(sc.QUESTIONS[s][k]);
  let plays = 0, un = 0, nonsense = 0; const eg = {}; const by = {};
  for (const m of makers) for (let seed = 1; seed <= 200; seed += 1) {
    const log = [];
    const agent = A[m]({});
    const out = playCall({ agent: { ...agent, choose: (v, r) => { const x = agent.choose(v, r); log.push(x); return x; } }, rng: seededRng(seed), scenario: sc });
    for (const [pair, v] of Object.entries(out.stats.pairs)) if (pair.startsWith('customer ')) plays += v.plays;
    for (const mv of log) {
      if (!mv || mv.cls !== 'customer' || mv.kind !== 'play' || mv.suit === 'random') continue;
      const w = sc.QUESTIONS && sc.QUESTIONS[mv.target] && sc.QUESTIONS[mv.target][`${mv.suit}/${mv.angle}`];
      if (w) continue;
      if (!(sc.BASELINE[mv.target] || sc.BELIEFS[mv.target])) continue;
      un += 1; by[m] = (by[m] || 0) + 1;
      if (sc.nonsense(mv.suit, mv.target)) nonsense += 1;
      const q = ask(sc, mv.suit, mv.angle, mv.target);
      eg[q] = (eg[q] || 0) + 1;
    }
  }
  console.log(`\n${name}: ${cells} written questions · plays at her ${plays} · asked with no written question ${un} (${nonsense} in a cell kept malformed on purpose)`);
  console.log('  by agent', JSON.stringify(by));
  for (const [q, c] of Object.entries(eg).sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`  ${String(c).padStart(4)}  ${q}`);
}
