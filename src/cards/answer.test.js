'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { seededRng } = require('../call/rng');
const {
  COUNTS, SHEETS, KNOWS, RETAIN, band, valueOf, freshNow, drawCounts, shapeAnswer, shapeCall, describeShape,
} = require('./answer');

const { X, Y, Z } = SHEETS;
const ask = (suit, angle, subject, extra = {}) => ({ kind: 'question', suit, angle, subject, ...extra });
const paraphrase = (subject, extra = {}) => ({ kind: 'paraphrase', suit: 'what', angle: 'validate', subject, ...extra });
const shape = (sheet, move, history = [], seed = 1, shift = {}) =>
  shapeAnswer({ sheet, move, history, rng: seededRng(seed), shift });
/** A history entry written by hand: what was asked, and what she gave to it. */
const past = (move, gives = ['cannot-transfer', 'pell-shut-out'], like = 0) => ({ move, shape: { gives, degrees: { likeness: like } } });
const near = (a, b) => Math.abs(a - b) < 1e-9;
/** A sheet with the number under one band set by hand. */
const withValue = (sheet, field, value) => ({ ...sheet, values: { ...(sheet.values || {}), [field]: value } });
const SWEEP = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const rising = (list) => list.every((v, i) => i === 0 || v > list[i - 1]);
const falling = (list) => list.every((v, i) => i === 0 || v < list[i - 1]);

const bag = ask('what', 'contract', 'bag');
const name = ask('who', 'expand', 'name');
const open = [past(bag, [])];

test('band puts a value on her own curve, with the tails beyond two spreads', () => {
  assert.strictEqual(band(0), 'usual');
  assert.strictEqual(band(1), 'usual');
  assert.strictEqual(band(1.01), 'high side');
  assert.strictEqual(band(-1.5), 'low side');
  assert.strictEqual(band(2.01), 'tail high');
  assert.strictEqual(band(-2.01), 'tail low');
});

test('valueOf reads the number under a band, or the middle of the band when none is given', () => {
  assert.strictEqual(valueOf(X, 'repetition'), 0.2);
  assert.strictEqual(valueOf(Y, 'repetition'), 0.5);
  assert.strictEqual(valueOf(X, 'empathy'), 0.8);
  assert.strictEqual(valueOf(Y, 'depth'), 0.8);
  assert.strictEqual(valueOf(Z, 'depth'), 0.2);
  assert.strictEqual(valueOf(withValue(Y, 'repetition', 0.37), 'repetition'), 0.37);
  assert.strictEqual(valueOf(withValue(Y, 'depth', 7), 'depth'), 1);
});

test('drawCounts is deterministic and returns all five counts', () => {
  assert.deepStrictEqual(drawCounts(seededRng(5)), drawCounts(seededRng(5)));
  assert.deepStrictEqual(Object.keys(drawCounts(seededRng(5))), [...COUNTS]);
  const shifted = drawCounts(seededRng(5), { openness: -0.5 });
  assert.ok(near(shifted.openness, drawCounts(seededRng(5)).openness - 0.5));
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
  assert.ok(Math.abs(allUsual / n - 0.77) < 0.02, `all usual ${allUsual / n}`);
  assert.ok(signal / n < -0.2 && signal / n > -0.4, `signal centre ${signal / n}`);
  assert.ok(lowVolume > 100);
  assert.ok(signalWhenVolumeLow / lowVolume < -0.8, `signal when volume is low ${signalWhenVolumeLow / lowVolume}`);
});

test('the only chance in an answer is her five counts', () => {
  let taken = 0;
  shapeAnswer({ sheet: Y, move: name, history: open, rng: () => { taken++; return 0.5; } });
  assert.strictEqual(taken, 10);
  const moves = [bag, name, paraphrase('bag'), ask('what', 'random', 'bag'), { kind: 'fix' }, { kind: 'blame' }];
  for (const sheet of [X, Y, Z]) {
    assert.deepStrictEqual(shapeCall({ sheet, moves, rng: () => 0.5 }), shapeCall({ sheet, moves, rng: () => 0.5 }));
  }
  // Ten numbers per answer over a whole call too: nothing else draws.
  let n = 0;
  shapeCall({ sheet: Y, moves, rng: () => { n++; return 0.5; } });
  assert.strictEqual(n, 10 * moves.length);
});

test('no reaction is a switch: move the number on her sheet and the degree moves with it', () => {
  const degree = (field, value, sheet, move, history, key) => shape(withValue(sheet, field, value), move, history).degrees[key];
  // The more she tolerates repetition, the less a repeat grates.
  assert.ok(falling(SWEEP.map((v) => degree('repetition', v, Y, paraphrase('bag'), [], 'repeat'))));
  // The more she prefers digging, the more leaving her point brushes her off, and the less staying on it sticks.
  assert.ok(rising(SWEEP.map((v) => degree('depth', v, Y, name, open, 'brushedOff'))));
  assert.ok(falling(SWEEP.map((v) => degree('depth', v, Y, bag, [past(bag), past(bag)], 'stuck'))));
  // The more closely she reads the agent, the warmer she is with a clumsy move, and the less short.
  const fishing = ask('what', 'random', 'bag', { landing: 'misfire' });
  assert.ok(rising(SWEEP.map((v) => degree('empathy', v, Y, fishing, [], 'warmth'))));
  assert.ok(falling(SWEEP.map((v) => degree('empathy', v, Y, fishing, [], 'short'))));
  // The more she absorbs, the less a miss strains her.
  assert.ok(falling(SWEEP.map((v) => degree('nonPositive', v, Y, { kind: 'wrong-fix' }, [], 'strain'))));
  // The more she hears pattern, the more a run registers.
  const run = [past(bag), past(bag)];
  assert.ok(rising(SWEEP.map((v) => degree('pattern', v, Y, bag, run, 'pattern'))));
});

