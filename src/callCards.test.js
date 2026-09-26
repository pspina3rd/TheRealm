'use strict';

const test = require('node:test');
const assert = require('node:assert');
const C = require('./callCards.js');
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

const LOW = () => 0.01; // always lands (no strength, so never critical)
const HIGH = () => 0.999; // misfires whenever the landing is weak enough

const cause = (id) => S.CAUSES.find((c) => c.id === id);
const bareHand = () => Object.fromEntries(Object.keys(C.CARDS).map((c) => [c, []]));
const mv = (card, target) => ({ door: C.CARDS[card].door, target, card });
const has = (state, card, target) =>
  C.availableMoves(state).some((m) => m.card === card && m.target === target);
const clone = (x) => JSON.parse(JSON.stringify(x));

// Name, find the account, check it.
const SETUP = [['ask', 'detail'], ['lookItUp', 'search'], ['lookItUp', 'search']];

function findSeed(pred) {
  for (let s = 1; s < 5000; s++) if (pred(C.customerFromSeed(s), s)) return s;
  throw new Error('no seed matches');
}

function play(state, moves, rng) {
  for (const [card, target] of moves) state = C.playMove(state, mv(card, target), rng);
  return state;
}

/** Share of N rolls on which `move` lands well from `state`. */
function landRate(state, move, n = 3000) {
  let good = 0;
  for (let i = 0; i < n; i++) {
    const next = C.playMove(state, move, seededRng(1000 + i));
    const l = next.turns[next.turns.length - 1].landing;
    if (l === 'lands' || l === 'critical') good++;
  }
  return good / n;
}

/** Every authored string; name-bearing lines are called with a name. */
function allStrings(obj, out = []) {
  if (typeof obj === 'string') out.push(obj);
  else if (typeof obj === 'function') out.push(obj('Wren Callow'));
  else if (Array.isArray(obj)) obj.forEach((x) => allStrings(x, out));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach((x) => allStrings(x, out));
  return out;
}

function randomHand(rng) {
  const hand = {};
  for (const id of Object.keys(C.CARDS)) {
    const a = C.UPGRADE_EFFECTS[Math.floor(rng() * C.UPGRADE_EFFECTS.length)];
    const b = C.UPGRADE_EFFECTS[Math.floor(rng() * C.UPGRADE_EFFECTS.length)];
    const n = Math.floor(rng() * 4);
    hand[id] = [a, b, a].slice(0, n);
  }
  return hand;
}

/** Plays many random calls; returns every finished state. */
function simulate(count, seed) {
  const rng = seededRng(seed);
  const states = [];
  for (let i = 0; i < count; i++) {
    const c = S.CAUSES[Math.floor(rng() * S.CAUSES.length)];
    let state = C.startCall({
      customerSeed: C.rollCustomerSeed(rng),
      cause: c,
      agent: { practice: Math.floor(rng() * 3) },
      hand: rng() < 0.5 ? bareHand() : randomHand(rng),
    });
    for (let step = 0; step < 40; step++) {
      const moves = C.availableMoves(state);
      if (moves.length === 0) break;
      state = C.playMove(state, moves[Math.floor(rng() * moves.length)], rng);
    }
    states.push(state);
  }
  return states;
}

// ---------------------------------------------------------------------
// The customer
// ---------------------------------------------------------------------

test('the same seed is always the same person', () => {
  for (const seed of [0, 1, 15, 99999, 4294967295]) {
    assert.deepStrictEqual(C.customerFromSeed(seed), C.customerFromSeed(seed));
    assert.deepStrictEqual(C.statementDelivery(seed, 'name'), C.statementDelivery(seed, 'name'));
  }
  const people = new Set();
  const names = new Set();
  for (let s = 1; s <= 30; s++) {
    people.add(JSON.stringify({ ...C.customerFromSeed(s), seed: 0 }));
    names.add(C.customerFromSeed(s).name);
  }
  assert.ok(people.size > 20, 'different seeds should mostly be different people');
  assert.ok(names.size > 3, 'every seed has the same name');
});

test('a call stores the seed, not a rolled customer', () => {
  const state = C.startCall({ customerSeed: 15, cause: cause('missed-payment'), hand: bareHand() });
  assert.strictEqual(state.customerSeed, 15);
  for (const key of ['customer', 'sheet', 'empathy', 'pattern', 'tolerance', 'name', 'certainty']) {
    assert.ok(!(key in state), `state carries a rolled "${key}"`);
  }
});

