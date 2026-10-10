'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { seededRng } = require('../call/rng');
const REPLY = require('./reply');
const SHEET = require('./sheet');
const BAG = require('./bag');

const kinds = Object.values(BAG.BAGGAGE);
function sheetFor(seed, overrides = {}) {
  const s = SHEET.newSheet({ who: 'x', baggage: kinds[seed % kinds.length], rng: seededRng(seed), subjects: BAG.SUBJECTS });
  return Object.freeze({ ...s, ...overrides, wards: Object.freeze({ ...s.wards, ...(overrides.wards || {}) }) });
}
const q = (suit, subject, angle = 'contract') => ({ suit, angle, subject });
const cause = BAG.CAUSES[0];

/** Every line the scenario holds, which is all a template may quote. */
const HELD = new Set(
  Object.values(BAG.BASELINE)
    .concat(Object.values(BAG.BELIEFS).map((b) => b.any))
    .concat(Object.values(BAG.HERRINGS).map((h) => h.text))
    .concat(cause.departures)
    .concat(Object.values(BAG.FRAGMENTS).flat().map((f) => f.say()))
    .concat(BAG.FRAGMENT_FALLBACK.map((f) => f.say()))
    .concat(kinds.map((k) => k.line))
    .concat(Object.values(BAG.TALK.VOLUNTEER))
    .concat([BAG.NEED.line]),
);

test('the odds sum to one, and one inquiry can never be answered as second or both', () => {
  for (let seed = 1; seed <= 50; seed += 1) {
    const sheet = sheetFor(seed);
    const one = REPLY.odds(BAG, sheet, [q('what', 'bag')]);
    assert.strictEqual(one.second, 0);
    assert.strictEqual(one.both, 0);
    const two = REPLY.odds(BAG, sheet, [q('what', 'bag'), q('what', 'tried')]);
    for (const o of [one, two]) {
      const sum = o.first + o.second + o.both + o.random;
      assert.ok(Math.abs(sum - 1) < 1e-9, `odds sum to ${sum}`);
      for (const v of Object.values(o)) assert.ok(v >= 0 && v <= 1);
    }
    for (let i = 0; i < 20; i += 1) {
      const pick = REPLY.choose({ sc: BAG, sheet, inquiries: [q('what', 'bag')], state: {}, rng: seededRng(seed * 100 + i) });
      assert.ok(pick === 'first' || pick === 'random', `one inquiry gave ${pick}`);
    }
  }
});

test('her choice comes off her sheet: a guarded subject loses to an open one', () => {
  const guarded = sheetFor(3, { wards: { tried: 3, bag: 1 } });
  const open = sheetFor(3, { wards: { tried: 1, bag: 1 } });
  const pair = [q('what', 'tried'), q('what', 'bag')];
  const g = REPLY.odds(BAG, guarded, pair);
  const o = REPLY.odds(BAG, open, pair);
  assert.ok(g.second > g.first, 'she should prefer the open subject to the guarded one');
  assert.ok(o.first > g.first, 'lowering the ward should make her likelier to take it');
  assert.ok(o.both > g.both, 'and likelier to answer both');
});

test('the question matters: the same subject asked two ways is not the same odds', () => {
  const sheet = sheetFor(5);
  const fits = REPLY.pull(BAG, sheet, q('what', 'bag'));
  const beside = REPLY.pull(BAG, sheet, q('how', 'bag'));
  const nonsense = REPLY.pull(BAG, sheet, q('when', 'bag'));
  assert.ok(fits > beside, 'a suit that suits the subject should draw her more than one that merely parses');
  assert.ok(beside > nonsense || fits > nonsense);
  assert.ok(nonsense > 0, 'she can still repair a slip');
});

test('a call going badly sends her her own way more often', () => {
  const sheet = sheetFor(7);
  const pair = [q('what', 'bag'), q('what', 'tried')];
  const calm = REPLY.odds(BAG, sheet, pair, { sour: 0 });
  const sour = REPLY.odds(BAG, sheet, pair, { sour: 4 });
  assert.ok(sour.random > calm.random);
  assert.ok(sour.both < calm.both);
});

test('every pick is reachable, so none of the four is decoration', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 400; seed += 1) {
    seen.add(REPLY.choose({ sc: BAG, sheet: sheetFor(seed), inquiries: [q('what', 'bag'), q('how', 'tried')], state: {}, rng: seededRng(seed) }));
  }
  assert.deepStrictEqual([...seen].sort(), ['both', 'first', 'random', 'second']);
});

test('a template quotes only lines the scenario holds — nothing is made up for her', () => {
  let checked = 0;
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = seededRng(seed);
    const sheet = sheetFor(seed);
    const subjects = BAG.SUBJECTS;
    const a = subjects[seed % subjects.length];
    const b = subjects[(seed * 7 + 3) % subjects.length];
    const suits = ['who', 'what', 'why', 'when', 'where', 'how'];
    const inquiries = [q(suits[seed % 6], a), q(suits[(seed + 2) % 6], b)].filter((x, i, arr) => i === 0 || x.subject !== arr[0].subject);
    for (const pick of inquiries.length === 2 ? REPLY.PICKS : ['first', 'random']) {
      const t = REPLY.fill({ sc: BAG, sheet, pick, inquiries, cause, herrings: ['since', 'stores'], state: { sour: seed % 4 }, rng });
      const facts = t.gives.map((g) => g.fact).concat(t.own ? [t.own.fact] : [], t.need ? [t.need.fact] : []).filter(Boolean);
      for (const f of facts) {
        checked += 1;
        assert.ok(HELD.has(f), `not a line the scenario holds: ${f}`);
      }
    }
  }
  assert.ok(checked > 500, `too few facts checked: ${checked}`);
});

