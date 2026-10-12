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

test('a question that does not parse gets a fragment, not a wasted play', () => {
  const CASEDATA = require('./case');
  const out = playCall({
    agent: {
      choose: (view) => {
        const open = view.board.targets
          .filter((t) => t.cls === 'customer' && !t.id.startsWith('heard:'))
          .map((t) => t.id);
        for (const s of open) {
          const bad = (CASEDATA.SUIT_NONSENSE[s] || [])[0];
          if (bad) return { kind: 'play', cls: 'customer', target: s, suit: bad, angle: 'expand' };
        }
        return { kind: 'play', cls: 'customer', target: open[0], suit: 'what', angle: 'expand' };
      },
    },
    rng: seededRng(3),
  });
  assert.ok(out.stats.fragments > 0, 'no fragment was ever offered');
  const said = out.lines.filter((l) => l.who === 'HER').map((l) => l.text);
  const fragments = said.filter((t) => /twelve|Tuesday|passes|carter|guild account|cold room/.test(t));
  assert.ok(fragments.length >= 2, 'fragments should carry facts about the order');
});

test('she repairs a slip once, and the same slip twice gets nothing', () => {
  const CASEDATA = require('./case');
  const out = playCall({
    agent: {
      choose: () => ({ kind: 'play', cls: 'customer', target: 'draughts', suit: 'when', angle: 'expand' }),
    },
    rng: seededRng(3),
  });
  void CASEDATA;
  const said = out.lines.filter((l) => l.who === 'HER').map((l) => l.text);
  const repeats = said.filter((t, i) => said.indexOf(t) !== i && /shipment of|order was|needed them/.test(t));
  assert.strictEqual(repeats.length, 0, `she handed over the same fragment twice: ${repeats[0]}`);
  assert.ok(
    said.some((t) => t.includes("We've been round this")),
    'her generosity should run out',
  );
});

test('a paused call charges nothing, closes nothing, and replays to the same place', () => {
  const first = [{ kind: 'identify', suit: 'what', angle: 'contract' }];
  const run = (moves) => {
    let i = 0;
    return playCall({
      agent: { choose: () => (i < moves.length ? moves[i++] : { kind: 'pause' }) },
      rng: seededRng(7),
    });
  };
  const a = run(first);
  assert.strictEqual(a.paused, true);
  assert.strictEqual(a.ending, null, 'a pause is not an ending');
  assert.strictEqual(a.plays, 1, 'the pause itself must not cost a play');
  assert.strictEqual(a.view.left, PLAYS - 1);
  assert.ok(
    !a.lines.some((l) => l.text.includes('forwarding the case')),
    'a paused call must not say its closing line',
  );
  // The same seed and the same moves give the same lines, which is the whole
  // basis for asking a person one move at a time.
  const b = run(first);
  assert.deepStrictEqual(b.lines, a.lines);
});

test('the budget can be changed for a measurement, and nine is still the default', () => {
  for (const plays of [5, 12]) {
    for (let seed = 1; seed <= 30; seed += 1) {
      const out = playCall({ agent: makeCardAgent({}), rng: seededRng(seed), plays });
      assert.ok(out.plays <= plays, `seed ${seed} spent ${out.plays} of ${plays}`);
    }
  }
  const bad = playCall({ agent: makeCardAgent({}), rng: seededRng(1), plays: 0 });
  const dflt = playCall({ agent: makeCardAgent({}), rng: seededRng(1) });
  assert.deepStrictEqual(bad.lines, dflt.lines, 'a nonsense budget falls back to nine');
});

test('steering is off unless asked for, so every existing call is unchanged', () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    const out = play(seed);
    assert.strictEqual(out.stats.steers, 0);
    assert.ok(!out.lines.some((l) => l.text.startsWith('[steer]')));
  }
});

