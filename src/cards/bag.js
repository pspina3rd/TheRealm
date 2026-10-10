'use strict';

const { RECORD } = require('./bagRecord');

/**
 * The call: she can't transfer goods in the bag of holding.
 *
 * There is no fault anywhere. She is the Party Leader, she holds the Admin
 * designation, all four members are on the account, the draught is in the
 * Bag, nothing is logged and nothing has failed. The cause is on her side and
 * it is a word: TLC's name for the function is **assigning**, and in her mind
 * she is transferring an item out of the shared bag into her teammate's own.
 *
 * It is the same shape as *refill* being her word for something TLC does not
 * do (settled.md:238) — the customer's vocabulary against the system's, where
 * the system is working perfectly and the word is the wall. §12 already says
 * it: asking in the CRM's own vocabulary is precise for us and opaque to
 * them.
 *
 * So this call inverts the uneven-batch one. There the record was close to
 * mandatory; here it holds one useful row — that nobody on this account has
 * ever assigned anything — and everything else has to come out of her mouth.
 */

/**
 * What she can give when asked for something searchable.
 *
 * The party's number, off the bag. She has no order number for this, because
 * this is not an order — which is itself a thing an agent can waste a play
 * finding out.
 */
const HANDLE = { key: '4409', say: "There's a number on the bag. 4-4-0-9." };

const CALLER = {
  name: 'Sella Brandt',
  role: 'admin',
  account: 'acc-fairweather',
  contact: 'con-sella',
  party: 'the Fairweather party',
  job: 'party leader',
};

/** What she rings up and says, and all she says until she is asked. */
const OPENING = {
  line: "It isn't working.",
  words: ['working', 'bag'],
};

/**
 * Her answers.
 *
 * She has never done this before, so most of these are not practice — they
 * are what she can see and what she has tried. None of them volunteers her
 * word for the action; that comes only when she is asked what she was looking
 * for or what she was trying to do.
 */
const BASELINE = {
  working: "I do the thing I think I'm meant to do, and the draught just sits there.",
  bag: "The party's bag. There's nothing wrong with the bag — I can see every item in it, plain as day.",
  draught: 'A healing draught. The standard one, we keep three.',
  pell: "Pell. He's the one who takes the hits, so he's the one who ought to be carrying it.",
  tried: "I tried it four times. I tried it last night and again this morning.",
  // Only ever answered with the departure below — she cannot describe what
  // she looked for without using her own word for it. Kept here so the
  // subject is a legal thing to aim at.
  looking: "Everywhere. I've been through every page of that account twice.",
  party: "Four of us. Me, Pell, and the Ryle brothers.",
  leader: "Yes, I'm the leader. I set the whole thing up myself.",
  permission: "I don't know the first thing about permissions. Nobody has ever mentioned them to me.",
  before: "No. I've never moved anything to anybody before. There's never been a need.",
  since: 'Since last night.',
  morning: "We're out at first light, and I'd rather it was in his hands before then.",
  members: "They're all on it. I put them on it myself when we started.",
  item: "It's in the bag. I'm looking at it now.",
  account: "The party's account. I've had it since last autumn.",
  // Askable and never the cause.
  tier: "Silver. It went up when the Ryles joined.",
  stores: "Rope, torches, a spare blade, and the dried stores. And the draughts.",
  paid: "It's paid. It's always paid.",
  ryles: "The Ryle brothers do as they're told and never ask for anything.",
};

/** What an answer puts in play. */
const GIVES = {
  working: ['bag', 'tried'],
  bag: ['item', 'stores'],
  tried: ['looking', 'since'],
  draught: ['pell', 'item'],
  pell: ['members', 'morning'],
  party: ['leader', 'members'],
  leader: ['permission', 'before'],
  before: ['looking'],
  item: ['draught'],
  members: ['ryles', 'pell'],
  account: ['tier', 'paid'],
  'party members': ['members', 'leader'],
  'account history': ['before', 'account'],
};

