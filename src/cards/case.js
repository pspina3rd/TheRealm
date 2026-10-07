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

/** What she can give when asked for something searchable. */
const HANDLE = { key: 'PO-1183', say: "It's on the form. PO-1183." };

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
    // What her departure looks like it could be. A cause is not
    // necessarily THE cause (settled.md:793), so hearing what she did never
    // names the remedy on its own.
    suggests: ['split-the-send', 'one-lot'],
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
    suggests: ['the-measure', 'one-lot'],
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
    suggests: ['one-lot', 'the-measure'],
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
    suggests: ['plain-container', 'split-the-send'],
    fix: {
      id: 'plain-container',
      line: "Metal on the container shapes what the spell does on the way through, and the banded crates are what spread the batch. A plain TLC container and the twelve come back even.",
      reply: "The crates. He'll not want to hear that — he had them made.",
    },
  },
];

/**
 * The order's own facts, as slots.
 *
 * These are what her fragments are filled from, so a fragment is never
 * invented: it is a true thing about this order, said in passing.
 */
const ORDER = {
  day: 'Tuesday',
  arrived: 'after dark',
  items: 'twelve healing draughts',
  count: 'twelve',
  strength: 'the standard',
  purpose: 'the passes',
  who: 'Hald',
  where: 'the hall',
  carrier: 'the usual carter',
  paid: 'the guild account',
};

/**
 * What she says when the question does not parse against the subject.
 *
 * A nonsense question — *why did your order get delivered?* — is not heard as
 * nonsense. It is heard as someone misspeaking, and she answers the nearest
 * sensible question instead, handing over a **fragment**: one true thing
 * about the order, with a slot filled in.
 *
 * Fragments link. Three of them give the shape of the order that no single
 * question earned, which is what keeps a badly asked call from being a
 * wasted one — a new apprentice is softly limited, not hard limited
 * (settled.md:1044).
 *
 * `opens` is what the fragment puts in play, so the bricks can be built on.
 */
const FRAGMENTS = {
  arrived: [
    { say: () => `It was delivered ${ORDER.day}, ${ORDER.arrived}.`, opens: ['arrived', 'cart'] },
    { say: () => `${ORDER.carrier[0].toUpperCase()}${ORDER.carrier.slice(1)} brought it round.`, opens: ['cart'] },
  ],
  draughts: [
    { say: () => `It was a shipment of ${ORDER.items}.`, opens: ['dozen', 'strength'] },
    { say: () => `We needed them for ${ORDER.purpose}.`, opens: ['season'] },
  ],
  dozen: [
    { say: () => `${ORDER.count[0].toUpperCase()}${ORDER.count.slice(1)}, for ${ORDER.purpose}.`, opens: ['season'] },
  ],
  ordered: [
    { say: () => `${ORDER.who} put it in. I wrote it up.`, opens: ['form', 'who'] },
  ],
  paid: [
    { say: () => `It goes on ${ORDER.paid}.`, opens: ['billing'] },
  ],
  container: [
    { say: () => `Whatever went round them came from your end — or ours, I'd have to ask ${ORDER.who}.`, opens: ['who', 'fee'] },
  ],
  store: [
    { say: () => `They're kept at ${ORDER.where}, in the cold room.`, opens: ['store'] },
  ],
  used: [
    { say: () => `Two of ${ORDER.count} have been opened. One was fine.`, opens: ['strength'] },
  ],
};

/** Her fallback when a nonsense question has no fragment for its subject. */
const FRAGMENT_FALLBACK = [
  { say: () => `The order was ${ORDER.items}, delivered ${ORDER.day}.`, opens: ['dozen', 'arrived'] },
  { say: () => `We needed them for ${ORDER.purpose}, if that's what you're after.`, opens: ['season'] },
];

/**
 * Suits that do not parse against a subject at all.
 *
 * Not a judgement about her voice — a judgement about the thing. Nobody asks
 * *why* a delivery happened or *who* did the weather. Everything not listed
 * here and not in SUIT_FIT is merely oblique: the wrong register for the
 * thing, answered sideways.
 */