test('a steer points where it says, in a line she already has, and never at what was just asked', () => {
  const CASEDATA = require('./case');
  const stock = new Set(Object.values(CASEDATA.BASELINE));
  let steers = 0;
  for (const steer of ['answer', 'own']) {
    for (let seed = 1; seed <= 80; seed += 1) {
      const out = playCall({ agent: { choose: probe }, rng: seededRng(seed), steer });
      const cause = CASEDATA.CAUSES.find((c) => c.id === out.cause);
      const reach = cause.reach.flat();
      out.lines.forEach((l, i) => {
        if (!l.text.startsWith('[steer]')) return;
        steers += 1;
        // Something falling off the board can be noted in between.
        const said = out.lines.slice(0, i).reverse().find((x) => x.who !== 'NOTE');
        assert.strictEqual(said.who, 'HER');
        assert.ok(stock.has(said.text), `a steer must use a line she already has: ${said.text}`);
        const to = Object.keys(CASEDATA.BASELINE).find((k) => CASEDATA.BASELINE[k] === said.text);
        if (steer === 'answer') assert.ok(reach.includes(to), `seed ${seed}: ${to} is not on the cause`);
        // The inverse that matters: a caller steering toward her own belief
        // must never hand over the explanation by accident.
        if (steer === 'own') assert.ok(!reach.includes(to), `seed ${seed}: ${to} is the explanation`);
      });
      const pointed = out.view ? out.view.steered : [];
      assert.strictEqual(new Set(pointed).size, pointed.length);
    }
  }
  assert.ok(steers > 20, `too few steers to mean anything: ${steers}`);
});

test('she does not point at the same thing twice in one call', () => {
  for (let seed = 1; seed <= 80; seed += 1) {
    const out = playCall({ agent: { choose: probe }, rng: seededRng(seed), steer: 'answer' });
    const notes = out.lines.filter((l) => l.text.startsWith('[steer]')).map((l) => l.text);
    assert.strictEqual(new Set(notes).size, notes.length, `seed ${seed} steered twice to one place`);
  }
});

test('a question that was never written does not exist: asked of her, it is refused and costs the play', () => {
  const BAG = require('./bag');
  const BATCH = require('./case');
  // Asks her to confirm the first thing in front of the agent, every play.
  const readsBack = {
    choose: (view) => {
      const t = view.board.targets.find((x) => x.cls === 'customer');
      return { kind: 'play', cls: 'customer', target: t.id, suit: 'what', angle: 'verify' };
    },
  };
  for (let seed = 1; seed <= 40; seed += 1) {
    const out = playCall({ agent: readsBack, rng: seededRng(seed), scenario: BAG });
    const refusals = out.lines.filter((l) => l.who === 'NOTE' && /there is no such question/.test(l.text));
    assert.strictEqual(refusals.length, PLAYS, `seed ${seed}: a read-back was not refused`);
    // Between her opening line and the last refusal, nobody speaks: no
    // question is put and she answers none. (The call's closing exchange
    // comes after.)
    const last = out.lines.lastIndexOf(refusals[refusals.length - 1]);
    const during = out.lines.slice(1, last);
    assert.ok(!during.some((l) => l.who === 'YOU'), `seed ${seed}: the agent spoke a read-back`);
    assert.ok(!during.some((l) => l.who === 'HER'), `seed ${seed}: she answered a read-back`);
    assert.ok(!Object.keys(out.stats.pairs).some((k) => /^customer \w+\/verify$/.test(k)), 'it was counted as a play at her');
  }
  // The same policy on a scenario that does write read-backs is not refused.
  const other = playCall({ agent: readsBack, rng: seededRng(1), scenario: BATCH });
  assert.ok(!other.lines.some((l) => /there is no such question/.test(l.text)));
  // And on the bag call the record can still be verified against.
  const looksUp = {
    choose: (view) => {
      if (!view.handle) return { kind: 'identify', suit: 'what', angle: 'contract' };
      const row = view.board.targets.find((x) => x.cls === 'record');
      return row
        ? { kind: 'play', cls: 'record', target: row.id, suit: 'what', angle: 'verify' }
        : { kind: 'play', cls: 'record', target: null, suit: 'what', angle: 'expand' };
    },
  };
  const rec = playCall({ agent: looksUp, rng: seededRng(2), scenario: BAG });
  assert.ok(!rec.lines.some((l) => /there is no such question/.test(l.text)), 'a Verify at the record was refused');
  assert.ok(rec.stats.pairs['record what/verify'] && rec.stats.pairs['record what/verify'].plays > 0);
});