test('the customer sheet has no archetype to feed into a roll', () => {
  const sheet = C.customerFromSeed(7);
  for (const key of Object.keys(sheet)) {
    assert.ok(!/type|archetype|class|kind/i.test(key), `sheet has "${key}"`);
  }
  assert.ok('empathy' in sheet, 'everyone has Empathy, customers included');
});

test('hand-holding customers exist but are rare', () => {
  let n = 0;
  for (let s = 1; s <= 2000; s++) if (C.customerFromSeed(s).handHolding) n++;
  assert.ok(n > 0, 'none at all');
  assert.ok(n / 2000 < 0.15, `not rare: ${n} in 2000`);
});

// ---------------------------------------------------------------------
// Certainty and hesitation
// ---------------------------------------------------------------------

test('hesitation leans towards uncertainty but never gives it away', () => {
  const counts = { sureHes: 0, sure: 0, unsureHes: 0, unsure: 0 };
  for (let s = 1; s <= 3000; s++) {
    for (const key of ['name', 'doing', 'activation']) {
      const d = C.statementDelivery(s, key);
      if (d.sure) { counts.sure++; if (d.hesitant) counts.sureHes++; } else { counts.unsure++; if (d.hesitant) counts.unsureHes++; }
    }
  }
  assert.ok(counts.sureHes > 0, 'a sure caller never pauses — hesitation would be a certain tell');
  assert.ok(counts.unsureHes < counts.unsure, 'an unsure caller always hesitates — a certain tell');
  assert.ok(counts.unsureHes / counts.unsure > counts.sureHes / counts.sure + 0.3,
    'hesitation does not lean towards uncertainty');
});

test('hesitation is in the exact words; the gist keeps the facts and hides it', () => {
  let hes = 0;
  let clear = 0;
  for (let s = 1; s <= 200; s++) {
    const sheet = C.customerFromSeed(s);
    const st = C.playMove(C.startCall({ customerSeed: s, cause: cause('missed-payment'), hand: bareHand() }), mv('ask', 'detail'), LOW);
    const r = st.turns[0].replies[0];
    const d = C.statementDelivery(s, 'name');
    assert.strictEqual(r.gist, `Name: ${sheet.name}.`, 'gist lost the name, or carries delivery');
    assert.ok(r.exact.includes(sheet.name), 'exact words lost the name');
    assert.strictEqual(/…|—/.test(r.exact), d.hesitant, `hesitation not written into: ${r.exact}`);
    if (d.hesitant) hes++; else clear++;
  }
  assert.ok(hes > 0 && clear > 0, 'sample did not cover both deliveries');

  // Same for a cause's own statement: Phil's line when clear, a hesitant
  // rewrite when not, and one gist for both.
  const doingGists = new Set();
  const doingExact = new Set();
  for (let s = 1; s <= 200; s++) {
    const st = play(C.startCall({ customerSeed: s, cause: cause('subscription-expired'), agent: { practice: 9 }, hand: bareHand() }),
      [['ask', 'detail'], ['ask', 'detail']], LOW);
    doingGists.add(st.turns[1].replies[0].gist);
    doingExact.add(st.turns[1].replies[0].exact);
  }
  assert.strictEqual(doingGists.size, 1);
  assert.strictEqual(doingExact.size, 2);
  assert.ok(doingExact.has(cause('subscription-expired').person.askDoing));
});

test('validating something they were sure of costs; validating something shaky helps', () => {
  const seed = findSeed((c) => !c.handHolding && c.pattern === 'none' && !c.resists);
  const s = C.playMove(C.startCall({ customerSeed: seed, cause: cause('never-learned-it'), agent: { practice: 9 }, hand: bareHand() }), mv('ask', 'detail'), LOW);
  const sure = clone(s); sure.statements.name.sure = true;
  const shaky = clone(s); shaky.statements.name.sure = false;
  const readBack = mv('readItBack', 'name');
  assert.ok(landRate(shaky, readBack) > landRate(sure, readBack) + 0.1,
    'over-validation has no cost');

  // And they say so, in words.
  const t = C.playMove(sure, readBack, () => 0.9);
  assert.notStrictEqual(t.turns[1].landing, 'lands');
  assert.match(t.turns[1].replies[0].exact, /said that|told you/);
});

