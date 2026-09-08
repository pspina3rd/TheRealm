import React, { useState, useEffect } from 'react';

/**
 * CallCenterPrototype.jsx
 * ------------------------------------------------------------------
 * Playable vertical slice of the core loop. The simulation logic below
 * mirrors src/gameLogic.js exactly (same functions, same behavior,
 * verified by src/gameLogic.test.js) — duplicated here only because
 * artifacts can't import local files. If you move this into a real
 * project, delete this block and `import` gameLogic.js instead.
 * ------------------------------------------------------------------
 */

const CUSTOMER_TYPES = {
  endUser: { label: 'End User', archetypes: ['Hero', 'Villain', 'NPC', 'Sidekick', 'Henchfolk'] },
  business: { label: 'Business Account', archetypes: ['Kingdom', 'Town Council', 'Constabulary', 'Military'] },
  partner: { label: 'Partner Vendor', archetypes: ['Tavern', 'Inn', 'Blacksmith', 'Potion Shop', 'Wandering Trader'] },
};

/**
 * Lookups any category can make, because they are TLC's own paperwork.
 *
 * Factored out because four categories were about to repeat them. A
 * template names the ones its calls can reach; the rest simply are not
 * on that menu.
 *
 * `defaultOutcome` is what a lookup says when this particular call has
 * nothing interesting there — which is most lookups on most calls, and
 * is why the ones that DO carry something are worth finding.
 */
const RECORD_LOOKUPS = {
  manifest: { label: 'Check what we shipped', timeCost: 1, defaultOutcome: 'Shipped as booked. Nothing irregular.' },
  courierRecord: { label: "Check the Courier's delivery report", timeCost: 1, defaultOutcome: 'Handed over and signed for, on time.' },
  nodeReceipt: { label: 'Check whether the Node posted receipt', timeCost: 1, defaultOutcome: 'Receipt posted the same day, in order.' },
  drawRecord: { label: 'Check for a Caravan draw against the lot', timeCost: 2, defaultOutcome: 'No draw against this lot.' },
  holdRegister: { label: 'Check the hold register', timeCost: 1, defaultOutcome: 'No hold on record.' },
  routeBooking: { label: 'Check the route and tier it was booked at', timeCost: 1, defaultOutcome: 'Booked as a single direct hop.' },
  legStatus: { label: 'Check where each leg has got to', timeCost: 2, defaultOutcome: 'All legs complete.' },
  accountRecord: { label: "Check the account's own record", timeCost: 1, defaultOutcome: 'Account in order. Nothing flagged.' },
  chargeLedger: { label: 'Check what was charged, and when', timeCost: 2, defaultOutcome: 'One charge, at the booked rate.' },
  bookingRegister: { label: 'Search the booking register', timeCost: 1, defaultOutcome: 'The booking is there, as described.' },
  priorCase: { label: 'Pull the earlier case and its note', timeCost: 2, defaultOutcome: 'A note from a previous call, briefly written.' },
  workOrder: { label: 'Check the work order and who attended', timeCost: 2, defaultOutcome: 'Attended and closed out.' },
};

/** Questions a caller can answer from where they are standing. */
const ASK_LOOKUPS = {
  // WRITTEN variants, not a noun slotted into a template.
  //
  // Rule for all of them: **no question may imply the customer is wrong,
  // careless, or at fault.** "What were you expecting?" reads as "well,
  // what did you expect?" and would get somebody pulled off the phones.
  // Ask about the ORDER, not about their expectations.
  //
  // And `firm` means efficient, not curt. A brisk agent is still a
  // polite one; "I'll need a name before we go further" is a doorman,
  // not a support agent.
  askName: {
    label: "Ask who you're speaking with", timeCost: 1,
    spoken: {
      soft: "Sorry — may I take your name?",
      plain: "Who am I speaking with?",
      firm: "Can I start with your name?",
    },
    defaultOutcome: "It's on the account — I'm the one who deals with you.",
  },
  askWhoTakesIn: {
    label: 'Ask who normally takes deliveries in', timeCost: 1,
    spoken: {
      soft: "Do you happen to know who usually takes your deliveries in?",
      plain: "Who normally takes your deliveries in?",
      firm: "Who signs for your deliveries?",
    },
    defaultOutcome: "Whoever's about. It varies.",
  },
  askAnyoneElse: {
    label: 'Ask whether anyone else has been in touch', timeCost: 1,
    spoken: {
      soft: "Has anyone else from your end been in touch with us about it, do you know?",
      plain: "Has anyone else been in touch with us about it?",
      firm: "Has this been raised with us before?",
    },
    defaultOutcome: 'No. Just me.',
  },
  askWhenNoticed: {
    label: 'Ask when they first noticed', timeCost: 1,
    spoken: {
      soft: "When did you first notice, if you don't mind me asking?",
      plain: "When did you first notice?",
      firm: "When did this start?",
    },
    defaultOutcome: "Few days back. Couldn't tell you exactly.",
  },
  askWhoTheySpokeTo: {
    label: 'Ask who they spoke to last time', timeCost: 1,
    spoken: {
      soft: "Do you remember who you spoke to last time at all?",
      plain: "Who did you speak to last time?",
      firm: "Do you have a name from the last call?",
    },
    defaultOutcome: "Didn't catch the name, I'm afraid.",
  },
};

/**
 * Builds a category template from named lookups plus its own supportive
 * and wrap-up work.
 *
 * Keeps the three kinds honest: investigative comes from the shared
 * pools, while doing something for somebody and telling them what
 * happens next are specific to the kind of problem it is.
 */
function makeTemplate({ category, domain, openingStatement, records, asks, supportive, wrapup, diagnoses, rootCauses }) {
  const build = (ids, pool, kind, source) => ids.map((id) => ({
    id, kind, source, ...pool[id],
  }));
  return {
    category,
    domain,
    openingStatement,
    actions: [
      ...build(records, RECORD_LOOKUPS, 'investigative', 'records'),
      ...build(asks, ASK_LOOKUPS, 'investigative', 'ask'),
      ...supportive.map((a) => ({ ...a, kind: 'supportive', source: 'records' })),
      ...wrapup.map((a) => ({ ...a, kind: 'wrapup', source: 'records' })),
    ],
    diagnoses,
    rootCauses,
  };
}

const PHANTOM_INVENTORY_TEMPLATE = {
  category: 'Phantom Inventory',
  domain: 'Quantity',
  openingStatement: "I ordered forty healing potions for the festival. Three on the shelf. I need to know where the rest of them are.",

  /**
   * Two kinds of action, and the split is load-bearing.
   *
   * `source: 'records'` — the network's own reporting. Nodes report
   * receipt and Couriers report delivery, because their partnership
   * agreements require it, so TLC knows what shipped, where it went,
   * who took it, and whether receipt was acknowledged. Reliable, and
   * limited to what the agreement covers. A MISSING report is itself
   * information.
   *
   * `source: 'ask'` — only the customer can find this out. The agent
   * asks; somebody at the other end has to go and look. Slower, costs
   * far more of their patience, and the answer is only as good as their
   * own bookkeeping. Everything downstream of the Node's receipt is
   * inside somebody else's operation. **An agent cannot walk a
   * customer's stockroom.**
   *
   * See LORE.md, "What TLC can actually see."
   */
  actions: [
    // INVESTIGATIVE — establishing the reason for contact
    { id: 'manifest', kind: 'investigative', source: 'records', label: 'Check what we shipped', timeCost: 1 , defaultOutcome: 'Shipped as booked. Nothing irregular.' },
    { id: 'courierRecord', kind: 'investigative', source: 'records', label: "Check the Courier's delivery report", timeCost: 1 , defaultOutcome: 'Handed over and signed for, on time.' },
    { id: 'nodeReceipt', kind: 'investigative', source: 'records', label: 'Check whether the Node posted receipt', timeCost: 1 , defaultOutcome: 'Receipt posted the same day, in order.' },
    { id: 'drawRecord', kind: 'investigative', source: 'records', label: 'Check for a Caravan draw against the lot', timeCost: 2 , defaultOutcome: 'No draw against this lot.' },
    { id: 'holdRegister', kind: 'investigative', source: 'records', label: 'Check the hold register', timeCost: 1 , defaultOutcome: 'No hold on record.' },
    // Questions a caller can answer FROM WHERE THEY ARE STANDING.
    //
    // Not tasks. "Go and count your shelf" and "go and audit your sales
    // ledger" were both here and both had to go: they dispatch the
    // customer to do TLC's investigating, inside a business we cannot
    // see, about records that are not ours. An agent asks what somebody
    // knows. An agent does not set them homework.
    ...['askName', 'askWhoTakesIn', 'askAnyoneElse'].map((id) => ({
      id, kind: 'investigative', source: 'ask', ...ASK_LOOKUPS[id],
    })),

    // SUPPORTIVE — actually doing something for them. Not finding out;
    // acting. Every one of these is available on every call, and most of
    // them are the wrong thing to do on any given call.
    { id: 'postReceipt', kind: 'supportive', source: 'records', label: 'Post the missing receipt to the Node yourself', timeCost: 1 , defaultOutcome: 'There is no missing receipt to post. It goes nowhere.' },
    { id: 'raiseClaim', kind: 'supportive', source: 'records', label: 'Raise a claim for the missing units', timeCost: 2 , defaultOutcome: 'You raise a claim. Nothing is actually missing, so it will be closed by somebody else in a week.' },
    { id: 'requestRedraw', kind: 'supportive', source: 'records', label: 'Request a recall on the misdirected lot', timeCost: 2 , defaultOutcome: 'Nothing was misdirected. There is no lot to recall.' },
    { id: 'correctListing', kind: 'supportive', source: 'records', label: 'Correct the classification on their listing', timeCost: 1 , defaultOutcome: 'Their listing matches what we shipped. There is nothing to correct.' },
    { id: 'holdReference', kind: 'supportive', source: 'records', label: 'Pull the hold reference so they can chase it', timeCost: 1 , defaultOutcome: 'There is no hold, so there is no reference to give them.' },

    // WRAP-UP — next steps. What happens now, what they are waiting on,
    // what they have to do themselves. This is where Education lives.
    { id: 'setExpectation', kind: 'wrapup', source: 'records', label: 'Tell them when to expect it', timeCost: 1 , defaultOutcome: 'You give them a timeframe. You are guessing, and it will be wrong.' },
    { id: 'nameTheirAction', kind: 'wrapup', source: 'records', label: 'Tell them what they need to do at their end', timeCost: 1 , defaultOutcome: 'You tell them what to do at their end. It is not what this needed.' },
    { id: 'explainCause', kind: 'wrapup', source: 'records', label: 'Explain, in plain terms, how this happened', timeCost: 2 , defaultOutcome: 'You explain what you believe happened. It does not match what happened.' },
  ],

  diagnoses: [
    { id: 'unloggedSale', label: 'Your own sale went out without being entered' },
    { id: 'splitLot', label: 'A duplicated stamp split the lot — a Caravan draw took the rest' },
    { id: 'shelvedNotEntered', label: 'It was received and shelved, but never entered in your records' },
    { id: 'secondLeg', label: "Nothing is missing yet — the second leg hasn't landed" },
    { id: 'misfiled', label: "They're on your shelf, shelved under the wrong classification" },
    { id: 'underHold', label: "They're here and sealed — a hold was placed on them" },
    { id: 'notOurs', label: 'That stock never shipped at all — it came in over your counter' },
    { id: 'ourSideClean', label: "Everything on our side checks out — here is the delivery detail" },
    { id: 'theft', label: 'Someone with stockroom access has taken them' },
    { id: 'lostTransit', label: 'The shipment was lost in transit' },
  ],

  rootCauses: [
    {
      // NOT DISCOVERABLE BY TLC. Shipped, delivered, signed, receipt
      // posted -- our part is clean and the rest is inside a business we
      // cannot see. The correct call is to say so and hand over the
      // detail. The unlogged sale is never named, because finding it
      // would mean rummaging in their books.
      id: 'unlogged-sale',
      weight: 3,
      discoverable: false,
      trueCategory: 'Phantom Inventory',
      trueDomain: 'Quantity',
      diagnosisId: 'ourSideClean',
      keyActionIds: ['courierRecord', 'nodeReceipt'],
      aptSupport: ['setExpectation'],
      clues: {
        setExpectation: 'You give them the delivery date, the signature and the receipt reference.',
      },
    },
    {
      // Discoverable end to end from our own records.
      id: 'split-lot',
      weight: 2,
      discoverable: true,
      trueCategory: 'Phantom Inventory',
      trueDomain: 'Quantity',
      diagnosisId: 'splitLot',
      keyActionIds: ['courierRecord', 'drawRecord'],
      aptSupport: ['requestRedraw', 'setExpectation', 'explainCause'],
      clues: {
        manifest: 'One lot of 40 — and the courier stamp is on it twice.',
        courierRecord: 'Only four were handed over. Not forty.',
        drawRecord: 'A Caravan draw moved 36 to the Constabulary that same morning.',
        requestRedraw: 'Recall raised against the Constabulary draw. Days, not hours.',
        setExpectation: 'You tell them the recall takes days and that we will come to them.',
        explainCause: 'You explain the double stamp plainly. They are furious at the stamp, not at you.',
      },
    },
    {
      // NOT DISCOVERABLE. Received and shelved by different hands and
      // entered by nobody -- all of it downstream of the Node receipt.
      id: 'shelved-not-entered',
      weight: 3,
      discoverable: false,
      trueCategory: 'Phantom Inventory',
      trueDomain: 'Quantity',
      diagnosisId: 'ourSideClean',
      keyActionIds: ['courierRecord', 'nodeReceipt'],
      redHerringActionId: 'courierRecord',
      aptSupport: ['setExpectation'],
      clues: {
        courierRecord: 'Signed for. The signature is a mark, not a name.',
        askWhoTakesIn: 'Whoever is free. A casual hand took it in that week.',
        setExpectation: 'You give them the date, the mark that was signed, and the receipt.',
      },
    },
    {
      id: 'second-leg-in-transit',
      weight: 2,
      discoverable: true,
      trueCategory: 'Bulk Potion Order Delay',
      trueDomain: 'Fulfillment',
      diagnosisId: 'secondLeg',
      keyActionIds: ['manifest'],
      aptSupport: ['setExpectation'],
      clues: {
        manifest: 'Booked as a two-leg Priority Relay. This is leg one of two.',
        courierRecord: 'Leg one handed over. Leg two is not due until tomorrow.',
        nodeReceipt: 'Receipt posted for leg one. Leg two still outstanding.',
        setExpectation: 'You tell them leg two lands tomorrow. Nothing else is required of anyone.',
      },
    },
    {
      // Only comes out if the agent SHARES what shipped. The customer
      // supplies the rest -- we could never have found it.
      id: 'misfiled-at-intake',
      weight: 2,
      discoverable: false,
      trueCategory: 'Storefront Listing Error',
      trueDomain: 'Accounts',
      diagnosisId: 'misfiled',
      keyActionIds: ['manifest'],
      aptSupport: ['correctListing', 'explainCause'],
      clues: {
        manifest: 'All 40 shipped, as Small.',
        courierRecord: 'Signed for by J. Marrow, the 11th.',
        askWhoTakesIn: 'Whoever is free that afternoon puts it away.',
        correctListing: 'You reclassify the lot from Large to Small. Their listing finds forty at once.',
        explainCause: 'You mention the two sizes ship under separate labels. There is a pause at their end.',
      },
    },
    {
      id: 'constabulary-hold',
      weight: 1,
      discoverable: true,
      trueCategory: 'Goods Under Hold',
      trueDomain: 'Fulfillment',
      diagnosisId: 'underHold',
      keyActionIds: ['holdRegister'],
      aptSupport: ['holdReference', 'setExpectation'],
      clues: {
        holdRegister: 'A Constabulary hold was placed on the lot the day it landed.',
        nodeReceipt: 'Receipt posted, with the hold noted against it.',
        holdReference: 'You pull the hold reference. It is the Constabulary they need now, not us.',
        setExpectation: 'You are honest that we cannot say how long a hold runs. They do not enjoy hearing it.',
      },
    },
    {
      // TLC is a monopoly, so there is no rival carrier -- this simply
      // never moved through the network. Our records show nothing
      // because there was nothing to record.
      id: 'counter-bought',
      weight: 2,
      discoverable: true,
      trueCategory: 'Counter-Bought Stock',
      trueDomain: 'Accounts',
      diagnosisId: 'notOurs',
      keyActionIds: ['manifest'],
      aptSupport: ['explainCause'],
      clues: {
        manifest: 'No shipment of that size to this account. Nothing to ship means nothing to find.',
        courierRecord: 'No delivery report. Nothing ever moved.',
        nodeReceipt: 'No receipt. There was nothing for the Node to receive.',
        explainCause: 'You explain that nothing shipped because nothing was sent. It takes a moment to land.',
      },
    },
  ],
};

