'use strict';

/**
 * The flask scenario: one symptom, four causes, and the words that
 * reach them.
 *
 * This is the data the engine plays against. It follows
 * `supportCall.js`'s rule — there is no diagnosis step. The player
 * never labels a cause. A cause becomes known because a word reached
 * its evidence and the customer said something; the engine then knows
 * what a fix would have to be, and the player either plays it or runs
 * out of turns.
 *
 * `reach` is the load-bearing field. A cause with a single word is
 * cheap to find; one that needs a pair costs a turn's whole hand and
 * cannot be stumbled into by a customer volunteering things.
 */

const SYMPTOM = {
  id: 'flask-did-not-refill',
  opening: "My flask's meant to refill overnight, and this morning it's empty.",
  // Key words, not phrases. "every" is entailed by overnight + refill.
  words: ['flask', 'refill', 'overnight', 'morning', 'empty'],
};

/**
 * Every cause presents identically. What differs is which words reach
 * it, whether the customer has connected it herself, and what putting
 * it right asks of her.
 */
const CAUSES = [
  {
    id: 'stopper-left-out',
    reach: [['stopper']],
    hints: { vial: ['stopper'], refill: ['vial'] },
    // She knows the answer the moment she is asked the question.
    connects: true,
    says: "…the stopper. I decanted some into a vial for my sister and I don't think I put it back.",
    fix: { id: 'stopper-in', line: 'Stoppered tonight and it fills as normal.' },
  },
  {
    id: 'charm-interference',
    reach: [['near'], ['enchanted']],
    // What she volunteers, and when. A cause with no trail can only be
    // reached by the coworker's lines; a cause with one can be walked to.
    hints: { shelf: ['charm'], near: ['charm'] },
    connects: false,
    says: "My sister gave me a charm last week. It's up on the shelf.",
    fix: { id: 'move-charm', line: 'Two enchantments that close will interfere. Move it and it fills tonight.' },
  },
  {
    id: 'drank-in-the-night',
    // The one that needs a pair, and that she would never volunteer.
    reach: [['night', 'water'], ['night', 'cup']],
    hints: { night: ['water', 'cup'], bed: ['cup'] },
    connects: false,
    says: "I woke up thirsty. I had a drink. The cup's always— …oh.",
    fix: { id: 'nothing-broken', line: "Nothing's broken. It fills again tonight." },
  },
  {
    id: 'rinsed-it-out',
    reach: [['bed'], ['rinse']],
    hints: { empty: ['stale'], refill: ['stale'] },
    connects: false,
    says: "Nothing. I rinsed it out before bed, it had gone a bit stale.",
    fix: { id: 'leave-it-dry', line: 'Leave it dry tonight and it fills.' },
  },
];

/** What the coworker seeds into the pool when the brief is good. */
const COWORKER_WORDS = ['stopper', 'enchanted', 'near', 'bed', 'night'];

/**
 * Word families. A key word is not one card: it is the word itself,
 * its searchable neighbours, and flavoured versions of itself. Flavour
 * changes what it costs her, never what it reaches.
 */
const FAMILIES = {
  flask: { adjacent: ['vial'], flavours: ['plain'] },
  refill: { adjacent: ['draught'], flavours: ['plain'] },
  overnight: { adjacent: ['night'], flavours: ['plain', 'routine'] },
  morning: { adjacent: [], flavours: ['plain', 'frustration'] },
  empty: { adjacent: [], flavours: ['plain', 'frustration'] },
  stopper: { adjacent: ['cord'], flavours: ['plain', 'blame', 'routine'] },
  enchanted: { adjacent: ['charm'], flavours: ['plain'] },
  near: { adjacent: ['shelf'], flavours: ['plain', 'support'] },
  bed: { adjacent: ['sleep'], flavours: ['plain', 'routine'] },
  night: { adjacent: ['water', 'cup', 'thirst'], flavours: ['plain', 'routine'] },
  charm: { adjacent: [], flavours: ['plain', 'support'] },
  shelf: { adjacent: ['candle', 'cup', 'ring'], flavours: ['plain'] },
  cup: { adjacent: ['water'], flavours: ['plain'] },
  cord: { adjacent: [], flavours: ['plain'] },
  water: { adjacent: [], flavours: ['plain'] },
  rinse: { adjacent: [], flavours: ['plain', 'blame'] },
  stale: { adjacent: ['rinse'], flavours: ['plain'] },
};

/** Flavour effects, in mood points. Blame is the expensive one. */
const FLAVOUR_COST = {
  plain: 0,
  routine: 0,
  support: +1,
  frustration: -1,
  blame: -2,
};

/** CRM fields, dealt once an account has been contracted to. */
const CRM_FIELDS = ['subscription', 'refills', 'address', 'billing', 'orders', 'minions'];

/** Ways in. Only these are dealable before identification. */
const IDENTIFIERS = ['name', 'account number', 'subscription number', 'phone'];

module.exports = {
  SYMPTOM,
  CAUSES,
  COWORKER_WORDS,
  FAMILIES,
  FLAVOUR_COST,
  CRM_FIELDS,
  IDENTIFIERS,
};
