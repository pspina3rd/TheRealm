'use strict';

/**
 * Seeded randomness for the call engine.
 *
 * Everything in `src/call/` takes its randomness as an injected `rng`
 * so a whole shift can be replayed from one seed. The generator is the
 * same mulberry32 the existing test suite uses, promoted out of the
 * tests because the engine itself needs to be reproducible, not just
 * its assertions.
 */

/**
 * @param {number} seed
 * @returns {() => number} a deterministic [0,1) generator
 */
function seededRng(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** @param {Array<T>} list @param {() => number} rng @returns {T} @template T */
function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

/** True with probability p. */
function chance(p, rng) {
  return rng() < p;
}

/** Fisher-Yates, non-mutating. */
function shuffle(list, rng) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}

module.exports = { seededRng, pick, chance, shuffle };