test('every degree stays between none and full, on every sheet, over many calls', () => {
  const moves = [
    ask('what', 'expand', 'working'), bag, paraphrase('pell', { stock: true }), name,
    ask('what', 'random', 'bag', { landing: 'misfire' }), ask('when', 'expand', 'morning', { landing: 'critical' }),
    ask('what', 'verify', 'changed'), bag, { kind: 'wrong-fix' }, { kind: 'wrong-fix' }, { kind: 'blame' }, { kind: 'unclear-fix' }, { kind: 'fix' },
  ];
  const says = ['a few words', 'a sentence or two', 'three or four sentences', 'runs on'];
  const ids = KNOWS.map((k) => k.id);
  for (const sheet of [X, Y, Z]) {
    for (let seed = 1; seed <= 150; seed++) {
      for (const { shape: s } of shapeCall({ sheet, moves, rng: seededRng(seed) })) {
        for (const [key, value] of Object.entries(s.degrees)) {
          if (key !== 'patternShape') assert.ok(value >= 0 && value <= 1, `${key} ${value}`);
        }
        assert.ok(says.includes(s.says));
        assert.ok(describeShape(s).startsWith(`says ${s.says}`));
        // She only ever gives what she knows, or who she is, and nothing twice.
        for (const given of s.gives) assert.ok(ids.includes(given) || given.startsWith('her-'));
        assert.strictEqual(new Set(s.gives).size, s.gives.length);
      }
    }
  }
});

test('how like an earlier question a new one is: the word, the suit and the angle', () => {
  const history = [past(bag)];
  const like = (move, h = history) => shape(Y, move, h).degrees.likeness;
  assert.ok(near(like(bag), 1));
  assert.ok(near(like(ask('what', 'random', 'bag')), 0.8));
  assert.ok(near(like(ask('who', 'contract', 'bag')), 0.8));
  assert.ok(near(like(ask('who', 'random', 'bag')), 0.6));
  assert.strictEqual(like(ask('what', 'contract', 'draught')), 0);
  assert.strictEqual(like({ ...bag, kind: 'guess' }), 0);
  assert.strictEqual(like(bag, []), 0);
  assert.strictEqual(like(paraphrase('bag'), []), 1);
  // So the same word asked a different way grates on low tolerance, less than a true repeat does.
  const grate = (sheet, move) => shape(sheet, move, history).degrees.repeat;
  assert.ok(grate(X, bag) > grate(X, ask('what', 'random', 'bag')));
  assert.ok(grate(X, ask('what', 'random', 'bag')) > grate(X, ask('who', 'random', 'bag')));
  assert.ok(grate(X, ask('who', 'random', 'bag')) > grate(Y, ask('who', 'random', 'bag')));
});

test('repetition reads as the record words it: middle fine, then thin, then noticed; low at once; high settled', () => {
  const moves = [paraphrase('pell'), paraphrase('pell'), paraphrase('pell')];
  const call = (sheet) => shapeCall({ sheet, moves, rng: seededRng(3) });
  assert.deepStrictEqual(call(Y).map((h) => h.shape.labels.repeat), ['fine with it', 'it wears thin', 'notices the repeat']);
  assert.deepStrictEqual(call(X).map((h) => h.shape.labels.repeat), Array(3).fill('reads it as not listening'));
  assert.deepStrictEqual(call({ ...Y, repetition: 'high' }).map((h) => h.shape.labels.repeat), Array(3).fill('settled by it'));
  // Underneath, it is one tolerance wearing down, faster the less of it she had.
  const grates = (sheet) => call(sheet).map((h) => h.shape.degrees.repeat);
  assert.ok(rising(grates(Y)));
  assert.ok(grates(X)[1] >= grates(X)[0] && grates(X)[0] > grates(Y)[0]);
  assert.ok(near(grates(Y)[0], 0.5) && grates(Y)[2] < 1);
  // Middle tolerance does not mind the same word asked another way, until the call has worn on her.
  // Pinned to the same answers so only the wearing differs: the bag answered in full straight before.
  const answeredBag = past(bag);
  const fresh = shape(Y, ask('what', 'random', 'bag'), [answeredBag]);
  const wornSheet = shapeCall({ sheet: Y, moves: [paraphrase('pell'), paraphrase('pell')], rng: seededRng(6) }).pop().shape.sheet;
  const worn = shapeAnswer({ sheet: wornSheet, move: ask('what', 'random', 'bag'), history: [answeredBag], rng: seededRng(1) });
  assert.strictEqual(fresh.labels.repeat, 'fine with it');
  assert.strictEqual(worn.labels.repeat, 'it wears thin');
});

