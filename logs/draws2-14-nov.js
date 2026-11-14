'use strict';

/**
 * Draws for the replay of 14 November (docs/playthroughs-14-nov-replay.md).
 *
 * Evidence, not engine code. Every number here is Claude's guess and none is
 * in the record. Differences from logs/draws-14-nov.js:
 *  - her "usual" is two spreads wide, and her five counts pull on one
 *    another as worked out in logs/links-14-nov.js;
 *  - a landing is drawn only for moves aimed at a person, never the record
 *    (docs/card-rules.md, rule 22);
 *  - the apprentice's read of what came back is drawn too: nobody tells the
 *    kind from the particular, or fact from opinion, every time (rule 24).
 *
 * Usage: node logs/draws2-14-nov.js
 */

const AXES = ['volume', 'signal', 'certainty', 'accuracy', 'openness'];

/** Copied from logs/links-14-nov.js; see there for the reasons. */
const PULLS = [
  { from: 'openness', to: 'volume', low: 0.3, high: 0.4 },
  { from: 'certainty', to: 'volume', low: -0.2, high: -0.2 },
  { from: 'volume', to: 'signal', low: 0.4, high: -0.15 },
  { from: 'volume', to: 'accuracy', low: 0.25, high: 0 },
  { from: 'certainty', to: 'signal', low: 0.15, high: 0 },
  { from: 'openness', to: 'signal', low: -0.15, high: -0.15 },
];

/** What the apprentice reaches for first, and how often (guess). */
const FOCUS = [
  ['what I did not understand', 0.35],
  ['what is most urgent', 0.3],
  ['what it told me', 0.2],
  ['what she did not tell me', 0.05],
  ['what is most interesting', 0.05],
  ['what is most concerning', 0.05],
];

/** How often a new apprentice reads what came back correctly (guess). */
const READS_RIGHT = 0.65;

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

/** Where a landed value sits on her own curve, in words. */
function band(z) {
  if (z < -2) return 'TAIL LOW';
  if (z > 2) return 'TAIL HIGH';
  if (z < -1) return 'low side';
  if (z > 1) return 'high side';
  return null;
}

/** One answer from her: five draws, then the pulls. */
function herAnswer(rng) {
  const z = {};
  for (const axis of AXES) z[axis] = bell(rng);
  for (const target of ['volume', 'signal', 'accuracy']) {
    for (const pull of PULLS.filter((p) => p.to === target)) {
      const source = z[pull.from];
      z[target] += (source < 0 ? pull.low : pull.high) * source;
    }
  }
  const off = AXES.filter((a) => band(z[a])).map((a) => `${a} ${band(z[a])}`);
  return off.length ? off.join(', ') : 'all at her centre';
}

function landing(rng) {
  const z = bell(rng);
  if (z < -1) return 'misfire';
  if (z < 0) return 'flat';
  if (z < 1.5) return 'lands';
  return 'critical';
}

function focus(rng) {
  let r = rng();
  for (const [name, weight] of FOCUS) {
    if (r < weight) return name;
    r -= weight;
  }
  return FOCUS[0][0];
}

for (let run = 1; run <= 5; run += 1) {
  const rng = seededRng(1500 + run);
  console.log(`\nRun ${run}`);
  console.log(`  opener  her: ${herAnswer(rng)}`);
  for (let play = 1; play <= 9; play += 1) {
    const f = focus(rng);
    const l = landing(rng);
    const read = rng() < READS_RIGHT ? 'reads it right' : 'READS IT WRONG';
    const repeat = rng() < 0.25 ? ' | same door' : '';
    console.log(`  play ${play}  focus: ${f} | if a person: ${l} | ${read}${repeat} | her: ${herAnswer(rng)}`);
  }
}