test('building on a shaky statement nobody checked lands worse', () => {
  const seed = findSeed((c) => !c.handHolding && c.pattern === 'none' && !c.resists);
  const s = C.playMove(C.startCall({ customerSeed: seed, cause: cause('never-learned-it'), agent: { practice: 9 }, hand: bareHand() }), mv('ask', 'detail'), LOW);
  const search = mv('lookItUp', 'search');
  const shaky = clone(s); shaky.statements.name.sure = false; shaky.statements.name.validated = false;
  const checked = clone(shaky); checked.statements.name.validated = true;
  const sure = clone(s); sure.statements.name.sure = true;
  assert.ok(landRate(checked, search) > landRate(shaky, search) + 0.05);
  assert.strictEqual(landRate(sure, search), landRate(checked, search),
    'a sure statement should not need checking to be built on');
});

// ---------------------------------------------------------------------
// The call and its moves
// ---------------------------------------------------------------------

test('the opening is fixed', () => {
  const state = C.startCall({ customerSeed: 3, cause: cause('too-frightened'), hand: bareHand() });
  const [you, caller] = C.viewCall(state).lines;
  assert.deepStrictEqual(you, { speaker: 'YOU', text: 'TLC Support. How may I help you?' });
  assert.deepStrictEqual(caller, {
    speaker: 'CALLER',
    text: "Hey, ok, so I see a bunch of zombies and this new sword's enchantment isn't activating!",
  });
});

test('targets open on evidence, not on sequence', () => {
  const start = C.startCall({ customerSeed: 15, cause: cause('missed-payment'), hand: bareHand() });
  for (const [card, target] of [['readItBack', 'name'], ['readItBack', 'account'], ['readItBack', 'fact'],
    ['lookItUp', 'search'], ['sayWhatIFound', 'result'], ['talkItThrough', 'step'],
    ['putItRight', 'procedure'], ['theNo', 'process']]) {
    assert.ok(!has(start, card, target), `${card}/${target} open with nothing to work with`);
  }
  assert.ok(has(start, 'ask', 'detail'));

  // Asking is not the gate; the NAME being given is. A misfired ask
  // leaves nothing to read back or search with.
  const validator = findSeed((c) => c.prefers === 'validate' && !c.handHolding && !c.resists);
  const misfired = C.playMove(C.startCall({ customerSeed: validator, cause: cause('missed-payment'), hand: bareHand() }), mv('ask', 'detail'), HIGH);
  assert.strictEqual(misfired.turns[0].landing, 'misfire');
  assert.ok(!has(misfired, 'readItBack', 'name'), 'a name that was never given can be read back');
  assert.ok(!has(misfired, 'lookItUp', 'search'), 'searched with no name');

  const named = C.playMove(start, mv('ask', 'detail'), LOW);
  assert.ok(has(named, 'readItBack', 'name'));
  assert.ok(has(named, 'lookItUp', 'search'));
  assert.ok(!has(named, 'readItBack', 'account'), 'account read back before one was found');
});

test('Validate [Fact] only ever reads back what the caller said', () => {
  // Records read, nothing stated by the caller beyond a name: no Fact.
  const s = play(C.startCall({ customerSeed: 5, cause: cause('missed-payment'), agent: { practice: 9 }, hand: bareHand() }), SETUP, LOW);
  assert.ok(!has(s, 'readItBack', 'fact'), 'Fact opened on our own records');

  const recordWords = /payment|subscription|renew|registered|account|lapsed|guild/i;
  for (const s2 of allStrings(C.AGENT.readItBack.fact)) {
    assert.ok(!recordWords.test(s2), `Fact read-back talks about records: ${s2}`);
  }
  // Sharing a finding is a statement, not a question for them to confirm.
  for (const s2 of allStrings(C.AGENT.sayWhatIFound)) {
    assert.ok(!s2.includes('?'), `a finding asks the caller to confirm our record: ${s2}`);
  }
  // The frightened caller's "what did you ask me?" has nothing to validate.
  const f = play(C.startCall({ customerSeed: 5, cause: cause('too-frightened'), agent: { practice: 9 }, hand: bareHand() }),
    [['ask', 'detail'], ['ask', 'detail']], LOW);
  assert.ok(!has(f, 'readItBack', 'fact'));
});