/** What she believes about her own account. */
const BELIEFS = {
  'account history': { any: "It's all been quiet. We order, it comes, that's the whole of it." },
  'party members': { any: "All four of us are on it. I did that at the start." },
  billing: { any: "It's paid every month without fail." },
  'order history': { any: "We've ordered plenty. Nothing has ever gone wrong before." },
};

/**
 * Her word, and the remedies it is mistaken for.
 *
 * One cause, because there is only one thing the matter: she is looking for a
 * verb that TLC does not use. The other three remedies are the ones an agent
 * reaches for when a thing does not work and nothing is wrong — and each of
 * them is a reasonable guess, which is what makes offering one a judgement.
 */
const REMEDIES = {
  'the-word': {
    line: "Our side calls it assigning — you assign the draught to Pell, and it lands in his. Same thing you're calling transferring, and a worse word for it.",
    reply: "Assigning. Then why doesn't it say transferring, when transferring is plainly what it does?",
  },
  'new-bag': {
    line: "Let me send out a replacement bag and we'll see if that clears it.",
    reply: "I don't want another bag. There is nothing the matter with this one.",
  },
  'permissions': {
    line: "I'll have your permissions looked at — that's usually what sits behind this.",
    reply: "You've just told me my permissions are right. Were you not reading it?",
  },
  'try-later': {
    line: "Give it an hour and try it again. These things often settle on their own.",
    reply: "I have given it a night and a morning. It has not settled.",
  },
};

const CAUSES = [
  {
    id: 'her-word',
    rule: "the function is called assigning; in her mind she is transferring an item from the shared bag to her teammate's own",
    reach: [['looking']],
    hints: { tried: ['looking'], before: ['looking'], permission: ['looking'] },
    // A true fact that fits the reason without naming it: nobody on this
    // account has ever assigned anything.
    evidence: { category: 'account history', row: 'mov-none' },
    departures: [
      "I've read every word on that account and not one of them says transfer. That's what I'm trying to do — transfer it out of the shared one and into his.",
      "There's no transfer anywhere. I've looked at every page twice. How am I meant to transfer a thing with nothing to transfer it with?",
    ],
    suggests: ['the-word', 'permissions'],
    fix: { id: 'the-word', line: REMEDIES['the-word'].line, reply: REMEDIES['the-word'].reply },
  },
];

/** Things she also did or noticed, none of which explains it. */
const HERRINGS = {
  since: {
    text: "I started on it last night, and I'll own I was tired by then.",
    suggests: ['try-later'],
  },
  pell: {
    text: 'Pell only came in with us in the spring, if that makes a difference.',
    suggests: ['permissions'],
  },
  stores: {
    text: "The bag's fuller than it's ever been. We stocked up for the passes.",
    suggests: ['new-bag'],
  },
  ryles: {
    text: "The Ryles have never had anything off me either, come to think of it.",
    suggests: ['permissions'],
  },
};

/** The call's own facts, for her fragments. */
const ORDER = {
  item: 'a healing draught',
  who: 'Pell',
  count: 'three',
  party: 'four of us',
  when: 'last night',
  tier: 'Silver',
};

const FRAGMENTS = {
  bag: [
    { say: () => `There are ${ORDER.count} draughts in it, and the stores.`, opens: ['stores', 'item'] },
    { say: () => `It's the party's bag — ${ORDER.party}.`, opens: ['party'] },
  ],
  draught: [{ say: () => `It's ${ORDER.item}, for ${ORDER.who}.`, opens: ['pell'] }],
  pell: [{ say: () => `${ORDER.who} is the one who needs it.`, opens: ['morning'] }],
  tried: [{ say: () => `I started on it ${ORDER.when}.`, opens: ['since'] }],
  party: [{ say: () => `There's ${ORDER.party}, and I'm the one who set it up.`, opens: ['leader'] }],
  account: [{ say: () => `We're on ${ORDER.tier}.`, opens: ['tier'] }],
};

const FRAGMENT_FALLBACK = [
  { say: () => `It's ${ORDER.item} out of the party's bag, meant for ${ORDER.who}.`, opens: ['draught', 'pell'] },
  { say: () => `There's ${ORDER.party} on the account, if that's what you're after.`, opens: ['party'] },
];

