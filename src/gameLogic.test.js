const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateShift,
  resolveTicket,
  resolveInvestigation,
  investigationTimeCost,
  endShift,
  dispositionTag,
  readCues,
  FEELING_AXES,
  rollTraits,
  rollWrinkles,
  applyDisposition,
  recallMemory,
  accountDivergences,
  decayChanceFor,
  candleStage,
  rollOpening,
  guardednessOf,
  probeForRequest,
  OPENING_MODES,
  SHIFT_CANDLE_NOTCHES,
  DECOY_AGENT_NAMES,
  RESPONSE_QUALITY,
  PHANTOM_INVENTORY_TEMPLATE,
  TICKET_TEMPLATES,
  DOMAINS,
  registerOf,
  DELIVERIES,
  deliveryFit,
  deliveryPreference,
  rollDayVariance,
  situationalPressure,
  familiarityOf,
  askRelationshipCost,
  ARCHETYPE_REGISTERS,
  CUSTOMER_TYPES,
  rollRootCause,
  buildInvestigation,
} = require('./gameLogic');

/** Deterministic PRNG (mulberry32) so tests are reproducible. */
function seededRng(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('generateShift: produces the requested-ish number of tickets', () => {
  const { tickets } = generateShift({ knownCustomers: [], baseTicketCount: 8, rng: seededRng(1) });
  // Modifiers can scale count up/down, but it should stay in a sane band.
  assert.ok(tickets.length >= 5 && tickets.length <= 14, `got ${tickets.length} tickets`);
});

test('generateShift: every ticket references a customer in the pool', () => {
  const { tickets, customerPool } = generateShift({ baseTicketCount: 6, rng: seededRng(2) });
  const poolIds = new Set(customerPool.map((c) => c.id));
  for (const ticket of tickets) {
    assert.ok(poolIds.has(ticket.customerId), `ticket ${ticket.id} has unknown customer`);
  }
});

test('generateShift: rolls 1 or 2 modifiers, never 0 or 3+', () => {
  for (let seed = 0; seed < 20; seed++) {
    const { modifiers } = generateShift({ baseTicketCount: 6, rng: seededRng(seed) });
    assert.ok(modifiers.length === 1 || modifiers.length === 2, `seed ${seed} got ${modifiers.length}`);
  }
});

test('generateShift: returning customers can end up anywhere in the queue, not just first/last', () => {
  // Build a known roster with history so they're eligible to "return".
  const knownCustomers = Array.from({ length: 6 }, (_, i) => ({
    id: `known-${i}`,
    tier: 'endUser',
    archetype: 'Hero',
    disposition: 10,
    history: [{ shiftId: 0, ticketCategory: 'Respawn Delay', quality: 'correct', dispositionAfter: 10 }],
  }));

  const positions = [];
  for (let seed = 0; seed < 40; seed++) {
    const { tickets } = generateShift({ knownCustomers, baseTicketCount: 8, rng: seededRng(seed) });
    const idx = tickets.findIndex((t) => t.isReturning);
    if (idx >= 0) positions.push(idx);
  }
  const min = Math.min(...positions);
  const max = Math.max(...positions);
  // Over 40 seeded runs we should see returning customers land in more
  // than just the first or last slot.
  assert.ok(max - min >= 3, `positions too clustered: ${positions.join(',')}`);
});

const neutralCustomer = (over = {}) => ({
  id: 'c1', tier: 'endUser', archetype: 'Hero',
  disposition: { you: 0, tlc: 0, experience: 0, understanding: 0 },
  traits: { baggage: { you: 0, tlc: 0, experience: 0 }, sensitivity: 1, socialFilter: 1 },
  history: [],
  ...over,
});

test('resolveTicket: a correct response moves ALL THREE feeling axes', () => {
  // Correctness is not a fact about the company alone. Getting it right
  // is also a fact about the agent who did it and about how the episode
  // went. See LORE.md, "Inputs spill across axes."
  const customer = neutralCustomer();
  const ticket = { id: 't1', customerId: 'c1', category: 'Respawn Delay', urgency: 3, timeCostMultiplier: 1 };

  const { customer: updated, outcome } = resolveTicket(ticket, customer, 'correct', 'resolved', 1);

  assert.equal(updated.disposition.tlc, RESPONSE_QUALITY.correct.dispositionDelta);
  for (const axis of FEELING_AXES) {
    assert.ok(updated.disposition[axis] > 0, `${axis} should have risen`);
  }
  // Understanding is NOT a feeling and correctness alone does not move
  // it -- only Education does, and Education is not built.
  assert.equal(updated.disposition.understanding, 0);

  assert.equal(outcome.reputationDelta, RESPONSE_QUALITY.correct.reputationDelta);
  assert.equal(updated.history[0].quality, 'correct');
});

test('resolveTicket: a dismissive response lowers every feeling axis', () => {
  const customer = neutralCustomer({ id: 'c2', tier: 'partner', archetype: 'Tavern' });
  const ticket = { id: 't2', customerId: 'c2', category: 'Phantom Inventory', urgency: 2, timeCostMultiplier: 1 };

  const { customer: updated, outcome } = resolveTicket(ticket, customer, 'dismissive', 'resolved', 1);

  for (const axis of FEELING_AXES) {
    assert.ok(updated.disposition[axis] < 0, `${axis} should have fallen`);
  }
  assert.ok(outcome.reputationDelta < 0);
});

test('resolveTicket: every axis stays inside -100..100', () => {
  let customer = neutralCustomer({
    id: 'c3', archetype: 'Villain',
    disposition: { you: 95, tlc: 95, experience: 95, understanding: 0 },
  });
  const ticket = { id: 't3', customerId: 'c3', category: 'XP Miscount Dispute', urgency: 1, timeCostMultiplier: 1 };

  ({ customer } = resolveTicket(ticket, customer, 'correct', 'resolved', 1));
  assert.equal(customer.disposition.tlc, 100);
  for (const axis of FEELING_AXES) assert.ok(customer.disposition[axis] <= 100);

  customer = { ...customer, disposition: { you: -95, tlc: -95, experience: -95, understanding: 0 } };
  ({ customer } = resolveTicket(ticket, customer, 'dismissive', 'resolved', 2));
  for (const axis of FEELING_AXES) assert.ok(customer.disposition[axis] >= -100);
  assert.equal(customer.disposition.tlc, -100);
});

test('resolveTicket: rejects an unknown response quality', () => {
  const customer = { id: 'c4', tier: 'business', archetype: 'Kingdom', disposition: 0, history: [] };
  const ticket = { id: 't4', customerId: 'c4', category: 'Garrison Supply Shortfall', urgency: 3, timeCostMultiplier: 1 };

  assert.throws(() => resolveTicket(ticket, customer, 'nonsense', 'resolved', 1), /Unknown response quality/);
});

test('resolveTicket: does not mutate the customer object passed in', () => {
  const customer = { id: 'c5', tier: 'endUser', archetype: 'NPC', disposition: 0, history: [] };
  const ticket = { id: 't5', customerId: 'c5', category: 'Cursed Item Return', urgency: 2, timeCostMultiplier: 1 };

  resolveTicket(ticket, customer, 'correct', 'resolved', 1);

  assert.equal(customer.disposition, 0);
  assert.equal(customer.history.length, 0);
});

test('dispositionTag: maps score ranges to expected tags', () => {
  assert.equal(dispositionTag(-80), 'hostile');
  assert.equal(dispositionTag(-30), 'frustrated');
  assert.equal(dispositionTag(0), 'neutral');
  assert.equal(dispositionTag(40), 'warm');
  assert.equal(dispositionTag(90), 'loyal');
});

test('endShift: sums reputation delta and clamps to 0-100', () => {
  const outcomes = [
    { ticketId: 't1', quality: 'correct', status: 'resolved', reputationDelta: 2, timeSpent: 4, dispositionTag: 'warm', followUp: null },
    { ticketId: 't2', quality: 'dismissive', status: 'resolved', reputationDelta: -3, timeSpent: 1, dispositionTag: 'hostile', followUp: null },
  ];
  const result = endShift(outcomes, 50, 1, seededRng(1));
  assert.equal(result.reputation, 49);
  assert.equal(result.summary.ticketsHandled, 2);
});

test('endShift: the summary reports work, never how customers felt', () => {
  // A shift summary is calls handled and case dispositions. How a
  // customer felt is not knowable at end of shift -- it comes back
  // later through the survey chain, filtered through a manager, or
  // never at all. See LORE.md, "Running the Desk."
  //
  // This test exists because the summary DID tally dispositionTag
  // counts, and the prototype printed "N customers left feeling X"
  // straight off them. Re-adding any feeling tally here should fail.
  const outcomes = [
    { ticketId: 't1', quality: 'correct', status: 'resolved', reputationDelta: 2, timeSpent: 4, dispositionTag: 'loyal', followUp: null },
    { ticketId: 't2', quality: 'dismissive', status: 'hold', reputationDelta: -3, timeSpent: 1, dispositionTag: 'hostile', followUp: null },
    { ticketId: 't3', quality: 'adequate', status: 'transfer', reputationDelta: 1, timeSpent: 2, dispositionTag: 'neutral', followUp: null },
  ];
  const { summary } = endShift(outcomes, 50, 1, seededRng(7));

  assert.deepEqual(summary.statusCounts, { resolved: 1, hold: 1, transfer: 1 });
  assert.equal(summary.ticketsHandled, 3);

  // No key anywhere in the summary carries a disposition tag as data,
  // however it might get named.
  const tags = ['loyal', 'warm', 'neutral', 'frustrated', 'hostile'];
  const serialized = JSON.stringify(summary);
  for (const tag of tags) {
    assert.equal(serialized.includes(tag), false, `summary leaked the "${tag}" disposition tag`);
  }
  assert.equal('tagCounts' in summary, false);
});

test('endShift: reputation cannot go below 0 or above 100', () => {
  const badOutcomes = [{ ticketId: 't1', quality: 'dismissive', status: 'resolved', reputationDelta: -3, timeSpent: 1, dispositionTag: 'hostile', followUp: null }];
  assert.equal(endShift(badOutcomes, 1, 1, seededRng(1)).reputation, 0);

  const goodOutcomes = [{ ticketId: 't1', quality: 'correct', status: 'resolved', reputationDelta: 2, timeSpent: 4, dispositionTag: 'loyal', followUp: null }];
  assert.equal(endShift(goodOutcomes, 99, 1, seededRng(2)).reputation, 100);
});

test('recallMemory: first-time customer has no memory', () => {
  const customer = { id: 'c6', tier: 'endUser', archetype: 'Hero', disposition: 0, history: [] };
  assert.equal(recallMemory(customer, 1), null);
});

test('recallMemory: an all-"adequate" history yields tone only, no specifics', () => {
  const customer = {
    id: 'c7', tier: 'endUser', archetype: 'NPC', disposition: 8,
    history: [
      { shiftId: 1, ticketCategory: 'Respawn Delay', quality: 'adequate', dispositionAfter: 4 },
      { shiftId: 2, ticketCategory: 'XP Miscount Dispute', quality: 'rushed', dispositionAfter: 8 },
    ],
  };
  assert.deepEqual(recallMemory(customer, 5), { style: 'tone' });
});

test('recallMemory: a same-shift memorable incident is recalled with full fidelity', () => {
  // currentShiftId === the incident's own shift -> zero elapsed time ->
  // zero decay chance -> every detail should come back accurate.
  const customer = {
    id: 'c8', tier: 'partner', archetype: 'Tavern', disposition: -18,
    history: [{ shiftId: 1, ticketCategory: 'Phantom Inventory', quality: 'dismissive', dispositionAfter: -18 }],
  };
  const memory = recallMemory(customer, 1);
  assert.equal(memory.style, 'explicit');
  assert.equal(memory.category, 'Phantom Inventory');
  assert.equal(memory.quality, 'dismissive');
  assert.equal(memory.categoryAccurate, true);
  assert.equal(memory.timingAccurate, true);
  assert.equal(memory.agentAccurate, true);
  assert.equal(memory.agentAttribution, 'you');
  assert.equal(memory.shiftsAgoReported, 0);
});

test('recallMemory: peak overrides a milder, more recent interaction (selection, not decay)', () => {
  // One dismissive incident, then a merely-adequate one in the same
  // shift. currentShiftId matches the remembered incident so decay
  // chance is zero — this test isolates *which* incident gets chosen,
  // not how faithfully it's recalled.
  const customer = {
    id: 'c9', tier: 'business', archetype: 'Kingdom', disposition: -8,
    history: [
      { shiftId: 1, ticketCategory: 'Border Ward Malfunction', quality: 'dismissive', dispositionAfter: -18 },
      { shiftId: 1, ticketCategory: 'Garrison Supply Shortfall', quality: 'adequate', dispositionAfter: -8 },
    ],
  };
  const memory = recallMemory(customer, 1);
  assert.equal(memory.style, 'explicit');
  assert.equal(memory.category, 'Border Ward Malfunction');
});

test('recallMemory: two memorable incidents — most recent memorable one wins over an older one', () => {
  const customer = {
    id: 'c10', tier: 'endUser', archetype: 'Villain', disposition: 30,
    history: [
      { shiftId: 1, ticketCategory: 'Cursed Item Return', quality: 'dismissive', dispositionAfter: -18 },
      { shiftId: 5, ticketCategory: 'Quest Line Bug', quality: 'correct', dispositionAfter: 30 },
    ],
  };
  const memory = recallMemory(customer, 5);
  assert.equal(memory.style, 'explicit');
  assert.equal(memory.category, 'Quest Line Bug');
});

test('decayChanceFor: zero at zero elapsed shifts, capped at MAX_DECAY_CHANCE for large gaps', () => {
  assert.equal(decayChanceFor(0), 0);
  assert.ok(decayChanceFor(3) > 0 && decayChanceFor(3) < 1);
  assert.equal(decayChanceFor(100), 0.8); // MAX_DECAY_CHANCE
});

test('recallMemory: recent recall (shiftsSince=0) is always fully accurate, regardless of rng', () => {
  const customer = {
    id: 'c11', tier: 'endUser', archetype: 'Hero', disposition: 20,
    history: [{ shiftId: 3, ticketCategory: 'Respawn Delay', quality: 'correct', dispositionAfter: 20 }],
  };
  // Even an rng that always rolls "fail" (returns 0) can't cause decay
  // when decayChance is 0 — zero time has passed, nothing has faded yet.
  const memory = recallMemory(customer, 3, () => 0);
  assert.equal(memory.categoryAccurate, true);
  assert.equal(memory.timingAccurate, true);
  assert.equal(memory.agentAccurate, true);
});

test('recallMemory: distant recall can misremember category, timing, and agent independently', () => {
  const customer = {
    id: 'c12', tier: 'endUser', archetype: 'Hero', disposition: 20,
    history: [{ shiftId: 1, ticketCategory: 'Respawn Delay', quality: 'correct', dispositionAfter: 20 }],
  };
  // Ten shifts later, decay chance is capped at MAX_DECAY_CHANCE (0.8).
  // Across many seeds we should see every fidelity flag flip false at
  // least once, and never see all three fail on every single roll.
  const seen = { categoryFalse: false, timingFalse: false, agentFalse: false, anyTrue: false };
  for (let seed = 0; seed < 60; seed++) {
    const memory = recallMemory(customer, 11, seededRng(seed));
    if (!memory.categoryAccurate) seen.categoryFalse = true;
    if (!memory.timingAccurate) seen.timingFalse = true;
    if (!memory.agentAccurate) seen.agentFalse = true;
    if (memory.categoryAccurate || memory.timingAccurate || memory.agentAccurate) seen.anyTrue = true;
  }
  assert.ok(seen.categoryFalse, 'expected at least one misremembered category across 60 seeds');
  assert.ok(seen.timingFalse, 'expected at least one misremembered timing across 60 seeds');
  assert.ok(seen.agentFalse, 'expected at least one misremembered agent across 60 seeds');
  assert.ok(seen.anyTrue, 'decay is capped below 1.0, so some detail should still land accurate sometimes');
});

test('recallMemory: a misremembered category is still a real category for that customer\'s tier', () => {
  const customer = {
    id: 'c13', tier: 'partner', archetype: 'Blacksmith', disposition: -30,
    history: [{ shiftId: 1, ticketCategory: 'Commission Payout Dispute', quality: 'dismissive', dispositionAfter: -30 }],
  };
  const validCategories = new Set(require('./gameLogic').TICKET_TEMPLATES.partner.map((t) => t.category));
  for (let seed = 0; seed < 20; seed++) {
    const memory = recallMemory(customer, 9, seededRng(seed));
    assert.ok(validCategories.has(memory.category), `"${memory.category}" is not a valid partner ticket category`);
    if (!memory.categoryAccurate) {
      assert.notEqual(memory.category, 'Commission Payout Dispute');
    }
  }
});

test('recallMemory: a misattributed agent is always one of the decoy names, never "you"', () => {
  const customer = {
    id: 'c14', tier: 'business', archetype: 'Town Council', disposition: 10,
    history: [{ shiftId: 1, ticketCategory: 'Bulk Potion Order Delay', quality: 'correct', dispositionAfter: 10 }],
  };
  for (let seed = 0; seed < 20; seed++) {
    const memory = recallMemory(customer, 9, seededRng(seed));
    if (!memory.agentAccurate) {
      assert.notEqual(memory.agentAttribution, 'you');
      assert.ok(DECOY_AGENT_NAMES.includes(memory.agentAttribution));
    } else {
      assert.equal(memory.agentAttribution, 'you');
    }
  }
});

test('endShift: commendations only accrue from non-negative outcomes', () => {
  const outcomes = [
    { ticketId: 't1', quality: 'correct', status: 'resolved', reputationDelta: 2, timeSpent: 4, dispositionTag: 'warm', followUp: null },
    { ticketId: 't2', quality: 'dismissive', status: 'resolved', reputationDelta: -3, timeSpent: 1, dispositionTag: 'hostile', followUp: null },
  ];
  const result = endShift(outcomes, 50, 1, seededRng(3));
  assert.equal(result.commendationsEarned, 2);
});

test('resolveTicket: rejects an unknown resolution status', () => {
  const customer = { id: 'c15', tier: 'endUser', archetype: 'Sidekick', disposition: 0, history: [] };
  const ticket = { id: 't15', customerId: 'c15', category: 'Respawn Delay', urgency: 2, timeCostMultiplier: 1 };
  assert.throws(() => resolveTicket(ticket, customer, 'correct', 'archived', 1), /Unknown resolution status/);
});

test('resolveTicket: "hold" always produces a hold follow-up seed, regardless of quality', () => {
  const customer = { id: 'c16', tier: 'business', archetype: 'Military', disposition: 0, history: [] };
  const ticket = { id: 't16', customerId: 'c16', category: 'Garrison Supply Shortfall', urgency: 4, timeCostMultiplier: 1 };
  const { outcome } = resolveTicket(ticket, customer, 'rushed', 'hold', 1);
  assert.deepEqual(outcome.followUp, { kind: 'hold', ticketCategory: 'Garrison Supply Shortfall', customerId: 'c16' });
});

test('resolveTicket: "transfer" never produces a follow-up, even when handled poorly', () => {
  const customer = { id: 'c17', tier: 'partner', archetype: 'Inn', disposition: 0, history: [] };
  const ticket = { id: 't17', customerId: 'c17', category: 'Storefront Listing Error', urgency: 1, timeCostMultiplier: 1 };
  const { outcome } = resolveTicket(ticket, customer, 'dismissive', 'transfer', 1);
  assert.equal(outcome.followUp, null);
});

test('resolveTicket: "resolved" carries a reopen-risk sized to response quality', () => {
  const customer = { id: 'c18', tier: 'endUser', archetype: 'Hero', disposition: 0, history: [] };
  const ticket = { id: 't18', customerId: 'c18', category: 'XP Miscount Dispute', urgency: 1, timeCostMultiplier: 1 };

  const dismissed = resolveTicket(ticket, customer, 'dismissive', 'resolved', 1).outcome;
  const fixed = resolveTicket(ticket, customer, 'correct', 'resolved', 1).outcome;

  assert.equal(dismissed.followUp.kind, 'reopen-risk');
  assert.equal(fixed.followUp.kind, 'reopen-risk');
  assert.ok(dismissed.followUp.chance > fixed.followUp.chance, 'dismissive handling should risk reopening far more than a correct fix');
});

test('endShift: a "hold" outcome always generates a pending follow-up 1-2 shifts out', () => {
  const outcomes = [{
    ticketId: 't1', quality: 'adequate', status: 'hold', reputationDelta: 1, timeSpent: 2, dispositionTag: 'neutral',
    followUp: { kind: 'hold', ticketCategory: 'Bulk Potion Order Delay', customerId: 'cust-1' },
  }];
  const { pendingFollowUps } = endShift(outcomes, 50, 10, seededRng(4));
  assert.equal(pendingFollowUps.length, 1);
  assert.equal(pendingFollowUps[0].kind, 'hold');
  assert.equal(pendingFollowUps[0].customerId, 'cust-1');
  assert.ok(pendingFollowUps[0].dueShiftId === 11 || pendingFollowUps[0].dueShiftId === 12);
});

test('endShift: a "reopen-risk" outcome with chance 1 always reopens; chance 0 never does', () => {
  const guaranteed = [{
    ticketId: 't1', quality: 'dismissive', status: 'resolved', reputationDelta: -3, timeSpent: 1, dispositionTag: 'hostile',
    followUp: { kind: 'reopen-risk', chance: 1, ticketCategory: 'Cursed Item Return', customerId: 'cust-2' },
  }];
  const neverHappens = [{
    ticketId: 't2', quality: 'correct', status: 'resolved', reputationDelta: 2, timeSpent: 4, dispositionTag: 'loyal',
    followUp: { kind: 'reopen-risk', chance: 0, ticketCategory: 'Cursed Item Return', customerId: 'cust-3' },
  }];

  const resultA = endShift(guaranteed, 50, 1, seededRng(5));
  assert.equal(resultA.pendingFollowUps.length, 1);
  assert.equal(resultA.pendingFollowUps[0].kind, 'reopen');

  const resultB = endShift(neverHappens, 50, 1, seededRng(5));
  assert.equal(resultB.pendingFollowUps.length, 0);
});

test('generateShift: a due follow-up is folded into the ticket queue and flagged', () => {
  const knownCustomers = [{ id: 'cust-5', tier: 'business', archetype: 'Kingdom', disposition: -10, history: [] }];
  const pendingFollowUps = [{ id: 'fu-1', customerId: 'cust-5', category: 'Border Ward Malfunction', kind: 'reopen', dueShiftId: 3 }];

  const { tickets, customerPool, stillPendingFollowUps } = generateShift({
    knownCustomers, baseTicketCount: 5, currentShiftId: 3, pendingFollowUps, rng: seededRng(6),
  });

  const followUpTicket = tickets.find((t) => t.isFollowUp);
  assert.ok(followUpTicket, 'expected a follow-up ticket in the queue');
  assert.equal(followUpTicket.customerId, 'cust-5');
  assert.equal(followUpTicket.followUpKind, 'reopen');
  assert.equal(followUpTicket.category, 'Border Ward Malfunction');
  assert.ok(customerPool.some((c) => c.id === 'cust-5'), 'follow-up customer must be present in the pool');
  assert.equal(stillPendingFollowUps.length, 0);
});

test('generateShift: a not-yet-due follow-up is left in stillPendingFollowUps and not queued', () => {
  const knownCustomers = [{ id: 'cust-6', tier: 'partner', archetype: 'Blacksmith', disposition: 0, history: [] }];
  const pendingFollowUps = [{ id: 'fu-2', customerId: 'cust-6', category: 'Phantom Inventory', kind: 'hold', dueShiftId: 9 }];

  const { tickets, stillPendingFollowUps } = generateShift({
    knownCustomers, baseTicketCount: 5, currentShiftId: 3, pendingFollowUps, rng: seededRng(7),
  });

  assert.equal(tickets.some((t) => t.isFollowUp), false);
  assert.equal(stillPendingFollowUps.length, 1);
  assert.equal(stillPendingFollowUps[0].id, 'fu-2');
});

test('generateShift: fullRoster retains a known customer who sits out this shift', () => {
  // Regression test: an earlier version told callers to persist
  // `customerPool` (this shift's participants) as their customer list,
  // which silently dropped anyone not drawn this shift -- including
  // someone with a follow-up due a shift or two later. That customer's
  // eventual follow-up ticket would then point at nobody.
  const bystander = { id: 'bystander-1', tier: 'partner', archetype: 'Blacksmith', disposition: 0, history: [] };
  const knownCustomers = [
    bystander,
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `filler-${i}`, tier: 'endUser', archetype: 'NPC', disposition: 0, history: [],
    })),
  ];

  // A follow-up for the bystander that ISN'T due this shift, so nothing
  // forces them into this shift's customerPool.
  const pendingFollowUps = [{ id: 'fu-x', customerId: 'bystander-1', category: 'Storefront Listing Error', kind: 'hold', dueShiftId: 5 }];

  const { customerPool, fullRoster } = generateShift({
    knownCustomers, baseTicketCount: 4, currentShiftId: 1, pendingFollowUps, rng: seededRng(8),
  });

  assert.ok(fullRoster.some((c) => c.id === 'bystander-1'), 'bystander must survive in fullRoster even if not drawn this shift');
  assert.ok(fullRoster.length >= customerPool.length);
});

