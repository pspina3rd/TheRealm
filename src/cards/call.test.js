'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { seededRng } = require('../call/rng');
const { playCall, PLAYS } = require('./call');
const { makeCardAgent } = require('./cardAgents');
const { CAUSES } = require('./case');

function play(seed, opts = {}) {
  return playCall({
    agent: makeCardAgent(opts.agent || {}),
    rng: seededRng(seed),
    baggage: opts.baggage,
    causeIndex: opts.causeIndex,
  });
}

test('a call never spends more than nine plays, and the opening is not one of them', () => {
  for (let seed = 1; seed <= 60; seed += 1) {
    const out = play(seed);
    assert.ok(out.plays <= PLAYS, `seed ${seed} spent ${out.plays}`);
    assert.strictEqual(out.lines[0].who, 'HER', 'the call opens with her, free');
  }
});

test('every ending is one of the three; there is no fourth', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 200; seed += 1) seen.add(play(seed).ending);
  for (const e of seen) assert.ok(['resolved', 'held', 'transferred'].includes(e), `unexpected ending ${e}`);
});

test('the same seed plays the same call twice — nothing calls Math.random', () => {
  const a = play(7);
  const b = play(7);
  assert.deepStrictEqual(a.lines, b.lines);
  assert.strictEqual(a.cause, b.cause);
});

test('all four causes are reachable, and each is found on at least one seed', () => {
  const found = new Set();
  for (let i = 0; i < CAUSES.length; i += 1) {
    for (let seed = 1; seed <= 80; seed += 1) {
      const out = play(seed, { causeIndex: i });
      if (out.found) {
        found.add(CAUSES[i].id);
        break;
      }
    }
  }
  assert.strictEqual(found.size, CAUSES.length, `unreachable causes: ${CAUSES.filter((c) => !found.has(c.id)).map((c) => c.id)}`);
});

test('a fix is only accepted when she has said it herself', () => {
  // The plausible mistake: letting a row in the record stand in for her
  // words, so the call can be resolved without talking to her.
  let recordOnly = 0;
  for (let seed = 1; seed <= 300; seed += 1) {
    const out = play(seed);
    if (out.ending !== 'resolved') continue;
    const hasFind = out.lines.some((l) => l.who === 'NOTE' && l.text.startsWith('[find]'));
    if (!hasFind) recordOnly += 1;
  }
  assert.strictEqual(recordOnly, 0, 'a call was resolved without her ever departing from her baseline');
});

test('the record answers nothing before she has given a handle', () => {
  const out = playCall({
    agent: {
      choose: () => ({ kind: 'play', cls: 'record', target: 'ord-4471', suit: 'what', angle: 'verify' }),
    },
    rng: seededRng(2),
    causeIndex: 0,
  });
  assert.ok(
    out.lines.some((l) => l.text.includes('she has given no handle')),
    'searching without a handle should return nothing',
  );
});

test('validate against the record is refused as an illegal move', () => {
  const out = playCall({
    agent: {
      choose: () => ({ kind: 'play', cls: 'record', target: 'ord-4471', suit: 'what', angle: 'validate' }),
    },
    rng: seededRng(2),
    causeIndex: 0,
  });
  assert.ok(out.lines.some((l) => l.text.includes('[illegal]')));
});

test('an illegal move still costs a play — a wasted play is a play', () => {
  const out = playCall({
    agent: {
      choose: () => ({ kind: 'play', cls: 'coworker', target: 'bram', suit: 'nope', angle: 'verify' }),
    },
    rng: seededRng(4),
    causeIndex: 0,
  });
  assert.strictEqual(out.plays, PLAYS);
});

test('her Need only surfaces through her own trigger, and can fire obliquely', () => {
  let direct = 0;
  let oblique = 0;
  for (let seed = 1; seed <= 400; seed += 1) {
    const out = play(seed);
    if (!out.stats.needSeen) continue;
    if (out.stats.needOblique) oblique += 1;
    else direct += 1;
  }
  assert.ok(direct + oblique > 0, 'the Need never surfaced on 400 seeds');
  assert.ok(oblique > 0, 'the Need never fired obliquely, which is the settled rule');
});

test('the dice policy is a real alternative, not an error path', () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    const out = play(seed, { agent: { randomMove: true } });
    assert.ok(out.plays > 0 && out.plays <= PLAYS);
  }
});

test('a fix played on the record alone is refused in her own words', () => {
  // The designed rule rather than the policy's habit: the competent agent
  // never does this, so without a test the branch is unproven.
  let seen = false;
  for (let seed = 1; seed <= 200 && !seen; seed += 1) {
    let read = false;
    const out = playCall({
      agent: {
        choose: (view) => {
          if (!view.handle) return { kind: 'identify', target: 'PO-1183', suit: 'what', angle: 'contract' };
          if (!read) {
            read = true;
            return { kind: 'play', cls: 'record', target: 'ord-4471', suit: 'what', angle: 'expand' };
          }
          const row = view.board.targets.find((t) => t.cls === 'record' && !view.asked.includes(t.id));
          if (row) return { kind: 'play', cls: 'record', target: row.id, suit: 'what', angle: 'verify' };
          return { kind: 'fix', fix: 'split-the-send', suit: 'how', angle: 'contract' };
        },
      },
      rng: seededRng(seed),
      causeIndex: 0,
    });
    if (out.lines.some((l) => l.text.includes("That's not it"))) {
      seen = true;
      assert.notStrictEqual(out.ending, 'resolved', 'the record must not resolve a call on its own');
    }
  }
  assert.ok(seen, 'never reached a fix played on record evidence alone');
});

test('the refusal reads the same whichever cause the player was close to', () => {
  // Two different refusals would tell the player which cause was right.
  const refusals = new Set();
  for (let i = 0; i < CAUSES.length; i += 1) {
    const out = playCall({
      agent: { choose: () => ({ kind: 'fix', fix: 'split-the-send', suit: 'how', angle: 'contract' }) },
      rng: seededRng(9),
      causeIndex: i,
    });
    for (const l of out.lines) if (l.who === 'HER' && l.text.includes('not it')) refusals.add(l.text);
  }
  assert.strictEqual(refusals.size, 1, `refusals differ: ${[...refusals].join(' | ')}`);
});
