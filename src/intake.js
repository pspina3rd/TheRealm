'use strict';

/**
 * INTAKE — establishing which shipment is being discussed.
 *
 * The model this file exists to prove: a support call is a *cooperative*
 * coordination problem under unreliable information. Nobody wants a bad
 * outcome. The caller wants their goods, the agent wants to find them.
 * What stops them aligning is that each side holds a different kind of
 * truth, and the act of asking is itself costly.
 *
 * Three facts drive everything here:
 *
 * 1. **Callers lead with the request, not their details.** They believe
 *    the request confers omniscience — caller ID solved it, you already
 *    have my information in your system. So a call opens with a gist and
 *    a ward signature, and neither identifies a shipment.
 *
 * 2. **Memory is unreliable by TYPE, not by elapsed time.** Gist and
 *    emotion are very reliable and stay that way. Numbers, dates and
 *    names are unreliable immediately. What *we* told them is the least
 *    reliable thing of all. This is not a decay curve.
 *
 * 3. **A receipt is externalised memory** — and it carries exactly the
 *    fields recall is worst at. Reading is not remembering, so whether
 *    the caller is holding the paper is the single biggest variable in
 *    a call.
 *
 * The consequence that makes it a game: you cannot search precisely,
 * because details are unreliable — but gist IS reliable, so when you
 * land on the wrong record and read it back, they catch you. The two
 * halves of memory do opposite jobs.
 */

// ---------------------------------------------------------------------
// Reliability, by memory type
// ---------------------------------------------------------------------

/**
 * How often each kind of memory survives intact.
 *
 * Sourced from Phil's summary of the research rather than invented:
 * gist very high; emotion high (emotion buffers against distortion);
 * one's own words moderate-high (speakers and addressees recall far more
 * than bystanders); exact dialogue extremely low (~10% verbatim five
 * minutes after a casual conversation); personal details low (the single
 * most common social-memory failure).
 *
 * VALUES CHOSEN, NOT SPECIFIED: the research gives one hard number (~0.1
 * verbatim). The rest are ordered correctly and spaced plausibly. They
 * are meant to be tuned against generated output, not defended.
 */
const RELIABILITY = {
  gist: 0.95,
  emotion: 0.9,
  ownWords: 0.75,
  personalDetail: 0.35,
  ourWords: 0.1,
  // Reference numbers are a category of their own and the harshest.
  // Nobody memorises an order number; without the paper they either dig
  // it out or they do not have it. Split out from personalDetail after
  // reading generated output, where a 35% recall rate had callers
  // reciting "SO-4796" from memory -- which is the exact omniscience
  // fantasy this model exists to remove.
  referenceNumber: 0.08,
};

/** Which memory type each field of a shipment order is stored as. */
const FIELD_MEMORY = {
  contents: 'gist',
  counterparty: 'gist',
  destination: 'gist',
  bookedOn: 'personalDetail',
  orderNumber: 'referenceNumber',
  trackingNumber: 'referenceNumber',
  expectedArrival: 'ourWords',
};

/**
 * How sharp a remembered detail is. Precision is not confidence — a
 * caller can be certain of something vague and equally certain of
 * something wrong.
 */
const PRECISION = ['exact', 'approximate', 'vague', 'absent'];

// ---------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

// ---------------------------------------------------------------------
// The world: orders and the items inside them
// ---------------------------------------------------------------------

/**
 * What TLC declares a shipment AS. Not what is in it -- the co-op never
 * knows that. This is the shipper's declaration plus whatever a clerk
 * stamped on it for tariff and handling, which is exactly where "Pigs is
 * Pigs" disputes come from.
 */
const DECLARED_CLASSES = ['general goods', 'preserved goods', 'fragile', 'hazardous', 'livestock', 'restricted'];

/**
 * What is ACTUALLY inside. World-truth, and deliberately NOT a field on
 * any record -- see rollOrder(). It exists so the caller has something
 * true to be thinking of, and so we can prove the agent cannot search on
 * it.
 */