/**
 * The questions, written out.
 *
 * Every cell where a suit fits a subject, said the way an agent says it.
 * Nothing here is assembled from a stem and a label, because a stem crossed
 * with a label produces *What was what isn't working, exactly?* at the edges
 * and there is no amount of narrowing that fixes it. The generated grid
 * survives only for the nonsense cells, where a malformed question is what
 * misspeaking looks like.
 *
 * Keyed `suit/angle`.
 */
const QUESTIONS = {
  working: {
    'what/expand': "Tell me what's happening.",
    'what/contract': 'What happens when you try it?',
    'what/verify': "Let me make sure I have it — nothing moves at all?",
    'what/validate': "So nothing happens at all, not even a message?",
  },
  bag: {
    'what/expand': 'Tell me about the bag.',
    'what/contract': "Which bag is it — the party's, or your own?",
    'what/verify': "The party's bag, that's the one?",
    'what/validate': 'And the bag itself seems all right?',
  },
  draught: {
    'what/expand': "What is it you're trying to move?",
    'what/contract': 'Which draught, exactly?',
    'what/verify': 'A standard healing draught, yes?',
    'what/validate': "It's one of the standard ones?",
  },
  pell: {
    'who/expand': "Who's it for?",
    'who/contract': 'Who is it meant to end up with?',
    'who/verify': "Pell — have I got the name right?",
    'who/validate': "And Pell's in the party with you?",
  },
  looking: {
    'what/expand': 'What were you looking for, when you were trying to do it?',
    'what/contract': 'What were you looking for it to say?',
    'what/verify': "So you couldn't find the thing that does it — is that it?",
    'what/validate': "You couldn't find where to do it at all?",
  },
  tried: {
    'what/expand': 'What have you tried?',
    'what/contract': 'What did you try first?',
    'what/verify': 'Four times, you said?',
    'what/validate': "You've had more than one go at it?",
    'how/expand': 'How are you going about it?',
    'how/contract': 'Talk me through what you did.',
    'how/verify': "So you've been doing the same thing each time?",
    'how/validate': 'Doing it the same way each time?',
  },
  party: {
    'who/expand': "Who else is in the party?",
    'who/contract': "Who's on the account besides you?",
    'who/verify': 'Four of you altogether, is that right?',
    'who/validate': "And they're all on the account?",
    'what/expand': 'Tell me about the party.',
    'what/contract': 'How many of you are there?',
    'what/verify': "It's the one party account, yes?",
    'what/validate': 'One account between the four of you?',
  },
  leader: {
    'who/expand': "Who set the account up?",
    'who/contract': "Who's the leader of it?",
    'who/verify': "You're the leader — have I that right?",
    'who/validate': "You're the one who runs it?",
  },
  permission: {
    'what/expand': "What have you been told about what you're allowed to do?",
    'what/contract': 'Has anyone ever set limits on your account?',
    'what/verify': 'Nobody has mentioned permissions to you?',
    'what/validate': 'So nothing has ever been locked off for you?',
  },
  before: {
    'when/expand': "When did you last move something to one of them?",
    'when/contract': 'Have you done this before?',
    'when/verify': "So this is the first time you've tried it?",
    'when/validate': "First time doing it, then?",
  },
  since: {
    'when/expand': 'When did it start?',
    'when/contract': 'How long have you been at it?',
    'when/verify': 'Since last night, you said?',
    'when/validate': 'It started last night?',
  },
  morning: {
    'when/expand': 'When do you need it by?',
    'when/contract': 'When are you leaving?',
    'when/verify': 'First light, is that right?',
    'when/validate': 'You need it before you go?',
    'why/expand': "Why does it have to be before you leave?",
    'why/contract': 'What happens if it stays in the bag?',
    'why/verify': "It's because he's the one who gets hurt?",
    'why/validate': "He's the one who needs it on him, is he?",
  },
  members: {
    'who/expand': 'Who else is on the account?',
    'who/contract': 'Who put them on it?',
    'who/verify': 'All four of you on it, yes?',
    'who/validate': 'They were all added at the start?',
  },
  item: {
    'what/expand': 'Where is the draught now?',
    'what/contract': 'Can you see it in there?',
    'what/verify': "It's still showing in the bag?",
    'what/validate': "So it's definitely in the bag?",
  },
  account: {
    'what/expand': 'Tell me about the account.',
    'what/contract': 'How long have you had it?',
    'what/verify': 'Since last autumn, yes?',
    'what/validate': "It's the party account, not a personal one?",
  },
  tier: {
    'what/expand': "What plan are you on?",
    'what/contract': 'Which tier is it?',
    'what/verify': 'Silver, is that right?',
    'what/validate': "You're on Silver?",
  },
  stores: {
    'what/expand': "What else is in the bag?",
    'what/contract': 'How much is in there?',
    'what/verify': 'Rope, torches, stores — that sort of thing?',
    'what/validate': "It's fairly full, then?",
  },
  paid: {
    'what/expand': 'Tell me about the payments.',
    'what/contract': 'Is there anything outstanding on it?',
    'what/verify': "It's paid up, yes?",
    'what/validate': 'Nothing owing on it?',
    'when/expand': 'When does it go out?',
    'when/contract': 'When did you last pay it?',
    'when/verify': 'Every month, is that right?',
    'when/validate': "It goes out monthly?",
  },
  ryles: {
    'who/expand': 'Tell me about the Ryle brothers.',
    'who/contract': 'Have they ever had anything out of the bag?',
    'who/verify': "They've never asked you for anything?",
    'who/validate': "They don't use it much?",
  },
};