const SUIT_NONSENSE = {
  draughts: ['when', 'where'],
  poof: ['who'],
  dozen: ['who', 'where'],
  same: ['who', 'where'],
  recipe: ['when'],
  container: ['when'],
  ordered: ['where'],
  paid: ['where'],
  arrived: ['why'],
  opened: ['why'],
  used: ['where'],
  who: ['when', 'where'],
  cart: ['where'],
  weather: ['who', 'why'],
  store: ['when', 'why'],
  season: ['who', 'where'],
  sets: ['when', 'where'],
  strength: ['when', 'who', 'where'],
  proportions: ['when', 'where'],
  sourcing: ['when'],
  fee: ['when', 'where'],
  form: ['when', 'where'],
  pattern: ['who', 'where'],
  ingredients: ['when'],
};

/** Whether this suit makes no sense asked of this subject. */
function nonsense(suit, subject) {
  return (SUIT_NONSENSE[subject] || []).includes(suit);
}

/**
 * Things she also did differently, none of which explains it.
 *
 * A find is a departure from how she says she normally works — and she can
 * depart in more than one way on one order. These are true, unusual and
 * innocent, and each of them makes one of the four remedies look right,
 * which is what makes offering a remedy a judgement rather than a lookup.
 *
 * How many surface in a call is rolled; which ones is rolled; whether the
 * causal one is among them is the whole game.
 */
const HERRINGS = {
  store: {
    text: "They sat in the cold room two nights before I got to them. We were out at the ford.",
    suggests: ['one-lot'],
  },
  cart: {
    text: "The carter came round the long way, he said the ford was up. Took him half a day over.",
    suggests: ['split-the-send'],
  },
  who: {
    text: "There was a different hand on the paperwork this time. Not the writing we usually get.",
    suggests: ['the-measure'],
  },
  opened: {
    text: "I opened them out in the yard. It was warmer out than in, that morning.",
    suggests: ['plain-container'],
  },
  weather: {
    text: "It poured the whole way. The crate came in wet through, though they were dry inside.",
    suggests: ['plain-container'],
  },
};

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
  want: 'a note in the case record saying what caused it, so it is not her word against his',
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
  sourcing: 'the lots you sent',
  fee: 'the fee on the invoice',
  form: 'the order form',
  pattern: 'your earlier orders',
};

/**
 * The questions, written out — every cell where a suit fits a subject, said
 * the way an agent says it. The generated grid in `call.js` survives only for
 * the nonsense cells, where a malformed question is what misspeaking looks
 * like.
 *
 * Keyed `suit/angle`.
 */
