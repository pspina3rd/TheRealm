'use strict';

/**
 * The sword call, played with cards.
 *
 * Each turn the apprentice picks a DOOR (Validate or Expand), a TARGET
 * the call has given them something to work with, and a CARD — the
 * words the move is said with. Door and target decide what you do; the
 * card decides how it is said.
 *
 * Nothing in here is ever shown to the player as a number. The engine
 * keeps internal quantities (how well a line is likely to land, how
 * much a misfire still weighs on the call), but `viewCall()` — the only
 * player-facing export — returns words and nothing else.
 *
 * The causes, the records, and whether an action works all come from
 * `supportCall.js`. This file does not add a diagnosis step: the player
 * never names the cause, they act, and the caller tells them what
 * happened.
 *
 * THE LINK BETWEEN HEARING AND VALIDATING
 *
 * Every statement the caller makes has a certainty (are they actually
 * sure of it?) and a delivery (does it come out hesitant?). The two are
 * related but not the same — a pause can mean they are watching a
 * zombie. Validating something they were sure of costs; validating
 * something they were unsure of helps, and leaving it unvalidated makes
 * whatever is built on it land worse. Hesitation lives only in the
 * exact words. The gist keeps the facts and drops the delivery, so a
 * player who only gets the gist cannot hear the difference.
 */

const S = require('./supportCall.js');

// ---------------------------------------------------------------------
// Seeded randomness for the customer's static layer
// ---------------------------------------------------------------------

/** mulberry32. Used ONLY to derive a customer from a stored seed. */
function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------
// Doors, targets, cards, upgrades
// ---------------------------------------------------------------------

const DOORS = ['validate', 'expand'];

/** The subset of Phil's placeholder targets this call uses. */
const TARGETS = {
  validate: { name: 'Name', account: 'Account', fact: 'Fact', detail: 'Detail' },
  expand: {
    detail: 'Detail', search: 'Search', result: 'Result',
    step: 'Step', procedure: 'Procedure', process: 'Process',
  },
};

/**
 * The hand. One thing each. A card belongs to one door and can be said
 * against a small set of that door's targets.
 */
const CARDS = {
  ask: { name: 'Ask', door: 'expand', targets: ['detail'] },
  lookItUp: { name: 'Look it up', door: 'expand', targets: ['search'] },
  sayWhatIFound: { name: 'Say what I found', door: 'expand', targets: ['result'] },
  readItBack: { name: 'Read it back', door: 'validate', targets: ['name', 'account', 'fact'] },
  steady: { name: 'Steady', door: 'validate', targets: ['detail'] },
  talkItThrough: { name: 'Talk it through', door: 'expand', targets: ['step'] },
  putItRight: { name: 'Put it right', door: 'expand', targets: ['procedure'] },
  theNo: { name: 'The No', door: 'expand', targets: ['process'] },
  tryAnotherWay: { name: 'Try another way', door: 'expand', targets: ['detail', 'step'] },
};

/**
 * Upgrade effects. The first three are the settled categories; the rest
 * are the other agreed effects. How the rest group under the three is
 * OPEN and deliberately not encoded here.
 */
const UPGRADE_EFFECTS = [
  'armour', 'strength', 'finesse',
  'reliability', 'visibility', 'durability', 'yield', 'reach',
];

/** The move that a (door, target) pair performs in supportCall terms. */
const ACTION_FOR = {
  'validate:detail': 'steady',
  'expand:step': 'walkThrough',
  'expand:procedure': 'registerProduct',
  'expand:process': 'referGuild',
};

// ---------------------------------------------------------------------
// Tuning. Internal only — never reaches the player.
// ---------------------------------------------------------------------

const TUNE = {
  base: 0.72,
  doorWanted: 1.15,
  doorNotWanted: 0.85,
  fadePerUse: 0.3, // tea bag: 1 / (1 + 0.3 * uses)
  sameMoveOtherCard: 0.5, // repeating the move with different words counts half
  welcomePerUse: 0.05, // hand-holding customers: 1 + 0.05 * uses
  welcomeCap: 1.15,
  doorRepeat: 0.8, // per repeat of the same door beyond the agent's practice
  patternRead: 0.8,
  thirdValidation: 0.45,
  overValidation: 0.7, // validating something they were sure of
  neededValidation: 1.15, // validating something they were not sure of
  unvalidatedShaky: 0.8, // building on an unsure statement nobody checked
  hesitantWhenSure: 0.2, // a pause that means nothing
  hesitantWhenUnsure: 0.75,
  certaintyMin: 0.3, // share of statements a caller is sure of: 0.3 to 0.9
  certaintySpan: 0.6,
  debuff: 0.7,
  armourDebuffRecovery: 0.08, // per armour level
  warinessPerHit: 0.1,
  warinessFloor: 0.6,
  resisted: 0.5,
  finesseForward: 0.04, // per finesse level
  criticalCarry: 0.05,
  misfireMargin: 0.25,
  reliabilityShift: 0.06, // per level, applied to both bands
  criticalPerStrength: 0.03,
  memoryChance: 0.25,
  yieldBase: 0.06,
  yieldPerLevel: 0.04,
  yieldCap: 0.2,
  armourSoften: 0.2, // per level, off a misfire's hit
  failedActionHit: 0.5,
  finesseEasePerLevel: 0.15,
  easeFloor: 0.25, // a hit never eases below a quarter of what it was
  hangUpBeyondTolerance: 3, // visible failures beyond tolerance before they end the call
  qMin: 0.05,
  qMax: 0.95,
};

// ---------------------------------------------------------------------
// The customer
// ---------------------------------------------------------------------

const PATTERNS = ['none', '1-1', '2-1', '3-1', '3-3'];
const REMEMBERS = ['that someone checked', 'that someone stayed calm', 'that it was quick'];
const NAMES = [
  'Wren Callow', 'Rowan Ashby', 'Ellis Marrow', 'Sage Tolliver',
  'Quinn Hollis', 'Arden Pike', 'Morgan Fell', 'Robin Cray',
];

/**
 * Derives the customer's static layer from a seed. Same seed, same
 * person, always — store the seed, never the rolled result.
 *
 * Nothing here is an archetype. There is no type field to feed into a
 * roll; each trait is rolled on its own. New traits are drawn AFTER the
 * old ones so adding one never changes who an existing seed is.
 *
 * @param {number} seed - an unsigned 32-bit integer
 * @returns {{seed:number, empathy:number, prefers:string,
 *   afterFailure:string, tolerance:number, pattern:string,
 *   handHolding:boolean, resists:(string|null), carry:number,
 *   remembers:string, name:string, certainty:number}}
 */