// ---------------------------------------------------------------------
// Investigation Phase (Phase 0 proof-of-concept — "Phantom Inventory")
// ---------------------------------------------------------------------

// Builds a Phantom Inventory ticket with a NAMED root cause, so tests
// say which of the six situations they are about.
function ticketWithCause(causeId) {
  const cause = PHANTOM_INVENTORY_TEMPLATE.rootCauses.find((c) => c.id === causeId);
  assert.ok(cause, `no such root cause: ${causeId}`);
  return {
    id: 'pi-1', customerId: 'c1', category: 'Phantom Inventory',
    urgency: 2, timeCostMultiplier: 1,
    investigation: buildInvestigation(PHANTOM_INVENTORY_TEMPLATE, cause),
  };
}

function phantomInventoryTicket() {
  return {
    id: 't-phantom-1',
    customerId: 'cust-phantom',
    category: 'Phantom Inventory',
    urgency: 2,
    timeCostMultiplier: 1,
    investigation: buildInvestigation(PHANTOM_INVENTORY_TEMPLATE, PHANTOM_INVENTORY_TEMPLATE.rootCauses[0]),
  };
}

test('resolveInvestigation: correct diagnosis + key clue investigated -> correct, grounded', () => {
  const ticket = phantomInventoryTicket();
  const result = resolveInvestigation(ticket, ['askLedger'], 'unloggedSale');
  assert.equal(result.standing, 'correct');
  assert.equal(result.grounding, 'grounded');
  assert.equal(result.quality, 'correct');
});

