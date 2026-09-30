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
      return hand.filter((c) => c.word === 'subscriptions').slice(0, 1);
    },
  };
  const r = playCall({ sheet: sheet(), agent, rng: seededRng(7) });
  const reads = r.log.filter((e) => e.result && String(e.result).includes('refills left'));
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

test('an unfound cause is held, not failed', () => {
  const agent = {
    knowsApothecaries: false,
    chooseTurn() { return { kind: 'inquiry', source: 'crm', mode: 'expand' }; },
    chooseDiscard() { return null; },
    choosePlays() { return []; },
  };
  const r = playCall({ sheet: sheet(), agent, rng: seededRng(2) });
  assert.strictEqual(r.ending, 'hold');
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
      if (r.ending === 'resolve') resolved += 1;
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

test('there are three outcomes and no fourth', () => {
  const seen = new Set();
  for (let s = 1; s <= 400; s++) {
    const rng = seededRng(s);
    const r = playCall({
      sheet: require('./customer').newSheet({ name: 'Sella Brandt' }, rng),
      agent: makeAgent({ name: 'a', competence: (s % 10) / 10 }),
      rng,
    });
    seen.add(r.ending);
  }
  assert.deepStrictEqual(Array.from(seen).sort(), ['hold', 'resolve', 'transfer']);
});

test('the open-slot cause draws a different act per call', () => {
  const lines = new Set();
  for (let s = 1; s <= 300; s++) {
    const rng = seededRng(s);
    const r = playCall({
      sheet: require('./customer').newSheet({ name: 'Sella Brandt' }, rng),
      agent: makeAgent({ name: 'a', competence: 0.9 }),
      rng,
    });
    if (r.cause !== 'did-something-she-didnt-think-mattered') continue;
    for (const e of r.log) {
      if (e.result === 'cause surfaced') lines.add(e.reply);
    }
  }
  assert.ok(lines.size > 1, `the open slot only ever said: ${Array.from(lines).join(' | ')}`);
});

test('she can reach for the door herself, and it lands as transfer or a callback', () => {
  let escalations = 0;
  for (let s = 1; s <= 400; s++) {
    const rng = seededRng(s);
    const r = playCall({
      sheet: require('./customer').newSheet({ name: 'Sella Brandt' }, rng),
      agent: makeAgent({ name: 'a', competence: 0.1 }),
      rng,
    });
    if (!r.ledger.escalated) continue;
    escalations += 1;
    assert.ok(r.ending === 'transfer' || (r.ending === 'hold' && r.ledger.callback));
  }
  assert.ok(escalations > 5, `only ${escalations} escalations in 400 poor calls`);
});

test('a find is a card in hand, so the hand shrinks rather than a turn being spent', () => {
  // Phil's middle ground: the fix is neither free nor a whole turn. It sits
  // in hand, and every candidate carried is one fewer fresh card dealt.
  let sawPairedFix = 0;
  let sawFixTurn = 0;
  for (let s = 1; s <= 300; s++) {
    const rng = seededRng(s);
    const r = playCall({
      sheet: require('./customer').newSheet({ name: 'Sella Brandt' }, rng),
      agent: makeAgent({ name: 'a', competence: 0.9 }),
      rng,
    });
    for (const e of r.log) {
      assert.notStrictEqual(e.kind, 'fix', 'the separate fix turn should be gone');
      if (e.fixGiven && e.played && e.played.length > 1) sawPairedFix += 1;
      if (e.fixGiven) sawFixTurn += 1;
    }
  }
  assert.ok(sawFixTurn > 20, `only ${sawFixTurn} fixes given in 300 calls`);
  assert.ok(sawPairedFix > 0, 'a fix was never paired with another card');
});
