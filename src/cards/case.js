'use strict';

/**
 * The call: a POOF Instant Order that came back uneven.
 *
 * Record-compliant where `src/call/scenario.js` is not. Nothing of the
 * customer's travels and nothing is refilled (settled.md:235, :241): TLC
 * loaded containers from a custom order and sent them. What came back is a
 * batch of healing draughts that are not the same as each other.
 *
 * Every cause here is a settled POOF rule doing what it says it does, not an
 * invented fault:
 *  - a quantity of sets gives that many items sharing one roll, each taking
 *    it by its own share (settled.md:452)
 *  - a customer who oversupplied the cheaper material gets a diluted item
 *    (settled.md:461)
 *  - mixed sourcing spreads, and a good set doesn't lift the poor ones
 *    (settled.md:452)
 *  - a custom container carries a fee and a line on the order, and is
 *    innocuous until it isn't (settled.md:717, :727)
 *
 * The caller is a guild Member rather than the Admin, so the call also runs
 * through §10's visibility: she cannot see the order she is ringing about,
 * and exactly one person on her account can.
 */

/** Who is calling. */
const CALLER = {
  name: 'Oda Varn',
  role: 'member',
  account: 'acc-ironbridge',
  contact: 'con-oda',
  guild: 'The Ironbridge Company',
  // What she does there, which is why she is the one ringing.
  job: 'quartermaster',
};

/** Her opening, and the words in it that can be aimed at. */
const OPENING = {
  line: "We had a dozen healing draughts come in from POOF yesterday and they're not the same as each other. Some of them are barely worth drinking.",
  words: ['draughts', 'poof', 'dozen', 'same'],
};

/**
 * Her ordinary practice.
 *
 * What she says when asked about a part of the order that did not change this
 * time. A cause is a departure from this, and no baseline answer asserts
 * anything that varies per call.
 */
const BASELINE = {
  draughts: "Healing draughts. The standard ones, that's what we always order.",
  poof: "We've ordered through POOF since the spring. It's been right every time.",
  dozen: 'Twelve. We order twelve at a time, for the season.',
  same: "They should be twelve of the same thing. That's the whole point of ordering twelve.",
  recipe: "The standard recipe. We've never asked for anything clever.",
  ingredients: 'We send our own in. It works out cheaper than paying TLC rates.',
  container: "Whatever goes round them. I don't see that end of it.",
  ordered: "I write it up and Hald puts it in. There's a form, and I fill the form.",
  paid: 'On the guild account. It goes through the Company, not through me.',
  arrived: 'Yesterday, late. The cart came round after dark.',
  opened: 'I opened the lot this morning, to count them in.',
  used: "Two of them. One worked, one may as well have been water.",
  who: "Whoever's on the bench at TLC, I'd imagine. Nobody says.",
  // Subjects her own answers open. Each needs an ordinary answer for the
  // calls where it is not the departure, and none of them asserts anything
  // that varies between calls.
  sets: 'Twelve sets, one for each draught. I count them in myself.',
  strength: "Standard. That's what the recipe is and what we pay for.",
  proportions: 'What the recipe says. I weigh it out on the bench.',
  sourcing: 'One lot, out of the spring buy. We keep it together.',
  fee: "Nothing I know of out of the ordinary. The Company sees the invoice, not me.",
  form: 'The standard form. I fill it in at the hall and it goes with the order.',
  pattern: 'The same order, every season. Twelve, standard, for the passes.',
  // Askable and never the cause. A real call has far more askable than
  // answerable, and that is what makes knowing where to look worth anything.
  cart: 'The usual carter. He grumbles, he always has.',
  weather: 'Wet, but they were dry when they came out.',
  store: 'The cold room, with everything else.',
  season: "We're outfitting for the passes. That's why twelve.",
};

/**
 * What an answer puts into play.
 *
 * `opens` is ungated: saying it makes those subjects askable whatever her
 * mood. Without this the board only grows by adjacency and never leaves the
 * opening (settled.md:888).
 */