test('resolveInvestigation: right answer with nothing behind it is PARTIAL, not correct', () => {
  // Says the right thing, cannot back it up. Not wrong -- but not the
  // same as having done the work, and the standing says so.
  const ticket = phantomInventoryTicket();
  const result = resolveInvestigation(ticket, ['manifest', 'courierRecord'], 'unloggedSale');
  assert.equal(result.standing, 'partial');
  assert.equal(result.grounding, 'lucky');
  assert.equal(result.quality, 'adequate');
});

test('resolveInvestigation: wrong diagnosis with zero investigation -> wrong, blind', () => {
  const ticket = phantomInventoryTicket();
  const result = resolveInvestigation(ticket, [], 'theft');
  assert.equal(result.standing, 'wrong');
  assert.equal(result.grounding, 'blind');
  assert.equal(result.quality, 'dismissive');
});

test('resolveInvestigation: wrong after real investigation is PARTIAL, not wrong', () => {
  // Fell for the stockroom-access red herring and picked wrong -- but
  // reasoned from something. "Right kind of problem, wrong instance" is
  // the most common real outcome and must not collapse into "wrong."
  const ticket = phantomInventoryTicket();
  const result = resolveInvestigation(ticket, ['askReceiving'], 'theft');
  assert.equal(result.standing, 'partial');
  assert.equal(result.grounding, 'reasoned');
  assert.equal(result.quality, 'rushed');
});

test('resolveInvestigation: partial is reachable from BOTH directions', () => {
  // The middle is not a consolation prize attached to one branch. A
  // lucky right answer and a reasoned wrong one both land in it, from
  // opposite sides, and the grounding is what tells them apart.
  const ticket = phantomInventoryTicket();
  const luckyRight = resolveInvestigation(ticket, [], 'unloggedSale');
  const reasonedWrong = resolveInvestigation(ticket, ['askReceiving'], 'theft');
  assert.equal(luckyRight.standing, 'partial');
  assert.equal(reasonedWrong.standing, 'partial');
  assert.notEqual(luckyRight.grounding, reasonedWrong.grounding);
});

test('resolveInvestigation: this is exactly the case the old model could not distinguish', () => {
  // The whole point of Phase 0: under-investigating and fully
  // investigating must NOT produce the same outcome. This directly
  // tests the failure mode the old single-button model had (a player
  // could win every ticket by always clicking the same option).
  const ticket = phantomInventoryTicket();
  const underInvestigated = resolveInvestigation(ticket, [], 'unloggedSale');
  const fullyInvestigated = resolveInvestigation(ticket, ['askLedger'], 'unloggedSale');
  assert.notEqual(underInvestigated.standing, fullyInvestigated.standing);
  assert.equal(underInvestigated.standing, 'partial');
  assert.equal(fullyInvestigated.standing, 'correct');
});

test('candleStage: never leaks a number, and reaches every stage', () => {
  const seen = new Set();
  for (let left = 24; left >= 0; left--) {
    const stage = candleStage(left, 24);
    assert.equal(/\d/.test(stage), false, `candle stage leaked a digit: "${stage}"`);
    seen.add(stage);
  }
  assert.equal(seen.has('newly lit'), true);
  assert.equal(seen.has('guttering'), true);
  assert.equal(seen.has('the wick is out'), true);
  assert.equal(candleStage(24, 24), 'newly lit');
  assert.equal(candleStage(0, 24), 'the wick is out');
});

test('the candle is a shift timer, not a budget the player spends', () => {
  // One notch per call taken. Nothing inside a call moves it, so a
  // thorough call and a rushed one cost the SAME clock -- a candle does
  // not burn faster because somebody asked a question.
  //
  // This test exists because an earlier build charged the candle for
  // every probe and every investigation action, which billed the player
  // for doing the job properly.
  const ticket = phantomInventoryTicket();
  const everyAction = PHANTOM_INVENTORY_TEMPLATE.actions.map((a) => a.id);

  // Question load is a real quantity -- it just isn't clock.
  assert.ok(investigationTimeCost(ticket, everyAction) > 0,
    'asking a lot must cost the CALLER something');
  assert.equal(investigationTimeCost(ticket, []), 0);

  // A shift must outlast the baseline queue, so clearing the line is
  // the ordinary ending and running out is the heavy-day ending.
  assert.ok(SHIFT_CANDLE_NOTCHES >= 8,
    'a shift must cover at least the baseline ticket count');
});

test('resolveInvestigation: rejects an unknown diagnosis id', () => {
  const ticket = phantomInventoryTicket();
  assert.throws(() => resolveInvestigation(ticket, [], 'not-a-real-diagnosis'), /Unknown diagnosis id/);
});

test('resolveInvestigation: rejects a ticket with no investigation data', () => {
  const plainTicket = { id: 't1', customerId: 'c1', category: 'Commission Payout Dispute', urgency: 2, timeCostMultiplier: 1 };
  assert.throws(() => resolveInvestigation(plainTicket, [], 'anything'), /has no investigation data/);
});