/**
 * What asking the customer to go and do your legwork costs you.
 *
 * "Go and count your shelves" is not a neutral request. It puts the
 * work back on them, and it carries an unspoken accusation: *I think
 * you have miscounted, and I have not looked myself.* Done at the wrong
 * moment it is simply bad service.
 *
 * **The moment is what decides it.** An ask lands very differently
 * depending on whether the agent has visibly done their own homework
 * first:
 *
 *   "Everything on our side checks out — the manifest, the Courier's
 *    report, the Node's receipt. Can I ask you to do one thing for me?"
 *
 * versus opening the call with "go and count your shelf." Same action,
 * same information, completely different call.
 *
 * So an ask made before ANY record has been checked is **unearned**, and
 * costs the relationship. An ask made after is ordinary collaboration.
 * Every ask costs some Experience regardless — it is their time and
 * their trouble either way.
 *
 * Empathy would soften an unearned ask, but Empathy is an earned skill
 * and is not built (see LORE.md, "Education & Empathy"). A new agent
 * genuinely does not know how to make this land.
 *
 * @param {object} ticket - carrying `investigation`
 * @param {string[]} investigatedActionIds - IN THE ORDER TAKEN
 * @returns {{ you: number, experience: number, unearnedAsks: number }}
 *   raw deltas, before Sensitivity and Social Filter
 */
function askRelationshipCost(ticket, investigatedActionIds) {
  const investigation = ticket && ticket.investigation;
  if (!investigation) return { you: 0, experience: 0, unearnedAsks: 0 };

  const byId = new Map(investigation.actions.map((a) => [a.id, a]));
  let seenRecord = false;
  let you = 0;
  let experience = 0;
  let unearnedAsks = 0;

  for (const id of investigatedActionIds) {
    const action = byId.get(id);
    if (!action) continue;
    if (action.source === 'records') {
      seenRecord = true;
      continue;
    }
    // Their time and trouble, always.
    experience -= action.timeCost;
    if (!seenRecord) {
      // Asked before we looked. That is the one that stings.
      unearnedAsks += 1;
      you -= action.timeCost * 2;
      experience -= action.timeCost;
    }
  }
  return { you, experience, unearnedAsks };
}

/**
 * Picks which root cause this instance of the ticket actually has.
 * @param {object} template
 * @param {function} [rng=Math.random]
 */
/**
 * What an agent can always do, on any call, whatever it is about.
 *
 * You can always look up the account. You can always ask who you are
 * speaking to. A category with nothing written for it yet still has to
 * be workable — otherwise the player greets somebody, asks one
 * question, and finds the entire menu empty, which is what happened
 * before this existed.
 *
 * These lookups return their ordinary outcome, because on a call with
 * nothing special going on that is the truth: you looked, and there was
 * nothing there.
 */
const BASELINE_TEMPLATE = makeTemplate({
  category: 'General',
  domain: 'Service',
  openingStatement: '',
  records: ['accountRecord', 'bookingRegister', 'courierRecord'],
  asks: ['askName', 'askWhenNoticed'],
  supportive: [
    { id: 'raiseForReview', label: 'Raise it for somebody to look at properly', timeCost: 2, defaultOutcome: 'Raised. Somebody will pick it up.' },
    { id: 'noteAccount', label: 'Note it against the account', timeCost: 1, defaultOutcome: 'Noted, so the next person sees it.' },
  ],
  wrapup: [
    { id: 'setExpectation', label: 'Tell them what happens now', timeCost: 1, defaultOutcome: 'You tell them what to expect next.' },
    { id: 'explainProcess', label: 'Walk them through how this works', timeCost: 2, defaultOutcome: 'You explain the process. They had not been told.' },
  ],
  diagnoses: [
    { id: 'asDescribed', label: 'It is as they describe, and it is ours' },
    { id: 'needsReview', label: 'This wants somebody with more of the picture' },
    { id: 'notOurs', label: 'Nothing here is ours to act on' },
  ],
  rootCauses: [
    {
      id: 'as-described',
      weight: 1, discoverable: true,
      trueCategory: 'General', trueDomain: 'Service',
      diagnosisId: 'asDescribed',
      keyActionIds: ['accountRecord'],
      aptSupport: ['noteAccount', 'setExpectation'],
      clues: {},
    },
  ],
});
function rollRootCause(template, rng = Math.random) {
  return weightedPick(template.rootCauses, rng);
}

/**
 * Composes the investigation a specific ticket instance carries: the
 * template's shared actions and diagnoses, wearing this root cause's
 * evidence.
 *
 * @param {object} template
 * @param {object} rootCause
 * @returns {object} investigation data for one ticket
 */
function buildInvestigation(template, rootCause) {
  return {
    openingStatement: template.openingStatement,
    rootCauseId: rootCause.id,
    trueCategory: rootCause.trueCategory,
    trueDomain: rootCause.trueDomain,
    keyActionIds: [...rootCause.keyActionIds],
    correctDiagnosisId: rootCause.diagnosisId,
    redHerringActionId: rootCause.redHerringActionId,
    aptSupport: [...(rootCause.aptSupport || [])],
    actions: template.actions.map((a) => ({
      ...a,
      // A cause supplies text for what it is apt for; everything else
      // falls back to the action's own "that didn't help" outcome.
      clue: rootCause.clues[a.id] || a.defaultOutcome,
      apt: (rootCause.aptSupport || []).includes(a.id),
    })),
    diagnoses: template.diagnoses.map((d) => ({ ...d, correct: d.id === rootCause.diagnosisId })),
  };
}

/**
 * Ticket templates per customer tier. `weight` is relative selection
 * likelihood within that tier (not normalized — see weightedPick).
 */
/**
 * The nine problem domains a contact centre actually handles. This is
 * the real-world taxonomy, and it is the organising layer above
 * categories — see LORE.md, "Ticket Content."
 *
 * Domains cut ACROSS customer tiers. Anyone can have a Billing problem;
 * bucketing categories by tier was arbitrary.
 *
 * Structure, largest to smallest:
 *   domain (9, fixed)  →  category (a term of art)  →  root cause
 * with perspective and Baggage shaping how any of it gets told.
 */
const DOMAINS = [
  'Orders',      // placing, changing, cancelling
  'Fulfillment', // getting it there
  'Quality',     // it arrived wrong or broken
  'Quantity',    // the count disagrees
  'Returns',     // sending it back
  'Repairs',     // making it work again
  'Service',     // the relationship and the doing of the thing
  'Accounts',    // who they are and what is on record
  'Billing',     // money
];

/**
 * SHIPMENT TRACE — Fulfillment. The commonest call there is.
 *
 * Nothing here is mysterious: our records say where it is. **The whole
 * skill is what you say next** — being straight about a leg that has not
 * landed, and not promising a day you cannot hold. Contrast Phantom
 * Inventory, where clean records mean it is not ours and the cause is
 * unfindable; here clean records mean you have your answer immediately
 * and the call is about delivering it.
 */
const SHIPMENT_TRACE_TEMPLATE = makeTemplate({
  category: 'Shipment Trace',
  domain: 'Fulfillment',
  openingStatement: "I sent something out four days ago and I've heard nothing since. Where is it?",
  records: ['routeBooking', 'legStatus', 'courierRecord', 'nodeReceipt', 'holdRegister'],
  asks: ['askAnyoneElse'],
  supportive: [
    { id: 'chaseLeg', label: 'Chase the outstanding leg', timeCost: 2, defaultOutcome: 'Nothing outstanding to chase.' },
    { id: 'flagPriority', label: 'Flag it for the next available Courier', timeCost: 1, defaultOutcome: 'It is already moving. Flagging changes nothing.' },
  ],
  wrapup: [
    { id: 'giveWindow', label: 'Give them an honest window', timeCost: 1, defaultOutcome: 'You give a window. You are guessing, and it will be wrong.' },
    { id: 'sayUnknown', label: 'Tell them plainly that we cannot say yet', timeCost: 1, defaultOutcome: 'You say you cannot tell them, when in fact you can.' },
    { id: 'explainRoute', label: 'Walk them through the route it takes', timeCost: 2, defaultOutcome: 'You describe a route. It is not the one this took.' },
  ],
  diagnoses: [
    { id: 'inTransitOnTime', label: 'It is moving and it is not late yet' },
    { id: 'legOutstanding', label: 'One leg has not been picked up — that is the delay' },
    { id: 'alreadyDelivered', label: 'It arrived already, and was signed for' },
    { id: 'heldByAuthority', label: 'It is sitting under a hold' },
    { id: 'lostTransit', label: 'It has been lost in transit' },
  ],
  rootCauses: [
    {
      // The commonest outcome of the commonest call: nothing is wrong.
      id: 'moving-normally',
      weight: 4, discoverable: true,
      trueCategory: 'Shipment Trace', trueDomain: 'Fulfillment',
      diagnosisId: 'inTransitOnTime',
      keyActionIds: ['legStatus'],
      aptSupport: ['giveWindow', 'explainRoute'],
      clues: {
        legStatus: 'Leg one complete, leg two picked up this morning. It is moving.',
        routeBooking: 'Two-leg Priority Relay. Four days is inside the window.',
        giveWindow: 'You give them the real window and the reason for it. They settle.',
        explainRoute: 'You walk them through both legs. They had assumed it was one hop.',
      },
    },
    {
      id: 'leg-not-collected',
      weight: 3, discoverable: true,
      trueCategory: 'Shipment Trace', trueDomain: 'Fulfillment',
      diagnosisId: 'legOutstanding',
      keyActionIds: ['legStatus'],
      aptSupport: ['chaseLeg', 'giveWindow'],
      clues: {
        legStatus: 'Leg one complete. Leg two has been sitting unclaimed for two days.',
        courierRecord: 'No Courier has picked up the second leg.',
        chaseLeg: 'You chase it. Somebody will collect it tomorrow, probably.',
        giveWindow: 'You tell them tomorrow, and that you have chased it yourself.',
      },
    },
    {
      // It is already there. They are asking us where something is that
      // is sitting in their own building.
      id: 'already-arrived',
      weight: 2, discoverable: true,
      trueCategory: 'Shipment Trace', trueDomain: 'Fulfillment',
      diagnosisId: 'alreadyDelivered',
      keyActionIds: ['courierRecord', 'nodeReceipt'],
      redHerringActionId: 'routeBooking',
      clues: {
        routeBooking: 'Booked as a three-leg Relay — a long route, easy to assume it is still going.',
        courierRecord: 'Delivered and signed for, two days ago.',
        nodeReceipt: 'Receipt posted. It is there.',
        askWhoTakesIn: 'Whoever is about. They sound less certain now.',
        giveWindow: 'You tell them it is already with them, and when it arrived.',
      },
    },
    {
      id: 'under-hold',
      weight: 1, discoverable: true,
      trueCategory: 'Goods Under Hold', trueDomain: 'Fulfillment',
      diagnosisId: 'heldByAuthority',
      keyActionIds: ['holdRegister'],
      aptSupport: ['sayUnknown'],
      clues: {
        holdRegister: 'A hold was placed on it in transit. No release date given.',
        legStatus: 'Leg two shows as halted, not delayed.',
        sayUnknown: 'You are honest that we do not know how long. They would rather have heard anything else.',
      },
    },
  ],
});

/**
 * REPEAT FAILURE — Repairs. The one that leans on coworkers.
 *
 * It was fixed. It broke again. **Somebody handled that first call**,
 * and the note they left is as good as they were — which may not be very
 * good. This is where "other agents work at varying quality" stops being
 * a stated fact and becomes something the player reads.
 */
const REPEAT_FAILURE_TEMPLATE = makeTemplate({
  category: 'Repeat Failure',
  domain: 'Repairs',
  openingStatement: "Somebody was out to fix this a fortnight ago. It has gone again, exactly the same.",
  records: ['priorCase', 'workOrder', 'accountRecord'],
  asks: ['askWhenNoticed', 'askWhoTheySpokeTo'],
  supportive: [
    { id: 'raiseRepeat', label: 'Raise it as a repeat, not a new fault', timeCost: 2, defaultOutcome: 'Raised as a repeat. It is not one.' },
    { id: 'sendSameHand', label: 'Ask for whoever attended last time', timeCost: 1, defaultOutcome: 'No use — a different fault wants different hands.' },
  ],
  wrapup: [
    { id: 'ownIt', label: 'Say plainly that we did not fix it the first time', timeCost: 1, defaultOutcome: 'You take the blame for something that was not ours.' },
    { id: 'setRepairWindow', label: 'Tell them when somebody will be out', timeCost: 1, defaultOutcome: 'You give a date. Nobody has been assigned to hold it.' },
  ],
  diagnoses: [
    { id: 'neverFixed', label: 'It was never actually fixed — the first visit closed early' },
    { id: 'differentFault', label: 'This is a second, separate fault' },
    { id: 'wrongDiagnosisFirst', label: 'The first call diagnosed it wrongly' },
    { id: 'wearNotFault', label: 'Nothing has failed — it is due for its scheduled work' },
  ],
  rootCauses: [
    {
      // A coworker closed it thin. The note says almost nothing, and
      // the almost-nothing IS the finding.
      id: 'closed-early',
      weight: 3, discoverable: true,
      trueCategory: 'Repeat Failure', trueDomain: 'Repairs',
      diagnosisId: 'neverFixed',
      keyActionIds: ['priorCase', 'workOrder'],
      aptSupport: ['raiseRepeat', 'ownIt'],
      clues: {
        priorCase: 'Thistle took it. The note reads, in full: "Attended. Resolved."',
        workOrder: 'Attended for under an hour. Closed the same visit, no parts drawn.',
        askWhoTheySpokeTo: 'A woman, they think. Brisk. Did not stay long.',
        raiseRepeat: 'Raised as a repeat. That routes it to somebody senior.',
        ownIt: 'You say plainly it was not fixed the first time. They are not angry — they are relieved.',
      },
    },
    {
      // Not a repeat at all, whatever they believe. Saying so is the job.
      id: 'second-fault',
      weight: 2, discoverable: true,
      trueCategory: 'Ward Failure', trueDomain: 'Repairs',
      diagnosisId: 'differentFault',
      keyActionIds: ['priorCase', 'workOrder'],
      redHerringActionId: 'accountRecord',
      clues: {
        priorCase: 'Pell took it. Thorough note: the coupling, replaced, tested twice.',
        workOrder: 'Different component entirely from the one failing now.',
        accountRecord: 'Third call this season. It reads worse than it is.',
        askWhenNoticed: 'This started yesterday. The last one had been going for weeks.',
        setRepairWindow: 'You book it as new work and tell them when.',
      },
    },
    {
      // The first agent got it wrong. Their note is confident and wrong,
      // which is worse than a thin one.
      id: 'misdiagnosed-first',
      weight: 2, discoverable: true,
      trueCategory: 'Repeat Failure', trueDomain: 'Repairs',
      diagnosisId: 'wrongDiagnosisFirst',
      keyActionIds: ['priorCase'],
      aptSupport: ['raiseRepeat', 'ownIt'],
      clues: {
        priorCase: 'Bram took it, and wrote it up at length — cause, reasoning, the lot. Read against what they are describing now, the cause he settled on does not fit the symptom, and never did.',
        workOrder: 'The work done follows his note exactly. It was never going to help.',
        askWhenNoticed: 'It came back within days, they say. They did not want to make a fuss.',
        ownIt: 'You tell them the first read was wrong. It costs nothing to say and they have been waiting to hear it.',
      },
    },
    {
      // Nothing failed. It is simply due, and nobody told them.
      id: 'scheduled-work-due',
      weight: 1, discoverable: true,
      trueCategory: 'Process Question', trueDomain: 'Service',
      diagnosisId: 'wearNotFault',
      keyActionIds: ['accountRecord'],
      clues: {
        priorCase: 'Cassidy took it. Brief, but she wrote down that it was routine, and that it was routine is the whole point.',
        accountRecord: 'Its scheduled work fell due last week. Nobody has booked it.',
        workOrder: 'The earlier visit was routine, not a fault.',
        setRepairWindow: 'You book the scheduled work and tell them what it is for.',
      },
    },
  ],
});

