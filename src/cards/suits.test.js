'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { SUITS, ANGLES, RANDOM, CLASSES, legal, resolveRandom, moves } = require('./suits');
const { seededRng } = require('../call/rng');

test('SUITS and ANGLES hold exactly the expected values', () => {
  assert.deepStrictEqual(SUITS, ['who', 'what', 'why', 'when', 'where', 'how']);
  assert.deepStrictEqual(ANGLES, ['verify', 'validate', 'expand', 'contract']);
  assert.deepStrictEqual(CLASSES, ['customer', 'record', 'coworker']);
});

test('RANDOM is a separate export and not an angle', () => {
  assert.strictEqual(RANDOM, 'random');
  assert.ok(!ANGLES.includes(RANDOM));
});

test('legal returns null for a known-good combination', () => {
  assert.strictEqual(legal('who', 'expand', 'customer'), null);
});

test('validate against the record is illegal and says the record responds', () => {
  const reason = legal('what', 'validate', 'record');
  assert.notStrictEqual(reason, null);
  assert.match(reason, /responds rather than confirms/);
  assert.strictEqual(reason, reason.toLowerCase());
});

test('verify against the customer is legal (reading her words back is checking a source)', () => {
  assert.strictEqual(legal('what', 'verify', 'customer'), null);
});

test('validate against customer and coworker stays legal', () => {
  assert.strictEqual(legal('why', 'validate', 'customer'), null);
  assert.strictEqual(legal('why', 'validate', 'coworker'), null);
});

test('legal rejects an unknown suit, angle, and class, each naming which', () => {
  assert.match(legal('which', 'verify', 'customer'), /suit/);
  assert.match(legal('who', 'ponder', 'customer'), /angle/);
  assert.match(legal('who', 'verify', 'manager'), /class/);
  assert.match(legal('who', RANDOM, 'customer'), /angle/);
});

test('resolveRandom is deterministic for a seeded rng', () => {
  const a = [], b = [];
  const r1 = seededRng(42), r2 = seededRng(42);
  for (let i = 0; i < 20; i++) { a.push(resolveRandom(r1)); b.push(resolveRandom(r2)); }
  assert.deepStrictEqual(a, b);
});

test('resolveRandom covers every suit and angle in 500 draws and never returns RANDOM', () => {
  const rng = seededRng(7);
  const suits = new Set(), angles = new Set();
  for (let i = 0; i < 500; i++) {
    const { suit, angle } = resolveRandom(rng);
    assert.notStrictEqual(angle, RANDOM);
    suits.add(suit); angles.add(angle);
  }
  assert.deepStrictEqual([...suits].sort(), [...SUITS].sort());
  assert.deepStrictEqual([...angles].sort(), [...ANGLES].sort());
});

test('resolveRandom uses only the injected rng', () => {
  const real = Math.random;
  Math.random = () => { throw new Error('bare Math.random called'); };
  try { resolveRandom(seededRng(1)); } finally { Math.random = real; }
});

test('moves() is the full product minus the illegal combinations, from the rules', () => {
  let illegal = 0;
  for (const s of SUITS) for (const a of ANGLES) for (const c of CLASSES) {
    if (legal(s, a, c) !== null) illegal++;
  }
  assert.ok(illegal > 0);
  const all = moves();
  assert.strictEqual(all.length, SUITS.length * ANGLES.length * CLASSES.length - illegal);
  for (const m of all) assert.strictEqual(legal(m.suit, m.angle, m.targetClass), null);
  assert.ok(!all.some((m) => m.angle === 'validate' && m.targetClass === 'record'));
  assert.ok(all.some((m) => m.angle === 'verify' && m.targetClass === 'customer'));
  const keys = new Set(all.map((m) => `${m.suit}/${m.angle}/${m.targetClass}`));
  assert.strictEqual(keys.size, all.length);
});
