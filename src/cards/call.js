'use strict';

const CASE = require('./case');
const REC = require('./record');
const SHEET = require('./sheet');
const BOARD = require('./board');
const { SUITS, ANGLES, legal, resolveRandom, RANDOM } = require('./suits');

/**
 * One call, played with cards.
 *
 * Nine plays, the opening free (settled.md:737, :772). Every play is one
 * suit, one angle, one target (settled.md:922), and the target's class
 * decides the result: the customer decides, the record responds, the
 * coworker decides (settled.md:847). The player is the catalyst for how it
 * is delivered, and the recipient's perception of that choice affects the
 * answer (settled.md:853) — which is why delivery is live for the two
 * classes with a mind and inert for the record.
 *
 * The numbers in here are guesses. They are written in one place so the
 * measurements in `scripts/cardsAudit.js` can refute them.
 */

/** Nine plays. The opening is free and not charged. */
const PLAYS = 9;

/** How the dice are weighted. Every one of these is a guess to be measured. */
const TUNING = {
  // A landing against a ward: fitness known lands outright, learnable rolls.
  landChance: { known: 1, learnable: 0.62, unknowable: 0 },
  // The angle's fit with what is being attempted.
  angleBonus: { contract: 0.12, expand: 0.06, verify: 0.04, validate: 0 },
  // A statement is a form of inquiry: a confirmation that invites a No. It
  // is strong when the guess is close and poor when it is not, which is why
  // it is a decision rather than a safer question.
  validateRight: 0.3,
  validateWrong: -0.45,
  // A run of statements reads as guessing.
  statementRun: -0.3,
  // A third check of the same thing inside three turns (settled.md:1031).
  repeatPenalty: 0.35,
  // How often a landing also criticals.
  criticalChance: 0.17,
  // How much her patience is worth as a bonus, per point above 3.
  patienceBonus: 0.04,
  // Asking the right subject when the record has already pointed at it.
  leadBonus: 0.2,
  // A suit that fits the subject against one that does not. This is the
  // whole of the suit decision: if these two are close, choosing is
  // decoration.
  suitFits: 0.25,
  suitWrong: -0.3,
};

/** The coworker, who has a sheet, a preferred method, and baggage. */
const COWORKER = {
  name: 'Bram',
  // What he wants a brief to be. A good brief delivered the wrong way
  // still bounces (settled.md:1289).
  prefers: 'short',
  baggage: 'asked the same thing twice in one week',
  // Uneven batches are the thing he is asked about most, and the record
  // says the answer to those is sharing knowledge (settled.md:456).
  knows: ['shared-roll', 'oversupplied', 'mixed-sourcing'],
};

/**
 * Play a call.
 *
 * @param {object} args
 * @param {object} args.agent - a policy; see `cardAgents.js`.
 * @param {() => number} args.rng - injected; nothing calls Math.random.
 * @param {string} [args.baggage] - which baggage she carries.
 * @param {number} [args.causeIndex] - force the hidden cause, for tests.
 * @param {number} [args.plays] - the budget, for measuring what nine buys
 *   against other numbers. Nine unless a measurement says otherwise.
 * @param {'answer'|'own'} [args.steer] - **[C] an experiment, off by
 *   default.** On a miss she volunteers a subject instead of deflecting:
 *   `answer` is a caller who points at what would explain it (the customer at
 *   the training table), `own` one who points at what she believes matters
 *   (settled.md §8, Steering). The words are her existing line on that
 *   subject; nothing is written for it. Which callers steer, and how often,
 *   is the sheet's to say and is not decided here.
 * @returns {{ending: string, cause: string, found: boolean, plays: number,
 *   lines: object[], board: object, sheet: object, stats: object}} — or, when
 *   the agent returns `{kind: 'pause'}`, the same shape with `paused: true`,
 *   `ending: null` and the `view` it was shown, so a person can be asked for
 *   the next move and the call replayed from its seed.
 */