test('investigationTimeCost: sums only the actions actually taken', () => {
  const ticket = phantomInventoryTicket();
  assert.equal(investigationTimeCost(ticket, []), 0);
  assert.equal(investigationTimeCost(ticket, ['manifest']), 1);
  const cost = (id) => PHANTOM_INVENTORY_TEMPLATE.actions.find((a) => a.id === id).timeCost;
  assert.equal(investigationTimeCost(ticket, ['manifest', 'askLedger']),
    cost('manifest') + cost('askLedger'));
  // Investigating everything costs the sum of every action, not a flat rate.
  const allIds = PHANTOM_INVENTORY_TEMPLATE.actions.map((a) => a.id);
  const expectedTotal = PHANTOM_INVENTORY_TEMPLATE.actions.reduce((s, a) => s + a.timeCost, 0);
  assert.equal(investigationTimeCost(ticket, allIds), expectedTotal);
});

test('investigationTimeCost: a ticket with no investigation data costs 0', () => {
  const plainTicket = { id: 't1', customerId: 'c1', category: 'Commission Payout Dispute', urgency: 2, timeCostMultiplier: 1 };
  assert.equal(investigationTimeCost(plainTicket, ['anything']), 0);
});

test('generateShift: a Phantom Inventory ticket carries its investigation data through', () => {
  const knownCustomers = [{ id: 'cust-p1', tier: 'partner', archetype: 'Wandering Trader', disposition: 0, history: [] }];
  // Seed hunt: find a seed that actually draws a Phantom Inventory ticket,
  // since generateShift's draw is weighted/random -- this keeps the test
  // honest rather than asserting against a template we bypassed.
  let found = null;
  for (let seed = 0; seed < 200 && !found; seed++) {
    const { tickets } = generateShift({ knownCustomers, baseTicketCount: 6, currentShiftId: 1, rng: seededRng(seed) });
    found = tickets.find((t) => t.category === 'Phantom Inventory');
  }
  assert.ok(found, 'expected at least one Phantom Inventory ticket across 200 seeded shifts');
  assert.ok(found.investigation, 'ticket should carry its investigation block');
  assert.ok(found.investigation.rootCauseId, 'a ticket instance must have a concrete root cause');
  assert.ok(found.investigation.keyActionIds.length > 0);
  assert.ok(found.investigation.correctDiagnosisId);
  // Every action carries evidence for THIS cause.
  for (const action of found.investigation.actions) {
    assert.equal(typeof action.clue, 'string', `${action.id} has no clue for this root cause`);
  }
});

// ---------------------------------------------------------------------
// Root causes — a category is a template, not a script
// ---------------------------------------------------------------------

test('the same category produces genuinely different root causes', () => {
  // One root cause per category is one puzzle wearing different nouns.
  // Ask how many reasons there are for "I forgot my password."
  const seen = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    seen.add(rollRootCause(PHANTOM_INVENTORY_TEMPLATE, seededRng(seed)).id);
  }
  assert.equal(seen.size, PHANTOM_INVENTORY_TEMPLATE.rootCauses.length,
    `every root cause must be reachable, saw ${[...seen].join(', ')}`);
});

test('the same investigation action yields different evidence per cause', () => {
  // This is what makes it a puzzle the player READS rather than a
  // sequence they memorise: same menu, different findings.
  const clueFor = (causeId, actionId) => ticketWithCause(causeId)
    .investigation.actions.find((a) => a.id === actionId).clue;

  const courierClues = PHANTOM_INVENTORY_TEMPLATE.rootCauses
    .map((c) => clueFor(c.id, 'courierRecord'));
  assert.ok(new Set(courierClues).size >= 4,
    'the courier record must say different things depending on what actually happened');

  const countClues = PHANTOM_INVENTORY_TEMPLATE.rootCauses.map((c) => clueFor(c.id, 'askCount'));
  assert.equal(new Set(countClues).size, PHANTOM_INVENTORY_TEMPLATE.rootCauses.length,
    'asking them to count should come back different every time');
});

test('some causes are NOT actually this category', () => {
  // "I forgot my password" is frequently not a password problem. The
  // customer reports a symptom; the category they imply can be wrong.
  // This is what makes Classify a judgement, not a label.
  const causes = PHANTOM_INVENTORY_TEMPLATE.rootCauses;
  const elsewhere = causes.filter((c) => c.trueCategory !== 'Phantom Inventory');

  assert.ok(elsewhere.length >= 2,
    'a category whose every cause belongs to it is not modelling misclassification at all');
  assert.ok(causes.some((c) => c.trueCategory === 'Phantom Inventory'),
    'and it must sometimes genuinely be what it looks like');

  // At least one belongs to a category that actually exists elsewhere,
  // so filing it correctly is a real option the player has.
  const known = Object.values(TICKET_TEMPLATES).flat().map((t) => t.category);
  assert.ok(elsewhere.some((c) => known.includes(c.trueCategory)),
    'at least one misfiled cause should map onto a real category');
});

test('a two-clue cause is not backed up by one of them', () => {
  // split-lot needs the delivery log AND the bulk draw. Having half the
  // evidence is a right answer you cannot support -- partial, not
  // correct.
  const ticket = ticketWithCause('split-lot');
  assert.deepEqual(ticket.investigation.keyActionIds, ['courierRecord', 'drawRecord']);

  const half = resolveInvestigation(ticket, ['courierRecord'], 'splitLot');
  const both = resolveInvestigation(ticket, ['courierRecord', 'drawRecord'], 'splitLot');

  assert.equal(half.standing, 'partial');
  assert.equal(half.grounding, 'lucky');
  assert.equal(both.standing, 'correct');
  assert.equal(both.grounding, 'grounded');
});

test('the same diagnosis is right or wrong depending on the root cause', () => {
  // The sharpest consequence of sub-variables: there is no globally
  // correct answer for a category, only a correct answer for THIS call.
  const onUnlogged = resolveInvestigation(ticketWithCause('unlogged-sale'), ['askLedger'], 'unloggedSale');
  const onHold = resolveInvestigation(ticketWithCause('constabulary-hold'), ['askLedger'], 'unloggedSale');

  assert.equal(onUnlogged.standing, 'correct');
  assert.equal(onHold.standing, 'partial', 'same answer, different call, no longer right');
});

test('red herrings are on SOME causes, not all', () => {
  // LORE.md: if every ticket had a trap, reflexive distrust would be
  // the only sane strategy, and "Trust and Verify" would collapse into
  // "verify."
  const withTrap = PHANTOM_INVENTORY_TEMPLATE.rootCauses.filter((c) => c.redHerringActionId);
  assert.ok(withTrap.length > 0, 'some calls must mislead');
  assert.ok(withTrap.length < PHANTOM_INVENTORY_TEMPLATE.rootCauses.length,
    'trusting the evidence must usually be the right call');
});


// ---------------------------------------------------------------------
// How a caller opens, once greeted
// ---------------------------------------------------------------------

test('rollOpening: greeting someone usually does NOT get you the request', () => {
  // The whole point. On a real desk you are lucky to get the reason for
  // calling cleanly on the first beat; people lead with the past, the
  // wait, the product, or with feeling. If most openings handed over
  // the request, the greeting would be a vending machine again.
  let reveals = 0;
  const runs = 400;
  for (let seed = 1; seed <= runs; seed++) {
    if (rollOpening(null, null, seededRng(seed)).revealsRequest) reveals++;
  }
  assert.ok(reveals > 0, 'a clean opening must sometimes happen');
  assert.ok(reveals / runs < 0.5,
    `a clean opening should be the lucky case, got ${(reveals / runs * 100).toFixed(0)}%`);
});

test('rollOpening: callers lead with several different things', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 400; seed++) {
    seen.add(rollOpening(null, { style: 'explicit' }, seededRng(seed)).mode);
  }
  assert.ok(seen.size >= 4, `expected varied openings, saw ${[...seen].join(', ')}`);
});

test('rollOpening: a customer with no history cannot lead with history', () => {
  // "This is the third time I've called" is only available to someone
  // who has actually called before.
  for (let seed = 1; seed <= 300; seed++) {
    assert.notEqual(rollOpening(null, null, seededRng(seed)).mode, 'history');
  }
  const withMemory = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    withMemory.add(rollOpening(null, { style: 'explicit' }, seededRng(seed)).mode);
  }
  assert.equal(withMemory.has('history'), true);
});

test('probeForRequest: a caller is never a dead end', () => {
  // Cozy means hard to get to the point, never unwinnable. The second
  // probe always lands, whatever the rng does.
  for (let seed = 1; seed <= 200; seed++) {
    assert.equal(probeForRequest(1, seededRng(seed)), true);
    assert.equal(probeForRequest(5, seededRng(seed)), true);
  }
});

test('probeForRequest: the first probe is a real coin-toss, not a formality', () => {
  let landed = 0;
  for (let seed = 1; seed <= 400; seed++) {
    if (probeForRequest(0, seededRng(seed))) landed++;
  }
  assert.ok(landed > 40 && landed < 360, `first probe should be uncertain, landed ${landed}/400`);
});

test('every opening mode is reachable and well-formed', () => {
  for (const mode of OPENING_MODES) {
    assert.equal(typeof mode.id, 'string');
    assert.ok(mode.weight > 0, `${mode.id} needs a positive weight`);
  }
  // Exactly one mode hands over the request. If a second ever gets
  // added, that is a real design change and should be deliberate.
  const revealing = OPENING_MODES.filter((m) => m.revealsRequest);
  assert.equal(revealing.length, 1);
  assert.equal(revealing[0].id, 'request');
});


test('guardednessOf: TLC Baggage drives how readily someone volunteers anything', () => {
  // Reads the TLC axis, not the agent axis -- they have not met you.
  assert.equal(guardednessOf(null), 0);
  assert.equal(guardednessOf({ disposition: { tlc: 0 } }), 0);
  assert.equal(guardednessOf({ disposition: { tlc: -100 } }), 1);
  assert.equal(guardednessOf({ disposition: { tlc: -50 } }), 0.5);
  assert.equal(guardednessOf({ disposition: { tlc: 80 } }), 0, 'warmth is not negative guardedness');

  // Feeling badly about the AGENT does not make someone withhold the
  // reason they rang -- that is a different axis doing a different job.
  assert.equal(guardednessOf({ disposition: { tlc: 0, you: -100 } }), 0);
});