function customerFromSeed(seed) {
  if (!Number.isInteger(seed) || seed < 0) throw new Error(`Bad customer seed: ${seed}`);
  const r = seededRng(seed);
  const pick = (list) => list[Math.floor(r() * list.length)];
  const empathy = 1 + Math.floor(r() * 5);
  return {
    seed,
    empathy,
    prefers: r() < 0.5 ? 'validate' : 'expand',
    afterFailure: r() < 0.5 ? 'validate' : 'expand',
    tolerance: 1 + Math.floor(r() * 3),
    pattern: pick(PATTERNS),
    handHolding: r() < 0.08,
    resists: r() < 0.25 ? pick(['steady', 'talkItThrough']) : null,
    // How far a Finesse lift carries forward with this person.
    carry: empathy >= 4 ? 2 : 1,
    remembers: pick(REMEMBERS),
    name: pick(NAMES),
    // How much of what they say they are actually sure of.
    certainty: TUNE.certaintyMin + TUNE.certaintySpan * r(),
  };
}

/**
 * Rolls a fresh customer seed.
 *
 * @param {function} [rng=Math.random]
 * @returns {number}
 */
function rollCustomerSeed(rng = Math.random) {
  return Math.floor(rng() * 4294967296) >>> 0;
}

/**
 * How this customer says one particular thing. Derived from the seed and
 * the statement, so the same person always says it the same way.
 *
 * `sure` is whether they actually know it. `hesitant` is whether it
 * comes out with hesitation in it. Hesitation is more likely when they
 * are unsure, but not certain either way: a sure caller sometimes
 * pauses, and an unsure one sometimes sounds perfectly clear. Hearing
 * hesitation improves the odds of validating the right thing; it never
 * tells the player for certain.
 *
 * @param {number} seed
 * @param {string} key - 'name' | 'doing' | 'activation'
 * @returns {{sure:boolean, hesitant:boolean}}
 */
function statementDelivery(seed, key) {
  const sheet = customerFromSeed(seed);
  let h = (seed ^ 0x9E3779B9) >>> 0;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0;
  const r = seededRng(h);
  const sure = r() < sheet.certainty;
  const hesitant = r() < (sure ? TUNE.hesitantWhenSure : TUNE.hesitantWhenUnsure);
  return { sure, hesitant };
}

// ---------------------------------------------------------------------
// Authored words — the agent
// ---------------------------------------------------------------------

/*
 * AGENT[card][target][subkey] = { lines, afterFailure?, better? }
 * `lines[0]` is the base wording. Further entries are only reachable
 * with Durability. `afterFailure` wordings are used when the previous
 * turn visibly went wrong.
 *
 * A line may be a function of the caller's NAME and nothing else — a
 * read-back has to say the name. Nothing else is ever slotted.
 */
const AGENT = {
  ask: {
    detail: {
      name: { lines: [
        'I can help with that. Can I start with your name?',
        "Let's get that working. Who am I speaking with?",
      ] },
      doing: { lines: [
        "Tell me what you're doing when you try to activate it.",
        'Talk me through what happens when you try it.',
      ] },
      activation: { lines: [
        'Is there anything you do to activate it, before you swing?',
        'When you draw it, what do you do to get the enchantment going?',
      ] },
      more: { lines: [
        'Is there anything else you have noticed?',
        'What else can you tell me about it?',
      ] },
    },
  },
  lookItUp: {
    search: {
      account: { lines: [
        'Thank you. Let me look up your account now.',
        "Let me pull up your account; it'll just be a moment.",
      ] },
      records: { lines: [
        "I've got your account. Give me a moment to check the subscription on it.",
        "I'm going through your account now. Bear with me.",
      ] },
    },
  },
  sayWhatIFound: {
    result: {
      payment: { lines: [
        "I've found it: the last payment on your subscription didn't go through, and nothing has been taken since, so the enchantment isn't active.",
        "Here's what I'm seeing: the last payment didn't go through, so the subscription has lapsed, and that's what's keeping the enchantment off.",
      ] },
      subscription: { lines: [
        "I've found it: your subscription term ended eleven days ago, and the enchantment ended with it.",
        "Here's what I'm seeing: the subscription ran to the end of its term eleven days ago, and the enchantment stopped with it.",
      ] },
      renewal: { lines: [
        "I've found it: auto-renewal was switched off two seasons back, so the subscription ended with the last term.",
        "Here's what I'm seeing: auto-renewal has been off for two seasons, so the subscription didn't carry on past the last term.",
      ] },
      registration: { lines: [
        "I've found it: your subscription is active and paid, but the sword isn't registered to it yet, so the enchantment has nothing to attach to.",
        "Here's what I'm seeing: the subscription is in good order, and the sword just isn't on it yet.",
      ] },
      clean: { lines: [
        "Your account is in good order: active, paid, set to renew, and the sword is registered to it. So it isn't the account.",
        "Here's what I'm seeing: everything on the account is as it should be, sword included. So we can rule the account out.",
      ] },
    },
  },
  readItBack: {
    name: { default: {
      lines: [
        (n) => `Let me read this back to you: ${n}. Is that right?`,
        (n) => `Please allow me to ensure I've got your name right: ${n}?`,
      ],
      afterFailure: [
        (n) => `I'm sorry, I'd like to confirm I got that: ${n}?`,
      ],
    } },
    account: { default: {
      lines: [
        (n) => `Let me read this back to you: an account for ${n}, with a sword bought last week. Is that you?`,
        (n) => `Please allow me to ensure I've found the right account: ${n}, one sword, bought last week?`,
      ],
      afterFailure: [
        (n) => `I'm sorry, I'd like to confirm I got that right: ${n}, one sword, bought last week?`,
      ],
    } },
    // Only ever what the CALLER said. Never our records.
    fact: {
      doing: {
        'missed-payment': { lines: ["Let me read this back to you: you're doing what you always do, and it isn't lighting. Is that right?"] },
        'subscription-expired': { lines: ['Let me read this back to you: it was working last month, and nothing has changed since. Is that right?'] },
        'auto-renewal-off': { lines: ["Let me read this back to you: it's stopped working, and nobody told you it would. Is that right?"] },
        'not-registered': { lines: ["Let me read this back to you: you bought it, carried it out, and you've been using it since. Is that right?"] },
        'never-learned-it': { lines: ["Let me read this back to you: you draw it and swing it, and that's always been enough. Is that right?"] },
        'forgot-under-stress': { lines: ["Let me read this back to you: you've done this plenty of times, and right now it won't come to you. Is that right?"] },
        default: { lines: ["Let me read that back to you, so I've got it right: that's what happens every time you try it?"] },
      },
      activation: {
        'never-learned-it': { lines: ['Let me read this back to you: nobody mentioned a step when you got it. Is that right?'] },
        'forgot-under-stress': { lines: ["Let me read this back to you: you know there's a step, and it's gone for the moment. Is that right?"] },
        'too-frightened': { lines: ["Let me read this back to you: you're doing it, and it isn't lighting. Is that right?"] },
        record: { lines: ["Let me read this back to you: you're doing it the way the shop showed you, and it isn't taking. Is that right?"] },
        default: { lines: ["Let me read that back to you, so I've got it right: that's what happens when you try to activate it?"] },
      },
    },
  },
  steady: {
    detail: { default: { lines: [
      "Zombies in front of you is a lot. You've got me now. Let's take one slow breath before anything else.",
      "I'm right here with you. Let's slow down for a moment, and then we'll get it working.",
    ] } },
  },
  talkItThrough: {
    step: { default: { lines: [
      "Let's go through it together, one step at a time. Draw it slowly, and tell me when it's clear of the scabbard.",
      "We'll do it together. Start with the draw, nice and slow, and I'll talk you through the rest.",
    ] } },
  },
  putItRight: {
    procedure: { default: { lines: [
      "I'm registering the sword against your contract now. It only takes a moment.",
      "Stay with me; I'm adding the sword to your contract right now.",
    ] } },
  },
  theNo: {
    process: {
      payment: {
        lines: ["I'm sorry, we can't take payments here. The guild hall can, and the enchantment comes back once they have."],
        better: ["I understand you want this working right now; let's talk about what is available. The guild hall can take the payment, and the enchantment comes back as soon as they have."],
      },
      subscription: {
        lines: ["I'm sorry, we can't renew a subscription from here. The guild hall can, and the enchantment comes back once it's renewed."],
        better: ["I understand you want it switched back on; let's talk about what is available. The guild hall can renew the subscription, and the enchantment comes back once it's renewed."],
      },
      renewal: {
        lines: ["I'm sorry, we can't restart the subscription from here. The guild hall can, and they can turn auto-renewal back on while you're there."],
        better: ["I understand you want it back on; let's talk about what is available. The guild hall can restart the subscription and turn auto-renewal back on in the same visit."],
      },
      other: {
        lines: ["I'm sorry, we can't change anything on the subscription from here. The guild hall would be the place to take it."],
        better: ["I understand you want this sorted; let's talk about what is available. The guild hall can go over the subscription with you."],
      },
    },
  },
  tryAnotherWay: {
    detail: { default: { lines: [
      'This gave us some information, so it was worth trying; next we can go over exactly what happens when you draw it.',
      "Not unexpected, let's try it a different way: tell me, one step at a time, what you do when you draw it.",
    ] } },
    step: { default: { lines: [
      "Well, that usually works; good thing we've got a few more options. Let's go through it together once more, slower this time.",
      "Not unexpected, let's try it in smaller steps. Just the draw first, and tell me when it's clear.",
    ] } },
  },
};

