'use strict';

/**
 * A support call at TLC, under the guild-support frame.
 *
 * TLC is the support call center the guilds send apprentices to. A
 * customer holds a tiered support contract; the enchantment on the
 * sword they bought is part of that subscription. They are ringing
 * because it is not working, and there are zombies.
 *
 * THE DESIGN CONSTRAINT THIS FILE EXISTS TO HONOUR:
 *
 * The set of causes is open. Every time support thinks it knows all the
 * answers somebody finds something new — so a player cannot be carrying
 * a catalogue, and the game must not reward recognising one. `LORE.md`
 * already locks this ("the game does not grade the diagnosis — others
 * do") and the old `resolveInvestigation()` broke it, scoring the
 * player on which of four labels they picked.
 *
 * So there is **no diagnosis step here**. The player looks, asks, and
 * then *acts*. The world answers. If you register the product and that
 * was the problem, the enchantment comes up. If it was not, nothing
 * happens and the zombies are closer. Correctness is discovered in the
 * fiction rather than adjudicated by a menu.
 *
 * That also means a cause nobody has ever seen is workable by method
 * alone: rule out what cannot be true, and whatever is still standing
 * is your answer.
 */

// ---------------------------------------------------------------------
// Causes
// ---------------------------------------------------------------------

/**
 * What is actually wrong. All seven present IDENTICALLY — "the
 * enchantment isn't activating" — which is the whole point.
 *
 * `visibility` is the load-bearing field:
 *   'record' — the account shows it. Look and you will find it.
 *   'person' — no record will EVER show this. It exists in the
 *              customer: they have not learned the thing, or they are
 *              too frightened to think straight. Only talking finds it.
 *
 * Causes are data. A twentieth costs one entry and no code.
 */
const CAUSES = [
  {
    id: 'missed-payment',
    visibility: 'record',
    fixedBy: 'referGuild',
    records: {
      payment: 'Last payment failed. Nothing since.',
      subscription: 'Shows lapsed — non-payment.',
      registration: 'Registered, and to them.',
      renewal: 'Auto-renewal on. It tried and could not take it.',
    },
    person: {
      askDoing: "I did what I always do. It just doesn't light.",
    },
    // Money is a decision, not an answer. Past the referral line.
    onFix: 'You cannot take a payment or reinstate it from here. You tell them who can, and how fast that is.',
  },
  {
    id: 'subscription-expired',
    visibility: 'record',
    fixedBy: 'referGuild',
    records: {
      subscription: 'Term ended eleven days ago.',
      payment: 'Paid in full, up to the day it ended.',
      renewal: 'No renewal on the account. There never was one.',
      registration: 'Registered, and to them.',
    },
    person: {
      askDoing: "It worked last month. I have not changed anything.",
    },
    onFix: 'Renewing is the guild\'s to sell, not ours to grant. You tell them where and how long.',
  },
  {
    id: 'auto-renewal-off',
    visibility: 'record',
    fixedBy: 'referGuild',
    records: {
      renewal: 'Auto-renewal turned off. Two seasons back.',
      subscription: 'Lapsed at the end of the last term.',
      payment: 'Nothing owing. Nothing taken either.',
      registration: 'Registered, and to them.',
    },
    person: {
      askDoing: "Nobody told me it would stop.",
    },
    onFix: 'You can note it. You cannot restart it. That is a sale.',
  },
  {
    id: 'not-registered',
    visibility: 'record',
    fixedBy: 'registerProduct',
    records: {
      registration: 'No registration against this blade. The subscription has nothing to attach to.',
      subscription: 'Active, paid, in good order — and covering nothing.',
      payment: 'Paid on time, every term.',
      renewal: 'Auto-renewal on.',
    },
    person: {
      askDoing: "I bought it, I carried it out, I have been using it.",
    },
    onFix: 'You register the blade against their contract. It takes a moment. The ward comes up while they are still talking.',
  },
  {
    id: 'never-learned-it',
    visibility: 'person',
    fixedBy: 'walkThrough',
    records: {
      subscription: 'Active and paid.',
      payment: 'Nothing outstanding.',
      renewal: 'Auto-renewal on.',
      registration: 'Registered, and to them.',
    },
    person: {
      askDoing: "I draw it and I swing it. That has always been enough.",
      askActivation: "There is a step? Nobody said there was a step.",
    },
    onFix: 'You talk them through the draw. They do it. It takes.',
  },
  {
    id: 'forgot-under-stress',
    visibility: 'person',
    fixedBy: 'walkThrough',
    records: {
      subscription: 'Active and paid.',
      payment: 'Nothing outstanding.',
      renewal: 'Auto-renewal on.',
      registration: 'Registered, and to them.',
    },
    person: {
      askDoing: "I have done this a hundred times. I cannot think of it now.",
      askActivation: "I know it. I know I know it. It has gone.",
    },
    onFix: 'You say the words they already know, slowly, and let them find them again.',
  },
  {
    id: 'too-frightened',
    visibility: 'person',
    fixedBy: 'steady',
    records: {
      subscription: 'Active and paid.',
      payment: 'Nothing outstanding.',
      renewal: 'Auto-renewal on.',
      registration: 'Registered, and to them.',
    },
    person: {
      askDoing: "Sorry — sorry — what did you ask me?",
      askActivation: "I am doing it. I am doing it and it is not — sorry.",
    },
    onFix: 'You get them breathing before you get them anything else. Then it works, because it was always going to.',
  },
];