test('rollOpening: a guarded caller volunteers the request less often', () => {
  // Someone who walked in already carrying something does not simply
  // lay it out for you. Same seeds, two customers, measurable gap.
  const count = (customer) => {
    let reveals = 0;
    for (let seed = 1; seed <= 400; seed++) {
      if (rollOpening(customer, null, seededRng(seed)).revealsRequest) reveals++;
    }
    return reveals;
  };
  const open = count({ disposition: { tlc: 0 } });
  const guarded = count({ disposition: { tlc: -100 } });
  assert.ok(guarded < open,
    `guarded caller should volunteer less often (open ${open}, guarded ${guarded})`);
  assert.ok(guarded > 0, 'even a guarded caller sometimes just tells you');
});

test('rollOpening: guardedness 0 leaves the baseline distribution untouched', () => {
  // The hook must be genuinely inert until Phase 1, not quietly
  // reshaping today's behaviour.
  for (let seed = 1; seed <= 200; seed++) {
    const withCustomer = rollOpening({ disposition: { tlc: 0 } }, null, seededRng(seed));
    const without = rollOpening(null, null, seededRng(seed));
    assert.equal(withCustomer.mode, without.mode);
  }
});


// ---------------------------------------------------------------------
// Phase 1 — Character Disposition Model
// ---------------------------------------------------------------------

test('traits vary across customers and are NOT archetype-correlated', () => {
  // The hard constraint from LORE.md: archetype must never be a formula
  // input. If it were, two Heroes would resemble each other more than a
  // Hero and a Tavern do, and "archetype rhyme, not archetype lookup"
  // would be prose the code contradicts.
  const byArchetype = {};
  const allSensitivities = [];
  for (let seed = 1; seed <= 300; seed++) {
    const rng = seededRng(seed);
    const { customerPool } = generateShift({ knownCustomers: [], baseTicketCount: 8, rng });
    for (const c of customerPool) {
      (byArchetype[c.archetype] ||= []).push(c.traits.sensitivity);
      allSensitivities.push(c.traits.sensitivity);
    }
  }

  // Traits actually vary at all.
  assert.ok(new Set(allSensitivities).size > 50, 'sensitivity must genuinely vary');

  // No archetype's mean sensitivity sits far from the global mean.
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const overall = mean(allSensitivities);
  for (const [archetype, values] of Object.entries(byArchetype)) {
    if (values.length < 40) continue;
    assert.ok(Math.abs(mean(values) - overall) < 0.1,
      `${archetype} sensitivity mean drifted from the population — archetype is leaking into the roll`);
  }
});

test('a stranger has Baggage about TLC but none about YOU', () => {
  // You cannot resent an agent you have never spoken to. Baggage on the
  // `you` axis is earned, never issued.
  let sawLoadedTlc = false;
  for (let seed = 1; seed <= 200; seed++) {
    const rng = seededRng(seed);
    const { customerPool } = generateShift({ knownCustomers: [], baseTicketCount: 6, rng });
    for (const c of customerPool) {
      assert.equal(c.disposition.you, 0, 'a new customer must hold no opinion of the agent');
      assert.equal(c.disposition.understanding, 0);
      if (c.disposition.tlc !== 0) sawLoadedTlc = true;
    }
  }
  assert.ok(sawLoadedTlc, 'customers must be able to arrive already carrying something about TLC');
});

test('pipeline math: raw → × Sensitivity → dampened by Social Filter', () => {
  // Known inputs, hand-checked outputs. Internal feeling and visible
  // reaction are different numbers, and the gap is the whole point of
  // Social Filter.
  const customer = {
    disposition: { you: 10, tlc: 0, experience: 0, understanding: 0 },
    traits: { sensitivity: 2, socialFilter: 0.5 },
  };
  const { disposition, visible } = applyDisposition(customer, { you: 6, tlc: -4 });

  assert.equal(disposition.you, 22, '10 + (6 × 2)');
  assert.equal(disposition.tlc, -8, '0 + (-4 × 2)');
  assert.equal(visible.you, 6, '(6 × 2) × 0.5');
  assert.equal(visible.tlc, -4, '(-4 × 2) × 0.5');
});

test('Social Filter hides how much a customer actually felt', () => {
  // Two customers, identical event, identical internal reaction --
  // wildly different presentation. A player cannot read the truth off
  // the surface. See LORE.md, "the lid on the pot."
  const open = { disposition: { you: 0 }, traits: { sensitivity: 1, socialFilter: 1 } };
  const guarded = { disposition: { you: 0 }, traits: { sensitivity: 1, socialFilter: 0.35 } };

  const a = applyDisposition(open, { you: -20 });
  const b = applyDisposition(guarded, { you: -20 });

  assert.equal(a.disposition.you, b.disposition.you, 'they felt exactly the same thing');
  assert.ok(Math.abs(b.visible.you) < Math.abs(a.visible.you) / 2,
    'the guarded one must show far less of it');
});

test('wrinkle bias: COG affiliation skews TLC Baggage without deciding it', () => {
  // Situational facts bias a random draw. They must NOT replace it with
  // a lookup -- a COG-affiliated customer is more likely to arrive wary,
  // never guaranteed to.
  const sample = (wrinkles) => {
    const out = [];
    for (let seed = 1; seed <= 400; seed++) {
      out.push(rollTraits(wrinkles, seededRng(seed)).baggage.tlc);
    }
    return out;
  };
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

  const plain = sample([]);
  const cog = sample(['cog-affiliated']);

  assert.ok(mean(cog) < mean(plain) - 8,
    `COG affiliation must measurably skew wary (plain ${mean(plain).toFixed(1)}, cog ${mean(cog).toFixed(1)})`);

  // Not deterministic: some COG customers still arrive positive.
  assert.ok(cog.some((v) => v > 0), 'the bias must not become a rule');
  assert.ok(new Set(cog).size > 20, 'the draw must stay a distribution');
});

test('wrinkles are rolled per instance, not derived from archetype', () => {
  const byArchetype = {};
  for (let seed = 1; seed <= 200; seed++) {
    const rng = seededRng(seed);
    const { customerPool } = generateShift({ knownCustomers: [], baseTicketCount: 8, rng });
    for (const c of customerPool) {
      (byArchetype[c.archetype] ||= []).push(c.wrinkles.includes('cog-affiliated'));
    }
  }
  const rates = Object.entries(byArchetype)
    .filter(([, v]) => v.length >= 40)
    .map(([a, v]) => [a, v.filter(Boolean).length / v.length]);
  for (const [archetype, rate] of rates) {
    assert.ok(rate > 0.05 && rate < 0.45,
      `${archetype} COG rate ${rate.toFixed(2)} looks archetype-driven, not per-instance`);
  }
});

test('rollWrinkles: situational facts appear sometimes, never always', () => {
  const counts = {};
  const runs = 500;
  for (let seed = 1; seed <= runs; seed++) {
    for (const w of rollWrinkles(seededRng(seed))) counts[w] = (counts[w] || 0) + 1;
  }
  assert.ok(Object.keys(counts).length >= 3, 'several wrinkles must be reachable');
  for (const [id, n] of Object.entries(counts)) {
    assert.ok(n > 0 && n < runs,
      `${id} fired ${n}/${runs} times — a wrinkle must be a circumstance, not a constant`);
  }
  // A customer can have none at all -- most do.
  let bare = 0;
  for (let seed = 1; seed <= runs; seed++) if (rollWrinkles(seededRng(seed)).length === 0) bare++;
  assert.ok(bare > 0, 'plenty of customers arrive with no special circumstance');
});


// ---------------------------------------------------------------------
// What TLC can actually see
// ---------------------------------------------------------------------

test('investigation splits into TLC records and things only the customer can find out', () => {
  // An agent on a ley-line cannot walk a stockroom. TLC's sight ends at
  // handoff. See LORE.md, "What TLC can actually see."
  const actions = PHANTOM_INVENTORY_TEMPLATE.actions;
  for (const a of actions) {
    assert.ok(a.source === 'records' || a.source === 'ask',
      `${a.id} must declare whether it is TLC's record or the customer's legwork`);
  }
  assert.ok(actions.some((a) => a.source === 'records'));
  assert.ok(actions.some((a) => a.source === 'ask'));

  // No action may claim TLC can inspect the customer's premises. Anything
  // about their shelf, their staff, their books is an ASK.
  const theirPremises = /shelf|stockroom|ledger|receiv|shelv|count/i;
  for (const a of actions) {
    if (theirPremises.test(a.label)) {
      assert.equal(a.source, 'ask',
        `"${a.label}" describes the customer's own premises or records — it cannot be a TLC lookup`);
    }
  }
});

test('asking the customer costs more patience than reading our own records', () => {
  // Sending somebody to go and count is a real imposition. Reading a
  // manifest is not.
  const actions = PHANTOM_INVENTORY_TEMPLATE.actions;
  const avg = (src) => {
    const xs = actions.filter((a) => a.source === src).map((a) => a.timeCost);
    return xs.reduce((x, y) => x + y, 0) / xs.length;
  };
  assert.ok(avg('ask') > avg('records'),
    `asks (${avg('ask').toFixed(1)}) must cost more than records (${avg('records').toFixed(1)})`);
});

test('some causes cannot be solved from TLC records alone', () => {
  // The agent's reach is genuinely limited. A player who only ever
  // checks their own systems will close a whole class of ticket wrongly.
  const recordIds = PHANTOM_INVENTORY_TEMPLATE.actions
    .filter((a) => a.source === 'records').map((a) => a.id);

  const needsCustomer = PHANTOM_INVENTORY_TEMPLATE.rootCauses
    .filter((c) => !c.keyActionIds.every((id) => recordIds.includes(id)));

  assert.ok(needsCustomer.length >= 3,
    'most phantom inventory lives on the customer side of the handoff');

  // And prove it end to end: every TLC record in hand, still not grounded.
  const ticket = ticketWithCause('unlogged-sale');
  const fromRecordsOnly = resolveInvestigation(ticket, recordIds, 'unloggedSale');
  assert.equal(fromRecordsOnly.standing, 'partial');
  assert.equal(fromRecordsOnly.grounding, 'lucky',
    'every record we hold, and still no basis for the answer');

  const withTheirLedger = resolveInvestigation(ticket, [...recordIds, 'askLedger'], 'unloggedSale');
  assert.equal(withTheirLedger.standing, 'correct');
});

test('a merchant\'s shelf holds stock that never shipped at all', () => {
  // TLC is an accidental monopoly, so there is no rival carrier to
  // blame. What happens instead is off-network: an adventurer walks in
  // with a haul and sells it over the counter. Returns do the same.
  // Our records cannot reconcile a number that never entered them.
  const ticket = ticketWithCause('counter-bought');
  const manifest = ticket.investigation.actions.find((a) => a.id === 'manifest');
  assert.match(manifest.clue, /no shipment/i, 'the manifest shows nothing because nothing shipped');

  // Needs our record AND their intake -- neither alone is enough.
  const ours = resolveInvestigation(ticket, ['manifest'], 'notOurs');
  const both = resolveInvestigation(ticket, ['manifest', 'askIntake'], 'notOurs');
  assert.equal(ours.standing, 'partial');
  assert.equal(both.standing, 'correct');
});


