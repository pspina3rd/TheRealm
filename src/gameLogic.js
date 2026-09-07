/**
 * gameLogic.js
 * ------------------------------------------------------------------
 * Core simulation for the call-center RPG's shift loop:
 *
 *   generateShift()   -> build a shift: modifiers + procedural ticket queue
 *   resolveTicket()   -> apply a player's chosen response to a ticket
 *   endShift()        -> tally outcomes into company reputation + currency
 *
 * Design intent
 * -------------
 * - Every customer has a persistent `disposition` score (-100..100) and a
 *   `history` log. Nothing here decides HOW a customer feels beyond that
 *   score; UI/dialogue layers read `dispositionTag()` to pick tone/flavor.
 * - Ticket order within a shift is fully shuffled — a returning customer
 *   with a grudge can be caller #1 or the very last caller. Nothing in
 *   this module treats queue position as meaningful, by design.
 * - This file has NO rendering, storage, or randomness-seeding concerns.
 *   `rng` is injected so callers (and tests) can supply a deterministic
 *   function; production code can pass Math.random.
 *
 * All public functions are pure with respect to their arguments: none of
 * them mutate the objects passed in. Callers get back new objects.
 * ------------------------------------------------------------------
 */

// ---------------------------------------------------------------------
// Static content tables
// ---------------------------------------------------------------------

/** The three customer tiers, and the archetypes within each. */
const CUSTOMER_TYPES = {
  endUser: {
    label: 'End User',
    archetypes: ['Hero', 'Villain', 'NPC', 'Sidekick', 'Henchfolk'],
  },
  business: {
    label: 'Business Account',
    archetypes: ['Kingdom', 'Town Council', 'Constabulary', 'Military'],
  },
  partner: {
    label: 'Partner Vendor',
    archetypes: ['Tavern', 'Inn', 'Blacksmith', 'Potion Shop', 'Wandering Trader'],
  },
};

/**
 * Investigation content for the "Phantom Inventory" category — the
 * Phase 0 proof-of-concept for the Investigation Phase (see
 * LORE.md, "Ticket Resolution — Investigation Phase"). Deliberately
 * scoped to this one category; not a general pattern to copy onto
 * every ticket yet.
 *
 * `openingStatement` is what the customer actually perceives — never
 * the diagnosis itself. `actions` are the investigative moves the
 * player can take, each costing time and revealing one clue.
 * `keyActionId` names the one action that actually explains what
 * happened; only investigating it grounds the correct diagnosis
 * (see `resolveInvestigation()`). `diagnoses` are the responses the
 * player can commit to — exactly one is `correct`, and this ticket
 * deliberately has a genuine red herring (the stockroom-access clue)
 * per the "not every ticket has a trap" rule.
 */
