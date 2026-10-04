'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { BASELINE, GIVES, BELIEFS, CAUSES, SUBJECTS } = require('./case');
const { NODES, CATEGORIES, node } = require('./record');
const RECORD = { nodes: NODES };

const noSpace = (w) => !/\s/.test(w);

test('every subject opened by any GIVES entry has a BASELINE answer', () => {
  for (const [from, opens] of Object.entries(GIVES)) {
    for (const subject of opens) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(BASELINE, subject),
        `${from} opens "${subject}" which has no baseline answer (a dead end)`,
      );
    }
  }
});

test('every word in every CAUSES[].reach combination has a BASELINE answer', () => {
  for (const cause of CAUSES) {
    assert.ok(cause.reach.length > 0, `${cause.id} has no reach`);
    for (const combo of cause.reach) {
      assert.ok(combo.length > 0, `${cause.id} has an empty reach combination`);
      for (const word of combo) {
        assert.ok(word in BASELINE, `${cause.id} reach word "${word}" has no baseline answer`);
      }
    }
  }
});

test('hinted words are BASELINE keys, and hint subjects are answerable', () => {
  for (const cause of CAUSES) {
    for (const [subject, words] of Object.entries(cause.hints)) {
      // A hint may be keyed on a record category (answered by BELIEFS) as well
      // as on a word she says.
      assert.ok(
        subject in BASELINE || subject in BELIEFS,
        `${cause.id} hint subject "${subject}" is answerable by neither BASELINE nor BELIEFS`,
      );
      for (const w of words) {
        assert.ok(w in BASELINE, `${cause.id} hints "${w}" which has no baseline answer`);
      }
    }
  }
});

test('her side of the board is single words only', () => {
  for (const s of SUBJECTS) assert.ok(noSpace(s), `subject "${s}" contains a space`);
  for (const [key, vals] of Object.entries(GIVES)) {
    // A GIVES key may be a record category the player opened from the CRM
    // (settled.md:888); those are the player's side, not hers.
    assert.ok(noSpace(key) || CATEGORIES.includes(key), `GIVES key "${key}" has a space and is not a record category`);
    for (const v of vals) assert.ok(noSpace(v), `GIVES value "${v}" contains a space`);
  }
  for (const cause of CAUSES) {
    for (const combo of cause.reach) for (const w of combo) assert.ok(noSpace(w), `reach word "${w}" contains a space`);
  }
});

test('exactly four causes with distinct ids, departures and a complete fix', () => {
  assert.strictEqual(CAUSES.length, 4);
  assert.strictEqual(new Set(CAUSES.map((c) => c.id)).size, 4);
  for (const c of CAUSES) {
    assert.ok(Array.isArray(c.departures) && c.departures.length >= 2, `${c.id} needs at least two departures`);
    assert.ok(c.fix && c.fix.id && c.fix.line && c.fix.reply, `${c.id} fix needs id, line and reply`);
  }
});

test('CAUSES[].evidence names a category and a row that exist in the record, in that category', () => {
  for (const c of CAUSES) {
    // A null evidence is deliberate, not missing data: the record files what
    // was sent and never what condition it was in, so that cause leaves the
    // record silent and has to come from her.
    if (c.evidence === null) continue;
    assert.ok(c.evidence.category, `${c.id} evidence has no category`);
    assert.ok(c.evidence.row, `${c.id} evidence has no row`);
    const n = node(RECORD, c.evidence.row);
    assert.ok(n, `${c.id} evidence row "${c.evidence.row}" is not a node in record.js`);
    assert.strictEqual(n.category, c.evidence.category, `${c.id} evidence row ${n.id} is filed under "${n.category}"`);
  }
});

test('exactly one cause is invisible to the record, so Verify can come back silent', () => {
  const silent = CAUSES.filter((c) => c.evidence === null);
  assert.strictEqual(silent.length, 1, 'one cause should leave no trace in the record');
});

test('no baseline answer asserts something that varies per call', () => {
  const banned = ['this time', 'not this time', 'since I took', 'as always I'];
  for (const [subject, answer] of Object.entries(BASELINE)) {
    for (const b of banned) {
      assert.ok(!answer.toLowerCase().includes(b.toLowerCase()), `baseline "${subject}" contains "${b}"`);
    }
  }
});

test('departures do not duplicate any baseline answer', () => {
  const baselines = new Set(Object.values(BASELINE));
  for (const c of CAUSES) for (const d of c.departures) assert.ok(!baselines.has(d), `${c.id} departure equals a baseline`);
});