test('a repeat takes words from her in proportion to how much it grates', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const plain = shape(Y, bag, [], seed);
    for (const sheet of [X, Y]) {
      const again = shape(sheet, paraphrase('bag'), [], seed);
      assert.ok(near(again.counts.volume, plain.counts.volume - 1.2 * again.degrees.repeat ** 2));
    }
    assert.ok(shape(X, paraphrase('bag'), [], seed).counts.volume < shape(Y, paraphrase('bag'), [], seed).counts.volume);
  }
});

test('brushed off is her digging, times how open her point is, times how far the move leaves it', () => {
  const brushed = (sheet, move, history) => shape(sheet, move, history).degrees.brushedOff;
  // A digger whose point has had nothing: her name is the furthest from it.
  assert.ok(near(brushed(Y, name, open), 0.8));
  assert.ok(near(brushed(Y, ask('when', 'expand', 'contract'), open), 0.48));
  // A related subject is a shorter step away: the bag and Pell share what she knows.
  assert.ok(near(brushed(Y, ask('who', 'expand', 'pell'), open), 0.24));
  assert.strictEqual(brushed(Y, bag, open), 0);
  // Half answered, half the feeling; fully answered, none; and none at the start of a call.
  assert.ok(near(brushed(Y, name, [past(bag, ['cannot-transfer'])]), 0.4));
  assert.strictEqual(brushed(Y, name, [past(bag)]), 0);
  assert.strictEqual(brushed(Y, name, []), 0);
  // A customer who casts wide feels a little of it, not none.
  assert.ok(near(brushed(Z, name, open), 0.2));
  // Her name in between does not answer her point for her.
  assert.ok(near(brushed(Y, ask('when', 'expand', 'contract'), [...open, past(name, [])]), 0.48));
  assert.strictEqual(shape(Y, name, open).labels.reach, 'badly brushed off');
  assert.strictEqual(shape(Y, ask('who', 'expand', 'pell'), open).labels.reach, null);
  assert.strictEqual(shape(Z, name, open).labels.reach, null);
});

test('stuck is her casting wide, times how long the agent has stayed on one word', () => {
  const stuck = (sheet, history) => shape(sheet, bag, history).degrees.stuck;
  assert.strictEqual(stuck(Z, []), 0);
  assert.ok(near(stuck(Z, [past(bag)]), 0.4));
  assert.ok(near(stuck(Z, [past(bag), past(bag)]), 0.8));
  assert.ok(near(stuck(Z, [past(bag), past(name), past(bag)]), 0.8));
  assert.ok(near(stuck(Y, [past(bag), past(bag)]), 0.2));
  assert.strictEqual(shape(Z, ask('who', 'expand', 'pell'), [past(bag), past(bag)]).degrees.stuck, 0);
  assert.strictEqual(shape(Z, bag, [past(bag), past(bag)]).labels.reach, 'badly stuck');
});

test('being brushed off or stuck takes words from her in proportion', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const fresh = shape(Y, name, [], seed);
    const brushed = shape(Y, name, open, seed);
    assert.ok(near(brushed.counts.volume, fresh.counts.volume - brushed.degrees.brushedOff));
  }
});

test('asked who she is, how much of her answer goes to her own problem is a range', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const settled = shape(Y, name, [past(bag)], seed);
    const half = shape(Y, name, [past(bag, ['cannot-transfer'])], seed);
    const digger = shape(Y, name, open, seed);
    const wide = shape(Z, name, open, seed);
    // Nothing open: she answers, her name first; running very open, she adds to it.
    assert.ok(settled.degrees.ownPoint <= 0.15);
    assert.ok(['answers', 'answers and adds'].includes(settled.labels.takes));
    assert.strictEqual(settled.gives[0], 'her-name');
    // The more of her point is open, and the more she digs, the more goes to her problem.
    assert.ok(digger.degrees.ownPoint > half.degrees.ownPoint && half.degrees.ownPoint > settled.degrees.ownPoint);
    assert.ok(digger.degrees.ownPoint > wide.degrees.ownPoint);
    // What she hands over follows the degree: her name first, then last, then not at all.
    for (const s of [settled, half, digger, wide]) {
      const at = s.gives.indexOf('her-name');
      if (s.degrees.ownPoint >= 0.75) assert.strictEqual(at, -1);
      else if (s.degrees.ownPoint >= 0.5) assert.strictEqual(at, s.gives.length - 1);
      else assert.strictEqual(at, 0);
    }
  }
  // With room to spare she says who she is and goes on to her problem; with none, only who she is.
  for (let seed = 1; seed <= 200; seed++) {
    const s = shape(Y, name, [past(bag)], seed, { openness: -6 });
    const room = { 'a few words': 1, 'a sentence or two': 2, 'three or four sentences': 3, 'runs on': 5 }[s.says];
    assert.strictEqual(s.gives[0], 'her-name');
    if (s.bands.signal === 'usual') assert.strictEqual(s.gives.length, room);
  }
  // All four of the record's own wordings come up across sheets and draws.
  const seen = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    for (const sheet of [Y, Z, withValue(Y, 'depth', 0.5)]) {
      for (const history of [open, [past(bag, ['cannot-transfer'])], [past(bag)]]) seen.add(shape(sheet, name, history, seed).labels.takes);
    }
  }
  assert.deepStrictEqual([...seen].sort(), ['answers', 'answers and adds', 'half-answers and drifts', 'leaves the question']);
  // A question on her problem is her own point already, and a fix asks nothing.
  assert.strictEqual(shape(Y, bag, open).degrees.ownPoint, 0);
  assert.strictEqual(shape(Y, { kind: 'fix' }).labels.takes, null);
});

