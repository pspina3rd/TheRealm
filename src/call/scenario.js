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
  id: 'poof-refill-came-back-wrong',
  opening: "I sent my flask off for a refill by POOF, and what's come back isn't right.",
  // Key words, not phrases, and nothing entailed by another.
  words: ['flask', 'refill', 'poof', 'wrong'],
};

/**
 * How she normally sends one.
 *
 * Her ordinary practice, which is what she will describe when asked about a
 * part of it that did not change this time. A cause is a departure from this,
 * and every departure is something she did without thinking it mattered.
 */
const BASELINE = {
  crate: 'The TLC crate. The plain one they give you.',
  else: 'Nothing else in with it. Just the flask.',
  measure: 'The measure the apothecary wrote down for me.',
  ingredients: 'What the apothecary sold me for it, same as always.',
  flask: "Same flask I've always sent. Nothing wrong with the flask.",
  refill: "It's the healing draught it comes back with.",
  poof: "I've sent it that way a dozen times and it's always been right.",
  wrong: "It's thinner. Weaker than it should be, and the colour's off.",
  // Things anyone would ask about a shipment, none of which is ever the
  // cause. A real call has far more askable than answerable, which is what
  // makes knowing where to look worth anything.
  when: 'Tuesday, first thing. It came back the next morning.',
  depot: 'The one in the village. I walk it down myself.',
  carriage: 'The usual rate. I paid it at the counter.',
  label: 'They wrote it out for me there and I checked it.',
  weather: "It was dry. Not that I'd have thought it mattered.",
  handed: 'The lad at the counter took it off me.',
  waited: "I didn't wait. They send it on when the mage comes round.",
};

/**
 * What she says when asked about her own account.
 *
 * Her belief, not the record's fact, and allowed to be wrong. The player has
 * the CRM and she has only herself (settled.md:1168).
 */
const BELIEFS = {
  subscriptions: {
    Copper: 'The monthly one, for the flask. The ordinary draught, I think.',
    Silver: "The monthly one. Standard draught — that's what I pay for.",
    Gold: 'The good one. It should be the strong draught in there.',
  },
  billing: { any: "It goes out every month, same day. I've never missed one." },
  'order history': { any: "I've sent it off this way plenty of times. A dozen, near enough." },
  'account history': { any: "Nothing's changed. Same address, same flask, since I took it out." },
  hands: { any: 'Nobody else. It sits by my bed.' },
};

/**
 * Four causes, all of them hers, none of them her fault in the way she would
 * recognise. Each is reachable by a word she uses herself — which is what a
 * scenario needs if the caller might refuse a hold.
 */
const CAUSES = [
  {
    id: 'own-container',
    reach: [['crate']],
    hints: { poof: ['crate'], flask: ['crate'] },
    connects: true,
    departures: [
      "Not this time — their crate had got damp, so I used my own box. The one with the brass fittings.",
      "I hadn't a crate left, so it went in a chest of mine. It has silver on the corners.",
    ],
    fix: {
      id: 'plain-crate',
      line: 'Metal on the box changes what the spell does on its way through. A plain TLC crate and it comes back as it should.',
      reply: "The box did it? I'd never have thought of that for a moment.",
    },
  },
  {
    id: 'sent-together',
    reach: [['else']],
    hints: { crate: ['else'], poof: ['else'] },
    connects: false,
    departures: [
      "I did put my sister's kettle in with it, to save the carriage.",
      "There was a bundle of candles in there as well. It seemed a waste to send air.",
    ],
    fix: {
      id: 'send-alone',
      line: 'Two things in one crate share what POOF does to them. Send the flask on its own and it comes back right.',
      reply: 'So the kettle took some of it. I was only trying to be careful with the money.',
    },
  },
  {
    id: 'sent-extra',
    reach: [['measure']],
    hints: { ingredients: ['measure'], wrong: ['measure'] },
    connects: false,
    departures: [
      "I sent extra, to be safe. I thought more could only help.",
      "I rounded it up. There was a bit left in the jar and it seemed a shame to keep it.",
    ],
    fix: {
      id: 'the-measure',
      line: 'More thins it rather than strengthens it — send the measure and nothing over.',
      reply: "Extra made it weaker? That's backwards to me, but I'll do as you say.",
    },
  },
  {
    id: 'remnant-ingredients',
    reach: [['ingredients']],
    hints: { measure: ['ingredients'], refill: ['ingredients'] },
    connects: false,
    departures: [
      "I used up what I had in the back of the cupboard. Old jars, the last of three of them.",
      "They were the scrapings, if I'm honest. I was saving the fresh ones.",
    ],
    fix: {
      id: 'fresh-ingredients',
      line: "What comes back can only be as good as what went in. Fresh ingredients and it'll be the draught you know.",
      reply: 'So it was only ever going to be as good as the old jars. I see.',
    },
  },
];

