'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { seededRng } = require('../call/rng');
const {
  COUNTS, SHEETS, KNOWS, band, drawCounts, shapeAnswer, shapeCall, describeShape,
} = require('./answer');

const { X, Y, Z } = SHEETS;
const ask = (suit, angle, subject, extra = {}) => ({ kind: 'question', suit, angle, subject, ...extra });
const paraphrase = (subject, extra = {}) => ({ kind: 'paraphrase', suit: 'what', angle: 'validate', subject, ...extra });
const shape = (sheet, move, history = [], seed = 1, shift = {}) =>
  shapeAnswer({ sheet, move, history, rng: seededRng(seed), shift });
/** A history entry written by hand, for pinning what came before. */
const past = (move, says = 'a sentence or two', repeat = null, gives = ['cannot-transfer']) => ({ move, shape: { says, repeat, gives } });

test('band puts a value on her own curve, with the tails beyond two spreads', () => {
  assert.strictEqual(band(0), 'usual');
  assert.strictEqual(band(1), 'usual');
  assert.strictEqual(band(1.01), 'high side');
  assert.strictEqual(band(-1.5), 'low side');
  assert.strictEqual(band(2.01), 'tail high');
  assert.strictEqual(band(-2.01), 'tail low');
});

test('drawCounts is deterministic and returns all five counts', () => {
  assert.deepStrictEqual(drawCounts(seededRng(5)), drawCounts(seededRng(5)));
  assert.deepStrictEqual(Object.keys(drawCounts(seededRng(5))), [...COUNTS]);
  const shifted = drawCounts(seededRng(5), { openness: -0.5 });
  assert.ok(Math.abs(shifted.openness - (drawCounts(seededRng(5)).openness - 0.5)) < 1e-9);
});

test('the counts land where docs/sharing-links.md says they do', () => {
  const rng = seededRng(1114);
  const n = 40000;
  let allUsual = 0;
  let signal = 0;
  let lowVolume = 0;
  let signalWhenVolumeLow = 0;
  for (let i = 0; i < n; i++) {
    const z = drawCounts(rng);
    if (COUNTS.every((c) => Math.abs(z[c]) <= 2)) allUsual++;
    signal += z.signal;
    if (z.volume < -2) { lowVolume++; signalWhenVolumeLow += z.signal; }
  }
  // Three answers in four have nothing in a tail.
  assert.ok(Math.abs(allUsual / n - 0.77) < 0.02, `all usual ${allUsual / n}`);
  // Signal sits a little below its own centre once the others act on it.
  assert.ok(signal / n < -0.2 && signal / n > -0.4, `signal centre ${signal / n}`);
  // Very few words drag signal well down with them.
  assert.ok(lowVolume > 100);
  assert.ok(signalWhenVolumeLow / lowVolume < -0.8, `signal when volume is low ${signalWhenVolumeLow / lowVolume}`);
});

test('repetition: middle is fine, then wears thin, then notices; low hears not listening; high is settled', () => {
  const moves = [paraphrase('pell'), paraphrase('pell'), paraphrase('pell')];
  const react = (sheet) => shapeCall({ sheet, moves, rng: seededRng(3) }).map((h) => h.shape.repeat);
  assert.deepStrictEqual(react(Y), ['fine', 'wears thin', 'notices the repeat']);
  assert.deepStrictEqual(react(X), ['not listening', 'not listening', 'not listening']);
  assert.deepStrictEqual(react({ ...Y, repetition: 'high' }), ['settled', 'settled', 'settled']);
});

test('the same question twice is a repeat; a new question or a guess is not', () => {
  const first = ask('what', 'contract', 'bag');
  const history = [past(first)];
  assert.strictEqual(shape(X, first, history).repeat, 'not listening');
  assert.strictEqual(shape(X, ask('what', 'contract', 'draught'), history).repeat, null);
  assert.strictEqual(shape(X, ask('who', 'contract', 'bag'), history).repeat, null);
  // A different angle on the same word is a new question, not a repeat.
  assert.strictEqual(shape(X, ask('what', 'random', 'bag'), history).repeat, null);
  assert.strictEqual(shape(X, { ...first, kind: 'guess' }, history).repeat, null);
});

