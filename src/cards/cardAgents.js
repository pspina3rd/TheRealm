'use strict';

const CASE = require('./case');
const { SUITS, ANGLES } = require('./suits');

/**
 * Agents as policies, so the same call can be played by a competent one, a
 * random one, and anything between — which is the only way to find out
 * whether choosing a suit and an angle is a decision or decoration.
 *
 * A policy sees what the player sees (`view` in `call.js`) and never the
 * customer sheet. Nothing in here reads the hidden cause.
 */

/** Subjects the opening already put in play: shallow, and cheap to ask about. */
const SHALLOW = CASE.OPENING.words;

/**
 * A policy that plays deliberately.
 *
 * Its order of business: get a handle so the record will answer at all, grow
 * the board by opening her own words, then narrow on whatever the board has
 * surfaced that the opening did not. It reads its own bounces — a bounce is a
 * reading, so a subject that bounced once is approached with a different suit
 * rather than abandoned.
 *
 * @param {object} opts
 * @param {boolean} [opts.randomMove] - choose suit and angle at random while
 *   keeping every other decision identical. This is the Flat measurement:
 *   same targets, same priorities, only the delivery left to the dice.
 * @param {boolean} [opts.useRecord] - whether to search at all.
 */
function makeCardAgent({ name = 'apprentice', randomMove = false, useRecord = true } = {}) {
  return {
    name,
    choose(view, rng) {
      const { board, handle, known, left, asked, readings, leads, answered } = view;
      const rowsRead = asked.filter((a) => String(a).startsWith('ord-') || String(a).startsWith('inv-') || String(a).startsWith('trk-') || String(a).startsWith('case-')).length;

      // The fix, the moment there is evidence for one.
      if (known) {
        const cause = CASE.CAUSES.find((c) => c.id === known);
        return { kind: 'fix', fix: cause.fix.id, suit: 'how', angle: 'contract' };
      }

      // A handle first: the record deals nothing until she has given
      // something (settled.md:740).
      if (useRecord && !handle && left > 3) {
        return { kind: 'identify', target: 'PO-1183', suit: 'what', angle: 'contract' };
      }

      // A find in hand is worth writing down only while there is time; late
      // in the call the board is about to stop mattering.
      const find = board.targets.find((t) => t.find && !t.id.startsWith('found:'));
      if (find && board.targets.length >= 6 && left > 4) {
        return { kind: 'write', target: find.id, suit: 'what', angle: 'contract' };
      }

      // Once the record has pointed somewhere, go and ask her about it. A
      // row is a reason to talk to her, not a substitute for it.
      // The record has narrowed it to a few subjects without saying which.
      // A statement is a form of inquiry — it invites a No, which is cheaper
      // than an open question when you are fairly sure, and dearer when you
      // are wrong. Which of the leads to try is the decision.
      const untried = (leads || []).filter((l) => !answered.includes(l) && tries(readings, l) < 2);
      if (untried.length) {
        const pickOne = untried[Math.floor(rng() * untried.length)];
        return pickMove(
          { kind: 'play', cls: 'customer', target: pickOne },
          fittingSuit(pickOne, null, rng),
          'validate',
          randomMove,
          rng,
        );
      }

      // A subject that bounced once is read back rather than asked again:
      // the bounce said she would not take it cold, so offer her her own
      // words instead of a fresh question.
      const sore = readings.find(
        (r) => !answered.includes(r.subject) && tries(readings, r.subject) === 1,
      );
      if (sore) {
        return pickMove(
          { kind: 'play', cls: 'customer', target: sore.subject },
          fittingSuit(sore.subject, sore.suit, rng),
          'verify',
          randomMove,
          rng,
        );
      }

      // Read a row the record has put in play, which is where contradiction
      // and corroboration live. Three is enough: reading the whole file at
      // someone is not support.
      if (useRecord && handle && rowsRead < 3) {
        const row = board.targets.find((t) => t.cls === 'record' && !asked.includes(t.id));
        if (row) {
          return pickMove({ kind: 'play', cls: 'record', target: row.id }, 'what', 'verify', randomMove, rng);
        }
        if (!asked.some((a) => String(a).startsWith('list:'))) {
          return pickMove({ kind: 'play', cls: 'record', target: null }, 'what', 'expand', randomMove, rng);
        }
      }

      // Her side. Prefer a subject the opening did not hand over, since the
      // shallow ones are where everyone starts and nothing hides.
      const open = board.targets
        .filter((t) => t.cls === 'customer' && !t.id.startsWith('found:'))
        .map((t) => t.id)
        .filter((id) => !answered.includes(id) && tries(readings, id) < 2);
      const deep = open.filter((id) => !SHALLOW.includes(id));
      const subject = deep.length ? deep[0] : open[0];

      if (!subject) {
        // Nothing left to aim at: ask over your shoulder rather than repeat.
        return { kind: 'play', cls: 'coworker', target: 'bram', brief: 'short', suit: 'what', angle: 'expand' };
      }

      const bounced = readings.find((r) => r.subject === subject);
      const angle = deep.includes(subject) ? 'contract' : 'expand';
      // Choosing the suit that fits the subject is the skill. A bounce is a
      // reading, so a subject that bounced is approached with a different
      // one of its fitting suits rather than the same one again.
      const suit = fittingSuit(subject, bounced && bounced.suit, rng);
      return pickMove({ kind: 'play', cls: 'customer', target: subject }, suit, angle, randomMove, rng);
    },
  };
}