// ---------------------------------------------------------------------
// Authored words — the caller
// ---------------------------------------------------------------------

const OPENING = {
  you: 'TLC Support. How may I help you?',
  caller: S.rollCall(() => 0).opening,
};

/*
 * `exact` is what they said. `gist` is what a player without Visibility
 * gets: the facts, without the delivery. It is NOT speech and is never
 * shown under a CALLER label. A null gist means there was nothing
 * factual in it to keep ("Okay. Thank you.").
 */
const line = (exact, gist) => ({ exact, gist });

const REPLY = {
  name: {
    clear: line((n) => `${n}.`, (n) => `Name: ${n}.`),
    clearFlat: line((n) => `${n}. Can we hurry, please?`, (n) => `Name: ${n}.`),
    hesitant: line((n) => `It's… ${n.split(' ')[0]}. ${n}.`, (n) => `Name: ${n}.`),
    critical: line((n) => `${n}. Thank you for picking up so fast.`, (n) => `Name: ${n}.`),
    misfire: line('Does that matter right now? There are zombies!', 'No name given; wants to get to the sword.'),
  },
  doingMisfire: line("I'm swinging it at zombies. What do you think I'm doing?", "No answer; asks what you think they're doing."),
  activation: {
    clear: line("I do it the way the shop showed me. It just doesn't take.", "Does it the way the shop showed them; it doesn't take."),
    hesitant: line("I do it the way the shop… the way they showed me. It doesn't take.", "Does it the way the shop showed them; it doesn't take."),
    misfire: line('Can you just tell me how to fix it?', 'Wants the fix, not questions.'),
  },
  more: {
    lands: line("That's everything I can think of.", 'Nothing more to add.'),
    flat: line("I don't — I don't know what else to tell you.", 'Nothing more to add.'),
    misfire: line("I've told you everything already!", 'Nothing more to add.'),
  },
  wait: {
    lands: line('Okay. Thank you.', null),
    flat: line('Okay. Please be quick.', null),
    misfire: line("How long is this going to take? They're getting closer.", 'Asks how long this will take.'),
    critical: line("Thank you. I'll keep them back.", null),
  },
  waitRecords: {
    lands: line('Is it the account? Is something wrong with it?', "Asks if something's wrong with the account."),
    flat: line('Is it the account? Okay.', "Asks if it's the account."),
    misfire: line("I don't need the account checked, I need the sword working!", 'Wants the sword working, not the account checked.'),
    critical: line("Take your time. If it's the account, I'd rather know.", "Wants to know if it's the account."),
  },
  // Validating something they were sure of.
  confirmSure: {
    lands: line('Yes.', 'Confirmed.'),
    flat: line('Yes. I just said that.', 'Confirmed; already said.'),
    misfire: line('I just told you that. Were you listening?', 'Confirmed; already said.'),
    critical: line("Yes, that's right.", 'Confirmed.'),
  },
  // Validating something they were not sure of.
  confirmUnsure: {
    lands: line("Yes, that's it. Thank you for checking.", 'Confirmed.'),
    flat: line('I think so. Yes.', 'Confirmed.'),
    misfire: line("I don't know — I think so. Can you just fix it?", 'Confirmed; wants it fixed.'),
    critical: line('Yes, exactly that. Thank you for checking.', 'Confirmed.'),
  },
  confirmAccount: {
    lands: line("Yes, that's me.", 'Account confirmed.'),
    flat: line("Yes — that's… yes. That's me.", 'Account confirmed.'),
    misfire: line("Yes, it's me. Can we get to the sword?", 'Account confirmed; wants to get to the sword.'),
    critical: line("That's me. Thank you for making sure.", 'Account confirmed.'),
  },
  confirmThird: {
    lands: line("Yes. That's three times now. Yes.", 'Confirmed again; points out it is the third time.'),
    flat: line("Yes. That's three times now. Yes.", 'Confirmed again; points out it is the third time.'),
    misfire: line("I've told you three times! Yes!", 'Confirmed again; points out it is the third time.'),
  },
  // Hearing what the account shows. They are learning it, not confirming it.
  found: {
    payment: {
      lands: line("It didn't go through? Nobody told me. Can you take it now?", "Didn't know the payment failed. Asks if you can take it now."),
      flat: line("Didn't go through… okay. Can you take it now?", 'Asks if you can take the payment now.'),
    },
    subscription: {
      lands: line('Ended? Already? Can you switch it back on?', 'Asks if you can switch it back on.'),
      flat: line('Ended. Okay. Can you switch it back on?', 'Asks if you can switch it back on.'),
    },
    renewal: {
      lands: line("Switched off? I didn't know that. Can you turn it back on?", "Didn't know auto-renewal was off. Asks you to turn it back on."),
      flat: line('Off… okay. Can you turn it back on?', 'Asks you to turn it back on.'),
    },
    registration: {
      lands: line('Not registered? I thought buying it was the registering. Can you do that for me?', 'Thought buying it registered it. Asks you to do it.'),
      flat: line('Not registered. Okay. Can you do it?', 'Asks you to register it.'),
    },
    clean: {
      lands: line("So it's not the account. Then why won't it work?", "Asks why it won't work, if it isn't the account."),
      flat: line("Okay. So why isn't it working?", 'Asks why it is not working.'),
    },
    misfire: line('Fine, whatever it says. Can we please fix the sword?', 'Wants the sword fixed, not account details.'),
  },
  steadyWorked: {
    lands: line("Okay. Okay. I'm breathing. Let me try it again… It's lit. It's lit!", 'Calmer; tries again, and the enchantment lights.'),
    flat: line("Okay. I'm… okay. Trying again. Oh — it's lit.", 'Calmer; tries again, and the enchantment lights.'),
    critical: line("Okay. Thank you. I'm all right now. Trying it — there. It's lit, and it's bright.", 'Calmer; tries again, and the enchantment lights.'),
  },
  steadyNotTaken: line("I can't breathe slowly, they're right there!", 'Too frightened to slow down.'),
  steadyNotNeeded: {
    lands: line("I'm all right, honestly. It's the sword that isn't.", "Says they're all right; it's the sword that isn't."),
    flat: line("I'm fine. The sword isn't.", "Says they're all right; it's the sword that isn't."),
    misfire: line("I don't need calming down, I need this sword to work!", "Doesn't want calming down; wants the sword working."),
  },
  stepWorked: {
    lands: line("Slowly… it's clear — oh! It's lit!", 'Follows along; the enchantment lights.'),
    flat: line("Okay, slowly… it's lit. Right. It's lit.", 'Follows along; the enchantment lights.'),
    critical: line("Slowly… clear… oh, it's lit! Thank you for going step by step.", 'Follows along; the enchantment lights.'),
  },
  stepLost: line("Wait, wait — slowly how? I've lost where we are.", 'Lost track of the steps.'),
  stepNothing: {
    lands: line("I did it just like that. It's still dark.", 'Follows it exactly; still dark.'),
    flat: line('Slowly… clear. Still nothing.', 'Follows it exactly; still dark.'),
    misfire: line('I know how to draw a sword!', "Doesn't want to be taken through drawing a sword."),
  },
  stepFrightened: {
    lands: line("I'm doing it. I'm doing what you said and it's not — sorry. Sorry.", 'Tries; nothing lights. Keeps apologising.'),
    flat: line("I'm doing it, I'm — sorry.", 'Tries; nothing lights. Keeps apologising.'),
    misfire: line("I can't — I can't do steps right now.", "Can't do steps right now."),
  },
  registerWorked: {
    lands: line("Wait — it's glowing. It's actually working!", 'The enchantment lights.'),
    flat: line("Oh. It's working now.", 'The enchantment lights.'),
    misfire: line("It's working. Finally.", 'The enchantment lights.'),
    critical: line("It's glowing! Thank you — thank you so much.", 'The enchantment lights.'),
  },
  registerNothing: {
    lands: line("Nothing. It's still dark.", 'Still dark.'),
    flat: line('Still nothing.', 'Still dark.'),
    misfire: line("Still dark, and they're right here!", 'Still dark; the zombies are close.'),
  },
  referWorked: {
    lands: line("Right. The guild hall. I'll go now.", 'Will go to the guild hall.'),
    flat: line("The guild hall. Fine. I'll go.", 'Will go to the guild hall.'),
    misfire: line("You can't just do it? There are zombies right here! …Fine. The guild hall.", "Upset it can't be done here; will go to the guild hall."),
    critical: line('The guild hall. Thank you for being straight with me.', 'Will go to the guild hall.'),
  },
  referWrong: {
    lands: line("The guild? But I've paid for all of it.", "Says it's paid; the guild isn't what they need."),
    flat: line("Why would the guild help? It's paid.", "Says it's paid; the guild isn't what they need."),
    misfire: line("You're sending me somewhere else? It's paid!", "Says it's paid; the guild isn't what they need."),
  },
  hangUp: line("I'm sorry, I can't keep doing this. I'll find another way.", 'Ends the call.'),
};

