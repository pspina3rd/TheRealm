'use strict';

const test = require('node:test');
const assert = require('node:assert');
const I = require('./intake.js');

/** Same seeded PRNG pattern the existing suite uses, for determinism. */
function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GOODS = { kind: 'healing potions', size: 'small', unit: 'crate' };
const ctx = (hasReceipt) => ({ hasReceipt, today: 40, goods: GOODS, quantity: 40 });

// ---------------------------------------------------------------------
// Memory is unreliable by TYPE
// ---------------------------------------------------------------------

test('nobody recalls a reference number without the paper', () => {
  const rng = seededRng(11);
  let held = 0;
  for (let i = 0; i < 2000; i++) {
    if (I.degrade('orderNumber', 'SO-1234', ctx(false), rng).precision !== 'absent') held++;
  }
  // This is the failure the whole model exists to remove: a caller
  // reciting "SO-4796" from memory is the omniscience fantasy.
  assert.ok(held / 2000 < 0.12, `expected <12% recall, got ${(held / 2000 * 100).toFixed(1)}%`);
});

test('the receipt converts exactly the fields recall is worst at', () => {
  const rng = seededRng(12);
  for (const field of ['orderNumber', 'trackingNumber', 'bookedOn', 'expectedArrival']) {
    for (let i = 0; i < 50; i++) {
      const imp = I.degrade(field, field === 'bookedOn' || field === 'expectedArrival' ? 30 : 'SO-1234', ctx(true), rng);
      assert.strictEqual(imp.precision, 'exact', `${field} should be exact when read off paper`);
      assert.strictEqual(imp.fromPaper, true);
    }
  }
});

test('gist survives where detail does not — the two halves do opposite jobs', () => {
  const rng = seededRng(13);
  let gistRight = 0; let numberHeld = 0;
  for (let i = 0; i < 2000; i++) {
    if (I.degrade('contents', GOODS, ctx(false), rng).value === 'healing potions') gistRight++;
    if (I.degrade('trackingNumber', 'TK-500000', ctx(false), rng).precision !== 'absent') numberHeld++;
  }
  assert.strictEqual(gistRight, 2000, 'gist should always carry the right kind of thing');
  assert.ok(numberHeld / 2000 < 0.12);
  // The asymmetry IS the design: you cannot search on what they
  // remember, but you can read back and let them recognise it.
  assert.ok(gistRight / 2000 > (numberHeld / 2000) * 8);
});

test('a misremembered promise runs early, never late', () => {
  const rng = seededRng(14);
  let misremembered = 0;
  for (let i = 0; i < 3000; i++) {
    const imp = I.degrade('expectedArrival', 30, ctx(false), rng);
    if (imp.misremembered) {
      misremembered++;
      assert.ok(imp.value < 30, 'a misremembered promise should be more favourable, not less');
      assert.strictEqual(imp.certain, true, 'they are certain — that is why it is not a lie');
    }
  }
  // ~10% verbatim recall means the great majority are misremembered.
  assert.ok(misremembered / 3000 > 0.8, `expected most promises misremembered, got ${misremembered}`);
});

// ---------------------------------------------------------------------
// Search — several sufficient sets, never a gate
// ---------------------------------------------------------------------

test('a tracking number finds one item', () => {
  const rng = seededRng(21);
  const world = I.rollWorld({ account: 'AC-500', today: 40, otherOrders: 10, rng });
  const all = world.orders.flatMap((o) => o.items);
  const one = I.search(world, { trackingNumber: all[0].trackingNumber });
  assert.strictEqual(one.status, 'one');
});

test('THE constraint: what the caller calls it cannot be searched on at all', () => {
  const rng = seededRng(24);
  const world = I.rollWorld({ account: 'AC-500', today: 40, otherOrders: 10, rng });
  const total = world.orders.flatMap((o) => o.items).length;

  // TLC never knows what is inside. A caller leads with "salt fish" and
  // that word appears on no record anywhere, so it narrows nothing.
  const bare = I.search(world, {});
  const withContents = I.search(world, { contents: 'salt fish', goods: 'salt fish' });
  assert.strictEqual(withContents.items.length, total);
  assert.strictEqual(withContents.items.length, bare.items.length);

  // And no record carries a contents field to match against.
  for (const item of bare.items) {
    assert.ok(!('goods' in item), 'a record must not carry contents');
    assert.ok(!('contents' in item), 'a record must not carry contents');
  }
});

test('a readback offers the shape of a shipment, never its contents', () => {
  const rng = seededRng(25);
  const order = I.rollOrder({ account: 'AC-500', today: 40, rng });
  const item = order.items[0];
  const line = I.describeRecord(item);
  assert.ok(line.includes(String(item.packageCount)), 'count is sayable');
  assert.ok(line.includes(item.declaredClass), 'the declared class is sayable');
  assert.ok(line.includes(item.destination), 'the destination is sayable');
  assert.ok(!line.includes(item.trueContents.kind),
    `a readback must never name the contents; got: ${line}`);
});

