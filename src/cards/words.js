'use strict';

/**
 * Where her words come from.
 *
 * A slot in her template holds a plain base word — *mad, sad, bad, glad, not
 * bad, not good, good* — and each layer of her sheet offers what she might
 * say instead, roughly as if she had a thesaurus (settled.md §8, Her words).
 * The word and the sentence shape are chosen together, because *mad* sits in
 * "I'm mad at this" and *insane* needs "I'm going insane dealing with this".
 *
 * `PEOPLE` is the common pool and is always available. The first two frames
 * under `mad` are Phil's own lines; **[C] the rest are mine.** A scenario adds
 * the person and the baggage through its `VOICE`.
 */

const BASES = ['mad', 'sad', 'bad', 'not good', 'not bad', 'good', 'glad'];

const PEOPLE = {
  mad: [
    { word: 'going insane', frame: "I'm going insane dealing with {at}" },
    { word: 'crazy', frame: '{At} is driving me crazy' },
    { word: 'fed up', frame: "I'm fed up with {at}" },
  ],
  sad: [
    { word: 'upset', frame: "I'm upset about {at}" },
    { word: 'at a loss', frame: "I'm at a loss with {at}" },
  ],
  bad: [
    { word: 'not happy', frame: "I'm not happy with {at}" },
    { word: 'had enough', frame: "I've had enough of {at}" },
  ],
  'not good': [
    { word: 'not great', frame: "This isn't great" },
    { word: 'getting nowhere', frame: "We're getting nowhere with {at}" },
  ],
  'not bad': [
    { word: 'fine', frame: "It's fine so far" },
    { word: 'all right', frame: "That's all right" },
  ],
  good: [
    { word: 'better', frame: "That's better" },
    { word: 'good', frame: 'Good' },
  ],
  glad: [
    { word: 'relieved', frame: "That's a relief" },
    { word: 'glad', frame: "I'm glad I rang" },
  ],
};

/** How much each layer's offer weighs against the common pool. Guesses. */
const WEIGHT = { people: 1, baggage: 2, person: 3 };
/** A word of her own that she has already used comes back more readily. */
const RETURNS = 1.5;

/**
 * The base feeling, from how the call is going for her.
 *
 * The middle is the same for everyone; the low end is where her baggage
 * shows, so two callers having an equally bad call are not both *mad*.
 * This is how she would put it if she put it at all — not a reading of how
 * much she feels, which is why `spoken` in the template is a separate thing.
 *
 * @param {number} mood - higher is going better for her.
 * @param {'mad'|'sad'} [lean] - what her baggage leans to at the low end.
 * @returns {string} one of `BASES`
 */
function feelingBase(mood, lean = 'mad') {
  if (mood >= 2) return 'glad';
  if (mood >= 1) return 'good';
  if (mood >= 0) return 'not bad';
  if (mood >= -1) return 'not good';
  if (mood >= -2) return 'bad';
  return lean === 'sad' ? 'sad' : 'mad';
}

/**
 * Every word she could reach for, for one base feeling, with its layer.
 *
 * @param {string} base
 * @param {object} [voice] - the scenario's `VOICE`.
 * @param {string} [baggageId]
 * @returns {Array<{word: string, frame: string, layer: string}>}
 */
function offers(base, voice = {}, baggageId = null) {
  const out = (PEOPLE[base] || []).map((w) => ({ ...w, layer: 'people' }));
  const mine = voice.baggage && voice.baggage[baggageId];
  for (const w of (mine && mine[base]) || []) out.push({ ...w, layer: 'baggage' });
  for (const w of (voice.person && voice.person[base]) || []) out.push({ ...w, layer: 'person' });
  return out;
}

/**
 * Pick her word for a base feeling.
 *
 * Weighted, not uniform: her own words outweigh the common pool, and one she
 * has already used on this call outweighs it again, which is how a caller
 * comes to have a word she keeps returning to.
 *
 * @param {object} args
 * @param {string} args.base
 * @param {object} [args.voice]
 * @param {string} [args.baggageId]
 * @param {string[]} [args.used] - words she has already said on this call.
 * @param {() => number} args.rng
 * @returns {{base: string, word: string, frame: string, layer: string}|null}
 */
function pickWord({ base, voice, baggageId, used = [], rng }) {
  const pool = offers(base, voice, baggageId);
  if (!pool.length) return null;
  const weight = (w) =>
    WEIGHT[w.layer] * (w.layer !== 'people' && used.includes(w.word) ? RETURNS : 1);
  const total = pool.reduce((n, w) => n + weight(w), 0);
  let roll = rng() * total;
  for (const w of pool) {
    roll -= weight(w);
    if (roll <= 0) return { base, word: w.word, frame: w.frame, layer: w.layer };
  }
  const last = pool[pool.length - 1];
  return { base, word: last.word, frame: last.frame, layer: last.layer };
}

/** Put what the feeling lands on into the frame. */
function frameWith(frame, at) {
  const cap = at.charAt(0).toUpperCase() + at.slice(1);
  return frame.replace('{At}', cap).replace('{at}', at);
}

module.exports = { BASES, PEOPLE, WEIGHT, feelingBase, offers, pickWord, frameWith };