/**
 * PHANTOM INVENTORY — a category template, not a script.
 *
 * The customer's symptom is always the same: the listing says one
 * number and the shelf says another. **What actually caused it is not.**
 * A single root cause per category is the lazy version and produces one
 * puzzle wearing different nouns — ask how many genuinely different
 * reasons there are for "I forgot my password" and the point makes
 * itself. Several of those are not password problems at all.
 *
 * Same principle here. **Three of the six causes below are not really
 * Phantom Inventory** — the goods are misfiled, still in transit, or
 * sitting under a hold. The customer cannot know that; they only know
 * what they can see. That is what makes the Classify phase a real
 * judgement instead of a label, and it rhymes directly with "Pigs is
 * Pigs" (see LORE.md, "Screening & Classification").
 *
 * The investigation ACTIONS stay the same across every cause. The
 * EVIDENCE they turn up does not. That is what makes this a puzzle the
 * player reads rather than a sequence they memorise.
 *
 * See LORE.md, "Ticket Content — Categories, Sub-Variables, and the
 * Telling."
 */
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
    { id: 'manifest', source: 'records', label: 'Check what we shipped', timeCost: 1 },
    { id: 'courierRecord', source: 'records', label: "Check the Courier's delivery report", timeCost: 1 },
    { id: 'nodeReceipt', source: 'records', label: "Check whether the Node posted receipt", timeCost: 1 },
    { id: 'drawRecord', source: 'records', label: 'Check for a Caravan draw against the lot', timeCost: 2 },
    { id: 'holdRegister', source: 'records', label: 'Check the hold register', timeCost: 1 },
    { id: 'askCount', source: 'ask', label: 'Ask them to go and count the shelf', timeCost: 3 },
    { id: 'askReceiving', source: 'ask', label: 'Ask who received it and who shelved it', timeCost: 2 },
    { id: 'askLedger', source: 'ask', label: 'Ask them to check their own sales ledger', timeCost: 3 },
    { id: 'askIntake', source: 'ask', label: 'Ask what else came in that week — returns, buy-ins', timeCost: 2 },
  ],

  diagnoses: [
    { id: 'unloggedSale', label: 'Your own sale went out without being entered' },
    { id: 'splitLot', label: 'A duplicated stamp split the lot — a Caravan draw took the rest' },
    { id: 'shelvedNotEntered', label: 'It was received and shelved, but never entered in your records' },
    { id: 'secondLeg', label: "Nothing is missing yet — the second leg hasn't landed" },
    { id: 'misfiled', label: "They're on your shelf, shelved under the wrong classification" },
    { id: 'underHold', label: "They're here and sealed — a hold was placed on them" },
    { id: 'notOurs', label: 'That stock never came from us — it came in off your counter' },
    { id: 'theft', label: 'Someone with stockroom access has taken them' },
    { id: 'lostTransit', label: 'The shipment was lost in transit' },
  ],

  rootCauses: [
    {
      // Invisible to TLC. Their sale, their ledger, their omission.
      id: 'unlogged-sale',
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
      },
    },
    {
      // Solvable entirely from our own records.
      id: 'split-lot',
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
      },
    },
    {
      // Chain of custody. Received by one, shelved by another, entered
      // by nobody -- and TLC cannot see any of those three steps.
      id: 'shelved-not-entered',
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
      },
    },
    {
      // Not phantom inventory. Nothing is missing yet.
      id: 'second-leg-in-transit',
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
      },
    },
    {
      // Not phantom inventory. It is on the shelf under the wrong name.
      id: 'misfiled-at-intake',
      weight: 2,
      trueCategory: 'Storefront Listing Error',
      trueDomain: 'Accounts',
      diagnosisId: 'misfiled',
      keyActionIds: ['askCount'],
      redHerringActionId: 'courierRecord',
      clues: {
        manifest: 'All 40 shipped, as Small.',
        courierRecord: 'Signed for by a name the Node does not recognise.',
        nodeReceipt: 'Receipt posted in full — forty, acknowledged.',
        drawRecord: 'No draw against this lot.',
        holdRegister: 'No hold on record.',
        askCount: 'Forty are there — stacked under Large. Their listing cannot see them.',
        askReceiving: 'Shelved by whoever was free that afternoon.',
        askLedger: 'Nothing unusual.',
        askIntake: 'Nothing else came in.',
      },
    },
    {
      // Ours to see, and only ours.
      id: 'constabulary-hold',
      weight: 1,
      trueCategory: 'Goods Under Hold',
      trueDomain: 'Service',
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
      },
    },
    {
      // A merchant's shelf holds goods TLC never touched. They bought a
      // lot off an adventurer and are calling us about it.
      id: 'never-shipped-by-us',
      weight: 2,
      trueCategory: 'Not A TLC Shipment',
      trueDomain: 'Accounts',
      diagnosisId: 'notOurs',
      keyActionIds: ['manifest', 'askIntake'],
      clues: {
        manifest: 'We have no shipment of that size to this account. Not this season.',
        courierRecord: 'No handoff, because there was nothing to hand over.',
        nodeReceipt: 'No receipt, because there was no shipment to receive.',
        drawRecord: 'No draw against a lot we do not have.',
        holdRegister: 'No hold on record.',
        askCount: 'Three on the shelf, as they said.',
        askReceiving: 'Nobody remembers taking a TLC delivery that week.',
        askLedger: 'The forty were entered as stock. No supplier against them.',
        askIntake: 'They bought a lot off an adventurer three weeks ago. Never wrote down who.',
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
    actions: template.actions.map((a) => ({ ...a, clue: rootCause.clues[a.id] })),
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

/**
 * Each response option carries a `quality` label used for disposition
 * math, plus a `timeCost` in shift-minutes (a scarce resource the UI
 * layer can spend down).
 */
const RESPONSE_QUALITY = {
  correct: { dispositionDelta: 12, reputationDelta: 2, timeCost: 4 },
  adequate: { dispositionDelta: 4, reputationDelta: 1, timeCost: 2 },
  rushed: { dispositionDelta: -6, reputationDelta: -1, timeCost: 1 },
  dismissive: { dispositionDelta: -18, reputationDelta: -3, timeCost: 1 },
};

/** Pool of shift modifiers. `apply` mutates a *draft* shift config only. */
const SHIFT_MODIFIERS = [
  {
    id: 'guild-convention',
    label: "Adventurer's Guild Convention",
    description: 'Ticket volume is unusually high today.',
    apply: (draft) => { draft.ticketCount = Math.round(draft.ticketCount * 1.5); },
  },
  {
    id: 'mercury-retrograde',
    label: 'Mercury Retrograde',
    description: 'Tracking scrolls are scrambled; everything reads more urgent than it is.',
    apply: (draft) => { draft.urgencyBonus += 2; },
  },
  {
    id: 'villain-uprising',
    label: 'Villain Uprising',
    description: 'A spike in End User tickets, mostly Villains.',
    apply: (draft) => { draft.tierWeightMultiplier.endUser *= 2; },
  },
  {
    id: 'new-hire-shadow',
    label: 'New Hire Shadowing',
    description: 'You are training someone. Every response costs extra time.',
    apply: (draft) => { draft.timeCostMultiplier *= 1.5; },
  },
  {
    id: 'quiet-morning',
    label: 'Quiet Morning',
    description: 'Lighter volume than usual.',
    apply: (draft) => { draft.ticketCount = Math.max(3, Math.round(draft.ticketCount * 0.7)); },
  },
];

// ---------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------

/** Weighted random pick from a list of `{ weight, ... }` items. */
function weightedPick(items, rng) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1]; // floating-point fallback
}