/*
 * Per-cause words. For `doing` and `activation` the CLEAR version is
 * Phil's line from supportCall.js; what is written here is the hesitant
 * version and the gist. `noFact` marks a reply with nothing in it to
 * validate.
 */
const REPLY_BY_CAUSE = {
  doing: {
    'missed-payment': {
      hesitant: "I did what I always do. It… just doesn't light.",
      gist: "Doing what they always do; it doesn't light.",
    },
    'subscription-expired': {
      hesitant: 'It worked last month. I have not — no. I have not changed anything.',
      gist: 'Worked last month; nothing changed since.',
    },
    'auto-renewal-off': {
      hesitant: 'Nobody… nobody told me it would stop.',
      gist: 'Nobody told them it would stop.',
    },
    'not-registered': {
      hesitant: "I bought it, I carried it out, I have been — I've been using it.",
      gist: 'Bought it, carried it out, been using it.',
    },
    'never-learned-it': {
      hesitant: "I draw it. I swing it. That's… that has always been enough.",
      gist: 'Draws it and swings it; that has always been enough.',
    },
    'forgot-under-stress': {
      hesitant: 'I have done this a hundred times. I… cannot think of it now.',
      gist: "Has done it many times; can't think of it now.",
    },
    'too-frightened': {
      hesitant: 'Sorry — what — sorry, what did you ask me?',
      gist: 'Asks what you asked.',
      noFact: true,
    },
  },
  activation: {
    'never-learned-it': {
      hesitant: "A step? There's… nobody said there was a step.",
      gist: "Didn't know there was a step.",
    },
    'forgot-under-stress': {
      hesitant: "I know it. I… it's gone.",
      gist: "Knows the step; it's gone.",
    },
    'too-frightened': {
      hesitant: "I'm doing it, I'm — sorry.",
      gist: "Doing it; it isn't lighting.",
    },
  },
  steadyNotNeeded: {
    'forgot-under-stress': {
      lands: line("I'm all right. I just can't think what I'm meant to do.", "All right; can't think what they're meant to do."),
      flat: line("I'm all right. I just can't think.", "All right; can't think what they're meant to do."),
    },
  },
  volunteer: {
    'missed-payment': line("I did get a letter from the guild. I haven't opened it.", 'Has an unopened letter from the guild.'),
    'subscription-expired': line("I've had it about a year now, if that helps.", 'Has had it about a year.'),
    'auto-renewal-off': line('I changed a lot of things at the guild hall last spring. Fewer letters.', 'Changed things at the guild hall last spring.'),
    'not-registered': line("The shop gave me a paper to fill in. I think it's still in the bag.", 'The shop gave them a paper to fill in; may still be in the bag.'),
    'never-learned-it': line('Is there meant to be something you do first? Nobody showed me anything.', 'Asks if there is something you do first; nobody showed them.'),
    'forgot-under-stress': line("There's something you do first. I know there is. It's gone.", "Knows there's something you do first; it's gone."),
    'too-frightened': line("Sorry. I'm — they're really close. Sorry.", 'The zombies are close.'),
  },
};