// ---------------------------------------------------------------------
// Problem domains — the real-world taxonomy above categories
// ---------------------------------------------------------------------

test('every category declares one of the nine real problem domains', () => {
  for (const [tier, templates] of Object.entries(TICKET_TEMPLATES)) {
    for (const t of templates) {
      assert.ok(DOMAINS.includes(t.domain),
        `${tier}/${t.category} has domain "${t.domain}", which is not one of the nine`);
    }
  }
});

test('domains cut across customer tiers', () => {
  // Bucketing problem types by who is calling was arbitrary -- anyone
  // can have a Billing problem. If no domain ever spans tiers, the
  // taxonomy is just the old tier split wearing new labels.
  const tiersByDomain = {};
  for (const [tier, templates] of Object.entries(TICKET_TEMPLATES)) {
    for (const t of templates) (tiersByDomain[t.domain] ||= new Set()).add(tier);
  }
  // Fulfillment currently spans business only; the real assertion is
  // that the taxonomy is not a 1:1 relabelling of tiers.
  assert.ok(Object.keys(tiersByDomain).length > Object.keys(TICKET_TEMPLATES).length,
    'there must be more domains in play than there are tiers');
});

test('the taxonomy is a stable frame, not a scorecard', () => {
  // The domains are broad and fixed; categories are the narrow things
  // written INSIDE them. A domain with nothing in it is not a hole --
  // it is a domain nothing has called for yet. So this asserts the
  // frame's integrity, and deliberately does NOT grade coverage.
  assert.equal(DOMAINS.length, 9, 'the nine are fixed; adding one is a design decision');
  assert.equal(new Set(DOMAINS).size, DOMAINS.length, 'no duplicates');

  // Every category written so far sits inside the frame, and none
  // invents a domain of its own.
  for (const t of Object.values(TICKET_TEMPLATES).flat()) {
    assert.ok(DOMAINS.includes(t.domain), `${t.category} is outside the frame`);
  }

  // The frame is broader than what has been written into it, which is
  // the normal and expected state.
  const covered = new Set(Object.values(TICKET_TEMPLATES).flat().map((t) => t.domain));
  assert.ok(covered.size <= DOMAINS.length);
});

test('a root cause knows which domain it ACTUALLY belongs to', () => {
  for (const cause of PHANTOM_INVENTORY_TEMPLATE.rootCauses) {
    assert.ok(DOMAINS.includes(cause.trueDomain),
      `${cause.id} claims domain "${cause.trueDomain}"`);
  }
  // And they genuinely span domains -- a Quantity-looking call is often
  // a Fulfillment, Accounts, or Service problem.
  const domains = new Set(PHANTOM_INVENTORY_TEMPLATE.rootCauses.map((c) => c.trueDomain));
  assert.ok(domains.size >= 3,
    `one category's causes should land in several domains, got ${[...domains].join(', ')}`);
  assert.ok(domains.has('Quantity'), 'and sometimes it really is what it looks like');
});


// ---------------------------------------------------------------------
// Register — customer type shapes expression, never disposition
// ---------------------------------------------------------------------

test('every archetype has a register', () => {
  for (const tier of Object.values(CUSTOMER_TYPES)) {
    for (const archetype of tier.archetypes) {
      assert.ok(ARCHETYPE_REGISTERS[archetype],
        `${archetype} has no register — it would fall back to plain silently`);
    }
  }
});

test('register genuinely varies, and cuts across tiers', () => {
  const all = Object.values(CUSTOMER_TYPES).flatMap((t) => t.archetypes);
  const registers = new Set(all.map((a) => registerOf({ archetype: a })));
  assert.ok(registers.size >= 4, `expected several distinct voices, got ${[...registers].join(', ')}`);

  // Partner tier alone should hold more than one voice -- a Blacksmith
  // and a Wandering Trader do not talk alike.
  const partner = new Set(CUSTOMER_TYPES.partner.archetypes.map((a) => registerOf({ archetype: a })));
  assert.ok(partner.size >= 2, 'a single tier must contain more than one register');
});

test('register is expression only — it never touches disposition', () => {
  // The hard constraint from LORE.md survives: archetype shapes HOW
  // someone talks and never what they feel or how much of it shows.
  // rollTraits does not take a customer at all, which is the structural
  // guarantee -- this test exists so that stays true.
  assert.equal(rollTraits.length <= 2, true,
    'rollTraits must take (wrinkles, rng) only — never a customer or archetype');

  const a = rollTraits([], seededRng(11));
  const b = rollTraits([], seededRng(11));
  assert.deepEqual(a, b, 'traits depend on the seed and the wrinkles, nothing else');
});

test('registerOf falls back safely rather than throwing', () => {
  assert.equal(registerOf(null), 'plain');
  assert.equal(registerOf({ archetype: 'Something Unwritten' }), 'plain');
});


// ---------------------------------------------------------------------
// "Go and check your shelves" — how an ask lands
// ---------------------------------------------------------------------

test('asking before you have looked yourself costs the relationship', () => {
  // Opening with "go and count your shelf" tells a customer two things:
  // that you think they miscounted, and that you have not looked. The
  // same request after checking our own records is collaboration.
  const ticket = ticketWithCause('unlogged-sale');

  const coldOpen = askRelationshipCost(ticket, ['askLedger']);
  const afterHomework = askRelationshipCost(ticket, ['manifest', 'courierRecord', 'askLedger']);

  assert.equal(coldOpen.unearnedAsks, 1);
  assert.equal(afterHomework.unearnedAsks, 0);
  assert.ok(coldOpen.you < afterHomework.you,
    'the cold open must cost more of their opinion of you');
  assert.equal(afterHomework.you, 0, 'an earned ask should not damage the relationship at all');
});

test('every ask costs their time, earned or not', () => {
  // Doing your homework first makes the request reasonable. It does not
  // make it free -- it is still their afternoon.
  const ticket = ticketWithCause('unlogged-sale');
  const earned = askRelationshipCost(ticket, ['manifest', 'askLedger']);
  assert.ok(earned.experience < 0, 'their time is spent either way');
  assert.equal(earned.you, 0);
});

test('checking records costs the customer nothing', () => {
  const ticket = ticketWithCause('split-lot');
  const recordsOnly = askRelationshipCost(ticket, ['manifest', 'courierRecord', 'nodeReceipt', 'drawRecord']);
  assert.deepEqual(recordsOnly, { you: 0, experience: 0, unearnedAsks: 0 });
});

test('repeated cold asks compound', () => {
  const ticket = ticketWithCause('unlogged-sale');
  const one = askRelationshipCost(ticket, ['askCount']);
  const three = askRelationshipCost(ticket, ['askCount', 'askReceiving', 'askLedger']);
  assert.equal(three.unearnedAsks, 3);
  assert.ok(three.you < one.you, 'sending them off three times running is worse than once');
});

test('order matters, not just which actions were taken', () => {
  // Same four actions, different sequence, different call. This is the
  // whole point: it is about the moment, not the menu.
  const ticket = ticketWithCause('unlogged-sale');
  const badOrder = askRelationshipCost(ticket, ['askLedger', 'manifest']);
  const goodOrder = askRelationshipCost(ticket, ['manifest', 'askLedger']);
  assert.ok(badOrder.you < goodOrder.you);
  assert.equal(goodOrder.you, 0);
});


// ---------------------------------------------------------------------
// Familiarity — a regular talks like someone who knows the place
// ---------------------------------------------------------------------

test('familiarity is about history and standing, not archetype', () => {
  const fresh = { archetype: 'Kingdom', history: [], disposition: { tlc: -80 } };
  assert.equal(familiarityOf(fresh), 'new',
    'someone who has never called is new however they feel about the company');

  const warm = { archetype: 'Kingdom', history: [{}], disposition: { tlc: 20 } };
  const cold = { archetype: 'Tavern', history: [{}], disposition: { tlc: -20 } };
  assert.equal(familiarityOf(warm), 'returning-warm');
  assert.equal(familiarityOf(cold), 'returning-cold');

  // And it cuts across type: same standing, different archetypes, same
  // familiarity. Register decides the words, not whether they soften.
  const warmTavern = { archetype: 'Tavern', history: [{}], disposition: { tlc: 20 } };
  assert.equal(familiarityOf(warmTavern), familiarityOf(warm));
});

test('familiarity and register are independent dimensions', () => {
  // Four combinations must all be reachable, or one of the two is doing
  // no work.
  const combos = new Set();
  for (const archetype of ['Kingdom', 'Tavern', 'Hero', 'NPC']) {
    for (const history of [[], [{}]]) {
      for (const tlc of [20, -20]) {
        const c = { archetype, history, disposition: { tlc } };
        combos.add(`${registerOf(c)}/${familiarityOf(c)}`);
      }
    }
  }
  assert.ok(combos.size >= 6,
    `register and familiarity must vary independently, got ${combos.size} combinations`);
});

test('familiarityOf handles a customer with no disposition yet', () => {
  assert.equal(familiarityOf(null), 'new');
  assert.equal(familiarityOf({ history: [{}] }), 'returning-warm',
    'no recorded feeling about TLC is not a grievance');
});


// ---------------------------------------------------------------------
// Reading a customer — cues, not verdicts
// ---------------------------------------------------------------------

test('reading a customer returns observable cues, never a feeling', () => {
  // Tone, word choice, cadence, volume. The player infers. The game does
  // not announce how anyone feels.
  const c = {
    disposition: { you: -70, tlc: 0, experience: 0, understanding: 0 },
    traits: { socialFilter: 1 },
  };
  const cues = readCues(c, 'you');

  for (const key of ['cadence', 'volume', 'wordChoice']) {
    assert.equal(typeof cues[key], 'string', `missing observable cue: ${key}`);
  }
  // No cue may be a feeling word -- that would be the label again in
  // costume.
  const feelings = ['hostile', 'frustrated', 'neutral', 'warm', 'loyal', 'angry', 'happy'];
  for (const key of ['cadence', 'volume', 'wordChoice', 'band']) {
    assert.equal(feelings.includes(cues[key]), false,
      `"${cues[key]}" names a feeling; cues must describe behaviour`);
  }
});