test('Try another way appears only after something visibly failed', () => {
  // Checked live, at every step of many random calls. A flat landing is
  // not a failure the agent can see, so it must not open the card.
  const rng = seededRng(11);
  let offeredEver = false;
  let flatOnlySeen = false;
  for (let i = 0; i < 300; i++) {
    let state = C.startCall({
      customerSeed: C.rollCustomerSeed(rng),
      cause: S.CAUSES[Math.floor(rng() * S.CAUSES.length)],
      agent: { practice: Math.floor(rng() * 3) },
      hand: bareHand(),
    });
    for (let step = 0; step < 30; step++) {
      const moves = C.availableMoves(state);
      if (moves.length === 0) break;
      const failedSoFar = state.turns.some((t) => t.landing === 'misfire' || t.failed);
      const offered = moves.some((m) => m.card === 'tryAnotherWay');
      if (offered) offeredEver = true;
      if (!failedSoFar && state.turns.some((t) => t.landing === 'flat')) flatOnlySeen = true;
      assert.ok(!offered || failedSoFar, 'Try another way offered before any failure');
      state = C.playMove(state, moves[Math.floor(rng() * moves.length)], rng);
    }
  }
  assert.ok(offeredEver, 'the card never appeared at all');
  assert.ok(flatOnlySeen, 'no call had a flat landing without a failure; the check proved nothing');
});

test('every cause can be put right by acting, and only by the right act', () => {
  const actionMove = {
    steady: ['steady', 'detail'],
    walkThrough: ['talkItThrough', 'step'],
    registerProduct: ['putItRight', 'procedure'],
    referGuild: ['theNo', 'process'],
  };
  for (const c of S.CAUSES) {
    for (const [fixId, [card, target]] of Object.entries(actionMove)) {
      let state = C.startCall({ customerSeed: 5, cause: c, agent: { practice: 5 }, hand: bareHand() });
      state = play(state, SETUP, LOW);
      state = C.playMove(state, mv(card, target), LOW);
      assert.strictEqual(state.resolved, c.fixedBy === fixId, `${c.id} with ${fixId}`);
    }
  }
});

test('talking someone through only works if the words land; registering works regardless', () => {
  // A high roll only misfires when the landing is weak enough, so each
  // setup is chosen to make it weak, and the misfire is asserted first.
  const resister = findSeed((c) => c.resists === 'talkItThrough' && !c.handHolding);
  let a = C.startCall({ customerSeed: resister, cause: cause('never-learned-it'), agent: { practice: 5 }, hand: bareHand() });
  a = C.playMove(play(a, SETUP, LOW), mv('talkItThrough', 'step'), HIGH);
  assert.strictEqual(a.turns[3].landing, 'misfire', 'setup did not produce a misfire');
  assert.strictEqual(a.resolved, false, 'a walk-through nobody could follow still worked');

  // Four Expands in a row from a novice, with a validate-preferring caller.
  const validator = findSeed((c) => c.prefers === 'validate' && !c.handHolding && !c.resists);
  let b = C.startCall({ customerSeed: validator, cause: cause('not-registered'), agent: { practice: 0 }, hand: bareHand() });
  b = C.playMove(play(b, SETUP, LOW), mv('putItRight', 'procedure'), HIGH);
  assert.strictEqual(b.turns[3].landing, 'misfire', 'setup did not produce a misfire');
  assert.strictEqual(b.resolved, true, 'registration is done to the account, not the person');
});

test('records never reveal a cause that lives in the person', () => {
  const said = new Set();
  for (const c of S.CAUSES.filter((x) => x.visibility === 'person')) {
    let state = C.startCall({ customerSeed: 5, cause: c, agent: { practice: 5 }, hand: bareHand() });
    state = play(state, [...SETUP, ['sayWhatIFound', 'result']], LOW);
    const t = state.turns[state.turns.length - 1];
    said.add(t.said + '|' + t.replies.map((r) => r.exact).join('|') + '|' + C.viewCall(state).account.join('|'));
  }
  assert.strictEqual(said.size, 1, 'the three person-causes read differently in the account');
});

// ---------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------