// ---------------------------------------------------------------------
// Upgrades
// ---------------------------------------------------------------------

/**
 * Checks one card's upgrade list. A card takes up to three upgrades:
 * the same one up to three times, or two different ones with one of them
 * taken twice. Upgrades never add rules text, so this is the only shape
 * check there is.
 *
 * @param {string[]} upgrades
 * @returns {string[]} the same list, if valid
 * @throws if too many, too varied, or unknown (Speed is rejected by name)
 */
function validateUpgrades(upgrades) {
  if (!Array.isArray(upgrades)) throw new Error('Upgrades must be a list');
  if (upgrades.length > 3) throw new Error('A card takes at most three upgrades');
  for (const u of upgrades) {
    if (!UPGRADE_EFFECTS.includes(u)) throw new Error(`Unknown upgrade: "${u}"`);
  }
  if (new Set(upgrades).size > 2) throw new Error('At most two different upgrades on one card');
  return upgrades;
}

function level(upgrades, effect) {
  return (upgrades || []).filter((u) => u === effect).length;
}

// ---------------------------------------------------------------------
// Starting a call
// ---------------------------------------------------------------------

/**
 * Opens a call. The opening is fixed and is the only opening move.
 *
 * @param {object} opts
 * @param {number} opts.customerSeed - the customer's stored seed
 * @param {object} opts.cause - an entry shaped like supportCall's CAUSES
 * @param {{practice:number}} [opts.agent] - practice: how many times in a
 *   row the agent can use the same door before it starts to tell
 * @param {Object<string,string[]>} opts.hand - card id -> upgrades
 * @returns {object} call state (internal; show the player viewCall())
 */
function startCall({ customerSeed, cause, agent = { practice: 0 }, hand }) {
  customerFromSeed(customerSeed); // validates the seed
  if (!cause || !cause.id) throw new Error('A call needs a cause');
  const cleanHand = {};
  for (const [id, ups] of Object.entries(hand || {})) {
    if (!CARDS[id]) throw new Error(`Unknown card: "${id}"`);
    cleanHand[id] = validateUpgrades(ups.slice());
  }
  return {
    customerSeed,
    cause: JSON.parse(JSON.stringify(cause)),
    agent: { practice: agent.practice || 0 },
    hand: cleanHand,
    evidence: {
      nameGiven: false, accountFound: false, doingHeard: false,
      activationHeard: false, recordsRead: false, finding: null,
      findingShared: false, volunteered: false,
    },
    // What the caller has stated: { name?, doing?, activation? },
    // each { sure, hesitant, validated, fact }.
    statements: {},
    turns: [],
    hits: [],
    debuffed: {},
    carry: null,
    memories: [],
    resolved: false,
    ended: false,
  };
}

// ---------------------------------------------------------------------
// What the player can do
// ---------------------------------------------------------------------

function anyFailure(state) {
  // A failure the agent can tell happened: a misfire, or an action that
  // did not work. A flat landing counts against the caller's patience,
  // but it is not something to pivot away from out loud.
  return state.turns.some((t) => t.wentWrong);
}

/** The most recent thing the caller stated that can be read back. */
function latestFact(state) {
  const st = state.statements;
  if (st.activation && st.activation.fact) return 'activation';
  if (st.doing && st.doing.fact) return 'doing';
  return null;
}

/** Evidence gate for each door:target. Never a sequence gate. */
function targetOpen(state, door, target) {
  const e = state.evidence;
  switch (`${door}:${target}`) {
    case 'validate:name': return Boolean(state.statements.name);
    case 'validate:account': return e.accountFound;
    case 'validate:fact': return latestFact(state) !== null;
    case 'validate:detail': return true; // the zombies are in the opening line
    case 'expand:detail': return true; // the request is in the opening line
    case 'expand:search': return e.nameGiven && !e.recordsRead;
    case 'expand:result': return e.recordsRead && !e.findingShared;
    case 'expand:step': return e.doingHeard || e.recordsRead;
    case 'expand:procedure': return e.recordsRead;
    case 'expand:process': return e.recordsRead;
    default: return false;
  }
}

/**
 * Every move open to the player right now: cards in hand, against
 * targets the call has given them something to work with.
 *
 * @param {object} state
 * @returns {{door:string, target:string, card:string}[]}
 */
function availableMoves(state) {
  if (state.resolved || state.ended) return [];
  const moves = [];
  for (const cardId of Object.keys(state.hand)) {
    const card = CARDS[cardId];
    for (const target of card.targets) {
      if (!targetOpen(state, card.door, target)) continue;
      if (cardId === 'tryAnotherWay') {
        if (!anyFailure(state)) continue;
        if (target === 'detail' && !state.evidence.nameGiven) continue;
      }
      moves.push({ door: card.door, target, card: cardId });
    }
  }
  return moves;
}

