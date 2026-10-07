'use strict';

const { SUBJECTS } = require('./case');

/**
 * The customer's character sheet: her wards, her baggage, and what the
 * player has learned about her.
 *
 * Wards are set per subject, independently, so two targets on one sheet can
 * differ. A ward is never read off the sheet by the player; it is learned by
 * bouncing off it. Nothing here is shared between customers: the trigger
 * comes from her own baggage, so what is learned about one caller does not
 * transfer to the next.
 */

/**
 * The kinds of baggage a customer can carry, each with the trigger that
 * uncovers her Need.
 *
 * `trigger.subject` meets the trigger directly. `near` lists subjects that
 * meet it obliquely, and `suits` is which suits can carry it either way.
 * The trigger does not have to be met head on: a move that never names the
 * trigger's own subject can still fire it, which is why the player has
 * somewhere to go when the direct door is warded shut.
 */
const BASELINE_BAGGAGE = {
  blamed: {
    id: 'blamed',
    line: "Last time it went wrong, it was somehow my fault.",
    trigger: { subject: 'form', near: ['ordered', 'ingredients', 'proportions'], suits: ['who', 'how'] },
  },
  unheard: {
    id: 'unheard',
    line: "I've rung before and nobody wrote any of it down.",
    trigger: { subject: 'pattern', near: ['season', 'poof', 'paid'], suits: ['when', 'what'] },
  },
  overruled: {
    id: 'overruled',
    line: "I do the work and somebody else signs off on it.",
    trigger: { subject: 'fee', near: ['container', 'paid', 'who'], suits: ['why', 'who'] },
  },
};

const BAGGAGE = Object.freeze(BASELINE_BAGGAGE);

const DEFAULT_WARD = 2;

/** Roll an integer in lo..hi inclusive from an injected rng. */
function roll(lo, hi, rng) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/**
 * A fresh sheet for a customer.
 *
 * Every subject in the case gets its own ward roll, which is what lets one
 * customer be easy to ask about the order and hard to ask about the fee.
 * `baggage` may be a BAGGAGE key or a baggage object; the object is stored
 * as given and never modified.
 *
 * @param {{who: string, baggage: string|object, rng: () => number}} args
 * @returns {{who: string, baggage: object, wards: Object<string, number>,
 *   learned: string[], empathy: number, patience: number}}
 */
function newSheet({ who, baggage, rng, subjects }) {
  const kind = typeof baggage === 'string' ? BAGGAGE[baggage] : baggage;
  if (!kind) throw new Error(`unknown baggage: ${baggage}`);
  const wards = {};
  // The scenario's own subjects when it has them: a ward is per target, and
  // the targets belong to the call being played.
  for (const s of subjects || SUBJECTS) wards[s] = roll(1, 3, rng);
  const empathy = roll(1, 5, rng);
  const patience = roll(1, 5, rng);
  return Object.freeze({
    who,
    baggage: kind,
    wards: Object.freeze(wards),
    learned: Object.freeze([]),
    empathy,
    patience,
  });
}

/**
 * The ward on one subject. An unknown subject reads as the middle ward
 * rather than throwing, so a stray target never crashes a call.
 *
 * @param {{wards: Object<string, number>}} sheet
 * @param {string} subject
 * @returns {number} 1..3
 */
function ward(sheet, subject) {
  const w = sheet.wards[subject];
  return Number.isInteger(w) ? w : DEFAULT_WARD;
}

const READINGS = {
  1: 'She answered, but not quite the way you asked it.',
  2: 'She will not take that question cold.',
  3: 'She closes up; that is not a door this move opens.',
};

/**
 * A failed attempt that teaches something.
 *
 * Returns a reading rather than nothing, so the player learns about the
 * ward by failing against it. The reading is true of the ward but is
 * deliberately worded without the number: knowing it is a 2 would turn a
 * read of the customer into arithmetic.
 *
 * @param {{wards: Object<string, number>}} sheet
 * @param {string} subject
 * @param {string} suit
 * @returns {{reading: string, ward: number}}
 */
function bounce(sheet, subject, suit) {
  const w = ward(sheet, subject);
  const reading = READINGS[w] || READINGS[DEFAULT_WARD];
  return { reading: suit ? reading : READINGS[DEFAULT_WARD], ward: w };
}

/**
 * Record that the player has learned this subject's ward. Returns a new
 * sheet; the original is left alone and no subject is listed twice.
 *
 * @param {object} sheet
 * @param {string} subject
 * @returns {object}
 */
function remember(sheet, subject) {
  if (sheet.learned.includes(subject)) return Object.freeze({ ...sheet });
  return Object.freeze({ ...sheet, learned: Object.freeze([...sheet.learned, subject]) });
}

/**
 * Whether a suit suits a target: 'known', 'learnable' or 'unknowable'.
 *
 * It takes the customer (through her sheet), the sheet's ward and the
 * target together. A ward of 3 shuts everything except the suits her
 * baggage trigger can carry, which keeps one route open instead of
 * making her unreadable.
 *
 * @param {string} suit
 * @param {string} subject
 * @param {object} sheet
 * @returns {'known'|'learnable'|'unknowable'}
 */
function fitness(suit, subject, sheet) {
  if (sheet.learned.includes(subject)) return 'known';
  if (ward(sheet, subject) <= 2) return 'learnable';
  return sheet.baggage.trigger.suits.includes(suit) ? 'learnable' : 'unknowable';
}

/**
 * Whether a move fires her trigger, and whether it did so obliquely.
 *
 * The suit must be one the trigger carries. Naming the trigger's own
 * subject fires it directly; naming one of its `near` subjects fires it
 * obliquely. Anything else does nothing.
 *
 * @param {object} sheet
 * @param {{suit: string, subject: string}} move
 * @returns {{fired: boolean, oblique: boolean}}
 */
function fires(sheet, { suit, subject }) {
  const t = sheet.baggage.trigger;
  if (!t.suits.includes(suit)) return { fired: false, oblique: false };
  if (subject === t.subject) return { fired: true, oblique: false };
  if (t.near.includes(subject)) return { fired: true, oblique: true };
  return { fired: false, oblique: false };
}

module.exports = { BAGGAGE, newSheet, ward, bounce, remember, fitness, fires };
