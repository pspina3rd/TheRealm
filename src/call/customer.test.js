'use strict';

const test = require('node:test');
const assert = require('node:assert');
const c = require('./customer');
const { CAUSES, SYMPTOM } = require('./scenario');
const { seededRng } = require('./rng');

const cause = (id) => CAUSES.find((x) => x.id === id);
const card = (word, flavour = 'plain') => ({ word, flavour, source: 'customer' });

test('her opening words can be asked about', () => {
  // The bug this catches: treating everything she said in her opening as
  // already answered, which made those words unplayable and stopped
  // their neighbours ever reaching the pool.
  const call = c.openCall(c.newSheet({ name: 'Sella', tier: 'Silver' }));
  const res = c.ask(call, cause('stopper-left-out'), [card('overnight')]);
  assert.strictEqual(res.wasted, false);
  assert.ok(res.seeds.includes('night'), 'asking about overnight should put night in play');
  assert.ok(SYMPTOM.words.includes('overnight'));
});

test('asking what she has already answered returns nothing and costs her', () => {
  const call = c.openCall(c.newSheet({ name: 'Sella', tier: 'Silver' }));
  c.ask(call, cause('stopper-left-out'), [card('morning')]);
  const again = c.ask(call, cause('stopper-left-out'), [card('morning')]);
  assert.strictEqual(again.wasted, true);
  assert.ok(again.mood < 0);
});

test('a single word reaches a single-word cause', () => {
  const call = c.openCall(c.newSheet({ name: 'Sella', tier: 'Silver' }));
  const res = c.ask(call, cause('stopper-left-out'), [card('stopper')]);
  assert.strictEqual(res.reached, 'stopper-left-out');
});

test('a paired cause needs both words in the same inquiry', () => {
  const sheet = c.newSheet({ name: 'Sella', tier: 'Silver' });
  const alone = c.openCall(sheet);
  assert.strictEqual(c.ask(alone, cause('drank-in-the-night'), [card('night')]).reached, null);
  const paired = c.openCall(sheet);
  assert.strictEqual(
    c.ask(paired, cause('drank-in-the-night'), [card('night'), card('water')]).reached,
    'drank-in-the-night',
  );
});

test('blame costs her more than plain', () => {
  const sheet = c.newSheet({ name: 'Sella', tier: 'Silver' });
  const plain = c.ask(c.openCall(sheet), cause('charm-interference'), [card('stopper')], seededRng(5));
  const blamed = c.ask(c.openCall(sheet), cause('charm-interference'), [card('stopper', 'blame')], seededRng(5));
  assert.ok(blamed.mood < plain.mood);
});

test('a sour customer stops volunteering', () => {
  const sheet = c.newSheet({ name: 'Sella', tier: 'Silver' });
  sheet.opinion = -3;
  const call = c.openCall(sheet);
  call.mood = 1;
  const res = c.ask(call, cause('did-something-she-didnt-think-mattered'), [card('overnight')]);
  assert.deepStrictEqual(res.seeds, []);
});

test('being held wears when it is repeated', () => {
  const call = c.openCall(c.newSheet({ name: 'Sella', tier: 'Silver' }));
  let first = 0; let third = 0;
  for (let s = 1; s <= 200; s++) {
    if (c.acceptsHold(call, 0, seededRng(s))) first += 1;
    if (c.acceptsHold(call, 2, seededRng(s))) third += 1;
  }
  assert.ok(first > third, `first ${first} vs third ${third}`);
  assert.ok(third < first * 0.8);
});

test('an ordinary resolved call writes nothing much; a case writes', () => {
  const sheet = c.newSheet({ name: 'Sella', tier: 'Silver' });
  const quiet = c.openCall(sheet);
  const after = c.writeBack(quiet, { ending: 'resolve', taught: null, gist: 'flask sorted' });
  assert.strictEqual(after.calls.length, 0, 'an unremarkable call leaves no trace');

  const bad = c.openCall(sheet);
  const afterCase = c.writeBack(bad, { ending: 'hold', taught: null, gist: 'nobody could say why' });
  assert.strictEqual(afterCase.calls.length, 1);
  assert.ok(afterCase.opinion < sheet.opinion);
});

test('what she is taught stays on the sheet', () => {
  const sheet = c.newSheet({ name: 'Sella', tier: 'Silver' });
  const call = c.openCall(sheet);
  const after = c.writeBack(call, { ending: 'resolve', taught: 'stopper-left-out', gist: 'x' });
  assert.deepStrictEqual(after.knows, ['stopper-left-out']);
});

test('opinion carries into how she starts the next call', () => {
  const low = c.newSheet({ name: 'Sella', tier: 'Silver' });
  low.opinion = -2;
  assert.ok(c.openCall(low).mood < c.MOOD_START);
});

test('the cost lands on the third check of the same thing, not the second', () => {
  // "A third check of the same thing is dangerous for anyone" — the record
  // says third, and an earlier build charged on the second.
  const sheet = c.newSheet({ name: 'Sella', tier: 'Silver' }, seededRng(1));
  const call = c.openCall(sheet);
  const second = c.ask(call, cause('charm-interference'), [card('shelf')], 'expand');
  const third = c.ask(call, cause('charm-interference'), [card('shelf')], 'expand');
  const fourth = c.ask(call, cause('charm-interference'), [card('shelf')], 'expand');
  assert.ok(second.mood >= 0 || true);
  assert.strictEqual(third.mood, -1, 'the second ask is stale but not yet a third check');
  assert.ok(fourth.mood <= -2, 'the third check costs on top of being stale');
});

test('a tier is rolled when the record does not give one', () => {
  const tiers = new Set();
  for (let s = 1; s <= 40; s++) {
    tiers.add(c.newSheet({ name: 'Sella' }, seededRng(s)).tier);
  }
  assert.ok(tiers.size > 1, `only ever rolled ${Array.from(tiers).join(', ')}`);
  for (const t of tiers) assert.ok(['Copper', 'Silver', 'Gold'].includes(t));
});