// ---------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------

/**
 * The tea bag. How much a card still has in it after `uses` in the
 * window. Gradual by construction — never a wall. For a hand-holding
 * customer repetition helps instead, a little, up to a cap.
 *
 * @param {number} uses - prior uses in the window (may be fractional)
 * @param {boolean} handHolding
 * @returns {number} a multiplier; internal only
 */
function fadeFactor(uses, handHolding) {
  if (handHolding) return Math.min(TUNE.welcomeCap, 1 + TUNE.welcomePerUse * uses);
  return 1 / (1 + TUNE.fadePerUse * uses);
}

const DOOR_LETTER = { validate: 'V', expand: 'E' };

/**
 * Whether a run of doors reads as a pattern to this customer. Patterns
 * are run lengths of doors: '2-1' is two of one door then one of the
 * other, repeating. The window matches if it could be a slice of that
 * repeating sequence, starting on either door, at any phase.
 *
 * @param {string} pattern - one of PATTERNS
 * @param {string[]} doors - oldest first
 * @returns {boolean}
 */
function readsAsPattern(pattern, doors) {
  if (pattern === 'none' || doors.length < 4) return false;
  const [a, b] = pattern.split('-').map(Number);
  const w = doors.map((d) => DOOR_LETTER[d]).join('');
  for (const [x, y] of [['V', 'E'], ['E', 'V']]) {
    const period = x.repeat(a) + y.repeat(b);
    const long = period.repeat(Math.ceil((w.length + period.length) / period.length) + 1);
    if (long.includes(w)) return true;
  }
  return false;
}

function currentWant(state, sheet) {
  const nonPositive = state.turns.filter((t) => t.nonPositive).length;
  if (nonPositive > sheet.tolerance) return sheet.prefers === 'validate' ? 'expand' : 'validate';
  const last = state.turns[state.turns.length - 1];
  if (last && last.nonPositive) return sheet.afterFailure;
  return sheet.prefers;
}

/** What a validate move is checking: 'name' | 'account' | 'doing' | 'activation' | null. */
function validatesWhat(state, move) {
  if (move.door !== 'validate') return null;
  if (move.target === 'name') return 'name';
  if (move.target === 'account') return 'account';
  if (move.target === 'fact') return latestFact(state);
  return null;
}

/** The caller statement an expand move is built on, if any. */
function buildsOn(state, move) {
  if (move.door !== 'expand') return null;
  if (move.target === 'search' && !state.evidence.accountFound) return 'name';
  if (move.target === 'step') return latestFact(state);
  return null;
}

function landingQuality(state, move, sheet) {
  const ups = state.hand[move.card];
  const window = state.turns.slice(-3);
  let q = TUNE.base;

  q *= move.door === currentWant(state, sheet) ? TUNE.doorWanted : TUNE.doorNotWanted;

  const sameCard = window.filter((t) => t.card === move.card).length;
  const sameMoveOtherCard = window.filter((t) =>
    t.card !== move.card && t.door === move.door && t.target === move.target).length;
  q *= fadeFactor(sameCard + TUNE.sameMoveOtherCard * sameMoveOtherCard, sheet.handHolding);

  if (!sheet.handHolding) {
    let run = 0;
    for (let i = state.turns.length - 1; i >= 0 && state.turns[i].door === move.door; i--) run++;
    q *= Math.pow(TUNE.doorRepeat, Math.max(0, run - state.agent.practice));

    const doors = [...window.map((t) => t.door), move.door];
    if (readsAsPattern(sheet.pattern, doors) && window.some((t) => t.nonPositive)) {
      q *= TUNE.patternRead;
    }
  }

  const about = validatesWhat(state, move);
  if (about) {
    const given = state.turns.filter((t) => t.about === about).length;
    if (given >= 2) q *= TUNE.thirdValidation;
    const said = state.statements[about];
    if (said) q *= said.sure ? TUNE.overValidation : TUNE.neededValidation;
  }

  const basis = buildsOn(state, move);
  const basisSaid = basis && state.statements[basis];
  if (basisSaid && !basisSaid.sure && !basisSaid.validated) q *= TUNE.unvalidatedShaky;

  if (state.debuffed[move.card]) {
    q *= TUNE.debuff + TUNE.armourDebuffRecovery * level(ups, 'armour');
  }

  const wariness = state.hits.reduce((sum, h) => sum + h.severity, 0);
  q *= Math.max(TUNE.warinessFloor, 1 - TUNE.warinessPerHit * wariness);

  if (sheet.resists === move.card && level(ups, 'reach') === 0) q *= TUNE.resisted;

  if (state.carry && state.carry.turnsLeft > 0) q += state.carry.bonus;

  return Math.min(TUNE.qMax, Math.max(TUNE.qMin, q));
}

function rollLanding(q, ups, rng) {
  const rel = level(ups, 'reliability') * TUNE.reliabilityShift;
  const str = level(ups, 'strength');
  const r = rng();
  if (r >= q + TUNE.misfireMargin + rel) return 'misfire';
  if (r >= q + rel) return 'flat';
  if (str > 0 && r < TUNE.criticalPerStrength * str) return 'critical';
  return 'lands';
}

/**
 * Eases an earlier hit. Finesse reverberates backward: it softens what
 * already happened and never erases it — a hit cannot fall below a
 * quarter of what it first was.
 *
 * @param {{original:number, severity:number}} hit
 * @param {number} finesseLevel
 * @returns {{original:number, severity:number}} a new hit
 */
function easeHit(hit, finesseLevel) {
  const eased = hit.severity * (1 - TUNE.finesseEasePerLevel * finesseLevel);
  return { original: hit.original, severity: Math.max(hit.original * TUNE.easeFloor, eased) };
}

// ---------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------

function findingOf(cause) {
  const faulty = S.RECORD_TARGETS.find((t) => S.checkRecord({ cause }, t).carriesFault);
  return faulty || 'clean';
}

function detailStage(e) {
  if (!e.nameGiven) return 'name';
  if (!e.doingHeard) return 'doing';
  if (!e.activationHeard) return 'activation';
  return 'more';
}

/** A written line, given the caller's name (the only thing ever put in one). */
function say(text, name) {
  return typeof text === 'function' ? text(name) : text;
}

function spoken(l, name) {
  return { exact: say(l.exact, name), gist: l.gist == null ? null : say(l.gist, name) };
}

