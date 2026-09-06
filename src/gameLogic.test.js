const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateShift,
  resolveTicket,
  resolveInvestigation,
  investigationTimeCost,
  endShift,
  dispositionTag,
  recallMemory,
  decayChanceFor,
  candleStage,
  rollOpening,
  guardednessOf,
  probeForRequest,
  OPENING_MODES,
  SHIFT_CANDLE_NOTCHES,
  DECOY_AGENT_NAMES,
  RESPONSE_QUALITY,
  PHANTOM_INVENTORY_INVESTIGATION,
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

test('resolveTicket: correct response raises disposition and reputation', () => {
  const customer = { id: 'c1', tier: 'endUser', archetype: 'Hero', disposition: 0, history: [] };
  const ticket = { id: 't1', customerId: 'c1', category: 'Respawn Delay', urgency: 3, timeCostMultiplier: 1 };

  const { customer: updated, outcome } = resolveTicket(ticket, customer, 'correct', 'resolved', 1);

  assert.equal(updated.disposition, RESPONSE_QUALITY.correct.dispositionDelta);
  assert.equal(outcome.reputationDelta, RESPONSE_QUALITY.correct.reputationDelta);
  assert.equal(updated.history.length, 1);
  assert.equal(updated.history[0].quality, 'correct');
});

test('resolveTicket: dismissive response lowers disposition and reputation', () => {
  const customer = { id: 'c2', tier: 'partner', archetype: 'Tavern', disposition: 0, history: [] };
  const ticket = { id: 't2', customerId: 'c2', category: 'Phantom Inventory', urgency: 2, timeCostMultiplier: 1 };

  const { customer: updated, outcome } = resolveTicket(ticket, customer, 'dismissive', 'resolved', 1);

  assert.ok(updated.disposition < 0);
  assert.ok(outcome.reputationDelta < 0);
});

test('resolveTicket: disposition never exceeds the -100..100 bounds', () => {
  let customer = { id: 'c3', tier: 'endUser', archetype: 'Villain', disposition: 95, history: [] };
  const ticket = { id: 't3', customerId: 'c3', category: 'XP Miscount Dispute', urgency: 1, timeCostMultiplier: 1 };

  ({ customer } = resolveTicket(ticket, customer, 'correct', 'resolved', 1));
  assert.equal(customer.disposition, 100);

  customer = { ...customer, disposition: -95 };
  ({ customer } = resolveTicket(ticket, customer, 'dismissive', 'resolved', 2));
  assert.equal(customer.disposition, -100);
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

function phantomInventoryTicket() {
  return {
    id: 't-phantom-1',
    customerId: 'cust-phantom',
    category: 'Phantom Inventory',
    urgency: 2,
    timeCostMultiplier: 1,
    investigation: PHANTOM_INVENTORY_INVESTIGATION,
  };
}

test('resolveInvestigation: correct diagnosis + key clue investigated -> correct, grounded', () => {
  const ticket = phantomInventoryTicket();
  const result = resolveInvestigation(ticket, ['bulkActivity'], 'miscount');
  assert.equal(result.standing, 'correct');
  assert.equal(result.grounding, 'grounded');
  assert.equal(result.quality, 'correct');
});

test('resolveInvestigation: right answer with nothing behind it is PARTIAL, not correct', () => {
  // Says the right thing, cannot back it up. Not wrong -- but not the
  // same as having done the work, and the standing says so.
  const ticket = phantomInventoryTicket();
  const result = resolveInvestigation(ticket, ['manifest', 'deliveryLog'], 'miscount');
  assert.equal(result.standing, 'partial');
  assert.equal(result.grounding, 'lucky');
  assert.equal(result.quality, 'adequate');
});

test('resolveInvestigation: wrong diagnosis with zero investigation -> wrong, blind', () => {
  const ticket = phantomInventoryTicket();
  const result = resolveInvestigation(ticket, [], 'stockroom');
  assert.equal(result.standing, 'wrong');
  assert.equal(result.grounding, 'blind');
  assert.equal(result.quality, 'dismissive');
});

test('resolveInvestigation: wrong after real investigation is PARTIAL, not wrong', () => {
  // Fell for the stockroom-access red herring and picked wrong -- but
  // reasoned from something. "Right kind of problem, wrong instance" is
  // the most common real outcome and must not collapse into "wrong."
  const ticket = phantomInventoryTicket();
  const result = resolveInvestigation(ticket, ['stockroomAccess'], 'stockroom');
  assert.equal(result.standing, 'partial');
  assert.equal(result.grounding, 'reasoned');
  assert.equal(result.quality, 'rushed');
});

test('resolveInvestigation: partial is reachable from BOTH directions', () => {
  // The middle is not a consolation prize attached to one branch. A
  // lucky right answer and a reasoned wrong one both land in it, from
  // opposite sides, and the grounding is what tells them apart.
  const ticket = phantomInventoryTicket();
  const luckyRight = resolveInvestigation(ticket, [], 'miscount');
  const reasonedWrong = resolveInvestigation(ticket, ['stockroomAccess'], 'stockroom');
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
  const underInvestigated = resolveInvestigation(ticket, [], 'miscount');
  const fullyInvestigated = resolveInvestigation(ticket, ['bulkActivity'], 'miscount');
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
  const everyAction = PHANTOM_INVENTORY_INVESTIGATION.actions.map((a) => a.id);

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
  assert.equal(investigationTimeCost(ticket, ['manifest', 'bulkActivity']), 1 + 2);
  // Investigating everything costs the sum of every action, not a flat rate.
  const allIds = PHANTOM_INVENTORY_INVESTIGATION.actions.map((a) => a.id);
  const expectedTotal = PHANTOM_INVENTORY_INVESTIGATION.actions.reduce((s, a) => s + a.timeCost, 0);
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
  assert.equal(found.investigation.keyActionId, 'bulkActivity');
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


test('guardednessOf: Baggage drives how readily someone volunteers anything', () => {
  // Inert today (every customer sits at disposition 0 until Phase 1),
  // but the hook must already behave correctly, or the manner of
  // disclosure will need rewriting the moment Baggage exists.
  assert.equal(guardednessOf(null), 0);
  assert.equal(guardednessOf({ disposition: 0 }), 0);
  assert.equal(guardednessOf({ disposition: -100 }), 1);
  assert.equal(guardednessOf({ disposition: -50 }), 0.5);
  assert.equal(guardednessOf({ disposition: 80 }), 0, 'warmth is not negative guardedness');
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
  const open = count({ disposition: 0 });
  const guarded = count({ disposition: -100 });
  assert.ok(guarded < open,
    `guarded caller should volunteer less often (open ${open}, guarded ${guarded})`);
  assert.ok(guarded > 0, 'even a guarded caller sometimes just tells you');
});

test('rollOpening: guardedness 0 leaves the baseline distribution untouched', () => {
  // The hook must be genuinely inert until Phase 1, not quietly
  // reshaping today's behaviour.
  for (let seed = 1; seed <= 200; seed++) {
    const withCustomer = rollOpening({ disposition: 0 }, null, seededRng(seed));
    const without = rollOpening(null, null, seededRng(seed));
    assert.equal(withCustomer.mode, without.mode);
  }
});