function playCall({ agent, rng, baggage, causeIndex, scenario, plays, steer }) {
  // The scenario is data. `case.js` is the default only because it was
  // first; nothing in the loop knows which call it is playing.
  const sc = scenario || CASE;
  const rec = sc.record || REC.RECORD;
  // Her baggage comes from the scenario when it carries its own, because a
  // trigger has to sit on subjects this call actually has.
  const kinds = sc.BAGGAGE || SHEET.BAGGAGE;
  const bagKey = baggage || pick(Object.keys(kinds), rng);
  let sheet = SHEET.newSheet({
    who: sc.CALLER.name,
    baggage: kinds[bagKey] || bagKey,
    rng,
    subjects: sc.SUBJECTS,
  });
  const cause =
    typeof causeIndex === 'number' ? sc.CAUSES[causeIndex] : pick(sc.CAUSES, rng);

  let board = BOARD.newBoard(sc.OPENING.words);
  const budget = Number.isInteger(plays) && plays > 0 ? plays : PLAYS;
  let left = budget;
  // Subjects she has pointed at on a miss. Only ever filled when `steer` is
  // on.
  const steered = [];
  const lines = [];
  const recent = [];
  const readings = [];
  const asked = [];
  // Subjects she actually answered. A bounce is a reading, not a closed
  // door, so a bounced subject stays open to be come back to.
  const answered = [];
  // Fixes she has turned down. A policy that cannot see this offers the same
  // remedy until the call runs out, which is not characterisation, it is a
  // loop.
  const refused = [];
  const stats = {
    pairs: {},
    bounces: 0,
    criticals: 0,
    unearned: 0,
    identified: false,
    needSeen: false,
    needOblique: false,
    corroborated: false,
    coworkerLeads: 0,
    dropped: 0,
    escalated: false,
    autoPlayed: null,
    fragments: 0,
    customerPlays: 0,
    customerPlaysBeforeFind: null,
    ledLead: false,
    steers: 0,
  };
  // What she has actually told you, which is the only thing a fix can rest
  // on. The record can corroborate a reason by holding the facts that must be
  // true if it is real, but it cannot put words in her mouth: a fix played on
  // a row alone is the agent telling the customer what she did, and she will
  // say she did no such thing.
  let known = null;
  let suspect = null;
  let lastWasDeparture = false;
  // The subjects a corroborating row points at. They are put in play when it
  // is read, because a lead is the record handing you something to aim at —
  // a hit yields targets (settled.md:863).
  let leadSubjects = [];
  // What she has said she did differently. Each one is true; at most one of
  // them explains the symptom. The engine knows which; the player does not.
  const heard = [];
  // Which innocent departures are live this call, and how many.
  const herringSubjects = rollHerrings(sc, cause, rng);
  // Fragments she has already handed over. She repairs a slip once.
  const fragmentsGiven = [];
  let foundTurn = null;
  let handle = null;
  let ending = null;

  say(lines, 'HER', sc.OPENING.line);
  say(lines, 'NOTE', `[free] opening — board: ${board.targets.map((t) => t.id).join(', ')}`);

  while (left > 0 && !ending) {
    // What the agent is allowed to see. Never the sheet: her wards, her
    // patience and her baggage are hers, and a policy that read them would
    // be scoring itself against an answer key.
    const view = {
      left,
      board,
      handle,
      // The remedies her departures could point to, first heard first. Never
      // which one is right: a cause is not necessarily THE cause
      // (settled.md:793).
      candidates: candidatesFrom(heard),
      // The scenario's shape, as much of it as a policy may see: which suits
      // fit which subject, what she opened with, and every remedy that
      // exists. Never the causes, and never which remedy is right.
      fit: sc.SUIT_FIT,
      opening: sc.OPENING.words,
      remedies: sc.REMEDIES ? Object.keys(sc.REMEDIES) : sc.CAUSES.map((c) => c.fix.id),
      // The questions that exist to be put to her, by subject, where the
      // scenario writes them out — so a policy need not spend a play finding
      // out that one does not.
      written: sc.QUESTIONS
        ? Object.fromEntries(Object.entries(sc.QUESTIONS).map(([s, cells]) => [s, Object.keys(cells)]))
        : null,
      // Counted by the engine. Policies used to count rows by matching id
      // prefixes, which were one scenario's paperwork hard-coded into every
      // sheet, so on another call they all believed they had read nothing.
      rowsRead: Object.entries(stats.pairs)
        .filter(([k]) => k.startsWith('record '))
        .reduce((a, [, v]) => a + v.plays, 0),
      heard: heard.map((h) => ({ subject: h.subject, suggests: h.suggests.slice() })),
      recent: recent.slice(-3),
      // Who is free and how he likes to be asked — never what he knows,
      // which is the cause list by another name and is his to tell you.
      coworker: { name: COWORKER.name, prefers: COWORKER.prefers },
      readings: readings.slice(),
      asked: asked.slice(),
      answered: answered.slice(),
      refused: refused.slice(),
      // Two or three subjects the facts would fit, never which one is right
      // (settled.md:930). Handing over the exact subject would end the hunt
      // on one roll.
      leads: leadSubjects.slice(),
      steered: steered.slice(),
      // What a find in play is called, so a person can be shown it.
      label: sc.label,
    };
    const move = agent.choose(view, rng);
    if (!move) break;
    // A person's turn. Nothing is charged and nothing is closed: the caller
    // replays the call from its seed with one more move.
    if (move.kind === 'pause') {
      return {
        paused: true,
        view,
        refused: refused.slice(),
        ending: null,
        cause: cause.id,
        found: known === cause.id,
        foundTurn,
        plays: budget - left,
        lines,
        board,
        sheet,
        stats,
      };
    }

    // Random is the player declining to choose (settled.md:812).
    let { suit, angle } = move;
    if (angle === RANDOM || suit === RANDOM) {
      const r = resolveRandom(rng);
      suit = r.suit;
      angle = r.angle;
      say(lines, 'NOTE', `[random] ${suit}/${angle}`);
    }

    if (move.kind === 'fix') {
      left -= 1;
      // A Fix is not always THE Fix. Knowing the cause is not the same as
      // offering the right remedy, so the fix played has to be the one that
      // belongs to the cause she described.
      const right = heard.some((h) => h.causal) && move.fix === cause.fix.id;
      say(lines, 'YOU', fixLine(sc, move.fix, cause, right));
      if (right) {
        say(lines, 'HER', cause.fix.reply);
        ending = 'resolved';
      } else {
        // One line for every wrong fix. Two different refusals would tell
        // the player which cause they were close to.
        refused.push(move.fix);
        say(lines, 'HER', refusal(sc, move.fix));
      }
      continue;
    }
    if (move.kind === 'hold') {
      left -= 1;
      const ok = sheet.patience + (stats.corroborated ? 1 : 0) >= 3;
      say(lines, 'YOU', "Can you hold while I check with someone?");
      if (ok) {
        say(lines, 'HER', 'Go on then.');
        const lead = askCoworker(sc, cause, move.brief || 'long', rng, lines);
        if (lead) {
          stats.coworkerLeads += 1;
          board = BOARD.landed(board, [{ id: lead, cls: 'customer', find: true }]);
        }
      } else {
        say(lines, 'HER', "I'd rather you didn't. I've not got all morning.");
      }
      continue;
    }
    if (move.kind === 'transfer') {
      left -= 1;
      say(lines, 'YOU', "This one's Dispatch. Putting you through.");
      ending = 'transferred';
      continue;
    }
    if (move.kind === 'identify') {
      left -= 1;
      // What she has to give is hers, not the agent's to name. A policy that
      // supplied the handle itself was quoting another call's paperwork.
      const h = sc.HANDLE || { key: move.target, say: `It's ${move.target}.` };
      handle = h.key;
      stats.identified = true;
      say(lines, 'YOU', 'Have you got a number on anything in front of you?');
      say(lines, 'HER', h.say);
      continue;
    }
    if (move.kind === 'write') {
      left -= 1;
      const before = board.targets.length;
      board = BOARD.writeDown(board, move.target);
      say(
        lines,
        'NOTE',
        board.targets.length < before
          ? `[write] ${move.target} written down and off the board`
          : `[write] nothing to write — ${move.target} is not a find in play`,
      );
      continue;
    }

    // An inquiry to a target has to make some sort of sense (Phil, 10
    // October). Where the scenario writes its questions out, one that is not
    // written does not exist, and nothing is made up in its place. The cells
    // a scenario keeps malformed on purpose are the one exception: that is
    // how a slip of the tongue is played.
    const cell = `${suit}/${angle}`;
    const noSuch =
      move.cls === 'customer' &&
      sc.QUESTIONS &&
      (sc.BASELINE[move.target] || sc.BELIEFS[move.target]) &&
      !(sc.QUESTIONS[move.target] && sc.QUESTIONS[move.target][cell]) &&
      !sc.nonsense(suit, move.target);
    const why = noSuch ? 'there is no such question to put to her' : legal(suit, angle, move.cls);
    if (why) {
      left -= 1;
      say(lines, 'NOTE', `[illegal] ${suit}/${angle} at the ${move.cls}: ${why}`);
      continue;
    }

    left -= 1;
    // Tallied per target class, because a record read always pays and a
    // question to her does not: pooling them hides which is which.
    const pair = `${move.cls} ${suit}/${angle}`;
    const aimed = move.target;
    // Searching with no handle has its own answer, below; it is not a
    // mis-aim.
    const noHandleYet = move.cls === 'record' && !handle;
    // A coworker is not a word on the board: who is free to ask is decided
    // by who is free, not by what she has said (settled.md:1072).
    const onBoard =
      noHandleYet ||
      move.cls === 'coworker' ||
      aimed === null ||
      aimed === undefined ||
      BOARD.has(board, aimed);
    const wrongKind = noHandleYet
      ? false
      : move.cls === 'customer'
        ? !sc.BASELINE[aimed] && !sc.BELIEFS[aimed]
        : move.cls === 'record'
          ? !REC.node(rec, aimed) && angle !== 'expand'
          : false;
    if (!onBoard || wrongKind) {
      // The targets are the board (settled.md:888): a move at something not
      // in play, or at a thing of the wrong kind, is a miss however well it
      // was said.
      stats.pairs[pair] = stats.pairs[pair] || { plays: 0, paid: 0 };
      stats.pairs[pair].plays += 1;
      stats.misaimed = (stats.misaimed || 0) + 1;
      say(lines, 'NOTE', `[miss] ${aimed} is not something in front of you`);
      continue;
    }
    stats.pairs[pair] = stats.pairs[pair] || { plays: 0, paid: 0 };
    stats.pairs[pair].plays += 1;

    if (move.cls === 'customer') {
      stats.customerPlays = (stats.customerPlays || 0) + 1;
      const res = askHer({
        sc,
        sheet,
        subject: move.target,
        suit,
        angle,
        cause,
        recent,
        rng,
        lead: suspect === cause.id,
        answered,
        inPlay: board.targets.map((t) => t.id),
        herrings: herringSubjects,
        given: fragmentsGiven,
      });
      recent.push({ angle, subject: move.target });
      asked.push(move.target);
      say(lines, 'YOU', res.question);
      // A steer replaces the deflection: she does not answer what was asked,
      // and she says something about what she would rather talk about.
      const to =
        steer && !res.landed && !res.fragment && !res.spent
          ? steerTo({ sc, steer, cause, herrings: herringSubjects, answered, steered, asking: move.target })
          : null;
      say(lines, 'HER', to ? sc.BASELINE[to] : res.answer);
      if (to) {
        stats.steers += 1;
        steered.push(to);
        // She raised it herself, so asking about it is not cold any more.
        sheet = SHEET.remember(sheet, to);
        board = add(rec, sc, board, [{ id: to, cls: 'customer' }], lines);
        say(lines, 'NOTE', `[steer] she would rather talk about ${sc.label(to)}`);
      }
      if (res.landed) {
        answered.push(move.target);
        // A ward learned is a ward learned: once she has talked about
        // something, coming back to it is not cold any more.
        sheet = SHEET.remember(sheet, move.target);
        stats.pairs[pair].paid += 1;
        const opens = (sc.GIVES[move.target] || []).map((w) => ({ id: w, cls: 'customer' }));
        board = add(rec, sc, board, opens, lines);
        stats.dropped = board.dropped.length;
        if (res.departure) {
          heard.push({ subject: move.target, suggests: res.suggests, causal: res.causal });
          if (res.causal) {
            known = cause.id;
            foundTurn = budget - left;
            stats.customerPlaysBeforeFind = stats.customerPlays;
          }
          lastWasDeparture = true;
          board = BOARD.landed(board, [
            { id: `heard:${move.target}`, cls: 'customer', find: true },
          ]);
          say(lines, 'NOTE', `[find] ${sc.FIND_NOTE || 'that is not how she says she normally does it'}`);
        } else {
          lastWasDeparture = false;
        }
        if (res.critical) {
          stats.criticals += 1;
          board = add(rec, sc, board, res.critical.map((w) => ({ id: w, cls: 'customer' })), lines);
          say(lines, 'NOTE', `[critical] she connects it to ${sc.label(res.critical[0])}`);
        }
      } else if (res.fragment) {
        // Not an answer to what was asked, and not nothing: a brick. Several
        // of them give the shape of the order that no single question earned.
        stats.fragments = (stats.fragments || 0) + 1;
        fragmentsGiven.push(res.answer);
        stats.pairs[pair].paid += 1;
        board = add(
          rec,
          sc,
          board,
          res.opens.map((w) => ({ id: w, cls: 'customer' })),
          lines,
        );
        say(lines, 'NOTE', '[fragment] she took that as a slip and answered the nearest thing');
        lastWasDeparture = false;
      } else {
        stats.bounces += 1;
        readings.push({ subject: move.target, suit, reading: res.reading });
        say(lines, 'NOTE', `[bounce] ${res.reading}`);
        board = BOARD.nothing(board);
      }
      // Her Need surfaces only if her own trigger fires (settled.md:1517).
      const f = SHEET.fires(sheet, { suit, subject: move.target });
      if (f.fired && !stats.needSeen) {
        stats.needSeen = true;
        stats.needOblique = f.oblique;
        say(lines, 'HER', sc.NEED.line);
      }
      // Asking her something that is ours gets handed back.
      continue;
    }

    if (move.cls === 'record') {
      if (!handle) {
        say(lines, 'NOTE', '[record] nothing to search on — she has given no handle');
        continue;
      }
      // An Expand lists what the handle reaches; it does not read a row. So
      // it must not mark that row as read, or the row carrying the evidence
      // becomes unreachable for the rest of the call.
      asked.push(angle === 'expand' ? `list:${handle}` : move.target || `list:${handle}`);
      const res = askRecord({ rec, handle, target: move.target, angle, cause, rng });
      say(lines, 'YOU', res.question);
      say(lines, 'NOTE', res.note);
      if (res.critical) {
        say(
          lines,
          'NOTE',
          `[critical] of what hangs off it: ${res.critical.map((e) => `${REC.node(rec, e.to).headline.split(' — ')[0]} (${e.link})`).join(', ')}`,
        );
      }
      if (res.paid) stats.pairs[pair].paid += 1;
      if (res.critical) stats.criticals += 1;
      if (res.corroborates && !leadSubjects.length) {
        stats.corroborated = true;
        suspect = cause.id;
        leadSubjects = leadsFor(sc, cause.id, rng);
        board = add(rec, sc, board, leadSubjects.map((w) => ({ id: w, cls: 'customer' })), lines);
        stats.ledLead = true;
        say(lines, 'NOTE', `[lead] the facts here would fit ${leadSubjects.map((w) => sc.label(w)).join(', or ')}`);
      }
      // A row can genuinely weaken a reason: a previous order with the same
      // line and no complaint is a true fact that argues against it.
      if (res.weakens && suspect === res.weakens) suspect = null;
      if (res.open) {
        board = add(rec, sc, board, res.open.map((id) => ({ id, cls: 'record' })), lines);
      }
      continue;
    }

    if (move.cls === 'coworker') {
      const res = askCoworkerDirect({ move, cause, rng });
      say(lines, 'YOU', res.question);
      say(lines, 'HIM', res.answer);
      if (res.lead) {
        stats.pairs[pair].paid += 1;
        stats.coworkerLeads += 1;
        board = BOARD.landed(board, [{ id: res.lead, cls: 'customer', find: true }]);
      }
      continue;
    }

  }

  // **[P]** A departure heard on the ninth play auto-plays its remedy. There
  // is no play left to spend on it, and an agent who has just been told what
  // she did says so rather than ending the call in silence. It can be wrong,
  // because a cause is not necessarily THE cause — and a wrong one on the
  // last play is a failed attempt, which §13 makes a manager's business: it
  // becomes a follow-up or an escalation, decided by her sheet in that
  // moment.
  if (!ending && lastWasDeparture) {
    const cands = candidatesFrom(heard);
    const offer = agent.closing ? agent.closing({ candidates: cands }, rng) : cands[0];
    const right = heard.some((h) => h.causal) && offer === cause.fix.id;
    stats.autoPlayed = offer || null;
    say(lines, 'YOU', fixLine(sc, offer, cause, right));
    if (right) {
      say(lines, 'HER', cause.fix.reply);
      ending = 'resolved';
    } else {
      say(lines, 'HER', refusal(sc, offer));
      // **[C]** Which door she reaches for comes off the sheet. The field is
      // mine, not settled: patience, lowered by every bounce this call. A
      // customer with none of it left asks for somebody senior; one who has
      // some takes the callback.
      const spent = sheet.patience - stats.bounces;
      if (spent <= 1) {
        stats.escalated = true;
        ending = 'transferred';
        say(lines, 'HER', 'No. Put me on to whoever it is that does know.');
        say(lines, 'YOU', "Let me get you someone senior. One moment.");
      } else {
        ending = 'held';
      }
    }
  }

  if (!ending) ending = 'held';

  // Her closing lines do not vary with how the call went or how she is
  // holding the agent, because she has no mood: nothing settled says what her
  // answers vary by, so there is no axis to vary them on. Anything stronger
  // than neutral here would be unprovoked.
  if (ending === 'held') {
    // One closing, found or not: from her side the two are the same thing —
    // documented, forwarded, somebody will call. The difference is internal
    // to the agent, and an agent never tells a customer they would be
    // guessing.
    say(lines, 'YOU', "We've got that documented, and are forwarding the case for follow-up later today.");
    say(lines, 'HER', "Right. I'll wait to hear, then.");
  }

  return {
    refused: refused.slice(),
    ending,
    cause: cause.id,
    found: known === cause.id,
    foundTurn,
    plays: budget - left,
    lines,
    board,
    sheet,
    stats,
  };
}

