'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const SPEAK = require('./speak');
const BAG = require('./bag');

test('every question that can be put to her has its own answer, and nothing else does', () => {
  const asked = [];
  for (const [subject, cells] of Object.entries(BAG.QUESTIONS)) for (const k of Object.keys(cells)) asked.push(`${subject}|${k}`);
  const answered = [];
  for (const [subject, cells] of Object.entries(BAG.TALK.ANSWERS)) for (const k of Object.keys(cells)) answered.push(`${subject}|${k}`);
  assert.deepStrictEqual(answered.sort(), asked.sort());
});

test('different questions about one subject do not all get the same answer', () => {
  for (const [subject, cells] of Object.entries(BAG.TALK.ANSWERS)) {
    const lines = Object.values(cells).map((v) => (Array.isArray(v) ? v.join('|') : v));
    assert.strictEqual(new Set(lines).size, lines.length, `${subject} gives one answer to two questions`);
  }
});

test('every written line is a sentence, and the only blank is her yes', () => {
  const all = Object.values(BAG.TALK.ANSWERS)
    .flatMap((cells) => Object.values(cells))
    .flat()
    .concat(Object.values(BAG.TALK.VOLUNTEER), Object.values(BAG.TALK.REFUSALS), [BAG.TALK.NOTHING]);
  for (const line of all) {
    assert.ok(/[.?!]$/.test(line), `not a sentence: ${line}`);
    assert.ok(!/[{}]/.test(line.replace('{yes}', '')), `a blank nobody fills: ${line}`);
  }
});

test('her word for it appears in the written lines only under what she was looking for', () => {
  for (const [subject, cells] of Object.entries(BAG.TALK.ANSWERS)) {
    for (const line of Object.values(cells).flat()) {
      if (subject !== 'looking') assert.ok(!/transfer/i.test(line), `${subject} gives the word away: ${line}`);
    }
  }
  for (const line of Object.values(BAG.TALK.VOLUNTEER)) assert.ok(!/transfer/i.test(line));
  assert.ok(!('looking' in BAG.TALK.VOLUNTEER), 'the explanation is given, never volunteered');
});

test('two inquiries are said as one line with one "And" between them', () => {
  assert.strictEqual(SPEAK.agentLine(['What have you tried?']), 'What have you tried?');
  assert.strictEqual(SPEAK.agentLine(['What have you tried?', 'When did it start?']), 'What have you tried? And when did it start?');
  // The mistake this guards: "And … ? And … ?"
  assert.strictEqual(
    SPEAK.agentLine(['And the bag itself seems all right?', "Who's it for?"]),
    "The bag itself seems all right? And who's it for?",
  );
  assert.strictEqual(SPEAK.agentLine(['Which draught, exactly?', "So it's definitely in the bag?"]), "Which draught, exactly? And it's definitely in the bag?");
  assert.strictEqual(SPEAK.agentLine(['When did it start?', 'Pell — have I got the name right?']), 'When did it start? And Pell — have I got the name right?');
});

test('a name and "I" keep their capital when a sentence is joined on', () => {
  assert.strictEqual(SPEAK.lowerFirst("I've never moved anything."), "I've never moved anything.");
  assert.strictEqual(SPEAK.lowerFirst('Pell only came in the spring.'), 'Pell only came in the spring.');
  assert.strictEqual(SPEAK.lowerFirst('We are out at first light.'), 'we are out at first light.');
});

test('every line is tagged with what it introduces, and every question can eventually be asked', () => {
  const T = BAG.TALK;
  const cells = (o) => Object.entries(o).flatMap(([subject, c]) => Object.keys(c).map((k) => `${subject}|${k}`)).sort();
  assert.deepStrictEqual(cells(T.SAYS), cells(T.ANSWERS), 'an answer with no tag, or a tag with no answer');
  // Everything any line or row can introduce.
  const can = new Set(T.SAYS_OTHER.opening.concat(T.SAYS_OTHER.handle, T.SAYS_OTHER.need));
  for (const c of Object.values(T.SAYS)) for (const words of Object.values(c)) words.forEach((w) => can.add(w));
  for (const group of ['volunteer', 'baggage', 'departure', 'record']) {
    for (const words of Object.values(T.SAYS_OTHER[group])) words.forEach((w) => can.add(w));
  }
  for (const [w, also] of Object.entries(T.ALSO)) if (can.has(w)) also.forEach((x) => can.add(x));
  // The mistake this guards: a subject nobody ever introduces, or a question
  // that needs a word no line ever says, can never be reached.
  for (const subject of BAG.SUBJECTS) assert.ok(can.has(subject), `${subject} is never introduced by anything`);
  for (const [subject, c] of Object.entries(T.NEEDS)) {
    for (const [cell, needs] of Object.entries(c)) {
      assert.ok(BAG.QUESTIONS[subject] && BAG.QUESTIONS[subject][cell], `a need for a question that does not exist: ${subject} ${cell}`);
      for (const w of needs) assert.ok(can.has(w), `${subject} ${cell} needs "${w}", which no line ever says`);
    }
  }
});

test('the remedy is said with only what has been introduced', () => {
  const T = BAG.TALK;
  assert.ok(!/Pell|draught/.test(T.theWord(() => false, false)));
  assert.ok(/the draught/.test(T.theWord((w) => w === 'draught', false)));
  assert.ok(/to Pell, and it lands in his/.test(T.theWord(() => true, true)));
});