/** Keep the move, replace the delivery with dice if that is what is being tested. */
function pickMove(move, suit, angle, randomMove, rng) {
  if (!randomMove) return { ...move, suit, angle };
  return {
    ...move,
    suit: SUITS[Math.floor(rng() * SUITS.length)],
    angle: ANGLES[Math.floor(rng() * ANGLES.length)],
  };
}

/** How many times this subject has already bounced. */
function tries(readings, subject) {
  return readings.filter((r) => r.subject === subject).length;
}

/**
 * A suit that fits the subject, avoiding one that has already bounced.
 *
 * The fit belongs to the target (see `SUIT_FIT` in case.js). Knowing it is
 * what the player learns; a policy that picks at random is the Flat control.
 */
function fittingSuit(subject, avoid, rng) {
  const list = (CASE.SUIT_FIT[subject] || SUITS).filter((s) => s !== avoid);
  const pool = list.length ? list : CASE.SUIT_FIT[subject] || SUITS;
  return pool[Math.floor(rng() * pool.length)];
}


/**
 * Two agents built from characterisation rather than from tuning.
 *
 * A sheet for an agent is: what it does first, what it reaches for when
 * stuck, what it refuses, and what it never spends a play on. Both of these
 * use only moves the engine already has — where a trait needs a move that
 * does not exist, it is named in `TRAITS_NOT_BUILT` rather than faked.
 */

/** Traits these sheets imply and the engine cannot yet express. */
const TRAITS_NOT_BUILT = {
  watson: [
    'triage as a free opening move (are any of your people relying on these now?)',
    'acknowledging the complaint before working it',
    'taking her side against a third party, which is what answers the Need',
  ],
  holmes: [
    'asserting what she did from the record alone and sometimes being believed',
    'boredom: worse on a call with no puzzle',
    'reading her circumstances off a detail — a critical on her rather than on a row',
  ],
};

/**
 * Watson.
 *
 * An army doctor who has triaged bleeding men, so he does not catastrophise
 * and he does not perform sympathy. Not the cleverest in the building and at
 * peace with it, so he asks the obvious thing early instead of reading three
 * more rows. Writes everything down, compulsively, whether or not it is
 * convenient. Understands why somebody sends extra of the cheap ingredient.
 *
 * As a policy: her first, the record once, the note always.
 */
function makeWatson({ name = 'Watson' } = {}) {
  return {
    name,
    sheet: {
      first: 'ask her',
      whenStuck: 'ask a colleague, briefly',
      refuses: 'asserting what she did from a row alone',
      neverSpends: 'plays on a second and third row',
      recordRows: 1,
      writesEverything: true,
    },
    choose(view, rng) {
      const { board, handle, known, left, asked, readings, leads, answered } = view;
      if (known) {
        const cause = CASE.CAUSES.find((c) => c.id === known);
        return { kind: 'fix', fix: cause.fix.id, suit: 'how', angle: 'contract' };
      }

      // The note always, and early, because that is who he is rather than a
      // calculation about board space.
      const find = board.targets.find((t) => t.find && !t.id.startsWith('found:'));
      if (find) return { kind: 'write', target: find.id, suit: 'what', angle: 'contract' };

      // Her own words first. The obvious question, asked plainly.
      const open = board.targets
        .filter((t) => t.cls === 'customer' && !t.id.startsWith('found:'))
        .map((t) => t.id)
        .filter((id) => !answered.includes(id) && tries(readings, id) < 2);
      const lead = (leads || []).find((l) => open.includes(l));
      const subject = lead || open.find((id) => !SHALLOW.includes(id)) || open[0];
      // Two questions of her first, then the handle. Without the second
      // clause he never stops asking and never searches at all.
      if (subject && (asked.length < 2 || lead)) {
        const bounced = readings.find((r) => r.subject === subject);
        return {
          kind: 'play',
          cls: 'customer',
          target: subject,
          suit: fittingSuit(subject, bounced && bounced.suit, rng),
          angle: bounced ? 'verify' : 'contract',
        };
      }

      // One handle, one row, and no more file-reading than that.
      if (!handle && left > 3) return { kind: 'identify', target: 'PO-1183', suit: 'what', angle: 'contract' };
      const rowsRead = asked.filter((a) => REC_ID.test(String(a))).length;
      if (handle && rowsRead < 1) {
        const listed = asked.some((a) => String(a).startsWith('list:'));
        if (!listed) return { kind: 'play', cls: 'record', target: null, suit: 'what', angle: 'expand' };
        const row = board.targets.find((t) => t.cls === 'record' && !asked.includes(t.id));
        if (row) return { kind: 'play', cls: 'record', target: row.id, suit: 'what', angle: 'verify' };
      }

      if (subject) {
        const bounced = readings.find((r) => r.subject === subject);
        return {
          kind: 'play',
          cls: 'customer',
          target: subject,
          suit: fittingSuit(subject, bounced && bounced.suit, rng),
          angle: bounced ? 'verify' : 'expand',
        };
      }
      return { kind: 'play', cls: 'coworker', target: 'bram', brief: 'short', suit: 'what', angle: 'expand' };
    },
  };
}