const SLOT = /\$\{|[{}[\]<>]|undefined|null|NaN|%s|__/;

test('no spoken line has a template placeholder or an unfilled slot', () => {
  const authored = allStrings([C.AGENT, C.REPLY, C.REPLY_BY_CAUSE, C.OPENING]);
  assert.ok(authored.length > 100, 'did not find the authored lines');
  for (const s of authored) assert.ok(!SLOT.test(s), `slot in authored line: ${s}`);

  // And what actually comes out of real calls, exact and gist both.
  for (const state of simulate(400, 21)) {
    for (const t of state.turns) {
      assert.ok(typeof t.said === 'string' && t.said.length > 0);
      assert.ok(!SLOT.test(t.said), `slot in: ${t.said}`);
      for (const r of t.replies) {
        assert.ok(typeof r.exact === 'string' && r.exact.length > 0, 'empty caller line');
        assert.ok(!SLOT.test(r.exact), `slot in: ${r.exact}`);
        assert.ok(r.gist === null || (typeof r.gist === 'string' && !SLOT.test(r.gist)), `bad gist: ${r.gist}`);
      }
    }
    for (const l of C.viewCall(state).lines) assert.ok(!SLOT.test(l.text), `slot in view: ${l.text}`);
  }
});

test('the only thing ever put into a line is the caller\'s name', () => {
  const fns = [];
  const walk = (o) => {
    if (typeof o === 'function') fns.push(o);
    else if (o && typeof o === 'object') Object.values(o).forEach(walk);
  };
  walk([C.AGENT, C.REPLY, C.REPLY_BY_CAUSE]);
  assert.ok(fns.length > 0);
  for (const fn of fns) {
    assert.strictEqual(fn.length, 1, 'a line takes something other than a name');
    assert.ok(fn('Zzq Xxv').includes('Zzq'), 'a name-taking line did not use the name');
  }
});

test('no agent line puts the blame on the customer', () => {
  const blame = /\byou (must have|should have|forgot|didn't|did not|failed|gave me|need to calm|weren't)|your fault|wrong number|you're wrong/i;
  for (const s of allStrings(C.AGENT)) assert.ok(!blame.test(s), `blames the customer: ${s}`);
});

test('the caller is they/them everywhere', () => {
  const gendered = /\b(he|she|his|her|hers|him|himself|herself)\b/i;
  const lines = allStrings([C.AGENT, C.REPLY, C.REPLY_BY_CAUSE]);
  for (const s of lines) assert.ok(!gendered.test(s), `gendered: ${s}`);
});

test('the better No exists only with Finesse, and a plain No is still a No', () => {
  const setup = [...SETUP, ['theNo', 'process']];
  const plainHand = bareHand();
  const fineHand = { ...bareHand(), theNo: ['finesse'] };
  for (const id of ['missed-payment', 'subscription-expired', 'auto-renewal-off']) {
    const plain = play(C.startCall({ customerSeed: 5, cause: cause(id), agent: { practice: 5 }, hand: plainHand }), setup, LOW);
    const fine = play(C.startCall({ customerSeed: 5, cause: cause(id), agent: { practice: 5 }, hand: fineHand }), setup, LOW);
    const p = plain.turns[3].said;
    const f = fine.turns[3].said;
    assert.ok(p.startsWith("I'm sorry, we can't"), `plain No: ${p}`);
    assert.ok(!/what is available/.test(p), 'plain No borrowed the better wording');
    assert.ok(/^I understand .*; let's talk about what is available\./.test(f), `better No: ${f}`);
  }
});

test('Durability changes the words on reuse; without it the words repeat', () => {
  const setup = [['ask', 'detail'], ['readItBack', 'name'], ['lookItUp', 'search'], ['readItBack', 'name']];
  const base = play(C.startCall({ customerSeed: 5, cause: cause('missed-payment'), agent: { practice: 5 }, hand: bareHand() }), setup, LOW);
  assert.strictEqual(base.turns[1].said, base.turns[3].said);
  const dur = play(C.startCall({
    customerSeed: 5, cause: cause('missed-payment'), agent: { practice: 5 },
    hand: { ...bareHand(), readItBack: ['durability'] },
  }), setup, LOW);
  assert.notStrictEqual(dur.turns[1].said, dur.turns[3].said);
});

// ---------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------

test('gist is never labelled as speech', () => {
  for (const state of simulate(150, 41)) {
    const lines = C.viewCall(state).lines;
    const gists = new Set(state.turns.flatMap((t) => t.replies.map((r) => r.gist)));
    const exacts = new Set(state.turns.flatMap((t) => t.replies.map((r) => r.exact)));
    for (const l of lines) {
      if (l.speaker === 'CALLER' && !exacts.has(l.text)) {
        assert.ok(l.text === C.OPENING.caller, `non-speech under CALLER: ${l.text}`);
      }
      if (l.speaker === 'ON THE LINE') assert.ok(gists.has(l.text), `speech under ON THE LINE: ${l.text}`);
    }
  }
});

test('a novice gets the gist; Visibility gets the exact words, live only', () => {
  const c = cause('forgot-under-stress');
  const moves = [['ask', 'detail'], ['readItBack', 'name']];
  const novice = play(C.startCall({ customerSeed: 5, cause: c, hand: bareHand() }), moves, LOW);
  const seen = play(C.startCall({
    customerSeed: 5, cause: c, hand: { ...bareHand(), readItBack: ['visibility'], ask: ['visibility'] },
  }), moves, LOW);

  const lastOf = (s) => C.viewCall(s).lines.slice(-1)[0];
  assert.deepStrictEqual(lastOf(novice), { speaker: 'ON THE LINE', text: novice.turns[1].replies[0].gist });
  assert.deepStrictEqual(lastOf(seen), { speaker: 'CALLER', text: seen.turns[1].replies[0].exact });

  // The earlier line collapsed to gist when the next move was made.
  assert.deepStrictEqual(C.viewCall(seen).lines[3], { speaker: 'ON THE LINE', text: seen.turns[0].replies[0].gist });
});

test('a reply with nothing factual in it collapses to nothing', () => {
  let s = C.startCall({ customerSeed: 5, cause: cause('missed-payment'), agent: { practice: 9 }, hand: bareHand() });
  s = play(s, [['ask', 'detail'], ['lookItUp', 'search']], LOW);
  assert.strictEqual(s.turns[1].replies[0].gist, null);
  const last = C.viewCall(s).lines.slice(-1)[0];
  assert.deepStrictEqual(last, { speaker: 'YOU', text: s.turns[1].said });
});

test('noting keeps exact words in scroll-back, but only words that were seen', () => {
  const c = cause('forgot-under-stress');
  const seenHand = { ...bareHand(), ask: ['visibility'] };
  let s = C.playMove(C.startCall({ customerSeed: 5, cause: c, hand: seenHand }), mv('ask', 'detail'), LOW);
  s = C.noteLine(s);
  s = C.playMove(s, mv('readItBack', 'name'), LOW);
  assert.strictEqual(C.viewCall(s).lines[3].text, s.turns[0].replies[0].exact);

  let n = C.playMove(C.startCall({ customerSeed: 5, cause: c, hand: bareHand() }), mv('ask', 'detail'), LOW);
  n = C.noteLine(n);
  n = C.playMove(n, mv('readItBack', 'name'), LOW);
  assert.strictEqual(C.viewCall(n).lines[3].text, n.turns[0].replies[0].gist,
    'a novice noted words they never heard');
});

// ---------------------------------------------------------------------
// Repetition
// ---------------------------------------------------------------------

function afterRepeats(seed, k, practice) {
  let s = C.startCall({ customerSeed: seed, cause: cause('never-learned-it'), agent: { practice }, hand: bareHand() });
  for (let i = 0; i < k; i++) s = C.playMove(s, mv('ask', 'detail'), LOW);
  return s;
}

test('reuse fades gradually, like a tea bag — never a wall', () => {
  const f = [0, 1, 2, 3].map((u) => C.fadeFactor(u, false));
  for (let i = 1; i < f.length; i++) {
    assert.ok(f[i] < f[i - 1], 'reuse did not weaken the card');
    assert.ok(f[i] / f[i - 1] > 0.7, `a wall between ${i - 1} and ${i} uses`);
  }

  const seed = findSeed((c) => !c.handHolding && c.pattern === 'none' && !c.resists);
  const rates = [0, 1, 2, 3].map((k) => landRate(afterRepeats(seed, k, 10), mv('ask', 'detail')));
  for (let i = 1; i < rates.length; i++) {
    assert.ok(rates[i] < rates[i - 1], `rate did not fall: ${rates}`);
    assert.ok(rates[i - 1] - rates[i] < 0.25, `cliff at ${i}: ${rates}`);
  }
  assert.ok(rates[3] > 0.15, `a card used three times is dead: ${rates}`);
});

test('a hand-holding customer is helped by repetition', () => {
  const holder = findSeed((c) => c.handHolding && !c.resists);
  const other = findSeed((c) => !c.handHolding && c.pattern === 'none' && !c.resists);
  const hold0 = landRate(afterRepeats(holder, 0, 0), mv('ask', 'detail'));
  const hold3 = landRate(afterRepeats(holder, 3, 0), mv('ask', 'detail'));
  const oth0 = landRate(afterRepeats(other, 0, 0), mv('ask', 'detail'));
  const oth3 = landRate(afterRepeats(other, 3, 0), mv('ask', 'detail'));
  assert.ok(hold3 > hold0, `hand-holder was not helped: ${hold0} -> ${hold3}`);
  assert.ok(oth3 < oth0, `ordinary customer was helped: ${oth0} -> ${oth3}`);
});

test('a novice pays for reusing a door; practice lets a door be reused', () => {
  const seed = findSeed((c) => !c.handHolding && c.pattern === 'none' && !c.resists);
  const novice = afterRepeats(seed, 1, 0);
  const practised = afterRepeats(seed, 1, 1);
  const search = mv('lookItUp', 'search');
  assert.ok(landRate(practised, search) > landRate(novice, search) + 0.03,
    'practice made no difference to reusing the Expand door');
});

test('validating the same target a third time is dangerous', () => {
  const seed = findSeed((c) => !c.handHolding && c.pattern === 'none' && !c.resists);
  const setup = [['ask', 'detail'], ['lookItUp', 'search'], ['readItBack', 'name'], ['readItBack', 'name']];
  const s = play(C.startCall({ customerSeed: seed, cause: cause('never-learned-it'), agent: { practice: 10 }, hand: bareHand() }), setup, LOW);
  const third = landRate(s, mv('readItBack', 'name'));
  const different = landRate(s, mv('readItBack', 'account'));
  assert.ok(third < different - 0.15, `third read-back of the name was not dangerous: ${third} vs ${different}`);
  const t = C.playMove(s, mv('readItBack', 'name'), LOW);
  assert.match(t.turns[4].replies[0].exact, /three times/);
});

test('pattern reading follows the sheet', () => {
  const V = 'validate';
  const E = 'expand';
  assert.strictEqual(C.readsAsPattern('1-1', [V, E, V, E]), true);
  assert.strictEqual(C.readsAsPattern('none', [V, E, V, E]), false);
  assert.strictEqual(C.readsAsPattern('2-1', [V, V, E, V]), true);
  assert.strictEqual(C.readsAsPattern('2-1', [V, E, V, E]), false);
  assert.strictEqual(C.readsAsPattern('3-1', [E, V, V, V]), true);
  assert.strictEqual(C.readsAsPattern('3-3', [V, V, E, E]), true);
  assert.strictEqual(C.readsAsPattern('1-1', [V, E, V]), false, 'needs the whole window');
});

// ---------------------------------------------------------------------
// Upgrades
// ---------------------------------------------------------------------

test('a card takes up to three upgrades, at most two kinds', () => {
  assert.doesNotThrow(() => C.validateUpgrades([]));
  assert.doesNotThrow(() => C.validateUpgrades(['finesse', 'finesse', 'finesse']));
  assert.doesNotThrow(() => C.validateUpgrades(['armour', 'armour', 'strength']));
  assert.throws(() => C.validateUpgrades(['armour', 'strength', 'finesse']));
  assert.throws(() => C.validateUpgrades(['armour', 'armour', 'armour', 'armour']));
  assert.throws(() => C.validateUpgrades(['speed']), 'Speed was rejected');
  assert.throws(() => C.startCall({ customerSeed: 1, cause: cause('missed-payment'), hand: { combo: [] } }));
});

test('Finesse eases an earlier hit and never erases it', () => {
  let hit = { original: 1, severity: 1 };
  const first = C.easeHit(hit, 3);
  assert.ok(first.severity < 1, 'did not ease');
  for (let i = 0; i < 200; i++) hit = C.easeHit(hit, 3);
  assert.ok(hit.severity > 0, 'erased');

  // Through play: a misfire, then many Finesse landings.
  const hand = { ...bareHand(), readItBack: ['finesse', 'finesse', 'finesse'] };
  let s = C.startCall({ customerSeed: 5, cause: cause('never-learned-it'), agent: { practice: 10 }, hand });
  s = C.playMove(s, mv('ask', 'detail'), LOW);
  s = C.playMove(s, mv('readItBack', 'name'), HIGH);
  assert.strictEqual(s.turns[1].landing, 'misfire', 'setup did not produce a misfire');
  const before = s.hits[0].severity;
  for (let i = 0; i < 30; i++) {
    s = C.playMove(s, mv('readItBack', 'name'), LOW);
  }
  assert.ok(s.hits[0].severity < before, 'Finesse did not reach back');
  assert.ok(s.hits[0].severity > 0, 'Finesse erased an earlier hit');
});

test('Armour really reduces a misfire, not just how it looks', () => {
  // A validate-preferring caller, so an opening Expand is weak enough to misfire.
  const validator = findSeed((c) => c.prefers === 'validate' && !c.handHolding && !c.resists);
  const run = (hand) => {
    const s = C.startCall({ customerSeed: validator, cause: cause('never-learned-it'), hand });
    return C.playMove(s, mv('ask', 'detail'), HIGH);
  };
  const plain = run(bareHand());
  const armoured = run({ ...bareHand(), ask: ['armour', 'armour'] });
  assert.strictEqual(plain.turns[0].landing, 'misfire', 'setup did not produce a misfire');
  assert.strictEqual(armoured.turns[0].landing, 'misfire', 'Armour must not dodge the misfire itself');
  assert.ok(armoured.hits[0].severity < plain.hits[0].severity);
});

// ---------------------------------------------------------------------
// No score, anywhere
// ---------------------------------------------------------------------

test('no exported function, card, or view exposes a score', () => {
  const bannedWord = /score|meter|points|rating|grade|percent|health|mood/i;
  // "upgrade" contains "grade"; strip it before looking.
  const banned = { test: (k) => bannedWord.test(k.replace(/upgrade/gi, '')) };
  const keys = (obj, out = []) => {
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) { out.push(k); keys(v, out); }
    }
    return out;
  };
  for (const k of Object.keys(C)) assert.ok(!banned.test(k), `export "${k}"`);
  for (const k of keys(C.CARDS)) assert.ok(!banned.test(k), `card field "${k}"`);

  for (const state of simulate(100, 31)) {
    for (const k of keys(state)) assert.ok(!banned.test(k), `state field "${k}"`);
    const view = C.viewCall(state);
    for (const text of [...view.lines.map((l) => l.text), ...view.account, ...view.moves.map((m) => m.label)]) {
      assert.strictEqual(typeof text, 'string');
      assert.ok(!/\d/.test(text), `a number reached the player: ${text}`);
    }
    for (const v of Object.values(view)) assert.ok(typeof v !== 'number', 'a number in the view');
  }
});

