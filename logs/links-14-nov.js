'use strict';

/**
 * How Sella's five sharing counts act on one another (Phil, 14 November):
 * each has its own usual; what does each usual do to the others, where does
 * each curve land, and what happens with one tail, then two, three, four
 * and five.
 *
 * Evidence, not engine code. Every pull below is Claude's guess, fitted to
 * Sella on this call, and none is in the record. The one fixed point from
 * the record is that certainty and accuracy do not move together
 * (docs/handover/memory/therealm-design-frame.md), so there is no pull
 * between them.
 *
 * Usage: node logs/links-14-nov.js
 */

const AXES = ['volume', 'signal', 'certainty', 'accuracy', 'openness'];

/** A count is in a tail beyond this many spreads from her own usual. */
const TAIL = 2;

/**
 * Pulls, per spread of the source away from its usual. `low` applies when
 * the source is below its usual, `high` when above. A positive number moves
 * the target the same way as the source; a negative number the other way.
 *
 * Openness and certainty are what she brings; volume follows from them;
 * signal and accuracy are what the listener gets, and pull on nothing.
 */
const PULLS = [
  // The more she opens up, the more she says; closed, she says less.
  { from: 'openness', to: 'volume', low: 0.3, high: 0.4 },
  // Unsure, she hedges, and hedging takes words; sure, she is brief.
  { from: 'certainty', to: 'volume', low: -0.2, high: -0.2 },
  // Few words carry little; running on adds her stress to the facts.
  { from: 'volume', to: 'signal', low: 0.4, high: -0.15 },
  // Few words are loose words.
  { from: 'volume', to: 'accuracy', low: 0.25, high: 0 },
  // Hedges are noise.
  { from: 'certainty', to: 'signal', low: 0.15, high: 0 },
  // Her worry is not about the fault; kept to the problem, more of it helps.
  { from: 'openness', to: 'signal', low: -0.15, high: -0.15 },
];

/** Seeded PRNG, the same mulberry32 the test suites use. */
function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A draw from a bell curve centred on 0 with a spread of 1. */
function bell(rng) {
  const u = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/**
 * One answer: five draws, then the pulls, in an order that lets volume
 * settle before it acts on signal and accuracy.
 *
 * @param {() => number} rng
 * @param {Object<string, number>} [forced] raw draws to pin, by count
 * @param {boolean} [linked] false to leave the pulls out
 * @returns {Object<string, number>} where each count lands, in spreads
 */
function answer(rng, forced = {}, linked = true) {
  const z = {};
  for (const axis of AXES) z[axis] = axis in forced ? forced[axis] : bell(rng);
  if (!linked) return z;
  for (const target of ['volume', 'signal', 'accuracy']) {
    for (const pull of PULLS.filter((p) => p.to === target)) {
      const source = z[pull.from];
      z[target] += (source < 0 ? pull.low : pull.high) * source;
    }
  }
  return z;
}

const isTail = (value) => Math.abs(value) > TAIL;
const pct = (n, of) => `${((100 * n) / of).toFixed(of >= 1e5 && n / of < 0.001 ? 3 : 1)}%`;

function tailCounts(n, linked, rng) {
  const counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    const z = answer(rng, {}, linked);
    counts[AXES.filter((a) => isTail(z[a])).length] += 1;
  }
  return counts;
}

const N = 1000000;
const rng = seededRng(1114);

console.log('1. How many counts sit in a tail in one answer');
for (const linked of [false, true]) {
  const counts = tailCounts(N, linked, rng);
  console.log(`   ${linked ? 'with the pulls   ' : 'without the pulls'}: ${counts.map((c, i) => `${i}: ${pct(c, N)}`).join('  ')}`);
}

console.log('\n2. Where each curve lands once the others act on it');
const sums = {};
for (const axis of AXES) sums[axis] = { s: 0, s2: 0, usual: 0 };
for (let i = 0; i < N; i += 1) {
  const z = answer(rng);
  for (const axis of AXES) {
    sums[axis].s += z[axis];
    sums[axis].s2 += z[axis] * z[axis];
    if (!isTail(z[axis])) sums[axis].usual += 1;
  }
}
const centre = {};
for (const axis of AXES) {
  const mean = sums[axis].s / N;
  centre[axis] = mean;
  const spread = Math.sqrt(sums[axis].s2 / N - mean * mean);
  console.log(`   ${axis.padEnd(9)} centre ${mean.toFixed(2)}  spread ${spread.toFixed(2)}  in her usual ${pct(sums[axis].usual, N)}`);
}

console.log('\n3. One count pinned in a tail (2.5 spreads out): what it does to the rest');
const M = 200000;
for (const axis of AXES) {
  for (const side of [-2.5, 2.5]) {
    const shift = {};
    const out = {};
    for (const other of AXES) { shift[other] = 0; out[other] = 0; }
    for (let i = 0; i < M; i += 1) {
      const z = answer(rng, { [axis]: side });
      for (const other of AXES) {
        shift[other] += z[other];
        if (isTail(z[other])) out[other] += 1;
      }
    }
    // Reported against where each curve already lands, so only the pinned
    // count's own doing shows.
    const moved = AXES.filter((o) => o !== axis && Math.abs(shift[o] / M - centre[o]) > 0.05)
      .map((o) => `${o} ${(shift[o] / M - centre[o]).toFixed(2)} (tail ${pct(out[o], M)})`);
    console.log(`   ${axis} ${side < 0 ? 'low ' : 'high'}: ${moved.length ? moved.join(', ') : 'moves nothing'}`);
  }
}

console.log('\n4. Which pairs of tails turn up together most (with the pulls)');
const pairs = {};
let twoPlus = 0;
for (let i = 0; i < N; i += 1) {
  const z = answer(rng);
  const tails = AXES.filter((a) => isTail(z[a])).map((a) => `${a} ${z[a] < 0 ? 'low' : 'high'}`);
  if (tails.length < 2) continue;
  twoPlus += 1;
  for (let a = 0; a < tails.length; a += 1) {
    for (let b = a + 1; b < tails.length; b += 1) {
      const key = `${tails[a]} + ${tails[b]}`;
      pairs[key] = (pairs[key] || 0) + 1;
    }
  }
}
const top = Object.entries(pairs).sort((x, y) => y[1] - x[1]).slice(0, 6);
console.log(`   answers with two or more tails: ${pct(twoPlus, N)}`);
for (const [key, count] of top) console.log(`   ${key}: ${pct(count, N)}`);
