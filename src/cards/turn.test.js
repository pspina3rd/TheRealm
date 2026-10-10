'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { seededRng } = require('../call/rng');
const { playTurns, TURNS } = require('./turn');
const BAG = require('./bag');

/**
 * Asks whatever can be asked, one or two at a time, and offers a remedy once
 * her words point at one. `r` is the policy's own dice, kept apart from the
 * call's so the two cannot line up by accident.
 */
function anything(seed, { pairs = true, fixes = true } = {}) {
  const r = seededRng(seed * 13 + 5);
  const done = new Set();
  return (view) => {
    const c = view.candidates.find((f) => !view.refused.includes(f));
    if (fixes && c && r() < 0.7) return { kind: 'fix', fix: c };
    const every = view.board.targets.flatMap((t) => (view.canAsk[t.id] || []).map((k) => [t.id, k]));
    // Never the same question twice, so a repeat from her is hers.
    const fresh = every.filter(([s, k]) => !done.has(`${s}|${k}`));
    const cells = fresh.length ? fresh : every;
    if (!cells.length) {
      // Nothing left to ask her: go to the record, as an agent would.
      if (!view.handle) return { kind: 'identify' };
      const row = view.board.targets.find((t) => t.cls === 'record' && !done.has(t.id));
      if (row) {
        done.add(row.id);
        return { kind: 'read', target: row.id };
      }
      return { kind: 'look' };
    }
    const picks = [];
    const want = pairs && r() < 0.6 ? 2 : 1;
    while (picks.length < want && cells.length) {
      const x = cells.splice(Math.floor(r() * cells.length), 1)[0];
      if (!picks.some((p) => p[0] === x[0])) picks.push(x);
    }
    picks.forEach(([s, k]) => done.add(`${s}|${k}`));
    return {
      kind: 'ask',
      inquiries: picks.map(([s, k]) => ({ suit: k.split('/')[0], angle: k.split('/')[1], target: s })),
    };
  };
}
const play = (seed, choose) =>
  playTurns({ agent: { choose: choose || anything(seed) }, rng: seededRng(seed), scenario: BAG });
const hers = (out) => out.lines.filter((l) => l.who === 'HER').map((l) => l.text);

test('a call is nine turns at most, and two inquiries are one turn said as one line', () => {
  for (let seed = 1; seed <= 80; seed += 1) {
    const out = play(seed);
    assert.ok(out.turns <= TURNS, `seed ${seed} used ${out.turns}`);
    assert.strictEqual(out.lines[0].who, 'HER');
  }
  const out = play(3, anything(3, { fixes: false }));
  assert.strictEqual(out.turns, TURNS);
  const asked = out.lines.filter((l) => l.who === 'YOU' && !l.text.includes('documented') && !l.text.includes('assigning'));
  assert.strictEqual(asked.length, TURNS, 'nine turns should be nine things the agent says');
  assert.ok(asked.some((l) => / And /.test(l.text)), 'no turn carried two inquiries');
});

test('everything said in a call is a sentence, with no blanks or labels left in it', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const out = play(seed);
    for (const l of out.lines) {
      if (l.who === 'NOTE') continue;
      assert.ok(!/[{}[\]]|undefined|null/.test(l.text), `seed ${seed}: ${l.text}`);
      assert.ok(/[.?!]$/.test(l.text), `seed ${seed} does not end as a sentence: ${l.text}`);
      assert.ok(!/ · |→/.test(l.text), `seed ${seed} printed a form: ${l.text}`);
    }
  }
});

test('the agent never reads back what she has not said, and never names someone she has not named', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const out = play(seed, anything(seed, { fixes: false }));
    let pellNamed = false;
    for (const l of out.lines) {
      if (l.who === 'HER' && l.text.includes('Pell')) pellNamed = true;
      if (l.who === 'YOU') assert.ok(pellNamed || !l.text.includes('Pell'), `seed ${seed}: ${l.text}`);
    }
  }
  // A read-back is offered only for something she has answered.
  const out = play(1, (view) => {
    for (const [subject, cells] of Object.entries(view.canAsk)) {
      for (const k of cells) {
        if (k.endsWith('/verify')) assert.ok(view.answered.includes(subject), `${subject} could be read back cold`);
      }
    }
    return anything(1)(view);
  });
  assert.ok(out.turns > 0);
});

