'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { seededRng } = require('../call/rng');
const L = require('./sellaLife');
const BAG = require('./bag');
const { playTurns } = require('./turn');

const byId = (id) => L.LIFE.find((m) => m.id === id);

test('every memory can be said at every fullness, as a sentence with no blank left in it', () => {
  for (const m of L.LIFE) {
    for (const how of ['guarded', 'ordinary', 'open']) {
      const line = L.say(m, how);
      assert.ok(line.length > 0, `${m.id} says nothing when ${how}`);
      assert.ok(/[.?!]$/.test(line), `${m.id}/${how} is not a sentence: ${line}`);
      assert.ok(!/[{}]|undefined| {2}| \.|\.\./.test(line), `${m.id}/${how} left a blank: ${line}`);
    }
  }
});

test('the readings Phil settled come out word for word', () => {
  assert.strictEqual(L.say(byId('maud'), 'ordinary'), 'My old partner runs her own party now, out of the same hall, no less.');
  assert.ok(L.say(byId('maud'), 'open').endsWith('Took Les with her when she went.'));
  assert.strictEqual(L.say(byId('les'), 'guarded'), "Les would've known what to do.");
  assert.strictEqual(
    L.say(byId('watchtower'), 'ordinary'),
    "We cleared out an old abandoned watchtower last year. Apparently it wasn't, turns out someone lived there.",
  );
  assert.strictEqual(L.say(byId('notes'), 'ordinary'), 'I keep getting these notes. They claim their minions are watching us.');
});

test('guarded lets out less than open, and never the thing left unsaid', () => {
  for (const m of L.LIFE) {
    assert.ok(L.say(m, 'guarded').length <= L.say(m, 'open').length, `${m.id} says more when guarded`);
  }
  // Her brother: guarded, she mentions a payment and not what happened.
  assert.ok(!/Dungeon|pack/.test(L.say(byId('atrem'), 'guarded')));
  assert.ok(/They only found his pack\./.test(L.say(byId('atrem'), 'open')));
  assert.strictEqual((L.say(byId('atrem'), 'open').match(/brother/g) || []).length, 1, 'she says who he is once');
  // Maud: she never says how she feels about her, at any fullness.
  for (const how of ['guarded', 'ordinary', 'open']) assert.ok(!/hate|civil/i.test(L.say(byId('maud'), how)));
});

test('how much she lets out follows how the call stands for her', () => {
  assert.strictEqual(L.fullness({ sour: 2, good: 5 }, { patience: 5 }), 'guarded');
  assert.strictEqual(L.fullness({ sour: 0, good: 5 }, { patience: 1 }), 'guarded');
  assert.strictEqual(L.fullness({ sour: 0, good: 3 }, { patience: 4 }), 'open');
  assert.strictEqual(L.fullness({ sour: 0, good: 1 }, { patience: 3 }), 'ordinary');
});

test('a memory hangs off words this call can actually say', () => {
  const T = BAG.TALK;
  const can = new Set(BAG.SUBJECTS);
  for (const c of Object.values(T.SAYS)) for (const words of Object.values(c)) words.forEach((w) => can.add(w));
  // The mistake this guards: a misspelt word, and a memory that silently
  // never comes up.
  for (const m of L.LIFE) for (const w of m.hangsOff) assert.ok(can.has(w), `${m.id} hangs off "${w}", which nothing says`);
  assert.ok(L.LIFE.filter((m) => m.hangsOff.length).length >= 6, 'too few memories can come up on this call');
});

