'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { playCall, briefStrength, briefName, TURNS } = require('./engine');
const { makeAgent } = require('./agents');
const { newSheet } = require('./customer');
const { seededRng } = require('./rng');

const sheet = () => newSheet({ name: 'Sella Brandt', tier: 'Silver' });

test('a call never runs past nine turns', () => {
  for (let s = 1; s <= 50; s++) {
    const r = playCall({ sheet: sheet(), agent: makeAgent({ name: 'a', competence: 0.5 }), rng: seededRng(s) });
    assert.ok(r.turnsUsed <= TURNS, `used ${r.turnsUsed}`);
  }
});

test('the agent is never handed the cause', () => {
  // The whole point of the engine: if the policy could see the answer,
  // every transcript would be a success story.
  let seen = null;
  const spy = {
    knowsApothecaries: true,
    chooseTurn(view) { seen = view; return { kind: 'inquiry', source: 'customer', mode: 'expand' }; },
    chooseDiscard() { return null; },
    choosePlays(hand) { return [hand[0]]; },
  };
  playCall({ sheet: sheet(), agent: spy, rng: seededRng(11) });
  assert.ok(seen);
  const json = JSON.stringify(seen);
  for (const id of ['stopper-left-out', 'charm-interference', 'drank-in-the-night', 'rinsed-it-out']) {
    if (seen.revealed === id) continue;
    assert.ok(!json.includes(id), `view leaked ${id}`);
  }
});

test('the brief is built from what she has confirmed, not what was read', () => {
  // Reading her record tells the coworker nothing they need. An agent
  // who identifies her and holds immediately gets the thin brief, which
  // is the bottom rung the ladder needs in order to exist.
  assert.strictEqual(briefName(briefStrength({ confirmed: 0, facts: 9 })), 'oversimplified');
  assert.strictEqual(briefName(briefStrength({ confirmed: 1 })), 'generalized');
  assert.strictEqual(briefName(briefStrength({ confirmed: 3 })), 'organized');
});

test('a full brief seeds more lines of inquiry than a thin one', () => {
  const briefs = [];
  for (let s = 1; s <= 60; s++) {
    const r = playCall({
      sheet: sheet(),
      agent: makeAgent({ name: 'a', competence: 0.9 }),
      rng: seededRng(s),
      coworkerAvailable: true,
    });
    for (const e of r.log) {
      if (e.kind === 'hold' && e.seeded) briefs.push(e.seeded.length);
    }
  }
  assert.ok(briefs.length > 5, 'expected holds across 60 calls');
  assert.ok(Math.max(...briefs) === 5);
  assert.ok(Math.min(...briefs) === 1, 'the thin brief must be reachable');
});

test('the same CRM field does not pay twice', () => {
  const agent = {
    knowsApothecaries: true,
    chooseTurn() { return { kind: 'inquiry', source: 'crm', mode: 'expand' }; },
    chooseDiscard() { return null; },
    choosePlays(hand, view) {
      if (!view.identified) return hand.filter((c) => c.word === 'name').slice(0, 1);
      return hand.filter((c) => c.word === 'subscription').slice(0, 1);
    },
  };
  const r = playCall({ sheet: sheet(), agent, rng: seededRng(7) });
  const reads = r.log.filter((e) => e.result && String(e.result).includes('subscription active'));
  assert.strictEqual(reads.length, 1, 'a record read twice should be a wasted turn');
  assert.ok(r.log.some((e) => e.result === 'wasted — already read'));
});

test('when nobody knows flasks, the hold returns nothing', () => {
  const agent = makeAgent({ name: 'a', competence: 0.8 });
  const r = playCall({ sheet: sheet(), agent, rng: seededRng(5), coworkerAvailable: false });
  const held = r.log.filter((e) => e.kind === 'hold');
  for (const h of held) {
    assert.ok(h.result === 'nobody who knows flasks is free' || h.result === 'refused');
  }
});

test('an unfound cause ends as a case, not a failure state', () => {
  const agent = {
    knowsApothecaries: false,
    chooseTurn() { return { kind: 'inquiry', source: 'crm', mode: 'expand' }; },
    chooseDiscard() { return null; },
    choosePlays() { return []; },
  };
  const r = playCall({ sheet: sheet(), agent, rng: seededRng(2) });
  assert.strictEqual(r.ending, 'case');
});

test('skill moves outcomes', () => {
  const run = (competence) => {
    let resolved = 0;
    for (let s = 1; s <= 120; s++) {
      const r = playCall({
        sheet: sheet(),
        agent: makeAgent({ name: 'a', competence }),
        rng: seededRng(s),
      });
      if (r.ending === 'resolved') resolved += 1;
    }
    return resolved;
  };
  const poor = run(0.15);
  const good = run(0.95);
  assert.ok(good > poor * 1.5, `poor ${poor}, good ${good}`);
});

test('a call is reproducible from its seed', () => {
  const a = playCall({ sheet: sheet(), agent: makeAgent({ name: 'a', competence: 0.6 }), rng: seededRng(21) });
  const b = playCall({ sheet: sheet(), agent: makeAgent({ name: 'a', competence: 0.6 }), rng: seededRng(21) });
  assert.deepStrictEqual(a.log, b.log);
  assert.strictEqual(a.cause, b.cause);
});
