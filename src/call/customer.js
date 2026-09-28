'use strict';

const { SYMPTOM, FAMILIES, FLAVOUR_COST } = require('./scenario');

/**
 * The customer, and the only thing in the engine allowed to decide
 * what she says.
 *
 * Nothing here reads a script. An inquiry arrives as one or two word
 * cards; her sheet and the hidden cause decide what comes back. That
 * is the whole point of the module: if the caller of this function
 * could choose the answer, every play would succeed and the transcripts
 * would be fiction.
 *
 * Mood is per call and moves turn to turn. Opinion is the residue that
 * survives between calls. Knowledge is what somebody taught her, and it
 * stays.
 */

const MOOD_START = 5;
const MOOD_FLOOR = 0;
const MOOD_CEILING = 8;

/**
 * A fresh sheet for a first-time caller.
 * @param {{name: string, tier: 'Copper'|'Silver'|'Gold'}} who
 */
function newSheet(who) {
  return {
    name: who.name,
    tier: who.tier,
    refillsUsed: 0,
    opinion: 0,          // how she feels about the co-op, -3..+3
    knows: [],           // causes somebody has explained to her
    calls: [],           // gist of past calls, written at the end
  };
}

/** Per-call state, built from the sheet. */
function openCall(sheet) {
  return {
    sheet,
    // Someone let down before starts lower, and shows it sooner.
    mood: clamp(MOOD_START + sheet.opinion),
    // What she has *answered*, not what she has said. Her opening words
    // are the basis of the first deal, so asking about one of them is a
    // real inquiry rather than a repeat.
    said: new Set(),
    pool: SYMPTOM.words.slice(),
    revealed: null,
    recent: SYMPTOM.words.slice(),
    turnsTaken: 0,
  };
}

function clamp(n) {
  return Math.max(MOOD_FLOOR, Math.min(MOOD_CEILING, n));
}

/**
 * Does this inquiry reach a cause?
 * A cause with a paired reach needs both words in the same inquiry —
 * which is what makes the two-card turn worth having.
 */
function reaches(cause, words) {
  return cause.reach.some((set) => set.every((w) => words.includes(w)));
}

/**
 * Put an inquiry to her.
 *
 * @param {object} call    state from openCall()
 * @param {object} hidden  the rolled cause; never read by the agent
 * @param {Array<{word: string, flavour: string}>} cards one or two
* @returns {{line: string, seeds: string[], reached: (string|null), wasted: boolean, mood: number}}
 */
function ask(call, hidden, cards) {
  const words = cards.map((c) => c.word);
  let mood = 0;
  for (const c of cards) mood += FLAVOUR_COST[c.flavour] || 0;

  // Asking for something she has already given costs her patience and
  // returns nothing. This is the commonest wasted play there is.
  const stale = words.filter((w) => call.said.has(w));
  const fresh = words.filter((w) => !call.said.has(w));
  if (stale.length) mood -= 1;

  if (reaches(hidden, words)) {
    for (const w of words) call.said.add(w);
    return {
      line: hidden.says,
      seeds: [],
      reached: hidden.id,
      wasted: false,
      mood,
    };
  }

  if (!fresh.length) {
    return { line: "That's what I said.", seeds: [], reached: null, wasted: true, mood };
  }

  // She elaborates in proportion to how the call is going. A sour
  // customer answers the question and stops.
  const room = call.mood + mood;
  const budget = room >= 6 ? 2 : room >= 3 ? 1 : 0;
  const seeds = [];

  for (const w of fresh) {
    call.said.add(w);
    const fam = FAMILIES[w];
    if (!fam) continue;
    for (const adj of fam.adjacent) {
      if (seeds.length >= budget) break;
      // Don't hand back something already in play, or something she has
      // already been asked about.
      if (call.pool.includes(adj) || call.said.has(adj) || seeds.includes(adj)) continue;
      seeds.push(adj);
    }
  }

  call.recent = seeds.concat(fresh);
  // What this particular trouble makes her mention. She volunteers it
  // only while the call is going well: being comfortable is what buys
  // the detail nobody asked for, which is why keeping her that way is
  // worth more than any single question.
  if (room >= MOOD_START) {
    const hints = hidden.hints || {};
    for (const w of words) {
      for (const hint of (hints[w] || [])) {
        if (call.pool.includes(hint) || call.said.has(hint) || seeds.includes(hint)) continue;
        seeds.push(hint);
        break;
      }
    }
  }

  return {
    line: answerLine(fresh, seeds, budget),
    seeds,
    reached: null,
    wasted: seeds.length === 0 && budget === 0,
    mood,
  };
}

/** Flat, plain phrasing. The engine is not trying to write dialogue. */
function answerLine(fresh, seeds, budget) {
  if (budget === 0) return `[${fresh.join(', ')}] — no, nothing there.`;
  if (!seeds.length) return `[${fresh.join(', ')}] — no, nothing unusual.`;
  return `[${fresh.join(', ')}] — no, though there's ${seeds.join(' and ')}.`;
}

/**
 * Does she accept a hold? A settled requirement: the caller can say no,
 * and repeating it wears.
 */
function acceptsHold(call, holdsSoFar, rng) {
  const base = 0.95 - holdsSoFar * 0.25 - (MOOD_START - call.mood) * 0.08;
  return rng() < base;
}

/** End of call: what survives, and what she was taught. */
function writeBack(call, outcome) {
  const sheet = call.sheet;
  const felt = Math.abs(call.mood - MOOD_START) >= 2 || outcome.ending !== 'resolved';
  const next = {
    ...sheet,
    opinion: clamp3(sheet.opinion + opinionDelta(call, outcome)),
    knows: outcome.taught && !sheet.knows.includes(outcome.taught)
      ? sheet.knows.concat(outcome.taught)
      : sheet.knows,
    refillsUsed: sheet.refillsUsed + (outcome.refillUsed ? 1 : 0),
    calls: felt
      ? sheet.calls.concat([{ gist: outcome.gist, ending: outcome.ending }])
      : sheet.calls,
  };
  return next;
}

function opinionDelta(call, outcome) {
  if (outcome.ending === 'resolved') return call.mood >= MOOD_START ? 1 : 0;
  if (outcome.ending === 'case') return -1;
  if (outcome.ending === 'transfer') return 0;
  return -2; // she gave up on the call
}

function clamp3(n) {
  return Math.max(-3, Math.min(3, n));
}

module.exports = {
  newSheet,
  openCall,
  ask,
  acceptsHold,
  writeBack,
  reaches,
  MOOD_START,
};
