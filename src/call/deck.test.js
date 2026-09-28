'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { buildDeck, deal, swap } = require('./deck');
const { seededRng } = require('./rng');
const { COWORKER_WORDS } = require('./scenario');

test('before identification the CRM only deals ways in', () => {
  const deck = buildDeck({ pool: ['flask'], identified: false, source: 'crm', mode: 'contract' });
  const words = new Set(deck.map((c) => c.word));
  assert.ok(words.has('name'));
  assert.ok(words.has('subscription number'));
  assert.ok(!words.has('refills'), 'cannot read a record you have not found');
});

test('after identification the CRM deals fields', () => {
  const deck = buildDeck({ pool: [], identified: true, source: 'crm', mode: 'expand' });
  const words = new Set(deck.map((c) => c.word));
  assert.ok(words.has('refills'));
  assert.ok(!words.has('name'));
});

test('contract does not wander into neighbours; expand does', () => {
  const contract = buildDeck({ pool: ['stopper'], identified: true, source: 'customer', mode: 'contract' });
  const expand = buildDeck({ pool: ['stopper'], identified: true, source: 'customer', mode: 'expand' });
  assert.ok(!contract.some((c) => c.word === 'cord'));
  assert.ok(expand.some((c) => c.word === 'cord'));
});

test('expand carries the costly flavours and contract does not', () => {
  const expand = buildDeck({ pool: ['stopper'], identified: true, source: 'customer', mode: 'expand' });
  const contract = buildDeck({ pool: ['near'], identified: true, source: 'customer', mode: 'contract' });
  assert.ok(expand.some((c) => c.flavour === 'blame'));
  assert.ok(!contract.some((c) => c.flavour === 'blame'));
  assert.ok(contract.some((c) => c.flavour === 'support'));
});

test('the pool is larger than the hand, so a discard draws something new', () => {
  const deck = buildDeck({
    pool: ['flask', 'refill', 'overnight', 'morning', 'empty', 'stopper', 'near'],
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
  const pool = ['flask', 'refill', 'morning', 'empty', 'shelf', 'cup', 'water'].concat(COWORKER_WORDS);
  const deck = buildDeck({ pool, identified: true, source: 'customer', mode: 'expand' });
  let withExpert = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const { hand } = deal(deck, 5, seededRng(seed), { recent: [] });
    if (hand.some((c) => COWORKER_WORDS.includes(c.word))) withExpert += 1;
  }
  assert.ok(withExpert > 150, `expert words reached hand in only ${withExpert}/200 deals`);
});

test('dealing is deterministic for a seed', () => {
  const deck = buildDeck({ pool: ['flask', 'stopper', 'near'], identified: true, source: 'customer', mode: 'expand' });
  const a = deal(deck, 5, seededRng(9)).hand.map((c) => `${c.word}:${c.flavour}`);
  const b = deal(deck, 5, seededRng(9)).hand.map((c) => `${c.word}:${c.flavour}`);
  assert.deepStrictEqual(a, b);
});