const GIVES = {
  draughts: ['recipe', 'strength'],
  poof: ['container', 'who'],
  dozen: ['season', 'sets'],
  same: ['used', 'strength'],
  used: ['strength', 'sourcing'],
  recipe: ['ingredients', 'proportions'],
  ingredients: ['sourcing', 'proportions'],
  container: ['fee'],
  ordered: ['form', 'paid'],
  arrived: ['cart', 'opened'],
  opened: ['store', 'used'],
  'order history': ['pattern', 'sets'],
  billing: ['fee', 'paid'],
  'party members': ['form', 'ordered'],
};

/**
 * What she believes about her own account, which is not what the record
 * says. She has only herself; the player has the CRM (settled.md:1168).
 */
const BELIEFS = {
  'order history': { any: "We've ordered the same thing all year. It's never come back like this." },
  billing: { any: 'The Company pays it. I never see the invoice.' },
  'party members': { any: "There's me and there's whoever's in the hall. Hald does the paperwork." },
  'account history': { any: "We've been with TLC since the spring. Nothing's changed." },
};

/**
 * Four causes, each a settled POOF rule. Each is reachable by a word she uses
 * herself, so the call is winnable even if she refuses a hold.
 *
 * `reach` is the load-bearing field: a cause needing a pair of subjects costs
 * more of the nine than one reachable by a single word.
 */
const CAUSES = [
  {
    id: 'shared-roll',
    rule: 'a quantity of sets shares one roll, each taking it by its own share',
    reach: [['sets'], ['dozen', 'same']],
    hints: { dozen: ['sets'], same: ['sets'] },
    // Visible in the record as one order line for twelve rather than twelve
    // lines, which is the agent's corroboration.
    evidence: { category: 'order history', row: 'ord-4471' },
    departures: [
      "They went in as one order, yes. Twelve sets in the one go — it's one form, one fee.",
      "All twelve on the one order. I'd not thought to split it; why would you?",
    ],
    fix: {
      id: 'split-the-send',
      line: "Twelve sets in one send share a single roll, and each one takes it by its own quality — that's why some are thin. Split the order and each gets its own.",
      reply: "One roll for the lot of them. Nobody said that when I ordered twelve.",
    },
  },
  {
    id: 'oversupplied',
    rule: 'a customer who oversupplied the cheaper material gets a diluted item',
    reach: [['proportions']],
    hints: { ingredients: ['proportions'], recipe: ['proportions'] },
    evidence: { category: 'order history', row: 'ord-4471-lines' },
    departures: [
      "I sent extra of the common stuff, to be safe. We had plenty and it seemed daft not to.",
      "I rounded the cheap one up. There was a sack going over anyway.",
    ],
    fix: {
      id: 'the-measure',
      line: 'Extra of the cheaper material dilutes it — the proportions decide the blend, so more of the cheap half makes a weaker draught. The recipe measure, exactly, and they come back even.',
      reply: "Extra made it worse. That's going to take some explaining to Hald.",
    },
  },
  {
    id: 'mixed-sourcing',
    rule: "mixed ingredients spread, and a good set doesn't lift the poor ones",
    reach: [['sourcing']],
    hints: { ingredients: ['sourcing'], store: ['sourcing'] },
    // Deliberately invisible. The record files what was sent, never what
    // condition it was in, so Verify comes back **silent** here — the
    // expensive outcome, and the one that forces the agent to talk to her.
    evidence: null,
    departures: [
      "Some of it was the good stuff from the spring and the rest was whatever was left in the cold room.",
      "Two different lots went in. I didn't think it mattered which was which.",
    ],
    fix: {
      id: 'one-lot',
      line: "Mixed lots spread the result, and the good half doesn't lift the poor half — each takes the roll by its own quality. One lot per send and the twelve come out close.",
      reply: "So the good stock was wasted on the bad. Consistent buying, then.",
    },
  },
  {
    id: 'custom-container',
    rule: 'a custom container carries a fee, a line on the order, and influence on the magic',
    reach: [['fee'], ['container', 'form']],
    hints: { container: ['fee'], billing: ['fee'] },
    evidence: { category: 'billing', row: 'inv-9912' },
    departures: [
      "Hald asked for our own crates — the ones with the iron bands. He likes them stacked his way in the hall.",
      "We send ours back and forth in the banded crates. They're the Company's, they've our mark on them.",
    ],
    fix: {
      id: 'plain-container',
      line: "Metal on the container shapes what the spell does on the way through, and the banded crates are what spread the batch. A plain TLC container and the twelve come back even.",
      reply: "The crates. He'll not want to hear that — he had them made.",
    },
  },
];