test('a repeat that wears on her takes words away; one she is fine with does not', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const plain = shape(Y, ask('what', 'contract', 'bag'), [], seed);
    const fine = shape(Y, paraphrase('bag'), [], seed);
    const thin = shape(Y, paraphrase('bag'), [past(paraphrase('bag'), 'a sentence or two', 'fine')], seed);
    assert.strictEqual(fine.counts.volume, plain.counts.volume);
    assert.ok(Math.abs(thin.counts.volume - (plain.counts.volume - 1)) < 1e-9);
  }
});

test('pattern: middle names a straight run of three, low never, only high hears alternation', () => {
  const run = [ask('what', 'contract', 'bag'), ask('what', 'contract', 'draught'), ask('what', 'contract', 'transfer')];
  const last = (sheet, moves) => shapeCall({ sheet, moves, rng: seededRng(2) }).map((h) => h.shape.pattern);
  assert.deepStrictEqual(last(Y, run), [null, null, 'names the run']);
  assert.deepStrictEqual(last(X, run), [null, null, null]);
  const alternating = [ask('why', 'expand', 'pell'), ask('when', 'expand', 'morning'), ask('why', 'expand', 'bag'), ask('when', 'expand', 'contract')];
  assert.deepStrictEqual(last(Y, alternating), [null, null, null, null]);
  assert.strictEqual(last({ ...Y, pattern: 'high' }, alternating)[3], 'names the alternation');
  // A fix is not a card, so it cannot complete a run.
  assert.strictEqual(shape(Y, { kind: 'fix' }, run.map((m) => past(m))).pattern, null);
});

test('reach: digging is brushed off by a switch before she has answered; wide is stuck on a third in a row', () => {
  const bag = ask('what', 'contract', 'bag');
  const pell = ask('who', 'expand', 'pell');
  const unanswered = past(bag, 'a sentence or two', null, []);
  assert.strictEqual(shape(Y, pell, [unanswered]).reach, 'brushed off');
  assert.strictEqual(shape(Y, pell, [past(bag, 'a few words')]).reach, null);
  assert.strictEqual(shape(Y, bag, [unanswered]).reach, null);
  // Asking who she is opens no thread and closes none.
  const name = ask('who', 'expand', 'name');
  assert.strictEqual(shape(Y, name, [unanswered]).reach, null);
  assert.strictEqual(shape(Y, pell, [unanswered, past(name, 'a few words', null, [])]).reach, 'brushed off');
  assert.strictEqual(shape(Z, bag, [past(bag), past(name), past(bag)]).reach, 'stuck');
  assert.strictEqual(shape(Z, bag, [past(bag), past(bag)]).reach, 'stuck');
  assert.strictEqual(shape(Z, pell, [past(bag), past(bag)]).reach, null);
  assert.strictEqual(shape(Z, bag, [past(bag)]).reach, null);
  assert.strictEqual(shape(Y, pell, []).reach, null);
});

test('empathy decides what a clumsy or stock move draws from her', () => {
  const fishing = ask('what', 'random', 'bag', { landing: 'misfire' });
  assert.strictEqual(shape(X, fishing).towardAgent, 'lets them off');
  assert.strictEqual(shape(Y, fishing).towardAgent, 'gets short');
  assert.strictEqual(shape(Z, fishing).towardAgent, 'no warmth');
  assert.strictEqual(shape(X, paraphrase('pell', { stock: true })).towardAgent, 'hears the stock line');
  assert.strictEqual(shape(Y, paraphrase('pell', { stock: true })).towardAgent, null);
  assert.strictEqual(shape(X, ask('what', 'contract', 'bag')).towardAgent, null);
  // Getting short costs her half a spread of volume against the same draw.
  const clean = shape(Y, { ...fishing, landing: 'lands' }, [], 9);
  assert.ok(Math.abs(shape(Y, fishing, [], 9).counts.volume - (clean.counts.volume - 0.5)) < 1e-9);
});

