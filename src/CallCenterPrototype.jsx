import React, { useState, useMemo, useCallback } from 'react';

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

// Phantom Inventory as a CATEGORY TEMPLATE -- six root causes, three of
// which are not really Phantom Inventory at all. Mirrors gameLogic.js
// exactly. See LORE.md, "Ticket Content -- Categories, Sub-Variables,
// and the Telling."
const PHANTOM_INVENTORY_TEMPLATE = {
  category: 'Phantom Inventory',
  openingStatement: "I ordered 40 healing potions for the festival, and now you're telling me I don't have them?! Where did they go?",

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
    { id: 'manifest', kind: 'investigative', source: 'records', label: 'Check what we shipped', timeCost: 1 },
    { id: 'courierRecord', kind: 'investigative', source: 'records', label: "Check the Courier's delivery report", timeCost: 1 },
    { id: 'nodeReceipt', kind: 'investigative', source: 'records', label: 'Check whether the Node posted receipt', timeCost: 1 },
    { id: 'drawRecord', kind: 'investigative', source: 'records', label: 'Check for a Caravan draw against the lot', timeCost: 2 },
    { id: 'holdRegister', kind: 'investigative', source: 'records', label: 'Check the hold register', timeCost: 1 },
    { id: 'askCount', kind: 'investigative', source: 'ask', label: 'Ask them to go and count the shelf', timeCost: 3 },
    { id: 'askReceiving', kind: 'investigative', source: 'ask', label: 'Ask who received it and who shelved it', timeCost: 2 },
    { id: 'askLedger', kind: 'investigative', source: 'ask', label: 'Ask them to check their own sales ledger', timeCost: 3 },
    { id: 'askIntake', kind: 'investigative', source: 'ask', label: 'Ask what else came in that week — returns, buy-ins', timeCost: 2 },

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
    { id: 'theft', label: 'Someone with stockroom access has taken them' },
    { id: 'lostTransit', label: 'The shipment was lost in transit' },
  ],

  rootCauses: [
    {
      // Invisible to TLC. Their sale, their ledger, their omission.
      id: 'unlogged-sale',
      aptSupport: ['nameTheirAction', 'explainCause'],
      weight: 3,
      trueCategory: 'Phantom Inventory',
      trueDomain: 'Quantity',
      diagnosisId: 'unloggedSale',
      keyActionIds: ['askLedger'],
      redHerringActionId: 'askReceiving',
      clues: {
        manifest: 'All 40 shipped, logged correctly.',
        courierRecord: 'Handed over and signed for three days ago.',
        nodeReceipt: 'Receipt posted the same day, in order.',
        drawRecord: 'No draw against this lot.',
        holdRegister: 'No hold on record.',
        askCount: 'They come back with three. Same as the shelf said.',
        askReceiving: 'Their apprentice receives most mornings and shelves the same day.',
        askLedger: 'A festival order went out two days ago — nobody entered it.',
        askIntake: 'Nothing else came in that week.',
        nameTheirAction: 'You mention that entering sales as they go keeps the listing current.',
        explainCause: 'You walk them through it: the stock left, it sold, nobody wrote it down. They follow it.',
      },
    },
    {
      // Solvable entirely from our own records.
      id: 'split-lot',
      aptSupport: ['requestRedraw', 'setExpectation', 'explainCause'],
      weight: 2,
      trueCategory: 'Phantom Inventory',
      trueDomain: 'Quantity',
      diagnosisId: 'splitLot',
      keyActionIds: ['courierRecord', 'drawRecord'],
      clues: {
        manifest: 'One lot of 40 — and the courier stamp is on it twice.',
        courierRecord: 'Only four were handed over. Not forty.',
        nodeReceipt: 'Receipt posted for four units. Four.',
        drawRecord: 'A Caravan draw moved 36 to the Constabulary that same morning.',
        holdRegister: 'No hold on record.',
        askCount: 'Four on the shelf.',
        askReceiving: 'The owner took it in personally. Nobody else touched it.',
        askLedger: 'Nothing unusual in their sales.',
        askIntake: 'Nothing else came in.',
        requestRedraw: 'Recall raised against the Constabulary draw. It will take days, not hours.',
        setExpectation: 'You tell them the recall takes days and they will hear from us, not the other way round.',
        explainCause: 'You explain the double stamp plainly. They are furious at the stamp, not at you.',
      },
    },
    {
      // Chain of custody. Received by one, shelved by another, entered
      // by nobody -- and TLC cannot see any of those three steps.
      id: 'shelved-not-entered',
      aptSupport: ['nameTheirAction', 'explainCause'],
      weight: 3,
      trueCategory: 'Phantom Inventory',
      trueDomain: 'Quantity',
      diagnosisId: 'shelvedNotEntered',
      keyActionIds: ['askReceiving'],
      redHerringActionId: 'askIntake',
      clues: {
        manifest: 'All 40 shipped.',
        courierRecord: 'Signed for. The signature is a mark, not a name.',
        nodeReceipt: 'Receipt posted, on time, by the Node.',
        drawRecord: 'No draw against this lot.',
        holdRegister: 'No hold on record.',
        askCount: 'They find forty. They sound less certain than they did.',
        askReceiving: 'A casual hand took it in and stacked it. Nobody entered it in the book.',
        askLedger: 'Their ledger has no record of it arriving at all.',
        askIntake: 'A crate of returns came back the same week.',
        nameTheirAction: 'You mention that receiving and entering on the same day closes the gap.',
        explainCause: 'You explain that it arrived and was shelved and nobody wrote it down. They go quiet.',
      },
    },
    {
      // Not phantom inventory. Nothing is missing yet.
      id: 'second-leg-in-transit',
      aptSupport: ['setExpectation'],
      weight: 2,
      trueCategory: 'Bulk Potion Order Delay',
      trueDomain: 'Fulfillment',
      diagnosisId: 'secondLeg',
      keyActionIds: ['manifest'],
      clues: {
        manifest: 'Booked as a two-leg Priority Relay. This is leg one of two.',
        courierRecord: 'Leg one handed over. Leg two is not due until tomorrow.',
        nodeReceipt: 'Receipt posted for leg one. Leg two is still outstanding.',
        drawRecord: 'No draw against this lot.',
        holdRegister: 'No hold on record.',
        askCount: 'The count matches leg one precisely.',
        askReceiving: 'Received and shelved the same day, no trouble.',
        askLedger: 'Nothing unusual.',
        askIntake: 'Nothing else came in.',
        setExpectation: 'You tell them leg two lands tomorrow. Nothing else is required of anyone.',
      },
    },
    {
      // Not phantom inventory. It is on the shelf under the wrong name.
      id: 'misfiled-at-intake',
      aptSupport: ['correctListing', 'nameTheirAction'],
      weight: 2,
      trueCategory: 'Storefront Listing Error',
      trueDomain: 'Accounts',
      diagnosisId: 'misfiled',
      keyActionIds: ['askCount'],
      redHerringActionId: 'courierRecord',
      clues: {
        manifest: 'All 40 shipped, as Small.',
        courierRecord: 'Signed for by J. Marrow, the 11th.',
        nodeReceipt: 'Receipt posted in full — forty, acknowledged.',
        drawRecord: 'No draw against this lot.',
        holdRegister: 'No hold on record.',
        askCount: 'Forty are there — stacked under Large. Their listing cannot see them.',
        askReceiving: 'Shelved by whoever was free that afternoon.',
        askLedger: 'Nothing unusual.',
        askIntake: 'Nothing else came in.',
        correctListing: 'You reclassify the lot from Large to Small. Their listing finds forty units immediately.',
        nameTheirAction: 'You mention that Large and Small ship under separate labels.',
      },
    },
    {
      // Ours to see, and only ours.
      id: 'constabulary-hold',
      aptSupport: ['holdReference', 'setExpectation'],
      weight: 1,
      trueCategory: 'Goods Under Hold',
      trueDomain: 'Fulfillment',
      diagnosisId: 'underHold',
      keyActionIds: ['holdRegister'],
      clues: {
        manifest: 'All 40 shipped.',
        courierRecord: 'Delivered and signed for.',
        nodeReceipt: 'Receipt posted, with the hold noted against it.',
        drawRecord: 'No draw against this lot.',
        holdRegister: 'A Constabulary hold was placed on the lot the day it landed.',
        askCount: 'The crates are there, sealed and tagged. Not theirs to open.',
        askReceiving: 'Received and left sealed, as instructed.',
        askLedger: 'Nothing unusual.',
        askIntake: 'Nothing else came in.',
        holdReference: 'You pull the hold reference. It is the Constabulary they need now, not us.',
        setExpectation: 'You are honest that we cannot say how long a hold runs. They do not enjoy hearing it.',
      },
    },
    {
      // TLC is an accidental MONOPOLY -- there is no rival carrier, so
      // "somebody else shipped it" is not a thing that can happen. What
      // can happen is that goods never moved through the network at
      // all: an adventurer walked in with a haul and sold it over the
      // counter. Nothing to ship, nothing to record.
      id: 'counter-bought',
      aptSupport: ['nameTheirAction', 'explainCause'],
      weight: 2,
      trueCategory: 'Counter-Bought Stock',
      trueDomain: 'Accounts',
      diagnosisId: 'notOurs',
      keyActionIds: ['manifest', 'askIntake'],
      clues: {
        manifest: 'No shipment of that size to this account. Nothing to ship means nothing to find.',
        courierRecord: 'No delivery report. Nothing ever moved.',
        nodeReceipt: 'No receipt. There was nothing for the Node to receive.',
        drawRecord: 'No draw against a lot we do not have.',
        holdRegister: 'No hold on record.',
        askCount: 'Three on the shelf, as they said.',
        askReceiving: 'Nobody remembers taking a TLC delivery that week.',
        askLedger: 'The forty were entered as stock. No supplier against them.',
        askIntake: 'An adventurer came in with a haul three weeks ago. They bought the lot over the counter and never wrote down who.',
        nameTheirAction: 'You mention that counter purchases need a supplier recorded against them.',
        explainCause: 'You explain that nothing shipped because nothing was ever sent. It takes a moment to land.',
      },
    },
  ],
};


