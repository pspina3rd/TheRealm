'use strict';

/**
 * The ordering scenario: a POOF Instant Potion.
 *
 * There is no hidden cause here. Nothing has gone wrong — she is ringing to
 * buy something — so the engine cannot run on "find the departure from the
 * baseline". It runs on **required fields**: things that have to be settled
 * before an order can be placed, each of which comes either from her or from
 * the record, and the distinction is enforced rather than suggested.
 *
 * Success is an order correctly filled and a customer who understands what
 * she has bought. The second half of that is optional, costs plays, and is
 * what decides whether she rings back.
 */

const SYMPTOM = {
  id: 'poof-instant-potion-order',
  opening: "I need a refill of my healing draught, and I'd like to try the POOF one this time.",
  // Single words, nothing entailed by another.
  words: ['draught', 'refill', 'poof'],
};

/**
 * The five ways it can be made up. Bag options need a Bag with something in
 * it — a villager who buys twice a year has none.
 */
const OPTIONS = [
  { id: 'standard', line: 'Standard — the fixed recipe, same every time.', needsBag: false },
  { id: 'standard-subscription', line: 'Standard on a subscription rather than bought outright.', needsBag: false },
  { id: 'custom-stock', line: 'Custom from our stock — you choose, and pay for the better ones.', needsBag: false },
  { id: 'custom-bag', line: 'Custom from your own Bag, if the makings are in there.', needsBag: true },
  { id: 'custom-both', line: 'Custom from your Bag with our stock for the gaps.', needsBag: true },
];

/**
 * What has to be settled before it ships.
 *
 * `from` is enforced: a field marked `customer` cannot be filled by reading,
 * and one marked `record` cannot be filled by asking her — she doesn't know
 * what POOF costs and we don't know what size she wants.
 */
const REQUIRED = [
  { id: 'product', from: 'customer', reach: ['draught'], fills: 'the healing draught' },
  { id: 'strength', from: 'customer', reach: ['strength'], fills: 'standard strength' },
  { id: 'size', from: 'customer', reach: ['size'], fills: 'one pint' },
  { id: 'option', from: 'customer', reach: ['option'], fills: 'standard' },
  { id: 'destination', from: 'customer', reach: ['address'], fills: 'the village, by the green' },
  { id: 'urgency', from: 'customer', reach: ['today'], fills: 'wants it today' },
  { id: 'price', from: 'record', reach: ['billing'], fills: 'a silver for the draught, POOF charged separately' },
  { id: 'deposit', from: 'record', reach: ['orders', 'billing'], fills: 'deposit on the flask, refunded on return' },
];

/**
 * Things she can be told that don't block the order, and change what happens
 * on the next call if she isn't.
 */
const WARNINGS = [
  {
    id: 'not-a-refill',
    reach: ['refill'],
    line: "Nothing of yours gets topped up — a sealed flask arrives with the draught already made.",
    reply: 'Oh. I thought a refill was a refill.',
  },
  {
    id: 'outcome-varies',
    reach: ['poof'],
    line: "One thing about POOF: it's still experimental, so what arrives isn't guaranteed to be exactly what went in.",
    reply: "Not guaranteed? Nobody said that. Is it still worth having?",
  },
  {
    id: 'deposit-return',
    reach: ['deposit', 'empties'],
    line: 'Send the empty back when you next pass and the deposit comes off the following one.',
    reply: "I've a few of those on the shelf, then.",
  },
];

/**
 * What she says when asked, and what the answer puts in play.
 *
 * `opens` follows necessarily from the answer and is never gated: ask what
 * she wants and the size of it is now a live question. `gives` is the extra
 * she volunteers, and that is gated on how the call is going.
 */
const ANSWERS = {
  draught: { line: 'The healing one. The standard strength, same as I always get.', opens: ['strength', 'size'], gives: [] },
  refill: { line: "A refill — you send it, I use it. That's all I know about it.", opens: [], gives: ['empties'] },
  poof: { line: "My neighbour said the POOF one comes same day. That's why I'm asking.", opens: ['today'], gives: ['neighbour'] },
  strength: { line: "Standard. It's what I've always had.", gives: [] },
  size: { line: 'A pint. The standing flask takes a pint.', gives: [] },
  address: { line: 'The village, by the green.', gives: [] },
  today: { line: "Today if it can. My husband's up at the high pasture and he's taken the last of what we had.", opens: ['address'], gives: ['husband'] },
  option: { line: 'Made up? What are my choices?', gives: [] },
  neighbour: { line: "Her over the way. She's had it twice and swears by it.", gives: [] },
  husband: { line: "He's up with the sheep until Thursday.", gives: [] },
  pasture: { line: "Half a day's walk, and no apothecary within miles of it.", gives: [] },
  bag: { line: "What bag? I've not got a bag. I've a flask and a kitchen.", gives: [] },
  empties: { line: "I've two or three empties on the shelf, if they're worth anything.", gives: ['deposit'] },
  deposit: { line: 'Nobody ever said anything about a deposit.', gives: [] },
};

/** Word families, for the deal. */
const FAMILIES = {
  draught: { adjacent: ['strength'], flavours: ['plain'] },
  refill: { adjacent: ['empties'], flavours: ['plain'] },
  poof: { adjacent: ['today', 'option'], flavours: ['plain', 'routine'] },
  strength: { adjacent: [], flavours: ['plain'] },
  size: { adjacent: [], flavours: ['plain'] },
  address: { adjacent: [], flavours: ['plain', 'support'] },
  today: { adjacent: ['husband'], flavours: ['plain', 'routine'] },
  option: { adjacent: ['bag'], flavours: ['plain', 'support'] },
  neighbour: { adjacent: [], flavours: ['plain'] },
  husband: { adjacent: ['pasture'], flavours: ['plain', 'support'] },
  pasture: { adjacent: [], flavours: ['plain'] },
  bag: { adjacent: [], flavours: ['plain', 'support'] },
  empties: { adjacent: ['deposit'], flavours: ['plain'] },
  deposit: { adjacent: [], flavours: ['plain', 'support'] },
};

module.exports = { SYMPTOM, OPTIONS, REQUIRED, WARNINGS, ANSWERS, FAMILIES };
