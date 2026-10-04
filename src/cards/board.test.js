'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { seededRng } = require('../call/rng');
const B = require('./board');
const { RECORD, node } = require('./record');

test('the opening puts its words in play and nothing else', () => {
  const b = B.newBoard(['a', 'b']);
  assert.deepStrictEqual(
    b.targets.map((t) => t.id),
    ['a', 'b'],
  );
  assert.deepStrictEqual(b.written, []);
});

test('a landed move adds targets; a miss adds nothing', () => {
  let b = B.newBoard(['a']);
  b = B.landed(b, [{ id: 'x', cls: 'customer' }]);
  assert.ok(B.has(b, 'x'));
  const before = b.targets.length;
  b = B.nothing(b);
  assert.strictEqual(b.targets.length, before, 'a miss must not grow the board');
});

test('place does not mutate the board it was given', () => {
  const b = B.newBoard(['a']);
  const after = B.place(b, [{ id: 'x', cls: 'customer' }]);
  assert.strictEqual(b.targets.length, 1, 'the input board was mutated');
  assert.strictEqual(after.targets.length, 2);
});

test('the same target surfacing twice is not two things to aim at', () => {
  let b = B.newBoard(['a']);
  b = B.landed(b, [{ id: 'a', cls: 'customer' }]);
  assert.strictEqual(b.targets.filter((t) => t.id === 'a').length, 1);
});

test('a find occupies a slot until it is written down', () => {
  let b = B.newBoard(['a']);
  b = B.landed(b, [{ id: 'f', cls: 'customer', find: true }]);
  const room = B.room(b);
  b = B.writeDown(b, 'f');
  assert.ok(!B.has(b, 'f'), 'the find should leave the board');
  assert.deepStrictEqual(b.written, ['f']);
  assert.strictEqual(B.room(b), room + 1);
});

test('writing down something that is not a find in play changes nothing', () => {
  const b = B.landed(B.newBoard(['a']), [{ id: 'q', cls: 'customer' }]);
  const after = B.writeDown(b, 'q');
  assert.deepStrictEqual(after.written, [], 'only a find can be written down');
  assert.ok(B.has(after, 'q'));
});

test('overflow drops the oldest non-find and keeps the find', () => {
  const words = [];
  for (let i = 0; i < B.SLOTS; i += 1) words.push(`w${i}`);
  let b = B.newBoard(words);
  b = B.landed(b, [{ id: 'keep', cls: 'customer', find: true }]);
  assert.ok(B.has(b, 'keep'), 'a find must not be the thing that falls off');
  assert.strictEqual(b.targets.length, B.SLOTS);
  assert.deepStrictEqual(b.dropped, ['w0']);
});

test('a critical shows some edges and never all of them', () => {
  const rng = seededRng(5);
  const n = node(RECORD, 'ord-4471');
  for (let i = 0; i < 400; i += 1) {
    const got = B.criticalEdges(RECORD, 'ord-4471', rng, 'ord-4471-lines');
    assert.ok(got.length >= 1, 'a critical that shows nothing is not a critical');
    assert.ok(got.length < n.edges.length, 'showing every edge ends the hunt on one roll');
  }
});

test('the correct edge never travels alone', () => {
  const rng = seededRng(11);
  for (let i = 0; i < 400; i += 1) {
    const got = B.criticalEdges(RECORD, 'ord-4471', rng, 'ord-4471-lines');
    if (got.length === 1) {
      assert.notStrictEqual(got[0].to, 'ord-4471-lines', 'the right answer alone is the Solved pathology');
    }
  }
});

test('a critical labels the link kind, which read() deliberately does not', () => {
  const rng = seededRng(3);
  const got = B.criticalEdges(RECORD, 'ord-4471', rng, null);
  for (const e of got) assert.ok(typeof e.link === 'string' && e.link.length);
});

test('a node with one edge or none criticals to nothing', () => {
  const rng = seededRng(1);
  assert.deepStrictEqual(B.criticalEdges(RECORD, 'trk-7781', rng, null), []);
  assert.deepStrictEqual(B.criticalEdges(RECORD, 'nope', rng, null), []);
});
