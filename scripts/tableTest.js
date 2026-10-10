'use strict';

/**
 * What the training table had, tried on the engine.
 *
 * The table worked (settled.md, Appendix). Phil named three reasons: nine
 * kept them focused, they heard the call together, and the customer could
 * steer them back. This measures the two the engine can express:
 *
 *   1. THE BUDGET — the same agents given 5, 7, 9, 12, 15 and 20 plays.
 *   2. STEERING   — a caller who, on a miss, points somewhere instead of
 *                   deflecting: at the answer (the trainer at the table), or
 *                   at what she believes matters (which is not the answer).
 *
 * Steering is an experiment in `playCall`, off by default. Nothing here is a
 * design decision; it is what would happen if one were made.
 *
 *   node scripts/tableTest.js
 *   node scripts/tableTest.js --runs 2000 --case bag
 */

const { seededRng } = require('../src/call/rng');
const { playCall } = require('../src/cards/call');
const A = require('../src/cards/cardAgents');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
}

const RUNS = Number(arg('runs', 1000));
const SCENARIOS = { batch: require('../src/cards/case'), bag: require('../src/cards/bag') };
const WHICH = String(arg('case', 'batch')).toLowerCase();
const scenario = SCENARIOS[WHICH] || SCENARIOS.batch;

const SHEETS = [
  ['dice', () => A.makeCardAgent({ name: 'dice', randomMove: true })],
  ['Tigger', () => A.makeTigger()],
  ['Piglet', () => A.makePiglet()],
  ['Eeyore', () => A.makeEeyore()],
  ['Pooh', () => A.makePooh()],
  ['Rabbit', () => A.makeRabbit()],
  ['Watson', () => A.makeWatson()],
  ['Holmes', () => A.makeHolmes()],
  ['apprentice', () => A.makeCardAgent({})],
];

/**
 * The same agent, except that when she points somewhere it goes there next.
 *
 * What that takes, all of it: it asks about the steered subject with the
 * first suit that fits and the Contract angle, tries it at most twice, and
 * lets a remedy her own words already point at come first. Everything else
 * is the sheet's own. In the engine a steer also marks that subject as
 * something she will now talk about, so the steer columns measure pointing
 * plus a near-certain answer, not pointing alone.
 */
function following(agent) {
  return {
    ...agent,
    choose(view, rng) {
      // A remedy her own words point at still comes first, as it does for
      // every sheet: otherwise following would never end in an offer.
      const pending = (view.candidates || []).some((c) => !(view.refused || []).includes(c));
      const to = (view.steered || []).find(
        (s) => !view.answered.includes(s) && view.readings.filter((r) => r.subject === s).length < 2,
      );
      if (to && !pending) {
        const fits = (view.fit && view.fit[to]) || ['what'];
        return { kind: 'play', cls: 'customer', target: to, suit: fits[0], angle: 'contract' };
      }
      return agent.choose(view, rng);
    },
  };
}

function measure(make, opts) {
  const t = { found: 0, resolved: 0, wrong: 0, plays: 0, steers: 0 };
  for (let i = 0; i < RUNS; i += 1) {
    const out = playCall({ agent: make(), rng: seededRng(5000 + i), scenario, ...opts });
    if (out.found) t.found += 1;
    if (out.ending === 'resolved') t.resolved += 1;
    // An offer auto-played on the last play is not in `refused`, so count it
    // here or the last-play mistakes go missing.
    t.wrong += out.refused.length + (out.stats.autoPlayed && out.ending !== 'resolved' ? 1 : 0);
    t.plays += out.plays;
    t.steers += out.stats.steers;
  }
  return {
    found: (100 * t.found) / RUNS,
    resolved: (100 * t.resolved) / RUNS,
    wrong: t.wrong / RUNS,
    plays: t.plays / RUNS,
    steers: t.steers / RUNS,
  };
}

const f1 = (n) => n.toFixed(1).padStart(6);

console.log(`case: ${WHICH} · ${RUNS} calls per cell · same seeds in every cell\n`);

console.log('== 1. THE BUDGET — share of calls resolved, by how many plays the agent is given ==');
const budgets = [5, 7, 9, 12, 15, 20];
console.log(`  ${'agent'.padEnd(12)}${budgets.map((b) => String(b).padStart(7)).join('')}`);
for (const [name, make] of SHEETS) {
  const row = budgets.map((b) => measure(make, { plays: b }).resolved);
  console.log(`  ${name.padEnd(12)}${row.map((v) => f1(v) + ' ').join('')}`);
}

console.log('\n== 2. STEERING — share of calls resolved, at nine plays ==');
console.log('  none: she deflects, as built · answer: she points at what explains it ·');
console.log('  own: she points at something true that is not the explanation');
console.log(`\n  ${'agent'.padEnd(12)}${'none'.padStart(8)}${'answer'.padStart(9)}${'gain'.padStart(8)}${'own'.padStart(9)}${'change'.padStart(8)}${'wrong offers none/own'.padStart(24)}`);
const rows = [];
for (const [name, make] of SHEETS) {
  const none = measure(() => following(make()), {});
  const ans = measure(() => following(make()), { steer: 'answer' });
  const own = measure(() => following(make()), { steer: 'own' });
  rows.push({ name, none, ans, own });
  console.log(
    `  ${name.padEnd(12)}${f1(none.resolved)}  ${f1(ans.resolved)}  ${f1(ans.resolved - none.resolved)}  ${f1(own.resolved)}  ${f1(own.resolved - none.resolved)}` +
      `${`${none.wrong.toFixed(2)} / ${own.wrong.toFixed(2)}`.padStart(22)}`,
  );
}

// The claim the table makes, stated so the numbers can refute it.
const sorted = rows.slice().sort((a, b) => a.none.resolved - b.none.resolved);
const half = Math.floor(sorted.length / 2);
const weak = sorted.slice(0, half);
const strong = sorted.slice(sorted.length - half);
const mean = (xs, f) => xs.reduce((n, x) => n + f(x), 0) / xs.length;
const gainWeak = mean(weak, (r) => r.ans.resolved - r.none.resolved);
const gainStrong = mean(strong, (r) => r.ans.resolved - r.none.resolved);
console.log(`\n  weaker half  (${weak.map((r) => r.name).join(', ')}): mean gain from a helpful steer ${gainWeak.toFixed(1)} points`);
console.log(`  stronger half (${strong.map((r) => r.name).join(', ')}): mean gain from a helpful steer ${gainStrong.toFixed(1)} points`);
console.log(`  mean change from a steer toward her own belief: ${mean(rows, (r) => r.own.resolved - r.none.resolved).toFixed(1)} points`);
