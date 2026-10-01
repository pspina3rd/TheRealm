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
/**
 * How things normally are on her shelf.
 *
 * Her answers in the record's scenes — the stopper on a cord, the ring up
 * there every night for a year, water in the cup, just a candle — are the
 * baseline, not laws. A cause is a **departure** from it, which is why the
 * questions are about her routine: the signal is the deviation.
 */
const BASELINE = {
  flask: "Same flask I've always had. It looks no different to me.",
  empty: 'Bone dry. Not a drop left in it.',
  morning: 'When I got up, first thing. It should have been full by then.',
  refill: 'It fills itself overnight. That is the whole point of it.',
  stopper: "It was. It's on a cord, it doesn't come off.",
  ring: "It is. It's been up there every night for a year.",
  candle: 'No, just a candle.',
  cup: 'Water for the night.',
  water: "It's what I keep by the bed. I fill the cup before I turn in.",
  night: 'I slept through, same as usual.',
  bed: 'Nothing out of the ordinary. I put it up and went to sleep.',
};

/**
 * What she says when asked about her own account.
 *
 * Her belief, not the record's fact — and it is allowed to be wrong. The
 * player has the CRM and she has only herself (settled.md:1168), so the gap
 * between these lines and what the record says is where her expectations sit.
 */
const BELIEFS = {
  subscriptions: {
    Copper: 'The monthly one, for the flask. The ordinary draught, I think.',
    Silver: "The monthly one. Standard draught — that's what I pay for.",
    Gold: 'The good one. It should be the strong draught in there.',
  },
  billing: {
    any: "It goes out every month, same day. I've never missed one.",
  },
  'order history': {
    any: "I've collected one before, when I was caught short. A while ago now.",
  },
  'account history': {
    any: "Nothing's changed. Same address, same flask, since I took it out.",
  },
  hands: {
    any: 'Nobody else. It sits by my bed.',
  },
};

const CAUSES = [
  {
    id: 'stopper-left-out',
    reach: [['stopper']],
    connects: true,
    // The cord is the normal state; this is what went wrong with it.
    departures: [
      "It wasn't, no — the cord's frayed through and the stopper's on the shelf.",
      "…it isn't. I untied it to pour some off and left it beside the flask.",
    ],
    of: 'stopper',
    fix: {
      id: 'stopper-in',
      line: 'Stoppered tonight and it fills as normal.',
      reply: "That's it? I'll put it back on now.",
    },
  },
  {
    id: 'charm-interference',
    reach: [['near'], ['enchanted']],
    hints: { shelf: ['charm'], near: ['charm'] },
    connects: false,
    departures: [
      "There's a charm up there now that wasn't before.",
      "My ring — it was enchanted last week. It's been up there a year, but that part is new.",
    ],
    of: 'ring',
    fix: {
      id: 'move-charm',
      line: 'Two enchantments that close will interfere. Move one and it fills tonight.',
      reply: "The charm can go on the mantel. It'll fill tonight, then?",
    },
  },
  {
    id: 'drank-in-the-night',
    reach: [['night', 'water'], ['night', 'cup']],
    hints: { night: ['water', 'cup'], bed: ['cup'] },
    connects: false,
    departures: [
      "I woke up thirsty. I had a drink. The cup's always— …oh.",
    ],
    of: 'night',
    fix: {
      id: 'nothing-broken',
      line: "Nothing's broken. It fills again tonight.",
      reply: 'Nothing wrong with it at all. Right. And tonight?',
    },
  },
  {
    // The open slot. The record names only "did something she didn't think
    // mattered" (settled.md:2020) — naming one act would hand the player a
    // catalogue, which is what supportCall.js exists to prevent.
    id: 'did-something-she-didnt-think-mattered',
    reach: [['bed']],
    connects: false,
    departures: [
      "Nothing. I rinsed it out before bed, it had a taste to it.",
      "Nothing… I moved it while I was cleaning, it was back before dark.",
      "Nothing. I lent it out for an hour, it came straight back.",
      "Nothing. It was in my bag most of the day, if that counts.",
      "Nothing. I left it by the fire to take the chill off it.",
      "Nothing. I topped it up from the jug — it looked low.",
    ],
    of: 'bed',
    fix: {
      id: 'leave-it-be',
      line: 'Leave it as it is tonight and it fills.',
      reply: "So I just leave it be. And that's all it was?",
    },
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
  flask: { adjacent: [], flavours: ['plain'] },
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
  night: 'it was an ordinary night, mind',
  water: 'I keep water by the bed',
  cup: "there's a cup up there too",
  cord: "the stopper's on a cord",
  charm: "there's a charm up there now",
  shelf: 'it sits on the shelf by the bed',
  candle: "there's a candle beside it",
  ring: 'my ring goes up there when I take it off',
  sleep: 'I sleep right beside it',
  draught: "it's the healing draught it fills with",
  thirst: 'I do wake up thirsty sometimes',
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