const GOODS = [
  { kind: 'healing potions', size: 'small', unit: 'crate', declaresAs: 'fragile' },
  { kind: 'healing potions', size: 'large', unit: 'crate', declaresAs: 'fragile' },
  { kind: 'lamp oil', size: null, unit: 'barrel', declaresAs: 'hazardous' },
  { kind: 'ward stones', size: null, unit: 'case', declaresAs: 'restricted' },
  { kind: 'bandage linen', size: null, unit: 'bale', declaresAs: 'general goods' },
  { kind: 'iron nails', size: null, unit: 'keg', declaresAs: 'general goods' },
  { kind: 'salt fish', size: null, unit: 'barrel', declaresAs: 'preserved goods' },
  { kind: 'writing vellum', size: null, unit: 'bundle', declaresAs: 'general goods' },
];

const GIVEN = ['Garrick','Tess','Rowan','Mabel','Corin','Ines','Dob','Hettie','Elias','Nan'];
const FAMILY = ['Marrow','Underhay','Vance','Pell','Ashdown','Quill','Barrow','Fenn'];

const PLACES = ['Bramble', 'Ashford', 'Little Deeping', 'Harrow Cross', 'Mirwood', 'Stonecap', 'Fen End'];

/**
 * Where an item has actually got to. This is the truth of the world and
 * it exists whether or not anybody finds it.
 */
const ITEM_STATES = [
  { id: 'delivered', weight: 5 },
  { id: 'leg-two-running', weight: 3 },
  { id: 'awaiting-collection', weight: 2 },
  { id: 'held-at-node', weight: 1 },
  { id: 'never-collected', weight: 1 },
];

function weightedPick(items, rng) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const i of items) {
    r -= i.weight;
    if (r <= 0) return i;
  }
  return items[items.length - 1];
}

/**
 * Builds one shipment order, with one or more separately tracked items.
 *
 * **One order, many items, possibly many destinations.** This is where
 * the ambiguity in "where's my order?" comes from honestly, rather than
 * being authored as a puzzle: we may hold five items under it, three
 * delivered and one never collected, and the caller means one of them —
 * or all of them, and does not distinguish.
 *
 * @param {object} opts
 * @param {string} opts.account - account reference the order sits under
 * @param {number} opts.today - the current day number
 * @param {function} [opts.rng=Math.random]
 * @returns {{orderNumber: string, account: string, bookedOn: number,
 *   items: Array<object>}}
 */
function rollOrder({ account, today, rng = Math.random }) {
  const orderNumber = `SO-${1000 + Math.floor(rng() * 9000)}`;
  const bookedOn = today - (2 + Math.floor(rng() * 12));
  const itemCount = 1 + Math.floor(rng() * rng() * 5); // skewed toward few
  const sharedDestination = rng() < 0.7 ? pick(PLACES, rng) : null;

  const items = [];
  for (let i = 0; i < itemCount; i++) {
    const goods = pick(GOODS, rng);
    const origin = pick(PLACES, rng);
    items.push({
      // --- what TLC holds, and can therefore search or read back ---
      trackingNumber: `TK-${100000 + Math.floor(rng() * 900000)}`,
      orderNumber,
      // The SHIPPER declares it, so it usually fits what is inside --
      // and sometimes does not, because a cheaper class is a cheaper
      // rate. That gap is "Pigs is Pigs", and TLC cannot check it,
      // because TLC cannot see inside.
      declaredClass: rng() < 0.85 ? goods.declaresAs : pick(DECLARED_CLASSES, rng),
      packageCount: 1 + Math.floor(rng() * 40),
      unit: goods.unit,
      origin,
      counterparty: `${pick(GIVEN, rng)} ${pick(FAMILY, rng)}`,
      destination: sharedDestination || pick(PLACES, rng),
      expectedArrival: bookedOn + 3 + Math.floor(rng() * 6),
      state: weightedPick(ITEM_STATES, rng).id,
      // --- world-truth, NOT on the record. The co-op never sees inside
      // a sealed barrel. Present here only so the caller has something
      // real to be thinking of. Never search on it. ---
      trueContents: goods,
    });
  }
  return { orderNumber, account, bookedOn, items };
}

/**
 * Builds the surrounding world of orders, so that a search can return
 * several candidates, or the wrong one, without either being staged.
 *
 * @param {object} opts
 * @param {string} opts.account - the calling account
 * @param {number} opts.today
 * @param {number} [opts.otherOrders=6] - orders belonging to other accounts
 * @param {function} [opts.rng=Math.random]
 */
