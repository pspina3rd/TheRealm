'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { score } = require('./score');

const ledger = (over = {}) => ({
  flavours: { blame: 0, frustration: 0, support: 0, routine: 0, plain: 4 },
  wasted: 0, holdsAsked: 1, holdsRefused: 0, holdsEmpty: 0, readsBeyondNeed: 0,
  entitlement: 'not offered', accessGiven: false, identTurn: 2,
  lateFind: false, findTurn: 5, moodStart: 5, moodEnd: 5, taught: 'stopper-left-out',
  caseWritten: false, cause: 'stopper-left-out', ending: 'resolve', ...over,
});

test('nothing is collapsed into a total', () => {
  const s = score(ledger());
  for (const view of Object.values(s)) {
    assert.ok(!('total' in view) && !('score' in view));
    assert.ok(Object.keys(view).length > 10);
  }
});

test('an axis that was never in play is absent, not zero', () => {
  // A customer cannot lose Privacy on a call where nothing was read
  // beyond need, and she cannot win Money where nothing was offered.
  const s = score(ledger({ entitlement: 'not offered', readsBeyondNeed: 0, findTurn: null }));
  assert.ok(!('Money' in s.customer));
  assert.ok(!('Privacy' in s.customer));
  assert.ok(!('Access' in s.customer));
});

test('the same call reads differently depending on who is holding it', () => {
  // A case she was taught something on: she loses the product, the
  // co-op does not, because resolution means different things to them.
  const s = score(ledger({ ending: 'hold', caseWritten: true, taught: 'stopper-left-out' }));
  assert.strictEqual(s.customer['Product/Service'], 0);
  assert.strictEqual(s.coop['Product/Service'], 0);
  assert.strictEqual(s.customer.History, 1);

  const resolved = score(ledger());
  assert.strictEqual(resolved.customer['Product/Service'], 1);
  assert.strictEqual(resolved.coop['Time and effort'], 1);
});

test('a complimentary refill is her win and not the co-op\'s', () => {
  const s = score(ledger({ entitlement: 'complimentary', accessGiven: true }));
  assert.strictEqual(s.customer.Money, 1);
  assert.strictEqual(s.coop.Money, 0);
});

test('blame costs Treatment for everyone who can see it', () => {
  const s = score(ledger({ flavours: { blame: 1, frustration: 0, support: 0, routine: 0, plain: 3 } }));
  assert.strictEqual(s.customer.Treatment, -1);
  assert.strictEqual(s.coop.Treatment, -1);
  assert.strictEqual(s.agent.Treatment, -1);
});

test('satisfaction can survive a call that failed', () => {
  // The one win that arrives when everything else has gone.
  const s = score(ledger({ ending: 'hold', caseWritten: true, findTurn: null, taught: null, entitlement: 'half off' }));
  assert.strictEqual(s.customer['Product/Service'], -1);
  assert.strictEqual(s.agent.Satisfaction, 1);
});

test('prying is a loss and helping without it is a win', () => {
  assert.strictEqual(score(ledger({ readsBeyondNeed: 2 })).customer.Privacy, -1);
  assert.strictEqual(score(ledger({ readsBeyondNeed: 0, findTurn: 4 })).customer.Privacy, 1);
});