test('a policy is kept to questions that exist, and says what it would rather ask than repeat itself', () => {
  const { exists, sayable, makePooh, makeWatson, makeHolmes, makeTigger, makePiglet } = require('./cardAgents');
  const view = { written: { tried: ['what/expand', 'what/contract', 'how/expand'], since: ['when/expand'] } };
  assert.ok(exists(view, 'tried', 'what', 'expand'));
  assert.ok(!exists(view, 'tried', 'what', 'verify'));
  assert.ok(!exists(view, 'nothing-here', 'what', 'expand'));
  // A scenario that writes no questions has no such limit.
  assert.ok(exists({ written: null }, 'tried', 'what', 'verify'));
  assert.ok(exists({}, 'tried', 'what', 'verify'));

  const at = (angle, extra) => ({ kind: 'play', cls: 'customer', target: 'tried', suit: 'what', angle, ...extra });
  // A question that exists is left alone, and the same object comes back.
  const fine = at('expand');
  assert.strictEqual(sayable(view, fine), fine);
  // One that does not is swapped for one that does — the policy's own
  // second choice first, so coming back is not the same sentence again.
  assert.strictEqual(sayable(view, at('verify', { orElse: 'expand' })).angle, 'expand');
  assert.strictEqual(sayable(view, at('verify')).angle, 'contract');
  // A second choice that does not exist either is passed over.
  assert.strictEqual(sayable(view, at('verify', { orElse: 'validate' })).angle, 'contract');
  // Nothing to swap to: it goes through as asked, for the engine to refuse.
  const stuck = { kind: 'play', cls: 'customer', target: 'since', suit: 'who', angle: 'verify' };
  assert.strictEqual(sayable(view, stuck).angle, 'verify');
  // The record, a coworker, the dice and a remedy are none of its business.
  for (const m of [
    { kind: 'play', cls: 'record', target: 'tried', suit: 'what', angle: 'verify' },
    { kind: 'play', cls: 'coworker', target: 'bram', suit: 'what', angle: 'expand' },
    { kind: 'play', cls: 'customer', target: 'tried', suit: 'random', angle: 'random' },
    { kind: 'fix', fix: 'the-word' },
    null,
  ]) assert.strictEqual(sayable(view, m), m);
  // The move handed in is not changed.
  const frozen = Object.freeze(at('verify', { orElse: 'expand' }));
  assert.notStrictEqual(sayable(view, frozen), frozen);
  assert.strictEqual(frozen.angle, 'verify');

  // In play: no policy puts a question to her that was never written, on a
  // call where two of the policies' usual questions do not exist.
  const BAG = require('./bag');
  for (const make of [makePooh, makeWatson, makeHolmes, makeTigger, makePiglet]) {
    for (let seed = 1; seed <= 60; seed += 1) {
      const out = playCall({ agent: make({}), rng: seededRng(seed), scenario: BAG });
      assert.ok(!out.lines.some((l) => /there is no such question/.test(l.text)), `seed ${seed}: a policy asked a question that does not exist`);
      for (const pair of Object.keys(out.stats.pairs)) {
        const m = pair.match(/^customer (\w+)\/(\w+)$/);
        if (m) assert.notStrictEqual(m[2], 'verify', `seed ${seed}: a read-back was played at her`);
      }
    }
  }
});