function rollWorld({ account, today, otherOrders = 6, rng = Math.random }) {
  const own = [];
  const ownCount = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < ownCount; i++) own.push(rollOrder({ account, today, rng }));

  const others = [];
  for (let i = 0; i < otherOrders; i++) {
    others.push(rollOrder({ account: `AC-${100 + Math.floor(rng() * 900)}`, today, rng }));
  }
  return { orders: [...own, ...others], today };
}

// ---------------------------------------------------------------------
// The caller's picture — impressions, never values
// ---------------------------------------------------------------------

function goodsGist(goods) {
  return goods.kind;
}

/**
 * How a record reads when an agent says it aloud.
 *
 * Note what is absent: what is in it. The co-op holds a count, a unit, a
 * declared class, a route and the parties. So a readback offers the
 * SHAPE of a shipment, and the caller recognises it by that -- never by
 * hearing their own words for the contents repeated back.
 */
function describeRecord(item) {
  const unit = item.packageCount === 1 ? item.unit : `${item.unit}s`;
  return `${item.packageCount} ${unit}, ${item.declaredClass}, from ${item.counterparty} of ${item.origin} to ${item.destination}`;
}

/**
 * A day number rendered the way somebody would actually say it.
 * "It was meant to be with us day 32" is a machine talking.
 */
function sayDay(day) {
  const d = ((day - 1) % 28) + 1;
  const suffix = d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th';
  return `the ${d}${suffix}`;
}

/**
 * Degrades one true field into what the caller actually holds.
 *
 * Returns an IMPRESSION, never a value. An impression has a `precision`
 * (how sharp), a `stated` (what they will say), a `value` (what it can
 * be searched on, which may be wrong), and `certain` (whether they
 * believe it). Certainty is independent of accuracy — that pairing is
 * what produces a confidently wrong search.
 *
 * @param {string} field - key of FIELD_MEMORY
 * @param {*} truth - the true value
 * @param {object} ctx - { hasReceipt, today, goods, quantity }
 * @param {function} rng
 */
function degrade(field, truth, ctx, rng) {
  const memory = FIELD_MEMORY[field];
  const onPaper = ctx.hasReceipt
    && ['orderNumber', 'trackingNumber', 'bookedOn', 'expectedArrival'].includes(field);

  // Reading is not remembering. The receipt carries exactly the fields
  // recall is worst at, so holding it converts them to exact.
  if (onPaper) {
    const paperText = (field === 'bookedOn' || field === 'expectedArrival') ? sayDay(truth) : String(truth);
    return { precision: 'exact', value: truth, stated: paperText, certain: true, fromPaper: true };
  }

  const survives = rng() < RELIABILITY[memory];

  if (field === 'counterparty') {
    return survives
      ? { precision: 'exact', value: truth, stated: truth, certain: true }
      : { precision: 'vague', value: null, stated: 'someone over that way, I forget the name', certain: false };
  }

  if (field === 'contents') {
    // Gist is very reliable but it is still gist: "potions", not "forty
    // small healing potions".
    return survives
      ? { precision: 'vague', value: goodsGist(ctx.goods), stated: goodsGist(ctx.goods), certain: true }
      : { precision: 'vague', value: goodsGist(ctx.goods), stated: `${goodsGist(ctx.goods)} — or something like it`, certain: false };
  }

  if (field === 'destination') {
    if (survives) return { precision: 'exact', value: truth, stated: truth, certain: true };
    return { precision: 'vague', value: truth, stated: `somewhere out past ${truth}`, certain: false };
  }

  if (field === 'bookedOn') {
    if (survives) {
      const off = Math.round((rng() - 0.5) * 4);
      const value = truth + off;
      return {
        precision: off === 0 ? 'exact' : 'approximate',
        value,
        stated: off === 0 ? sayDay(truth) : `around ${sayDay(value)}, give or take`,
        certain: rng() < 0.6,
      };
    }
    return { precision: 'vague', value: null, stated: 'a week or two back, I could not tell you exactly', certain: false };
  }

  if (field === 'orderNumber' || field === 'trackingNumber') {
    // The 48% category. Usually simply absent; occasionally garbled and
    // held with confidence, which is how a search lands on somebody
    // else's order.
    if (survives) {
      if (rng() < 0.25) {
        const garbled = String(truth).replace(/\d$/, String(Math.floor(rng() * 10)));
        return { precision: 'exact', value: garbled, stated: garbled, certain: true, garbled: true };
      }
      return { precision: 'exact', value: truth, stated: String(truth), certain: true };
    }
    return { precision: 'absent', value: null, stated: null, certain: false };
  }

  if (field === 'expectedArrival') {
    // What WE told them. ~10% verbatim. And misremembered promises run
    // EARLY, not late — a chosen bias, not from the research: people
    // recall a commitment as more favourable than it was, which is what
    // makes "you told me Tuesday" a real memory and still wrong.
    if (survives) return { precision: 'exact', value: truth, stated: sayDay(truth), certain: true };
    const early = truth - (1 + Math.floor(rng() * 3));
    return { precision: 'approximate', value: early, stated: `${sayDay(early)} — that is what I was told`, certain: true, misremembered: true };
  }

  return { precision: 'absent', value: null, stated: null, certain: false };
}

