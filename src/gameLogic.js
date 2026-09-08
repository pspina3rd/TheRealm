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
    defaultOutcome: '__NAME__',
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
 * You cannot look somebody up without something to look them up BY.
 *
 * Every record lookup here is against an account: what we shipped them,
 * what their Courier reported, what they were charged. None of it is
 * reachable until the agent has identified who is on the line. A build
 * that let the manifest be pulled for an unidentified caller was
 * checking the records of nobody in particular.
 *
 * Evidence gate, not a sequence gate: it is not "you must ask first",
 * it is "there is nothing to search on yet". Ask their name, or match
 * the ward signature, and it opens.
 */
function canLookUpRecords(identified) {
  return Boolean(identified);
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
        askWhoTakesIn: "Whoever's about. There was a lad in that week, just helping out.",
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
        askWhoTakesIn: "Whoever's free that afternoon puts it away. Could be any of us.",
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
  asks: ['askName', 'askAnyoneElse'],
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
  asks: ['askName', 'askWhenNoticed', 'askWhoTheySpokeTo'],
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
        askWhoTheySpokeTo: "A woman. Brisk about it. Wasn't here long.",
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
        askWhenNoticed: "Yesterday. The last one had been going for weeks before I rang.",
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
        askWhenNoticed: "Within days. I left it, thought I'd see if it settled.",
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
  asks: ['askName', 'askWhenNoticed', 'askWhoTheySpokeTo'],
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
        askWhoTheySpokeTo: "Nobody. I did it myself, at the counter.",
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
        askWhoTheySpokeTo: "A fellow at the market. Said he could get it moved.",
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
  asks: ['askName', 'askWhenNoticed'],
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

/**
 * INTERNAL ONLY — do not show this to the player.
 *
 * Kept because the simulation and its tests need a compact way to talk
 * about where a number sits. The player-facing path is readCues().
 * See LORE.md, "Reading a customer."
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

/**
 * How an interaction can end. Three ways, and **none of them require a
 * cause to have been named** — see LORE.md, "Ticket Resolution."
 *
 *   resolved  the agent BELIEVES the request was given an appropriate
 *             solution. A belief, not a verified truth: it sticks, or
 *             it is disputed later by somebody else.
 *   hold      action pending — on the agent, the customer, an internal
 *             process, or several at once.
 *   transfer  the call or case is handed off for further review.
 *
 * A diagnosis is one way to reach `resolved`. It is not the only one,
 * and it is not required: confirming our part is clean and handing over
 * the detail resolves a call perfectly well without naming anything.
 */
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
/**
 * What a Hold is waiting ON. **One or more of these at a time** — a case
 * can be pending the agent's own work, something from the customer, and
 * an internal process all at once, and usually is.
 *
 * An earlier version flattened this to internal/external, which lost
 * both the agent's own pending work and the fact that holds stack.
 */
const HOLD_PENDING = ['agent', 'customer', 'internal'];

/**
 * Rolls what a hold is waiting on. Weighted toward one thing, because
 * most holds are, but genuinely able to stack.
 *
 * @param {function} rng
 * @returns {string[]} at least one of HOLD_PENDING
 */
function rollHoldPending(rng) {
  const pending = HOLD_PENDING.filter(() => rng() < 0.4);
  return pending.length ? pending : [pickOne(HOLD_PENDING, rng)];
}

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
function rollTraits(wrinkles = [], rng = Math.random, register = DEFAULT_REGISTER) {
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

  return { baggage, sensitivity, socialFilter, preference: rollDeliveryPreference(register, rng) };
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

/**
 * Callers have names, and accounts have references.
 *
 * Without them, "ask who you're speaking with" returns nothing usable
 * and every record lookup happens against a customer the agent has not
 * identified. A caller answering "it's on the account" is not an
 * answer — you cannot find an account without something to find it by.
 */
const GIVEN_NAMES = [
  'Maren', 'Aldrick', 'Sef', 'Bramwell', 'Tessa', 'Corrin', 'Halla', 'Odo',
  'Wynn', 'Marek', 'Isolde', 'Garrick', 'Nessa', 'Rook', 'Perrin', 'Alis',
];
const FAMILY_NAMES = [
  'Thackery', 'Marrow', 'Bell', 'Ashgrove', 'Quill', 'Underhay', 'Vance',
  'Toller', 'Redfern', 'Stannish', 'Copperwaite', 'Larch',
];

/** A short, stable account reference — the thing you look them up by. */
function rollAccountRef(rng) {
  return `${Math.floor(rng() * 9) + 1}-${String(Math.floor(rng() * 9000) + 1000)}`;
}

function rollName(rng) {
  return `${pickOne(GIVEN_NAMES, rng)} ${pickOne(FAMILY_NAMES, rng)}`;
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
    const traits = rollTraits(wrinkles, rng, ARCHETYPE_REGISTERS[archetype] || DEFAULT_REGISTER);
    pool.push({
      id: `${tierKey}-${archetype}-${Math.floor(rng() * 1e6)}`,
      tier: tierKey,
      archetype,
      name: rollName(rng),
      accountRef: rollAccountRef(rng),
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
      // Who this caller is today, on top of who they are.
      dayVariance: rollDayVariance(rng),
      isReturning: customer.history.length > 0,
      isFollowUp: false,
      // Root cause is rolled PER TICKET. Two Phantom Inventory calls in
      // the same shift can have entirely different things wrong.
      // Every call is workable. A category without its own content
      // still gets the baseline lookups any agent could make.
      investigation: (() => {
        const t = template.investigationTemplate || BASELINE_TEMPLATE;
        return buildInvestigation(t, rollRootCause(t, rng));
      })(),
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
    holdPending: f.kind === 'hold' ? rollHoldPending(rng) : undefined,
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
function resolveTicket(ticket, customer, quality, status, shiftId, inquiriesUsed = 0) {
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
    inquiriesUsed,
    duration: callDuration(inquiriesUsed),
    // Observable cues, never a verdict. The player reads them; the game
    // does not tell them how anyone feels.
    cues: readCues(updatedCustomer, 'you'),
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
/**
 * NOTE ON `reputation`: internal only, and probably on its way out.
 *
 * There is no conversation in this job where somebody tells an agent the
 * company's reputation is 58 out of 100. It was inherited from an early
 * pass, it violates the rule that metrics reach the player through
 * people rather than a dashboard, and a 60-shift run showed it pinned at
 * 100 for every strategy tested -- it could not tell a 5% rework rate
 * from a 39% one.
 *
 * It is also redundant: how the world feels about TLC is already
 * modelled, per customer, on the **TLC axis** of the disposition vector,
 * which is specific and readable. An aggregate number adds nothing.
 *
 * Kept for now only because endShift's shape is depended on. Not shown
 * to the player anywhere.
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
  HOLD_PENDING,
  rollHoldPending,
  RECORD_LOOKUPS,
  ASK_LOOKUPS,
  spokenFit,
  ASKS_BEFORE_REQUEST,
  askMakesSense,
  canLookUpRecords,
  makeTemplate,
  BASELINE_TEMPLATE,
  PHANTOM_INVENTORY_TEMPLATE,
  SHIPMENT_TRACE_TEMPLATE,
  REPEAT_FAILURE_TEMPLATE,
  NO_BOOKING_TEMPLATE,
  DUPLICATE_CHARGE_TEMPLATE,
  askRelationshipCost,
  rollRootCause,
  buildInvestigation,
  SHIFT_CANDLE_NOTCHES,
  CALL_BASE_DURATION,
  callDuration,
  PACE_BAND,
  assessPace,
  CALL_INQUIRY_BUDGET,
  MAIL_EXCHANGE_BUDGET,
  MAIL_DEPTH_WEIGHTS,
  rollMailThread,
  redundantAsk,
  PROBE_INQUIRY_COST,
  inquiriesSpent,
  canAfford,
  OPENING_MODES,
  candleStage,
  guardednessOf,
  rollOpening,
  probeForRequest,
  ARCHETYPE_REGISTERS,
  registerOf,
  familiarityOf,
  DELIVERIES,
  deliveryPreference,
  rollDeliveryPreference,
  rollDayVariance,
  situationalPressure,
  deliveryFit,
  FEELING_AXES,
  WRINKLES,
  TRAIT_RANGES,
  rollName,
  rollAccountRef,
  rollWrinkles,
  rollTraits,
  applyDisposition,
  decayChanceFor,
  dispositionTag,
  readCues,
  recallMemory,
  accountDivergences,
  generateShift,
  resolveInvestigation,
  investigationTimeCost,
  resolveTicket,
  endShift,
};
