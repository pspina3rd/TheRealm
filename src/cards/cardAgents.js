'use strict';

const { SUITS, ANGLES } = require('./suits');

/**
 * Agents as policies, so the same call can be played by a competent one, a
 * random one, and anything between — which is the only way to find out
 * whether choosing a suit and an angle is a decision or decoration.
 *
 * A policy sees what the player sees (`view` in `call.js`) and never the
 * customer sheet. Nothing in here reads the hidden cause.
 */

/**
 * A policy knows nothing about the scenario.
 *
 * Everything a sheet is allowed to reason about arrives in the view: which
 * suits fit a subject, which remedies her words point at, which words she
 * opened with. A policy that imported the scenario could read the answer
 * key's own shape, which is how I handed Holmes a cause he had not earned.
 */
function shallow(view) {
  return view.opening || [];
}

/**
 * Whether a question exists to be put to her on this call.
 *
 * Where the scenario writes its questions out (`view.written`), one that is
 * not written does not exist: an inquiry to a target has to make some sort of
 * sense (Phil, 10 October), and the questions that do are the written ones.
 * A scenario with no written questions has no such limit.
 *
 * @param {{written?: Object<string, string[]>|null}} view
 * @param {string} subject
 * @param {string} suit
 * @param {string} angle
 * @returns {boolean}
 */
function exists(view, subject, suit, angle) {
  return !view.written || (view.written[subject] || []).includes(`${suit}/${angle}`);
}

/** What to try instead, by the angle that turned out not to exist. */
const INSTEAD = {
  verify: ['contract', 'expand', 'validate'],
  validate: ['contract', 'expand'],
  contract: ['expand', 'validate'],
  expand: ['contract', 'validate'],
};

/**
 * A policy's move, kept to questions that exist.
 *
 * A policy names a suit and an angle without knowing whether that question
 * was ever written for that subject. Where it was not, this swaps the angle
 * for one that was: the move's own `orElse` first — a policy coming back to
 * something says what it would rather ask than repeat itself — then the
 * nearest other angle. A move at the record, a coworker, or left to the dice
 * passes through untouched, as does one with nothing to swap to (the engine
 * refuses it). The move passed in is not changed.
 *
 * @param {object} view
 * @param {object|null} move
 * @returns {object|null}
 */