test('baggage comes out when she is open or when something sets it off, never when she is closed', () => {
  const plain = ask('what', 'contract', 'bag');
  assert.strictEqual(shape(Y, plain, [], 1, { openness: 6 }).baggage, 'pell-gets-hurt');
  assert.strictEqual(shape(X, plain, [], 1, { openness: 6 }).baggage, 'no-one-told-her');
  const trigger = ask('when', 'expand', 'morning');
  assert.strictEqual(shape(Y, trigger, [], 1, { openness: -6 }).baggage, null);
  let fired = 0;
  let quiet = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const onTrigger = shape(Y, trigger, [], seed);
    if (onTrigger.bands.openness !== 'tail low') { assert.strictEqual(onTrigger.baggage, 'pell-gets-hurt'); fired++; }
    const offTrigger = shape(Y, plain, [], seed);
    if (offTrigger.counts.openness <= 1) { assert.strictEqual(offTrigger.baggage, null); quiet++; }
  }
  assert.ok(fired > 150 && quiet > 100);
  // X's trigger is not Y's: the morning sets nothing off in her.
  assert.strictEqual(shape(X, trigger, [], 1, { openness: 0.5 - drawCounts(seededRng(1)).openness }).baggage, null);
});

test('she is sure nothing changed on her side: right on X, wrong on Y, and it never shows which', () => {
  const asked = ask('what', 'verify', 'changed');
  assert.deepStrictEqual(shape(X, asked, [], 1, { certainty: 6 }).belief, { id: 'nothing-changed-on-her-side', right: true, sure: true });
  assert.deepStrictEqual(shape(Y, asked, [], 1, { certainty: 6 }).belief, { id: 'nothing-changed-on-her-side', right: false, sure: true });
  assert.strictEqual(shape(Y, asked, [], 1, { certainty: -6 }).belief.sure, false);
  // Z has the update and her own word, not her own setting: she is right.
  assert.strictEqual(shape(Z, asked).belief.right, true);
  assert.strictEqual(shape(Y, ask('what', 'contract', 'bag')).belief, null);
});

test('what a fix leaves her doing follows her sheet', () => {
  const miss = { kind: 'wrong-fix' };
  const twice = (sheet) => shapeCall({ sheet, moves: [miss, miss], rng: seededRng(4) }).map((h) => h.shape.afterFix);
  assert.deepStrictEqual(twice(Y), ['shows it', 'asks for someone else']);
  assert.deepStrictEqual(twice(X), ['stops signalling', 'stops signalling']);
  assert.deepStrictEqual(twice(Z), ['shows it', 'shows it']);
  assert.strictEqual(shape(X, { kind: 'unclear-fix' }).afterFix, 'thanks them and rings off');
  assert.strictEqual(shape(Y, { kind: 'unclear-fix' }).afterFix, 'asks what it means');
  assert.strictEqual(shape(X, { kind: 'blame' }).afterFix, 'puts it on the company');
  assert.strictEqual(shape(X, { kind: 'blame' }).towardAgent, 'lets them off');
  assert.strictEqual(shape(Y, { kind: 'blame' }).afterFix, 'turns on the agent');
  assert.strictEqual(shape(Y, { kind: 'fix' }).afterFix, null);
});