function agentEntry(state, move) {
  const e = state.evidence;
  const byCard = AGENT[move.card][move.target];
  if (move.card === 'ask') return byCard[detailStage(e)];
  if (move.card === 'lookItUp') return byCard[e.accountFound ? 'records' : 'account'];
  if (move.card === 'sayWhatIFound') return byCard[e.finding];
  if (move.card === 'readItBack' && move.target === 'fact') {
    const about = latestFact(state);
    const pool = byCard[about];
    if (pool[state.cause.id]) return pool[state.cause.id];
    if (about === 'activation' && !state.cause.person.askActivation) return pool.record;
    return pool.default;
  }
  if (move.card === 'theNo') {
    const f = e.finding;
    return byCard[['payment', 'subscription', 'renewal'].includes(f) ? f : 'other'];
  }
  return byCard.default;
}

function agentWords(state, move, name) {
  const ups = state.hand[move.card];
  const entry = agentEntry(state, move);
  const last = state.turns[state.turns.length - 1];
  let pool = entry.lines;
  if (move.card === 'theNo' && level(ups, 'finesse') > 0) pool = entry.better;
  else if (last && last.wentWrong && entry.afterFailure) pool = entry.afterFailure;
  const durability = level(ups, 'durability');
  const reachable = Math.min(pool.length, 1 + durability);
  const prior = state.turns.filter((t) => t.card === move.card && t.target === move.target).length;
  return say(pool[prior % reachable], name);
}

function tiered(set, landing) {
  return set[landing] || set.lands;
}

function volunteerLine(cause) {
  return REPLY_BY_CAUSE.volunteer[cause.id]
    || line("I don't know if it matters, but it's never done this before.", 'Says it has never done this before.');
}

// ---------------------------------------------------------------------
// Playing a move
// ---------------------------------------------------------------------

/**
 * Plays one move. Door and target decide what happens; the card decides
 * the words. The caller answers in words only.
 *
 * Correctness is not adjudicated: an action works if it is the thing
 * that was wrong (supportCall's act()), and — for the two actions that
 * happen inside the person, talking them through and steadying them —
 * only if the words land well enough to be followed. Registering and
 * referring are done to the account, so they happen however they were
 * said; the words only change how it is taken.
 *
 * When the caller states something, how they said it is fixed by their
 * seed (statementDelivery). That decides whether the exact words carry
 * hesitation, and whether validating it later helps or costs.
 *
 * @param {object} state - from startCall() or a previous playMove()
 * @param {{door:string, target:string, card:string}} move
 * @param {function} [rng=Math.random]
 * @returns {object} a new state; the input is not mutated
 */
function playMove(state, move, rng = Math.random) {
  const open = availableMoves(state).some((m) =>
    m.door === move.door && m.target === move.target && m.card === move.card);
  if (!open) throw new Error(`Move not available: ${move.door} ${move.target} ${move.card}`);

  const next = JSON.parse(JSON.stringify(state));
  const sheet = customerFromSeed(state.customerSeed);
  const name = sheet.name;
  const ups = next.hand[move.card];
  const cause = next.cause;
  const e = next.evidence;

  const said = agentWords(state, move, name);
  const about = validatesWhat(state, move);
  const q = landingQuality(state, move, sheet);
  if (next.carry) {
    next.carry.turnsLeft -= 1;
    if (next.carry.turnsLeft <= 0) next.carry = null;
  }
  const landing = rollLanding(q, ups, rng);
  const replies = [];
  let failed = false;

  const action = ACTION_FOR[`${move.door}:${move.target}`];
  let worked = false;
  if (action) worked = S.act({ cause }, action).worked;

  const state_ = (key, fact) => {
    const d = statementDelivery(state.customerSeed, key);
    next.statements[key] = { sure: d.sure, hesitant: d.hesitant, validated: false, fact };
    return d;
  };

  switch (`${move.door}:${move.target}`) {
    case 'expand:detail': {
      const stage = move.card === 'tryAnotherWay'
        ? (e.doingHeard ? (e.activationHeard ? 'more' : 'activation') : 'doing')
        : detailStage(e);
      if (stage === 'name') {
        if (landing === 'misfire') {
          replies.push(REPLY.name.misfire);
        } else {
          const d = state_('name', true);
          replies.push(d.hesitant ? REPLY.name.hesitant
            : landing === 'critical' ? REPLY.name.critical
              : landing === 'flat' ? REPLY.name.clearFlat : REPLY.name.clear);
          e.nameGiven = true;
        }
      } else if (stage === 'doing') {
        if (landing === 'misfire') {
          replies.push(REPLY.doingMisfire);
        } else {
          const own = REPLY_BY_CAUSE.doing[cause.id] || {};
          const d = state_('doing', !own.noFact);
          const exact = d.hesitant && own.hesitant ? own.hesitant : cause.person.askDoing;
          replies.push(line(exact, own.gist || 'Describes what they do when they try it.'));
          e.doingHeard = true;
        }
      } else if (stage === 'activation') {
        if (landing === 'misfire') {
          replies.push(REPLY.activation.misfire);
        } else {
          const d = state_('activation', true);
          if (cause.person.askActivation) {
            const own = REPLY_BY_CAUSE.activation[cause.id] || {};
            const exact = d.hesitant && own.hesitant ? own.hesitant : cause.person.askActivation;
            replies.push(line(exact, own.gist || 'Describes what they do to activate it.'));
          } else {
            replies.push(d.hesitant ? REPLY.activation.hesitant : REPLY.activation.clear);
          }
          e.activationHeard = true;
        }
      } else {
        replies.push(tiered(REPLY.more, landing));
      }
      if (stage !== 'name' && landing !== 'misfire' && !e.volunteered) {
        const yieldChance = Math.min(TUNE.yieldCap,
          TUNE.yieldBase + TUNE.yieldPerLevel * level(ups, 'yield'));
        if (landing === 'critical' || rng() < yieldChance) {
          replies.push(volunteerLine(cause));
          e.volunteered = true;
          if (cause.visibility === 'person') e.activationHeard = true;
        }
      }
      break;
    }
    case 'expand:search':
      if (!e.accountFound) {
        replies.push(tiered(REPLY.wait, landing));
        e.accountFound = true;
      } else {
        replies.push(tiered(REPLY.waitRecords, landing));
        e.recordsRead = true;
        e.finding = findingOf(cause);
      }
      break;
    case 'expand:result':
      replies.push(landing === 'misfire' ? REPLY.found.misfire : tiered(REPLY.found[e.finding], landing));
      e.findingShared = true;
      break;
    case 'validate:name':
    case 'validate:account':
    case 'validate:fact': {
      const given = state.turns.filter((t) => t.about === about).length;
      const stated = next.statements[about];
      let set = REPLY.confirmAccount;
      if (stated) set = stated.sure ? REPLY.confirmSure : REPLY.confirmUnsure;
      replies.push(tiered(given >= 2 ? REPLY.confirmThird : set, landing));
      if (stated) stated.validated = true;
      break;
    }
    case 'validate:detail':
      if (worked && landing !== 'misfire') {
        replies.push(tiered(REPLY.steadyWorked, landing));
      } else if (worked) {
        replies.push(REPLY.steadyNotTaken);
        worked = false;
        failed = true;
      } else {
        const own = REPLY_BY_CAUSE.steadyNotNeeded[cause.id] || {};
        replies.push(own[landing] || tiered(REPLY.steadyNotNeeded, landing));
        failed = true;
      }
      break;
    case 'expand:step':
      if (worked && landing !== 'misfire') {
        replies.push(tiered(REPLY.stepWorked, landing));
      } else if (worked) {
        replies.push(REPLY.stepLost);
        worked = false;
        failed = true;
      } else if (cause.fixedBy === 'steady') {
        replies.push(tiered(REPLY.stepFrightened, landing));
        failed = true;
      } else {
        replies.push(tiered(REPLY.stepNothing, landing));
        failed = true;
      }
      break;
    case 'expand:procedure':
      replies.push(tiered(worked ? REPLY.registerWorked : REPLY.registerNothing, landing));
      failed = !worked;
      break;
    case 'expand:process':
      replies.push(tiered(worked ? REPLY.referWorked : REPLY.referWrong, landing));
      failed = !worked;
      break;
    default:
      throw new Error(`No handler for ${move.door}:${move.target}`);
  }

  const nonPositive = failed || landing === 'misfire' || landing === 'flat';
  const armour = level(ups, 'armour');
  if (landing === 'misfire') {
    next.debuffed[move.card] = true;
    const sev = 1 * (1 - TUNE.armourSoften * armour);
    next.hits.push({ original: sev, severity: sev });
  } else if (failed) {
    // One hit per turn: a misfired action is not charged twice.
    const sev = TUNE.failedActionHit * (1 - TUNE.armourSoften * armour);
    next.hits.push({ original: sev, severity: sev });
  }

  const finesse = level(ups, 'finesse');
  if (finesse > 0 && (landing === 'lands' || landing === 'critical')) {
    // Backward: ease the most recent earlier hit, never erase it.
    for (let i = state.hits.length - 1; i >= 0; i--) {
      if (next.hits[i].severity > next.hits[i].original * TUNE.easeFloor) {
        next.hits[i] = easeHit(next.hits[i], finesse);
        break;
      }
    }
    // Forward: the next card lands better, as far as this person carries it.
    next.carry = { bonus: TUNE.finesseForward * finesse, turnsLeft: sheet.carry };
  }
  if (landing === 'critical') {
    const bonus = (next.carry ? next.carry.bonus : 0) + TUNE.criticalCarry;
    next.carry = { bonus, turnsLeft: Math.max(1, next.carry ? next.carry.turnsLeft : 1) };
    if (next.memories.length === 0 && rng() < TUNE.memoryChance) {
      next.memories.push(sheet.remembers);
    }
  }

  next.turns.push({
    door: move.door,
    target: move.target,
    card: move.card,
    about,
    said,
    landing,
    failed,
    nonPositive,
    wentWrong: failed || landing === 'misfire',
    replies: replies.map((r) => spoken(r, name)),
    visible: level(ups, 'visibility') > 0,
    noted: false,
  });

  if (worked) next.resolved = true;
  const wentWrongCount = next.turns.filter((t) => t.wentWrong).length;
  if (!next.resolved && wentWrongCount >= sheet.tolerance + TUNE.hangUpBeyondTolerance) {
    next.turns[next.turns.length - 1].replies.push(spoken(REPLY.hangUp, name));
    next.ended = true;
  }
  return next;
}