/**
 * Picks which root cause this instance of the ticket actually has.
 * @param {object} template
 * @param {function} [rng=Math.random]
 */
// Asking someone to do your legwork before you have done your own is
// unearned, and costs the relationship. Mirrors gameLogic.js.
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

const TICKET_TEMPLATES = {
  endUser: [
    { category: 'Cursed Item Return', domain: 'Returns', weight: 3, baseUrgency: 2 },
    { category: 'Quest Line Bug', domain: 'Quality', weight: 2, baseUrgency: 3 },
    { category: 'Respawn Delay', domain: 'Service', weight: 3, baseUrgency: 4 },
    { category: 'XP Miscount Dispute', domain: 'Accounts', weight: 2, baseUrgency: 1 },
  ],
  business: [
    { category: 'Bulk Potion Order Delay', domain: 'Fulfillment', weight: 2, baseUrgency: 3 },
    { category: 'Border Ward Malfunction', domain: 'Repairs', weight: 1, baseUrgency: 5 },
    { category: 'Garrison Supply Shortfall', domain: 'Fulfillment', weight: 2, baseUrgency: 3 },
  ],
  partner: [
    { category: 'Phantom Inventory', domain: 'Quantity', weight: 3, baseUrgency: 2, investigationTemplate: PHANTOM_INVENTORY_TEMPLATE },
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
  'Cursed Item Return': 'This ring won\u2019t come off and it whispers at night.',
  'Quest Line Bug': 'The old hermit keeps repeating the same line of dialogue.',
  'Respawn Delay': 'Been dead for twenty minutes. Party\u2019s waiting.',
  'XP Miscount Dispute': 'Certain that dragon was worth more than this.',
  'Bulk Potion Order Delay': 'The garrison infirmary is out of healing draughts.',
  'Border Ward Malfunction': 'The eastern ward flickered out for six minutes last night.',
  'Garrison Supply Shortfall': 'Rations haven\u2019t arrived in three days.',
  'Commission Payout Dispute': 'Last month\u2019s commission is short by a fair bit.',
  'Storefront Listing Error': '"Slightly Cursed Dagger" is listed as a kitchen utensil.',
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
// Mirrors gameLogic.js. The candle is the SHIFT TIMER -- it marks the
// day going by. The player never spends it, and nothing inside a call
// moves it. Being thorough costs the CALLER's patience (the Experience
// axis), never the clock. See LORE.md, "Running the Desk."
const SHIFT_CANDLE_NOTCHES = 12;
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

const RESOLUTION_STATUSES = ['resolved', 'hold', 'transfer'];

const DISPUTE_CHANCE_BY_QUALITY = { correct: 0.03, adequate: 0.12, rushed: 0.35, dismissive: 0.6 };
const HOLD_REASONS = ['internal', 'external'];
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
      investigation: template.investigationTemplate
        ? buildInvestigation(template.investigationTemplate, rollRootCause(template.investigationTemplate, rng))
        : undefined,
    });
  }

  const followUpTickets = dueFollowUps.map((f, i) => ({
    id: `followup-ticket-${i}-${f.id}`, customerId: f.customerId, category: f.category,
    urgency: clamp(FOLLOW_UP_BASE_URGENCY[f.kind] + draft.urgencyBonus, 1, 10),
    timeCostMultiplier: draft.timeCostMultiplier,
    isReturning: true, isFollowUp: true, followUpKind: f.kind,
    holdReason: f.kind === 'hold' ? pickOne(HOLD_REASONS, rng) : undefined,
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
function resolveTicket(ticket, customer, quality, status, shiftId) {
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
      cues: readCues(updatedCustomer, 'you'), visibleDelta: visible, followUp,
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
  frame: { minHeight: '100vh', background: `linear-gradient(180deg, ${C.mid}, ${C.deep})`,
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
  feed: { display: 'flex', flexDirection: 'column', gap: 9 },
  entry: { ...bevel(), padding: '12px 14px' },
  speaker: { fontFamily: DISPLAY, fontSize: 13, letterSpacing: 2, margin: '0 0 4px' },
  portrait: { width: 96, height: 126, flex: '0 0 96px', background: C.deep,
    boxShadow: `0 0 0 1px ${C.ink}, 0 0 0 2px ${C.steel}, 0 0 0 4px ${C.ink}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: DISPLAY, fontSize: 12, letterSpacing: 1.5, color: C.off, textAlign: 'center' },
  tag: { fontFamily: DISPLAY, fontSize: 12, letterSpacing: 1.5, padding: '3px 7px',
    borderRadius: 2, display: 'inline-block' },
  waiting: { display: 'flex', alignItems: 'center', gap: 10, opacity: .6, padding: '6px 2px' },
  marks: { display: 'flex', gap: 3, alignItems: 'center' },
  mark: { width: 5, height: 12, background: C.gold, borderRadius: 1 },
  markSpent: { width: 5, height: 12, background: C.off, borderRadius: 1 },
};

// UI-ONLY. The caller's opening line: an investigation ticket opens
// with its own statement, a follow-up with why they're calling back,
// everything else with its category blurb. gameLogic.js has no
// equivalent -- tickets there carry no text.
function blurbFor(ticket) {
  if (ticket.investigation) return ticket.investigation.openingStatement;
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

// UI-ONLY. The same inquiry, put six ways.
//
// An inquiry is an INTENT. These are the sentences it can be delivered
// in, and three of them are not questions at all. The information
// obtained is identical; what changes is how it lands on this
// particular person. See gameLogic's DELIVERIES / deliveryFit().
//
// `%s` is the intent's own subject -- "your name", "the shelf count",
// "who signed for it" -- so one set of forms serves every inquiry
// rather than writing six phrasings per action.
const DELIVERY_FORMS = {
  question: 'May I have %s?',
  plain: 'And %s?',
  directive: 'To proceed, please provide %s.',
  procedural: 'The next thing we need is %s.',
  reciprocal: "I'm %A, and %s?",
  transactional: 'Thank you for that. To continue we need %s.',
};

function phrase(deliveryId, subject, agentName) {
  const form = DELIVERY_FORMS[deliveryId] || DELIVERY_FORMS.plain;
  return form.replace('%s', subject).replace('%A', agentName || 'the front desk');
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
const GREETINGS = [
  { id: 'standard', label: '"TLC Support. How may I help you?"', cost: 0 },
  { id: 'name', label: 'Ask who you are speaking with first', cost: 0, getsName: true },
];

function ClockIn({ shiftNumber, reputation, commendations, roster, pending, onStart }) {
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
          Company reputation stands at <strong style={{ color: C.hi }}>{reputation}/100</strong>.
          {commendations > 0 && <> {commendations} commendations on file.</>}
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
    setRequestKnown(false); setProbes(0);
  };

  const spend = (n) => setCandleLeft((left) => Math.max(0, left - n));

  // Greeting opens the call. It does NOT reliably get you the reason
  // they rang -- they may lead with the wait, the past, the product, or
  // with feeling. Getting to the request is work. See LORE.md,
  // "Ticket Resolution," phase 1.
  const greet = (g) => {
    setGreeted(g.id);
    const memory = customer ? recallMemory(customer, shiftNumber, rng) : null;
    const opening = rollOpening(customer, memory, rng);
    const entries = [];
    if (g.getsName) {
      entries.push({ speaker: 'YOU', tint: C.muted, rule: C.bevelIn,
        body: 'Before we start — who am I speaking with?' });
    }
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
    setFeed((f) => [...f, { speaker: action.label.toUpperCase(), tint: C.t3, rule: C.steel, body: action.clue }]);
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
    const { customer: updated, outcome } = resolveTicket(ticket, customer, quality, status, shiftNumber);
    // One notch per call taken. A thorough call and a rushed one cost
    // the same clock -- what thoroughness costs is the caller's
    // patience, tracked as question load below.
    spend(1);
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

    const spentAfter = Math.max(0, candleLeft - 1);
    const more = index + 1 < shift.tickets.length;
    if (!more || spentAfter <= 0) {
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
        <ClockIn shiftNumber={shiftNumber} reputation={reputation} commendations={commendations}
          roster={customers.length} pending={pendingFollowUps.length} onStart={startShift} />
      )}

      {screen === 'line' && shift && (
        <TheLine queue={shift.tickets} index={index} candleLeft={candleLeft}
          onPickUp={() => { resetCall(); setScreen('call'); }} />
      )}

      {screen === 'call' && ticket && customer && (
        <div style={S.body}>
          {/* Caller header. Nothing is revealed before the greeting. */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={S.portrait}>ART<br />PENDING</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontFamily: DISPLAY, fontSize: 24, color: greeted ? C.hi : C.muted }}>
                {greeted ? `A ${customer.archetype}` : 'Unidentified caller'}
              </span>
              <span style={{ fontSize: 13, color: C.mutest }}>
                {greeted ? CUSTOMER_TYPES[customer.tier].label : 'Ward signature present but unmatched.'}
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ ...S.tag, color: greeted ? C.ink : C.muted,
                  background: greeted ? 'linear-gradient(180deg,#a8c4dc,#7fa2c2)' : 'transparent',
                  boxShadow: greeted ? 'none' : `inset 0 0 0 1px ${C.ruleSoft}` }}>
                  {greeted ? CUSTOMER_TYPES[customer.tier].label.toUpperCase() : 'CHANNEL: UNKNOWN'}
                </span>
                <span style={{ ...S.tag, color: klass ? C.gold : C.muted,
                  boxShadow: `inset 0 0 0 1px ${klass ? C.goldDeep : C.ruleSoft}` }}>
                  {(klass || 'unclassified').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div style={S.feed}>
            <div style={{ ...S.entry, boxShadow: `inset 0 0 0 1px ${C.ink}, inset 0 0 0 2px ${C.bevelIn}` }}>
              <p style={{ ...S.speaker, color: C.mutest }}>LINE ONE · CONNECTED</p>
              <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.5 }}>
                Someone is on the line. The registry offers a channel and a ward signature it
                cannot match. Everything else, you get by asking.
              </p>
            </div>
            {feed.map((e, i) => (
              <div key={i} style={{ ...S.entry, boxShadow: `inset 0 0 0 1px ${C.ink}, inset 0 0 0 2px ${e.rule}` }}>
                <p style={{ ...S.speaker, color: e.tint }}>{e.speaker}</p>
                <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.5 }}>{e.body}</p>
              </div>
            ))}
          </div>

          {/* --- Surfaces. All live at once; only the greeting gates. --- */}
          {!greeted ? (
            <div style={S.menu}>
              <p style={S.label}>OPEN THE CALL</p>
              {GREETINGS.map((g) => (
                <AskRow key={g.id} glyph="▸" glyphColor={C.gold} label={g.label}
                  cost={g.cost} used={false} affordable onClick={() => greet(g)} />
              ))}
            </div>
          ) : (
            <>
              {!requestKnown && (
                <div style={S.menu}>
                  <p style={S.label}>THEY HAVEN&rsquo;T SAID WHAT THEY NEED YET</p>
                  <AskRow glyph={affords(null) ? '▸' : '·'} glyphColor={affords(null) ? C.gold : C.off}
                    label="Ask what brought them in today"
                    note="Every surface below stays open — you can act without knowing. It rarely goes well."
                    cost={PROBE_INQUIRY_COST} used={false}
                    affordable={affords(null)} onClick={probe} />
                </div>
              )}

              <div style={S.menu}>
                <p style={S.label}>CLASSIFICATION — REVISABLE</p>
                {TICKET_TEMPLATES[customer.tier].map((t) => (
                  <AskRow key={t.category} glyph={klass === t.category ? '✓' : '▸'}
                    glyphColor={klass === t.category ? C.sage : C.gold}
                    label={t.category} cost={0} used={false} affordable
                    onClick={() => classify(t.category)} />
                ))}
              </div>

              {investigation && (
                <div style={S.menu}>
                  <p style={S.label}>OUR RECORDS — THE NETWORK REPORTS THESE</p>
                  {investigation.actions.filter((a) => a.kind === 'investigative' && a.source === 'records').map((a) => (
                    <AskRow key={a.id} glyph={asked.includes(a.id) ? '✓' : '▸'}
                      glyphColor={asked.includes(a.id) ? C.sage : C.gold}
                      label={a.label} cost={a.timeCost} used={asked.includes(a.id)}
                      affordable={affords(a)} onClick={() => investigate(a)} />
                  ))}

                  <p style={{ ...S.label, marginTop: 8, color: checkedAnyRecord ? C.muted : C.rose }}>
                    {checkedAnyRecord
                      ? 'ASK THEM TO GO AND LOOK'
                      : "ASK THEM TO GO AND LOOK \u2014 YOU HAVEN'T CHECKED OURS YET"}
                  </p>
                  {investigation.actions.filter((a) => a.kind === 'investigative' && a.source === 'ask').map((a) => (
                    <AskRow key={a.id} glyph={asked.includes(a.id) ? '✓' : '▸'}
                      glyphColor={asked.includes(a.id) ? C.sage : (checkedAnyRecord ? C.gold : C.rose)}
                      label={a.label}
                      note={asked.includes(a.id) ? undefined
                        : (checkedAnyRecord
                          ? 'Their time and their trouble.'
                          : "You'd be telling them you think they miscounted \u2014 and that you haven't looked.")}
                      cost={a.timeCost} used={asked.includes(a.id)}
                      affordable={affords(a)} onClick={() => investigate(a)} />
                  ))}

                  <p style={{ ...S.label, marginTop: 8 }}>DO SOMETHING FOR THEM</p>
                  {investigation.actions.filter((a) => a.kind === 'supportive').map((a) => (
                    <AskRow key={a.id} glyph={asked.includes(a.id) ? '✓' : (affords(a) ? '▸' : '·')}
                      glyphColor={asked.includes(a.id) ? C.sage : (affords(a) ? C.gold : C.off)}
                      label={a.label} cost={a.timeCost} used={asked.includes(a.id)}
                      affordable={affords(a)} onClick={() => investigate(a)} />
                  ))}

                  <p style={{ ...S.label, marginTop: 8 }}>TELL THEM WHAT HAPPENS NOW</p>
                  {investigation.actions.filter((a) => a.kind === 'wrapup').map((a) => (
                    <AskRow key={a.id} glyph={asked.includes(a.id) ? '✓' : (affords(a) ? '▸' : '·')}
                      glyphColor={asked.includes(a.id) ? C.sage : (affords(a) ? C.gold : C.off)}
                      label={a.label} cost={a.timeCost} used={asked.includes(a.id)}
                      affordable={affords(a)} onClick={() => investigate(a)} />
                  ))}
                </div>
              )}

              {investigation && (
                <div style={S.menu}>
                  <p style={S.label}>DIAGNOSIS — NOTHING IS DISABLED</p>
                  {investigation.diagnoses.map((d) => (
                    <AskRow key={d.id} glyph={result && result.id === d.id ? '✓' : '▸'}
                      glyphColor={C.gold} label={d.label} cost={0} used={false} affordable
                      onClick={() => diagnose(d)} />
                  ))}
                </div>
              )}

              <div style={S.menu}>
                <p style={S.label}>DISPOSITION OF TICKET</p>
                {STATUS_OPTIONS.map((o) => (
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
          <p style={{ ...S.prose, color: C.dim }}>
            Company reputation is now <strong style={{ color: C.hi }}>{reputation}/100</strong>.
          </p>
          <button style={S.secondary} onClick={nextShift}>GO HOME FOR THE NIGHT</button>
        </div>
      )}
    </div>
  );
}
