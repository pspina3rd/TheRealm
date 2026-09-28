'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { runCustomer, recallAgent, FLOOR } = require('./shift');
const { makeAgent } = require('./agents');
const { seededRng } = require('./rng');

const who = { name: 'Sella Brandt', tier: 'Silver' };
const player = makeAgent({ name: 'you', competence: 0.7 });

test('she reaches other people, not only the player', () => {
  // Without a floor she lives in a world with one employee, and the
  // memory rules have nothing to be wrong about.
  let others = 0;
  for (let s = 1; s <= 40; s++) {
    const { history } = runCustomer({ who, calls: 4, player, rng: seededRng(s) });
    others += history.filter((h) => !h.byPlayer).length;
  }
  assert.ok(others > 40, `only ${others} calls went to someone else`);
});

test('the sheet carries between calls', () => {
  const { history, sheet } = runCustomer({ who, calls: 5, player, rng: seededRng(12) });
  const remembered = history.filter((h) => h.ending !== 'resolve').length;
  assert.ok(sheet.calls.length <= history.length);
  assert.ok(sheet.calls.length >= Math.min(1, remembered));
  assert.ok(sheet.opinion >= -3 && sheet.opinion <= 3);
});

test('what she was taught survives into later calls', () => {
  let taught = false;
  for (let s = 1; s <= 60 && !taught; s++) {
    const { sheet } = runCustomer({ who, calls: 5, player, rng: seededRng(s) });
    if (sheet.knows.length) taught = true;
  }
  assert.ok(taught, 'nobody ever managed to explain anything in 300 calls');
});

test('a run of her life is reproducible from its seed', () => {
  const a = runCustomer({ who, calls: 4, player, rng: seededRng(31) });
  const b = runCustomer({ who, calls: 4, player, rng: seededRng(31) });
  assert.deepStrictEqual(a.sheet, b.sheet);
  assert.deepStrictEqual(a.history.map((h) => h.ending), b.history.map((h) => h.ending));
});

test('she mostly remembers the call and not the person', () => {
  const entry = { agent: 'Odile' };
  let right = 0;
  for (let s = 1; s <= 300; s++) {
    if (recallAgent(entry, seededRng(s)) === 'Odile') right += 1;
  }
  assert.ok(right < 150, `named the right agent ${right}/300 times`);
  assert.ok(FLOOR.some((f) => f.name === 'Odile'));
});