/**
 * NO BOOKING ON RECORD — Orders. Pure divergence.
 *
 * They are certain they booked it. We have nothing. **Neither side is
 * lying** — and the first domain with no category at all until now.
 */
const NO_BOOKING_TEMPLATE = makeTemplate({
  category: 'No Booking On Record',
  domain: 'Orders',
  openingStatement: "I booked a shipment a week ago and nothing has moved. I stood at the counter and did it myself.",
  records: ['bookingRegister', 'accountRecord', 'chargeLedger'],
  asks: ['askWhenNoticed', 'askWhoTheySpokeTo'],
  supportive: [
    { id: 'bookItNow', label: 'Book it now, at the quoted rate', timeCost: 2, defaultOutcome: 'Booking it again would duplicate one that exists.' },
    { id: 'traceAcrossAccounts', label: 'Search the neighbouring accounts', timeCost: 2, defaultOutcome: 'Nothing under any related account.' },
  ],
  wrapup: [
    { id: 'confirmBooked', label: 'Confirm it is booked and read back the details', timeCost: 1, defaultOutcome: 'You confirm a booking that does not exist.' },
    { id: 'explainNoRecord', label: 'Explain what we can see and what we cannot', timeCost: 2, defaultOutcome: 'You explain an absence that is not there.' },
  ],
  diagnoses: [
    { id: 'neverCompleted', label: 'The booking was started and never completed' },
    { id: 'underOtherAccount', label: 'It is booked — under a different account' },
    { id: 'bookedElsewhere', label: 'It was arranged privately, not through us' },
    { id: 'ourLoss', label: 'We took it and lost it' },
  ],
  rootCauses: [
    {
      id: 'started-not-finished',
      weight: 3, discoverable: true,
      trueCategory: 'No Booking On Record', trueDomain: 'Orders',
      diagnosisId: 'neverCompleted',
      keyActionIds: ['bookingRegister'],
      aptSupport: ['bookItNow', 'confirmBooked'],
      clues: {
        bookingRegister: 'A draft, opened last week and never confirmed. No charge against it.',
        chargeLedger: 'Nothing charged. Nothing was ever committed.',
        askWhoTheySpokeTo: 'Nobody. They did it themselves, at the counter.',
        bookItNow: 'You book it properly, at the rate they were quoted.',
        confirmBooked: 'You read it back to them: route, tier, day. They are satisfied.',
      },
    },
    {
      // It exists. It is filed under the guild, not the person.
      id: 'other-account',
      weight: 3, discoverable: true,
      trueCategory: 'Record Discrepancy', trueDomain: 'Accounts',
      diagnosisId: 'underOtherAccount',
      keyActionIds: ['traceAcrossAccounts'],
      redHerringActionId: 'bookingRegister',
      clues: {
        bookingRegister: 'Nothing under this account. Nothing at all.',
        accountRecord: 'One of three accounts sharing a name — the others are guild-held.',
        traceAcrossAccounts: 'There it is, booked against the guild account, not theirs.',
        explainNoRecord: 'You explain which account it sits under, and why we could not see it at first.',
      },
    },
    {
      // TLC is a monopoly, so nobody else shipped it -- but people do
      // arrange things privately, hand to hand, and then ring us.
      id: 'arranged-privately',
      weight: 2, discoverable: true,
      trueCategory: 'Counter-Bought Stock', trueDomain: 'Accounts',
      diagnosisId: 'bookedElsewhere',
      keyActionIds: ['bookingRegister', 'chargeLedger'],
      clues: {
        bookingRegister: 'Nothing, and no draft either.',
        chargeLedger: 'No charge, this season or last.',
        askWhoTheySpokeTo: 'A man at the market who said he could get it moved.',
        explainNoRecord: 'You explain that nothing came through us, gently. It is not the news they wanted.',
      },
    },
    {
      // Sometimes it IS us. Saying so is the whole call.
      id: 'ours-and-lost',
      weight: 1, discoverable: true,
      trueCategory: 'No Booking On Record', trueDomain: 'Orders',
      diagnosisId: 'ourLoss',
      keyActionIds: ['chargeLedger'],
      aptSupport: ['bookItNow', 'explainNoRecord'],
      clues: {
        bookingRegister: 'Nothing on record.',
        chargeLedger: 'Charged a week ago, at the full rate. The charge is ours; the booking is not there.',
        bookItNow: 'You book it yourself and note the original charge against it.',
        explainNoRecord: 'You tell them we took the money and lost the booking. They take it better than expected.',
      },
    },
  ],
});

/**
 * DUPLICATE CHARGE — Billing. Records-heavy with a boundary.
 *
 * Often ours and sometimes not: a Node applies charges at intake, and
 * a caller cannot tell one line from another.
 */
const DUPLICATE_CHARGE_TEMPLATE = makeTemplate({
  category: 'Duplicate Charge',
  domain: 'Billing',
  openingStatement: "I've been charged twice for the same shipment. Same amount, same week. I want one of them back.",
  records: ['chargeLedger', 'bookingRegister', 'routeBooking', 'accountRecord'],
  asks: ['askWhenNoticed'],
  supportive: [
    { id: 'reverseCharge', label: 'Reverse the duplicate', timeCost: 2, defaultOutcome: 'There is no duplicate of ours to reverse.' },
    { id: 'itemiseCharges', label: 'Itemise every charge on the account', timeCost: 2, defaultOutcome: 'Itemised. It reads exactly as it did.' },
  ],
  wrapup: [
    { id: 'confirmReversal', label: 'Tell them what is coming back and when', timeCost: 1, defaultOutcome: 'You promise a reversal that is not happening.' },
    { id: 'pointToNode', label: 'Show them which charge is not ours to reverse', timeCost: 1, defaultOutcome: 'You point elsewhere. It was ours.' },
  ],
  diagnoses: [
    { id: 'genuineDuplicate', label: 'Two charges, one shipment — ours to put right' },
    { id: 'nodeIntakeCharge', label: 'One is ours; the other was applied at your Node' },
    { id: 'twoShipments', label: 'Two charges because there were two shipments' },
    { id: 'legBilledSeparately', label: 'A multi-leg route bills each leg' },
  ],
  rootCauses: [
    {
      id: 'genuine-duplicate',
      weight: 3, discoverable: true,
      trueCategory: 'Duplicate Charge', trueDomain: 'Billing',
      diagnosisId: 'genuineDuplicate',
      keyActionIds: ['chargeLedger'],
      aptSupport: ['reverseCharge', 'confirmReversal'],
      clues: {
        chargeLedger: 'Two charges, same amount, same day, one booking reference.',
        bookingRegister: 'One booking. Only ever one.',
        reverseCharge: 'Reversed. It will show against them within the week.',
        confirmReversal: 'You tell them the amount and the week. Nothing else is needed.',
      },
    },
    {
      // Not ours. The Node applied it at intake, and the caller cannot
      // tell one line from another because they both say TLC.
      id: 'node-applied',
      weight: 3, discoverable: true,
      trueCategory: 'Upcharge Dispute', trueDomain: 'Billing',
      diagnosisId: 'nodeIntakeCharge',
      keyActionIds: ['chargeLedger', 'accountRecord'],
      redHerringActionId: 'bookingRegister',
      clues: {
        chargeLedger: 'Two lines. Ours is the booking rate. The other was raised at the Node, at intake.',
        bookingRegister: 'One booking, which makes two charges look obviously wrong.',
        accountRecord: 'Their Node holds its own intake schedule. It has done for two seasons.',
        itemiseCharges: 'Itemised side by side, the second line is plainly not in our hand.',
        pointToNode: 'You show them which line is which, and who raised it. They are annoyed, but not at you.',
      },
    },
    {
      id: 'two-shipments',
      weight: 2, discoverable: true,
      trueCategory: 'Invoice Query', trueDomain: 'Billing',
      diagnosisId: 'twoShipments',
      keyActionIds: ['bookingRegister'],
      clues: {
        chargeLedger: 'Two charges, same amount, three days apart.',
        bookingRegister: 'Two bookings. Same goods, same route, both confirmed by them.',
        itemiseCharges: 'Itemised, the two bookings are three days and two references apart.',
      },
    },
    {
      id: 'legs-billed-apart',
      weight: 2, discoverable: true,
      trueCategory: 'Invoice Query', trueDomain: 'Billing',
      diagnosisId: 'legBilledSeparately',
      keyActionIds: ['routeBooking'],
      aptSupport: ['itemiseCharges'],
      clues: {
        chargeLedger: 'Two charges. Different amounts, though they read alike at a glance.',
        routeBooking: 'Priority Relay — three legs, and each leg bills on completion.',
        itemiseCharges: 'Itemised, the legs are obvious. Nobody had ever explained it to them.',
      },
    },
  ],
});

const TICKET_TEMPLATES = {
  endUser: [
    { category: 'Shipment Trace', domain: 'Fulfillment', weight: 4, baseUrgency: 3, investigationTemplate: SHIPMENT_TRACE_TEMPLATE },
    { category: 'Duplicate Charge', domain: 'Billing', weight: 2, baseUrgency: 2, investigationTemplate: DUPLICATE_CHARGE_TEMPLATE },
    { category: 'Cursed Item Return', domain: 'Returns', weight: 3, baseUrgency: 2 },
    { category: 'Quest Line Bug', domain: 'Quality', weight: 2, baseUrgency: 3 },
    { category: 'Respawn Delay', domain: 'Service', weight: 3, baseUrgency: 4 },
    { category: 'XP Miscount Dispute', domain: 'Accounts', weight: 2, baseUrgency: 1 },
  ],
  business: [
    { category: 'Shipment Trace', domain: 'Fulfillment', weight: 4, baseUrgency: 3, investigationTemplate: SHIPMENT_TRACE_TEMPLATE },
    { category: 'Repeat Failure', domain: 'Repairs', weight: 2, baseUrgency: 4, investigationTemplate: REPEAT_FAILURE_TEMPLATE },
    { category: 'No Booking On Record', domain: 'Orders', weight: 2, baseUrgency: 3, investigationTemplate: NO_BOOKING_TEMPLATE },
    { category: 'Bulk Potion Order Delay', domain: 'Fulfillment', weight: 2, baseUrgency: 3 },
    { category: 'Border Ward Malfunction', domain: 'Repairs', weight: 1, baseUrgency: 5 },
    { category: 'Garrison Supply Shortfall', domain: 'Fulfillment', weight: 2, baseUrgency: 3 },
  ],
  partner: [
    { category: 'Phantom Inventory', domain: 'Quantity', weight: 3, baseUrgency: 2, investigationTemplate: PHANTOM_INVENTORY_TEMPLATE },
    { category: 'Shipment Trace', domain: 'Fulfillment', weight: 4, baseUrgency: 3, investigationTemplate: SHIPMENT_TRACE_TEMPLATE },
    { category: 'Duplicate Charge', domain: 'Billing', weight: 3, baseUrgency: 2, investigationTemplate: DUPLICATE_CHARGE_TEMPLATE },
    { category: 'No Booking On Record', domain: 'Orders', weight: 2, baseUrgency: 3, investigationTemplate: NO_BOOKING_TEMPLATE },
    { category: 'Commission Payout Dispute', domain: 'Billing', weight: 2, baseUrgency: 3 },
    { category: 'Storefront Listing Error', domain: 'Accounts', weight: 2, baseUrgency: 1 },
  ],
};

// UI-ONLY (no counterpart in gameLogic.js). The caller's opening line,
// keyed by ticket category. Kept out of TICKET_TEMPLATES deliberately so
// that table stays a byte-for-byte mirror of gameLogic.js's -- flavor
// text is a rendering concern and the core sim has no business carrying
// it. Phantom Inventory has no entry: it opens with its investigation's
// `openingStatement` instead.
const CATEGORY_BLURBS = {
  // A blurb is the REASON THEY RANG US, not their situation. "The
  // infirmary is out of draughts" is a fact about their week; it is not
  // a reason to contact a shipping co-op. "The draughts we ordered have
  // not come" is.
  'Cursed Item Return': 'I need to send a ring back, and I can\u2019t get it off my hand to pack it.',
  'Bulk Potion Order Delay': 'The draughts we ordered for the infirmary still haven\u2019t come.',
  'Garrison Supply Shortfall': 'Our rations were due three days ago and nothing has arrived.',
  'Commission Payout Dispute': 'Last month\u2019s commission came in short by a fair bit.',
  'Storefront Listing Error': 'Your listing has my Slightly Cursed Dagger down as a kitchen utensil.',
  'Border Ward Malfunction': 'The ward on our eastern gate went out for six minutes last night.',

  // NOT LOGISTICS PROBLEMS. These three came from an earlier pass and
  // are not things a shipping cooperative handles at all -- there is no
  // shipment, no account and no charge in any of them. They need
  // replacing with real End User requests (a trace, damage in transit,
  // a return), not rewording. Left honest rather than dressed up.
  'Quest Line Bug': 'The old hermit keeps repeating the same line of dialogue.',
  'Respawn Delay': 'Been dead for twenty minutes. Party\u2019s waiting.',
  'XP Miscount Dispute': 'Certain that dragon was worth more than this.',
};

// UI-ONLY. Overrides CATEGORY_BLURBS when a ticket is a returning
// follow-up -- the caller leads with why they're calling back, not with
// the original complaint.
const FOLLOW_UP_BLURBS = {
  reopen: "They're calling back about this \u2014 they don't think it's actually fixed.",
  hold: 'Following up on where things stand.',
};

const RESPONSE_QUALITY = {
  correct: { dispositionDelta: 12, reputationDelta: 2, timeCost: 4 },
  adequate: { dispositionDelta: 4, reputationDelta: 1, timeCost: 2 },
  rushed: { dispositionDelta: -6, reputationDelta: -1, timeCost: 1 },
  dismissive: { dispositionDelta: -18, reputationDelta: -3, timeCost: 1 },
};

/**
 * One Co-Op inquiry, nine of the player's.
 *
 * The mandated opening — "thank you for calling, how may I help you" —
 * is said on the company's behalf and costs the player nothing. After
 * that they have nine.
 *
 * Twenty is far too many; ten reads as a round number rather than a
 * shape. Nine leaves the opening standing apart as what it is.
 *
 * This is a budget of CAPTURES. It has nothing to do with the case
 * note's shape and imposes no order on anything — see LORE.md, "The
 * shape of a call."
 */
const CALL_INQUIRY_BUDGET = 9;

/** Pressing a caller for what they actually need is an inquiry. */
const PROBE_INQUIRY_COST = 1;

/**
 * What the chosen inquiries cost against the nine.
 *
 * @param {object} ticket - carrying `investigation`
 * @param {string[]} takenActionIds
 * @param {number} [probes=0]
 * @returns {number}
 */
function inquiriesSpent(ticket, takenActionIds, probes = 0) {
  const investigation = ticket && ticket.investigation;
  const fromActions = investigation
    ? investigation.actions
      .filter((a) => takenActionIds.includes(a.id))
      .reduce((sum, a) => sum + a.timeCost, 0)
    : 0;
  return fromActions + probes * PROBE_INQUIRY_COST;
}

/**
 * Whether this inquiry is still affordable.
 *
 * A resource limit, NOT a sequence gate. Nothing is ever unavailable
 * because of what has or has not been done first — only because there
 * is not enough of the call left to do it in.
 */
function canAfford(ticket, takenActionIds, probes, action) {
  const left = CALL_INQUIRY_BUDGET - inquiriesSpent(ticket, takenActionIds, probes);
  return (action ? action.timeCost : PROBE_INQUIRY_COST) <= left;
}
/**
 * The candle indicates the SHIFT. It has nothing to do with any single
 * call.
 *
 * It is not a budget, not a per-call counter, and the player never
 * spends it on anything. It is the working day going by while work gets
 * done. A shift is a fixed amount of *day*, not a fixed number of calls
 * — so how many people you get to depends on how you worked, which is
 * arithmetic rather than punishment.
 *
 * Two earlier versions got this wrong: one priced individual questions
 * in candle-notches like currency (cruel — it charged the player for
 * doing the job), and one burned exactly one notch per call (which made
 * a careful call and a shallow one cost the same day, so care was free
 * and there was nothing to weigh).
 */
