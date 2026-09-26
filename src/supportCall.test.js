'use strict';

const test = require('node:test');
const assert = require('node:assert');
const S = require('./supportCall.js');

function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('every cause presents identically — the symptom never gives it away', () => {
  const openings = new Set();
  const rng = seededRng(1);
  for (let i = 0; i < 200; i++) openings.add(S.rollCall(rng).opening);
  assert.strictEqual(openings.size, 1,
    'one symptom, many causes — the opening must not vary with the cause');
});

test('a cause living in the PERSON leaves every record clean', () => {
  // THE test for this design. If a future edit "helpfully" makes the
  // records hint at a person-cause, the whole point collapses: the
  // player could find panic in a ledger.
  for (const cause of S.CAUSES.filter((c) => c.visibility === 'person')) {
    for (const target of S.RECORD_TARGETS) {
      const { carriesFault } = S.checkRecord({ cause }, target);
      assert.strictEqual(carriesFault, false,
        `${cause.id}: record "${target}" must not carry the fault`);
    }
  }
});

test('a cause living in the RECORDS is carried by exactly one of them', () => {
  for (const cause of S.CAUSES.filter((c) => c.visibility === 'record')) {
    const faulty = S.RECORD_TARGETS.filter((t) => S.checkRecord({ cause }, t).carriesFault);
    assert.strictEqual(faulty.length, 1,
      `${cause.id}: expected one faulty record, got [${faulty}]`);
  }
});

test('every record answers, even when it is not the problem', () => {
  // Ruling something out is progress. A lookup that returns nothing
  // would make elimination impossible, which is the only method
  // available on an unfamiliar cause.
  for (const cause of S.CAUSES) {
    for (const target of S.RECORD_TARGETS) {
      const { said } = S.checkRecord({ cause }, target);
      assert.ok(said && said.length > 0, `${cause.id}/${target} said nothing`);
    }
  }
});

test('acting is the resolution — and only the right action works', () => {
  for (const cause of S.CAUSES) {
    for (const fix of S.FIXES) {
      const r = S.act({ cause }, fix.id);
      assert.strictEqual(r.worked, cause.fixedBy === fix.id);
      assert.ok(r.said && r.said.length > 0, `${cause.id}/${fix.id} said nothing`);
    }
  }
});

test('a wrong action costs time and never punishes with a number', () => {
  const call = { cause: S.CAUSES.find((c) => c.id === 'too-frightened') };
  const r = S.act(call, 'registerProduct');
  assert.strictEqual(r.worked, false);
  assert.ok(r.cost > 0, 'a misfire should cost time');
  assert.ok(!('penalty' in r) && !('score' in r), 'no score — locked in LORE');
});

test('no diagnosis step exists anywhere in the module', () => {
  // LORE locks "the game does not grade the diagnosis — others do", and
  // the previous build broke it by scoring which of four labels the
  // player picked. This fails if that ever comes back.
  const exported = Object.keys(S).join(' ').toLowerCase();
  for (const banned of ['diagnos', 'correctanswer', 'grade', 'score']) {
    assert.ok(!exported.includes(banned), `"${banned}" is back in the API`);
  }
  for (const cause of S.CAUSES) {
    assert.ok(!('diagnoses' in cause), `${cause.id} carries a diagnosis menu`);
  }
});

test('the cause list is open — adding one costs an entry and no code', () => {
  const invented = {
    id: 'something-nobody-has-seen',
    visibility: 'person',
    fixedBy: 'walkThrough',
    records: Object.fromEntries(S.RECORD_TARGETS.map((t) => [t, 'Nothing irregular.'])),
    person: { askDoing: 'I could not tell you.' },
    onFix: 'It works, eventually, and neither of you is sure why.',
  };
  // Every function must handle a cause it has never met.
  for (const t of S.RECORD_TARGETS) {
    assert.doesNotThrow(() => S.checkRecord({ cause: invented }, t));
  }
  assert.strictEqual(S.act({ cause: invented }, 'walkThrough').worked, true);
  assert.strictEqual(S.act({ cause: invented }, 'steady').worked, false);
});

test('every cause names a real action, and every action can misfire', () => {
  const ids = S.FIXES.map((f) => f.id);
  for (const cause of S.CAUSES) {
    assert.ok(ids.includes(cause.fixedBy), `${cause.id} points at a non-existent action`);
  }
  for (const id of ids) {
    assert.ok(S.MISFIRE[id], `"${id}" has no misfire line`);
  }
});

test('unknown targets throw rather than silently returning nothing', () => {
  const call = { cause: S.CAUSES[0] };
  assert.throws(() => S.checkRecord(call, 'shoeSize'));
  assert.throws(() => S.askPerson(call, 'favouriteColour'));
  assert.throws(() => S.act(call, 'wishItBetter'));
});

test('nothing mutates the call it is given', () => {
  const call = S.rollCall(seededRng(9));
  const frozen = JSON.stringify(call);
  S.checkRecord(call, 'subscription');
  S.askPerson(call, 'askDoing');
  S.act(call, 'steady');
  assert.strictEqual(JSON.stringify(call), frozen);
});