test('the bag is not in front of the player until she has said it', () => {
  let first = null;
  play(2, (view) => {
    if (!first) first = view.board.targets.map((t) => t.id);
    return anything(2)(view);
  });
  assert.deepStrictEqual(first, ['working']);
});

test('she says her word for it only when asked what she was looking for', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const out = play(seed, anything(seed, { fixes: false }));
    out.lines.forEach((l, i) => {
      if (l.who !== 'HER' || !/transfer/i.test(l.text)) return;
      const t = l.template;
      // Her reply to a remedy is allowed the word: by then it has been said.
      if (!t) return;
      assert.ok(t.took.some((q) => q.subject === 'looking'), `seed ${seed}: unasked: ${out.lines[i - 1].text} → ${l.text}`);
    });
  }
});

test('she does not announce a feeling at all until a generator can tie it to what was asked', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const out = play(seed);
    for (const l of out.lines) {
      if (l.template && l.template.own) assert.notStrictEqual(l.template.own.kind, 'frustration');
    }
  }
});

test('she does not say the same thing twice in a call', () => {
  let repeats = 0;
  let calls = 0;
  for (let seed = 1; seed <= 300; seed += 1) {
    const out = play(seed, anything(seed, { fixes: false }));
    calls += 1;
    // Her replies to questions, split into sentences longer than a word or
    // two: "Yes." and "Pell." are allowed to recur.
    const said = out.lines
      .filter((l) => l.template)
      .flatMap((l) => l.text.split(/(?<=[.?!])\s+/))
      .filter((x) => x.split(' ').length >= 6);
    if (new Set(said).size < said.length) repeats += 1;
  }
  assert.ok(repeats / calls < 0.05, `she repeated herself unprompted in ${repeats} of ${calls} calls`);
});

test('the call can be resolved, and only after she has said the thing herself', () => {
  let resolved = 0;
  for (let seed = 1; seed <= 200; seed += 1) {
    const out = play(seed);
    if (out.ending === 'resolved') {
      resolved += 1;
      assert.ok(out.found, `seed ${seed} resolved without hearing the cause`);
    }
  }
  assert.ok(resolved > 20, `only ${resolved} of 200 resolved — the call may be unwinnable`);
  assert.ok(resolved < 200, 'every call resolved — nothing is being decided');
});

test('a remedy cannot be offered before her own words point at it', () => {
  const out = play(4, () => ({ kind: 'fix', fix: 'the-word' }));
  assert.notStrictEqual(out.ending, 'resolved');
  assert.ok(!out.lines.some((l) => /assign/i.test(l.text)), 'the answer was printed unearned');
});

test('what she says on the last turn is acted on, not left hanging', () => {
  let checked = 0;
  for (let seed = 1; seed <= 400; seed += 1) {
    // Never offers a remedy, so a find on the ninth turn has nowhere to go
    // but the automatic offer.
    const out = play(seed, anything(seed, { fixes: false }));
    const replies = out.lines.filter((l) => l.template);
    const last = replies[replies.length - 1];
    if (out.turns < TURNS || !last || !last.template.gives.some((g) => g.kind === 'cause')) continue;
    checked += 1;
    assert.ok(hers(out).some((t) => /Assigning/.test(t)) || out.ending === 'held');
    assert.ok(out.lines.some((l) => l.who === 'YOU' && /assigning|permissions/.test(l.text)), `seed ${seed}: what she had just said was not acted on`);
  }
  assert.ok(checked > 0, 'no call ended on a find, so this test proved nothing');
});