/**
 * Builds the caller: which item they are actually ringing about, and the
 * picture of it they carry in their head.
 *
 * @param {object} opts
 * @param {object} opts.order - the order they are calling about
 * @param {object} opts.item - the item they actually mean
 * @param {number} opts.today
 * @param {boolean} [opts.hasReceipt] - forced, for tests
 * @param {function} [opts.rng=Math.random]
 */
function rollCaller({ order, item, today, hasReceipt, rng = Math.random }) {
  const holding = typeof hasReceipt === 'boolean' ? hasReceipt : rng() < 0.35;
  const ctx = { hasReceipt: holding, today, goods: item.trueContents, quantity: item.packageCount };

  const picture = {
    // What they will lead with, and the one thing we cannot search on.
    contents: degrade('contents', item.trueContents, ctx, rng),
    counterparty: degrade('counterparty', item.counterparty, ctx, rng),
    destination: degrade('destination', item.destination, ctx, rng),
    bookedOn: degrade('bookedOn', order.bookedOn, ctx, rng),
    orderNumber: degrade('orderNumber', order.orderNumber, ctx, rng),
    trackingNumber: degrade('trackingNumber', item.trackingNumber, ctx, rng),
    expectedArrival: degrade('expectedArrival', item.expectedArrival, ctx, rng),
  };

  return {
    account: order.account,
    name: `${pick(GIVEN, rng)} ${pick(FAMILY, rng)}`,
    hasReceipt: holding,
    // Whether they distinguish one item from the whole order. Callers
    // with a multi-item order often do not.
    meansWholeOrder: order.items.length > 1 && rng() < 0.5,
    trueOrderNumber: order.orderNumber,
    trueTrackingNumber: item.trackingNumber,
    picture,
  };
}

// ---------------------------------------------------------------------
// The ward signature — caller ID, and it identifies a line
// ---------------------------------------------------------------------

/**
 * What the registry offers when the call connects.
 *
 * A ward signature identifies **a line, not a person**. A shop where
 * five people use the same one, a household, a guild hall — or a Node
 * Partner's own line, when the caller has walked in to collect something
 * and it was not there.
 *
 * So it yields a PRESUMPTION, and the failure mode is not "unmatched".
 * It is matched, confidently, to the wrong party — which the caller will
 * never think to correct, because as far as they are concerned you
 * already know who they are.
 *
 * @returns {{match: 'account'|'node'|'none', account: string|null,
 *   nodeName: string|null, trustworthy: boolean}}
 */
function rollWardSignature(callingAccount, rng = Math.random) {
  const roll = rng();
  if (roll < 0.15) {
    return { match: 'none', account: null, nodeName: null, trustworthy: false };
  }
  if (roll < 0.3) {
    // Ringing from a Node Partner's line — standing at the counter,
    // having gone to collect something that was not there.
    return {
      match: 'node',
      account: null,
      nodeName: `${pick(PLACES, rng)} Node`,
      trustworthy: false,
    };
  }
  if (roll < 0.45) {
    // A shared line. Resolves to a real account on it, but not this one.
    return {
      match: 'account',
      account: `AC-${100 + Math.floor(rng() * 900)}`,
      nodeName: null,
      trustworthy: false,
    };
  }
  return { match: 'account', account: callingAccount, nodeName: null, trustworthy: true };
}