/**
 * Her deflections, when the suit is the wrong register for the subject.
 *
 * Scenario-specific because a deflection has to be about something: "I've not
 * got that in front of me" is no answer to *when did it start*.
 */
const OBLIQUE = [
  "I couldn't tell you that.",
  "Does that matter? It still isn't working.",
  "I'd have to go and look, and I've the morning to get through.",
  "You'd know that better than me, surely.",
  "I've told you everything I know about that.",
];

/** What the note says when she has given the agent the thing. */
const FIND_NOTE = 'she has just told you what she calls it';

/**
 * Which suits fit which subject.
 *
 * Narrow on purpose: a suit only counts as fitting where the question can be
 * said out loud. Until the fitting cells are hand-written, a suit whose
 * generated question is not English does not belong here.
 */
const SUIT_FIT = {
  working: ['what'],
  bag: ['what'],
  draught: ['what'],
  pell: ['who'],
  looking: ['what'],
  tried: ['what', 'how'],
  party: ['who', 'what'],
  leader: ['who'],
  permission: ['what'],
  before: ['when'],
  since: ['when'],
  morning: ['when', 'why'],
  members: ['who'],
  item: ['what'],
  account: ['what'],
  tier: ['what'],
  stores: ['what'],
  paid: ['what', 'when'],
  ryles: ['who'],
};

/** Suits that do not parse against a subject at all. */
const SUIT_NONSENSE = {
  working: ['who', 'when', 'where', 'why', 'how'],
  bag: ['when', 'why', 'who'],
  draught: ['when', 'who'],
  pell: ['when', 'where'],
  looking: ['who', 'when', 'where', 'why', 'how'],
  tried: ['where'],
  party: ['when'],
  leader: ['when', 'where'],
  permission: ['when', 'where', 'who'],
  before: ['where', 'who', 'what'],
  since: ['who', 'where'],
  morning: ['who', 'where'],
  members: ['when', 'where'],
  item: ['who', 'when', 'why'],
  account: ['who', 'where'],
  tier: ['who', 'where'],
  stores: ['who', 'when'],
  paid: ['who', 'where'],
  ryles: ['when', 'where'],
};