// ---------------------------------------------------------------------
// Hygiene
// ---------------------------------------------------------------------

test('playing a move never mutates the state it was given', () => {
  const c = cause('auto-renewal-off');
  const frozenCause = JSON.stringify(c);
  const s = C.startCall({ customerSeed: 8, cause: c, hand: bareHand() });
  const frozen = JSON.stringify(s);
  C.playMove(s, mv('ask', 'detail'), LOW);
  C.noteLine(s);
  C.viewCall(s);
  assert.strictEqual(JSON.stringify(s), frozen);
  assert.strictEqual(JSON.stringify(c), frozenCause);
});

test('a move that is not open throws', () => {
  const s = C.startCall({ customerSeed: 8, cause: cause('auto-renewal-off'), hand: bareHand() });
  assert.throws(() => C.playMove(s, mv('theNo', 'process'), LOW));
  assert.throws(() => C.playMove(s, { door: 'validate', target: 'detail', card: 'ask' }, LOW));
});

test('a cause nobody has written lines for still produces real sentences', () => {
  const invented = {
    id: 'something-nobody-has-seen',
    visibility: 'person',
    fixedBy: 'walkThrough',
    records: Object.fromEntries(S.RECORD_TARGETS.map((t) => [t, 'Nothing irregular.'])),
    person: { askDoing: 'I could not tell you.' },
    onFix: 'It works, eventually.',
  };
  let s = C.startCall({ customerSeed: 5, cause: invented, agent: { practice: 10 }, hand: bareHand() });
  s = play(s, [['ask', 'detail'], ['ask', 'detail'], ['readItBack', 'fact'], ['ask', 'detail'], ['readItBack', 'fact'], ['talkItThrough', 'step']], LOW);
  assert.strictEqual(s.resolved, true);
  for (const t of s.turns) {
    assert.ok(!SLOT.test(t.said));
    for (const r of t.replies) assert.ok(r.exact && !SLOT.test(r.exact) && (r.gist === null || !SLOT.test(r.gist)));
  }
});

test('a caller pushed past what they tolerate ends the call', () => {
  let s = C.startCall({ customerSeed: 5, cause: cause('never-learned-it'), hand: bareHand() });
  for (let i = 0; i < 20 && !s.ended; i++) s = C.playMove(s, mv('steady', 'detail'), HIGH);
  assert.strictEqual(s.ended, true);
  assert.strictEqual(C.availableMoves(s).length, 0);
  assert.strictEqual(C.viewCall(s).lines.slice(-1)[0].text, C.REPLY.hangUp.gist);
});