test('the Social Filter makes the reading genuinely ambiguous', () => {
  // The heart of it: a badly upset customer with a tight lid reads the
  // same as a mildly annoyed one with none. A player cannot infer the
  // truth from the presentation -- and that is the design, not a bug.
  const upsetButGuarded = {
    disposition: { you: -80 }, traits: { socialFilter: 0.35 },
  };
  const mildlyAnnoyedAndOpen = {
    disposition: { you: -28 }, traits: { socialFilter: 1 },
  };

  const a = readCues(upsetButGuarded, 'you');
  const b = readCues(mildlyAnnoyedAndOpen, 'you');

  assert.equal(a.band, b.band, 'these two must be indistinguishable to the player');
  assert.ok(upsetButGuarded.disposition.you < mildlyAnnoyedAndOpen.disposition.you * 2,
    'while actually feeling very different things');
});

test('cues move across the whole range', () => {
  const bands = new Set();
  for (let level = -100; level <= 100; level += 5) {
    bands.add(readCues({ disposition: { you: level }, traits: { socialFilter: 1 } }, 'you').band);
  }
  assert.ok(bands.size >= 5, `expected the full spread, got ${[...bands].join(', ')}`);
});

test('cues can be read on any axis, not just the agent', () => {
  const c = {
    disposition: { you: 60, tlc: -60, experience: 0, understanding: 0 },
    traits: { socialFilter: 1 },
  };
  // Warm to you, cold about the company -- the state a scalar could not
  // hold, now readable one axis at a time.
  assert.notEqual(readCues(c, 'you').band, readCues(c, 'tlc').band);
});

test('readCues survives a customer with no traits yet', () => {
  const cues = readCues({ disposition: { you: 0 } }, 'you');
  assert.equal(cues.band, 'level');
  assert.equal(readCues({}, 'you').band, 'level');
});


// ---------------------------------------------------------------------
// Two accounts of the same call
// ---------------------------------------------------------------------

const noteFor = (over = {}) => ({
  shiftId: 3, ticketCategory: 'Phantom Inventory', quality: 'correct',
  status: 'resolved', ...over,
});

test('nothing surfaces while the two accounts agree', () => {
  // Most calls, most of the time. A divergence is an EVENT, not a
  // running commentary.
  const memory = {
    style: 'explicit', quality: 'correct', actualShiftId: 3,
    category: 'Phantom Inventory', categoryAccurate: true,
    shiftsAgoReported: 2, timingAccurate: true,
    agentAttribution: 'you', agentAccurate: true,
  };
  assert.deepEqual(accountDivergences(memory, noteFor()), []);
});

test('a divergence is raised only where the accounts actually conflict', () => {
  // They misremember WHO helped them; everything else lines up. One
  // conflict, not three.
  const memory = {
    style: 'explicit', quality: 'correct', actualShiftId: 3,
    category: 'Phantom Inventory', categoryAccurate: true,
    shiftsAgoReported: 2, timingAccurate: true,
    agentAttribution: 'Thistle', agentAccurate: false,
  };
  const found = accountDivergences(memory, noteFor());
  assert.equal(found.length, 1);
  assert.equal(found[0].facet, 'Staff');
  assert.equal(found[0].claimed, 'Thistle');
  assert.equal(found[0].recorded, 'you');
});

test('each facet diverges on its own', () => {
  // Memory is multifaceted, so conflicts are per-facet -- someone can
  // have the what right and the who wrong, in any combination.
  const memory = {
    style: 'explicit', quality: 'correct', actualShiftId: 3,
    category: 'Storefront Listing Error', categoryAccurate: false,
    shiftsAgoReported: 9, timingAccurate: false,
    agentAttribution: 'Pell', agentAccurate: false,
  };
  const facets = accountDivergences(memory, noteFor()).map((d) => d.facet);
  assert.deepEqual(new Set(facets).size, facets.length, 'no facet reported twice');
  assert.ok(facets.includes('Products/Services'));
  assert.ok(facets.includes('Staff'));
  assert.ok(facets.includes('Experiences'));
});

test('a vague impression carries no conflict to surface', () => {
  // style 'tone' means they came away with a feeling and no specifics.
  // There is nothing to contradict.
  assert.deepEqual(accountDivergences({ style: 'tone' }, noteFor()), []);
  assert.deepEqual(accountDivergences(null, noteFor()), []);
});

test('with no case note there is nothing to check them against', () => {
  // The agent is working blind. That is its own problem, and it is not
  // a contradiction.
  const memory = {
    style: 'explicit', category: 'Phantom Inventory', categoryAccurate: false,
    agentAttribution: 'Bram', agentAccurate: false,
    shiftsAgoReported: 4, timingAccurate: false, actualShiftId: 3,
  };
  assert.deepEqual(accountDivergences(memory, null), []);
});

test('divergence emerges naturally from a real remembered call', () => {
  // End to end against recallMemory rather than hand-built objects: a
  // long-decayed memory should eventually contradict its own note.
  const customer = {
    id: 'c1', tier: 'partner', archetype: 'Tavern',
    disposition: { you: 0, tlc: 0, experience: 0, understanding: 0 },
    history: [{ shiftId: 1, ticketCategory: 'Phantom Inventory', quality: 'correct', status: 'resolved' }],
  };
  let sawConflict = false;
  for (let seed = 1; seed <= 200 && !sawConflict; seed++) {
    const memory = recallMemory(customer, 40, seededRng(seed));
    if (accountDivergences(memory, customer.history[0]).length > 0) sawConflict = true;
  }
  assert.ok(sawConflict, 'a badly decayed memory must eventually conflict with the record');
});


// ---------------------------------------------------------------------
// Three kinds of inquiry — a tendency, never a sequence
// ---------------------------------------------------------------------

test('a call has investigative, supportive AND wrap-up inquiries', () => {
  // An earlier build had only investigative actions: the player could
  // find out what was wrong and had no way to DO anything about it, or
  // to tell the customer what happens next.
  const kinds = new Set(PHANTOM_INVENTORY_TEMPLATE.actions.map((a) => a.kind));
  assert.deepEqual([...kinds].sort(), ['investigative', 'supportive', 'wrapup']);

  for (const kind of kinds) {
    const n = PHANTOM_INVENTORY_TEMPLATE.actions.filter((a) => a.kind === kind).length;
    assert.ok(n >= 3, `${kind} needs enough options to be a real choice, has ${n}`);
  }
});

test('the three kinds are NOT phases and nothing enforces an order', () => {
  // Support is not a linear process. An inquiry of one kind routinely
  // triggers a follow-up of another as information arrives -- you are
  // mid-wrap-up, they mention something, and you are investigating
  // again. Nothing in the data may encode a stage, a step number, or a
  // prerequisite.
  for (const a of PHANTOM_INVENTORY_TEMPLATE.actions) {
    for (const forbidden of ['stage', 'step', 'order', 'phase', 'requires', 'after', 'unlocks']) {
      assert.equal(forbidden in a, false,
        `${a.id} carries "${forbidden}" — that would make the kinds a sequence`);
    }
  }
});

test('the full menu is deliberately unaffordable', () => {
  // Nine player-driven inquiries against a menu that costs far more.
  // No call can ever be exhaustively worked, which is the point.
  const BUDGET = 9;
  const total = PHANTOM_INVENTORY_TEMPLATE.actions.reduce((n, a) => n + a.timeCost, 0);
  assert.ok(total > BUDGET * 2,
    `the menu (${total}) must dwarf the budget (${BUDGET}) or there is no choice to make`);

  // And the rough shape -- a few of each kind -- has to actually fit.
  const cheapest = (kind, count) => PHANTOM_INVENTORY_TEMPLATE.actions
    .filter((a) => a.kind === kind).map((a) => a.timeCost)
    .sort((x, y) => x - y).slice(0, count).reduce((x, y) => x + y, 0);
  const roughShape = cheapest('investigative', 3) + cheapest('supportive', 3) + cheapest('wrapup', 2);
  assert.ok(roughShape <= BUDGET,
    `a realistic call (${roughShape}) must fit inside ${BUDGET}`);
});

test('every cause has support that is apt, and support that is not', () => {
  for (const cause of PHANTOM_INVENTORY_TEMPLATE.rootCauses) {
    const inv = buildInvestigation(PHANTOM_INVENTORY_TEMPLATE, cause);
    const helpful = inv.actions.filter((a) => a.kind !== 'investigative' && a.apt);
    const useless = inv.actions.filter((a) => a.kind !== 'investigative' && !a.apt);

    assert.ok(helpful.length > 0, `${cause.id} has nothing the agent can usefully DO`);
    assert.ok(useless.length > 0, `${cause.id} makes every action correct, so there is no judgement`);

    // Every action says something, apt or not.
    for (const a of inv.actions) {
      assert.equal(typeof a.clue, 'string', `${cause.id}/${a.id} has no outcome text`);
    }
  }
});

test('the same support is right on one call and useless on another', () => {
  const misfiled = buildInvestigation(PHANTOM_INVENTORY_TEMPLATE,
    PHANTOM_INVENTORY_TEMPLATE.rootCauses.find((c) => c.id === 'misfiled-at-intake'));
  const hold = buildInvestigation(PHANTOM_INVENTORY_TEMPLATE,
    PHANTOM_INVENTORY_TEMPLATE.rootCauses.find((c) => c.id === 'constabulary-hold'));

  const fix = (inv) => inv.actions.find((a) => a.id === 'correctListing');
  assert.equal(fix(misfiled).apt, true);
  assert.equal(fix(hold).apt, false);
  assert.notEqual(fix(misfiled).clue, fix(hold).clue);
});


// ---------------------------------------------------------------------
// Delivery — an inquiry is an intent, not a sentence
// ---------------------------------------------------------------------

test('an inquiry has several deliveries and most are not questions', () => {
  // "May I have your name?" / "To proceed, please provide your name." /
  // "I'm Wren, and your name?" -- same intent, different sentence, and
  // only some of them are questions at all.
  assert.ok(DELIVERIES.length >= 5, 'one phrasing per inquiry is not a choice');
  const ids = DELIVERIES.map((d) => d.id);
  for (const notAQuestion of ['directive', 'procedural', 'transactional']) {
    assert.ok(ids.includes(notAQuestion),
      `${notAQuestion} is a statement form -- inquiries are not all questions`);
  }
});

test('NO delivery is right for everyone', () => {
  // The whole point. If one phrasing always won there would be nothing
  // to judge and the player would learn it once and stop thinking.
  const people = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({
    archetype: 'NPC',
    traits: rollTraits([], seededRng(seed), 'plain'),
    disposition: { you: -30, experience: -20 },
  }));
  const bestFor = people.map((p) => DELIVERIES
    .map((d) => [d.id, deliveryFit(d.id, p)])
    .sort((a, b) => b[1] - a[1])[0][0]);

  assert.ok(new Set(bestFor).size > 1,
    `different people must want different deliveries, all wanted ${bestFor[0]}`);
});

