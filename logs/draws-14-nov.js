'use strict';

/**
 * Draws for the five runs of 14 November (docs/playthroughs-14-nov-draws.md).
 *
 * Evidence, not engine code. Every number here is Claude's guess and none is
 * in the record. It exists so the hand-played runs take their luck from a
 * seeded source and not from the person writing the lines.
 *
 * Usage: node logs/draws-14-nov.js
 */

const AXES = ['volume', 'signal', 'certainty', 'accuracy', 'openness'];

/** What the apprentice reaches for first, and how often (guess). */
const FOCUS = [
  ['what I did not understand', 0.35],
  ['what is most urgent', 0.3],
  ['what it told me', 0.2],
  ['what she did not tell me', 0.05],
  ['what is most interesting', 0.05],
  ['what is most concerning', 0.05],
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

/** Roughly normal, mean 0 and spread 1: twelve uniforms summed. */
function bell(rng) {
  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += rng();
  return sum - 6;
}

/** Where a draw sits on her own curve. */
function band(z) {
  if (z < -2) return 'very low';
  if (z < -1) return 'low';
  if (z > 2) return 'very high';
  if (z > 1) return 'high';
  return 'usual';
}

/**
 * One answer from her: five draws, then the links.
 * Low volume pulls signal down; high openness pulls volume up (guesses).
 */
function herAnswer(rng) {
  const z = {};
  for (const axis of AXES) z[axis] = bell(rng);
  const pulled = [];
  if (z.volume < -1) { z.signal -= 0.75; pulled.push('volume pulls signal down'); }
  if (z.openness > 1) { z.volume += 0.75; pulled.push('openness pulls volume up'); }
  const out = {};
  for (const axis of AXES) out[axis] = band(z[axis]);
  return { bands: out, pulled };
}

/** How a new apprentice's move lands: misfires and flats are common (guess). */
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

function show(answer) {
  const off = AXES.filter((a) => answer.bands[a] !== 'usual').map((a) => `${a} ${answer.bands[a]}`);
  const text = off.length ? off.join(', ') : 'all usual';
  return answer.pulled.length ? `${text} (${answer.pulled.join('; ')})` : text;
}

for (let run = 1; run <= 5; run += 1) {
  const rng = seededRng(1400 + run);
  console.log(`\nRun ${run}`);
  console.log(`  opener  her: ${show(herAnswer(rng))}`);
  for (let play = 1; play <= 9; play += 1) {
    const f = focus(rng);
    const l = landing(rng);
    const repeat = rng() < 0.25;
    console.log(`  play ${play}  focus: ${f} | ${l}${repeat ? ' | goes back to the same door' : ''} | her: ${show(herAnswer(rng))}`);
  }
}
