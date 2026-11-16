'use strict';

const { BAGGAGE } = require('./bag');

/**
 * The shape of one answer from her, without the words.
 *
 * Given her sheet, the move just made and what has gone before, this works
 * out what she gives, how much, how clearly, and what the move sets off in
 * her. It is the part of the hand-played runs of 14-15 November that Phil
 * ruled on, built on its own so it can be checked against those runs before
 * any wording is attached (docs/engine-test-15-nov.md, option 1).
 *
 * Kept apart from `turn.js` and `reply.js`, which are untouched and still
 * runnable for comparison.
 *
 * What is Phil's here: the five sheet fields and what each band means
 * (settled.md section 8, Fields); the five counts and that each answer is a
 * draw from her own bell curve on each, with the counts acting on one
 * another (docs/claims-her-side.md, 16-24); what she knows on this call
 * (docs/notes-reply-engine.md, top). **Every number is Claude's guess**, and
 * so is how each band behaviour is triggered.
 */

/** The five counts of how she shares information. */
const COUNTS = Object.freeze(['volume', 'signal', 'certainty', 'accuracy', 'openness']);

/** A count is in a tail beyond this many spreads from her own usual. */
const TAIL = 2;

/**
 * How the counts act on one another, per spread of the source away from its
 * usual: `low` when the source is below it, `high` when above. Worked
 * through in docs/sharing-links.md. Certainty and accuracy have no pull
 * between them, which is the record's.
 */
const PULLS = Object.freeze([
  { from: 'openness', to: 'volume', low: 0.3, high: 0.4 },
  { from: 'certainty', to: 'volume', low: -0.2, high: -0.2 },
  { from: 'volume', to: 'signal', low: 0.4, high: -0.15 },
  { from: 'volume', to: 'accuracy', low: 0.25, high: 0 },
  { from: 'certainty', to: 'signal', low: 0.15, high: 0 },
  { from: 'openness', to: 'signal', low: -0.15, high: -0.15 },
]);

/** How far a reaction on her sheet moves her volume, in spreads. */
const DROP = Object.freeze({ repeat: 1, reach: 1, short: 0.5 });

/** The three test sheets of docs/player-designs.md. */
const SHEETS = Object.freeze({
  X: Object.freeze({
    id: 'X', baggage: 'no-one-told-her', repetition: 'low', empathy: 'high',
    pattern: 'low', nonPositive: 'high', reach: 'digging', causes: Object.freeze(['update']),
  }),
  Y: Object.freeze({
    id: 'Y', baggage: 'pell-gets-hurt', repetition: 'middle', empathy: 'middle',
    pattern: 'middle', nonPositive: 'low', reach: 'digging', causes: Object.freeze(['own-setting', 'her-word']),
  }),
  Z: Object.freeze({
    id: 'Z', baggage: 'set-it-up-herself', repetition: 'middle', empathy: 'low',
    pattern: 'low', nonPositive: 'middle', reach: 'wide', causes: Object.freeze(['update', 'her-word']),
  }),
});

/**
 * What she knows on this call: Phil's list of 16 October, in the order she
 * reaches for it. `about` is the subjects each one answers to.
 */
const KNOWS = Object.freeze([
  { id: 'cannot-transfer', about: ['transfer', 'draught', 'bag', 'working'] },
  { id: 'pell-shut-out', about: ['pell', 'bag', 'working'] },
  { id: 'leaves-in-the-morning', about: ['morning', 'pell', 'contract'] },
  { id: 'never-a-problem-before', about: ['before', 'bag', 'working'] },
  { id: 'at-it-since-last-night', about: ['tried', 'account', 'transfer'] },
]);

/**
 * What identifies her. Asked for one of these she gives it, and it is not a
 * line of inquiry: moving on from it is not a change of subject to her.
 */
const IDENTIFIES = Object.freeze(['name', 'number', 'party', 'account']);

/**
 * What she believes and can be wrong about. `rightWhen` names a cause that
 * makes it true; with none of them on the call she is wrong, and does not
 * know it.
 */
const BELIEVES = Object.freeze([
  { id: 'nothing-changed-on-her-side', about: ['account', 'changed', 'settings'], rightWhen: 'update', wrongWhen: 'own-setting' },
]);

/** How much she says, by where her volume landed. */
const SAYS = Object.freeze({
  'tail low': 'a few words',
  'low side': 'a few words',
  usual: 'a sentence or two',
  'high side': 'three or four sentences',
  'tail high': 'runs on',
});

/** How many things she knows fit into each length of answer. */
const ROOM = Object.freeze({ 'a few words': 1, 'a sentence or two': 2, 'three or four sentences': 3, 'runs on': KNOWS.length });