// ---------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------

/**
 * Searches the world against whatever the agent has actually gathered.
 *
 * This replaces `canLookUpRecords(identified)` — a boolean gate that
 * conflated identifying the CALLER with identifying the CASE, and was
 * satisfied by the wrong fact. There is no gate and no required order.
 * There are several sufficient sets of criteria, and different players
 * will reach them by different routes, which is the point: intake is a
 * toolkit with tradeoffs, never a checklist.
 *
 * @param {object} world - from rollWorld()
 * @param {object} criteria - any of { account, orderNumber, trackingNumber,
 *   goods, destination, bookedOn }
 * @returns {{status: 'nothing'|'one'|'several', items: Array<object>}}
 */
function search(world, criteria) {
  let items = world.orders.flatMap((o) => o.items.map((i) => ({ ...i, account: o.account, bookedOn: o.bookedOn })));

  if (criteria.trackingNumber) items = items.filter((i) => i.trackingNumber === criteria.trackingNumber);
  if (criteria.orderNumber) items = items.filter((i) => i.orderNumber === criteria.orderNumber);
  if (criteria.account) items = items.filter((i) => i.account === criteria.account);
  // NO CONTENTS FILTER, deliberately. TLC does not know what is inside,
  // so what the caller calls it ("salt fish") matches nothing. This is
  // the single most important constraint in the model: the caller's
  // primary handle on their own shipment is the one thing we cannot
  // look up.
  if (criteria.counterparty) items = items.filter((i) => i.counterparty === criteria.counterparty);
  if (criteria.destination) items = items.filter((i) => i.destination === criteria.destination);
  if (typeof criteria.bookedOn === 'number') {
    items = items.filter((i) => Math.abs(i.bookedOn - criteria.bookedOn) <= 2);
  }

  const status = items.length === 0 ? 'nothing' : items.length === 1 ? 'one' : 'several';
  return { status, items };
}

/**
 * The gist check — reading a record back, and letting them recognise it.
 *
 * This is the other half of the memory model doing the opposite job.
 * Details are unreliable, so a search can land on the wrong record.
 * Gist IS reliable, so when the agent reads back what they are looking
 * at, the caller catches it. Recognition works where recall does not,
 * which is why sharing what you can see is the core intake move rather
 * than a courtesy.
 *
 * Per Phil: landing on the wrong record is possible, but in practice one
 * side or the other notices in the moment and forces a course
 * correction. It costs time and a little credibility. It is not a trap.
 *
 * @param {object} item - the record the agent is reading back
 * @param {object} caller - from rollCaller()
 * @returns {{fits: boolean, objection: string|null}}
 */
function gistCheck(item, caller) {
  const theirPlace = caller.picture.destination.value;
  const theirCounterparty = caller.picture.counterparty.value;

  // They cannot check the contents against ours, because we did not say
  // any. They check the SHAPE: who sent it, and where it was going.
  if (theirCounterparty && item.counterparty !== theirCounterparty) {
    return { fits: false, objection: `That is not from ${theirCounterparty}. Mine came from ${theirCounterparty}.` };
  }
  if (item.destination !== theirPlace) {
    return { fits: false, objection: `That is going to ${item.destination}. Mine was for ${theirPlace}.` };
  }
  if (item.trackingNumber !== caller.trueTrackingNumber && !caller.meansWholeOrder) {
    // Same goods, same place, different parcel. The gist fits, so this
    // one gets through — which is exactly how a call goes wrong quietly.
    return { fits: true, objection: null, silentlyWrong: true };
  }
  return { fits: true, objection: null };
}

module.exports = {
  RELIABILITY,
  FIELD_MEMORY,
  PRECISION,
  GOODS,
  PLACES,
  GIVEN,
  FAMILY,
  ITEM_STATES,
  goodsGist,
  describeRecord,
  sayDay,
  DECLARED_CLASSES,
  degrade,
  rollOrder,
  rollWorld,
  rollCaller,
  rollWardSignature,
  search,
  gistCheck,
};
