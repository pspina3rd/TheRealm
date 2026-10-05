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
 * @returns {{ending: string, cause: string, found: boolean, plays: number,
 *   lines: object[], board: object, sheet: object, stats: object}}
 */
function playCall({ agent, rng, baggage, causeIndex }) {
  const bag = baggage || pick(Object.keys(SHEET.BAGGAGE), rng);
  let sheet = SHEET.newSheet({ who: CASE.CALLER.name, baggage: bag, rng });
  const cause =
    typeof causeIndex === 'number' ? CASE.CAUSES[causeIndex] : pick(CASE.CAUSES, rng);

  let board = BOARD.newBoard(CASE.OPENING.words);
  let left = PLAYS;
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
    customerPlays: 0,
    customerPlaysBeforeFind: null,
    ledLead: false,
  };
  // What she has actually told you, which is the only thing a fix can rest
  // on. The record can corroborate a reason by holding the facts that must be
  // true if it is real, but it cannot put words in her mouth: a fix played on
  // a row alone is the agent telling the customer what she did, and she will
  // say she did no such thing.
  let known = null;
  let suspect = null;
  // The subjects a corroborating row points at. They are put in play when it
  // is read, because a lead is the record handing you something to aim at —
  // a hit yields targets (settled.md:863).
  let leadSubjects = [];
  let foundTurn = null;
  let handle = null;
  let ending = null;

  say(lines, 'HER', CASE.OPENING.line);
  say(lines, 'NOTE', `[free] opening — board: ${board.targets.map((t) => t.id).join(', ')}`);

  while (left > 0 && !ending) {
    // What the agent is allowed to see. Never the sheet: her wards, her
    // patience and her baggage are hers, and a policy that read them would
    // be scoring itself against an answer key.
    const view = {
      left,
      board,
      handle,
      known,
      recent: recent.slice(-3),
      coworker: COWORKER,
      readings: readings.slice(),
      asked: asked.slice(),
      answered: answered.slice(),
      refused: refused.slice(),
      // Two or three subjects the facts would fit, never which one is right
      // (settled.md:930). Handing over the exact subject would end the hunt
      // on one roll.
      leads: leadSubjects.slice(),
    };
    const move = agent.choose(view, rng);
    if (!move) break;

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
      const right = known === cause.id && move.fix === cause.fix.id;
      say(lines, 'YOU', fixLine(move.fix, cause, right));
      if (right) {
        say(lines, 'HER', cause.fix.reply);
        ending = 'resolved';
      } else {
        // One line for every wrong fix. Two different refusals would tell
        // the player which cause they were close to.
        refused.push(move.fix);
        say(lines, 'HER', "That's not it. I'd have noticed that.");
      }
      continue;
    }
    if (move.kind === 'hold') {
      left -= 1;
      const ok = sheet.patience + (stats.corroborated ? 1 : 0) >= 3;
      say(lines, 'YOU', "Can you hold while I check with someone?");
      if (ok) {
        say(lines, 'HER', 'Go on then.');
        const lead = askCoworker(cause, move.brief || 'long', rng, lines);
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
      handle = move.target;
      stats.identified = true;
      say(lines, 'YOU', "Have you got an order number, or a PO?");
      say(lines, 'HER', `It's on the form. ${handle}.`);
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

    const why = legal(suit, angle, move.cls);
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
        ? !CASE.BASELINE[aimed] && !CASE.BELIEFS[aimed]
        : move.cls === 'record'
          ? !REC.node(REC.RECORD, aimed) && angle !== 'expand'
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
      });
      recent.push({ angle, subject: move.target });
      asked.push(move.target);
      say(lines, 'YOU', res.question);
      say(lines, 'HER', res.answer);
      if (res.landed) {
        answered.push(move.target);
        // A ward learned is a ward learned: once she has talked about
        // something, coming back to it is not cold any more.
        sheet = SHEET.remember(sheet, move.target);
        stats.pairs[pair].paid += 1;
        const opens = (CASE.GIVES[move.target] || []).map((w) => ({ id: w, cls: 'customer' }));
        board = add(board, opens, lines);
        stats.dropped = board.dropped.length;
        if (res.departure) {
          known = cause.id;
          foundTurn = PLAYS - left;
          stats.customerPlaysBeforeFind = stats.customerPlays;
          board = BOARD.landed(board, [{ id: `found:${cause.id}`, cls: 'customer', find: true }]);
          say(lines, 'NOTE', '[find] that is not how she says she normally does it');
        }
        if (res.critical) {
          stats.criticals += 1;
          board = add(board, res.critical.map((w) => ({ id: w, cls: 'customer' })), lines);
          say(lines, 'NOTE', `[critical] she connects it to ${CASE.label(res.critical[0])}`);
        }
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
        say(lines, 'HER', CASE.NEED.line);
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
      const res = askRecord({ handle, target: move.target, angle, cause, rng });
      say(lines, 'YOU', res.question);
      say(lines, 'NOTE', res.note);
      if (res.critical) {
        say(
          lines,
          'NOTE',
          `[critical] of what hangs off it: ${res.critical.map((e) => `${REC.node(REC.RECORD, e.to).headline.split(' — ')[0]} (${e.link})`).join(', ')}`,
        );
      }
      if (res.paid) stats.pairs[pair].paid += 1;
      if (res.critical) stats.criticals += 1;
      if (res.corroborates && !leadSubjects.length) {
        stats.corroborated = true;
        suspect = cause.id;
        leadSubjects = leadsFor(cause.id, rng);
        board = add(board, leadSubjects.map((w) => ({ id: w, cls: 'customer' })), lines);
        stats.ledLead = true;
        say(lines, 'NOTE', `[lead] the facts here would fit ${leadSubjects.map((w) => CASE.label(w)).join(', or ')}`);
      }
      // A row can genuinely weaken a reason: a previous order with the same
      // line and no complaint is a true fact that argues against it.
      if (res.weakens && suspect === res.weakens) suspect = null;
      if (res.open) {
        board = add(board, res.open.map((id) => ({ id, cls: 'record' })), lines);
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

  if (!ending) ending = 'held';
  // OPEN RULE: a call can end with the cause known and the remedy never
  // offered, because the nine ran out first. Telling her the cause and then
  // not resolving it would manufacture a complaint, so the agent says
  // nothing about it here — which means the player's own find goes unspoken.
  // Either the closing fix is free when the cause is already in hand, or the
  // last of the nine should be allowed to be the fix. Phil's to settle.
  //
  // Her closing lines are placeholders. They do not vary with how the call
  // went or how she is holding the agent, because she has no mood: nothing in
  // the record says what her answers vary by, so there is no axis to vary
  // them on. Anything stronger than neutral here would be unprovoked.
  if (ending === 'held') {
    if (known === cause.id) {
      say(lines, 'YOU', "We've got that documented, and are forwarding the case for follow-up later today.");
      say(lines, 'HER', "Right. I'll wait to hear, then.");
    } else {
      say(lines, 'YOU', "I'd be guessing. I'm forwarding the case to someone who'll know — today.");
      say(lines, 'HER', "All right. Thank you.");
    }
  }

  return {
    ending,
    cause: cause.id,
    found: known === cause.id,
    foundTurn,
    plays: PLAYS - left,
    lines,
    board,
    sheet,
    stats,
  };
}

/**
 * The subjects a corroborating row would fit.
 *
 * The right one, plus two from other causes, in a fixed order per cause so
 * the player is choosing rather than watching the dice reshuffle. A critical
 * shows some of the options and never which one is right; a lead is the same
 * rule at the record's end.
 */
function leadsFor(suspect, rng) {
  const right = CASE.CAUSES.find((c) => c.id === suspect).reach[0][0];
  const others = CASE.CAUSES.filter((c) => c.id !== suspect).map((c) => c.reach[0][0]);
  const out = [right, others[0], others[1]];
  // One shuffle, from the call's own rng, so position is not the tell.
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** What asking her returns: a landing, a bounce, or a departure. */
function askHer({ sheet, subject, suit, angle, cause, recent, rng, lead, answered, inPlay }) {
  const fit = SHEET.fitness(suit, subject, sheet);
  let p = TUNING.landChance[fit];
  p += TUNING.angleBonus[angle] || 0;
  p += (sheet.patience - 3) * TUNING.patienceBonus;
  // Knowing what you are looking for is worth something when you ask.
  if (lead && cause.reach.some((set) => set.includes(subject))) p += TUNING.leadBonus;
  p += CASE.fits(suit, subject) ? TUNING.suitFits : TUNING.suitWrong;
  const isReach = cause.reach.some((set) => set.includes(subject));
  if (angle === 'validate') {
    p += isReach ? TUNING.validateRight : TUNING.validateWrong;
    const run = recent.slice(-2).filter((r) => r.angle === 'validate').length;
    if (run >= 2) p += TUNING.statementRun;
  }
  const thrice =
    recent.slice(-3).filter((r) => r.subject === subject || r.angle === angle).length >= 2;
  if (thrice) p -= TUNING.repeatPenalty;
  const landed = rng() < p;
  const question = ask(suit, angle, subject);
  if (!landed) {
    const b = SHEET.bounce(sheet, subject, suit);
    return { landed: false, question, answer: oblique(rng), reading: b.reading };
  }
  const whole = cause.reach.find((set) => set.includes(subject)) || [];
  // A cause reachable only by a pair costs two of the nine: she departs when
  // the last word of the set is the one she is being asked about, and the
  // rest of that set is already answered.
  const departure =
    isReach && whole.every((w) => w === subject || answered.includes(w));
  // Asked about her own account, she answers from what she believes. She has
  // only herself; the player has the CRM (settled.md:1168).
  const belief = CASE.BELIEFS[subject] && CASE.BELIEFS[subject].any;
  const answer = departure
    ? pick(cause.departures, rng)
    : CASE.BASELINE[subject] || belief || "I couldn't say.";
  // From her, a critical is a word arriving with something she connects it
  // to — one of them, never the lot, and only something not already in
  // front of you, or it changes nothing (settled.md:941).
  const connects = (CASE.GIVES[subject] || [])
    .concat(Object.values(cause.hints || {}).flat())
    .filter((w) => w !== subject && !answered.includes(w));
  const fresh = connects.filter((w) => !inPlay.includes(w));
  const critical = rng() < TUNING.criticalChance && fresh.length ? [fresh[Math.floor(rng() * fresh.length)]] : null;
  return { landed: true, question, answer, departure, critical };
}

/** What the record returns: corroboration, contradiction, or silence. */
function askRecord({ handle, target, angle, cause, rng }) {
  const paths = REC.probe(REC.RECORD, handle);
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
        [...new Set(rows)].map((id) => REC.node(REC.RECORD, id).spoken).join(' · '),
      paid: true,
      open: [...new Set(rows)],
    };
  }
  const row = REC.read(REC.RECORD, target);
  if (!row) {
    return { question: 'Let me check that.', note: '[record] no such row', paid: false };
  }
  // A critical at the record is the row plus some of its edges, labelled.
  // It adds no new target — it tells the player which of the paths already
  // in front of them is worth walking (settled.md:930).
  const crit =
    rng() < TUNING.criticalChance
      ? BOARD.criticalEdges(REC.RECORD, target, rng, cause.evidence && cause.evidence.row)
      : [];
  // A cause with no evidence row leaves the record silent, which is a real
  // outcome rather than a gap in the data (settled.md:826).
  const corroborates = !!cause.evidence && cause.evidence.row === target;
  const corrob = REC.corroborated(paths, target);
  void rng;
  const weakens = REC.node(REC.RECORD, target).weakens || null;
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
function askCoworker(cause, brief, rng, lines) {
  // The same man with the same preference. A good brief delivered the wrong
  // way bounces here as it does at his desk (settled.md:1289).
  if (brief !== COWORKER.prefers) {
    say(lines, 'HIM', "Can you give me that again, shorter? I've someone holding.");
    return null;
  }
  const knows = COWORKER.knows.includes(cause.id);
  say(lines, 'HIM', knows ? `Ask her about the ${CASE.label(cause.reach[0][0])}.` : 'Nothing from me, sorry.');
  void rng;
  return knows ? cause.reach[0][0] : null;
}

/** A question, in words rather than labels. */
function ask(suit, angle, word) {
  const it = CASE.label(word);
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
    when: {
      verify: `So ${it} was before the order went in — have I that right?`,
      validate: `Was ${it} before the order went in?`,
      expand: `When does ${it} come into it?`,
      contract: `When exactly did ${it} come into it?`,
    },
    where: {
      verify: `So ${it} never left your end — have I got that right?`,
      validate: `That all happened at the hall, ${it} included?`,
      expand: `Where does ${it} come in?`,
      contract: `Where exactly does ${it} sit?`,
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
function oblique(rng) {
  const outs = [
    "That's more Hald's end than mine.",
    "I'd have to look, and I've the hall to open.",
    "Does that matter? It came back wrong, that's what matters.",
    "I couldn't tell you offhand.",
    "You'd have to ask Hald about that one.",
    "I've not got that in front of me.",
  ];
  return outs[Math.floor(rng() * outs.length)];
}

function fixLine(fixId, cause, right) {
  if (right) return cause.fix.line;
  const other = CASE.CAUSES.find((c) => c.fix.id === fixId) || CASE.CAUSES[0];
  return other.fix.line;
}

/**
 * Put targets in play and say what fell off.
 *
 * The board has a cap, so something arriving can push something out. Losing
 * a word silently would be the game hiding a cost from the player.
 */
function add(board, incoming, lines) {
  const lost = board.dropped.length;
  const next = BOARD.landed(board, incoming);
  if (next.dropped.length > lost) {
    const gone = next.dropped
      .slice(lost)
      .map((w) => (REC.node(REC.RECORD, w) ? REC.node(REC.RECORD, w).spoken : CASE.label(w)));
    say(lines, 'NOTE', `[off the board] ${gone.join(', ')} — too much in front of you now`);
  }
  return next;
}

function say(lines, who, text) {
  lines.push({ who, text });
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

module.exports = { playCall, PLAYS, TUNING, COWORKER, SUITS, ANGLES };