test('searching on a garbled number returns somebody else, or nothing — never an error', () => {
  const rng = seededRng(22);
  const world = I.rollWorld({ account: 'AC-500', today: 40, otherOrders: 20, rng });
  const res = I.search(world, { orderNumber: 'SO-0000' });
  assert.strictEqual(res.status, 'nothing');
  assert.deepStrictEqual(res.items, []);
});

test('an order number does not resolve a multi-item order — which is the honest ambiguity', () => {
  const rng = seededRng(23);
  let sawMulti = false;
  for (let i = 0; i < 60 && !sawMulti; i++) {
    const order = I.rollOrder({ account: 'AC-500', today: 40, rng });
    if (order.items.length > 1) {
      sawMulti = true;
      const world = { orders: [order], today: 40 };
      const res = I.search(world, { orderNumber: order.orderNumber });
      assert.strictEqual(res.status, 'several',
        'one order, many items: "where is my order" cannot resolve to one thing');
    }
  }
  assert.ok(sawMulti, 'expected at least one multi-item order in 60 rolls');
});

// ---------------------------------------------------------------------
// The gist check — recognition catching what recall could not supply
// ---------------------------------------------------------------------

test('their gist catches the wrong record', () => {
  const rng = seededRng(31);
  const order = I.rollOrder({ account: 'AC-500', today: 40, rng });
  const caller = I.rollCaller({ order, item: order.items[0], today: 40, hasReceipt: false, rng });
  const wrong = {
    ...order.items[0],
    destination: 'Nowhere Cross',
    counterparty: caller.picture.counterparty.value ? 'Somebody Else' : order.items[0].counterparty,
    trackingNumber: 'TK-999999',
  };
  const check = I.gistCheck(wrong, caller);
  assert.strictEqual(check.fits, false);
  // They catch it on the SHAPE -- who sent it, where it was going --
  // because we never said any contents for them to check against.
  assert.match(check.objection, /Mine came from|Mine was for/);
});

test('same sender, same place, different parcel gets through — nobody notices', () => {
  const rng = seededRng(32);
  const order = I.rollOrder({ account: 'AC-500', today: 40, rng });
  const item = order.items[0];
  const caller = I.rollCaller({ order, item, today: 40, hasReceipt: false, rng });
  caller.meansWholeOrder = false;
  const sibling = { ...item, trackingNumber: 'TK-000001', packageCount: item.packageCount + 5 };
  const check = I.gistCheck(sibling, caller);
  // This is the failure Phil said is possible but self-limiting: it
  // survives the gist check precisely because the gist IS right.
  assert.strictEqual(check.fits, true);
  assert.strictEqual(check.silentlyWrong, true);
});

// ---------------------------------------------------------------------
// The ward signature identifies a line, not a person
// ---------------------------------------------------------------------

test('a ward signature can be confidently wrong, not merely absent', () => {
  const rng = seededRng(41);
  const seen = new Set();
  for (let i = 0; i < 3000; i++) {
    const w = I.rollWardSignature('AC-500', rng);
    if (w.match === 'account' && w.trustworthy) seen.add('right');
    if (w.match === 'account' && !w.trustworthy) seen.add('shared-line');
    if (w.match === 'node') seen.add('node');
    if (w.match === 'none') seen.add('none');
  }
  // "unmatched" was the old binary and it is the omniscience fantasy one
  // layer down. The interesting case is a confident match to the wrong
  // party, which the caller will never think to correct.
  assert.ok(seen.has('shared-line'), 'a shared line must be able to resolve to the wrong account');
  assert.ok(seen.has('node'), 'a caller ringing from a Node Partner must be representable');
  assert.strictEqual(seen.size, 4);
});

// ---------------------------------------------------------------------
// Purity — the convention the rest of the codebase holds to
// ---------------------------------------------------------------------

test('degrade does not mutate what it is given', () => {
  const rng = seededRng(51);
  const goods = { kind: 'lamp oil', size: null, unit: 'barrel' };
  const frozen = JSON.stringify(goods);
  I.degrade('contents', goods, ctx(false), rng);
  assert.strictEqual(JSON.stringify(goods), frozen);
});

test('rollCaller does not mutate the order it reads', () => {
  const rng = seededRng(52);
  const order = I.rollOrder({ account: 'AC-500', today: 40, rng });
  const frozen = JSON.stringify(order);
  I.rollCaller({ order, item: order.items[0], today: 40, rng });
  assert.strictEqual(JSON.stringify(order), frozen);
});