test('the same delivery suits one caller and not the next', () => {
  // Across a population of individually-rolled people, every delivery
  // must find someone it fits and someone it does not. No phrasing is
  // safe and none is useless.
  const people = [];
  for (let seed = 1; seed <= 120; seed++) {
    people.push({
      archetype: 'NPC', traits: rollTraits([], seededRng(seed), 'plain'),
      disposition: { you: -30, experience: -20 },
    });
  }
  for (const d of DELIVERIES) {
    const fits = people.map((p) => deliveryFit(d.id, p));
    assert.ok(Math.max(...fits) > 0.6, `${d.id} suits nobody`);
    assert.ok(Math.min(...fits) < 0.5, `${d.id} suits everybody, which is worse`);
  }
});

test('what an upset caller wants is a CONTINUUM, not two camps', () => {
  // The correction, twice over. First version derived wants from state
  // -- upset meant warmth -- a lookup table. The second version said
  // "some want soothing, some want you to get on with it", which is
  // still two buckets with the middle thrown away. Most people are in
  // that middle.
  const upset = { you: -60, experience: -40 };
  const warmths = [];
  for (let seed = 1; seed <= 500; seed++) {
    const traits = rollTraits([], seededRng(seed), 'plain');
    warmths.push(deliveryPreference({ archetype: 'NPC', traits, disposition: upset }).warmth);
  }

  // Genuinely continuous, not clustered on a handful of values.
  assert.ok(new Set(warmths.map((w) => w.toFixed(3))).size > 400,
    'wants must be continuous, not drawn from a few buckets');

  // And populated throughout -- the middle is where most people live.
  const band = (lo, hi) => warmths.filter((w) => w >= lo && w < hi).length;
  const middle = band(-0.5, 0.5);
  assert.ok(middle > warmths.length * 0.2,
    `the middle must be well populated, held ${middle} of ${warmths.length}`);
  assert.ok(band(-3, -1.5) > 0 && band(1.5, 3) > 0, 'and the far ends must be reachable');

  // Nothing bimodal: no empty gap between the middle and the extremes.
  assert.ok(band(0.5, 1.5) > 0 && band(-1.5, -0.5) > 0,
    'the space between "soothe me" and "get on with it" must be occupied');
});

test('strain moves each caller along their own line, in either direction', () => {
  const shifts = [];
  for (let seed = 1; seed <= 300; seed++) {
    const traits = rollTraits([], seededRng(seed), 'plain');
    const c = { archetype: 'NPC', traits };
    const calm = deliveryPreference({ ...c, disposition: { you: 0, experience: 0 } });
    const strained = deliveryPreference({ ...c, disposition: { you: -60, experience: -40 } });
    shifts.push(strained.warmth - calm.warmth);
  }
  assert.ok(shifts.some((d) => d > 0.3) && shifts.some((d) => d < -0.3),
    'strain must push some toward warmth and others away');
  assert.ok(shifts.some((d) => Math.abs(d) < 0.2),
    'and leave some barely moved -- not everyone changes under pressure');
});

test('the same customer is not the same person every day', () => {
  // LORE.md: even the best-known regular is not identical day to day,
  // so autopilot on a favourite customer is still a mistake.
  const traits = rollTraits([], seededRng(9), 'plain');
  const customer = { archetype: 'Tavern', traits, disposition: { you: -10, experience: -10 } };

  const days = [];
  for (let seed = 1; seed <= 50; seed++) {
    days.push(deliveryPreference(customer, { dayVariance: rollDayVariance(seededRng(seed)) }).warmth);
  }
  assert.ok(new Set(days.map((d) => d.toFixed(3))).size > 40,
    'the same person must vary across days');

  // But it is a nudge, not a personality transplant.
  const spread = Math.max(...days) - Math.min(...days);
  assert.ok(spread < 2.2, `a day should nudge, not remake them (spread ${spread.toFixed(2)})`);
});

test('generated tickets carry the caller as they are today', () => {
  const { tickets } = generateShift({ knownCustomers: [], baseTicketCount: 8, rng: seededRng(4) });
  for (const t of tickets.filter((x) => !x.isFollowUp)) {
    assert.ok(t.dayVariance, 'every call needs its own day');
    assert.equal(typeof t.dayVariance.warmth, 'number');
  }
  const spread = new Set(tickets.filter((x) => x.dayVariance)
    .map((t) => t.dayVariance.warmth.toFixed(3)));
  assert.ok(spread.size > 1, 'and days must differ from one another');
});

test('a caller who is doing fine is not under strain at all', () => {
  const traits = rollTraits([], seededRng(5), 'plain');
  const c = { archetype: 'NPC', traits };
  const happy = deliveryPreference({ ...c, disposition: { you: 60, experience: 40 } });
  const neutral = deliveryPreference({ ...c, disposition: { you: 0, experience: 0 } });
  assert.deepEqual(happy, neutral, 'a call going well applies no pressure');
});

test('register biases the formality a caller prefers without setting it', () => {
  // Bias, not lookup: a formal speaker may still want warmth, and the
  // draw must stay a distribution.
  const mean = (register) => {
    let total = 0;
    for (let seed = 1; seed <= 300; seed++) {
      total += rollTraits([], seededRng(seed), register).preference.formality;
    }
    return total / 300;
  };
  assert.ok(mean('formal') > mean('chatty'), 'the bias must be real');

  const formals = [];
  for (let seed = 1; seed <= 300; seed++) {
    formals.push(rollTraits([], seededRng(seed), 'formal').preference.formality);
  }
  assert.ok(formals.some((f) => f < 0),
    'and it must not become a rule -- some formal speakers want informality');
});

test('deliveryFit stays in range and fails safe', () => {
  for (const d of DELIVERIES) {
    const fit = deliveryFit(d.id, { archetype: 'Hero', disposition: { you: -100, experience: -100 } });
    assert.ok(fit >= 0 && fit <= 1, `${d.id} produced ${fit}`);
  }
  assert.equal(deliveryFit('not-a-delivery', { archetype: 'NPC', disposition: {} }), 0);
  assert.ok(deliveryFit('plain', {}) >= 0);
});


// ---------------------------------------------------------------------
// Nobody wants identical service every time
// ---------------------------------------------------------------------

test('what is happening to them RIGHT NOW pushes on what they want', () => {
  // Feeling is not the only pressure. A caller with a festival tomorrow
  // and a caller with a fortnight are in different situations even if
  // they feel exactly the same about us.
  const quiet = { urgency: 1, isFollowUp: false };
  const pressing = { urgency: 10, isFollowUp: false };
  assert.ok(situationalPressure(pressing) > situationalPressure(quiet));
  assert.equal(situationalPressure(null), 0);
});

test('that it has already gone wrong before presses harder', () => {
  // "Influenced by what happened before." A follow-up means we already
  // failed them once; a reopen means we failed them AFTER telling them
  // it was fixed.
  const fresh = { urgency: 5, isFollowUp: false };
  const held = { urgency: 5, isFollowUp: true, followUpKind: 'hold' };
  const reopened = { urgency: 5, isFollowUp: true, followUpKind: 'reopen' };

  assert.ok(situationalPressure(held) > situationalPressure(fresh));
  assert.ok(situationalPressure(reopened) > situationalPressure(held),
    'being told it was fixed and finding it was not is the worse one');
});

test('pressure supplies magnitude only — direction is always individual', () => {
  // The rule that keeps every one of these from becoming a lookup
  // table. Identical situation, identical feelings, different people:
  // they must still want different things.
  const ticket = { urgency: 9, isFollowUp: true, followUpKind: 'reopen' };
  const wants = [];
  for (let seed = 1; seed <= 300; seed++) {
    const traits = rollTraits([], seededRng(seed), 'plain');
    wants.push(deliveryPreference(
      { archetype: 'NPC', traits, disposition: { you: -50, experience: -50 } },
      { ticket },
    ).warmth);
  }
  assert.ok(wants.some((w) => w > 0.5) && wants.some((w) => w < -0.5),
    'the same crisis must not make everyone want the same handling');
  assert.ok(new Set(wants.map((w) => w.toFixed(3))).size > 250,
    'and it must stay a continuum under pressure, not collapse to cases');
});

test('the same person wants different handling in different situations', () => {
  // One customer, one mood, two situations. Service is not a setting
  // you find once per person.
  const traits = rollTraits([], seededRng(21), 'plain');
  const customer = { archetype: 'Blacksmith', traits, disposition: { you: -20, experience: -20 } };

  const routine = deliveryPreference(customer, { ticket: { urgency: 1, isFollowUp: false } });
  const crisis = deliveryPreference(customer, {
    ticket: { urgency: 10, isFollowUp: true, followUpKind: 'reopen' },
  });

  assert.notEqual(routine.warmth.toFixed(3), crisis.warmth.toFixed(3));
  assert.notEqual(routine.directness.toFixed(3), crisis.directness.toFixed(3));

  // And the best phrasing for them can change with it.
  const best = (want) => DELIVERIES
    .map((d) => [d.id, deliveryFit(d.id, customer, want)])
    .sort((a, b) => b[1] - a[1])[0][0];
  assert.ok(typeof best({ ticket: { urgency: 1 } }) === 'string');
});

test('a caller in no difficulty at all is under no pressure', () => {
  const traits = rollTraits([], seededRng(3), 'plain');
  const c = { archetype: 'NPC', traits, disposition: { you: 40, experience: 40 } };
  const calm = deliveryPreference(c, { ticket: { urgency: 1, isFollowUp: false } });
  const bare = deliveryPreference(c);
  assert.equal(calm.warmth.toFixed(3), bare.warmth.toFixed(3));
});


// ---------------------------------------------------------------------
// TLC's records cannot hold the customer's knowledge
// ---------------------------------------------------------------------

test('a records lookup never reports what the customer knows', () => {
  // A Node is a PLACE -- it holds shipments, it does not recognise
  // people. And the customer signs, whether they collect at a Node or a
  // Courier brings it to them. So our paperwork holds a NAME; whether
  // that name means anything is knowledge only the caller has, and it
  // arrives when the agent reads it out and gets contradicted.
  const customerSideKnowledge = /recognis|recognize|they had not|they admit|nobody remembers|never wrote down|does not work here/i;

  for (const cause of PHANTOM_INVENTORY_TEMPLATE.rootCauses) {
    const inv = buildInvestigation(PHANTOM_INVENTORY_TEMPLATE, cause);
    for (const action of inv.actions.filter((a) => a.source === 'records')) {
      assert.equal(customerSideKnowledge.test(action.clue), false,
        `${cause.id}/${action.id} has our records reporting the caller's own knowledge:\n    "${action.clue}"`);
    }
  }
});