/**
 * Where she points on a miss, when she is a caller who steers.
 *
 * Steering is volunteering where the steerer would like the call to go
 * (settled.md §8). `answer` picks a subject the explanation runs through;
 * `own` picks something she did differently that is true and is not the
 * explanation, because where she wants it to go is not always where the
 * answer is. Never the subject just asked about, never one she has already
 * answered or already pointed at, and only one she has a line for.
 *
 * @returns {string|null} a subject, or null when she has nowhere to point.
 */
function steerTo({ sc, steer, cause, herrings, answered, steered, asking }) {
  const pool = steer === 'answer' ? cause.reach.flat() : steer === 'own' ? herrings : [];
  return (
    pool.find(
      (w) => w !== asking && sc.BASELINE[w] && !answered.includes(w) && !steered.includes(w),
    ) || null
  );
}

/**
 * The subjects a corroborating row would fit.
 *
 * The right one, plus two from other causes, in a fixed order per cause so
 * the player is choosing rather than watching the dice reshuffle. A critical
 * shows some of the options and never which one is right; a lead is the same
 * rule at the record's end.
 */
function leadsFor(sc, suspect, rng) {
  const right = sc.CAUSES.find((c) => c.id === suspect).reach[0][0];
  // Decoys come from the other causes where there are other causes, and from
  // the innocent departures otherwise. A scenario with one cause used to
  // produce a lead list of [right, undefined, undefined], which the policies
  // then aimed at.
  const others = sc.CAUSES.filter((c) => c.id !== suspect)
    .map((c) => c.reach[0][0])
    .concat(Object.keys(sc.HERRINGS || {}))
    .concat(sc.SUBJECTS || [])
    .filter((w) => w && w !== right);
  const out = [right, others[0], others[1]].filter(Boolean);
  // One shuffle, from the call's own rng, so position is not the tell.
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Which innocent departures are live this call.
 *
 * One or two, never on a subject the cause itself needs, because a subject
 * cannot both be the explanation and not be it.
 */
function rollHerrings(sc, cause, rng) {
  const taken = new Set(cause.reach.flat());
  const pool = Object.keys(sc.HERRINGS).filter((k) => !taken.has(k));
  const want = 1 + Math.floor(rng() * 2);
  const out = [];
  while (out.length < want && pool.length) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}

/** A new array in a new order, from the call's own rng. */
function shuffle(arr, rng) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Every remedy her departures could point to, first heard first. */
function candidatesFrom(heard) {
  const out = [];
  for (const h of heard) for (const f of h.suggests) if (!out.includes(f)) out.push(f);
  return out;
}

/** What asking her returns: a landing, a bounce, or a departure. */
function askHer({ sc, sheet, subject, suit, angle, cause, recent, rng, lead, answered, inPlay, herrings, given }) {
  const fit = SHEET.fitness(suit, subject, sheet);
  let p = TUNING.landChance[fit];
  p += TUNING.angleBonus[angle] || 0;
  p += (sheet.patience - 3) * TUNING.patienceBonus;
  // Knowing what you are looking for is worth something when you ask.
  if (lead && cause.reach.some((set) => set.includes(subject))) p += TUNING.leadBonus;
  p += sc.fits(suit, subject) ? TUNING.suitFits : TUNING.suitWrong;
  const isReach = cause.reach.some((set) => set.includes(subject));
  if (angle === 'validate') {
    p += isReach ? TUNING.validateRight : TUNING.validateWrong;
    const run = recent.slice(-2).filter((r) => r.angle === 'validate').length;
    if (run >= 2) p += TUNING.statementRun;
  }
  const thrice =
    recent.slice(-3).filter((r) => r.subject === subject || r.angle === angle).length >= 2;
  if (thrice) p -= TUNING.repeatPenalty;
  const question = ask(sc, suit, angle, subject);

  // A question that does not parse against the subject is not heard as
  // nonsense. She takes it as misspeaking and answers the nearest sensible
  // question instead, handing over one true thing about the order. The ward
  // never comes into it: she is being generous, not opening up.
  if (sc.nonsense(suit, subject)) {
    const pool = (sc.FRAGMENTS[subject] || sc.FRAGMENT_FALLBACK)
      .concat(sc.FRAGMENT_FALLBACK)
      .filter((f) => !given.includes(f.say()));
    // She will repair a slip, and she will not repair the same slip twice.
    // Having nothing left to offer is where generosity runs out.
    if (!pool.length) {
      return {
        landed: false,
        question,
        answer: "We've been round this. Is there something on the order you're not telling me?",
        reading: 'she has nothing left to give on that one',
        // Not a miss: her generosity has run out, which is its own answer
        // and not somewhere a steer belongs.
        spent: true,
      };
    }
    const f = pool[Math.floor(rng() * pool.length)];
    return {
      landed: false,
      fragment: true,
      question,
      answer: f.say(),
      opens: f.opens.slice(),
      reading: null,
    };
  }

  const landed = rng() < p;
  if (!landed) {
    const b = SHEET.bounce(sheet, subject, suit);
    return { landed: false, question, answer: oblique(sc, rng), reading: b.reading };
  }
  // An innocent departure: true, unusual, and not the explanation.
  if (herrings.includes(subject) && landed) {
    const h = sc.HERRINGS[subject];
    return {
      landed: true,
      question,
      answer: h.text,
      departure: true,
      causal: false,
      suggests: shuffle(h.suggests, rng),
      critical: null,
    };
  }
  const whole = cause.reach.find((set) => set.includes(subject)) || [];
  // A cause reachable only by a pair costs two of the nine: she departs when
  // the last word of the set is the one she is being asked about, and the
  // rest of that set is already answered.
  const departure =
    isReach && whole.every((w) => w === subject || answered.includes(w));
  // Asked about her own account, she answers from what she believes. She has
  // only herself; the player has the CRM (settled.md:1168).
  const belief = sc.BELIEFS[subject] && sc.BELIEFS[subject].any;
  const answer = departure
    ? pick(cause.departures, rng)
    : sc.BASELINE[subject] || belief || "I couldn't say.";
  // From her, a critical is a word arriving with something she connects it
  // to — one of them, never the lot, and only something not already in
  // front of you, or it changes nothing (settled.md:941).
  const connects = (sc.GIVES[subject] || [])
    .concat(Object.values(cause.hints || {}).flat())
    .filter((w) => w !== subject && !answered.includes(w));
  const fresh = connects.filter((w) => !inPlay.includes(w));
  const critical = rng() < TUNING.criticalChance && fresh.length ? [fresh[Math.floor(rng() * fresh.length)]] : null;
  return {
    landed: true,
    question,
    answer,
    departure,
    causal: departure,
    // Shuffled: listing the right remedy first every time would make the
    // choice a formality, and a cause is not necessarily THE cause.
    suggests: departure ? shuffle(cause.suggests, rng) : [],
    critical,
  };
}

/** What the record returns: corroboration, contradiction, or silence. */
function askRecord({ rec, handle, target, angle, cause, rng }) {
  const paths = REC.probe(rec, handle);
  if (!paths.length) {
    return { question: `Let me look up ${handle}.`, note: '[record] nothing filed under that', paid: false };
  }
  if (angle === 'expand') {
    const cats = [...new Set(paths.map((p) => p.category))];
    const rows = paths.map((p) => p.node);
    return {
      question: 'Let me see what else is on that number.',
      note:
        `[record] ${cats.join(' · ')} — ` +
        [...new Set(rows)].map((id) => REC.node(rec, id).spoken).join(' · '),
      paid: true,
      open: [...new Set(rows)],
    };
  }
  const row = REC.read(rec, target);
  if (!row) {
    return { question: 'Let me check that.', note: '[record] no such row', paid: false };
  }
  // A critical at the record is the row plus some of its edges, labelled.
  // It adds no new target — it tells the player which of the paths already
  // in front of them is worth walking (settled.md:930).
  const crit =
    rng() < TUNING.criticalChance
      ? BOARD.criticalEdges(rec, target, rng, cause.evidence && cause.evidence.row)
      : [];
  // A cause with no evidence row leaves the record silent, which is a real
  // outcome rather than a gap in the data (settled.md:826).
  const corroborates = !!cause.evidence && cause.evidence.row === target;
  const corrob = REC.corroborated(paths, target);
  void rng;
  const weakens = REC.node(rec, target).weakens || null;
  return {
    question: `Let me pull up ${row.spoken}.`,
    weakens,
    note:
      `[record] ${row.headline} — ${row.line}` +
      (corrob ? ' [two routes reach this]' : '') +
      '',
    paid: true,
    corroborates,
    critical: crit.length ? crit : null,
    open: row.edges,
  };
}

/** Asking over your shoulder, with his preferred method deciding. */
function askCoworkerDirect({ move, cause, rng }) {
  const brief = move.brief || 'long';
  const fits = brief === COWORKER.prefers;
  const knows = COWORKER.knows.includes(cause.id);
  const question =
    brief === 'short'
      ? 'Bram — uneven batch of twelve, custom ingredients. Where would you look?'
      : 'Bram, sorry — I have a guild on, twelve draughts came in from POOF and they are all different strengths, she sent her own ingredients in, it was all one order, and she says it has never happened before. What do you make of it?';
  if (!fits) {
    return { question, answer: "I'm in the middle of something. Give me the short version next time." };
  }
  if (!knows) {
    return { question, answer: "Not one I know. Ask Dispatch what the container was." };
  }
  void rng;
  const lead = cause.reach[0][0];
  return { question, answer: `Ask her about the ${lead}. That is usually it.`, lead };
}

/** The hold version of the same conversation. */
function askCoworker(sc, cause, brief, rng, lines) {
  // The same man with the same preference. A good brief delivered the wrong
  // way bounces here as it does at his desk (settled.md:1289).
  if (brief !== COWORKER.prefers) {
    say(lines, 'HIM', "Can you give me that again, shorter? I've someone holding.");
    return null;
  }
  const knows = COWORKER.knows.includes(cause.id);
  say(lines, 'HIM', knows ? `Ask her about the ${sc.label(cause.reach[0][0])}.` : 'Nothing from me, sorry.');
  void rng;
  return knows ? cause.reach[0][0] : null;
}

/** A question, in words rather than labels. */
function ask(sc, suit, angle, word) {
  // A written question, where the scenario has one. The grid below is for
  // the cells where the question is meant to be malformed.
  const written = sc.QUESTIONS && sc.QUESTIONS[word] && sc.QUESTIONS[word][`${suit}/${angle}`];
  if (written) return written;
  const it = sc.label(word);
  // Every stem has to work with every label, because a mismatched suit is a
  // legal move that she answers obliquely — so the question still has to be
  // a question a person would ask.
  const stems = {
    who: {
      verify: `So it was you who dealt with ${it}?`,
      validate: `You dealt with ${it} yourself, I take it?`,
      expand: `Who else had a hand in ${it}?`,
      contract: `Who exactly dealt with ${it}?`,
    },
    what: {
      verify: `Let me read back what I have about ${it}.`,
      validate: `So nothing unusual about ${it}?`,
      expand: `Tell me about ${it}.`,
      contract: `What was ${it}, exactly?`,
    },
    why: {
      verify: `So it comes down to ${it} — have I got that right?`,
      validate: `Was it ${it} that decided it?`,
      expand: `Why does ${it} come into it?`,
      contract: `What is it about ${it} that would change things?`,
    },
    // The subject sits at the end of these, as an object rather than a
    // grammatical subject, so a plural label and a singular verb cannot
    // disagree: "Where exactly does the lots you sent sit?" was the other
    // way round.
    when: {
      verify: `So that was before the order went in — ${it}?`,
      validate: `Was that before the order went in — ${it}?`,
      expand: `When does that come into it — ${it}?`,
      contract: `When exactly did that happen — ${it}?`,
    },
    where: {
      verify: `So none of that left your end — ${it} included?`,
      validate: `That all happened at the hall, ${it} included?`,
      expand: `Whereabouts does that happen — ${it}?`,
      contract: `Where exactly did that happen — ${it}?`,
    },
    how: {
      verify: `So ${it} went the way it always goes?`,
      validate: `You did ${it} the usual way, then?`,
      expand: `How does ${it} work at your end?`,
      contract: `How was ${it} handled this time?`,
    },
  };
  return stems[suit][angle];
}

/**
 * A mismatched suit is answered obliquely (settled.md:1512).
 *
 * Drawn from the call's own rng rather than from the word, so two deflections
 * in a row are not the same sentence twice — which read as a script.
 */
function oblique(sc, rng) {
  const outs = sc.OBLIQUE || [
    "That's more Hald's end than mine.",
    "I'd have to look, and I've the hall to open.",
    "Does that matter? It came back wrong, that's what matters.",
    "I couldn't tell you offhand.",
    "You'd have to ask Hald about that one.",
    "I've not got that in front of me.",
  ];
  return outs[Math.floor(rng() * outs.length)];
}

function fixLine(sc, fixId, cause, right) {
  if (right) return cause.fix.line;
  // A scenario may carry remedies that belong to no cause: the reasonable
  // guesses an agent reaches for when nothing is wrong.
  if (sc.REMEDIES && sc.REMEDIES[fixId]) return sc.REMEDIES[fixId].line;
  const other = sc.CAUSES.find((c) => c.fix.id === fixId) || sc.CAUSES[0];
  return other.fix.line;
}

/**
 * Put targets in play and say what fell off.
 *
 * The board has a cap, so something arriving can push something out. Losing
 * a word silently would be the game hiding a cost from the player.
 */
function add(rec, sc, board, incoming, lines) {
  // Nothing nameless goes on the board.
  incoming = incoming.filter((t) => t && t.id);
  const lost = board.dropped.length;
  const next = BOARD.landed(board, incoming);
  if (next.dropped.length > lost) {
    const gone = next.dropped
      .slice(lost)
      .map((w) => (REC.node(rec, w) ? REC.node(rec, w).spoken : sc.label(w)));
    say(lines, 'NOTE', `[off the board] ${gone.join(', ')} — too much in front of you now`);
  }
  return next;
}

/**
 * What she says to a remedy that isn't it.
 *
 * A scenario can give each wrong remedy its own refusal, because "we can
 * send you a new bag" and "I'll check your permissions" are not refused in
 * the same words. Where it does not, one line serves them all — two
 * different refusals would tell the player which cause they were close to.
 */
function refusal(sc, fixId) {
  if (sc.REMEDIES && sc.REMEDIES[fixId] && sc.REMEDIES[fixId].reply) {
    return sc.REMEDIES[fixId].reply;
  }
  return "That's not it. I'd have noticed that.";
}

function say(lines, who, text) {
  lines.push({ who, text });
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

module.exports = { playCall, PLAYS, TUNING, COWORKER, SUITS, ANGLES, ask, askRecord };