function pickOne(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

/** Fisher-Yates shuffle — unlike `sort(() => rng() - 0.5)`, this is unbiased. */
function shuffle(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Maps a numeric disposition score to a coarse tag the UI/dialogue layer
 * can key flavor text off of, without exposing raw numbers to players.
 */
function dispositionTag(score) {
  if (score <= -60) return 'hostile';
  if (score <= -20) return 'frustrated';
  if (score < 20) return 'neutral';
  if (score < 60) return 'warm';
  return 'loyal';
}

/**
 * Response qualities strong enough that a customer would remember the
 * specific incident, not just come away with a vague impression.
 * `adequate` and `rushed` are deliberately excluded — those are the
 * "fine, I guess" interactions nobody replays in their head.
 */
const MEMORABLE_QUALITIES = new Set(['correct', 'dismissive']);

/**
 * Flavor names for other staff at the co-op. When a customer's memory
 * of *who* helped them has faded, they misattribute the incident to one
 * of these instead of the player.
 */
const DECOY_AGENT_NAMES = ['Cassidy', 'Thistle', 'Bram', 'Pell', 'Wren'];

/**
 * How fast each detail of a memory decays per elapsed shift, and the
 * ceiling on how unreliable it can get. Capped below 1 on purpose: the
 * *fact* that something memorable happened never fully vanishes, only
 * the specifics around it — a customer can still be certain they were
 * wronged even after they've lost track of when or by whom.
 */
const DECAY_RATE_PER_SHIFT = 0.2;
const MAX_DECAY_CHANCE = 0.8;

function decayChanceFor(shiftsSince) {
  return clamp(shiftsSince * DECAY_RATE_PER_SHIFT, 0, MAX_DECAY_CHANCE);
}

/**
 * Decides how a customer's history should surface in dialogue: with a
 * specific callback, or as a vague carried-over mood — the same two
 * modes a real repeat customer uses. When a specific callback is used,
 * its details are independently, imperfectly recalled — memory is
 * fleeting, and the category, the timing, and who was even involved can
 * each separately fade the longer ago the incident was.
 *
 * Rule: scan history from most recent to oldest for the last memorable
 * (`correct`/`dismissive`) incident. If one exists, the customer can
 * cite it — a fresh good fix overrides an old grudge, but an old grudge
 * still outlasts a merely "fine" interaction sitting between it and now.
 * If nothing in the history was ever memorable, the customer only
 * carries a tone forward, with no specific to point to (and nothing to
 * misremember, since there was never a sharp detail to begin with).
 *
 * @param {object} customer
 * @param {number} currentShiftId - the shift "now" is happening in, used
 *   to measure how much time has passed since the remembered incident
 * @param {function} [rng=Math.random] - injected for deterministic tests
 * @returns {null
 *   | { style: 'explicit', quality: string, actualShiftId: number,
 *       category: string, categoryAccurate: boolean,
 *       shiftsAgoReported: number, timingAccurate: boolean,
 *       agentAttribution: string, agentAccurate: boolean }
 *   | { style: 'tone' }}
 *   `null` when the customer has no history at all (first-time caller).
 */
function recallMemory(customer, currentShiftId, rng = Math.random) {
  if (!customer.history || customer.history.length === 0) return null;

  let remembered = null;
  for (let i = customer.history.length - 1; i >= 0; i--) {
    if (MEMORABLE_QUALITIES.has(customer.history[i].quality)) {
      remembered = customer.history[i];
      break;
    }
  }
  if (!remembered) return { style: 'tone' };

  const shiftsSince = Math.max(0, currentShiftId - remembered.shiftId);
  const decayChance = decayChanceFor(shiftsSince);

  // Three details fade independently — a customer might get the "what"
  // right while mangling the "when" or the "who", in any combination.
  const categoryAccurate = rng() >= decayChance;
  const timingAccurate = rng() >= decayChance;
  const agentAccurate = rng() >= decayChance;

  let category = remembered.ticketCategory;
  if (!categoryAccurate) {
    const otherCategories = TICKET_TEMPLATES[customer.tier]
      .map((t) => t.category)
      .filter((c) => c !== remembered.ticketCategory);
    category = otherCategories.length ? pickOne(otherCategories, rng) : remembered.ticketCategory;
  }

  let shiftsAgoReported = shiftsSince;
  if (!timingAccurate) {
    const distortion = Math.round((rng() - 0.5) * 6); // roughly -3..+3
    shiftsAgoReported = Math.max(1, shiftsSince + (distortion === 0 ? 1 : distortion));
  }

  const agentAttribution = agentAccurate ? 'you' : pickOne(DECOY_AGENT_NAMES, rng);

  return {
    style: 'explicit',
    quality: remembered.quality,
    actualShiftId: remembered.shiftId,
    category,
    categoryAccurate,
    shiftsAgoReported,
    timingAccurate,
    agentAttribution,
    agentAccurate,
  };
}

// ---------------------------------------------------------------------
// Resolution statuses
// ---------------------------------------------------------------------

/**
 * How a ticket is closed out, independent of how well it was handled.
 * `quality` (above) is about the conversation; `status` is about what
 * happens to the ticket next:
 *   - resolved: closed now. Risky if the underlying quality was poor —
 *     see DISPUTE_CHANCE_BY_QUALITY. A customer can decide it wasn't
 *     actually fixed and come back.
 *   - hold: not closed — pending follow-up (internal, waiting on another
 *     team; or external, waiting on the customer/a third party). Always
 *     resurfaces in a future shift; the reason is flavor only.
 *   - transfer: handed off to another team entirely. Leaves the
 *     player's queue for good — no reopening, it's no longer their
 *     ticket — but quality still affects disposition/reputation.
 */
/**
 * The candle is the SHIFT TIMER. It marks the working day going by.
 *
 * **It is not a budget and the player does not spend it.** Nothing done
 * inside a call moves it — asking one more question, investigating one
 * more thing, letting somebody finish their sentence. A candle does not
 * burn faster because you asked a question, and charging the player for
 * doing the job properly is cruel besides.
 *
 * One notch per call taken. The day ends when the wick is out or the
 * line empties, whichever comes first.
 *
 * The cost of being thorough is real, but it is borne by the CUSTOMER,
 * not the clock: question load moves the Experience axis (see
 * "Character Disposition Model"). Drag someone through twenty questions
 * and they notice. That is the tradeoff — never a meter the player
 * watches drain.
 */
const SHIFT_CANDLE_NOTCHES = 12;

/** Candle state -> the words the UI shows. Never a number. */
const CANDLE_STAGES = [
  { atOrAbove: 1.0, label: 'newly lit' },
  { atOrAbove: 0.7, label: 'burning steady' },
  { atOrAbove: 0.4, label: 'burning down' },
  { atOrAbove: 0.2, label: 'burning low' },
  { atOrAbove: 0.0001, label: 'guttering' },
  { atOrAbove: 0, label: 'the wick is out' },
];

/**
 * Turns remaining candle into the phrase the status bar shows. There is
 * deliberately no numeric timer anywhere in the UI — the candle IS the
 * clock, and the player reads it by looking at it.
 *
 * @param {number} left - notches remaining
 * @param {number} [max=SHIFT_CANDLE_NOTCHES]
 * @returns {string}
 */
function candleStage(left, max = SHIFT_CANDLE_NOTCHES) {
  if (max <= 0) return 'the wick is out';
  const fraction = clamp(left / max, 0, 1);
  if (fraction <= 0) return 'the wick is out';
  return CANDLE_STAGES.find((s) => fraction >= s.atOrAbove).label;
}

/**
 * What a customer leads with once the agent opens the call.
 *
 * Greeting someone does NOT reliably get you their reason for calling —
 * on a real desk you are lucky to get it that cleanly. People lead with
 * a past problem, with how long they held, with the product in general,
 * with something vague, or with feeling rather than fact. Getting to
 * the actual request is work.
 *
 * `revealsRequest: false` means the caller said something real but it
 * was not what they need. The agent has to go get that.
 *
 * Only `id` and `revealsRequest` live here — the words a caller
 * actually says are a rendering concern (see the UI layer's
 * OPENING_LINES), the same split as ticket blurbs.
 *
 * `requiresMemory` modes can only surface for a customer with history
 * to lead with. See LORE.md, "Ticket Resolution," phase 1.
 */
const OPENING_MODES = [
  { id: 'request', weight: 3, revealsRequest: true },
  { id: 'history', weight: 2, revealsRequest: false, requiresMemory: true },
  { id: 'wait', weight: 2, revealsRequest: false },
  { id: 'product', weight: 2, revealsRequest: false },
  { id: 'vague', weight: 2, revealsRequest: false },
  { id: 'venting', weight: 1, revealsRequest: false },
];

/**
 * How guarded this customer is about volunteering information, 0..1.
 *
 * People almost never lay out every detail up front, and **Baggage
 * drives the manner of the telling** — what someone walked in already
 * carrying shapes whether they are terse, defensive, circling, or
 * forthcoming. See LORE.md, "Character Disposition Model."
 *
 * Reads the **TLC axis** specifically: what someone walked in carrying
 * about the company is what makes them slow to volunteer anything. It
 * is not about the agent — they have not met you yet, and Baggage on
 * the `you` axis always starts at zero for that reason.
 *
 * Live as of Phase 1. Before that it was a deliberately inert hook.
 *
 * @param {object|null} customer
 * @returns {number} 0 (forthcoming) .. 1 (heavily guarded)
 */
function guardednessOf(customer) {
  const disposition = customer && customer.disposition;
  if (!disposition || typeof disposition.tlc !== 'number') return 0;
  return clamp(-disposition.tlc / 100, 0, 1);
}

/**
 * Rolls how this caller opens, once greeted.
 *
 * @param {object|null} customer - the caller; their Baggage biases how
 *   readily they volunteer the reason they rang
 * @param {object|null} memory - recallMemory() output, or null. Its
 *   presence is what makes a customer able to lead with the past.
 * @param {function} [rng=Math.random]
 * @returns {{ mode: string, revealsRequest: boolean, guardedness: number }}
 */
function rollOpening(customer, memory, rng = Math.random) {
  const guarded = guardednessOf(customer);
  const available = OPENING_MODES
    .filter((m) => !m.requiresMemory || Boolean(memory))
    // A guarded caller is less likely to just tell you. Nothing else is
    // rescaled, so guardedness 0 leaves the distribution untouched.
    .map((m) => (m.revealsRequest
      ? { ...m, weight: m.weight * (1 - guarded * 0.8) }
      : m));
  const picked = weightedPick(available, rng);
  return {
    mode: picked.id,
    revealsRequest: Boolean(picked.revealsRequest),
    guardedness: guarded,
  };
}

/**
 * Whether pressing for the actual request lands this time.
 *
 * Deliberately bounded: the second probe always works. Cozy means a
 * caller can be hard to get to the point, never a dead end the player
 * can stall out on — see LORE.md, "Running the Desk," the cozy rule.
 *
 * @param {number} probesSoFar - probes already spent on this call
 * @param {function} [rng=Math.random]
 * @returns {boolean}
 */
function probeForRequest(probesSoFar, rng = Math.random) {
  if (probesSoFar >= 1) return true;
  return rng() < 0.5;
}

const RESOLUTION_STATUSES = ['resolved', 'hold', 'transfer'];

/**
 * Chance a "resolved" ticket gets reopened later. Driven entirely by how
 * well it was actually handled, not by the status the agent recorded —
 * marking a dismissively-handled ticket "Resolved" is exactly how you
 * end up with an angry callback.
 */
const DISPUTE_CHANCE_BY_QUALITY = {
  correct: 0.03,
  adequate: 0.12,
  rushed: 0.35,
  dismissive: 0.6,
};

/** Flavor-only reason shown on a "hold" ticket; no mechanical difference. */
const HOLD_REASONS = ['internal', 'external'];

/** How urgent a follow-up ticket reads on arrival — these have been waiting. */
const FOLLOW_UP_BASE_URGENCY = { hold: 5, reopen: 7 };

// ---------------------------------------------------------------------
// Character Disposition Model — Phase 1
// ---------------------------------------------------------------------

/**
 * How a customer TYPE tends to talk — their register.
 *
 * **This is expression, not disposition, and the distinction is the
 * whole reason it is allowed to key off archetype.** LORE.md forbids
 * archetype from being a formula input for Baggage, Sensitivity or
 * Social Filter, and it still is — none of those are touched here.
 * What archetype shapes is *voice*: a Military account and a Wandering
 * Trader with identical traits, identical Baggage and the identical
 * complaint will not say it the same way.
 *
 * Register is style. Baggage is substance — how willingly and how
 * accurately they tell you anything. The two layer.
 */
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

/**
 * The three FEELING axes. `understanding` is tracked alongside them but
 * is deliberately not in this list — it is not a feeling, it has no
 * Baggage, and it moves only through Education.
 * See LORE.md, "Character Disposition Model."
 */
const FEELING_AXES = ['you', 'tlc', 'experience'];

/**
 * Situational facts about a *particular customer instance* that may
 * bias a trait draw.
 *
 * **These are circumstances, never archetype.** LORE.md forbids
 * archetype from being a formula input for any trait, so these are
 * rolled independently of tier and archetype — a Hero and a Tavern are
 * equally likely to be COG-affiliated as far as this roll is concerned.
 * They bias a random draw; they never replace it with a lookup.
 */
const WRINKLES = [
  { id: 'cog-affiliated', chance: 0.22, biases: { tlc: -18 } },
  { id: 'post-adventure', chance: 0.15, biases: { experience: +12 }, sensitivity: -0.15 },
  { id: 'pre-adventure', chance: 0.15, biases: { experience: -10 }, sensitivity: +0.2 },
  { id: 'long-standing-account', chance: 0.18, biases: { tlc: +14 } },
];

/**
 * NUMBERS CHOSEN HERE, NOT SPECIFIED IN LORE. LORE.md sets the shape of
 * this model and explicitly leaves ranges and distributions open. These
 * are a first reasonable pass, meant to be tuned:
 *
 *   Baggage      -35..+35 per axis, triangular (two rolls averaged) so
 *                 most customers land near neutral and extremes are rare
 *   Sensitivity   0.55..1.45, centred on 1.0
 *   Social Filter 0.35..1.0 — how much of a reaction actually shows
 */
const TRAIT_RANGES = {
  baggageSpread: 35,
  sensitivity: { min: 0.55, max: 1.45 },
  socialFilter: { min: 0.35, max: 1.0 },
};

/** Triangular draw in -spread..+spread; clusters near 0. */
function triangular(spread, rng) {
  return ((rng() + rng()) / 2 - 0.5) * 2 * spread;
}

/**
 * Rolls the situational wrinkles for one customer instance.
 * @param {function} rng
 * @returns {string[]} wrinkle ids
 */
function rollWrinkles(rng) {
  return WRINKLES.filter((w) => rng() < w.chance).map((w) => w.id);
}

/**
 * Rolls Baggage / Sensitivity / Social Filter for one customer.
 *
 * Baggage is **per feeling-axis**: a stranger can arrive already hostile
 * to TLC while holding no opinion of the agent at all, because they have
 * never spoken to you. So `you` starts at zero for a new customer and is
 * only ever moved by what the player actually does.
 *
 * @param {string[]} wrinkles - situational facts biasing the draw
 * @param {function} [rng=Math.random]
 * @returns {{ baggage: object, sensitivity: number, socialFilter: number }}
 */
function rollTraits(wrinkles = [], rng = Math.random) {
  const active = WRINKLES.filter((w) => wrinkles.includes(w.id));

  const baggage = { you: 0, tlc: 0, experience: 0 };
  for (const axis of FEELING_AXES) {
    // A stranger has no opinion of the agent yet -- there is nothing to
    // have baggage about. Every other axis can be loaded on arrival.
    if (axis === 'you') continue;
    const bias = active.reduce((sum, w) => sum + ((w.biases && w.biases[axis]) || 0), 0);
    baggage[axis] = clamp(
      Math.round(triangular(TRAIT_RANGES.baggageSpread, rng) + bias), -100, 100,
    );
  }

  const sensBias = active.reduce((sum, w) => sum + (w.sensitivity || 0), 0);
  const { min: sMin, max: sMax } = TRAIT_RANGES.sensitivity;
  const sensitivity = clamp(sMin + rng() * (sMax - sMin) + sensBias, 0.1, 2.5);

  const { min: fMin, max: fMax } = TRAIT_RANGES.socialFilter;
  const socialFilter = fMin + rng() * (fMax - fMin);

  return { baggage, sensitivity, socialFilter };
}

/**
 * Applies a raw per-axis delta through the full pipeline.
 *
 * Pipeline, in order: raw → × Sensitivity → dampened by Social Filter.
 *
 * Returns BOTH numbers, because they are different things and the split
 * is the point: `disposition` is what the customer actually feels, and
 * `visible` is only as much of it as they let show. A player cannot
 * reliably read the truth off the presentation — see LORE.md on Social
 * Filter as "the lid on the pot."
 *
 * @param {object} customer - carrying `disposition` and `traits`
 * @param {object} rawDeltas - e.g. { you: 6, tlc: -3 }
 * @returns {{ disposition: object, visible: object }}
 */
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

// ---------------------------------------------------------------------
// Customer pool
// ---------------------------------------------------------------------

/**
 * Builds (or reuses) a roster of customers. Returning customers keep
 * their disposition/history; a fresh customer starts neutral.
 *
 * @param {object[]} existingCustomers - customers known from prior shifts
 * @param {number} freshCount - how many brand-new customers to mint
 * @param {function} rng - PRNG, () => [0,1)
 */
function buildCustomerPool(existingCustomers, freshCount, rng) {
  const pool = [...existingCustomers];
  for (let i = 0; i < freshCount; i++) {
    const tierKey = pickOne(Object.keys(CUSTOMER_TYPES), rng);
    const archetype = pickOne(CUSTOMER_TYPES[tierKey].archetypes, rng);
    // Traits are rolled per INSTANCE. Archetype is picked above and is
    // never fed into the roll -- see LORE.md, "archetype rhyme, not
    // archetype lookup."
    const wrinkles = rollWrinkles(rng);
    const traits = rollTraits(wrinkles, rng);
    pool.push({
      id: `${tierKey}-${archetype}-${Math.floor(rng() * 1e6)}`,
      tier: tierKey,
      archetype,
      wrinkles,
      traits,
      disposition: {
        you: traits.baggage.you,
        tlc: traits.baggage.tlc,
        experience: traits.baggage.experience,
        understanding: 0,
      },
      history: [],
    });
  }
  return pool;
}

// ---------------------------------------------------------------------
// Shift generation
// ---------------------------------------------------------------------

/**
 * Generates one shift: rolls 1-2 modifiers, then builds a shuffled ticket
 * queue drawn from a mixed pool of new and returning customers.
 *
 * @param {object} options
 * @param {object[]} options.knownCustomers - full customer roster so far (may be [])
 * @param {number} [options.baseTicketCount=8]
 * @param {function} [options.rng=Math.random]
 * @returns {{ modifiers: object[], tickets: object[], customerPool: object[] }}
 */
/**
 * Generates one shift: rolls 1-2 modifiers, then builds a shuffled ticket
 * queue drawn from a mixed pool of new and returning customers, plus any
 * follow-ups (holds and disputes) that have come due.
 *
 * @param {object} options
 * @param {object[]} options.knownCustomers - full customer roster so far (may be [])
 * @param {number} [options.baseTicketCount=8]
 * @param {number} [options.currentShiftId=1] - this shift's id; also used
 *   by the UI layer to compute memory decay via recallMemory()
 * @param {object[]} [options.pendingFollowUps=[]] - `{ id, customerId,
 *   category, kind: 'hold'|'reopen', dueShiftId }` entries from a prior
 *   endShift() call. Any with `dueShiftId <= currentShiftId` are folded
 *   into this shift's queue; the rest are returned untouched for the
 *   caller to carry forward again.
 * @param {function} [options.rng=Math.random]
 * @returns {{ modifiers: object[], tickets: object[], customerPool: object[], fullRoster: object[], stillPendingFollowUps: object[] }}
 *   `customerPool` is only this shift's participants (returning subset +
 *   fresh + due follow-ups) — handy for shift-local lookups. `fullRoster`
 *   is every known customer, including ones sitting out this shift with
 *   a follow-up due later; callers MUST persist `fullRoster` (not
 *   `customerPool`) as their customer list, or a customer who isn't
 *   drawn again before their follow-up comes due will vanish and that
 *   follow-up ticket will point at nobody.
 */
function generateShift({
  knownCustomers = [],
  baseTicketCount = 8,
  currentShiftId = 1,
  pendingFollowUps = [],
  rng = Math.random,
} = {}) {
  const draft = {
    ticketCount: baseTicketCount,
    urgencyBonus: 0,
    tierWeightMultiplier: { endUser: 1, business: 1, partner: 1 },
    timeCostMultiplier: 1,
  };

  const modifierCount = 1 + Math.floor(rng() * 2); // 1 or 2
  const modifiers = shuffle(SHIFT_MODIFIERS, rng).slice(0, modifierCount);
  modifiers.forEach((m) => m.apply(draft));

  const dueFollowUps = pendingFollowUps.filter((f) => f.dueShiftId <= currentShiftId);
  const stillPendingFollowUps = pendingFollowUps.filter((f) => f.dueShiftId > currentShiftId);

  // Mix returning customers back in so memory can pay off, plus enough
  // fresh faces to keep the pool growing. Follow-ups are guaranteed a
  // procedural ticket slot each, so they don't inflate volume further.
  const proceduralCount = Math.max(0, draft.ticketCount - dueFollowUps.length);
  const returningTarget = Math.min(knownCustomers.length, Math.ceil(proceduralCount * 0.4));
  const returning = shuffle(knownCustomers, rng).slice(0, returningTarget);
  const freshNeeded = Math.max(0, proceduralCount - returning.length);
  let customerPool = buildCustomerPool(returning, freshNeeded, rng);

  // Follow-up customers must be present even if the random draw above
  // didn't happen to include them — it's specifically their ticket.
  const poolIds = new Set(customerPool.map((c) => c.id));
  dueFollowUps.forEach((f) => {
    if (poolIds.has(f.customerId)) return;
    const known = knownCustomers.find((c) => c.id === f.customerId);
    if (known) {
      customerPool = [...customerPool, known];
      poolIds.add(known.id);
    }
  });

  // Procedural tickets: pick a customer + a ticket template weighted by
  // tier. Follow-up tickets: one per due follow-up, tied to its own
  // customer and original category. Both get shuffled together after —
  // a returning or follow-up ticket can land anywhere in the queue.
  const tierKeys = Object.keys(CUSTOMER_TYPES);
  const proceduralTickets = [];
  const drawPool = customerPool.filter((c) => !dueFollowUps.some((f) => f.customerId === c.id));
  for (let i = 0; i < proceduralCount && drawPool.length; i++) {
    const weightedTiers = tierKeys.map((t) => ({
      tier: t,
      weight: draft.tierWeightMultiplier[t],
    }));
    const chosenTier = weightedPick(weightedTiers, rng).tier;
    const candidates = drawPool.filter((c) => c.tier === chosenTier);
    const customer = candidates.length
      ? pickOne(candidates, rng)
      : pickOne(drawPool, rng);
    drawPool.splice(drawPool.indexOf(customer), 1);

    const template = weightedPick(TICKET_TEMPLATES[customer.tier], rng);
    proceduralTickets.push({
      id: `ticket-${i}-${customer.id}`,
      customerId: customer.id,
      category: template.category,
      urgency: clamp(template.baseUrgency + draft.urgencyBonus, 1, 10),
      timeCostMultiplier: draft.timeCostMultiplier,
      isReturning: customer.history.length > 0,
      isFollowUp: false,
      // Root cause is rolled PER TICKET. Two Phantom Inventory calls in
      // the same shift can have entirely different things wrong.
      investigation: template.investigationTemplate
        ? buildInvestigation(template.investigationTemplate, rollRootCause(template.investigationTemplate, rng))
        : undefined,
    });
  }

  const followUpTickets = dueFollowUps.map((f, i) => ({
    id: `followup-ticket-${i}-${f.id}`,
    customerId: f.customerId,
    category: f.category,
    urgency: clamp(FOLLOW_UP_BASE_URGENCY[f.kind] + draft.urgencyBonus, 1, 10),
    timeCostMultiplier: draft.timeCostMultiplier,
    isReturning: true,
    isFollowUp: true,
    followUpKind: f.kind,
    holdReason: f.kind === 'hold' ? pickOne(HOLD_REASONS, rng) : undefined,
  }));

  const tickets = shuffle([...proceduralTickets, ...followUpTickets], rng);

  // fullRoster: every known customer, whether or not they appear this
  // shift. customerPool already contains every *fresh* customer minted
  // this call (they're not yet in knownCustomers), so the merge is just
  // "everyone we knew, plus whichever of this shift's pool we didn't
  // already know" — nobody existing gets dropped for sitting out.
  const knownIds = new Set(knownCustomers.map((c) => c.id));
  const newlyMinted = customerPool.filter((c) => !knownIds.has(c.id));
  const fullRoster = [...knownCustomers, ...newlyMinted];

  return { modifiers, tickets, customerPool, fullRoster, stillPendingFollowUps };
}

// ---------------------------------------------------------------------
// Resolving a ticket
// ---------------------------------------------------------------------

/**
 * Resolves an investigation-style ticket (Phase 0 proof-of-concept —
 * currently only "Phantom Inventory" carries `investigation` data)
 * into a response `quality`, which then feeds into resolveTicket()
 * exactly like any other quality choice. This is the layer that makes
 * the diagnosis actually depend on what the player investigated,
 * instead of a bare, content-free button — see LORE.md, "Ticket
 * Resolution — Investigation Phase," for the full design and why the
 * old single-step model didn't work.
 *
 * Rule (a deliberate first-pass simplification, not final tuning):
 *   - correct diagnosis + key clue investigated    -> 'correct'
 *   - correct diagnosis, key clue NOT investigated  -> 'adequate'
 *     (a right answer, but an ungrounded, lucky guess)
 *   - wrong diagnosis, zero investigation performed  -> 'dismissive'
 *   - wrong diagnosis, at least one action taken     -> 'rushed'
 *
 * @param {object} ticket - a ticket carrying an `investigation` block
 * @param {string[]} investigatedActionIds - ids of actions the player took, in any order
 * @param {string} chosenDiagnosisId
 * @returns {'correct'|'adequate'|'rushed'|'dismissive'}
 */
function resolveInvestigation(ticket, investigatedActionIds, chosenDiagnosisId) {
  const investigation = ticket.investigation;
  if (!investigation) {
    throw new Error(`Ticket category "${ticket.category}" has no investigation data`);
  }
  const diagnosis = investigation.diagnoses.find((d) => d.id === chosenDiagnosisId);
  if (!diagnosis) {
    throw new Error(`Unknown diagnosis id: "${chosenDiagnosisId}"`);
  }

  // Every key clue must be in hand, not just one. A cause needing two
  // pieces of evidence is not backed up by one of them.
  const investigatedKeyClue = investigation.keyActionIds
    .every((id) => investigatedActionIds.includes(id));

  // `grounding` is the honest thing the sim knows: did the player have
  // a basis for saying this. It is NOT a verdict delivered to the
  // player — see LORE.md, "Ticket Resolution," *the game does not grade
  // the diagnosis*. Others judge the work, later.
  const grounding = diagnosis.correct
    ? (investigatedKeyClue ? 'grounded' : 'lucky')
    : (investigatedActionIds.length > 0 ? 'reasoned' : 'blind');

  // Three standings, not two. `partial` is the missing middle and the
  // most common real outcome: right kind of problem, wrong instance —
  // or an answer that happens to be right with nothing behind it.
  let standing;
  if (diagnosis.correct) {
    standing = investigatedKeyClue ? 'correct' : 'partial';
  } else {
    standing = investigatedActionIds.length > 0 ? 'partial' : 'wrong';
  }

  return {
    standing,
    grounding,
    quality: diagnosis.correct
      ? (investigatedKeyClue ? 'correct' : 'adequate')
      : (investigatedActionIds.length > 0 ? 'rushed' : 'dismissive'),
  };
}

/**
 * How much of the caller's patience the chosen investigation actions
 * consume.
 *
 * **This is not candle.** The candle is the shift timer and the player
 * never spends it (see SHIFT_CANDLE_NOTCHES). This is question load —
 * an input to the **Experience** axis of the disposition vector, which
 * is how being thorough actually costs something: the customer sat
 * through it. See LORE.md, "Character Disposition Model."
 *
 * Kept as a number so Phase 1 can scale it into an Experience delta
 * once the vector has real values.
 *
 * @param {object} ticket - a ticket carrying an `investigation` block
 * @param {string[]} investigatedActionIds
 * @returns {number} question load imposed on the caller
 */
function investigationTimeCost(ticket, investigatedActionIds) {
  const investigation = ticket.investigation;
  if (!investigation) return 0;
  return investigation.actions
    .filter((a) => investigatedActionIds.includes(a.id))
    .reduce((sum, a) => sum + a.timeCost, 0);
}

/**
 * Applies a player's response choice to one ticket. Returns new customer
 * and ticket-outcome objects; does not mutate inputs.
 *
 * @param {object} ticket - a ticket from generateShift()
 * @param {object} customer - the customer this ticket belongs to
 * @param {'correct'|'adequate'|'rushed'|'dismissive'} quality - how well it was handled
 * @param {'resolved'|'hold'|'transfer'} status - what happens to the ticket next
 * @param {number} shiftId
 * @returns {{ customer: object, outcome: object }}
 */
function resolveTicket(ticket, customer, quality, status, shiftId) {
  const effect = RESPONSE_QUALITY[quality];
  if (!effect) {
    throw new Error(`Unknown response quality: "${quality}"`);
  }
  if (!RESOLUTION_STATUSES.includes(status)) {
    throw new Error(`Unknown resolution status: "${status}"`);
  }

  // WEIGHTS CHOSEN HERE, NOT SPECIFIED IN LORE. LORE.md locks that
  // correctness moves all three feeling axes and explicitly refuses to
  // fix the weighting ("Do not invent a weighting table and treat it as
  // locked"). First pass, meant to be tuned:
  //
  //   tlc         strongest -- did the company actually fix it
  //   you         real but smaller -- you are one person at the company
  //   experience  smallest -- correctness helps how it felt, a little
  //
  // Question load lands on `experience` and is applied by the caller,
  // not here. Empathy and Education are earned skills and not built --
  // see LORE.md, "Education & Empathy."
  const raw = {
    tlc: effect.dispositionDelta,
    you: effect.dispositionDelta * 0.6,
    experience: effect.dispositionDelta * 0.3,
  };
  const { disposition, visible } = applyDisposition(customer, raw);

  const historyEntry = {
    shiftId,
    ticketCategory: ticket.category,
    quality,
    status,
    dispositionAfter: disposition,
  };

  const updatedCustomer = {
    ...customer,
    disposition,
    history: [...customer.history, historyEntry],
  };

  // `followUp` is a *seed*, not a decision — endShift() is where the
  // dice actually get rolled, so a shift's worth of rolls stay in one
  // place and stay easy to test.
  let followUp = null;
  if (status === 'hold') {
    followUp = { kind: 'hold', ticketCategory: ticket.category, customerId: customer.id };
  } else if (status === 'resolved') {
    followUp = { kind: 'reopen-risk', chance: DISPUTE_CHANCE_BY_QUALITY[quality], ticketCategory: ticket.category, customerId: customer.id };
  }
  // status === 'transfer': no follow-up. It's someone else's ticket now.

  const outcome = {
    ticketId: ticket.id,
    quality,
    status,
    reputationDelta: effect.reputationDelta,
    timeSpent: Math.round(effect.timeCost * ticket.timeCostMultiplier),
    // The player's immediate read is the YOU axis -- and only as much
    // as the customer lets show. See LORE.md's open question on which
    // surface reports which axis.
    dispositionTag: dispositionTag(disposition.you),
    visibleDelta: visible,
    followUp,
  };

  return { customer: updatedCustomer, outcome };
}

// ---------------------------------------------------------------------
// Ending a shift
// ---------------------------------------------------------------------

/**
 * Tallies a shift's outcomes into updated company reputation, earned
 * currency ("Commendations"), and the follow-up tickets that result —
 * holds resurfacing on schedule, and resolved-but-poorly-handled tickets
 * rolling to see if the customer disputes them. Reputation is clamped
 * 0-100; currency is only earned from non-negative outcomes to
 * discourage farming rushed responses.
 *
 * @param {object[]} outcomes - array of `outcome` objects from resolveTicket
 * @param {number} currentReputation
 * @param {number} currentShiftId - this shift's id, used to schedule follow-ups
 * @param {function} [rng=Math.random]
 * @returns {{ reputation: number, commendationsEarned: number, summary: object, pendingFollowUps: object[] }}
 */
function endShift(outcomes, currentReputation, currentShiftId, rng = Math.random) {
  const reputationDelta = outcomes.reduce((sum, o) => sum + o.reputationDelta, 0);
  const reputation = clamp(currentReputation + reputationDelta, 0, 100);

  const commendationsEarned = outcomes
    .filter((o) => o.reputationDelta > 0)
    .reduce((sum, o) => sum + o.reputationDelta, 0);

  // Deliberately NOT a tally of how customers felt. A shift summary
  // reports work — calls handled and how each case was dispositioned.
  // Nobody knows how a customer felt at the end of a shift: that comes
  // back later through the survey chain, filtered through a manager,
  // or never. See LORE.md, "Running the Desk," the shift-summary rule.
  const statusCounts = outcomes.reduce((counts, o) => {
    counts[o.status] = (counts[o.status] || 0) + 1;
    return counts;
  }, {});

  const pendingFollowUps = [];
  outcomes.forEach((o) => {
    if (!o.followUp) return;
    const delay = 1 + Math.floor(rng() * 2); // resurfaces 1-2 shifts later
    if (o.followUp.kind === 'hold') {
      pendingFollowUps.push({
        id: `followup-hold-${o.ticketId}`,
        customerId: o.followUp.customerId,
        category: o.followUp.ticketCategory,
        kind: 'hold',
        dueShiftId: currentShiftId + delay,
      });
    } else if (o.followUp.kind === 'reopen-risk' && rng() < o.followUp.chance) {
      pendingFollowUps.push({
        id: `followup-reopen-${o.ticketId}`,
        customerId: o.followUp.customerId,
        category: o.followUp.ticketCategory,
        kind: 'reopen',
        dueShiftId: currentShiftId + delay,
      });
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

module.exports = {
  CUSTOMER_TYPES,
  DOMAINS,
  TICKET_TEMPLATES,
  RESPONSE_QUALITY,
  SHIFT_MODIFIERS,
  MEMORABLE_QUALITIES,
  DECOY_AGENT_NAMES,
  RESOLUTION_STATUSES,
  DISPUTE_CHANCE_BY_QUALITY,
  HOLD_REASONS,
  PHANTOM_INVENTORY_TEMPLATE,
  askRelationshipCost,
  rollRootCause,
  buildInvestigation,
  SHIFT_CANDLE_NOTCHES,
  OPENING_MODES,
  candleStage,
  guardednessOf,
  rollOpening,
  probeForRequest,
  ARCHETYPE_REGISTERS,
  registerOf,
  familiarityOf,
  FEELING_AXES,
  WRINKLES,
  TRAIT_RANGES,
  rollWrinkles,
  rollTraits,
  applyDisposition,
  decayChanceFor,
  dispositionTag,
  recallMemory,
  generateShift,
  resolveInvestigation,
  investigationTimeCost,
  resolveTicket,
  endShift,
};