const SHIFT_CANDLE_NOTCHES = 40;

/**
 * How much of the day a call consumed.
 *
 * Every call has a floor — greeting somebody, hearing them out, closing
 * — and beyond that it runs as long as the work took. Nobody is being
 * charged per question; a longer call is simply longer.
 */
const CALL_BASE_DURATION = 2;

function callDuration(inquiriesUsed) {
  return CALL_BASE_DURATION + inquiriesUsed;
}
const CANDLE_STAGES = [
  { atOrAbove: 1.0, label: 'newly lit' },
  { atOrAbove: 0.7, label: 'burning steady' },
  { atOrAbove: 0.4, label: 'burning down' },
  { atOrAbove: 0.2, label: 'burning low' },
  { atOrAbove: 0.0001, label: 'guttering' },
  { atOrAbove: 0, label: 'the wick is out' },
];
function candleStage(left, max = SHIFT_CANDLE_NOTCHES) {
  if (max <= 0) return 'the wick is out';
  const fraction = clamp(left / max, 0, 1);
  if (fraction <= 0) return 'the wick is out';
  return CANDLE_STAGES.find((st) => fraction >= st.atOrAbove).label;
}

// Mirrors gameLogic.js. Greeting someone does NOT reliably get you
// their reason for calling -- see LORE.md, "Ticket Resolution," phase 1.
const OPENING_MODES = [
  { id: 'request', weight: 3, revealsRequest: true },
  { id: 'history', weight: 2, revealsRequest: false, requiresMemory: true },
  { id: 'wait', weight: 2, revealsRequest: false },
  { id: 'product', weight: 2, revealsRequest: false },
  { id: 'vague', weight: 2, revealsRequest: false },
  { id: 'venting', weight: 1, revealsRequest: false },
];

// Baggage drives the manner of disclosure. Inert until PLAN.md Phase 1
// gives disposition real values -- see gameLogic.js for why the hook
// exists now rather than later.
function guardednessOf(customer) {
  // Reads the TLC axis: what they walked in carrying about the company
  // is what makes them slow to volunteer anything. Now that Phase 1 is
  // built this is live, not inert.
  const d = customer && customer.disposition;
  if (!d || typeof d.tlc !== 'number') return 0;
  return clamp(-d.tlc / 100, 0, 1);
}

function rollOpening(customer, memory, rng = Math.random) {
  const guarded = guardednessOf(customer);
  const available = OPENING_MODES
    .filter((m) => !m.requiresMemory || Boolean(memory))
    .map((m) => (m.revealsRequest ? { ...m, weight: m.weight * (1 - guarded * 0.8) } : m));
  const picked = weightedPick(available, rng);
  return { mode: picked.id, revealsRequest: Boolean(picked.revealsRequest), guardedness: guarded };
}

function probeForRequest(probesSoFar, rng = Math.random) {
  if (probesSoFar >= 1) return true;
  return rng() < 0.5;
}

/**
 * PACE — noticed at BOTH ends, and only by people.
 *
 * There is no meter for this and no score. Taking too long over your
 * interactions is a reason a manager or a coworker seeks you out.
 * Blazing through them without asking enough is *also* a reason. Both
 * edges get noticed; the middle does not.
 *
 * That is the whole mechanism. Not a resource, a norm — and it arrives
 * as somebody wanting a word, which is the Meetings system doing real
 * work rather than delivering flavour.
 *
 * Returns a plain reading for that system to act on. It is never shown
 * to the player as a number.
 *
 * @param {object[]} outcomes - a shift's worth
 * @returns {{ perCall: number, reading: 'dwelling'|'settled'|'blazing', calls: number }}
 */
/**
 * Bands on average CALL DURATION, not on inquiry count.
 *
 * Counting inquiries measures the content, not the agent: a category
 * with nothing to investigate makes any agent look like they blazed
 * through it. Duration includes the floor every call has — greeting,
 * hearing them out, closing — so it reads the same across categories.
 *
 * Values chosen against a base call of 2 and a shift of 40. Provisional
 * until more than one category has anything to investigate; right now
 * nine in ten tickets offer no inquiries at all, which drags every
 * average toward the floor. See LORE.md.
 */
const PACE_BAND = { dwelling: 5, blazing: 2.5 };

function assessPace(outcomes) {
  const calls = outcomes.length;
  if (!calls) return { perCall: 0, reading: 'settled', calls: 0 };
  const total = outcomes.reduce((sum, o) => sum + (o.duration || CALL_BASE_DURATION), 0);
  const perCall = total / calls;
  let reading = 'settled';
  if (perCall >= PACE_BAND.dwelling) reading = 'dwelling';
  else if (perCall <= PACE_BAND.blazing) reading = 'blazing';
  return { perCall, reading, calls };
}
/**
 * Which questions make sense before they have said what they want.
 *
 * You cannot ask somebody what they were expecting, or whether anyone
 * else has been in touch about *it*, when they have not yet told you
 * what "it" is. A playthrough produced exactly that: two questions
 * about a shipment, and only afterwards the customer explaining there
 * was a shipment.
 *
 * This is an EVIDENCE gate, not a sequence gate -- the same rule that
 * lets a diagnosis be unavailable when nothing supports it. Nothing is
 * locked by position; these simply have no referent yet.
 */
const ASKS_BEFORE_REQUEST = ['askName', 'askWhenNoticed'];

function askMakesSense(actionId, requestKnown) {
  return requestKnown || ASKS_BEFORE_REQUEST.includes(actionId);
}
/**
 * How well each way of putting a question suits this caller, right now.
 *
 * **Returns fit, and never a choice.** An earlier version picked the
 * phrasing automatically, which removed the only decision that made
 * delivery interesting and also produced nonsense — it handed a
 * deferential shopkeeper "I'll need a name before we go further."
 *
 * The player chooses how to say it. This says how it landed, and the
 * player finds that out from the caller's cues, not from a number.
 */
function spokenFit(customer, context) {
  const want = deliveryPreference(customer, context);
  const score = (warmth, directness) => clamp(
    1 - (Math.abs(warmth - want.warmth) + Math.abs(directness - want.directness)) / 6, 0, 1,
  );
  return {
    soft: score(1.6, -0.8),
    plain: score(0, 0),
    firm: score(-1, 1.8),
  };
}
const RESOLUTION_STATUSES = ['resolved', 'hold', 'transfer'];

const DISPUTE_CHANCE_BY_QUALITY = { correct: 0.03, adequate: 0.12, rushed: 0.35, dismissive: 0.6 };
// What a Hold is waiting ON -- one or more at a time. Mirrors
// gameLogic.js. Flattening this to internal/external lost the agent's
// own pending work and the fact that holds stack.
const HOLD_PENDING = ['agent', 'customer', 'internal'];

function rollHoldPending(rng) {
  const pending = HOLD_PENDING.filter(() => rng() < 0.4);
  return pending.length ? pending : [pickOne(HOLD_PENDING, rng)];
}
const FOLLOW_UP_BASE_URGENCY = { hold: 5, reopen: 7 };

const SHIFT_MODIFIERS = [
  { id: 'guild-convention', label: "Adventurer's Guild Convention", description: 'Ticket volume is unusually high today.', apply: (d) => { d.ticketCount = Math.round(d.ticketCount * 1.5); } },
  { id: 'mercury-retrograde', label: 'Mercury Retrograde', description: 'Tracking scrolls are scrambled; everything reads more urgent than it is.', apply: (d) => { d.urgencyBonus += 2; } },
  { id: 'villain-uprising', label: 'Villain Uprising', description: 'A spike in End User tickets, mostly Villains.', apply: (d) => { d.tierWeightMultiplier.endUser *= 2; } },
  { id: 'new-hire-shadow', label: 'New Hire Shadowing', description: 'You are training someone. Every response costs extra time.', apply: (d) => { d.timeCostMultiplier *= 1.5; } },
  { id: 'quiet-morning', label: 'Quiet Morning', description: 'Lighter volume than usual.', apply: (d) => { d.ticketCount = Math.max(3, Math.round(d.ticketCount * 0.7)); } },
];