/** A draw from a bell curve centred on 0 with a spread of 1. */
function bell(rng) {
  const u = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/**
 * Where a landed value sits on her own curve.
 *
 * @param {number} z spreads from her usual
 * @returns {'tail low'|'low side'|'usual'|'high side'|'tail high'}
 */
function band(z) {
  if (z < -TAIL) return 'tail low';
  if (z > TAIL) return 'tail high';
  if (z < -1) return 'low side';
  if (z > 1) return 'high side';
  return 'usual';
}

/**
 * One answer's five counts: a draw on each, then the pulls between them.
 *
 * Openness and certainty are what she brings; volume follows from them;
 * signal and accuracy are what the listener ends up with, so they are
 * settled last and pull on nothing.
 *
 * @param {() => number} rng injected
 * @param {Object<string, number>} [shift] moves a count's centre, for a
 *   sheet that has changed since an earlier call
 * @returns {Object<string, number>} where each count landed, in spreads
 */
function drawCounts(rng, shift = {}) {
  const z = {};
  for (const count of COUNTS) z[count] = bell(rng) + (shift[count] || 0);
  return applyPulls(z);
}

/** The pulls, applied to a copy in an order that lets volume settle first. */
function applyPulls(counts) {
  const z = { ...counts };
  for (const target of ['volume', 'signal', 'accuracy']) {
    for (const pull of PULLS) {
      if (pull.to !== target) continue;
      const source = z[pull.from];
      z[target] += (source < 0 ? pull.low : pull.high) * source;
    }
  }
  return z;
}

/**
 * True when she hears this move as going back over something. Her own
 * words said back to her always are, and so is the same card on the same
 * word. The same word asked a different way is two questions to the agent;
 * whether it is one to her comes from her tolerance for repetition. Low
 * hears it at once. Middle hears it only once repetition has already worn
 * on her in this call, which is the record's point that tolerance wears
 * down inside a single bad call. High does not mind and does not hear it.
 */
function isRepeat(sheet, move, history) {
  if (move.kind === 'paraphrase') return true;
  if (move.kind !== 'question') return false;
  const before = history.filter((h) => h.move.kind === 'question' && h.move.subject === move.subject);
  if (before.some((h) => h.move.suit === move.suit && h.move.angle === move.angle)) return true;
  if (before.length === 0) return false;
  const worn = history.some((h) => h.shape.repeat && !['fine', 'settled'].includes(h.shape.repeat));
  return sheet.repetition === 'low' || (sheet.repetition === 'middle' && worn);
}

/**
 * What going back over something does to her, from her tolerance for
 * repetition (settled.md section 8).
 */
function repeatReaction(sheet, move, history) {
  if (!isRepeat(sheet, move, history)) return null;
  const nth = history.filter((h) => h.shape.repeat).length + 1;
  if (sheet.repetition === 'low') return 'not listening';
  if (sheet.repetition === 'high') return 'settled';
  return ['fine', 'wears thin'][nth - 1] || 'notices the repeat';
}

/** The moves aimed at her so far, this one included, as "suit/angle". */
function cardsPlayed(move, history) {
  return [...history.map((h) => h.move), move].filter((m) => m.suit && m.angle).map((m) => `${m.suit}/${m.angle}`);
}

/**
 * Whether she names the shape of the questioning. Middle catches a straight
 * run of three; high also hears two cards alternating over four turns.
 */
function patternReaction(sheet, move, history) {
  if (!move.suit || !move.angle) return null;
  const cards = cardsPlayed(move, history);
  const last = cards.slice(-4);
  const run = cards.length >= 3 && new Set(cards.slice(-3)).size === 1;
  const alternating = last.length === 4 && last[0] === last[2] && last[1] === last[3] && last[0] !== last[1];
  if (sheet.pattern === 'low') return null;
  if (run) return 'names the run';
  return sheet.pattern === 'high' && alternating ? 'names the alternation' : null;
}

/** True for a move about her problem, as against one about who she is. */
function onPoint(move) {
  return Boolean(move.subject) && !IDENTIFIES.includes(move.subject);
}

/**
 * True when the last thing she was asked about her problem has had nothing
 * out of her yet, so her point is still open.
 */
function pointPending(history) {
  const asked = history.filter((h) => onPoint(h.move));
  const last = asked[asked.length - 1];
  return Boolean(last) && last.shape.gives.length === 0;
}

/**
 * Depth or breadth. Digging: leaving her point before it is answered feels
 * like being brushed off, whether the agent leaves it for another subject
 * or to ask who she is. Casting wide: a third inquiry running on one
 * subject feels stuck.
 */
function reachReaction(sheet, move, history) {
  if (!move.subject) return null;
  const asked = history.filter((h) => onPoint(h.move));
  const prev = asked[asked.length - 1];
  if (!prev) return null;
  if (!onPoint(move)) return sheet.reach === 'digging' && pointPending(history) ? 'brushed off' : null;
  if (sheet.reach === 'digging') {
    const moved = prev.move.subject !== move.subject;
    return moved && prev.shape.gives.length === 0 ? 'brushed off' : null;
  }
  if (sheet.reach === 'wide') {
    const same = asked.slice(-2).every((h) => h.move.subject === move.subject);
    return asked.length >= 2 && same ? 'stuck' : null;
  }
  return null;
}

/** What a clumsy or stock move draws from her, from her own empathy. */
function towardAgent(sheet, move) {
  const clumsy = move.landing === 'misfire' || move.kind === 'blame';
  if (sheet.empathy === 'high') {
    if (move.stock) return 'hears the stock line';
    return clumsy ? 'lets them off' : null;
  }
  if (!clumsy) return null;
  return sheet.empathy === 'low' ? 'no warmth' : 'gets short';
}

/** Whether her baggage comes out in this answer. */
function baggageSurfaces(sheet, move, counts) {
  if (band(counts.openness) === 'tail low') return false;
  if (counts.openness > 1) return true;
  const trigger = BAGGAGE[sheet.baggage].trigger;
  const subjects = [trigger.subject, ...trigger.near];
  return subjects.includes(move.subject) && trigger.suits.includes(move.suit);
}

/**
 * A belief she states when asked near it, or when told she changed
 * something, and whether she is right.
 */
function beliefStated(sheet, move, counts) {
  const subject = move.kind === 'blame' ? 'changed' : move.subject;
  const belief = BELIEVES.find((b) => b.about.includes(subject));
  if (!belief) return null;
  const right = sheet.causes.includes(belief.rightWhen) && !sheet.causes.includes(belief.wrongWhen);
  return { id: belief.id, right, sure: counts.certainty > -1 };
}

/** What a fix, right or wrong, leaves her doing. */
function afterFix(sheet, move, history) {
  const misses = [...history.map((h) => h.move), move].filter((m) => m.kind === 'wrong-fix').length;
  if (move.kind === 'wrong-fix') {
    if (sheet.nonPositive === 'low') return misses >= 2 ? 'asks for someone else' : 'shows it';
    return sheet.nonPositive === 'high' ? 'stops signalling' : 'shows it';
  }
  if (move.kind === 'unclear-fix') return sheet.nonPositive === 'high' ? 'thanks them and rings off' : 'asks what it means';
  if (move.kind === 'blame') return sheet.empathy === 'high' ? 'puts it on the company' : 'turns on the agent';
  return null;
}

/**
 * Whether she answers what was asked or carries on with her own problem.
 * She answers from her own card, which need not be the one asked
 * (settled.md section 2, Her side, mirrored). Only a question about who she
 * is can be left: a question on her problem and her own point are the same
 * thing. She leaves it when her point is still open and either she prefers
 * digging, or this answer has room for only one thing, which she spends on
 * her problem.
 */
function whatSheTakes(sheet, move, history, says) {
  if (!move.subject) return null;
  if (onPoint(move) || !pointPending(history)) return 'the question';
  return sheet.reach === 'digging' || says === 'a few words' ? 'her own point' : 'the question';
}

/** The things she knows that this answer has room for, nearest first. */
function handsOver(move, says, counts, landing, takes, volunteers) {
  // A fix is something said to her; she is not being asked for anything,
  // and what she comes back with, if she does, starts from her own night.
  if (!move.subject && !volunteers) return [];
  const subject = move.subject || 'account';
  // Asked who she is, and answering, she says so first.
  const answers = takes === 'the question' && IDENTIFIES.includes(move.subject);
  const asked = answers ? [`her-${move.subject}`] : [];
  const near = KNOWS.filter((k) => k.about.includes(subject));
  const rest = KNOWS.filter((k) => !near.includes(k));
  const signal = band(counts.signal);
  const lift = { 'tail low': -ROOM[says], 'low side': -1, usual: 0, 'high side': 1, 'tail high': 1 }[signal];
  const room = Math.max(0, Math.min(KNOWS.length, ROOM[says] + lift + (landing === 'critical' ? 1 : 0)));
  const known = [...near, ...rest].map((k) => k.id);
  return [...asked, ...known].slice(0, Math.max(room, asked.length));
}

/**
 * The shape of her answer to one move.
 *
 * Pure: the sheet, move and history are not modified, and the same seed
 * gives the same shape.
 *
 * @param {object} args
 * @param {object} args.sheet one of SHEETS, or the same fields
 * @param {{kind: string, suit?: string, angle?: string, subject?: string,
 *   landing?: string, stock?: boolean}} args.move - `kind` is one of
 *   question, paraphrase, guess, fix, wrong-fix, unclear-fix, blame.
 * @param {Array<{move: object, shape: object}>} [args.history] earlier
 *   moves aimed at her on this call, oldest first
 * @param {() => number} [args.rng] injected; defaults to Math.random
 * @param {Object<string, number>} [args.shift] see drawCounts
 * @returns {object} counts and their bands; `says`; `asked` (false when
 *   the move was a fix said to her, not a question); `takes` ('the
 *   question', or 'her own point' when she leaves it and carries on with
 *   her problem); `volunteers` (true when she comes back with something
 *   of her own after a fix); `gives`; `hedged`,
 *   `flat`, `loose`, `misleading`, `exact`; and what the move set off:
 *   `repeat`, `pattern`, `reach`, `towardAgent`, `baggage`, `belief`,
 *   `afterFix`. Anything not set off is null or false.
 */
function shapeAnswer({ sheet, move, history = [], rng = Math.random, shift = {} }) {
  const landing = move.landing || 'lands';
  // The only chance in an answer: where she lands on her own five curves.
  const drawn = drawCounts(rng, shift);
  const repeat = repeatReaction(sheet, move, history);
  const reach = reachReaction(sheet, move, history);
  const toward = towardAgent(sheet, { ...move, landing });

  // Her sheet's reactions take words away before the answer is sized.
  let drop = 0;
  if (repeat === 'not listening' || repeat === 'wears thin' || repeat === 'notices the repeat') drop += DROP.repeat;
  if (reach) drop += DROP.reach;
  if (toward === 'gets short') drop += DROP.short;
  const counts = { ...drawn, volume: drawn.volume - drop };

  const bands = {};
  for (const count of COUNTS) bands[count] = band(counts[count]);
  const says = SAYS[bands.volume];
  const takes = whatSheTakes(sheet, move, history, says);
  // After a fix she comes back with something of her own when this answer
  // finds her with something useful to say or notably open.
  const volunteers = !move.subject && (counts.signal > 1 || counts.openness > 1);

  return {
    counts,
    bands,
    says,
    asked: Boolean(move.subject),
    takes,
    volunteers,
    gives: handsOver(move, says, counts, landing, takes, volunteers),
    hedged: counts.certainty < -1,
    flat: counts.certainty > 1,
    loose: counts.accuracy < -1,
    misleading: counts.accuracy < -TAIL,
    exact: counts.accuracy > 1,
    repeat,
    pattern: patternReaction(sheet, move, history),
    reach,
    towardAgent: toward,
    baggage: baggageSurfaces(sheet, move, counts) ? sheet.baggage : null,
    belief: beliefStated(sheet, move, counts),
    afterFix: afterFix(sheet, move, history),
  };
}

/**
 * Plays a list of moves at her and returns each with its shape.
 *
 * @param {object} args
 * @param {object} args.sheet
 * @param {object[]} args.moves in order
 * @param {() => number} args.rng injected
 * @param {Object<string, number>} [args.shift]
 * @returns {Array<{move: object, shape: object}>}
 */
function shapeCall({ sheet, moves, rng, shift = {} }) {
  return moves.reduce((history, move) => [...history, { move, shape: shapeAnswer({ sheet, move, history, rng, shift }) }], []);
}

/**
 * One line of plain words for a shape, for reading a call as a person
 * would rather than as numbers.
 *
 * @param {object} shape from shapeAnswer
 * @returns {string}
 */
function describeShape(shape) {
  const parts = [`says ${shape.says}`];
  if (shape.takes === 'her own point') parts.push('leaves the question and carries on with her problem');
  if (shape.asked) parts.push(shape.gives.length ? `gives ${shape.gives.join(', ')}` : 'gives nothing useful');
  if (shape.volunteers && shape.gives.length) parts.push(`volunteers ${shape.gives.join(', ')}`);
  if (shape.hedged) parts.push('hedged');
  if (shape.flat) parts.push('flatly sure');
  if (shape.misleading) parts.push('misleading');
  else if (shape.loose) parts.push('loosely put');
  if (shape.exact) parts.push('exact');
  if (shape.belief) parts.push(`states ${shape.belief.id} (${shape.belief.sure ? 'sure' : 'unsure'}, ${shape.belief.right ? 'right' : 'wrong'})`);
  if (shape.baggage) parts.push(`baggage: ${shape.baggage}`);
  for (const key of ['repeat', 'pattern', 'reach', 'towardAgent', 'afterFix']) {
    if (shape[key]) parts.push(shape[key]);
  }
  return parts.join(' · ');
}

module.exports = {
  COUNTS, TAIL, PULLS, SHEETS, KNOWS, BELIEVES, IDENTIFIES,
  band, drawCounts, shapeAnswer, shapeCall, describeShape,
};