/**
 * Holmes.
 *
 * Observes rather than asks; a question is what you resort to when the
 * evidence has run out. Withholds until certain, then delivers the whole
 * thing at once. The client's feelings are not cruelty targets, they are
 * simply not data. Reads the file exactly as far as it serves him and no
 * further, and has no use for the note.
 *
 * As a policy: the record first and at length, her only to confirm, and the
 * fix offered the moment he is sure — which in this engine means offered
 * before she has said anything, because a row is enough for him.
 */
function makeHolmes({ name = 'Holmes', assertFromRecord = true } = {}) {
  return {
    name,
    sheet: {
      first: 'the record',
      whenStuck: 'read another row',
      refuses: 'writing anything down',
      neverSpends: 'plays on how she feels about it',
      recordRows: 4,
      writesEverything: false,
    },
    choose(view, rng) {
      const { board, handle, known, asked, leads, answered, readings, refused } = view;
      if (known) {
        const cause = CASE.CAUSES.find((c) => c.id === known);
        return { kind: 'fix', fix: cause.fix.id, suit: 'how', angle: 'contract' };
      }
      if (!handle) return { kind: 'identify', target: 'PO-1183', suit: 'what', angle: 'contract' };

      const listed = asked.some((a) => String(a).startsWith('list:'));
      if (!listed) return { kind: 'play', cls: 'record', target: null, suit: 'what', angle: 'expand' };

      const rowsRead = asked.filter((a) => REC_ID.test(String(a))).length;
      const row = board.targets.find((t) => t.cls === 'record' && !asked.includes(t.id));
      if (row && rowsRead < 4 && !(leads || []).length) {
        return { kind: 'play', cls: 'record', target: row.id, suit: 'what', angle: 'verify' };
      }

      // He is sure, so he says so. The engine refuses a fix she has not
      // confirmed; that refusal is the point of running him.
      const guess = (leads || []).find((l) => !answered.includes(l) && tries(readings, l) < 2);
      if (guess) {
        // He asserts once. Being told no is data, and he does not repeat
        // himself; after that he asks her, which he considers a concession.
        if (assertFromRecord && !refused.length && !readings.length) {
          const cause = CASE.CAUSES.find((c) => (c.reach[0] || [])[0] === guess);
          if (cause) return { kind: 'fix', fix: cause.fix.id, suit: 'how', angle: 'contract' };
        }
        return {
          kind: 'play',
          cls: 'customer',
          target: guess,
          suit: fittingSuit(guess, null, rng),
          angle: 'validate',
        };
      }
      if (row) return { kind: 'play', cls: 'record', target: row.id, suit: 'what', angle: 'verify' };
      const open = board.targets
        .filter((t) => t.cls === 'customer' && !t.id.startsWith('found:'))
        .map((t) => t.id)
        .filter((id) => !answered.includes(id));
      if (open.length) {
        return { kind: 'play', cls: 'customer', target: open[0], suit: fittingSuit(open[0], null, rng), angle: 'validate' };
      }
      return { kind: 'play', cls: 'coworker', target: 'bram', brief: 'long', suit: 'what', angle: 'expand' };
    },
  };
}

/** Record row ids, for counting how much of the file has been read. */
const REC_ID = /^(ord|inv|trk|case)-/;

module.exports = { makeCardAgent, makeWatson, makeHolmes, TRAITS_NOT_BUILT };