// ---------------------------------------------------------------------
// What the player sees
// ---------------------------------------------------------------------

/**
 * Keeps the exact words of the live line in scroll-back. Only words the
 * player actually saw can be noted: a line they only got the gist of
 * stays gist.
 *
 * @param {object} state
 * @returns {object} a new state
 */
function noteLine(state) {
  const next = JSON.parse(JSON.stringify(state));
  const last = next.turns[next.turns.length - 1];
  if (last && last.visible) last.noted = true;
  return next;
}

/**
 * The player's view of the call: words, the account as it shows on the
 * agent's screen once it has been checked, and the moves on offer.
 * Nothing else.
 *
 * Speech is labelled YOU or CALLER. Gist is not speech, so it is never
 * labelled CALLER: it appears as ON THE LINE (the label the prototype
 * already uses for what you observe rather than hear). The live caller
 * line shows exact words if the card carried Visibility; everything
 * earlier collapses to gist unless noted, and a reply with nothing
 * factual in it collapses to nothing. Collapse is tied to the next move,
 * never to a timer.
 *
 * @param {object} state
 * @returns {{lines:{speaker:string, text:string}[], account:string[],
 *   moves:{door:string, target:string, card:string, label:string}[],
 *   over:boolean}}
 */
function viewCall(state) {
  const lines = [
    { speaker: 'YOU', text: OPENING.you },
    { speaker: 'CALLER', text: OPENING.caller },
  ];
  state.turns.forEach((t, i) => {
    const live = i === state.turns.length - 1;
    lines.push({ speaker: 'YOU', text: t.said });
    for (const r of t.replies) {
      if (t.noted || (live && t.visible)) lines.push({ speaker: 'CALLER', text: r.exact });
      else if (r.gist) lines.push({ speaker: 'ON THE LINE', text: r.gist });
    }
  });
  const account = state.evidence.recordsRead
    ? S.RECORD_TARGETS.map((t) => state.cause.records[t])
    : [];
  const moves = availableMoves(state).map((m) => ({
    ...m,
    label: `${m.door === 'validate' ? 'Validate' : 'Expand'} [${TARGETS[m.door][m.target]}] — ${CARDS[m.card].name}`,
  }));
  return { lines, account, moves, over: state.resolved || state.ended };
}

module.exports = {
  DOORS,
  TARGETS,
  CARDS,
  UPGRADE_EFFECTS,
  PATTERNS,
  NAMES,
  OPENING,
  AGENT,
  REPLY,
  REPLY_BY_CAUSE,
  customerFromSeed,
  rollCustomerSeed,
  statementDelivery,
  validateUpgrades,
  startCall,
  availableMoves,
  playMove,
  noteLine,
  viewCall,
  fadeFactor,
  easeHit,
  readsAsPattern,
};