/**
 * The Request is twelve even draughts. The Need is underneath it and does not
 * surface unless her trigger fires (settled.md:1517).
 */
const NEED = {
  id: 'blamed-for-it',
  // What she is actually afraid of, which is not the draughts.
  // Says nothing about which cause it was: her Need is about Hald, and it
  // has to read the same whichever of the four turned out to be true.
  line: "If I tell Hald it was something at our end, he'll say I ordered it wrong. He's been looking for a reason since the spring.",
  // The want that follows from it: something in writing that is not her word.
  want: 'the finding on the case, in writing, so it is not her word against his',
};

/**
 * What each subject is called when it is spoken aloud.
 *
 * The board holds single words (settled.md:888) but a question has to sound
 * like a question: *tell me about the same* is not English. The word is the
 * target; the label is how the agent says it.
 */
const LABELS = {
  draughts: 'the draughts',
  poof: 'the POOF order',
  dozen: 'the twelve',
  same: 'the difference between them',
  recipe: 'the recipe',
  ingredients: 'the ingredients you sent',
  container: 'the container',
  ordered: 'the order going in',
  paid: 'the payment',
  arrived: 'the delivery',
  opened: 'the unpacking',
  used: 'the two you tried',
  who: 'the person who made them up',
  cart: 'the carter',
  weather: 'the weather that day',
  store: 'the cold room',
  season: 'the season you are outfitting for',
  sets: 'the sets',
  strength: 'the strength',
  proportions: 'the proportions',
  sourcing: 'the lots it came from',
  fee: 'the fee on the invoice',
  form: 'the order form',
  pattern: 'your earlier orders',
};

/**
 * Which suits fit which subject.
 *
 * Which suit is better suited comes from the customer, her sheet and the
 * target together (settled.md:1512). This is the target's half: a subject
 * that is a person answers to *who*, a method to *how*, a reason to *why*, a
 * time to *when*, a place to *where*, and a thing to *what*. A suit that
 * does not fit the subject is the mismatch she answers obliquely.
 */
const SUIT_FIT = {
  draughts: ['what'],
  poof: ['what', 'how'],
  dozen: ['what'],
  same: ['what', 'why'],
  recipe: ['what', 'how'],
  ingredients: ['what', 'where'],
  container: ['what', 'who'],
  ordered: ['how', 'who'],
  paid: ['who', 'how'],
  arrived: ['when', 'how'],
  opened: ['when', 'who'],
  used: ['what', 'when'],
  who: ['who'],
  cart: ['who', 'when'],
  weather: ['when', 'what'],
  store: ['where'],
  season: ['when', 'why'],
  sets: ['what', 'how'],
  strength: ['what'],
  proportions: ['how', 'why'],
  sourcing: ['where', 'who'],
  fee: ['why', 'what'],
  form: ['who', 'how'],
  pattern: ['when', 'what'],
};

/** Whether this suit fits this subject at all. */
function fits(suit, subject) {
  const list = SUIT_FIT[subject];
  return !list || list.includes(suit);
}

/** How a subject is spoken. Falls back to the bare word. */
function label(subject) {
  return LABELS[subject] || subject;
}

/**
 * Her side of the board is single words only (settled.md:888). The CRM
 * category names that appear as GIVES keys are not her side — they are the
 * record's, and a category is a target in its own right.
 */
const SUBJECTS = Object.keys(BASELINE);

module.exports = { CALLER, OPENING, BASELINE, GIVES, BELIEFS, CAUSES, NEED, SUBJECTS, LABELS, label, SUIT_FIT, fits };