function weightedPick(items, rng) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}
function pickOne(list, rng) { return list[Math.floor(rng() * list.length)]; }
function shuffle(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
/**
 * READING A CUSTOMER — cues, not verdicts.
 *
 * **A label is not how anyone learns what a caller feels.** On a real
 * desk you get tone, word choice, phrasing, volume, pitch and cadence,
 * and you work it out. "The Military is now feeling neutral" is a debug
 * readout that got promoted to a mechanic; this replaces it.
 *
 * What comes back is a set of **observable cues** for the UI to render
 * as behaviour. The player infers. The game never states how anyone
 * feels.
 *
 * **The reading is genuinely uncertain, and not because of added
 * noise.** Cues derive from the VISIBLE level — internal feeling times
 * Social Filter — so a badly upset customer with a tight lid produces
 * the same cues as a mildly annoyed one with none. That ambiguity is
 * the Social Filter doing exactly what LORE.md says it does: a player
 * cannot read the truth off the presentation.
 *
 * @param {object} customer
 * @param {string} [axis='you'] - which feeling is being read
 * @returns {{ band: string, cadence: string, volume: string, wordChoice: string, visible: number }}
 */
function readCues(customer, axis = 'you') {
  const disposition = (customer && customer.disposition) || {};
  const traits = (customer && customer.traits) || { socialFilter: 1 };
  const level = disposition[axis] || 0;
  const visible = level * (traits.socialFilter === undefined ? 1 : traits.socialFilter);

  let band;
  if (visible <= -45) band = 'cold';
  else if (visible <= -15) band = 'cooling';
  else if (visible < 15) band = 'level';
  else if (visible < 45) band = 'warming';
  else band = 'open';

  const cues = {
    cold: { cadence: 'clipped', volume: 'raised', wordChoice: 'distancing' },
    cooling: { cadence: 'short', volume: 'flat', wordChoice: 'formal' },
    level: { cadence: 'even', volume: 'level', wordChoice: 'plain' },
    warming: { cadence: 'unhurried', volume: 'easy', wordChoice: 'personal' },
    open: { cadence: 'rambling', volume: 'bright', wordChoice: 'familiar' },
  }[band];

  return { band, visible, ...cues };
}
// INTERNAL ONLY -- never shown to the player. See readCues().
function dispositionTag(score) {
  if (score <= -60) return 'hostile';
  if (score <= -20) return 'frustrated';
  if (score < 20) return 'neutral';
  if (score < 60) return 'warm';
  return 'loyal';
}

// Same rules as gameLogic.js's recallMemory()/decayChanceFor(): scan
// most-recent-first for a memorable incident, then let each detail of
// it (category, timing, who helped) independently fade the longer ago
// it happened. Kept in sync by hand — see the README note about this
// duplication once this moves into a real project.
const DECOY_AGENT_NAMES = ['Cassidy', 'Thistle', 'Bram', 'Pell', 'Wren'];
const MEMORABLE_QUALITIES = new Set(['correct', 'dismissive']);
const DECAY_RATE_PER_SHIFT = 0.2;
const MAX_DECAY_CHANCE = 0.8;
function decayChanceFor(shiftsSince) { return clamp(shiftsSince * DECAY_RATE_PER_SHIFT, 0, MAX_DECAY_CHANCE); }

function recallMemory(customer, currentShiftId, rng = Math.random) {
  if (!customer.history || customer.history.length === 0) return null;

  let remembered = null;
  for (let i = customer.history.length - 1; i >= 0; i--) {
    if (MEMORABLE_QUALITIES.has(customer.history[i].quality)) { remembered = customer.history[i]; break; }
  }
  if (!remembered) return { style: 'tone' };

  const shiftsSince = Math.max(0, currentShiftId - remembered.shiftId);
  const decayChance = decayChanceFor(shiftsSince);
  const categoryAccurate = rng() >= decayChance;
  const timingAccurate = rng() >= decayChance;
  const agentAccurate = rng() >= decayChance;

  let category = remembered.ticketCategory;
  if (!categoryAccurate) {
    const otherCategories = TICKET_TEMPLATES[customer.tier].map((t) => t.category).filter((c) => c !== remembered.ticketCategory);
    category = otherCategories.length ? pickOne(otherCategories, rng) : remembered.ticketCategory;
  }

  let shiftsAgoReported = shiftsSince;
  if (!timingAccurate) {
    const distortion = Math.round((rng() - 0.5) * 6);
    shiftsAgoReported = Math.max(1, shiftsSince + (distortion === 0 ? 1 : distortion));
  }

  const agentAttribution = agentAccurate ? 'you' : pickOne(DECOY_AGENT_NAMES, rng);

  return {
    style: 'explicit', quality: remembered.quality, actualShiftId: remembered.shiftId,
    category, categoryAccurate, shiftsAgoReported, timingAccurate, agentAttribution, agentAccurate,
  };
}

// Register: how a customer TYPE talks. Expression, not disposition --
// archetype shapes voice and never touches traits. Mirrors gameLogic.js.
const ARCHETYPE_REGISTERS = {
  // Official, procedural, speaks in the third person of an institution
  Kingdom: 'formal', 'Town Council': 'formal', Constabulary: 'formal', Military: 'formal',
  // Self-important, theatrical, the call is about them
  Hero: 'grand', Villain: 'grand',
  // Few words, matter of fact, no performance in it
  NPC: 'plain', Blacksmith: 'plain', Henchfolk: 'plain',
  // Discursive, anecdotal, gets there eventually
  Tavern: 'chatty', Inn: 'chatty', 'Wandering Trader': 'chatty',
  // Hedging, apologetic, reluctant to take up your time
  Sidekick: 'deferential', 'Potion Shop': 'deferential',
};

const DEFAULT_REGISTER = 'plain';

/**
 * How familiar this caller is with TLC, which shapes the telling
 * independently of register and Baggage.
 *
 * **A repeat customer talks like someone who knows the place.** Where a
 * stranger states a grievance flat, a regular in good standing hands
 * you an excuse unprompted — *"must be busy today"* — because they have
 * goodwill to spend and no interest in spending it here. A regular in
 * bad standing does the reverse: they place today's call in a pattern,
 * because for them there is one.
 *
 * This cuts ACROSS archetype. A Kingdom and a Tavern who both know you
 * both soften; the register only decides the words they soften in.
 *
 * @param {object|null} customer
 * @returns {'new'|'returning-warm'|'returning-cold'}
 */
function familiarityOf(customer) {
  if (!customer || !customer.history || customer.history.length === 0) return 'new';
  const tlc = (customer.disposition && customer.disposition.tlc) || 0;
  return tlc >= 0 ? 'returning-warm' : 'returning-cold';
}

/**
 * The register this customer speaks in.
 * @param {object|null} customer
 * @returns {string}
 */
function registerOf(customer) {
  if (!customer) return DEFAULT_REGISTER;
  return ARCHETYPE_REGISTERS[customer.archetype] || DEFAULT_REGISTER;
}

// --- Character Disposition Model (Phase 1). Mirrors gameLogic.js. ---
const FEELING_AXES = ['you', 'tlc', 'experience'];

const WRINKLES = [
  { id: 'cog-affiliated', chance: 0.22, biases: { tlc: -18 } },
  { id: 'post-adventure', chance: 0.15, biases: { experience: +12 }, sensitivity: -0.15 },
  { id: 'pre-adventure', chance: 0.15, biases: { experience: -10 }, sensitivity: +0.2 },
  { id: 'long-standing-account', chance: 0.18, biases: { tlc: +14 } },
];

const TRAIT_RANGES = {
  baggageSpread: 35,
  sensitivity: { min: 0.55, max: 1.45 },
  socialFilter: { min: 0.35, max: 1.0 },
};

function triangular(spread, rng) {
  return ((rng() + rng()) / 2 - 0.5) * 2 * spread;
}

function rollWrinkles(rng) {
  return WRINKLES.filter((w) => rng() < w.chance).map((w) => w.id);
}

function rollTraits(wrinkles = [], rng = Math.random, register = DEFAULT_REGISTER) {
  const active = WRINKLES.filter((w) => wrinkles.includes(w.id));
  const baggage = { you: 0, tlc: 0, experience: 0 };
  for (const axis of FEELING_AXES) {
    if (axis === 'you') continue;
    const bias = active.reduce((sum, w) => sum + ((w.biases && w.biases[axis]) || 0), 0);
    baggage[axis] = clamp(Math.round(triangular(TRAIT_RANGES.baggageSpread, rng) + bias), -100, 100);
  }
  const sensBias = active.reduce((sum, w) => sum + (w.sensitivity || 0), 0);
  const { min: sMin, max: sMax } = TRAIT_RANGES.sensitivity;
  const sensitivity = clamp(sMin + rng() * (sMax - sMin) + sensBias, 0.1, 2.5);
  const { min: fMin, max: fMax } = TRAIT_RANGES.socialFilter;
  const socialFilter = fMin + rng() * (fMax - fMin);
  return { baggage, sensitivity, socialFilter, preference: rollDeliveryPreference(register, rng) };
}

function applyDisposition(customer, rawDeltas) {
  const traits = customer.traits || { sensitivity: 1, socialFilter: 1 };
  const current = customer.disposition || {};
  const disposition = { ...current };
  const visible = {};
  for (const [axis, raw] of Object.entries(rawDeltas)) {
    const felt = raw * traits.sensitivity;
    disposition[axis] = clamp((current[axis] || 0) + felt, -100, 100);
    visible[axis] = felt * traits.socialFilter;
  }
  return { disposition, visible };
}

function buildCustomerPool(existing, freshCount, rng) {
  const pool = [...existing];
  for (let i = 0; i < freshCount; i++) {
    const tierKey = pickOne(Object.keys(CUSTOMER_TYPES), rng);
    const archetype = pickOne(CUSTOMER_TYPES[tierKey].archetypes, rng);
    const wrinkles = rollWrinkles(rng);
    const traits = rollTraits(wrinkles, rng, ARCHETYPE_REGISTERS[archetype] || DEFAULT_REGISTER);
    pool.push({
      id: `${tierKey}-${archetype}-${Math.floor(rng() * 1e6)}`, tier: tierKey, archetype,
      wrinkles, traits,
      disposition: { you: traits.baggage.you, tlc: traits.baggage.tlc, experience: traits.baggage.experience, understanding: 0 },
      history: [],
    });
  }
  return pool;
}

function generateShift({ knownCustomers = [], baseTicketCount = 8, currentShiftId = 1, pendingFollowUps = [], rng = Math.random } = {}) {
  const draft = { ticketCount: baseTicketCount, urgencyBonus: 0, tierWeightMultiplier: { endUser: 1, business: 1, partner: 1 }, timeCostMultiplier: 1 };
  const modifierCount = 1 + Math.floor(rng() * 2);
  const modifiers = shuffle(SHIFT_MODIFIERS, rng).slice(0, modifierCount);
  modifiers.forEach((m) => m.apply(draft));

  const dueFollowUps = pendingFollowUps.filter((f) => f.dueShiftId <= currentShiftId);
  const stillPendingFollowUps = pendingFollowUps.filter((f) => f.dueShiftId > currentShiftId);

  const proceduralCount = Math.max(0, draft.ticketCount - dueFollowUps.length);
  const returningTarget = Math.min(knownCustomers.length, Math.ceil(proceduralCount * 0.4));
  const returning = shuffle(knownCustomers, rng).slice(0, returningTarget);
  const freshNeeded = Math.max(0, proceduralCount - returning.length);
  let customerPool = buildCustomerPool(returning, freshNeeded, rng);

  // Follow-up customers must be present even if the random draw above
  // didn't happen to include them -- it's specifically their ticket.
  const poolIds = new Set(customerPool.map((c) => c.id));
  dueFollowUps.forEach((f) => {
    if (poolIds.has(f.customerId)) return;
    const known = knownCustomers.find((c) => c.id === f.customerId);
    if (known) { customerPool = [...customerPool, known]; poolIds.add(known.id); }
  });

  const tierKeys = Object.keys(CUSTOMER_TYPES);
  const proceduralTickets = [];
  const drawPool = customerPool.filter((c) => !dueFollowUps.some((f) => f.customerId === c.id));
  for (let i = 0; i < proceduralCount && drawPool.length; i++) {
    const chosenTier = weightedPick(tierKeys.map((t) => ({ tier: t, weight: draft.tierWeightMultiplier[t] })), rng).tier;
    const candidates = drawPool.filter((c) => c.tier === chosenTier);
    const customer = candidates.length ? pickOne(candidates, rng) : pickOne(drawPool, rng);
    drawPool.splice(drawPool.indexOf(customer), 1);
    const template = weightedPick(TICKET_TEMPLATES[customer.tier], rng);
    proceduralTickets.push({
      id: `ticket-${i}-${customer.id}`, customerId: customer.id, category: template.category,
      urgency: clamp(template.baseUrgency + draft.urgencyBonus, 1, 10),
      timeCostMultiplier: draft.timeCostMultiplier,
      dayVariance: rollDayVariance(rng),
      isReturning: customer.history.length > 0, isFollowUp: false,
      investigation: (() => {
        const t = template.investigationTemplate || BASELINE_TEMPLATE;
        return buildInvestigation(t, rollRootCause(t, rng));
      })(),
    });
  }

  const followUpTickets = dueFollowUps.map((f, i) => ({
    id: `followup-ticket-${i}-${f.id}`, customerId: f.customerId, category: f.category,
    urgency: clamp(FOLLOW_UP_BASE_URGENCY[f.kind] + draft.urgencyBonus, 1, 10),
    timeCostMultiplier: draft.timeCostMultiplier,
    isReturning: true, isFollowUp: true, followUpKind: f.kind,
    holdPending: f.kind === 'hold' ? rollHoldPending(rng) : undefined,
  }));

  const tickets = shuffle([...proceduralTickets, ...followUpTickets], rng);

  // fullRoster: every known customer, whether or not they appear this
  // shift -- mirrors gameLogic.js's generateShift(). Callers must persist
  // fullRoster, not customerPool, or anyone sitting out a shift with a
  // follow-up due later silently vanishes from the roster.
  const knownIds = new Set(knownCustomers.map((c) => c.id));
  const newlyMinted = customerPool.filter((c) => !knownIds.has(c.id));
  const fullRoster = [...knownCustomers, ...newlyMinted];

  return { modifiers, tickets, customerPool, fullRoster, stillPendingFollowUps };
}

// Mirrors gameLogic.js's resolveInvestigation() exactly. See LORE.md,
// "Ticket Resolution -- Investigation Phase," for the design.
function resolveInvestigation(ticket, investigatedActionIds, chosenDiagnosisId) {
  const investigation = ticket.investigation;
  if (!investigation) {
    throw new Error(`Ticket category "${ticket.category}" has no investigation data`);
  }
  const diagnosis = investigation.diagnoses.find((d) => d.id === chosenDiagnosisId);
  if (!diagnosis) {
    throw new Error(`Unknown diagnosis id: "${chosenDiagnosisId}"`);
  }
  const investigatedKeyClue = investigation.keyActionIds
    .every((id) => investigatedActionIds.includes(id));
  const grounding = diagnosis.correct
    ? (investigatedKeyClue ? 'grounded' : 'lucky')
    : (investigatedActionIds.length > 0 ? 'reasoned' : 'blind');
  let standing;
  if (diagnosis.correct) standing = investigatedKeyClue ? 'correct' : 'partial';
  else standing = investigatedActionIds.length > 0 ? 'partial' : 'wrong';
  return {
    standing,
    grounding,
    quality: diagnosis.correct
      ? (investigatedKeyClue ? 'correct' : 'adequate')
      : (investigatedActionIds.length > 0 ? 'rushed' : 'dismissive'),
  };
}

function investigationTimeCost(ticket, investigatedActionIds) {
  const investigation = ticket.investigation;
  if (!investigation) return 0;
  return investigation.actions
    .filter((a) => investigatedActionIds.includes(a.id))
    .reduce((sum, a) => sum + a.timeCost, 0);
}

/**
 * DELIVERY — an inquiry is an intent, not a sentence.
 *
 * **An inquiry is not always a question.** Every one of these obtains
 * the same thing:
 *
 *   "May I have your name?"                                  question
 *   "And what is your name?"                                  plain
 *   "To proceed, please provide your name."                   directive
 *   "The next thing we need is your name."                    procedural
 *   "I'm Wren, and your name?"                                reciprocal
 *   "Thank you. To continue we need your name."               transactional
 *
 * Same intent. Six deliveries, three of them not questions at all. What
 * changes is not the information — it is how it lands, and that depends
 * on who is on the line.
 *
 * `directness` is how much it presses; `warmth` is how much of the
 * agent is in it; `formality` is register. A directive to somebody
 * already upset is cold. A reciprocal "I'm Wren, and your name?" to a
 * Kingdom account is over-familiar. Neither is wrong in the abstract.
 *
 * **This is where Empathy actually lives.** Choosing the delivery that
 * suits this person is the skill; Empathy is earned, so a new agent
 * picks by instinct and finds out afterwards. See LORE.md, "Education
 * & Empathy."
 */
const DELIVERIES = [
  { id: 'question', warmth: 1, formality: 0, directness: 0 },
  { id: 'plain', warmth: 0, formality: -1, directness: 1 },
  { id: 'directive', warmth: -1, formality: 1, directness: 2 },
  { id: 'procedural', warmth: -1, formality: 1, directness: 1 },
  { id: 'reciprocal', warmth: 2, formality: -1, directness: 0 },
  { id: 'transactional', warmth: 0, formality: 1, directness: 0 },
];

/**
 * How this caller is, TODAY.
 *
 * The part of "right now" that is *not* explained by their state or
 * their situation — the ordinary variation of a person having a day.
 * See LORE.md, "day-to-day variance, same person": autopilot on a
 * well-known regular is still a mistake.
 *
 * Deliberately smaller than both the individual spread and the
 * situational push. It nudges; it does not make somebody a different
 * person, and it is not a substitute for modelling what is actually
 * happening to them.
 *
 * @param {function} [rng=Math.random]
 */
function rollDayVariance(rng = Math.random) {
  return { warmth: triangular(0.8, rng), directness: triangular(0.8, rng) };
}

/**
 * Rolls how THIS PERSON likes to be addressed.
 *
 * **Not a function of their state.** An earlier version derived wants
 * from disposition — upset meant wanting warmth, worn down meant
 * wanting directness — which is a lookup table wearing a formula. Some
 * upset customers want warmth. Some want you to stop talking and fix
 * it. Some want something else again, because they are a particular
 * person on a particular day.
 *
 * So preference is **individually rolled**, exactly like Baggage and
 * Sensitivity, and it carries its own `underStress` vector: the
 * direction *this* person moves when a call goes badly. For some that
 * is toward warmth; for others away from it.
 *
 * Register biases the baseline formality — how someone speaks tends to
 * track what they are comfortable being spoken to in — but it **biases
 * a draw and never sets it**. A formal speaker may still want warmth.
 *
 * @param {string} register
 * @param {function} [rng=Math.random]
 */
function rollDeliveryPreference(register, rng = Math.random) {
  const formalityBias = {
    formal: 0.6, grand: 0.5, plain: 0, chatty: -0.6, deferential: 0,
  }[register] || 0;

  // Spread deliberately wide. A tighter draw clustered everyone near
  // neutral, which made the striking deliveries -- reciprocal, directive
  // -- the right call for about 2% of people each. That is dead content:
  // a phrasing nobody ever wants is the same as a phrasing that does not
  // exist. People are more various than a tight bell allows.
  return {
    warmth: triangular(2.2, rng),
    formality: triangular(1.6, rng) + formalityBias,
    directness: triangular(2.2, rng),
    // Where this person goes when the call is going badly. Individual,
    // signed, and not inferable from the fact that they are upset.
    underStress: {
      warmth: triangular(1.6, rng),
      directness: triangular(1.6, rng),
    },
  };
}

/**
 * What this customer wants from a delivery right now.
 *
 * **Nobody wants identical service every time.** What somebody wants is
 * tailored to what they are feeling, what is happening to them at this
 * moment, and what happened to them before — and it is a continuum, not
 * a set of cases.
 *
 * Their own rolled baseline, shifted along their own `underStress`
 * direction by however much is pressing on them. Every source of
 * pressure supplies **magnitude only**; direction is always individual,
 * so no situation ever makes two people want the same thing.
 *
 * @param {object} customer
 * @param {object} [context]
 * @param {object} [context.ticket] - what is happening to them now
 * @param {object} [context.dayVariance] - and who they are today
 * @returns {{ warmth: number, formality: number, directness: number }}
 */
function situationalPressure(ticket) {
  if (!ticket) return 0;
  // What is happening to them right now. Urgency is what is at stake;
  // a follow-up means this has already failed them once, and a reopened
  // one means it failed after we told them it was fixed.
  const urgency = ((ticket.urgency || 1) - 1) / 9;
  const again = ticket.isFollowUp ? (ticket.followUpKind === 'reopen' ? 0.45 : 0.25) : 0;
  return clamp(urgency * 0.55 + again, 0, 1);
}

function deliveryPreference(customer, context) {
  const pref = (customer && customer.traits && customer.traits.preference)
    || { warmth: 0, formality: 0, directness: 0, underStress: { warmth: 0, directness: 0 } };
  const disposition = (customer && customer.disposition) || {};
  // Same person, different day. LORE.md's "day-to-day variance, same
  // person": even the best-known customer is not identical each time,
  // so autopilot on a regular is still a mistake.
  const ctx = context || {};
  const today = ctx.dayVariance || { warmth: 0, directness: 0 };

  // Three things push, and they are different things:
  //   feeling   -- how they feel about us and about the episode
  //   situation -- what is happening to them RIGHT NOW
  //   before    -- that this has already gone wrong for them once
  // All three only supply MAGNITUDE. The direction is always the
  // customer's own, so no amount of pressure makes two people want the
  // same thing.
  const feeling = clamp(
    (Math.max(0, -(disposition.you || 0)) + Math.max(0, -(disposition.experience || 0))) / 120,
    0, 1,
  );
  const situation = situationalPressure(ctx.ticket);
  const strain = clamp(feeling + situation * 0.7, 0, 1.4);

  const under = pref.underStress || { warmth: 0, directness: 0 };
  return {
    warmth: pref.warmth + strain * under.warmth + (today.warmth || 0),
    formality: pref.formality,
    directness: pref.directness + strain * under.directness + (today.directness || 0),
  };
}


/**
 * How well a delivery suits this customer. Higher is better.
 *
 * Returns a plain closeness score rather than a verdict — nothing here
 * tells the player they chose well; the customer's cues do that, and
 * they are ambiguous on purpose (see readCues).
 *
 * @param {string} deliveryId
 * @param {object} customer
 * @returns {number} 0 (badly mismatched) .. 1 (well judged)
 */
function deliveryFit(deliveryId, customer, context) {
  const delivery = DELIVERIES.find((d) => d.id === deliveryId);
  if (!delivery) return 0;
  const want = deliveryPreference(customer, context);

  const distance = Math.abs(delivery.warmth - want.warmth)
    + Math.abs(delivery.formality - want.formality)
    + Math.abs(delivery.directness - want.directness);

  // Worst case across the ranges in play is 7; keep it in 0..1.
  return clamp(1 - distance / 7, 0, 1);
}
/**
 * ENCHANTED MAIL — support in pieces.
 *
 * A customer writes. That opens a case. An agent replies and then
 * *waits*, sometimes days, for an answer. It is the same work as a call,
 * taken apart and spread out — and the difference that matters is this:
 *
 *   **An agent never knows where in the process they are entering.**
 *
 * You might be the first person to touch it. You might be the fourth,
 * on the ninth exchange, on a case two other people have already asked
 * half the right questions on. Nothing on the outside tells you which.
 * **Reading the thread to work out where you are is the job**, and it is
 * a different skill from working a call, where you are always at the
 * beginning by definition.
 *
 * Two consequences fall straight out:
 *
 *   - **Prior exchanges were written by whoever picked them up**, at
 *     their own standard. A thread can carry good work, thin work, or
 *     work that was confidently wrong (see DECOY_AGENT_NAMES).
 *   - **Anything already established is in the thread.** Re-asking it
 *     wastes the little you get per exchange, and worse, asks a customer
 *     something they have already answered — twice, from their side.
 *
 * Piecemeal means piecemeal: an exchange is a fraction of a call, not a
 * whole one.
 */
const MAIL_EXCHANGE_BUDGET = 3;

/** How many exchanges a case tends to have run before you see it. */
const MAIL_DEPTH_WEIGHTS = [
  { depth: 0, weight: 3 },   // brand new; you are first
  { depth: 1, weight: 3 },
  { depth: 2, weight: 3 },
  { depth: 3, weight: 2 },
  { depth: 4, weight: 1 },   // long-running, several hands on it
];

/**
 * Rolls the thread a case arrives carrying.
 *
 * Each prior agent exchange may have established something — drawn from
 * the same evidence a caller would have got by asking — and the quality
 * of what they wrote down varies with who they were.
 *
 * @param {object} investigation - a built investigation block
 * @param {function} [rng=Math.random]
 * @returns {{ exchanges: object[], established: string[], handledBy: string[] }}
 */
function rollMailThread(investigation, rng = Math.random) {
  const depth = weightedPick(MAIL_DEPTH_WEIGHTS, rng).depth;
  const exchanges = [];
  const established = [];
  const handledBy = [];

  // The customer's opening. Always first, always theirs.
  exchanges.push({ from: 'customer', body: investigation.openingStatement });

  const lookups = investigation.actions.filter((a) => a.kind === 'investigative');

  for (let i = 0; i < depth; i++) {
    const who = pickOne(DECOY_AGENT_NAMES, rng);
    handledBy.push(who);

    // Did they actually establish anything, or just move it along?
    const didWork = rng() < 0.6;
    const action = didWork && lookups.length
      ? lookups[Math.floor(rng() * lookups.length)]
      : null;
    // Even when they did the work, they may not have written it down.
    const recorded = action && rng() < 0.7;
    if (recorded) established.push(action.id);

    exchanges.push({
      from: 'agent', agent: who, actionId: recorded ? action.id : null,
      body: recorded ? action.clue : null,
    });
    exchanges.push({ from: 'customer', body: null, reply: true });
  }

  return { exchanges, established: [...new Set(established)], handledBy };
}

/**
 * What re-asking something already in the thread costs.
 *
 * It wastes an exchange you barely have — and from the customer's side
 * they have now answered the same question twice, to two different
 * people, at a company that apparently does not read its own mail.
 */
function redundantAsk(thread, actionIds) {
  const repeated = actionIds.filter((id) => thread.established.includes(id));
  // `|| 0` guards against negative zero: -2 * 0 is -0 in JavaScript, and
  // Object.is(-0, 0) is false, so a no-cost result would compare unequal
  // to zero for any caller checking it strictly.
  return {
    repeated,
    experience: repeated.length * -2 || 0,
    you: repeated.length * -1 || 0,
  };
}
/**
 * WHERE THE TWO ACCOUNTS DISAGREE.
 *
 * There are two memories of every past call and they are not the same
 * object:
 *
 *   - **The customer's** — grounded in what happened *to them*, and
 *     distorted across the five facets (see "Memory is multifaceted").
 *     It owes nothing to our paperwork.
 *   - **The company's** — the case note. Only ever as good as what a
 *     busy agent had time to write.
 *
 * **The agent reads one and talks to the other.** Neither side is
 * lying: they remember what happened to them, we recorded what we had
 * time for.
 *
 * Nothing surfaces while the two agree — most calls, most of the time.
 * **A divergence is an event**, raised only where one account actually
 * conflicts with the other, and it is the mechanical form of "Trust and
 * Verify": trust the experience they lived, verify it against the
 * record before acting.
 *
 * @param {object|null} memory - recallMemory() output for this customer
 * @param {object|null} record - the matching history entry (the note)
 * @returns {object[]} one entry per point of conflict; empty when the
 *   accounts are consistent
 */
function accountDivergences(memory, record) {
  if (!memory || memory.style !== 'explicit' || !record) return [];

  const out = [];

  // Products/Services — what they say the ticket was about
  if (memory.categoryAccurate === false && memory.category !== record.ticketCategory) {
    out.push({
      facet: 'Products/Services',
      claimed: memory.category,
      recorded: record.ticketCategory,
    });
  }

  // Staff — who they say handled it
  if (memory.agentAccurate === false) {
    out.push({
      facet: 'Staff',
      claimed: memory.agentAttribution,
      recorded: 'you',
    });
  }

  // Experiences — when they say it happened
  if (memory.timingAccurate === false && memory.actualShiftId !== undefined) {
    out.push({
      facet: 'Experiences',
      claimed: memory.shiftsAgoReported,
      recorded: record.shiftId,
    });
  }

  return out;
}
function resolveTicket(ticket, customer, quality, status, shiftId, inquiriesUsed = 0) {
  const effect = RESPONSE_QUALITY[quality];
  if (!effect) {
    throw new Error(`Unknown response quality: "${quality}"`);
  }
  if (!RESOLUTION_STATUSES.includes(status)) {
    throw new Error(`Unknown resolution status: "${status}"`);
  }

  const raw = {
    tlc: effect.dispositionDelta,
    you: effect.dispositionDelta * 0.6,
    experience: effect.dispositionDelta * 0.3,
  };
  const { disposition, visible } = applyDisposition(customer, raw);
  const updatedCustomer = {
    ...customer, disposition,
    history: [...customer.history, { shiftId, ticketCategory: ticket.category, quality, status, dispositionAfter: disposition }],
  };

  // `followUp` is a *seed*, not a decision -- endShift() is where the
  // dice actually get rolled.
  let followUp = null;
  if (status === 'hold') {
    followUp = { kind: 'hold', ticketCategory: ticket.category, customerId: customer.id };
  } else if (status === 'resolved') {
    followUp = { kind: 'reopen-risk', chance: DISPUTE_CHANCE_BY_QUALITY[quality], ticketCategory: ticket.category, customerId: customer.id };
  }
  // status === 'transfer': no follow-up. It's someone else's ticket now.

  return {
    customer: updatedCustomer,
    outcome: {
      ticketId: ticket.id, quality, status,
      reputationDelta: effect.reputationDelta,
      timeSpent: Math.round(effect.timeCost * ticket.timeCostMultiplier),
      cues: readCues(updatedCustomer, 'you'), visibleDelta: visible,
      inquiriesUsed, duration: callDuration(inquiriesUsed), followUp,
    },
  };
}

function endShift(outcomes, currentReputation, currentShiftId, rng = Math.random) {
  const reputationDelta = outcomes.reduce((s, o) => s + o.reputationDelta, 0);
  const reputation = clamp(currentReputation + reputationDelta, 0, 100);
  const commendationsEarned = outcomes.filter((o) => o.reputationDelta > 0).reduce((s, o) => s + o.reputationDelta, 0);

  // Deliberately NOT a tally of how customers felt -- mirrors
  // gameLogic.js. A shift summary reports work, not feelings; nobody
  // knows how a customer felt at end of shift. See LORE.md, "Running
  // the Desk," the shift-summary rule.
  const statusCounts = outcomes.reduce((counts, o) => {
    counts[o.status] = (counts[o.status] || 0) + 1;
    return counts;
  }, {});

  const pendingFollowUps = [];
  outcomes.forEach((o) => {
    if (!o.followUp) return;
    const delay = 1 + Math.floor(rng() * 2);
    if (o.followUp.kind === 'hold') {
      pendingFollowUps.push({ id: `followup-hold-${o.ticketId}`, customerId: o.followUp.customerId, category: o.followUp.ticketCategory, kind: 'hold', dueShiftId: currentShiftId + delay });
    } else if (o.followUp.kind === 'reopen-risk' && rng() < o.followUp.chance) {
      pendingFollowUps.push({ id: `followup-reopen-${o.ticketId}`, customerId: o.followUp.customerId, category: o.followUp.ticketCategory, kind: 'reopen', dueShiftId: currentShiftId + delay });
    }
  });

  return {
    reputation,
    commendationsEarned,
    summary: {
      ticketsHandled: outcomes.length,
      reputationDelta,
      statusCounts,
    },
    pendingFollowUps,
  };
}

// ------------------------------------------------------------------
// UI
// ------------------------------------------------------------------
//
// Visual language adopted from the design team's handoff
// (design_handoff_tlc_front_desk): palette, bevel panels, the candle
// status bar, the ask-menu tray with cost pips, and the pick-up-blind
// Line screen. Their art is placeholder by their own instruction
// ("must be replaced with authored sprites... do not port the
// generator"), so portrait frames are left empty rather than faked.
//
// Where this deliberately DIVERGES from their handoff, per LORE.md:
//   - The five phases are SURFACES, not a corridor. Any phase can be
//     revisited; only the greeting gates anything, because before you
//     open the call you have nothing.
//   - No diagnosis is disabled. You may say what you cannot back up;
//     the standing records that you couldn't.
//   - Standings are correct / partial / wrong, not a binary.
//   - The candle is the SHIFT's clock. Closing a ticket returns you to
//     the line; the day ends when the wick is out or the line empties.
//   - End of Day reports actions taken, never feelings or achievement.
// ------------------------------------------------------------------

const C = {
  void: '#0b1016', deep: '#0d141c', mid: '#131e2a',
  surface: '#16222f', lit: '#22344a', sunk: '#182530',
  chromeTop: '#1d2b3c', chromeBot: '#111a25',
  rule: '#3a536e', ruleSoft: '#2b3f56', bevelIn: '#1b2b3c', bevelOut: '#6e8fb0',
  hi: '#f2f6fa', text: '#eaf2f9', t2: '#d5e2ee', t3: '#b6cadd',
  dim: '#a9c2d8', muted: '#8fa8bf', mutest: '#8098af', off: '#3f556b',
  gold: '#e0b45c', goldHover: '#f6d38a', goldDeep: '#8f6522',
  steel: '#4a6c8f', sage: '#9db07c', sageDeep: '#7a8a5e',
  rose: '#c9707a', roseDeep: '#8f3f47', copper: '#c9963f', ink: '#0a1017',
};
const DISPLAY = "'Jersey 15', ui-monospace, monospace";
const BODY = "'Pixelify Sans', system-ui, sans-serif";

const bevel = (accent) => ({
  background: `linear-gradient(180deg, ${C.lit}, ${C.surface})`,
  boxShadow: `inset 0 0 0 1px ${C.ink}, inset 0 0 0 2px ${accent || C.bevelIn}`,
  borderRadius: 2,
});

const S = {
  frame: { height: '100vh', overflow: 'hidden', background: `linear-gradient(180deg, ${C.mid}, ${C.deep})`,
    color: C.text, fontFamily: BODY, display: 'flex', flexDirection: 'column' },
  bar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '9px 12px', background: `linear-gradient(180deg, ${C.chromeTop}, ${C.chromeBot})`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,.09)`, borderBottom: `1px solid ${C.rule}` },
  barLeft: { fontFamily: DISPLAY, fontSize: 15, letterSpacing: 1.2, color: C.dim },
  barRight: { fontFamily: DISPLAY, fontSize: 13, letterSpacing: 1.5, color: C.mutest },
  body: { flex: 1, padding: '16px 14px 22px', maxWidth: 460, width: '100%', margin: '0 auto',
    display: 'flex', flexDirection: 'column', gap: 13 },
  h1: { fontFamily: DISPLAY, fontSize: 44, lineHeight: .96, color: C.hi, margin: 0,
    textShadow: `0 2px 0 ${C.ink}, 0 3px 0 rgba(110,143,176,.35)` },
  h2: { fontFamily: DISPLAY, fontSize: 30, lineHeight: 1.05, color: C.hi, margin: 0 },
  kicker: { fontFamily: DISPLAY, fontSize: 15, letterSpacing: 3, color: C.muted, margin: 0 },
  prose: { fontSize: 15.5, lineHeight: 1.5, color: C.dim, margin: 0 },
  panel: { ...bevel(), padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontFamily: DISPLAY, fontSize: 13, letterSpacing: 2, color: C.muted, margin: 0 },
  menu: { display: 'flex', flexDirection: 'column', gap: 6 },
  row: { display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
    padding: '8px 10px', border: 'none', cursor: 'pointer', color: C.text,
    background: `linear-gradient(180deg, ${C.lit}, ${C.surface})`,
    boxShadow: `inset 0 0 0 1px ${C.ink}, inset 0 0 0 2px ${C.bevelIn}`,
    borderRadius: 2, fontFamily: BODY, fontSize: 15, lineHeight: 1.35 },
  rowUsed: { background: `linear-gradient(180deg, ${C.sunk}, #111a23)`, color: C.mutest, cursor: 'default' },
  glyph: { fontFamily: DISPLAY, fontSize: 16, width: 11, flex: '0 0 11px' },
  note: { display: 'block', fontSize: 13, color: C.mutest, marginTop: 2 },
  pips: { marginLeft: 'auto', display: 'flex', gap: 2, flex: '0 0 auto' },
  // Pips show what an action costs the CALLER's patience -- never the
  // candle. Nothing is ever priced out of reach.
  pip: { width: 6, height: 12, background: C.copper, borderRadius: 1 },
  pipOff: { width: 6, height: 12, background: C.off, borderRadius: 1 },
  primary: { fontFamily: DISPLAY, fontSize: 18, letterSpacing: 2, padding: '11px 14px',
    border: 'none', borderRadius: 2, cursor: 'pointer', color: '#241804',
    background: `linear-gradient(180deg, ${C.goldHover}, ${C.copper} 60%, #a97a2c)`,
    boxShadow: `inset 0 0 0 1px ${C.ink}` },
  secondary: { fontFamily: DISPLAY, fontSize: 17, letterSpacing: 2, padding: '10px 14px',
    border: 'none', borderRadius: 2, cursor: 'pointer', color: C.t2,
    background: `linear-gradient(180deg, #33526f, #1e3145)`, boxShadow: `inset 0 0 0 1px ${C.ink}` },
  // The call screen is three regions and the PAGE does not grow: a fixed
  // header, a transcript that scrolls inside itself, and controls pinned
  // at the bottom. Built as one long column, every action appended to an
  // endless vertical scroll.
  callBody: {
    flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10,
    padding: '12px 14px 14px', maxWidth: 460, width: '100%', margin: '0 auto',
  },
  feedScroll: { flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  feed: { display: 'flex', flexDirection: 'column', gap: 9 },
  controls: { flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 8 },
  entry: { ...bevel(), padding: '12px 14px' },
  speaker: { fontFamily: DISPLAY, fontSize: 13, letterSpacing: 2, margin: '0 0 4px' },
  portrait: { width: 96, height: 126, flex: '0 0 96px', background: C.deep,
    boxShadow: `0 0 0 1px ${C.ink}, 0 0 0 2px ${C.steel}, 0 0 0 4px ${C.ink}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: DISPLAY, fontSize: 12, letterSpacing: 1.5, color: C.off, textAlign: 'center' },
  tag: { fontFamily: DISPLAY, fontSize: 12, letterSpacing: 1.5, padding: '3px 7px',
    borderRadius: 2, display: 'inline-block' },
  waiting: { display: 'flex', alignItems: 'center', gap: 10, opacity: .6, padding: '6px 2px' },
  // A lookup is not dialogue. Nobody spoke; you read something.
  lookup: {
    display: 'flex', gap: 8, padding: '7px 10px', borderRadius: 2,
    background: 'rgba(255,255,255,.02)', boxShadow: `inset 2px 0 0 ${C.ruleSoft}`,
  },
  lookupLabel: { fontFamily: DISPLAY, fontSize: 12.5, letterSpacing: 1, color: C.off, flex: '0 0 34%' },
  lookupBody: { fontSize: 14, lineHeight: 1.45, color: C.mutest, flex: 1 },
  surfaceBar: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  surfaceTab: {
    flex: '1 1 auto', padding: '7px 6px', border: 'none', borderRadius: 2, cursor: 'pointer',
    fontFamily: DISPLAY, fontSize: 14, letterSpacing: 1.2, color: C.muted,
    background: `linear-gradient(180deg, ${C.sunk}, #111a23)`,
    boxShadow: `inset 0 0 0 1px ${C.ink}, inset 0 0 0 2px ${C.bevelIn}`,
  },
  surfaceTabOn: {
    color: C.hi,
    background: `linear-gradient(180deg, ${C.lit}, ${C.surface})`,
    boxShadow: `inset 0 0 0 1px ${C.ink}, inset 0 0 0 2px ${C.steel}`,
  },
  surfaceCount: { marginLeft: 5, fontSize: 12, color: C.sage },
  marks: { display: 'flex', gap: 3, alignItems: 'center' },
  mark: { width: 5, height: 12, background: C.gold, borderRadius: 1 },
  markSpent: { width: 5, height: 12, background: C.off, borderRadius: 1 },
};

// UI-ONLY. The caller's opening line: an investigation ticket opens
// with its own statement, a follow-up with why they're calling back,
// everything else with its category blurb. gameLogic.js has no
// equivalent -- tickets there carry no text.
function blurbFor(ticket) {
  // The baseline template carries no opening of its own -- a category
  // without written content still has a blurb, and the blurb IS what
  // they say. Without this a Town Council's ward fault opened in
  // silence.
  if (ticket.investigation && ticket.investigation.openingStatement) {
    return ticket.investigation.openingStatement;
  }
  if (ticket.isFollowUp) return FOLLOW_UP_BLURBS[ticket.followUpKind];
  return CATEGORY_BLURBS[ticket.category];
}

// UI-ONLY. Renders what a customer brings up unprompted, exactly as
// recallMemory() reported it -- including when it's wrong. The
// distortions are the point; never "correct" them here.
function memoryLine(m) {
  const when = m.shiftsAgoReported === 0 ? 'earlier this shift'
    : m.shiftsAgoReported === 1 ? 'last shift'
    : `${m.shiftsAgoReported} shifts ago`;
  const who = m.agentAttribution === 'you' ? 'you' : m.agentAttribution;
  const verb = m.quality === 'correct' ? 'sorted out' : 'brushed off';
  return `They bring up the "${m.category}" ticket ${who} ${verb}, ${when}.`;
}

// UI-ONLY. What a caller actually says when they lead with something
// other than their reason for calling. gameLogic decides the MODE; the
// words are a rendering concern, same split as ticket blurbs.
//
// `wait` and `venting` are the Experience axis showing itself -- the
// experience that led to contact, audible in how they open. See
// LORE.md, "Character Disposition Model."
const OPENING_LINES = {
  wait: {
    formal: 'Before we proceed, I should note that I have been holding for some time.',
    grand: 'Do you know how long I have been kept waiting? Do you know who I am?',
    plain: 'Been on this line a while.',
    chatty: "I'll tell you, I've had time to reorganise the whole back room while I waited.",
    deferential: "I've been holding a fair while, if you have a moment.",
  },
  product: {
    formal: 'I will say the standard of service has declined measurably this season.',
    grand: 'There was a time when your service was worthy of the name.',
    plain: 'It used to be better. It used to be a lot better.',
    chatty: 'My father dealt with your lot, you know. Different outfit then, mind.',
    deferential: "It's probably me, but things haven't felt quite right lately.",
  },
  vague: {
    formal: 'There is an irregularity I am not able to characterise precisely.',
    grand: 'Something is deeply wrong and I expect you to determine what.',
    plain: "Something's off. Can't say what.",
    chatty: 'Now where do I even start with this, honestly —',
    deferential: "Sorry — I'm not even sure this is the right place to ask.",
  },
  venting: {
    formal: 'There is a pause. They appear to be composing themselves.',
    grand: 'A long, theatrical breath. They are not finished being aggrieved.',
    plain: 'A long silence. They have not said anything yet.',
    chatty: 'They are still talking. None of it is about the problem yet.',
    deferential: 'They start, stop, and apologise for having started.',
  },
};

// UI-ONLY. What the agent actually says. Written variants, not a noun
// slotted into a template -- slotting produced "To continue we need
// whether anyone else has been in touch about it."
//
// Which variant depends on what suits this caller right now. There is
// no single best line for everybody, and it should not be the same line
// twice in a row for the same person.
function spokenLine(action, customer, ticket) {
  if (!action.spoken) return action.label;
  const fit = spokenFit(customer, { ticket, dayVariance: ticket && ticket.dayVariance });
  const best = Object.entries(fit).sort((x, y) => y[1] - x[1])[0][0];
  return action.spoken[best] || action.spoken.plain;
}

// UI-ONLY. Cues rendered as behaviour the player watches. Never a
// verdict -- the game does not say how anyone feels, it says what they
// did with their voice. See gameLogic's readCues().
const CUE_WORDS = {
  cadence: {
    clipped: 'Their answers come back clipped',
    short: 'They answer short',
    even: 'They answer evenly',
    unhurried: 'They take their time answering',
    rambling: 'They talk on past the answer',
  },
  volume: {
    raised: 'a good deal louder than they started',
    flat: 'flatter than before',
    level: 'at the same level throughout',
    easy: 'easy enough',
    bright: 'bright with it',
  },
  wordChoice: {
    distancing: 'and they have started saying "you people"',
    formal: 'and they have gone formal on you',
    plain: 'and say about what you would expect',
    personal: 'and they have started using your name',
    familiar: 'and they are telling you things you did not ask for',
  },
};

function cueSentence(cues) {
  if (!cues) return null;
  return `${CUE_WORDS.cadence[cues.cadence]}, ${CUE_WORDS.volume[cues.volume]}, ${CUE_WORDS.wordChoice[cues.wordChoice]}.`;
}

// UI-ONLY. What FAMILIARITY adds on top of the register's words.
//
// A regular in good standing hands you an excuse unprompted -- "must be
// busy today" -- because they have goodwill and no interest in spending
// it here. A regular in bad standing places the call in a pattern,
// because for them there is one. A stranger has neither and says
// nothing extra.
//
// Composing a coda rather than writing every mode x register x
// familiarity line keeps this from exploding into sixty variations
// nobody would write well.
// A coda has to be in the SPEAKER'S voice. "Must be busy today" is a
// regular extending goodwill -- but a grand caller who has just asked
// "do you know who I am" does not then let you off the hook. They are
// magnanimous instead, which is a different thing wearing the same
// intent. So a coda may override per register; `default` covers the
// rest.
const FAMILIARITY_CODAS = {
  wait: {
    'returning-warm': { default: 'Must be busy today.', grand: 'I will allow that you are busy.' },
    'returning-cold': { default: 'Same as the last time I rang.', grand: 'As ever.' },
  },
  product: {
    'returning-warm': { default: 'Not like you, though.', grand: 'You were better than this once.' },
    'returning-cold': { default: "It's a pattern by now.", grand: 'I have stopped being surprised.' },
  },
  vague: {
    'returning-warm': { default: "You'll know better than me.", grand: 'I trust you will establish what.' },
    'returning-cold': { default: 'Not the first time either.', grand: 'Nor the first time I have asked.' },
  },
  venting: {
    'returning-warm': {
      default: 'They catch themselves, and apologise for the tone.',
      grand: 'They stop, and allow that none of it is your doing.',
    },
    'returning-cold': {
      default: 'They have said all of this before, and they know it.',
      grand: 'They have made this speech before. It has not improved.',
    },
  },
};

// UI-ONLY. Picks the line for this opening in this customer's voice.
// Mode is the substance; register is how they say it. See gameLogic's
// ARCHETYPE_REGISTERS -- expression keys off archetype, disposition
// never does.
function openingLine(mode, register, familiarity) {
  const byRegister = OPENING_LINES[mode] || OPENING_LINES.vague;
  const base = byRegister[register] || byRegister.plain;
  const codas = (FAMILIARITY_CODAS[mode] || {})[familiarity];
  if (!codas) return base;
  const coda = codas[register] || codas.default;
  return coda ? `${base} ${coda}` : base;
}

// UI-ONLY. When pressing them for the actual request doesn't land.
const PROBE_MISSES = [
  'They keep going. Whatever brought them in, they are not there yet.',
  'They circle back to the same complaint without adding to it.',
];

const STANDING_STYLE = {
  correct: { color: C.sage, rule: C.sageDeep, word: 'Grounded' },
  partial: { color: C.gold, rule: C.goldDeep, word: 'Partial' },
  wrong: { color: C.rose, rule: C.roseDeep, word: 'Not supported' },
};

// UI-ONLY. Every phrase describes an ACTION THE PLAYER TOOK, never an
// achievement. See LORE.md, "Running the Desk," the shift-summary rule.
const SUMMARY_STATUS_PHRASING = {
  resolved: 'closed out by you — pending any dispute',
  hold: 'left open, pending follow-up',
  transfer: 'passed to another team',
};

const STATUS_OPTIONS = [
  { status: 'resolved', label: 'Resolve it', hint: 'You rule on it. It sticks — or it is disputed later.' },
  { status: 'hold', label: 'Hold for review', hint: 'Kicked up for manual review. Slow, safe, remembered as nothing.' },
  { status: 'transfer', label: 'Transfer', hint: 'Off your plate. Assumes someone there answers.' },
];

// The greeting: the universal opening move. Nothing about the caller is
// revealed until the player picks up and asks. See LORE.md, "Ticket
// Resolution," phase 1.
// ONE option, because the opening is not a choice. It is the Co-Op's
// requirement, said on the company's behalf, and it costs the player
// nothing. Asking who you are speaking with is a PLAYER inquiry and
// lives in the menu with the rest -- see askName.
const GREETING = { id: 'standard', label: '"TLC Support. How may I help you?"' };

const SURFACES = [
  { id: 'ask', label: 'Ask' },
  { id: 'records', label: 'Records' },
  { id: 'act', label: 'Act' },
  { id: 'explain', label: 'Explain' },
  { id: 'conclude', label: 'File' },
  { id: 'close', label: 'Close' },
];

// No score anywhere. Nobody tells an agent the company's reputation is
// 58/100; there is no such conversation in the job. What the player gets
// is the state of their own desk -- who they know, what is still open.
// See LORE.md: metrics reach the player as observations from named
// people, never as a dashboard.
function ClockIn({ shiftNumber, roster, pending, onStart }) {
  return (
    <div style={S.body}>
      <p style={S.kicker}>SHIFT {shiftNumber} · FRONT DESK</p>
      <h1 style={S.h1}>Call Center #2</h1>
      <p style={S.prose}>
        Translocation &amp; Logistics Cooperative. Village of Import. The candle is whole,
        the line is not empty, and nobody on it has told you their name yet.
      </p>
      <div style={S.panel}>
        <p style={S.label}>POSTED THIS MORNING</p>
        <p style={{ ...S.prose, color: C.t2 }}>
          {roster > 0
            ? <> {roster} customers know your name.</>
            : <> No one on the roster yet — this is your first shift.</>}
        </p>
        {pending > 0 && (
          <p style={{ ...S.prose, color: C.gold, fontSize: 14 }}>
            {pending} ticket{pending > 1 ? 's' : ''} still pending follow-up.
          </p>
        )}
      </div>
      <button style={S.primary} onClick={onStart}>LIGHT THE CANDLE</button>
    </div>
  );
}

function TheLine({ queue, index, candleLeft, onPickUp }) {
  const waiting = queue.slice(index + 1, index + 3);
  return (
    <div style={S.body}>
      <h2 style={S.h2}>THE LINE</h2>
      <p style={S.prose}>
        {queue.length - index} interaction{queue.length - index === 1 ? '' : 's'} waiting.
        Discovering who is requesting help, why they do, and what you are capable of doing,
        before providing support is your goal.
      </p>
      <div style={{ ...bevel(C.goldDeep), padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 14, color: C.gold, letterSpacing: 1.5 }}>
            ◆ LINE ONE · RINGING
          </span>
          <span style={{ fontFamily: DISPLAY, fontSize: 14, color: C.muted }}>HELD 00:04</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={S.portrait}>ART<br />PENDING</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 24, color: C.muted }}>Unidentified caller</span>
            <span style={{ fontSize: 13.5, color: C.mutest, lineHeight: 1.4 }}>
              Ward signature present but unmatched. Everything else, you get by asking.
            </span>
          </div>
        </div>
        <button style={S.primary} onClick={onPickUp} disabled={candleLeft <= 0}>PICK UP</button>
      </div>
      {waiting.map((t, i) => (
        <div key={t.id} style={S.waiting}>
          <div style={{ ...S.portrait, width: 28, height: 38, flex: '0 0 28px', fontSize: 8 }}>—</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 17, color: C.t3 }}>
              Line {i === 0 ? 'two' : 'three'} · waiting
            </div>
            <div style={{ fontSize: 12.5, color: C.mutest }}>No ward signature. Nothing else offered.</div>
          </div>
          <span style={{ fontFamily: DISPLAY, fontSize: 13, color: C.mutest }}>
            HELD {i === 0 ? '02:11' : '05:40'}
          </span>
        </div>
      ))}
      <p style={{ ...S.prose, fontSize: 13.5, color: C.mutest, marginTop: 'auto', fontStyle: 'italic' }}>
        On the desk you see scratched: History doesn&rsquo;t repeat itself, but it does rhyme.
      </p>
    </div>
  );
}