const QUESTIONS = {
  draughts: {
    'what/expand': 'Tell me about the draughts.',
    'what/contract': 'Which draughts are we talking about?',
    'what/verify': 'Standard healing draughts, yes?',
    'what/validate': 'They\'re the standard ones?',
  },
  poof: {
    'what/expand': 'Tell me how you order through POOF.',
    'what/contract': 'What did you order, exactly?',
    'what/verify': 'You\'ve ordered this way before, yes?',
    'what/validate': 'You order through POOF as a rule?',
    'how/expand': 'How do you usually put a POOF order in?',
    'how/contract': 'How was this one sent?',
    'how/verify': 'So it went the way they always go?',
    'how/validate': 'Same way as always?',
  },
  dozen: {
    'what/expand': 'Tell me about the twelve.',
    'what/contract': 'How many came?',
    'what/verify': 'Twelve, you said?',
    'what/validate': 'You always order twelve?',
  },
  same: {
    'what/expand': 'Tell me how they differ.',
    'what/contract': 'What\'s different about them?',
    'what/verify': 'Some weaker than others, yes?',
    'what/validate': 'They should all be the same?',
    'why/expand': 'Why would twelve come back different?',
    'why/contract': 'What would make one weaker than the next?',
    'why/verify': 'You\'ve never had that before, have you?',
    'why/validate': 'That\'s not happened before?',
  },
  recipe: {
    'what/expand': 'Tell me about the recipe.',
    'what/contract': 'Which recipe did you ask for?',
    'what/verify': 'The standard recipe, yes?',
    'what/validate': 'Nothing clever asked for?',
    'how/expand': 'How do you set the recipe out?',
    'how/contract': 'How was the recipe given this time?',
    'how/verify': 'The usual way of writing it up?',
    'how/validate': 'Written out as always?',
  },
  ingredients: {
    'what/expand': 'Tell me about the ingredients.',
    'what/contract': 'What went in?',
    'what/verify': 'Your own ingredients, yes?',
    'what/validate': 'You send your own in?',
    'where/expand': 'Where do your ingredients come from?',
    'where/contract': 'Where were these kept before they went?',
    'where/verify': 'Out of your own stock, yes?',
    'where/validate': 'All from your stores?',
  },
  container: {
    'what/expand': 'Tell me about the container.',
    'what/contract': 'What were they packed in?',
    'what/verify': 'A TLC container, yes?',
    'what/validate': 'Whatever they send them in?',
    'who/expand': 'Who decides what they go in?',
    'who/contract': 'Who asked for that container?',
    'who/verify': 'That\'s your end, is it?',
    'who/validate': 'Somebody there chose it?',
  },
  ordered: {
    'how/expand': 'How did the order go in?',
    'how/contract': 'How was it put in this time?',
    'how/verify': 'Same way as always?',
    'how/validate': 'The usual way?',
    'who/expand': 'Who puts the orders in?',
    'who/contract': 'Who put this one in?',
    'who/verify': 'You write it up yourself, yes?',
    'who/validate': 'You do it yourself?',
  },
  paid: {
    'who/expand': 'Who pays for it?',
    'who/contract': 'Whose account does it go on?',
    'who/verify': 'The guild account, yes?',
    'who/validate': 'It goes through the Company?',
    'how/expand': 'How is it paid?',
    'how/contract': 'How did this one get paid?',
    'how/verify': 'On the account as always?',
    'how/validate': 'Nothing different about the payment?',
  },
  arrived: {
    'when/expand': 'When did it come?',
    'when/contract': 'What time did it get to you?',
    'when/verify': 'Yesterday, you said?',
    'when/validate': 'It came yesterday?',
    'how/expand': 'How did it come?',
    'how/contract': 'How was it brought round?',
    'how/verify': 'By the usual carter?',
    'how/validate': 'Same carter as always?',
  },
  opened: {
    'when/expand': 'When did you open them?',
    'when/contract': 'How soon did you open them?',
    'when/verify': 'This morning, you said?',
    'when/validate': 'You opened them straight away?',
    'who/expand': 'Who opened them?',
    'who/contract': 'Who was there when they came out?',
    'who/verify': 'You did that yourself, yes?',
    'who/validate': 'You counted them in yourself?',
  },
  used: {
    'what/expand': 'What happened when you used one?',
    'what/contract': 'How many have you tried?',
    'what/verify': 'Two of them, you said?',
    'what/validate': 'You\'ve tried a couple?',
    'when/expand': 'When did you try one?',
    'when/contract': 'When was the last one used?',
    'when/verify': 'This morning, yes?',
    'when/validate': 'Since they came?',
  },
  who: {
    'who/expand': 'Who made them up at our end?',
    'who/contract': 'Who was on the bench that day?',
    'who/verify': 'Nobody\'s named on it, no?',
    'who/validate': 'You wouldn\'t know who?',
  },
  sets: {
    'what/expand': 'Tell me about the sets.',
    'what/contract': 'How many sets went in?',
    'what/verify': 'Twelve sets, yes?',
    'what/validate': 'A set for each draught?',
    'how/expand': 'How did the sets go in?',
    'how/contract': 'How were they sent — together or apart?',
    'how/verify': 'All on the one order, yes?',
    'how/validate': 'All in the one go?',
  },
  strength: {
    'what/expand': 'What strength should they be?',
    'what/contract': 'Which strength did you pay for?',
    'what/verify': 'The standard, yes?',
    'what/validate': 'Standard strength?',
  },
  proportions: {
    'how/expand': 'How did you measure it out?',
    'how/contract': 'How much of the common one went in?',
    'how/verify': 'The recipe amount, yes?',
    'how/validate': 'Measured as the recipe says?',
    'why/expand': 'Why that much?',
    'why/contract': 'What made you settle on that amount?',
    'why/verify': 'To be on the safe side, was it?',
    'why/validate': 'You judged it yourself?',
  },
  sourcing: {
    'where/expand': 'Where did the ingredients come from?',
    'where/contract': 'Which lot did you use?',
    'where/verify': 'All one lot, yes?',
    'where/validate': 'Same lot for all twelve?',
    'who/expand': 'Who buys the ingredients?',
    'who/contract': 'Who picked the stock for this one?',
    'who/verify': 'You buy them yourself, yes?',
    'who/validate': 'You choose the stock?',
  },
  fee: {
    'why/expand': 'Why would there be a fee on this?',
    'why/contract': 'What\'s that fee for?',
    'why/verify': 'Nobody mentioned a charge to you?',
    'why/validate': 'You weren\'t told about a fee?',
    'what/expand': 'Tell me about the fee on the invoice.',
    'what/contract': 'What does the invoice show?',
    'what/verify': 'A container charge, yes?',
    'what/validate': 'You don\'t see the invoices?',
  },
  form: {
    'who/expand': 'Who fills the form in?',
    'who/contract': 'Who filled this one in?',
    'who/verify': 'You do the form yourself, yes?',
    'who/validate': 'You write it up?',
    'how/expand': 'How do you fill the form in?',
    'how/contract': 'How was this one written up?',
    'how/verify': 'The usual way?',
    'how/validate': 'Nothing different on the form?',
  },
  pattern: {
    'when/expand': 'When did you last order?',
    'when/contract': 'How often do you order?',
    'when/verify': 'Every season, yes?',
    'when/validate': 'Same order each season?',
    'what/expand': 'Tell me about your earlier orders.',
    'what/contract': 'What did you order last time?',
    'what/verify': 'The same twelve, yes?',
    'what/validate': 'Always the same order?',
  },
  cart: {
    'who/expand': 'Who brings it round?',
    'who/contract': 'Which carter was it?',
    'who/verify': 'The usual one, yes?',
    'who/validate': 'Same carter as always?',
    'when/expand': 'When did the cart come?',
    'when/contract': 'What time did he get to you?',
    'when/verify': 'After dark, you said?',
    'when/validate': 'He was late, then?',
  },
  weather: {
    'when/expand': 'What was the weather when it came?',
    'when/contract': 'When did the rain start?',
    'when/verify': 'Wet that day, you said?',
    'when/validate': 'It was raining?',
    'what/expand': 'Tell me about the weather that day.',
    'what/contract': 'How bad was it?',
    'what/verify': 'They came in dry, yes?',
    'what/validate': 'They weren\'t wet when you opened them?',
  },
  store: {
    'where/expand': 'Where do you keep them?',
    'where/contract': 'Where did they sit before you opened them?',
    'where/verify': 'In the cold room, yes?',
    'where/validate': 'They go in the cold room?',
  },
  season: {
    'when/expand': 'When are you outfitting for?',
    'when/contract': 'When do you set out?',
    'when/verify': 'For the passes, you said?',
    'when/validate': 'You\'re kitting out for the passes?',
    'why/expand': 'Why twelve this season?',
    'why/contract': 'What are they for?',
    'why/verify': 'For the passes, is it?',
    'why/validate': 'Is it the passes you\'re stocking for?',
  },
};

/**
 * Her deflections, when the suit is the wrong register for the subject.
 */
const OBLIQUE = [
  "That's more Hald's end than mine.",
  "I'd have to look, and I've the hall to open.",
  "Does that matter? It came back wrong, that's what matters.",
  "I couldn't tell you offhand.",
  "You'd have to ask Hald about that one.",
  "I've not got that in front of me.",
];

/** What the note says when she departs from her own practice. */
const FIND_NOTE = 'that is not how she says she normally does it';

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

module.exports = { HANDLE, QUESTIONS, OBLIQUE, FIND_NOTE, CALLER, OPENING, BASELINE, GIVES, BELIEFS, CAUSES, NEED, SUBJECTS, LABELS, label, SUIT_FIT, fits, HERRINGS, ORDER, FRAGMENTS, FRAGMENT_FALLBACK, SUIT_NONSENSE, nonsense };