test('she only ever gives what she knows, nearest the question first, and no more than fits', () => {
  const ids = KNOWS.map((k) => k.id);
  const room = { 'a few words': 1, 'a sentence or two': 2, 'three or four sentences': 3, 'runs on': 5 };
  for (let seed = 1; seed <= 300; seed++) {
    const s = shape(Y, ask('who', 'contract', 'pell'), [], seed);
    for (const given of s.gives) assert.ok(ids.includes(given));
    assert.strictEqual(new Set(s.gives).size, s.gives.length);
    assert.ok(s.gives.length <= room[s.says] + 1, `${s.says} gave ${s.gives.length}`);
    if (s.gives.length) assert.strictEqual(s.gives[0], 'pell-shut-out');
    if (s.bands.signal === 'tail low') assert.deepStrictEqual(s.gives, []);
  }
  assert.deepStrictEqual(shape(Y, { kind: 'fix' }).gives, []);
  assert.strictEqual(shape(Y, { kind: 'fix' }).asked, false);
  assert.ok(!describeShape(shape(Y, { kind: 'fix' })).includes('gives'));
  // A critical question gets one thing more than the same draw would give.
  const lands = shape(Y, ask('who', 'contract', 'pell'), [], 12);
  const critical = shape(Y, ask('who', 'contract', 'pell', { landing: 'critical' }), [], 12);
  assert.strictEqual(critical.gives.length, Math.min(KNOWS.length, lands.gives.length + 1));
});

test('asked who she is, she says so first, even at her shortest', () => {
  for (let seed = 1; seed <= 200; seed++) {
    for (const subject of ['name', 'number', 'party', 'account']) {
      const s = shape(Y, ask('who', 'expand', subject), [], seed, { volume: -4, signal: -4 });
      assert.deepStrictEqual(s.gives, [`her-${subject}`]);
    }
    const open = shape(Y, ask('who', 'expand', 'name', { landing: 'critical' }), [], seed);
    assert.strictEqual(open.gives[0], 'her-name');
  }
});

test('two sheets differ only where the sheets differ', () => {
  // A plain question that sets nothing off: the same draw gives the same answer.
  for (let seed = 1; seed <= 100; seed++) {
    const x = shape(X, ask('what', 'contract', 'draught'), [], seed);
    const y = shape(Y, ask('what', 'contract', 'draught'), [], seed);
    assert.deepStrictEqual(x.counts, y.counts);
    assert.deepStrictEqual(x.gives, y.gives);
    if (x.baggage) assert.notStrictEqual(x.baggage, y.baggage);
  }
  // A paraphrase is where they part.
  assert.notStrictEqual(shape(X, paraphrase('pell')).repeat, shape(Y, paraphrase('pell')).repeat);
});

test('shapeAnswer is pure and deterministic', () => {
  const move = Object.freeze(ask('what', 'contract', 'bag'));
  const history = Object.freeze([Object.freeze(past(Object.freeze(paraphrase('bag')), 'a few words', 'fine'))]);
  const before = JSON.stringify({ move, history, sheet: Y });
  const a = shape(Y, move, history, 21);
  assert.strictEqual(JSON.stringify({ move, history, sheet: Y }), before);
  assert.deepStrictEqual(a, shape(Y, move, history, 21));
  assert.notDeepStrictEqual(a.counts, shape(Y, move, history, 22).counts);
});

test('many calls on every sheet: nothing throws and every shape reads as a sentence', () => {
  const moves = [
    ask('what', 'expand', 'working'), ask('what', 'contract', 'bag'), paraphrase('pell', { stock: true }),
    ask('what', 'random', 'bag', { landing: 'misfire' }), ask('when', 'expand', 'morning', { landing: 'critical' }),
    ask('what', 'verify', 'changed'), { kind: 'wrong-fix' }, { kind: 'blame' }, { kind: 'fix' },
  ];
  const says = ['a few words', 'a sentence or two', 'three or four sentences', 'runs on'];
  for (const sheet of [X, Y, Z]) {
    for (let seed = 1; seed <= 200; seed++) {
      const call = shapeCall({ sheet, moves, rng: seededRng(seed) });
      assert.strictEqual(call.length, moves.length);
      for (const { shape: s } of call) {
        assert.ok(says.includes(s.says));
        assert.ok(describeShape(s).startsWith(`says ${s.says}`));
      }
    }
  }
});
