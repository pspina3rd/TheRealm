'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { seededRng } = require('../call/rng');
const { SUBJECTS } = require('./case');
const { BAGGAGE, newSheet, ward, bounce, remember, fitness, fires } = require('./sheet');

const make = (seed, baggage = 'blamed') => newSheet({ who: 'Oda', baggage, rng: seededRng(seed) });

test('two subjects on one sheet can hold different wards', () => {
  let differing = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const vals = new Set(SUBJECTS.map((s) => ward(make(seed), s)));
    if (vals.size > 1) differing++;
    for (const v of vals) assert.ok(Number.isInteger(v) && v >= 1 && v <= 3);
  }
  assert.ok(differing > 0);
});

test('newSheet is deterministic and does not mutate its argument', () => {
  const arg = { who: 'Oda', baggage: BAGGAGE.blamed, rng: seededRng(7) };
  const before = JSON.stringify({ who: arg.who, baggage: arg.baggage });
  const a = newSheet(arg);
  assert.strictEqual(JSON.stringify({ who: arg.who, baggage: arg.baggage }), before);
  assert.deepStrictEqual(a, make(7));
  assert.deepStrictEqual(make(9), make(9));
  assert.ok(a.empathy >= 1 && a.empathy <= 5 && a.patience >= 1 && a.patience <= 5);
  assert.deepStrictEqual(a.learned, []);
  assert.strictEqual(ward(a, 'no-such-subject'), 2);
});

test('bounce gives a non-empty reading for every subject and never the digit', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const sheet = make(seed);
    for (const s of SUBJECTS) {
      const b = bounce(sheet, s, 'why');
      assert.strictEqual(typeof b.reading, 'string');
      assert.ok(b.reading.length > 0);
      assert.ok(!/[0-9]/.test(b.reading));
      assert.strictEqual(b.ward, ward(sheet, s));
    }
  }
});

test('remember returns a new sheet and leaves the original untouched', () => {
  const a = make(3);
  const b = remember(a, 'fee');
  assert.notStrictEqual(a, b);
  assert.deepStrictEqual(a.learned, []);
  assert.deepStrictEqual(b.learned, ['fee']);
  assert.deepStrictEqual(remember(b, 'fee').learned, ['fee']);
});

test('fitness reaches known, learnable and unknowable', () => {
  const base = make(1);
  const sheet = (wards, learned = []) => ({ ...base, wards, learned });
  assert.strictEqual(fitness('what', 'fee', sheet({ fee: 3 }, ['fee'])), 'known');
  assert.strictEqual(fitness('what', 'fee', sheet({ fee: 1 })), 'learnable');
  assert.strictEqual(fitness('what', 'fee', sheet({ fee: 2 })), 'learnable');
  assert.strictEqual(fitness('what', 'fee', sheet({ fee: 3 })), 'unknowable');
  assert.strictEqual(fitness('who', 'fee', sheet({ fee: 3 })), 'learnable');
});

test('fires: the trigger does not have to be met directly', () => {
  const sheet = make(1, 'blamed');
  const t = BAGGAGE.blamed.trigger;
  assert.deepStrictEqual(fires(sheet, { suit: t.suits[0], subject: t.near[0] }), { fired: true, oblique: true });
  assert.deepStrictEqual(fires(sheet, { suit: t.suits[0], subject: t.subject }), { fired: true, oblique: false });
  assert.deepStrictEqual(fires(sheet, { suit: 'when', subject: t.subject }), { fired: false, oblique: false });
  assert.deepStrictEqual(fires(sheet, { suit: t.suits[0], subject: 'weather' }), { fired: false, oblique: false });
});

test('different baggage gives different triggers', () => {
  const a = make(5, 'blamed');
  const b = make(5, 'unheard');
  assert.notDeepStrictEqual(a.baggage.trigger, b.baggage.trigger);
  assert.ok(Object.keys(BAGGAGE).length >= 3);
  for (const k of Object.values(BAGGAGE)) {
    assert.ok(SUBJECTS.includes(k.trigger.subject));
    for (const n of k.trigger.near) assert.ok(SUBJECTS.includes(n));
  }
});
