'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { playOrderCall, TURNS } = require('./orderCall');
const { makeOrderAgent } = require('./orderAgents');
const { newSheet } = require('./customer');
const { seededRng } = require('./rng');
const O = require('./order');

const sheet = (over = {}) => Object.assign(newSheet({ name: 'Sella Brandt' }, seededRng(1)), over);

// Criterion 1 — no hidden cause, no reach-to-a-fix.
test('there is nothing hidden to find', () => {
  const rng = seededRng(2);
  const r = playOrderCall({ sheet: sheet(), agent: makeOrderAgent({ name: 'a', competence: 0.8 }), rng });
  assert.ok(!('cause' in r), 'an ordering call has no cause');
  assert.ok(!r.log.some((e) => e.result === 'cause surfaced'));
  assert.ok(!r.log.some((e) => e.fixGiven));
});

// Criterion 2 — which side fills a field is enforced.
test('she cannot tell you what POOF costs, and the record cannot tell you what size she wants', () => {
  // Aim at a record field she might plausibly be asked about — the deposit —
  // rather than hoping it turns up in a hand.
  const askHerEverything = {
    chooseTurn() { return { kind: 'inquiry', source: 'customer', mode: 'expand' }; },
    chooseDiscard() { return null; },
    choosePlays(hand) {
      const dep = hand.find((c) => c.word === 'deposit' || c.word === 'empties');
      return dep ? [dep] : hand.slice(0, 2);
    },
  };
  let sawHerDecline = false;
  for (let s = 1; s <= 30 && !sawHerDecline; s++) {
    const r = playOrderCall({ sheet: sheet(), agent: askHerEverything, rng: seededRng(s) });
    assert.ok(!r.ledger.filled.includes('price'), 'price is the record’s to answer');
    if (r.log.some((e) => String(e.reply || '').includes('your end'))) sawHerDecline = true;
  }
  assert.ok(sawHerDecline, 'asking her a record question should get her saying so');

  const readEverything = {
    chooseTurn() { return { kind: 'inquiry', source: 'crm', mode: 'expand' }; },
    chooseDiscard() { return null; },
    choosePlays(hand) { return hand.slice(0, 2); },
  };
  const r2 = playOrderCall({ sheet: sheet(), agent: readEverything, rng: seededRng(4) });
  assert.ok(!r2.ledger.filled.includes('size'), 'the record does not know what size she wants');
});

// Criterion 3 — the five options, and the Bag she does not have.
test('the five options exist and a Bag option is worth nothing to someone with no Bag', () => {
  assert.strictEqual(O.OPTIONS.length, 5);
  assert.strictEqual(O.OPTIONS.filter((o) => o.needsBag).length, 2);

  const offerBag = {
    turn: 0,
    chooseTurn() {
      this.turn += 1;
      if (this.turn === 1) return { kind: 'present' };
      return { kind: 'inquiry', source: 'customer', mode: 'expand' };
    },
    chooseDiscard() { return null; },
    choosePlays(hand) {
      const bag = hand.find((c) => c.word === 'bag');
      return bag ? [bag] : hand.slice(0, 1);
    },
  };
  const r = playOrderCall({ sheet: sheet(), agent: offerBag, rng: seededRng(5), hasBag: false });
  const bagTurn = r.log.find((e) => (e.played || []).some((p) => String(p).startsWith('bag')));
  if (bagTurn) {
    assert.match(String(bagTurn.reply), /not got a bag/);
    assert.strictEqual(bagTurn.result, 'nothing settled');
  }
});

// Criterion 4 — the order cannot be placed early.
test('placing it is refused while anything required is unsettled', () => {
  const placeAtOnce = {
    chooseTurn() { return { kind: 'place' }; },
    chooseDiscard() { return null; },
    choosePlays() { return []; },
  };
  const r = playOrderCall({ sheet: sheet(), agent: placeAtOnce, rng: seededRng(6) });
  assert.strictEqual(r.placed, false);
  assert.match(String(r.log[1].result), /still missing/);
});

// Criterion 5 — three outcomes.
test('three outcomes and no fourth', () => {
  const seen = new Set();
  for (let s = 1; s <= 200; s++) {
    const rng = seededRng(s);
    const r = playOrderCall({
      sheet: sheet(),
      agent: makeOrderAgent({ name: 'a', competence: (s % 10) / 10 }),
      rng,
    });
    seen.add(r.ending);
  }
  for (const e of seen) assert.ok(['resolve', 'hold', 'transfer'].includes(e), `unexpected ending ${e}`);
});

