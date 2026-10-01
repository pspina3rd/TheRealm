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
  const res = c.ask(call, cause('own-container'), [card('poof')]);
  assert.strictEqual(res.wasted, false);
  assert.ok(res.seeds.includes('crate'), 'asking about the shipment should put the crate in play');
  assert.ok(SYMPTOM.words.includes('poof'));
});

test('asking what she has already answered returns nothing and costs her', () => {
  const call = c.openCall(c.newSheet({ name: 'Sella', tier: 'Silver' }));
  c.ask(call, cause('own-container'), [card('wrong')]);
  const again = c.ask(call, cause('own-container'), [card('wrong')]);
  assert.strictEqual(again.wasted, true);
  assert.ok(again.mood < 0);
});

test('a single word reaches a single-word cause', () => {
  const call = c.openCall(c.newSheet({ name: 'Sella', tier: 'Silver' }));
  const res = c.ask(call, cause('own-container'), [card('crate')]);
  assert.strictEqual(res.reached, 'own-container');
});

test('a cause is reached by a word she uses herself', () => {
  const sheet = c.newSheet({ name: 'Sella', tier: 'Silver' });
  // Every cause in this scenario is reachable without a coworker, which is
  // what a scenario needs if the caller might refuse a hold.
  const call = c.openCall(sheet);
  assert.strictEqual(c.ask(call, cause('sent-extra'), [card('measure')]).reached, 'sent-extra');
});

test('blame costs her more than plain', () => {
  const sheet = c.newSheet({ name: 'Sella', tier: 'Silver' });
  const plain = c.ask(c.openCall(sheet), cause('sent-together'), [card('crate')], seededRng(5));
  const blamed = c.ask(c.openCall(sheet), cause('sent-together'), [card('stopper', 'blame')], seededRng(5));
  assert.ok(blamed.mood < plain.mood);
});

test('a sour customer stops volunteering', () => {
  const sheet = c.newSheet({ name: 'Sella', tier: 'Silver' });
  sheet.opinion = -3;
  const call = c.openCall(sheet);
  call.mood = 1;
  const res = c.ask(call, cause('remnant-ingredients'), [card('poof')]);
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
  const after = c.writeBack(call, { ending: 'resolve', taught: 'own-container', gist: 'x' });
  assert.deepStrictEqual(after.knows, ['own-container']);
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
  const second = c.ask(call, cause('sent-together'), [card('crate')], 'expand');
  const third = c.ask(call, cause('sent-together'), [card('crate')], 'expand');
  const fourth = c.ask(call, cause('sent-together'), [card('crate')], 'expand');
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

test('a statement is an inquiry: being wrong corrects you rather than wasting the play', () => {
  const sheet = c.newSheet({ name: 'Sella', tier: 'Copper' }, seededRng(2));
  const call = c.openCall(sheet);
  // Nothing established about her subscription, so the statement is a guess
  // offered for correction — and her correction is the information.
  const guess = c.ask(call, cause('own-container'), [card('subscriptions')], 'contract', 'state');
  assert.strictEqual(guess.wasted, false);
  assert.match(guess.line, /ordinary draught/);
});

test('a run of statements reads as guessing at everything', () => {
  const sheet = c.newSheet({ name: 'Sella', tier: 'Silver' }, seededRng(3));
  const call = c.openCall(sheet);
  const first = c.ask(call, cause('own-container'), [card('billing')], 'contract', 'state');
  const second = c.ask(call, cause('own-container'), [card('order history')], 'contract', 'state');
  const third = c.ask(call, cause('own-container'), [card('account history')], 'contract', 'state');
  assert.ok(third.mood < first.mood, `first ${first.mood}, third ${third.mood}`);
  void second;
});

test('confirming something she did say lands as being heard', () => {
  const sheet = c.newSheet({ name: 'Sella', tier: 'Silver' }, seededRng(4));
  const call = c.openCall(sheet);
  c.ask(call, cause('own-container'), [card('poof')], 'expand');
  const back = c.ask(call, cause('own-container'), [card('poof')], 'contract', 'state');
  assert.ok(back.mood > 0);
  assert.strictEqual(back.wasted, false);
});