function sayable(view, move) {
  if (!move || move.kind !== 'play' || move.cls !== 'customer') return move;
  if (!ANGLES.includes(move.angle) || !SUITS.includes(move.suit)) return move;
  if (exists(view, move.target, move.suit, move.angle)) return move;
  const tries = [move.orElse].concat(INSTEAD[move.angle] || []).filter(Boolean);
  const angle = tries.find((a) => exists(view, move.target, move.suit, a));
  return angle ? { ...move, angle } : move;
}


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
      const { board, handle, candidates, refused, left, asked, readings, leads, answered } = view;
      const rowsRead = view.rowsRead;

      // A remedy the moment her own words point at one.
      if (candidates && candidates.length) {
        const offer = offerRemedy(candidates, refused, 'first', rng);
        if (offer) return offer;
      }

      // A handle first: the record deals nothing until she has given
      // something (settled.md:740).
      if (useRecord && !handle && left > 3) {
        return { kind: 'identify', suit: 'what', angle: 'contract' };
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
        const bouncedBefore = readings.find((r) => r.subject === pickOne);
        return pickMove(
          { kind: 'play', cls: 'customer', target: pickOne },
          fittingSuit(view, pickOne, bouncedBefore && bouncedBefore.suit, rng),
          // Coming back to a lead that bounced, put it a different way
          // rather than saying the same sentence twice.
          bouncedBefore ? 'contract' : 'validate',
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
          fittingSuit(view, sore.subject, sore.suit, rng),
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
      const deep = open.filter((id) => !shallow(view).includes(id));
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
      const suit = fittingSuit(view, subject, bounced && bounced.suit, rng);
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
function fittingSuit(view, subject, avoid, rng) {
  const fits = (view.fit && view.fit[subject]) || SUITS;
  const list = fits.filter((s) => s !== avoid);
  const pool = list.length ? list : fits;
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
  pooh: [
    'saying plainly that he has not understood, which is an honest move and not a wasted play',
    'sitting with it — a play that spends time rather than asking anything',
  ],
  rabbit: ['refusing to proceed until a field is filled in, as a move aimed at her'],
  tigger: ['enthusiasm as a thing she can be carried along by, or worn down by'],
  piglet: [
    'apologising, which is a move with a target and a cost',
    'reassurance as an aura that softens what came before (settled.md:801)',
  ],
  eeyore: ['saying out loud that it probably will not work, which is a real thing agents do'],
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
      const { board, handle, candidates, refused, left, asked, readings, leads, answered } = view;
      // Watson would rather be sure: with more than one remedy in play he
      // asks her again before offering one.
      if (candidates && candidates.length) {
        const only = candidates.filter((c) => !(refused || []).includes(c));
        if (only.length === 1 || left <= 2) {
          const offer = offerRemedy(candidates, refused, 'first', rng);
          if (offer) return offer;
        }
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
      const subject = lead || open.find((id) => !shallow(view).includes(id)) || open[0];
      // Two questions of her first, then the handle. Without the second
      // clause he never stops asking and never searches at all.
      if (subject && (asked.length < 2 || lead)) {
        const bounced = readings.find((r) => r.subject === subject);
        return {
          kind: 'play',
          cls: 'customer',
          target: subject,
          suit: fittingSuit(view, subject, bounced && bounced.suit, rng),
          angle: bounced ? 'verify' : 'contract',
          // Coming back with no read-back to make, ask wider, not the same again.
          orElse: 'expand',
        };
      }

      // One handle, one row, and no more file-reading than that.
      if (!handle && left > 3) return { kind: 'identify', suit: 'what', angle: 'contract' };
      if (handle && view.rowsRead < 1) {
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
          suit: fittingSuit(view, subject, bounced && bounced.suit, rng),
          angle: bounced ? 'verify' : 'expand',
          // Coming back with no read-back to make, ask narrower, not the same again.
          orElse: 'contract',
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
      const { board, handle, candidates, asked, leads, answered, readings, refused } = view;
      // The most recent evidence is the best evidence, as far as he is
      // concerned.
      if (candidates && candidates.length) {
        const offer = offerRemedy(candidates, refused, 'last', rng);
        if (offer) return offer;
      }
      if (!handle) return { kind: 'identify', suit: 'what', angle: 'contract' };

      const listed = asked.some((a) => String(a).startsWith('list:'));
      if (!listed) return { kind: 'play', cls: 'record', target: null, suit: 'what', angle: 'expand' };

      const row = board.targets.find((t) => t.cls === 'record' && !asked.includes(t.id));
      if (row && view.rowsRead < 4 && !(leads || []).length) {
        return { kind: 'play', cls: 'record', target: row.id, suit: 'what', angle: 'verify' };
      }

      // He is sure, so he says so. The engine refuses a fix she has not
      // confirmed; that refusal is the point of running him.
      const guess = (leads || []).find((l) => !answered.includes(l) && tries(readings, l) < 2);
      if (guess) {
        // He asserts once. Being told no is data, and he does not repeat
        // himself; after that he asks her, which he considers a concession.
        if (assertFromRecord && !refused.length && !readings.length) {
          const offer = offerRemedy(candidates, refused, 'last', rng);
          if (offer) return offer;
        }
        return {
          kind: 'play',
          cls: 'customer',
          target: guess,
          suit: fittingSuit(view, guess, null, rng),
          angle: 'validate',
        };
      }
      if (row) return { kind: 'play', cls: 'record', target: row.id, suit: 'what', angle: 'verify' };
      // Twice at the same subject and no more: a third check of the same
      // thing is dangerous for anyone (settled.md:1036), and a policy that
      // asks it seven times is not characterisation, it is a loop.
      const open = board.targets
        .filter((t) => t.cls === 'customer' && !t.id.startsWith('heard:'))
        .map((t) => t.id)
        .filter((id) => !answered.includes(id) && tries(readings, id) < 2);
      if (open.length) {
        const subject = open[0];
        return {
          kind: 'play',
          cls: 'customer',
          target: subject,
          suit: fittingSuit(view, subject, null, rng),
          angle: 'validate',
        };
      }
      return { kind: 'play', cls: 'coworker', target: 'bram', brief: 'long', suit: 'what', angle: 'expand' };
    },
  };
}


/**
 * The Hundred Acre Wood, as five agent sheets.
 *
 * Characterisation rather than tuning: each one is a disposition — what it
 * does first, what it reaches for when stuck, what it refuses, what it never
 * spends a play on — expressed only in moves the engine already has. Traits
 * that would need a move that does not exist are named in
 * `TRAITS_NOT_BUILT` rather than faked.
 *
 * Milne's 1926 and 1928 books are public domain in the US; what is borrowed
 * here is behaviour, not prose.
 */

/** Her own words, in the order she said them. */
function herWords(view) {
  return view.board.targets
    .filter((t) => t.cls === 'customer' && !t.id.startsWith('found:'))
    .map((t) => t.id)
    .filter((id) => !view.answered.includes(id) && tries(view.readings, id) < 3);
}

/** A row the record has put in play and nobody has read. */
function unreadRow(view) {
  return view.board.targets.find((t) => t.cls === 'record' && !view.asked.includes(t.id));
}

/**
 * Offer one of the remedies her departures could point to.
 *
 * The engine no longer hands a policy the answer: hearing what she did
 * yields two or three remedies it might be, and choosing is the play. A
 * remedy she has already refused is not offered again.
 *
 * @param {string[]} candidates
 * @param {string[]} refused
 * @param {'first'|'last'|'random'} how - the sheet's habit.
 */
function offerRemedy(candidates, refused, how, rng) {
  const left = (candidates || []).filter((c) => !(refused || []).includes(c));
  if (!left.length) return null;
  const pickOne =
    how === 'last'
      ? left[left.length - 1]
      : how === 'random'
        ? left[Math.floor(rng() * left.length)]
        : left[0];
  return { kind: 'fix', fix: pickOne, suit: 'how', angle: 'contract' };
}

/**
 * Pooh.
 *
 * Slow, literal and unhurried. Says plainly when he does not understand,
 * asks the simple thing nobody thought to ask, and gets there by staying
 * with it rather than by being clever. Never performs expertise.
 *
 * As a policy: her, almost entirely. He is the purest customer-first player,
 * which makes him the test of whether the engine has a viable way to play
 * that is not "read the file and treat her as confirmation".
 */
function makePooh({ name = 'Pooh' } = {}) {
  return {
    name,
    sheet: {
      first: 'ask her something simple',
      whenStuck: 'ask her the same thing a different way',
      refuses: 'hurrying her',
      neverSpends: 'plays on the file',
      recordRows: 0,
    },
    choose(view, rng) {
      const { candidates, refused, leads, readings, left } = view;
      const offer = offerRemedy(candidates, refused, 'first', rng);
      if (offer) return offer;

      // A lead is still a thing she might know about, so he asks her.
      const lead = (leads || []).find((l) => herWords(view).includes(l));
      const open = herWords(view);
      const subject = lead || open[0];

      if (subject) {
        const bounced = readings.find((r) => r.subject === subject);
        return {
          kind: 'play',
          cls: 'customer',
          target: subject,
          // He comes back to the same thing with a different suit rather
          // than giving up on it, which is what a bounce is for.
          suit: fittingSuit(view, subject, bounced && bounced.suit, rng),
          angle: bounced ? 'verify' : 'expand',
          // Coming back with no read-back to make, ask narrower, not the same again.
          orElse: 'contract',
        };
      }

      // Only when she has nothing left to say does he look anything up.
      if (!view.handle && left > 2) return { kind: 'identify', suit: 'what', angle: 'contract' };
      if (view.handle && !view.asked.some((a) => String(a).startsWith('list:'))) {
        return { kind: 'play', cls: 'record', target: null, suit: 'what', angle: 'expand' };
      }
      const row = unreadRow(view);
      if (row) return { kind: 'play', cls: 'record', target: row.id, suit: 'what', angle: 'verify' };
      return { kind: 'play', cls: 'coworker', target: 'bram', brief: 'short', suit: 'what', angle: 'expand' };
    },
  };
}

/**
 * Rabbit.
 *
 * Organised, officious, has a procedure and expects it to be followed.
 * Assumes he knows best and is irritated by deviation. Keeps records
 * because records are proper.
 *
 * As a policy: the whole file, in order, before a word to her — which is the
 * Custom Container line turning into a checklist item, the thing the record
 * warns about by name (settled.md:727). He is how that warning gets
 * measured instead of merely honoured.
 */
function makeRabbit({ name = 'Rabbit' } = {}) {
  return {
    name,
    sheet: {
      first: 'the handle, then every row in order',
      whenStuck: 'read the next row',
      refuses: 'improvising',
      neverSpends: 'plays on how she is taking it',
      recordRows: 99,
      writesEverything: true,
    },
    choose(view, rng) {
      const { candidates, refused, handle, leads, board, asked } = view;
      // In the order they were written down.
      const offer = offerRemedy(candidates, refused, 'first', rng);
      if (offer) return offer;

      const find = board.targets.find((t) => t.find && !t.id.startsWith('found:'));
      if (find) return { kind: 'write', target: find.id, suit: 'what', angle: 'contract' };

      if (!handle) return { kind: 'identify', suit: 'what', angle: 'contract' };
      if (!asked.some((a) => String(a).startsWith('list:'))) {
        return { kind: 'play', cls: 'record', target: null, suit: 'what', angle: 'expand' };
      }
      const row = unreadRow(view);
      if (row) return { kind: 'play', cls: 'record', target: row.id, suit: 'what', angle: 'verify' };

      // The file is exhausted, so now she may be consulted, in the order the
      // leads were written down.
      const open = herWords(view);
      const subject = (leads || []).find((l) => open.includes(l)) || open[0];
      if (subject) {
        return {
          kind: 'play',
          cls: 'customer',
          target: subject,
          suit: fittingSuit(view, subject, null, rng),
          angle: 'contract',
        };
      }
      return { kind: 'play', cls: 'coworker', target: 'bram', brief: 'long', suit: 'what', angle: 'expand' };
    },
  };
}

/**
 * Tigger.
 *
 * Bounces first. Reads nothing, is certain he can fix it, and is not
 * discouraged by being wrong. The honest version of a confident new
 * apprentice, which is a better control than dice because dice are not a
 * person.
 *
 * As a policy: offer a remedy early and often, ask her as statements, never
 * look anything up.
 */
function makeTigger({ name = 'Tigger' } = {}) {
  return {
    name,
    sheet: {
      first: 'a remedy, straight off',
      whenStuck: 'another remedy',
      refuses: 'reading the file',
      neverSpends: 'plays on getting a reference number',
    },
    choose(view, rng) {
      const { candidates, refused, readings } = view;
      const offer = offerRemedy(candidates, refused, 'random', rng);
      if (offer) return offer;

      // He will try a remedy he has not tried yet whenever he fancies it.
      // He will try any remedy he has heard of and not yet had refused.
      const untried = (view.remedies || []).filter((f) => !refused.includes(f));
      if (untried.length && rng() < 0.4) {
        return { kind: 'fix', fix: untried[Math.floor(rng() * untried.length)], suit: 'how', angle: 'contract' };
      }

      const open = herWords(view);
      if (open.length) {
        const subject = open[Math.floor(rng() * open.length)];
        const bounced = readings.find((r) => r.subject === subject);
        return {
          kind: 'play',
          cls: 'customer',
          target: subject,
          suit: fittingSuit(view, subject, bounced && bounced.suit, rng),
          angle: 'validate',
        };
      }
      const last = (view.remedies || []).find((f) => !refused.includes(f));
      return last
        ? { kind: 'fix', fix: last, suit: 'how', angle: 'contract' }
        : { kind: 'play', cls: 'coworker', target: 'bram', brief: 'short', suit: 'what', angle: 'expand' };
    },
  };
}

/**
 * Piglet.
 *
 * Anxious, apologetic, and unwilling to bother anybody. Will not put her on
 * hold, will not ask a colleague, will not escalate — he absorbs the whole
 * nine himself. Lovely, and the customer is no better off.
 *
 * As a policy: her, gently, and nobody else. He is the only one of the five
 * who makes the Hold card's six requirements earn their keep, by refusing to
 * use it.
 */
function makePiglet({ name = 'Piglet' } = {}) {
  return {
    name,
    sheet: {
      first: 'ask her, carefully',
      whenStuck: 'ask her something easier',
      refuses: 'holding, escalating, or bothering a colleague',
      neverSpends: 'plays on anyone but her',
    },
    choose(view, rng) {
      const { candidates, refused, leads, readings, handle, left } = view;
      const offer = offerRemedy(candidates, refused, 'first', rng);
      if (offer) return offer;

      const open = herWords(view);
      // He prefers the easy ground: what she has already brought up herself.
      const easy = open.filter((id) => shallow(view).includes(id));
      const lead = (leads || []).find((l) => open.includes(l));
      const subject = easy[0] || lead || open[0];

      if (subject) {
        const bounced = readings.find((r) => r.subject === subject);
        return {
          kind: 'play',
          cls: 'customer',
          target: subject,
          suit: fittingSuit(view, subject, bounced && bounced.suit, rng),
          angle: bounced ? 'validate' : 'expand',
        };
      }
      if (!handle && left > 1) return { kind: 'identify', suit: 'what', angle: 'contract' };
      if (handle && !view.asked.some((a) => String(a).startsWith('list:'))) {
        return { kind: 'play', cls: 'record', target: null, suit: 'what', angle: 'expand' };
      }
      const row = unreadRow(view);
      if (row) return { kind: 'play', cls: 'record', target: row.id, suit: 'what', angle: 'verify' };
      // Rather than trouble anybody, he asks her one more time.
      const again = view.board.targets.filter((t) => t.cls === 'customer').map((t) => t.id)[0];
      return again
        ? { kind: 'play', cls: 'customer', target: again, suit: fittingSuit(view, again, null, rng), angle: 'verify' }
        : { kind: 'play', cls: 'customer', target: 'draughts', suit: 'what', angle: 'verify' };
    },
  };
}

/**
 * Eeyore.
 *
 * Expects it not to work and says so in advance. Does the work anyway, with
 * no confidence in it, and reaches for the case early because somebody else
 * will have to deal with this eventually.
 *
 * As a policy: competent enough, slow to commit, and quick to put it in
 * writing and let it go — which puts a real number on what hesitation costs.
 */
function makeEeyore({ name = 'Eeyore' } = {}) {
  return {
    name,
    sheet: {
      first: 'the handle, and low expectations',
      whenStuck: 'the case',
      refuses: 'believing a lead the first time',
      neverSpends: 'plays on being certain',
      recordRows: 2,
    },
    choose(view, rng) {
      const { candidates, refused, handle, leads, asked, readings, left, board, heard } = view;

      // Even with the answer he checks it once more before saying it, which
      // costs a play he usually does not have.
      if (candidates && candidates.length) {
        // Even with something to offer he checks it once more, which costs a
        // play he usually does not have.
        if (left > 1 && heard.length && rng() < 0.5) {
          const w = heard[heard.length - 1].subject;
          if (board.targets.some((t) => t.id === w) && !readings.some((r) => r.subject === w)) {
            // Where nothing can be read back to her there is no such check
            // to make, and he goes on to the offer.
            const suit = fittingSuit(view, w, null, rng);
            if (exists(view, w, suit, 'verify')) return { kind: 'play', cls: 'customer', target: w, suit, angle: 'verify' };
          }
        }
        const offer = offerRemedy(candidates, refused, 'first', rng);
        if (offer) return offer;
      }

      if (!handle && left > 4) return { kind: 'identify', suit: 'what', angle: 'contract' };
      if (handle && !asked.some((a) => String(a).startsWith('list:'))) {
        return { kind: 'play', cls: 'record', target: null, suit: 'what', angle: 'expand' };
      }
      if (handle && view.rowsRead < 2) {
        const row = unreadRow(view);
        if (row) return { kind: 'play', cls: 'record', target: row.id, suit: 'what', angle: 'verify' };
      }

      // Nothing has come of it, so it goes on the case and somebody else can
      // have it. This is a real ending, not a failure state.
      if (left <= 3 && !(leads || []).length) {
        return { kind: 'hold', brief: 'short', suit: 'what', angle: 'expand' };
      }

      const open = herWords(view);
      const lead = (leads || []).find((l) => open.includes(l));
      const subject = lead || open[0];
      if (subject) {
        const bounced = readings.find((r) => r.subject === subject);
        return {
          kind: 'play',
          cls: 'customer',
          target: subject,
          suit: fittingSuit(view, subject, bounced && bounced.suit, rng),
          angle: bounced ? 'verify' : 'contract',
          // Coming back with no read-back to make, ask wider, not the same again.
          orElse: 'expand',
        };
      }
      return { kind: 'hold', brief: 'short', suit: 'what', angle: 'expand' };
    },
  };
}


/** Every policy is kept to questions that exist, in one place. */
const kept = (make) => (opts) => {
  const agent = make(opts);
  return { ...agent, choose: (view, rng) => sayable(view, agent.choose(view, rng)) };
};

module.exports = {
  makeCardAgent: kept(makeCardAgent),
  makeWatson: kept(makeWatson),
  makeHolmes: kept(makeHolmes),
  makePooh: kept(makePooh),
  makeRabbit: kept(makeRabbit),
  makeTigger: kept(makeTigger),
  makePiglet: kept(makePiglet),
  makeEeyore: kept(makeEeyore),
  exists,
  sayable,
  TRAITS_NOT_BUILT,
};