function AskRow({ glyph, glyphColor, label, note, cost, used, onClick, affordable }) {
  const dead = used || !affordable;
  return (
    <button
      style={{ ...S.row, ...(used ? S.rowUsed : {}), ...(dead && !used ? { opacity: .5, cursor: 'default' } : {}) }}
      onClick={dead ? undefined : onClick}
      disabled={dead}
    >
      <span style={{ ...S.glyph, color: glyphColor }}>{glyph}</span>
      <span style={{ flex: 1 }}>
        {label}
        {note && <span style={S.note}>{note}</span>}
      </span>
      {cost > 0 && (
        <span style={S.pips}>
          {Array.from({ length: cost }).map((_, i) => (
            <span key={i} style={affordable ? S.pip : S.pipOff} />
          ))}
        </span>
      )}
    </button>
  );
}

export default function CallCenterPrototype() {
  const rng = Math.random;

  const [screen, setScreen] = useState('clockin'); // clockin | line | call | summary
  const [shiftNumber, setShiftNumber] = useState(1);
  const [reputation, setReputation] = useState(50);
  const [commendations, setCommendations] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [pendingFollowUps, setPendingFollowUps] = useState([]);
  const [shift, setShift] = useState(null);
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState([]);
  const [lastSummary, setLastSummary] = useState(null);
  const [candleLeft, setCandleLeft] = useState(SHIFT_CANDLE_NOTCHES);

  // --- per-call state. The five phases are SURFACES, not a corridor:
  // everything below stays revisable while the call is open.
  const [greeted, setGreeted] = useState(null);   // greeting id, or null
  const [surface, setSurface] = useState('ask');  // which surface is showing
  const feedRef = React.useRef(null);
  const [requestKnown, setRequestKnown] = useState(false); // did they actually say what they need
  const [probes, setProbes] = useState(0);
  const [klass, setKlass] = useState(null);       // revisable at any time
  const [asked, setAsked] = useState([]);
  const [result, setResult] = useState(null);     // resolveInvestigation record
  const [feed, setFeed] = useState([]);

  const ticket = shift && shift.tickets[index];
  const customer = ticket && shift.customerPool.find((c) => c.id === ticket.customerId);
  const investigation = ticket && ticket.investigation;
  // Has the agent done their own homework before sending the customer off?
  const spent = ticket ? inquiriesSpent(ticket, asked, probes) : 0;
  const inquiriesLeft = Math.max(0, CALL_INQUIRY_BUDGET - spent);
  const affords = (action) => ticket ? canAfford(ticket, asked, probes, action) : false;

  // You know who you are speaking to once you have ASKED. Greeting
  // somebody does not tell you who they are.
  const knowsWho = asked.includes('askName');

  // Which options belong to the surface being shown. Every surface stays
  // reachable; only one is on screen.
  const surfaceActions = (kind) => {
    if (!investigation) return [];
    if (kind === 'ask') {
      return investigation.actions.filter((a) => a.kind === 'investigative' && a.source === 'ask');
    }
    if (kind === 'records') {
      return investigation.actions.filter((a) => a.kind === 'investigative' && a.source === 'records');
    }
    return investigation.actions.filter((a) => a.kind === kind);
  };

  const surfaceDone = (id) => {
    if (id === 'conclude') return (klass ? 1 : 0) + (result ? 1 : 0);
    if (id === 'close') return 0;
    const kind = { ask: 'ask', records: 'records', act: 'supportive', explain: 'wrapup' }[id];
    return surfaceActions(kind).filter((a) => asked.includes(a.id)).length;
  };

  const checkedAnyRecord = Boolean(investigation) && asked.some((id) => {
    const a = investigation.actions.find((x) => x.id === id);
    return a && a.source === 'records';
  });

  const startShift = () => {
    const s = generateShift({
      knownCustomers: customers, baseTicketCount: 8,
      currentShiftId: shiftNumber, pendingFollowUps, rng,
    });
    setShift(s); setCustomers(s.fullRoster); setPendingFollowUps(s.stillPendingFollowUps);
    setIndex(0); setOutcomes([]); setCandleLeft(SHIFT_CANDLE_NOTCHES);
    setScreen('line');
  };

  const resetCall = () => {
    setGreeted(null); setKlass(null); setAsked([]); setResult(null); setFeed([]);
    setRequestKnown(false); setProbes(0); setSurface('ask');
  };

  const spend = (n) => setCandleLeft((left) => Math.max(0, left - n));

  // Greeting opens the call. It does NOT reliably get you the reason
  // they rang -- they may lead with the wait, the past, the product, or
  // with feeling. Getting to the request is work. See LORE.md,
  // "Ticket Resolution," phase 1.
  const greet = () => {
    setGreeted(GREETING.id);
    const memory = customer ? recallMemory(customer, shiftNumber, rng) : null;
    const opening = rollOpening(customer, memory, rng);
    const entries = [{ speaker: 'YOU', tint: C.muted, rule: C.bevelIn, body: GREETING.label }];
    if (opening.mode === 'request') {
      entries.push({ speaker: 'CALLER', tint: C.t3, rule: C.steel, body: blurbFor(ticket) });
      setRequestKnown(true);
    } else if (opening.mode === 'history' && memory) {
      entries.push({ speaker: 'CALLER', tint: C.gold, rule: C.goldDeep, body: memoryLine(memory) });
    } else {
      entries.push({ speaker: 'CALLER', tint: C.t3, rule: C.steel,
        body: openingLine(opening.mode, registerOf(customer), familiarityOf(customer)) });
    }
    setFeed(entries);
  };

  // Free in candle. Costs the caller's patience, not the player's clock.
  const probe = () => {
    if (!affords(null)) return;
    const landed = probeForRequest(probes, rng);
    setProbes((n) => n + 1);
    setFeed((f) => [
      ...f,
      { speaker: 'YOU', tint: C.muted, rule: C.bevelIn, body: 'What can I help you with today?' },
      landed
        ? { speaker: 'CALLER', tint: C.t3, rule: C.steel, body: blurbFor(ticket) }
        : { speaker: 'CALLER', tint: C.mutest, rule: C.bevelIn, body: PROBE_MISSES[probes % PROBE_MISSES.length] },
    ]);
    if (landed) setRequestKnown(true);
  };

  const investigate = (action) => {
    if (asked.includes(action.id) || !affords(action)) return;
    setAsked((prev) => [...prev, action.id]);

    if (action.source === 'ask') {
      // Something was SAID. You put it one of several ways; they answer
      // in their own words.
      setFeed((f) => [
        ...f,
        { speaker: 'YOU', tint: C.muted, rule: C.bevelIn, body: spokenLine(action, customer, ticket) },
        { speaker: 'CALLER', tint: C.t3, rule: C.steel, body: action.clue },
      ]);
      return;
    }
    // Something was LOOKED AT. Nobody spoke.
    setFeed((f) => [...f, {
      speaker: action.label, tint: C.mutest, rule: C.ruleSoft, lookup: true, body: action.clue,
    }]);
  };

  const classify = (category) => {
    setKlass(category);
    setFeed((f) => [...f, { speaker: 'YOU · FILED AS', tint: C.gold, rule: C.goldDeep,
      body: `${category}${klass && klass !== category ? ` (was ${klass})` : ''}` }]);
  };

  const diagnose = (d) => {
    const r = resolveInvestigation(ticket, asked, d.id);
    setResult(r);
    setFeed((f) => [...f, { speaker: 'YOU · DIAGNOSIS', tint: C.t2, rule: C.bevelIn, body: d.label }]);
  };

  const dispose = (status) => {
    const quality = result ? result.quality : 'adequate';
    // The day goes by while the work gets done. A longer call is simply
    // longer -- nobody is charged per question.
    const used = inquiriesSpent(ticket, asked, probes);
    const { customer: updated, outcome } = resolveTicket(
      ticket, customer, quality, status, shiftNumber, used,
    );
    spend(outcome.duration);
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? c : c)).map((c) => (c.id === updated.id ? updated : c)));
    // questionLoad is what being thorough actually costs: an input to
    // the Experience axis once Phase 1 gives the vector real values.
    const questionLoad = investigationTimeCost(ticket, asked) + probes;
    // Sending them off to do our legwork lands on the relationship --
    // hard if we hadn't looked first, softer if we had.
    const askCost = askRelationshipCost(ticket, asked);
    setOutcomes((prev) => [...prev, {
      ...outcome, classification: klass, standing: result && result.standing,
      questionLoad, unearnedAsks: askCost.unearnedAsks,
    }]);
    resetCall();

    // The work does not run out. A support centre always has more
    // waiting, so the DAY is what ends -- not the queue. See LORE.md,
    // "the queue is not a pressure mechanic."
    const spentAfter = Math.max(0, candleLeft - outcome.duration);
    if (spentAfter <= 0) {
      const done = [...outcomes, { ...outcome, classification: klass }];
      const res = endShift(done, reputation, shiftNumber, rng);
      setReputation(res.reputation);
      setCommendations((c) => c + res.commendationsEarned);
      setPendingFollowUps((prev) => [...prev, ...res.pendingFollowUps]);
      setLastSummary(res.summary);
      setScreen('summary');
    } else {
      setIndex((i) => i + 1);
      setScreen('line');
    }
  };

  // Top the queue up so it is never empty. Real work keeps arriving; the
  // player only ever sees the front of it.
  useEffect(() => {
    if (!shift || screen !== 'line') return;
    if (shift.tickets.length - index > 3) return;
    const more = generateShift({
      knownCustomers: customers, baseTicketCount: 8,
      currentShiftId: shiftNumber, pendingFollowUps: [], rng,
    });
    setShift((prev) => ({
      ...prev,
      tickets: [...prev.tickets, ...more.tickets],
      customerPool: [...prev.customerPool, ...more.customerPool],
    }));
    setCustomers(more.fullRoster);
  }, [shift, screen, index]);

  // Keep the latest exchange in view rather than letting the page grow.
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [feed]);

  const nextShift = () => { setShiftNumber((n) => n + 1); setShift(null); setScreen('clockin'); };

  const stage = candleStage(candleLeft);

  return (
    <div style={S.frame}>
      <div style={S.bar}>
        <span style={S.barLeft}>☎ TLC · SUPPORT CENTER</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {screen === 'call' && (
            <span style={S.marks} title="inquiries left on this call">
              {Array.from({ length: CALL_INQUIRY_BUDGET }).map((_, i) => (
                <span key={i} style={i < inquiriesLeft ? S.mark : S.markSpent} />
              ))}
            </span>
          )}
          <span style={S.barRight}>{stage.toUpperCase()}</span>
        </span>
      </div>

      {screen === 'clockin' && (
        <ClockIn shiftNumber={shiftNumber}
          roster={customers.length} pending={pendingFollowUps.length} onStart={startShift} />
      )}

      {screen === 'line' && shift && (
        <TheLine queue={shift.tickets} index={index} candleLeft={candleLeft}
          onPickUp={() => { resetCall(); setScreen('call'); }} />
      )}

      {screen === 'call' && ticket && customer && (
        <div style={S.callBody}>
          {/* Caller header. Nothing is revealed before the greeting. */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={S.portrait}>ART<br />PENDING</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontFamily: DISPLAY, fontSize: 24, color: greeted ? C.hi : C.muted }}>
                {knowsWho ? `A ${customer.archetype}` : 'Unidentified caller'}
              </span>
              <span style={{ fontSize: 13, color: C.mutest }}>
                {knowsWho ? CUSTOMER_TYPES[customer.tier].label : 'Ward signature present but unmatched.'}
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ ...S.tag, color: knowsWho ? C.ink : C.muted,
                  background: knowsWho ? 'linear-gradient(180deg,#a8c4dc,#7fa2c2)' : 'transparent',
                  boxShadow: knowsWho ? 'none' : `inset 0 0 0 1px ${C.ruleSoft}` }}>
                  {knowsWho ? CUSTOMER_TYPES[customer.tier].label.toUpperCase() : 'CHANNEL: UNKNOWN'}
                </span>
                <span style={{ ...S.tag, color: klass ? C.gold : C.muted,
                  boxShadow: `inset 0 0 0 1px ${klass ? C.goldDeep : C.ruleSoft}` }}>
                  {(klass || 'unclassified').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Transcript — scrolls in place; the page does not grow. */}
          <div style={S.feedScroll} ref={feedRef}>
          <div style={S.feed}>
            <div style={{ ...S.entry, boxShadow: `inset 0 0 0 1px ${C.ink}, inset 0 0 0 2px ${C.bevelIn}` }}>
              <p style={{ ...S.speaker, color: C.mutest }}>LINE ONE · CONNECTED</p>
              <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.5 }}>
                A channel, and a ward signature the registry cannot match.
              </p>
            </div>
            {feed.map((e, i) => (e.lookup ? (
              <div key={i} style={S.lookup}>
                <span style={S.lookupLabel}>{e.speaker}</span>
                <span style={S.lookupBody}>{e.body}</span>
              </div>
            ) : (
              <div key={i} style={{ ...S.entry, boxShadow: `inset 0 0 0 1px ${C.ink}, inset 0 0 0 2px ${e.rule}` }}>
                <p style={{ ...S.speaker, color: e.tint }}>{e.speaker}</p>
                <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.5 }}>{e.body}</p>
              </div>
            )))}
          </div>
          </div>

          {/* --- SURFACES ---------------------------------------------
              All of these stay AVAILABLE at all times -- that is the
              non-linearity rule, and it is about what the player may do,
              not about what must be on screen at once. An earlier build
              rendered every surface simultaneously: 37 controls on a
              393px phone. Available is not the same as visible.

              Pick a surface, act on it, switch whenever you like. No
              order is imposed and nothing closes behind you. --------- */}
          {!greeted ? (
            <div style={S.menu}>
              <AskRow glyph="▸" glyphColor={C.gold} label={GREETING.label}
                cost={0} used={false} affordable onClick={greet} />
            </div>
          ) : (
            <>
              <div style={S.surfaceBar}>
                {SURFACES.map((sf) => {
                  const on = surface === sf.id;
                  const done = surfaceDone(sf.id);
                  return (
                    <button key={sf.id} onClick={() => setSurface(sf.id)}
                      style={{ ...S.surfaceTab, ...(on ? S.surfaceTabOn : {}) }}>
                      {sf.label}
                      {done > 0 && <span style={S.surfaceCount}>{done}</span>}
                    </button>
                  );
                })}
              </div>

              <div style={S.menu}>
                {surface === 'ask' && (
                  <>
                    {!requestKnown && (
                      <AskRow glyph={affords(null) ? '▸' : '·'} glyphColor={affords(null) ? C.gold : C.off}
                        label="Ask what brought them in today"
                        cost={PROBE_INQUIRY_COST} used={false}
                        affordable={affords(null)} onClick={probe} />
                    )}
                    {surfaceActions('ask').filter((a) => askMakesSense(a.id, requestKnown)).map((a) => (
                      <AskRow key={a.id} glyph={asked.includes(a.id) ? '✓' : (affords(a) ? '▸' : '·')}
                        glyphColor={asked.includes(a.id) ? C.sage : (affords(a) ? (checkedAnyRecord ? C.gold : C.rose) : C.off)}
                        label={a.label} cost={a.timeCost} used={asked.includes(a.id)}
                        affordable={affords(a)} onClick={() => investigate(a)} />
                    ))}
                  </>
                )}

                {surface === 'records' && surfaceActions('records').map((a) => (
                  <AskRow key={a.id} glyph={asked.includes(a.id) ? '✓' : (affords(a) ? '▸' : '·')}
                    glyphColor={asked.includes(a.id) ? C.sage : (affords(a) ? C.gold : C.off)}
                    label={a.label} cost={a.timeCost} used={asked.includes(a.id)}
                    affordable={affords(a)} onClick={() => investigate(a)} />
                ))}

                {surface === 'act' && surfaceActions('supportive').map((a) => (
                  <AskRow key={a.id} glyph={asked.includes(a.id) ? '✓' : (affords(a) ? '▸' : '·')}
                    glyphColor={asked.includes(a.id) ? C.sage : (affords(a) ? C.gold : C.off)}
                    label={a.label} cost={a.timeCost} used={asked.includes(a.id)}
                    affordable={affords(a)} onClick={() => investigate(a)} />
                ))}

                {surface === 'explain' && surfaceActions('wrapup').map((a) => (
                  <AskRow key={a.id} glyph={asked.includes(a.id) ? '✓' : (affords(a) ? '▸' : '·')}
                    glyphColor={asked.includes(a.id) ? C.sage : (affords(a) ? C.gold : C.off)}
                    label={a.label} cost={a.timeCost} used={asked.includes(a.id)}
                    affordable={affords(a)} onClick={() => investigate(a)} />
                ))}

                {surface === 'conclude' && (
                  <>
                    <p style={S.label}>FILE IT AS</p>
                    {TICKET_TEMPLATES[customer.tier].map((t) => (
                      <AskRow key={t.category} glyph={klass === t.category ? '✓' : '▸'}
                        glyphColor={klass === t.category ? C.sage : C.gold}
                        label={t.category} cost={0} used={false} affordable
                        onClick={() => classify(t.category)} />
                    ))}
                    {investigation && (
                      <>
                        <p style={{ ...S.label, marginTop: 8 }}>YOUR ANSWER</p>
                        {investigation.diagnoses.map((d) => (
                          <AskRow key={d.id} glyph={result && result.id === d.id ? '✓' : '▸'}
                            glyphColor={C.gold} label={d.label} cost={0} used={false} affordable
                            onClick={() => diagnose(d)} />
                        ))}
                      </>
                    )}
                  </>
                )}

                {surface === 'close' && STATUS_OPTIONS.map((o) => (
                  <AskRow key={o.status} glyph="▸" glyphColor={C.gold} label={o.label}
                    note={o.hint} cost={0} used={false} affordable
                    onClick={() => dispose(o.status)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {screen === 'summary' && (
        <div style={S.body}>
          <p style={S.kicker}>SHIFT {shiftNumber} · CLOSED</p>
          <h1 style={S.h1}>{candleLeft <= 0 ? 'CANDLE OUT' : 'LINE EMPTY'}</h1>
          <div style={S.panel}>
            <p style={S.label}>WHAT YOU DID</p>
            <p style={{ ...S.prose, color: C.t2 }}>
              You took <strong style={{ color: C.hi }}>{lastSummary ? lastSummary.ticketsHandled : 0}</strong>{' '}
              call{(lastSummary ? lastSummary.ticketsHandled : 0) === 1 ? '' : 's'}.
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14.5, lineHeight: 1.8, color: C.dim }}>
              {STATUS_OPTIONS.map((o) => {
                const n = (lastSummary && lastSummary.statusCounts[o.status]) || 0;
                if (!n) return null;
                return <li key={o.status}>{n} {SUMMARY_STATUS_PHRASING[o.status]}</li>;
              })}
            </ul>
            <p style={{ ...S.prose, fontSize: 13.5, color: C.mutest, fontStyle: 'italic' }}>
              How any of them felt about it is not known yet. That comes back later, through
              a survey, through your manager — or not at all.
            </p>
          </div>
          <button style={S.secondary} onClick={nextShift}>GO HOME FOR THE NIGHT</button>
        </div>
      )}
    </div>
  );
}