// Criterion 6 — the warnings block nothing and are written down.
test('a warning blocks nothing and lands on her sheet', () => {
  const warnThenPlace = {
    told: false,
    chooseTurn(view) {
      if (!view.missing.length) {
        if (!this.told) { this.told = true; return { kind: 'warn', id: 'outcome-varies' }; }
        return { kind: 'place' };
      }
      if (view.missing.includes('option') && !view.optionsPresented) return { kind: 'present' };
      const needsRecord = view.missing.some((m) => ['price', 'deposit'].includes(m));
      return { kind: 'inquiry', source: needsRecord ? 'crm' : 'customer', mode: 'expand' };
    },
    chooseDiscard() { return null; },
    choosePlays(hand, view) {
      const wanted = hand.filter((c) => O.REQUIRED.some((f) => !view.filled.includes(f.id) && f.reach.includes(c.word)));
      return (wanted.length ? wanted : hand).slice(0, 2);
    },
  };
  let found = false;
  for (let s = 1; s <= 40 && !found; s++) {
    const r = playOrderCall({ sheet: sheet(), agent: warnThenPlace, rng: seededRng(s) });
    if (!r.warnings.includes('outcome-varies')) continue;
    found = true;
    assert.ok(r.sheet.knows.some((k) => String(k).includes('outcome-varies')),
      'what she was told should be on her sheet');
  }
  assert.ok(found, 'no run in 40 managed to warn her');
});

// Criterion 8 — the budget and the card economy.
test('nine plays, the opening free, and the usual card economy', () => {
  const rng = seededRng(9);
  const r = playOrderCall({ sheet: sheet(), agent: makeOrderAgent({ name: 'a', competence: 0.6 }), rng });
  assert.ok(r.turnsUsed <= TURNS, `used ${r.turnsUsed}`);
  assert.strictEqual(r.log[0].kind, 'opening');
  assert.strictEqual(r.log[0].turn, 0, 'the opening is not one of the nine');
  for (const e of r.log) {
    if (e.played) assert.ok(e.played.length <= 2, 'at most two cards a turn');
  }
});

test('the aside is available and costs her a little', () => {
  const asideOnce = {
    turn: 0,
    chooseTurn() { this.turn += 1; return this.turn === 1 ? { kind: 'aside' } : { kind: 'inquiry', source: 'customer', mode: 'expand' }; },
    chooseDiscard() { return null; },
    choosePlays(hand) { return hand.slice(0, 1); },
  };
  const r = playOrderCall({ sheet: sheet(), agent: asideOnce, rng: seededRng(11) });
  assert.strictEqual(r.ledger.asides, 1);
  assert.ok(r.mood < r.ledger.moodStart);
});

test('skill settles more orders than flailing does', () => {
  const run = (competence) => {
    let placed = 0;
    for (let s = 1; s <= 300; s++) {
      const rng = seededRng(s);
      const r = playOrderCall({ sheet: sheet(), agent: makeOrderAgent({ name: 'a', competence }), rng });
      if (r.placed) placed += 1;
    }
    return placed;
  };
  const poor = run(0.2);
  const good = run(0.8);
  assert.ok(good > poor * 2, `poor ${poor}, good ${good}`);
});

// Criterion 7 — what she was told is readable on the next call.
test('a second call opens on what she was told in the first', () => {
  const thorough = {
    told: [],
    chooseTurn(view) {
      if (!view.missing.length) {
        const untold = O.WARNINGS.find((w) => !view.warningsGiven.includes(w.id));
        if (untold && view.turnsLeft > 1) { this.told.push(untold.id); return { kind: 'warn', id: untold.id }; }
        return { kind: 'place' };
      }
      if (view.missing.includes('option') && !view.optionsPresented) return { kind: 'present' };
      const needsRecord = view.missing.some((m) => ['price', 'deposit'].includes(m));
      return { kind: 'inquiry', source: needsRecord ? 'crm' : 'customer', mode: 'expand' };
    },
    chooseDiscard() { return null; },
    choosePlays(hand, view) {
      const wanted = hand.filter((c) => O.REQUIRED
        .some((f) => !view.filled.includes(f.id) && f.reach.includes(c.word)));
      return (wanted.length ? wanted : hand).slice(0, 2);
    },
  };
  let carried = null;
  for (let s = 1; s <= 60 && !carried; s++) {
    const r = playOrderCall({ sheet: sheet(), agent: thorough, rng: seededRng(s) });
    if (r.warnings.length) carried = r.sheet;
  }
  assert.ok(carried, 'no run in 60 warned her about anything');

  // The next call starts from that sheet, and the agent can see it.
  const second = playOrderCall({
    sheet: carried,
    agent: makeOrderAgent({ name: 'a', competence: 0.8 }),
    rng: seededRng(99),
  });
  assert.ok(second.sheet.knows.length >= carried.knows.length,
    'what she knows should not be forgotten between calls');
  assert.ok(carried.knows.some((k) => /not-a-refill|outcome-varies|deposit-return/.test(String(k))),
    `expected a warning on the sheet, got ${JSON.stringify(carried.knows)}`);
});