test('pattern: a run is heard in proportion to her sense of it; alternation only by the upper half', () => {
  const run = [bag, ask('what', 'contract', 'draught'), ask('what', 'contract', 'transfer')];
  const heard = (sheet, moves) => shapeCall({ sheet, moves, rng: seededRng(2) }).map((h) => h.shape);
  assert.deepStrictEqual(heard(Y, run).map((s) => s.labels.pattern), [null, null, 'names the run']);
  assert.deepStrictEqual(heard(X, run).map((s) => s.labels.pattern), [null, null, null]);
  assert.ok(near(heard(Y, run)[1].degrees.pattern, 0.25) && near(heard(Y, run)[2].degrees.pattern, 0.5));
  // High sense starts to hear it at two in a row.
  assert.strictEqual(heard({ ...Y, pattern: 'high' }, run)[1].labels.pattern, 'starts to hear the run');
  const alternating = [ask('why', 'expand', 'pell'), ask('when', 'expand', 'morning'), ask('why', 'expand', 'bag'), ask('when', 'expand', 'contract')];
  assert.strictEqual(heard(Y, alternating)[3].degrees.pattern, 0);
  assert.strictEqual(heard({ ...Y, pattern: 'high' }, alternating)[3].labels.pattern, 'names the alternation');
  // A fix is not a card, so it cannot complete a run.
  assert.strictEqual(shape(Y, { kind: 'fix' }, run.map((m) => past(m))).degrees.pattern, 0);
});

test('empathy sets how warmly or how shortly a clumsy move is met', () => {
  const fishing = ask('what', 'random', 'bag', { landing: 'misfire' });
  const met = (sheet, move) => shape(sheet, move);
  assert.ok(near(met(X, fishing).degrees.warmth, 0.8) && near(met(X, fishing).degrees.short, 0.2));
  assert.strictEqual(met(X, fishing).labels.towardAgent, 'lets them off');
  assert.strictEqual(met(Y, fishing).labels.towardAgent, 'gets short');
  assert.strictEqual(met(Z, fishing).labels.towardAgent, 'no warmth');
  assert.strictEqual(met(X, paraphrase('pell', { stock: true })).labels.towardAgent, 'hears the stock line');
  assert.strictEqual(met(Y, paraphrase('pell', { stock: true })).labels.towardAgent, null);
  // A flat move is a little clumsy, not enough to remark on; a clean one not at all.
  const flat = met(Y, ask('what', 'contract', 'bag', { landing: 'flat' }));
  assert.ok(near(flat.degrees.short, 0.15));
  assert.strictEqual(flat.labels.towardAgent, null);
  assert.strictEqual(met(X, bag).degrees.warmth, 0);
  // Getting short costs her words in proportion.
  const clean = shape(Y, { ...fishing, landing: 'lands' }, [], 9);
  assert.ok(near(shape(Y, fishing, [], 9).counts.volume, clean.counts.volume - 0.25));
});

test('her baggage comes out by degrees: the more open she is, and the nearer its trigger', () => {
  const out = (sheet, move, openness) => shape(sheet, move, [], 1, { openness: openness - drawCounts(seededRng(1)).openness }).degrees.baggage;
  // The same question, with her openness set by hand.
  assert.ok(rising([0, 0.5, 1, 1.8].map((z) => out(Y, bag, z))));
  assert.strictEqual(out(Y, bag, -2), 0);
  // The morning is Y's trigger and not X's.
  const morning = ask('when', 'expand', 'morning');
  assert.ok(out(Y, morning, 0) > out(X, morning, 0));
  assert.ok(near(out(Y, morning, 0), 0.7) && near(out(X, morning, 0), 0.1));
  // Pell is near it, and the wrong suit dulls it.
  assert.ok(near(out(Y, ask('why', 'expand', 'pell'), 0), 0.52));
  assert.ok(near(out(Y, ask('who', 'expand', 'pell'), 0), 0.31));
  const label = (sheet, move, openness) => shape(sheet, move, [], 1, { openness: openness - drawCounts(seededRng(1)).openness }).labels.baggage;
  assert.strictEqual(label(Y, morning, 0), 'pell-gets-hurt');
  assert.strictEqual(label(X, bag, 1.2), 'no-one-told-her');
  assert.strictEqual(label(Y, bag, 0), null);
  // The more she closes up, the less even her trigger brings out; shut tight, nothing.
  assert.ok(falling([0, -1, -2, -3].map((z) => out(Y, morning, z))));
  assert.strictEqual(out(Y, morning, -3), 0);
  assert.strictEqual(label(Y, morning, -2), null);
});

