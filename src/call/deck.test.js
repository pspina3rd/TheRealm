'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { buildDeck, deal, swap } = require('./deck');
const { seededRng } = require('./rng');
const { COWORKER_WORDS } = require('./scenario');

test('the record deals nothing until she has given something searchable', () => {
  const deck = buildDeck({ pool: ['flask'], identified: false, source: 'crm', mode: 'contract' });
  assert.deepStrictEqual(deck, [], 'there is nothing to search on yet');
});

test('asking her for a handle is a question to her, not a search', () => {
  const deck = buildDeck({ pool: ['flask'], identified: false, source: 'customer', mode: 'contract' });
  const words = new Set(deck.map((c) => c.word));
  assert.ok(words.has('name'));
  assert.ok(words.has('subscription number'));
  assert.ok(deck.filter((c) => c.asks === 'identifier').length >= 4);
});

test('after identification the CRM deals fields', () => {
  const deck = buildDeck({ pool: [], identified: true, source: 'crm', mode: 'expand' });
  const words = new Set(deck.map((c) => c.word));
  assert.ok(words.has('subscriptions'));
  assert.ok(!words.has('name'));
});

test('contract does not wander into neighbours; expand does', () => {
  const contract = buildDeck({ pool: ['crate'], identified: true, source: 'customer', mode: 'contract' });
  const expand = buildDeck({ pool: ['crate'], identified: true, source: 'customer', mode: 'expand' });
  assert.ok(!contract.some((c) => c.word === 'else'));
  assert.ok(expand.some((c) => c.word === 'else'));
});

test('expand carries the costly flavours and contract does not', () => {
  const expand = buildDeck({ pool: ['crate'], identified: true, source: 'customer', mode: 'expand' });
  const contract = buildDeck({ pool: ['ingredients'], identified: true, source: 'customer', mode: 'contract' });
  assert.ok(expand.some((c) => c.flavour === 'blame'));
  assert.ok(!contract.some((c) => c.flavour === 'blame'));
  assert.ok(contract.some((c) => c.flavour === 'support'));
});

test('the pool is larger than the hand, so a discard draws something new', () => {
  const deck = buildDeck({
    pool: ['flask', 'refill', 'poof', 'wrong', 'crate', 'measure', 'ingredients'],
    identified: true, source: 'customer', mode: 'expand',
  });
  assert.ok(deck.length > 5);
  const rng = seededRng(4);
  const { hand, rest } = deal(deck, 5, rng);
  assert.strictEqual(hand.length, 5);
  const after = swap(hand, hand[0], rest);
  assert.strictEqual(after.hand.length, 5);
  assert.ok(!after.hand.includes(hand[0]));
});

test('what a coworker named comes to hand more readily than noise', () => {
  // Would have caught the flat deal, where a growing pool buried the one
  // card that mattered.
  const pool = ['flask', 'refill', 'poof', 'wrong', 'draught', 'apothecary'].concat(COWORKER_WORDS);
  const deck = buildDeck({ pool, identified: true, source: 'customer', mode: 'expand' });
  let withExpert = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const { hand } = deal(deck, 5, seededRng(seed), { recent: [], expert: COWORKER_WORDS });
    if (hand.some((c) => COWORKER_WORDS.includes(c.word))) withExpert += 1;
  }
  assert.ok(withExpert > 150, `expert words reached hand in only ${withExpert}/200 deals`);
});

test('dealing is deterministic for a seed', () => {
  const deck = buildDeck({ pool: ['flask', 'crate', 'measure'], identified: true, source: 'customer', mode: 'expand' });
  const a = deal(deck, 5, seededRng(9)).hand.map((c) => `${c.word}:${c.flavour}`);
  const b = deal(deck, 5, seededRng(9)).hand.map((c) => `${c.word}:${c.flavour}`);
  assert.deepStrictEqual(a, b);
});
