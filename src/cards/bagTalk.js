'use strict';

/**
 * What Sella says on the bag call, as templates.
 *
 * One answer for every question the agent can actually put to her, keyed by
 * subject and by `suit/angle`, so her reply depends on what was asked
 * (settled.md §8, Her words). An entry is a sentence, or a list of ways of
 * saying it. `{yes}` is a blank she fills from her own words.
 *
 * **[C] Every line here is mine.** Each restates a fact the scenario already
 * held in `bag.js` — her stock answers, her beliefs, the order's own facts —
 * and adds none. Nothing here says *transfer* except under `looking`, because
 * that word is the explanation and she only gives it when asked what she was
 * looking for.
 */

const ANSWERS = {
  working: {
    'what/expand': "I'm trying to get a draught out of the bag to one of my party, and it won't go. It just sits there.",
    'what/contract': "Nothing. I do the thing I think I'm meant to do, and the draught just sits there.",
    'what/validate': 'Nothing at all. It just sits there.',
  },
  bag: {
    'what/expand': "It's the party's bag. Most of what we carry is in it.",
    'what/contract': "The party's.",
    'what/validate': "The bag's fine. I can see every item in it, plain as day.",
  },
  draught: {
    'what/expand': 'A healing draught.',
    'what/contract': 'A healing draught. The standard one — we keep three.',
    'what/validate': '{yes} We keep three of them.',
  },
  pell: {
    'who/expand': "Pell. He's the one who takes the hits, so he ought to be the one carrying it.",
    'who/contract': 'Pell.',
    'who/validate': 'He is.',
  },
  tried: {
    'what/expand': 'The same thing, four times. Last night and again this morning.',
    'what/contract': "The only thing I could think to try. I've done it four times now.",
    'what/validate': 'Four goes at it.',
    'how/expand': "I go through the account looking for the way to do it, and I can't find one.",
    'how/contract': 'I found the draught in the bag, then went through the account for how to get it to him. Four times.',
  },
  looking: {
    'what/expand': "I've read every word on that account and not one of them says transfer. That's all I'm trying to do — transfer it.",
    'what/contract': "Transfer. I've read every word on that account and not one of them says it.",
    'what/validate': "No. There's no transfer anywhere. How am I meant to transfer a thing with nothing to transfer it with?",
  },
  party: {
    'who/expand': 'Pell, and the Ryle brothers. Four of us, with me.',
    'who/contract': 'Pell and the Ryle brothers.',
    'who/validate': 'All of them.',
    'what/expand': "There's four of us. Me, Pell, and the Ryle brothers.",
    'what/contract': 'Four.',
    'what/validate': '{yes} One between the four of us.',
  },
  leader: {
    'who/expand': 'I asked for it, and TLC set it up.',
    'who/contract': 'I am.',
    'who/validate': "I am. I've been the leader the whole time.",
  },
  permission: {
    'what/expand': 'Nothing. Nobody has ever mentioned it to me.',
    'what/contract': 'Not that anyone has told me.',
    'what/validate': 'Not that I know of.',
  },
  before: {
    'when/expand': "Never. There's never been a need.",
    'when/contract': "No. I've never moved anything to anybody before.",
    'when/validate': "First time. There's never been a need.",
  },
  since: {
    'when/expand': 'Last night.',
    'when/contract': 'Since last night.',
  },
  morning: {
    'when/expand': "First light. That's when we're out.",
    'when/contract': 'First light.',
    'when/validate': "I'd rather it was in his hands before then, yes.",
    'why/expand': "Because he's the one who takes the hits. I'd rather he had it on him.",
    'why/contract': "Then he hasn't got it when he needs it.",
    'why/validate': 'He is.',
  },
  members: {
    'who/expand': 'All of them. Pell and both the Ryles.',
    'who/contract': 'I did, as each of them joined.',
    'who/validate': 'Not all at once. I put each of them on as they joined.',
  },
  item: {
    'what/expand': "In the bag. I'm looking at it now.",
    'what/contract': "I can. I'm looking at it now.",
    'what/validate': "It's definitely in the bag.",
  },
  account: {
    'what/expand': "It's the party's account. We set it up three years ago.",
    'what/contract': 'Three years.',
    'what/validate': "The party's.",
  },
  tier: {
    'what/expand': 'Silver.',
    'what/contract': 'Silver. It went up when the Ryles joined.',
    'what/validate': 'Silver, yes.',
  },
  stores: {
    'what/expand': 'Rope, torches, a spare blade, and the dried stores. And the draughts.',
    'what/contract': 'A fair bit. Rope, torches, a spare blade, the dried stores, and the draughts.',
    'what/validate': 'It is.',
  },
  paid: {
    'what/expand': "It's paid every month without fail.",
    'what/contract': "No. It's always paid.",
    'what/validate': 'Nothing.',
    'when/expand': 'Every month.',
    'when/contract': 'It goes every month, without fail.',
    'when/validate': 'Monthly, yes.',
  },
  ryles: {
    'who/expand': "They do as they're told and never ask for anything.",
    'who/contract': 'No. They never ask for anything.',
    'who/validate': "They don't. They do as they're told.",
  },
};