test('she states that nothing changed on her side: right on X, wrong on Y, and how sure is a degree', () => {
  const asked = ask('what', 'verify', 'changed');
  assert.strictEqual(shape(X, asked).belief.right, true);
  assert.strictEqual(shape(Y, asked).belief.right, false);
  assert.strictEqual(shape(Z, asked).belief.right, true);
  assert.strictEqual(shape(Y, bag).belief, null);
  const sure = [-6, -1, 0, 1, 6].map((c) => shape(Y, asked, [], 1, { certainty: c }).belief.sure);
  assert.ok(sure.every((v, i) => i === 0 || v >= sure[i - 1]) && sure[0] === 0 && sure[4] === 1);
  // Told she changed something, she says she did not, right or wrong.
  for (let seed = 1; seed <= 30; seed++) {
    assert.strictEqual(shape(Y, { kind: 'blame' }, [], seed).belief.right, false);
    assert.strictEqual(shape(X, { kind: 'blame' }, [], seed).belief.right, true);
    assert.strictEqual(shape(Y, { kind: 'fix' }, [], seed).belief, null);
  }
});

test('what a fix leaves in her follows her sheet, by degrees', () => {
  const miss = { kind: 'wrong-fix' };
  const after = (sheet, n) => shapeCall({ sheet, moves: Array(n).fill(miss), rng: seededRng(4) }).map((h) => h.shape);
  assert.deepStrictEqual(after(Y, 2).map((s) => s.labels.afterFix), ['shows it', 'asks for someone else']);
  assert.deepStrictEqual(after(X, 3).map((s) => s.labels.afterFix), ['gives no sign', 'gives no sign', 'gives no sign']);
  // Middle absorbs a fair bit, and shows it: three misses in a row, and she has still not asked for someone else.
  assert.deepStrictEqual(after(Z, 3).map((s) => s.labels.afterFix), ['shows it', 'shows it', 'shows it']);
  assert.strictEqual(after(Z, 4)[3].labels.afterFix, 'asks for someone else');
  // The strain builds with each miss on every sheet; what reaches the agent is less than what is there.
  for (const sheet of [X, Y, Z]) {
    const strain = after(sheet, 3).map((s) => s.degrees.strain);
    assert.ok(strain[1] > strain[0] && strain[2] >= strain[1]);
  }
  assert.ok(after(X, 2)[1].degrees.shows < after(X, 2)[1].degrees.strain);
  assert.strictEqual(shape(X, { kind: 'unclear-fix' }).labels.afterFix, 'thanks them and rings off');
  assert.strictEqual(shape(Y, { kind: 'unclear-fix' }).labels.afterFix, 'asks what it means');
  assert.strictEqual(shape(X, { kind: 'blame' }).labels.afterFix, 'puts it on the company');
  assert.strictEqual(shape(X, { kind: 'blame' }).labels.towardAgent, 'lets them off');
  assert.strictEqual(shape(Y, { kind: 'blame' }).labels.afterFix, 'turns on the agent');
  assert.ok(near(shape(X, { kind: 'blame' }).degrees.onCompany, 0.8) && near(shape(X, { kind: 'blame' }).degrees.onAgent, 0.2));
  assert.strictEqual(shape(Y, { kind: 'fix' }).labels.afterFix, null);
});

test('on her problem she gives what she knows, nearest the question first, and no more than fits', () => {
  const room = { 'a few words': 1, 'a sentence or two': 2, 'three or four sentences': 3, 'runs on': 5 };
  for (let seed = 1; seed <= 300; seed++) {
    const s = shape(Y, ask('who', 'contract', 'pell'), [], seed);
    assert.ok(s.gives.length <= room[s.says] + 1, `${s.says} gave ${s.gives.length}`);
    if (s.gives.length) assert.strictEqual(s.gives[0], 'pell-shut-out');
    // At her least useful she still answers the one thing asked, and nothing more.
    if (s.bands.signal === 'tail low') assert.deepStrictEqual(s.gives, ['pell-shut-out']);
  }
  const lands = shape(Y, ask('who', 'contract', 'pell'), [], 12);
  const critical = shape(Y, ask('who', 'contract', 'pell', { landing: 'critical' }), [], 12);
  assert.strictEqual(critical.gives.length, Math.min(KNOWS.length, lands.gives.length + 1));
});

