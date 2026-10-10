'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { seededRng } = require('../call/rng');
const WORDS = require('./words');
const BAG = require('./bag');

test('every base word has something anyone could say, with a sentence shape', () => {
  for (const base of WORDS.BASES) {
    assert.ok(WORDS.PEOPLE[base] && WORDS.PEOPLE[base].length >= 2, `${base} has no common pool`);
    for (const w of WORDS.PEOPLE[base]) {
      assert.ok(w.word && w.frame, `${base} entry is missing a word or a frame`);
    }
  }
});

test('the base feeling follows how the call is going, and the low end follows her baggage', () => {
  assert.strictEqual(WORDS.feelingBase(3), 'glad');
  assert.strictEqual(WORDS.feelingBase(0), 'not bad');
  assert.strictEqual(WORDS.feelingBase(-0.5), 'not good');
  assert.strictEqual(WORDS.feelingBase(-1.5), 'bad');
  assert.strictEqual(WORDS.feelingBase(-5, 'mad'), 'mad');
  // Two callers having an equally bad call are not both angry.
  assert.strictEqual(WORDS.feelingBase(-5, 'sad'), 'sad');
  assert.strictEqual(WORDS.feelingBase(1, 'sad'), 'good');
});

test('each layer offers its own words, and only her own baggage speaks', () => {
  const mine = WORDS.offers('sad', BAG.VOICE, 'pell-gets-hurt').map((w) => w.word);
  assert.ok(mine.includes('worried sick'));
  assert.ok(!mine.includes('stupid'), "another caller's baggage leaked into hers");
  const none = WORDS.offers('sad', BAG.VOICE, null).map((w) => w.layer);
  assert.ok(none.every((l) => l === 'people'));
  assert.ok(WORDS.offers('mad', BAG.VOICE, null).some((w) => w.layer === 'person'));
});

test('her own word outweighs the common pool, and comes back once she has used it', () => {
  const count = (used) => {
    let n = 0;
    for (let i = 0; i < 4000; i += 1) {
      const w = WORDS.pickWord({ base: 'mad', voice: BAG.VOICE, baggageId: null, used, rng: seededRng(i + 1) });
      if (w.word === 'ridiculous') n += 1;
    }
    return n / 4000;
  };
  const fresh = count([]);
  const returning = count(['ridiculous']);
  // One of four entries: an even pick would be 25%.
  assert.ok(fresh > 0.4, `her own word came up only ${fresh}`);
  assert.ok(returning > fresh + 0.05, 'a word she has used should come back more readily');
  assert.ok(returning < 0.95, 'and still not every time');
});

test('a base with nothing on offer gives null rather than inventing a word', () => {
  assert.strictEqual(WORDS.pickWord({ base: 'elated', voice: BAG.VOICE, rng: seededRng(1) }), null);
});

test('the frame takes what the feeling lands on, at either end of the sentence', () => {
  assert.strictEqual(WORDS.frameWith('{At} is driving me crazy', 'this process'), 'This process is driving me crazy');
  assert.strictEqual(WORDS.frameWith("I'm going insane dealing with {at}", 'this bag'), "I'm going insane dealing with this bag");
  assert.strictEqual(WORDS.frameWith('Good', 'this bag'), 'Good');
});