/**
 * What she says about a subject when nobody asked — a statement, not an
 * answer. This is her going her own way, and it is also how she steers. No
 * entry for `looking`: the explanation is given, never volunteered.
 */
const VOLUNTEER = {
  morning: "We're out at first light, and I'd rather it was in his hands before then.",
  pell: "Pell's the one who takes the hits. He ought to be the one carrying it.",
  leader: "I'm the one who asked for this account.",
  permission: 'Nobody has ever mentioned permissions to me.',
  before: "I've never moved anything to anybody before.",
  tried: "I've tried it four times now.",
  item: "I can see the draught. It's right there in the bag.",
};

/**
 * Departures that already contain the plain answer, so they are said in
 * place of it. "Last night. I started on it last night…" says it twice.
 */
const DEPARTURE_IS_ANSWER = ['since'];

/** How she turns to something she would rather say. */
const PIVOTS = ['The thing is,', 'What I do know is,'];

/** Her ways of saying yes. The first is anyone's; the others are more hers. */
const YES = ['Yes.', "That's right."];

/** When she has nothing for a question and nothing she would rather say. */
const NOTHING = "I couldn't tell you that.";

/**
 * What each of her lines actually introduces.
 *
 * A word is in front of the player only after she, or the record, has
 * introduced it (Phil, 8 October; settled.md §2 on what can be played). So
 * every answer is tagged with what it says, by hand: a subject she names
 * becomes something the player can ask about, and a detail she gives
 * (`last-night`, `four-times`) becomes something the agent may
 * build a question on. An answer that names nothing new puts nothing new in
 * play.
 */
const SAYS = {
  working: {
    'what/expand': ['draught', 'bag', 'party', 'pell', 'tried'],
    'what/contract': ['draught', 'tried'],
    'what/validate': [],
  },
  bag: {
    'what/expand': ['party', 'stores'],
    'what/contract': ['party'],
    'what/validate': ['stores'],
  },
  draught: {
    'what/expand': ['healing'],
    'what/contract': ['healing', 'standard', 'three'],
    'what/validate': ['three'],
  },
  pell: {
    'who/expand': ['takes-hits'],
    'who/contract': [],
    'who/validate': ['party'],
  },
  tried: {
    'what/expand': ['four-times', 'since', 'last-night'],
    'what/contract': ['four-times'],
    'what/validate': ['four-times'],
    'how/expand': ['account', 'looking'],
    'how/contract': ['draught', 'bag', 'account', 'looking', 'pell', 'four-times'],
  },
  looking: {
    'what/expand': ['account'],
    'what/contract': ['account'],
    'what/validate': [],
  },
  party: {
    'who/expand': ['ryles', 'four-people'],
    'who/contract': ['ryles'],
    'who/validate': ['members', 'account'],
    'what/expand': ['four-people', 'ryles'],
    'what/contract': ['four-people'],
    'what/validate': ['account', 'four-people'],
  },
  leader: { 'who/expand': [], 'who/contract': [], 'who/validate': [] },
  permission: { 'what/expand': [], 'what/contract': [], 'what/validate': [] },
  before: { 'when/expand': [], 'when/contract': [], 'when/validate': [] },
  since: {
    'when/expand': ['last-night'],
    'when/contract': ['last-night'],
  },
  morning: {
    'when/expand': ['first-light'],
    'when/contract': ['first-light'],
    'when/validate': ['pell'],
    'why/expand': ['pell', 'takes-hits'],
    'why/contract': ['pell'],
    'why/validate': [],
  },
  members: {
    'who/expand': ['ryles'],
    'who/contract': ['leader'],
    'who/validate': ['leader'],
  },
  item: {
    'what/expand': ['bag'],
    'what/contract': [],
    'what/validate': ['bag'],
  },
  account: {
    'what/expand': ['party', 'years'],
    'what/contract': ['years'],
    'what/validate': ['party'],
  },
  tier: {
    'what/expand': ['silver'],
    'what/contract': ['silver', 'ryles'],
    'what/validate': ['silver'],
  },
  stores: {
    'what/expand': ['draught', 'stores-list'],
    'what/contract': ['draught', 'stores-list', 'full'],
    'what/validate': ['full'],
  },
  paid: {
    'what/expand': ['monthly'],
    'what/contract': [],
    'what/validate': [],
    'when/expand': ['monthly'],
    'when/contract': ['monthly'],
    'when/validate': ['monthly'],
  },
  ryles: { 'who/expand': [], 'who/contract': [], 'who/validate': [] },
};