test('after a fix she comes back with as much as her signal or openness moves her to', () => {
  let some = 0;
  let none = 0;
  for (let seed = 1; seed <= 1000; seed++) {
    const s = shape(Y, { kind: 'fix' }, [], seed);
    assert.strictEqual(s.asked, false);
    assert.ok(near(s.degrees.volunteers, Math.max(0, Math.min(1, Math.max(s.counts.signal, s.counts.openness) / 2))));
    if (s.gives.length) {
      some++;
      assert.strictEqual(s.gives[0], 'leaves-in-the-morning');
      assert.ok(describeShape(s).includes('volunteers leaves-in-the-morning'));
    } else {
      none++;
      assert.ok(!describeShape(s).includes('gives') && !describeShape(s).includes('volunteers'));
    }
  }
  assert.ok(some > 50 && none > 50);
  const more = [0, 1, 2, 6].map((z) => shape(Y, { kind: 'fix' }, [], 1, { signal: z - drawCounts(seededRng(1)).signal, openness: -6 }).degrees.volunteers);
  assert.ok(more[0] <= more[1] && more[1] < more[2] && more[3] === 1);
  assert.strictEqual(shape(Y, bag).degrees.volunteers, 0);
});

test('each answer writes back on her sheet, and the next starts from it', () => {
  const moves = [bag, paraphrase('bag'), { kind: 'wrong-fix' }, ask('when', 'expand', 'morning')];
  const call = shapeCall({ sheet: Y, moves, rng: seededRng(8) });
  // The sheet she started with is untouched, and each answer hands on a new one.
  assert.strictEqual(Y.now, undefined);
  for (const { shape: s } of call) assert.ok(Object.isFrozen(s.sheet) && s.sheet.now);
  const now = call.map((h) => h.shape.sheet.now);
  // What she has just said she holds at full strength.
  for (const g of call[0].shape.gives.filter((x) => !x.startsWith('her-'))) assert.strictEqual(now[0].said[g], 1);
  // The paraphrase wore her tolerance, and the miss strained and soured her.
  assert.ok(now[1].tolerance < now[0].tolerance);
  assert.ok(now[2].strain > 0 && now[2].sour > now[1].sour);
  // Playing an answer by hand from her sheet as left gives the same answer the call did.
  const fixed = shapeCall({ sheet: Y, moves, rng: () => 0.5 });
  const again = shapeAnswer({ sheet: fixed[2].shape.sheet, move: moves[3], history: fixed.slice(0, 3), rng: () => 0.5 });
  assert.deepStrictEqual(again, fixed[3].shape);
});

test('having said her baggage eases it: once out, it comes out less for the rest of the call', () => {
  const morning = ask('when', 'expand', 'morning');
  let calls = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const call = shapeCall({ sheet: Y, moves: [morning, morning], rng: seededRng(seed) });
    const [first, second] = call.map((h) => h.shape);
    if (!first.labels.baggage) continue;
    calls++;
    assert.ok(first.sheet.now.pressure < 1);
    // The same draw again, from a fresh sheet and from the eased one.
    const fresh = shapeAnswer({ sheet: Y, move: morning, history: call.slice(0, 1), rng: seededRng(seed + 9000) });
    const eased = shapeAnswer({ sheet: first.sheet, move: morning, history: call.slice(0, 1), rng: seededRng(seed + 9000) });
    assert.ok(eased.degrees.baggage < fresh.degrees.baggage);
    assert.ok(second.degrees.baggage <= 1);
  }
  assert.ok(calls > 100);
});

test('over many calls her baggage comes out once or twice, not on a loop', () => {
  const moves = [
    ask('what', 'expand', 'working'), ask('who', 'expand', 'pell'), ask('when', 'expand', 'morning'), bag,
    ask('why', 'expand', 'pell'), ask('when', 'contract', 'morning'), ask('what', 'contract', 'draught'), ask('who', 'contract', 'pell'), { kind: 'fix' },
  ];
  let three = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const times = shapeCall({ sheet: Y, moves, rng: seededRng(seed) }).filter((h) => h.shape.labels.baggage).length;
    if (times >= 3) three++;
  }
  assert.ok(three / 300 < 0.15, `three or more in ${three} of 300`);
});

test('what she has already said comes after what she has not, except what the question is aimed at', () => {
  const said = { 'cannot-transfer': 1, 'pell-shut-out': 1 };
  const sheet = { ...Y, now: { ...freshNow(Y), said } };
  for (let seed = 1; seed <= 100; seed++) {
    const s = shape(sheet, ask('what', 'contract', 'working'), [], seed, { volume: 3, signal: 1 });
    if (!s.gives.length) continue;
    // Aimed at what is not working, she still says she cannot transfer it first.
    assert.strictEqual(s.gives[0], 'cannot-transfer');
    // Then new things before Pell, which she has said already.
    const at = s.gives.indexOf('pell-shut-out');
    if (at !== -1) assert.strictEqual(at, s.gives.length - 1);
  }
});