/** What the coworker seeds into the pool when the brief is good. */
const COWORKER_WORDS = ['crate', 'else', 'measure', 'ingredients'];

/**
 * Word families. A key word is not one card: it is the word itself,
 * its searchable neighbours, and flavoured versions of itself. Flavour
 * changes what it costs her, never what it reaches.
 */
const FAMILIES = {
  flask: { adjacent: [], flavours: ['plain'] },
  refill: { adjacent: ['draught'], flavours: ['plain'] },
  poof: { adjacent: ['crate', 'depot'], flavours: ['plain', 'routine'] },
  wrong: { adjacent: ['when'], flavours: ['plain', 'frustration'] },
  crate: { adjacent: ['else', 'label'], flavours: ['plain', 'blame', 'routine'] },
  else: { adjacent: [], flavours: ['plain', 'support'] },
  measure: { adjacent: ['ingredients'], flavours: ['plain', 'blame', 'routine'] },
  ingredients: { adjacent: ['apothecary'], flavours: ['plain', 'support'] },
  draught: { adjacent: [], flavours: ['plain'] },
  apothecary: { adjacent: [], flavours: ['plain'] },
  when: { adjacent: ['weather'], flavours: ['plain', 'routine'] },
  depot: { adjacent: ['handed', 'carriage'], flavours: ['plain', 'routine'] },
  carriage: { adjacent: [], flavours: ['plain'] },
  label: { adjacent: [], flavours: ['plain'] },
  weather: { adjacent: [], flavours: ['plain'] },
  handed: { adjacent: ['waited'], flavours: ['plain', 'support'] },
  waited: { adjacent: [], flavours: ['plain'] },
};

/** Flavour effects, in mood points. Blame is the expensive one. */
const FLAVOUR_COST = {
  plain: 0,
  routine: 0,
  support: +1,
  frustration: -1,
  blame: -2,
};

/**
 * What a search returns, exactly as the record lists it (settled.md:872):
 * Billing, Account History, Order History, Subscriptions, Minions.
 * Entitlement sits under subscriptions and the address under account
 * history, rather than being fields of their own.
 */
/**
 * How she mentions a thing she volunteers.
 *
 * A seeded word is a card to the engine and a thing in her house to her. She
 * has to say it in a sentence, or the player is reading debug output with
 * ellipses round it.
 */
const VOLUNTEERS = {
  crate: 'it went in a crate, of course',
  else: 'there was room left in it, mind',
  measure: 'I measured it out myself',
  ingredients: 'the ingredients came from the apothecary',
  apothecary: "it's the apothecary on the square I use",
  draught: "it's the healing draught it comes back with",
  when: 'I sent it Tuesday',
  depot: 'I take it down to the village depot',
  carriage: 'I paid the carriage at the counter',
  label: 'they wrote the label out for me',
  weather: 'it was dry that day',
  handed: 'the lad at the counter took it off me',
  waited: "I didn't stop to watch it go",
};

const CRM_FIELDS = ['billing', 'account history', 'order history', 'subscriptions', 'hands'];

/** Ways in. Only these are dealable before identification. */
const IDENTIFIERS = ['name', 'account number', 'subscription number', 'phone'];

module.exports = {
  SYMPTOM,
  BASELINE,
  BELIEFS,
  VOLUNTEERS,
  CAUSES,
  COWORKER_WORDS,
  FAMILIES,
  FLAVOUR_COST,
  CRM_FIELDS,
  IDENTIFIERS,
};
