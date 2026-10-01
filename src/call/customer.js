'use strict';

const { SYMPTOM, BASELINE, BELIEFS, VOLUNTEERS, FAMILIES, FLAVOUR_COST } = require('./scenario');

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

const TIERS = ['Copper', 'Silver', 'Gold'];

/**
 * A fresh sheet for a first-time caller.
 *
 * The tier is rolled rather than given: the record never assigns Sella one,
 * and what matters is that a tier exists on the sheet and has to be looked
 * up. The same call plays differently for a Copper and a Gold.
 *
 * @param {{name: string, tier?: string}} who
 * @param {() => number} [rng]
 */
function newSheet(who, rng = Math.random) {
  return {
    name: who.name,
    tier: who.tier || TIERS[Math.floor(rng() * TIERS.length)],
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
    known: [],         // what the agent has established
    forms: [],         // question or statement, for the run-of-guesses check
    departure: null,   // set by the engine from the rolled cause
    recent: SYMPTOM.words.slice(),
    // The last three turns, for the repetition check (settled.md:746). Both
    // halves count: which door was used, and what it was aimed at.
    doors: [],
    subjects: [],
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
function ask(call, hidden, cards, door, direction = 'ask') {
  const words = cards.map((c) => c.word);

  // A statement is an inquiry too (settled.md:1360): a confirmation that
  // invites a No. Yes confirms in one beat; no corrects and hands you the
  // right thing anyway — which is why being wrong is cheap for both sides.
  // What costs is a run of them, because that reads as guessing at everything.
  if (direction === 'state') {
    let told = 0;
    for (const c of cards) told += FLAVOUR_COST[c.flavour] || 0;
    const runOfGuesses = call.forms.slice(-3).filter((f) => f === 'state').length >= 2;
    call.forms.push('state');
    const supported = words.filter((w) => call.said.has(w) || (call.known || []).includes(w));
    const wrong = words.filter((w) => !supported.includes(w));
    for (const w of words) call.said.add(w);
    if (wrong.length) {
      const put = wrong.map((w) => BELIEFS[w]
        ? (BELIEFS[w][call.sheet.tier] || BELIEFS[w].any)
        : BASELINE[w] || null).filter(Boolean);
      return {
        line: put.length
          ? put.join(' ')
          : `I couldn't tell you — that's what I'm asking you.`,
        seeds: [],
        reached: null,
        // A no corrects you, which is information, not a wasted play.
        wasted: put.length === 0,
        mood: told - (runOfGuesses ? 1 : 0),
      };
    }
    return {
      line: "That's it, yes. That's what I'm saying.",
      seeds: [],
      reached: null,
      wasted: false,
      mood: told + 1 - (runOfGuesses ? 1 : 0),
    };
  }

  // A third check of the same thing is dangerous for anyone (settled.md:748).
  // A new apprentice is softly limited, not hard-limited (settled.md:752), so
  // this costs rather than forbids.
  let mood = 0;
  const recentSubjects = call.subjects.slice(-6);
  const doorRuns = call.doors.slice(-3).filter((d) => d === door).length;
  // "A third check of the same thing is dangerous for anyone" — so the cost
  // lands on the third, not the second (settled.md:748).
  const thirdCheck = words.some(
    (w) => recentSubjects.filter((x) => x === w).length >= 2,
  );
  if (doorRuns >= 2) mood -= 1; // the third use of the same door, as above
  if (thirdCheck) mood -= 1;
  if (door) call.doors.push(door);
  for (const w of words) call.subjects.push(w);
  for (const c of cards) mood += FLAVOUR_COST[c.flavour] || 0;

  // Asking for something she has already given costs her patience and
  // returns nothing. This is the commonest wasted play there is.
  const stale = words.filter((w) => call.said.has(w));
  const fresh = words.filter((w) => !call.said.has(w));
  if (stale.length) mood -= 1;

  if (reaches(hidden, words)) {
    for (const w of words) call.said.add(w);
    return {
      line: call.departure,
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
      if (words.includes(adj)) continue; // don't offer back what was just asked
      seeds.push(adj);
    }
  }

  call.recent = seeds.concat(fresh);
  // What this particular trouble makes her mention. She volunteers it
  // only while the call is going well: being comfortable is what buys
  // the detail nobody asked for, which is why keeping her that way is
  // worth more than any single question.
  if (room >= MOOD_START) {
    for (const hint of hintsFor(call, hidden, words, seeds)) seeds.push(hint);
  }

  // If she was asked about something on her shelf that did not change, the
  // answer is her normal one — a real answer that eliminates a line — and
  // she is still talking, so what she volunteers comes out alongside it.
  // She answers everything she was asked, not the first thing the engine
  // happened to find. Two cards are two questions.
  const answers = [];
  for (const w of fresh) {
    if (BELIEFS[w]) answers.push(BELIEFS[w][call.sheet.tier] || BELIEFS[w].any);
    else if (BASELINE[w]) answers.push(BASELINE[w]);
  }
  const answered = answers.length ? answers.join(' ') : null;

  // Don't have her volunteer something she has just said. Compare the words
  // she would use, not the card names — her answer about the refill and her
  // aside about the draught are the same sentence.
  const already = answered || '';
  const fresh_seeds = seeds.filter((w) => {
    const phrase = VOLUNTEERS[w];
    if (!phrase) return true;
    const stem = phrase.replace(/^(it's|it|I|there's|they|the)\s+/i, '').slice(0, 18);
    return !already.toLowerCase().includes(stem.toLowerCase());
  });
  return {
    line: answered
      ? (fresh_seeds.length ? `${answered} ${mentions(fresh_seeds)}` : answered)
      : answerLine(fresh, seeds, budget),
    seeds,
    reached: null,
    wasted: !answered && seeds.length === 0 && budget === 0,
    mood,
  };
}

/** What this trouble makes her mention, given what she was just asked. */
function hintsFor(call, hidden, words, already) {
  const hints = hidden.hints || {};
  const out = [];
  for (const w of words) {
    for (const hint of (hints[w] || [])) {
      if (call.pool.includes(hint) || call.said.has(hint)) continue;
      if (already.includes(hint) || out.includes(hint)) continue;
      out.push(hint);
      break;
    }
  }
  return out;
}

/**
 * When she has nothing to add.
 *
 * Plain phrasing, not dialogue-writing — but it has to sound like a person
 * with nothing to say rather than a null result, because a player reads it
 * as her and judges the call by it.
 */
function answerLine(fresh, seeds, budget) {
  const subject = fresh.join(' and ');
  if (budget === 0) return `${cap(subject)}… no. There's nothing I can tell you about that.`;
  if (!seeds.length) return `${cap(subject)}? No, nothing out of the ordinary there.`;
  return `${cap(subject)}, no. ${mentions(seeds)}`;
}

/** Her way of mentioning what she has just thought of. */
function mentions(seeds) {
  const said = seeds.map((w) => VOLUNTEERS[w] || w);
  if (!said.length) return '';
  const joined = said.length === 1 ? said[0] : `${said.slice(0, -1).join(', ')} and ${said[said.length - 1]}`;
  return `${cap(joined)}.`;
}

function cap(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
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
  const felt = Math.abs(call.mood - MOOD_START) >= 2 || outcome.ending !== 'resolve';
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
  if (outcome.ending === 'resolve') return call.mood >= MOOD_START ? 1 : 0;
  if (outcome.ending === 'hold') return -1;
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