test('nothing on her sheet is perfect recall: what she said fades faster than what she felt', () => {
  // She has just said Pell is shut out; then a miss, then fixes she adds nothing to.
  const start = { ...Y, now: { ...freshNow(Y), said: { 'pell-shut-out': 1 } } };
  const moves = [{ kind: 'wrong-fix' }, ...Array(6).fill({ kind: 'fix' })];
  const call = shapeCall({ sheet: start, moves, rng: () => 0.5 });
  const now = [start.now, ...call.map((h) => h.shape.sheet.now)];
  for (const { shape: sh } of call) assert.deepStrictEqual(sh.gives, []);
  // Pell, not said again, fades at the rate for her own words.
  for (let i = 1; i < now.length; i++) assert.ok(Math.abs(now[i].said['pell-shut-out'] - RETAIN.ownWords ** i) < 1e-9);
  // The strain of the miss fades too, but at the slower rate for what she felt.
  const strain = now.slice(1).map((n) => n.strain);
  assert.ok(strain[0] > 0);
  assert.ok(falling(strain) && strain[strain.length - 1] > 0);
  const heldWords = now[now.length - 1].said['pell-shut-out'];
  const heldFeeling = strain[strain.length - 1] / strain[0];
  assert.ok(heldFeeling > heldWords, `feeling ${heldFeeling}, words ${heldWords}`);
  // Her baggage pressure comes back toward full when she has not said it for a while.
  const morning = ask('when', 'expand', 'morning');
  const eased = { ...Y, now: { ...freshNow(Y), pressure: 0.2 } };
  const later = shapeCall({ sheet: eased, moves: Array(5).fill(name), rng: () => 0.5 }).map((h) => h.shape.sheet.now.pressure);
  assert.ok(rising(later) && later[4] < 1);
  assert.ok(shape(eased, morning).degrees.baggage < shape(Y, morning).degrees.baggage);
});

test('something she said long enough ago can come round again, ahead of what she has just said', () => {
  const sheet = { ...Y, now: { ...freshNow(Y), said: { 'pell-shut-out': 0.2, 'leaves-in-the-morning': 1, 'never-a-problem-before': 1, 'at-it-since-last-night': 1 } } };
  for (let seed = 1; seed <= 100; seed++) {
    const s = shape(sheet, ask('what', 'contract', 'transfer'), [], seed, { volume: 3, signal: 1 });
    if (s.gives.length < 2) continue;
    assert.strictEqual(s.gives[0], 'cannot-transfer');
    assert.strictEqual(s.gives[1], 'pell-shut-out');
  }
});

test('the suit decides which answer she reaches for first: who can get into the bag is Pell', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const who = shape(Y, ask('who', 'verify', 'bag'), [], seed, { signal: 1 });
    const what = shape(Y, ask('what', 'contract', 'bag'), [], seed, { signal: 1 });
    const when = shape(Y, ask('when', 'expand', 'bag'), [], seed, { signal: 1 });
    if (who.gives.length) assert.strictEqual(who.gives[0], 'pell-shut-out');
    if (what.gives.length) assert.strictEqual(what.gives[0], 'cannot-transfer');
    if (when.gives.length) assert.strictEqual(when.gives[0], 'never-a-problem-before');
  }
  // A suit nothing near the subject answers falls back to the nearest thing.
  const why = shape(Y, ask('why', 'expand', 'bag'), [], 3, { signal: 1 });
  if (why.gives.length) assert.strictEqual(why.gives[0], 'cannot-transfer');
});

test('asked again, what she makes of it depends on whether she answered, how long ago, and what it is about', () => {
  const again = ask('what', 'contract', 'bag');
  const full = past(bag, ['cannot-transfer', 'pell-shut-out']);
  const none = past(bag, []);
  const filler = past(ask('what', 'contract', 'draught'));
  // Answered in full, straight before: a repeat, not pressing.
  const r1 = shape(X, again, [full]).degrees;
  assert.ok(near(r1.likeness, 1) && r1.pressed === 0);
  // Gave nothing: the agent is pressing, not repeating.
  const r2 = shape(X, again, [none]).degrees;
  assert.ok(r2.likeness === 0 && near(r2.pressed, 0.8));
  assert.strictEqual(shape(X, again, [none]).labels.repeat, null);
  assert.strictEqual(shape(X, again, [none]).labels.pressed, 'feels badgered');
  assert.strictEqual(shape(Y, again, [none]).labels.pressed, 'feels pressed');
  assert.strictEqual(shape({ ...Y, repetition: 'high' }, again, [none]).labels.pressed, null);
  // Half answered: a little of each.
  const r3 = shape(X, again, [past(bag, ['cannot-transfer'])]).degrees;
  assert.ok(near(r3.likeness, 0.5) && near(r3.pressed, 0.4));
  // Further back, it fades at the rate for exactly what she was asked.
  const r4 = shape(X, again, [full, filler, filler]).degrees;
  assert.ok(near(r4.likeness, 0.25));
  assert.ok(shape(X, again, [full, filler, filler]).degrees.repeat < r1.likeness * 0.8);
  // Coming back to her worry after it came out is heard, not repeated.
  const morning = ask('when', 'expand', 'morning');
  const worry = { move: morning, shape: { gives: ['leaves-in-the-morning', 'pell-shut-out'], degrees: { likeness: 0, baggage: 0.9 } } };
  // Back to the morning, where it came out: heard. Off to the draught: not.
  const r5 = shape(Y, ask('why', 'expand', 'morning'), [worry]);
  assert.ok(near(r5.degrees.heard, 0.9));
  assert.strictEqual(r5.labels.heard, 'feels heard');
  assert.strictEqual(shape(Y, ask('what', 'contract', 'draught'), [worry]).degrees.heard, 0);
  // Only when it plainly came out: a flicker of it earns nothing.
  const flicker = { move: morning, shape: { gives: ['leaves-in-the-morning'], degrees: { likeness: 0, baggage: 0.3 } } };
  assert.strictEqual(shape(Y, ask('why', 'expand', 'morning'), [flicker]).degrees.heard, 0);
  const r6 = shape(Y, morning, [worry]).degrees;
  assert.ok(r6.likeness < 0.15, `${r6.likeness}`);
  // For X the morning is where it came out too, so it is heard the same way.
  assert.ok(near(shape(X, morning, [worry]).degrees.heard, 0.9));
  // Asked who she is again after she left the question: pressing, not repeating.
  const name = ask('who', 'expand', 'name');
  const r7 = shape(Y, name, [past(name, ['cannot-transfer'])]).degrees;
  assert.ok(r7.likeness === 0 && r7.pressed > 0);
  const r8 = shape(Y, name, [past(name, ['her-name'])]).degrees;
  assert.ok(r8.likeness > 0 && r8.pressed === 0);
});