test('a paused call charges nothing and replays to the same place', () => {
  const run = (moves) => {
    let i = 0;
    return playTurns({ agent: { choose: () => (i < moves.length ? moves[i++] : { kind: 'pause' }) }, rng: seededRng(11), scenario: BAG });
  };
  const first = [{ kind: 'ask', inquiries: [{ suit: 'what', angle: 'expand', target: 'working' }] }];
  const a = run(first);
  assert.strictEqual(a.paused, true);
  assert.strictEqual(a.turns, 1);
  assert.strictEqual(a.ending, null);
  assert.deepStrictEqual(run(first).lines, a.lines);
  assert.ok(!('cause' in a.view) && !('sheet' in a.view), 'the view must not carry her sheet or the cause');
});

test('an inquiry at something not in front of the player is a miss, not an answer', () => {
  const out = play(2, () => ({ kind: 'ask', inquiries: [{ suit: 'what', angle: 'contract', target: 'looking' }] }));
  assert.strictEqual(out.found, false);
  assert.strictEqual(out.picks.length, 0);
});

test('nothing is in front of the player, or asked about, before she or the record has introduced it', () => {
  const T = BAG.TALK;
  for (let seed = 1; seed <= 300; seed += 1) {
    // Recomputed here from the tags, independently of the engine's own
    // bookkeeping: what each line so far has introduced.
    const have = new Set(T.SAYS_OTHER.opening);
    const add = (words) => {
      for (const w of words || []) {
        have.add(w);
        for (const also of T.ALSO[w] || []) have.add(also);
      }
    };
    const policy = anything(seed);
    let rowsRead = [];
    const out = play(seed, (view) => {
      const move = policy(view);
      if (move.kind === 'read') rowsRead.push(move.target);
      return move;
    });
    let pendingAsk = null;
    for (const l of out.lines) {
      if (l.who === 'HER' && l.text === BAG.HANDLE.say) add(T.SAYS_OTHER.handle);
      if (l.who === 'NOTE' && l.text.startsWith('[record]') && rowsRead.length) {
        // Rows are read in the order the policy asked for them.
        const headline = l.text.replace('[record] ', '');
        const row = rowsRead.find((id) => headline.startsWith(require('./bagRecord').NODES.find((n) => n.id === id).headline));
        if (row) add(T.SAYS_OTHER.record[row]);
      }
      if (l.who === 'YOU') pendingAsk = l;
      if (!l.template) continue;
      const t = l.template;
      // Everything she was asked about had to be in play already, with what
      // each question needs.
      for (const q of t.took.concat(t.left)) {
        assert.ok(have.has(q.subject), `seed ${seed}: asked about ${q.subject} before it was introduced — "${pendingAsk.text}"`);
        const needs = (T.NEEDS[q.subject] || {})[`${q.suit}/${q.angle}`] || [];
        for (const w of needs) assert.ok(have.has(w), `seed ${seed}: "${pendingAsk.text}" needs ${w}, which nobody has said`);
      }
      for (const g of t.gives) {
        add((T.SAYS[g.asked.subject] || {})[`${g.asked.suit}/${g.asked.angle}`]);
        if (g.kind === 'departure') add(T.SAYS_OTHER.departure[g.asked.subject]);
      }
      if (t.own) add(t.own.says);
      if (t.need) add(T.SAYS_OTHER.need);
    }
  }
});

test('when she goes her own way she always introduces something new', () => {
  let seen = 0;
  for (let seed = 1; seed <= 400; seed += 1) {
    const out = play(seed);
    for (const l of out.lines) {
      if (!l.template || !l.template.own) continue;
      seen += 1;
      const o = l.template.own;
      assert.notStrictEqual(o.kind, 'nothing', `seed ${seed}: she went her own way with nothing to say`);
      assert.ok(o.says.length > 0, `seed ${seed}: her own line introduced nothing: ${l.text}`);
      assert.notStrictEqual(l.text, BAG.TALK.NOTHING);
    }
  }
  assert.ok(seen > 30, `she went her own way only ${seen} times in 400 calls`);
});
