'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { seededRng } = require('../call/rng');
const { SHEETS, KNOWS, shapeCall } = require('./answer');
const { BAGGAGE } = require('./bag');
const { FACTS, promptFor } = require('./prompt');

const ask = (suit, angle, subject, extra = {}) => ({ kind: 'question', suit, angle, subject, ...extra });
const MOVES = [
  ask('what', 'expand', 'working'), ask('who', 'expand', 'name'), ask('what', 'random', 'bag', { landing: 'misfire' }),
  { kind: 'paraphrase', suit: 'what', angle: 'validate', subject: 'pell', stock: true }, ask('when', 'expand', 'morning', { landing: 'critical' }),
  ask('what', 'verify', 'changed'), { kind: 'wrong-fix' }, { kind: 'blame' }, { kind: 'unclear-fix' },
];
const calls = (sheet, n = 150) => Array.from({ length: n }, (_, i) => shapeCall({ sheet, moves: MOVES, rng: seededRng(i + 1) }));

test('every thing she can hand over has a fact for the prompt', () => {
  for (const k of KNOWS) assert.ok(FACTS[k.id], k.id);
  for (const id of ['her-name', 'her-number', 'her-party', 'her-account']) assert.ok(FACTS[id], id);
});

test('the prompt carries exactly the facts she gives, and no others', () => {
  const all = Object.values(FACTS);
  for (const sheet of [SHEETS.X, SHEETS.Y]) {
    for (const call of calls(sheet)) {
      for (const { move, shape } of call) {
        const p = promptFor({ sheet, move, shape });
        assert.deepStrictEqual(p.facts, shape.gives.map((g) => FACTS[g]));
        for (const fact of all) assert.strictEqual(p.text.includes(fact), shape.gives.some((g) => FACTS[g] === fact));
      }
    }
  }
});

test('her baggage line appears only when it comes out, and only her own', () => {
  for (const sheet of [SHEETS.X, SHEETS.Y, SHEETS.Z]) {
    const others = Object.values(BAGGAGE).filter((b) => b.id !== sheet.baggage).map((b) => b.line);
    for (const call of calls(sheet, 60)) {
      for (const { move, shape } of call) {
        const p = promptFor({ sheet, move, shape });
        assert.strictEqual(p.text.includes(BAGGAGE[sheet.baggage].line), Boolean(shape.labels.baggage));
        for (const line of others) assert.ok(!p.text.includes(line));
      }
    }
  }
});

test('the same moves on the same draws give different prompts where the sheets differ', () => {
  let differ = 0;
  let total = 0;
  const xs = calls(SHEETS.X, 50);
  const ys = calls(SHEETS.Y, 50);
  xs.forEach((call, c) => call.forEach(({ move, shape }, i) => {
    total++;
    const x = promptFor({ sheet: SHEETS.X, move, shape });
    const y = promptFor({ sheet: SHEETS.Y, move, shape: ys[c][i].shape });
    if (x.text !== y.text) differ++;
  }));
  assert.ok(differ / total > 0.4, `${differ} of ${total}`);
  // Blamed, X puts it on the company and Y turns on the agent.
  const blamed = (call) => call.find((h) => h.move.kind === 'blame');
  assert.match(promptFor({ sheet: SHEETS.X, ...blamed(xs[0]) }).text, /does not blame the agent/);
  assert.match(promptFor({ sheet: SHEETS.Y, ...blamed(ys[0]) }).text, /turns on the agent/);
});

test('every prompt says how long, what she heard, and the rule against inventing', () => {
  for (const call of calls(SHEETS.Y, 40)) {
    for (const { move, shape } of call) {
      const p = promptFor({ sheet: SHEETS.Y, move, shape });
      assert.match(p.text, /^Sella Brandt, party leader of the Fairweather party/);
      assert.match(p.text, /Length: /);
      assert.match(p.text, /says nothing that is not given here/);
      assert.ok(p.heard.startsWith('The agent has just'));
      // An answer with nothing in it still leaves her something to say.
      if (!p.facts.length && shape.asked) assert.match(p.text, /answers vaguely, or not really at all/);
    }
  }
});

test('her word for the action is there when the action is in play, and not when she is giving her name', () => {
  for (const call of calls(SHEETS.Y, 40)) {
    for (const { move, shape } of call) {
      const p = promptFor({ sheet: SHEETS.Y, move, shape });
      const inPlay = move.subject === 'transfer' || shape.gives.includes('cannot-transfer') || move.kind !== 'question' && move.kind !== 'paraphrase';
      assert.strictEqual(p.text.includes('"transferring"'), inPlay);
    }
  }
});

test('what the agent actually said is quoted when it is given', () => {
  const [{ move, shape }] = calls(SHEETS.Y, 1)[0];
  const p = promptFor({ sheet: SHEETS.Y, move: { ...move, said: 'Can you tell me what is not working?' }, shape });
  assert.strictEqual(p.heard, 'The agent has just said: "Can you tell me what is not working?"');
});

test('promptFor is pure', () => {
  const [{ move, shape }] = calls(SHEETS.Y, 1)[0];
  const before = JSON.stringify({ move, shape });
  assert.deepStrictEqual(promptFor({ sheet: SHEETS.Y, move, shape }), promptFor({ sheet: SHEETS.Y, move, shape }));
  assert.strictEqual(JSON.stringify({ move, shape }), before);
});

test('a fix says what the agent said and what she now knows, so nothing has to be made up', () => {
  for (const kind of ['fix', 'wrong-fix', 'unclear-fix', 'blame']) {
    const call = shapeCall({ sheet: SHEETS.Y, moves: [{ kind }], rng: seededRng(2) });
    const p = promptFor({ sheet: SHEETS.Y, ...call[0] });
    assert.match(p.heard, /^The agent has just said: "/);
  }
  const fixed = promptFor({ sheet: SHEETS.Y, ...shapeCall({ sheet: SHEETS.Y, moves: [{ kind: 'fix' }], rng: seededRng(2) })[0] });
  assert.match(fixed.heard, /Pell can take the draught out himself/);
  assert.match(fixed.heard, /Nobody has said anything about transferring it/);
});

test('what she knows she has already said is marked as said; what she has half forgotten is not', () => {
  const ask2 = { kind: 'question', suit: 'who', angle: 'contract', subject: 'pell' };
  const call = shapeCall({ sheet: SHEETS.Y, moves: [ask2], rng: seededRng(4) });
  const { move, shape } = call[0];
  if (!shape.gives.length) return;
  const first = shape.gives[0];
  const fresh = promptFor({ sheet: SHEETS.Y, move, shape, before: SHEETS.Y });
  const remembered = promptFor({ sheet: SHEETS.Y, move, shape, before: { ...SHEETS.Y, now: { said: { [first]: 0.9 } } } });
  const faded = promptFor({ sheet: SHEETS.Y, move, shape, before: { ...SHEETS.Y, now: { said: { [first]: 0.3 } } } });
  assert.ok(!fresh.text.includes('already told them'));
  assert.ok(remembered.facts[0].endsWith('(She has already told them this, and knows it.)'));
  assert.ok(!faded.text.includes('already told them'));
});
