'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { seededRng } = require('../call/rng');
const { playCall, PLAYS } = require('./call');
const { makeCardAgent } = require('./cardAgents');
const { CAUSES } = require('./case');

/**
 * A probe policy: works through whatever she has not answered yet, with the
 * suit that fits it. Asking the same word every play would never reach a
 * departure, which is what made two of these tests pass vacuously at first.
 */
function probe(view) {
  const open = view.board.targets
    .filter((t) => t.cls === 'customer' && !view.answered.includes(t.id) && !t.id.startsWith('heard:'))
    .map((t) => t.id);
  const subject = (view.leads || []).find((l) => open.includes(l)) || open[0] || 'draughts';
  const fit = (require('./case').SUIT_FIT[subject] || ['what'])[0];
  return { kind: 'play', cls: 'customer', target: subject, suit: fit, angle: 'contract' };
}

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

test('a find tells the player what she did, never which cause it is', () => {
  // The engine used to hand the policy the hidden cause id, so the right
  // remedy was never in doubt and "a Fix is not always THE Fix" was a line
  // in the record rather than a rule in the game.
  const ids = CAUSES.map((c) => c.id);
  let sawDeparture = false;
  for (let seed = 1; seed <= 200; seed += 1) {
    const out = playCall({
      agent: {
        choose: (view) => {
          for (const k of Object.keys(view)) {
            const blob = JSON.stringify(view[k]);
            for (const id of ids) {
              assert.ok(!String(blob).includes(id), `view.${k} leaked the cause id ${id}`);
            }
          }
          if (view.candidates.length) sawDeparture = true;
          return probe(view);
        },
      },
      rng: seededRng(seed),
    });
    void out;
  }
  assert.ok(sawDeparture, 'no departure was ever heard across 200 seeds');
});

test('a causal departure offers two remedies it could be, in no fixed order', () => {
  for (const c of CAUSES) {
    assert.ok(c.suggests.length >= 2, `${c.id} points at only one remedy`);
    assert.ok(c.suggests.includes(c.fix.id), `${c.id} does not suggest its own remedy`);
  }
  // And the right one is not always first, or choosing would be a formality.
  const firsts = new Set();
  for (let seed = 1; seed <= 400; seed += 1) {
    playCall({
      agent: {
        choose: (view) => {
          if (view.candidates.length) firsts.add(view.candidates[0]);
          return probe(view);
        },
      },
      rng: seededRng(seed),
    });
  }
  assert.ok(firsts.size > 1, 'the same remedy was always listed first');
});

test('the wrong remedy is refused, so offering one is a real play', () => {
  let refusals = 0;
  for (let seed = 1; seed <= 400; seed += 1) {
    const out = play(seed);
    refusals += out.lines.filter((l) => l.who === 'HER' && l.text.startsWith("That's not it")).length;
  }
  assert.ok(refusals > 0, 'no remedy was ever refused, so the choice cannot be wrong');
});

test('a departure on the last play offers its remedy without a play to spend', () => {
  // Phil's rule: a cause found on turn nine auto-plays.
  let autos = 0;
  for (let seed = 1; seed <= 400; seed += 1) {
    const out = play(seed, { agent: {} });
    if (out.stats.autoPlayed) {
      autos += 1;
      assert.ok(out.plays <= PLAYS, 'the auto-play must not spend a tenth play');
      assert.ok(['resolved', 'held', 'transferred'].includes(out.ending));
    }
  }
  assert.ok(autos > 0, 'the ninth-play auto-play never fired');
});

test('a wrong auto-play becomes a follow-up or an escalation, never a resolution', () => {
  let wrongAutos = 0;
  for (let seed = 1; seed <= 600; seed += 1) {
    const out = play(seed);
    if (!out.stats.autoPlayed) continue;
    const refused = out.lines.some((l) => l.who === 'HER' && l.text.startsWith("That's not it"));
    if (!refused) continue;
    wrongAutos += 1;
    assert.notStrictEqual(out.ending, 'resolved', 'a refused remedy resolved the call');
  }
  assert.ok(wrongAutos > 0, 'no auto-play was ever wrong, so the rule is untested');
});

test('escalation is reachable, and it is the customer who reaches for it', () => {
  let escalated = 0;
  for (let seed = 1; seed <= 600; seed += 1) {
    const out = play(seed);
    if (!out.stats.escalated) continue;
    escalated += 1;
    assert.strictEqual(out.ending, 'transferred');
    assert.ok(
      out.lines.some((l) => l.who === 'HER' && l.text.includes('whoever it is that does know')),
      'the transfer happened without her asking for it',
    );
  }
  assert.ok(escalated > 0, 'no call escalated across 600 seeds');
});

test('an innocent departure can be the only one heard, and it is not the answer', () => {
  // She does more than one thing differently on one order, and only one of
  // them explains the symptom. A policy that asks her widely will hear the
  // innocent ones, and a remedy offered off one of those is wrong.
  const { makePooh } = require('./cardAgents');
  let innocentOnly = 0;
  for (let seed = 1; seed <= 500; seed += 1) {
    const out = playCall({ agent: makePooh(), rng: seededRng(seed) });
    const finds = out.lines.filter((l) => l.who === 'NOTE' && l.text.startsWith('[find]')).length;
    if (finds > 0 && !out.found) {
      innocentOnly += 1;
      assert.notStrictEqual(out.ending, 'resolved', 'an innocent departure resolved the call');
    }
  }
  assert.ok(innocentOnly > 0, 'an innocent departure was never heard');
});