/** Asks anything askable, one or two at a time. */
function anything(seed) {
  const r = seededRng(seed * 13 + 5);
  const done = new Set();
  return (view) => {
    const every = view.board.targets.flatMap((t) => (view.canAsk[t.id] || []).map((k) => [t.id, k]));
    const fresh = every.filter(([s, k]) => !done.has(`${s}|${k}`));
    const cells = fresh.length ? fresh : every;
    if (!cells.length) return view.handle ? { kind: 'look' } : { kind: 'identify' };
    const picks = [];
    const want = r() < 0.6 ? 2 : 1;
    while (picks.length < want && cells.length) {
      const x = cells.splice(Math.floor(r() * cells.length), 1)[0];
      if (!picks.some((p) => p[0] === x[0])) picks.push(x);
    }
    picks.forEach(([s, k]) => done.add(`${s}|${k}`));
    return { kind: 'ask', inquiries: picks.map(([s, k]) => ({ suit: k.split('/')[0], angle: k.split('/')[1], target: s })) };
  };
}

test('a memory comes up only with an answer, hanging off that answer, and never in her first reply', () => {
  let seen = 0;
  for (let seed = 1; seed <= 400; seed += 1) {
    const out = playTurns({ agent: { choose: anything(seed) }, rng: seededRng(seed), scenario: BAG });
    const replies = out.lines.filter((l) => l.template);
    const used = [];
    replies.forEach((l, i) => {
      const t = l.template;
      if (!t.aside) return;
      seen += 1;
      assert.ok(i > 0, `seed ${seed}: a memory in her first reply`);
      assert.ok(!t.own, `seed ${seed}: a memory in place of an answer`);
      const g = t.gives[t.aside.after];
      assert.ok(g, `seed ${seed}: the memory follows no answer`);
      const m = byId(t.aside.id);
      assert.ok(m.hangsOff.includes(g.asked.subject), `seed ${seed}: ${m.id} came up after an answer about ${g.asked.subject}`);
      assert.ok(!used.includes(m.id), `seed ${seed}: ${m.id} said twice in one call`);
      used.push(m.id);
      // Not on top of the explanation, a departure, or her Need.
      assert.ok(!t.need && !t.gives.some((x) => x.kind === 'cause' || x.kind === 'departure'), `seed ${seed}: a memory buried something that mattered`);
      assert.ok(l.text.includes(L.say(m, t.aside.how)), `seed ${seed}: the memory is not in what she said`);
    });
  }
  assert.ok(seen > 40, `memories came up only ${seen} times in 400 calls`);
});

test('without her remembrances the same caller says none of them', () => {
  const said = new Set(L.LIFE.flatMap((m) => ['guarded', 'ordinary', 'open'].map((h) => L.say(m, h))));
  for (let seed = 1; seed <= 100; seed += 1) {
    const out = playTurns({ agent: { choose: anything(seed) }, rng: seededRng(seed), scenario: BAG, life: false });
    for (const l of out.lines) {
      assert.ok(!(l.template && l.template.aside));
      for (const s of said) assert.ok(!l.text.includes(s), `seed ${seed}: said a memory with her life off: ${s}`);
    }
  }
});

test('her Need is rare, and her own way takes cause', () => {
  let need = 0;
  let own = 0;
  let replies = 0;
  const N = 300;
  for (let seed = 1; seed <= N; seed += 1) {
    const out = playTurns({ agent: { choose: anything(seed) }, rng: seededRng(seed), scenario: BAG });
    if (out.lines.some((l) => l.text.includes(BAG.NEED.line))) need += 1;
    for (const l of out.lines) {
      if (!l.template) continue;
      replies += 1;
      if (!l.template.own) continue;
      own += 1;
      // Never a statement about the problem behind a stock opener.
      assert.ok(!/^(The thing is|What I do know is),/.test(l.text), `seed ${seed}: ${l.text}`);
    }
  }
  // It was in 28 of 30 calls. The record says the rate is small.
  assert.ok(need / N < 0.5, `her Need surfaced in ${need} of ${N} calls`);
  assert.ok(need > 0, 'her Need never surfaced at all');
  // It was one reply in five. It is her baggage, said once, and only when the
  // call has given her cause; this policy re-asks about the same things, which
  // is cause.
  assert.ok(own / replies < 0.1, `she left the question unanswered in ${own} of ${replies} replies`);
});