test('she takes up exactly what her pick says, and leaves the rest', () => {
  const sheet = sheetFor(2);
  const inquiries = [q('what', 'bag'), q('what', 'tried')];
  const fill = (pick) => REPLY.fill({ sc: BAG, sheet, pick, inquiries, cause, herrings: [], state: {}, rng: seededRng(1) });
  assert.deepStrictEqual(fill('first').took.map((x) => x.subject), ['bag']);
  assert.deepStrictEqual(fill('first').left.map((x) => x.subject), ['tried']);
  assert.deepStrictEqual(fill('second').took.map((x) => x.subject), ['tried']);
  assert.deepStrictEqual(fill('both').took.map((x) => x.subject), ['bag', 'tried']);
  const own = fill('random');
  assert.strictEqual(own.took.length, 0);
  assert.strictEqual(own.gives.length, 0);
  assert.ok(own.own && own.own.kind, 'going her own way has to be something');
});

test('the explanation comes only from the subject it runs through, asked in a way that parses', () => {
  const sheet = sheetFor(4);
  const at = (suit, subject) =>
    REPLY.fill({ sc: BAG, sheet, pick: 'first', inquiries: [q(suit, subject)], cause, herrings: [], state: {}, rng: seededRng(9) }).gives[0];
  assert.strictEqual(at('what', 'looking').kind, 'cause');
  // The mistake this guards: a question that makes no sense must not be
  // rewarded with the answer just because it named the right subject.
  assert.strictEqual(at('when', 'looking').kind, 'clue');
  assert.notStrictEqual(at('what', 'bag').kind, 'cause');
});

test('a question that suits the subject is answered; one that only parses is answered beside it', () => {
  const sheet = sheetFor(4);
  const at = (suit, subject) =>
    REPLY.fill({ sc: BAG, sheet, pick: 'first', inquiries: [q(suit, subject)], cause, herrings: [], state: {}, rng: seededRng(9) }).gives[0];
  assert.strictEqual(at('what', 'bag').kind, 'answer');
  assert.strictEqual(at('how', 'bag').kind, 'beside');
  assert.strictEqual(at('when', 'bag').kind, 'clue');
});

test('her baggage is said once, and her Need only when her trigger fires', () => {
  const sheet = sheetFor(1);
  for (let seed = 1; seed <= 200; seed += 1) {
    const t = REPLY.fill({ sc: BAG, sheet, pick: 'random', inquiries: [q('what', 'bag')], cause, herrings: [], state: { saidBaggage: true }, rng: seededRng(seed) });
    assert.notStrictEqual(t.own.kind, 'bad experience', 'she said it already');
  }
  const trig = sheet.baggage.trigger;
  // It has to be something she took up: a Need does not surface from a
  // question she left unanswered.
  const fired = REPLY.fill({ sc: BAG, sheet, pick: 'first', inquiries: [q(trig.suits[0], trig.subject)], cause, herrings: [], state: {}, rng: seededRng(1) });
  const ignored = REPLY.fill({ sc: BAG, sheet, pick: 'random', inquiries: [q(trig.suits[0], trig.subject)], cause, herrings: [], state: {}, rng: seededRng(1) });
  assert.strictEqual(ignored.need, null);
  assert.ok(fired.need, 'her trigger was asked and nothing surfaced');
  const again = REPLY.fill({ sc: BAG, sheet, pick: 'first', inquiries: [q(trig.suits[0], trig.subject)], cause, herrings: [], state: { needSeen: true }, rng: seededRng(1) });
  assert.strictEqual(again.need, null);
  const other = BAG.SUBJECTS.find((s) => s !== trig.subject && !trig.near.includes(s));
  const cold = REPLY.fill({ sc: BAG, sheet, pick: 'first', inquiries: [q(trig.suits[0], other)], cause, herrings: [], state: {}, rng: seededRng(1) });
  assert.strictEqual(cold.need, null);
});

test('nothing passed in is mutated, and the same seed gives the same template', () => {
  const sheet = sheetFor(6);
  const inquiries = Object.freeze([Object.freeze(q('what', 'bag')), Object.freeze(q('how', 'tried'))]);
  const state = Object.freeze({ answered: Object.freeze(['bag']), given: Object.freeze([]), usedWords: Object.freeze([]), sour: 1 });
  const a = REPLY.fill({ sc: BAG, sheet, pick: 'both', inquiries, cause, herrings: Object.freeze(['since']), state, rng: seededRng(3) });
  const b = REPLY.fill({ sc: BAG, sheet, pick: 'both', inquiries, cause, herrings: Object.freeze(['since']), state, rng: seededRng(3) });
  assert.deepStrictEqual(a, b);
  assert.ok(REPLY.render(a, BAG.label).length >= 3);
});

test('odd offers do not break her: one inquiry picked as second, and the same thing asked twice', () => {
  const sheet = sheetFor(2);
  const one = REPLY.fill({ sc: BAG, sheet, pick: 'second', inquiries: [q('what', 'bag')], cause, herrings: [], state: {}, rng: seededRng(1) });
  assert.strictEqual(one.gives.length, 0);
  const twice = REPLY.fill({ sc: BAG, sheet, pick: 'both', inquiries: [q('what', 'bag', 'expand'), q('what', 'bag')], cause, herrings: [], state: {}, rng: seededRng(1) });
  assert.strictEqual(twice.gives.length, 1, 'the same fact must not be given twice in one reply');
});