/** Everything an agent can look at. Records only. */
const RECORD_TARGETS = ['subscription', 'payment', 'renewal', 'registration'];

/** Everything an agent can ask or do with the person. */
const PERSON_TARGETS = ['askDoing', 'askActivation'];

/** Things an agent can actually DO. No diagnosis step; you act. */
const FIXES = [
  { id: 'registerProduct', label: 'Register the blade against their contract', cost: 2 },
  { id: 'walkThrough', label: 'Talk them through activating it', cost: 3 },
  { id: 'steady', label: 'Get them breathing before anything else', cost: 2 },
  { id: 'referGuild', label: 'Tell them who can put it right, and how fast', cost: 2 },
];

/** What a wrong action costs — nothing happens, and the pressure rises. */
const MISFIRE = {
  registerProduct: 'It is already registered. Nothing changes. They are still where they were.',
  walkThrough: 'They do every step correctly. Nothing lights. You have both spent time you did not have.',
  steady: 'They steady. The blade is still dark.',
  referGuild: 'You send them to the guild. The account is in perfect order and they will be told so.',
};

// ---------------------------------------------------------------------
// The call
// ---------------------------------------------------------------------

/**
 * Rolls one instance of the call.
 *
 * @param {function} [rng=Math.random]
 * @returns {{cause: object, opening: string}}
 */
function rollCall(rng = Math.random) {
  const cause = CAUSES[Math.floor(rng() * CAUSES.length)];
  return {
    cause,
    opening: "Hey, ok, so I see a bunch of zombies and this new sword's enchantment isn't activating!",
  };
}

/**
 * Looks at a record. Always answers — a record in good order is an
 * answer, and ruling things out is how an unfamiliar cause gets worked.
 *
 * @param {object} call - from rollCall()
 * @param {string} target - one of RECORD_TARGETS
 * @returns {{said: string, carriesFault: boolean}}
 */
function checkRecord(call, target) {
  if (!RECORD_TARGETS.includes(target)) throw new Error(`Unknown record: "${target}"`);
  // A record reading clean RULES SOMETHING OUT, and that is progress —
  // it is the only progress available at all when the cause is in the
  // person. "Eliminate what cannot be true; whatever is still standing
  // is your answer."
  return { said: call.cause.records[target], carriesFault: isFault(call.cause, target) };
}

/** Whether this record is the one carrying the fault. */
function isFault(cause, target) {
  const map = {
    'missed-payment': 'payment',
    'subscription-expired': 'subscription',
    'auto-renewal-off': 'renewal',
    'not-registered': 'registration',
  };
  return map[cause.id] === target;
}

/**
 * Asks the person something. On a 'record' cause these mostly return
 * colour; on a 'person' cause they are the ONLY route to the answer.
 *
 * @param {object} call
 * @param {string} target - one of PERSON_TARGETS
 * @returns {{said: string|null}}
 */
function askPerson(call, target) {
  if (!PERSON_TARGETS.includes(target)) throw new Error(`Unknown ask: "${target}"`);
  return { said: call.cause.person[target] || null };
}

/**
 * Acts. This replaces the diagnosis menu entirely — the player does not
 * name the cause, they do a thing, and the world answers.
 *
 * @param {object} call
 * @param {string} fixId
 * @returns {{worked: boolean, said: string, cost: number}}
 */
function act(call, fixId) {
  const fix = FIXES.find((f) => f.id === fixId);
  if (!fix) throw new Error(`Unknown action: "${fixId}"`);
  const worked = call.cause.fixedBy === fixId;
  return {
    worked,
    said: worked ? call.cause.onFix : MISFIRE[fixId],
    cost: fix.cost,
  };
}

module.exports = {
  CAUSES,
  RECORD_TARGETS,
  PERSON_TARGETS,
  FIXES,
  MISFIRE,
  rollCall,
  checkRecord,
  askPerson,
  act,
  isFault,
};