/** How each subject is spoken. */
const LABELS = {
  working: "what isn't working",
  bag: 'the bag',
  draught: 'the draught',
  pell: 'Pell',
  looking: 'what you were looking for',
  tried: 'what you tried',
  party: 'the party',
  leader: 'being the leader',
  permission: 'the permissions',
  before: 'the last time you moved something',
  since: 'when it started',
  morning: 'the morning',
  members: 'the others on the account',
  item: 'where the draught is',
  account: 'the account',
  tier: 'your plan',
  stores: "what else is in the bag",
  paid: 'the payments',
  ryles: 'the Ryle brothers',
};

const SUBJECTS = Object.keys(BASELINE);

function label(subject) {
  return LABELS[subject] || subject;
}
function fits(suit, subject) {
  const list = SUIT_FIT[subject];
  return !list || list.includes(suit);
}
function nonsense(suit, subject) {
  return (SUIT_NONSENSE[subject] || []).includes(suit);
}

/** Her baggage, with triggers on this call's own subjects. */
const BAGGAGE = {
  'set-it-up-herself': {
    id: 'set-it-up-herself',
    line: 'I set this whole thing up myself and now I cannot work it.',
    trigger: { subject: 'leader', near: ['party', 'before', 'account'], suits: ['who', 'how'] },
  },
  'no-one-told-her': {
    id: 'no-one-told-her',
    line: 'Nobody has ever sat down and told me how any of this is meant to go.',
    trigger: { subject: 'permission', near: ['looking', 'tried'], suits: ['what', 'why'] },
  },
  'pell-gets-hurt': {
    id: 'pell-gets-hurt',
    line: "If he goes out without it and something happens, that's on me.",
    trigger: { subject: 'morning', near: ['pell', 'draught'], suits: ['when', 'why'] },
  },
};

/** What she actually needs, under the request. */
const NEED = {
  id: 'to-not-be-made-a-fool-of',
  line: "I've been at this since last night thinking I was doing something stupid.",
  want: 'to be told it was the word and not her',
};

/**
 * Her voice: the words each layer of her sheet offers for a base feeling
 * (settled.md §8, Her words).
 *
 * **[C] Every word in here is mine and none of it is settled.** It exists so
 * the template has something to pick from and Phil has something to judge.
 * `person` is what she reaches for whoever she is talking to, and is weighted
 * so she returns to it. `baggage` is keyed by the baggage she is carrying on
 * this call, with the feeling it leans to when the call is going badly. `at`
 * is what a feeling can land on (settled.md §13).
 */
const VOICE = {
  person: {
    mad: [{ word: 'ridiculous', frame: '{At} is ridiculous' }],
    glad: [{ word: 'about time', frame: 'About time something made sense' }],
  },
  baggage: {
    'set-it-up-herself': {
      lean: 'sad',
      sad: [{ word: 'stupid', frame: 'I feel stupid, not being able to work this' }],
    },
    'no-one-told-her': {
      lean: 'mad',
      mad: [{ word: 'nobody tells you', frame: 'Nobody tells you a thing about any of this' }],
    },
    'pell-gets-hurt': {
      lean: 'sad',
      sad: [{ word: 'worried sick', frame: "I'm worried sick about him going out without it" }],
    },
  },
  // Only what every frame reads right against. The company and the agent
  // are things a feeling can land on (settled.md §13) and are left out until
  // there are frames written for them.
  at: {
    product: 'this bag',
    service: 'this whole process',
  },
};

module.exports = {
  TALK: require('./bagTalk'),
  // Her remembrances, and how they are said (settled.md §8).
  LIFE: require('./sellaLife'),
  VOICE,
  HANDLE,
  QUESTIONS,
  OBLIQUE,
  CALLER,
  FIND_NOTE,
  OPENING,
  BASELINE,
  GIVES,
  BELIEFS,
  CAUSES,
  REMEDIES,
  HERRINGS,
  ORDER,
  FRAGMENTS,
  FRAGMENT_FALLBACK,
  SUIT_FIT,
  SUIT_NONSENSE,
  LABELS,
  SUBJECTS,
  BAGGAGE,
  NEED,
  label,
  fits,
  nonsense,
  record: RECORD,
};