test('she hedges about why, or when she has nothing to go on: never what she has seen, and Sella never which name', () => {
  for (let seed = 1; seed <= 300; seed++) {
    for (const move of [ask('who', 'expand', 'name'), ask('who', 'contract', 'pell'), bag, ask('what', 'verify', 'changed'), { kind: 'fix' }]) {
      const s = shape(Y, move, [], seed, { certainty: -6 });
      const identity = s.gives.some((g) => g.startsWith('her-'));
      const facts = s.gives.length > 0;
      if (s.hedged) assert.ok(s.belief || identity || (s.asked && !facts), `${move.subject} hedged with ${s.gives}`);
      // Sella knows the account is the party's and she leads it: no hedging which name.
      if (identity) assert.strictEqual(s.hedged, false);
      // A customer unsure how the account is set up does.
      if (identity) assert.strictEqual(shape({ ...Y, unsureOfAccount: true }, move, [], seed, { certainty: -6 }).hedged, true);
      // What she has seen for herself, she does not hedge.
      if (move.subject === 'pell' && facts && !s.belief) assert.strictEqual(s.hedged, false);
    }
  }
  // Unsure, and asked whether anything changed: she hedges her belief.
  assert.strictEqual(shape(Y, ask('what', 'verify', 'changed'), [], 1, { certainty: -3 }).hedged, true);
});

test('how sure or exact she is needs something to be sure or exact about', () => {
  for (let seed = 1; seed <= 300; seed++) {
    for (const move of [bag, ask('when', 'expand', 'morning'), { kind: 'fix' }]) {
      const s = shape(Y, move, [], seed, { certainty: 6, accuracy: -6 });
      const something = s.gives.length > 0 || Boolean(s.belief);
      assert.strictEqual(s.flat, something);
      assert.strictEqual(s.misleading, something);
    }
  }
});

test('asked straight about something she knows, she gives at least that, however low her signal', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const s = shape(Y, ask('when', 'expand', 'morning'), [], seed, { signal: -6 });
    assert.ok(s.gives.includes('leaves-in-the-morning'), `${s.gives}`);
    assert.ok(s.gives.length <= 2);
    // A question about something she knows nothing of can still get nothing.
    const none = shape(Y, ask('what', 'verify', 'changed'), [], seed, { signal: -6 });
    assert.deepStrictEqual(none.gives, []);
  }
});

test('after a fix, what she comes back with starts from her own worry', () => {
  const after = (sheet) => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = shape(sheet, { kind: 'fix' }, [], seed, { signal: 3 });
      if (s.gives.length) return s.gives[0];
    }
    return null;
  };
  // Y worries about Pell going in the morning; X that nobody told her, nearest to what she tried.
  assert.strictEqual(after(Y), 'leaves-in-the-morning');
  assert.strictEqual(after(X), 'at-it-since-last-night');
});

test('two sheets differ only where the sheets differ', () => {
  // A plain question that sets nothing off: the same draw gives the same answer.
  for (let seed = 1; seed <= 100; seed++) {
    const x = shape(X, ask('what', 'contract', 'draught'), [], seed);
    const y = shape(Y, ask('what', 'contract', 'draught'), [], seed);
    assert.deepStrictEqual(x.counts, y.counts);
    assert.deepStrictEqual(x.gives, y.gives);
    if (x.labels.baggage) assert.notStrictEqual(x.labels.baggage, y.labels.baggage);
  }
  assert.notStrictEqual(shape(X, paraphrase('pell')).labels.repeat, shape(Y, paraphrase('pell')).labels.repeat);
});

test('shapeAnswer is pure and deterministic', () => {
  const move = Object.freeze({ ...bag });
  const history = Object.freeze([Object.freeze(past(Object.freeze(paraphrase('bag')), Object.freeze([]), 1))]);
  const before = JSON.stringify({ move, history, sheet: Y });
  const a = shape(Y, move, history, 21);
  assert.strictEqual(JSON.stringify({ move, history, sheet: Y }), before);
  assert.deepStrictEqual(a, shape(Y, move, history, 21));
  assert.notDeepStrictEqual(a.counts, shape(Y, move, history, 22).counts);
});
