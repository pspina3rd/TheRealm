'use strict';
// Working measurement for "her choosing neither" (10 October). Not part of the suite.
const { seededRng } = require('../src/call/rng');
const BAG = require('../src/cards/bag');
const { playTurns } = require('../src/cards/turn');

function anything(seed) {
  const r = seededRng(seed * 13 + 5);
  const done = new Set();
  return (view) => {
    const every = view.board.targets.flatMap((t) => (view.canAsk[t.id] || []).map((k) => [t.id, k]));
    const fresh = every.filter(([s, k]) => !done.has(`${s}|${k}`));
    const cells = fresh.length ? fresh : every;
    if (!cells.length) return view.handle ? { kind: 'look' } : { kind: 'identify' };
    const picks = [];
    const want = r() < 0.6 ? 2 : 1;
    while (picks.length < want && cells.length) {
      const x = cells.splice(Math.floor(r() * cells.length), 1)[0];
      if (!picks.some((p) => p[0] === x[0])) picks.push(x);
    }
    picks.forEach(([s, k]) => done.add(`${s}|${k}`));
    return { kind: 'ask', inquiries: picks.map(([s, k]) => ({ suit: k.split('/')[0], angle: k.split('/')[1], target: s })) };
  };
}

// The fixed line of play: what happens, how she is going about it, what she
// was looking for, then the remedy her words pointed at.
function fixedLine() {
  const want = [['working', 'what'], ['tried', 'how'], ['looking', 'what']];
  return (view) => {
    const open = view.candidates.filter((c) => !view.refused.includes(c));
    if (open.includes('the-word')) return { kind: 'fix', fix: 'the-word' };
    for (const [s, suit] of want) {
      if (view.answered.includes(s)) continue;
      const cells = view.canAsk[s] || [];
      const k = cells.find((c) => c.startsWith(`${suit}/expand`)) || cells.find((c) => c.startsWith(`${suit}/`)) || cells[0];
      if (k) return { kind: 'ask', inquiries: [{ suit: k.split('/')[0], angle: k.split('/')[1], target: s }] };
    }
    const s = want.map((w) => w[0]).find((x) => (view.canAsk[x] || []).length);
    if (!s) return { kind: 'identify' };
    const k = view.canAsk[s][0];
    return { kind: 'ask', inquiries: [{ suit: k.split('/')[0], angle: k.split('/')[1], target: s }] };
  };
}

function run(name, mk, N) {
  let need = 0, own = 0, replies = 0, resolved = 0, turns = 0, callsOwn = 0, firstOwn = 0;
  const kinds = {}; const mem = {}; const perCall = {};
  for (let seed = 1; seed <= N; seed += 1) {
    const out = playTurns({ agent: { choose: mk(seed) }, rng: seededRng(seed), scenario: BAG });
    if (out.lines.some((l) => l.text.includes(BAG.NEED.line))) need += 1;
    if (out.ending === 'resolved') { resolved += 1; turns += out.turns; }
    let n = 0, i = 0;
    for (const l of out.lines) {
      if (!l.template) continue;
      replies += 1; i += 1;
      const o = l.template.own;
      if (!o) continue;
      own += 1; n += 1;
      if (i === 1) firstOwn += 1;
      kinds[o.kind] = (kinds[o.kind] || 0) + 1;
      if (o.life) mem[o.life] = (mem[o.life] || 0) + 1;
    }
    if (n) callsOwn += 1;
    perCall[n] = (perCall[n] || 0) + 1;
  }
  console.log(`${name} · ${N} calls`);
  console.log(`  resolved ${resolved}${resolved ? `, in ${(turns / resolved).toFixed(1)} turns on average` : ''}`);
  console.log(`  her Need said in ${need} calls`);
  console.log(`  answered neither in ${own} of ${replies} replies (${(100 * own / replies).toFixed(1)}%), in ${callsOwn} calls, as her first reply ${firstOwn}`);
  console.log(`  times per call ${JSON.stringify(perCall)}`);
  console.log(`  what she said instead ${JSON.stringify(kinds)} · memories ${JSON.stringify(mem)}`);
}
run('random agent', anything, 300);
run('fixed line of play', fixedLine, 1000);