/** What her other lines introduce: opening, number, unasked statements, baggage, departures. */
const SAYS_OTHER = {
  opening: ['working'],
  handle: ['bag'],
  need: ['since', 'last-night'],
  volunteer: {
    morning: ['morning', 'first-light', 'pell'],
    pell: ['pell', 'takes-hits'],
    leader: ['leader'],
    permission: ['permission'],
    before: ['before'],
    tried: ['tried', 'four-times'],
    item: ['draught', 'bag'],
  },
  baggage: {
    'set-it-up-herself': ['leader'],
    'no-one-told-her': ['permission'],
    'pell-gets-hurt': ['pell', 'morning'],
  },
  departure: {
    since: ['since', 'last-night'],
    pell: ['pell', 'party'],
    stores: ['bag', 'stores', 'full'],
    ryles: ['ryles'],
  },
  // What a record row puts on the screen.
  record: {
    'acc-fairweather': ['account', 'party', 'tier', 'silver', 'years', 'four-people', 'bag', 'members'],
    'con-sella': ['leader', 'permission', 'account', 'before'],
    'con-pell': ['pell', 'party'],
    'bag-7730': ['bag', 'stores', 'draught', 'standard', 'three', 'stores-list'],
    'mov-none': ['before', 'account'],
    'inv-2201': ['paid', 'tier', 'silver'],
  },
};

/** Introducing one thing also puts these in front of the player. */
const ALSO = { draught: ['item'] };

/**
 * What must already have been said before a question can be asked.
 *
 * Unlisted questions need only their own subject to be in play, and a
 * question with a name in it needs the name — enforced in `turn.js`.
 *
 * There are no read-backs. The 23 written on 8 October each read her own
 * words back to her ("You're the leader — have I got that right?" after she
 * had said "I am"), which confirms nothing: the only source is her, and on
 * this call she is the one who has it wrong. Phil, 10 October. Checking what
 * she said is done against the record.
 *
 * Two Validate questions were the same move under another label and went
 * with them: "It started last night?" and "Doing it the same way each
 * time?" could each be asked only once she had said exactly that, and
 * nothing but her could have said it (`logs/find-read-backs.js`).
 */
const NEEDS = {
  pell: { 'who/validate': ['party'] },
  party: {
    'who/contract': ['account'],
    'who/validate': ['account'],
    'what/validate': ['account', 'four-people'],
  },
  leader: { 'who/expand': ['account'] },
  permission: { 'what/contract': ['account'] },
  before: { 'when/expand': ['party'] },
  morning: {
    'why/contract': ['bag'],
    'why/validate': ['pell'],
  },
  members: {
    'who/expand': ['account'],
    'who/contract': ['account'],
    'who/validate': ['account'],
  },
  item: { 'what/contract': ['bag'], 'what/validate': ['bag'] },
  tier: { 'what/validate': ['silver'] },
  stores: {
    'what/expand': ['bag'],
    'what/contract': ['bag'],
    'what/validate': ['stores-list'],
  },
  ryles: { 'who/contract': ['bag'], 'who/validate': ['bag'] },
};

/**
 * The remedy for her word, said with only what has been introduced: the
 * draught if she has named it, Pell if she has named him.
 *
 * @param {(token: string) => boolean} said - whether a word is in play.
 * @param {boolean} named - whether she has given his name.
 * @returns {string}
 */
function theWord(said, named) {
  const what = said('draught') ? 'the draught' : 'it';
  const who = named ? 'Pell' : "whoever it's for";
  const whose = named ? 'his' : 'theirs';
  return `Our side calls it assigning — you assign ${what} to ${who}, and it lands in ${whose}. Same thing you're calling transferring, and a worse word for it.`;
}

/** What her opening actually names. The bag is not in it until she says so. */
const OPENING_WORDS = ['working'];

/** What each subject puts in front of the player once she has talked about it. */
const OPENS = {
  working: ['bag', 'draught', 'tried', 'pell'],
  // Not the morning: nothing she says about Pell mentions leaving, so the
  // agent has no reason to ask about it until she brings it up.
  pell: ['members', 'party'],
};

/** What her baggage line puts in front of the player, by baggage. */
const BAGGAGE_OPENS = {
  'pell-gets-hurt': ['morning'],
  'set-it-up-herself': ['leader'],
  'no-one-told-her': ['permission'],
};

/**
 * How a subject is named in front of the player before she has named it
 * herself. Showing *Pell* before she has said his name would hand the player
 * something she has not told them.
 */
const LABELS = {
  pell: "who it's for",
  morning: "when it's needed",
};

/**
 * Names the agent cannot use until she has said them. A question with *Pell*
 * in it is not askable before she has named him.
 */
const NAMES = ['Pell', 'Ryle'];

/**
 * What she says to a remedy that isn't it, where the scenario's own reply
 * assumes something the agent may never have said. The stock reply to
 * *permissions* was "You've just told me my permissions are right", which is
 * only true if the agent read her that row.
 */
const REFUSALS = {
  permissions: "I'm the leader. I asked for this account — why wouldn't I be allowed?",
};

module.exports = { SAYS, SAYS_OTHER, ALSO, NEEDS, theWord, BAGGAGE_OPENS, DEPARTURE_IS_ANSWER, ANSWERS, VOLUNTEER, PIVOTS, YES, NOTHING, OPENING_WORDS, OPENS, LABELS, NAMES, REFUSALS };
