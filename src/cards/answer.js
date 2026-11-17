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
 * **Nothing in here is a switch or a coin.** Phil, 16 November: the
 * outcomes "fall within a spectrum, and a spectrum of spectrums". So every
 * reaction is a degree between 0 and 1, worked out from other things that
 * are themselves ranges: the value under each band on her sheet, how much
 * of her point has been answered, how like an earlier question this one is,
 * and where she landed on her five counts. A reaction's effect scales with
 * its degree. The words in `labels` are put on last, for a person reading;
 * nothing is decided from them.
 *
 * The only chance is where she lands on her own five curves. Pin those and
 * the answer is fixed.
 *
 * What is Phil's here: the five sheet fields and what each band means
 * (settled.md section 8, Fields), with a continuous value underneath; the
 * five counts and that each answer is a draw from her own bell curve on
 * each, with the counts acting on one another (docs/claims-her-side.md,
 * 16-24); what she knows on this call (docs/notes-reply-engine.md, top);
 * that she answers from her own card, which need not be the one asked.
 * **Every number is Claude's guess**, and so is how the ranges combine.
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

/** The value under each band, where a sheet gives the band and no number. */
const VALUE = Object.freeze({ low: 0.2, middle: 0.5, high: 0.8 });

/** The same for depth or breadth: how strongly she prefers digging. */
const DEPTH = Object.freeze({ wide: 0.2, none: 0.5, digging: 0.8 });

/** How the ranges combine. Every one is a guess. */
const WEIGHT = Object.freeze({
  // How like an earlier question a new one is: the word, the suit, the angle.
  sameWord: 0.6, sameSuit: 0.2, sameAngle: 0.2,
  // How much each repeat wears her tolerance down for the rest of the call.
  wear: 0.4,
  // How far a new subject is from her point: a related one, an unrelated
  // one, and a question about who she is.
  related: 0.3, unrelated: 0.6, whoSheIs: 1,
  // Things she knows that make a full answer to a question on her point.
  fullAnswer: 2,
  // How clumsy a move is to her ear.
  misfire: 1, flat: 0.3, stock: 0.6,
  // What a trigger near her baggage adds, and how much a wrong suit dulls it.
  trigger: 0.6, near: 0.7, wrongSuit: 0.5,
  // Spreads of volume a reaction at full strength takes from her.
  repeatDrop: 1.2, reachDrop: 1, shortDrop: 0.5,
  // How much saying her baggage eases the pressure behind it.
  ease: 0.8,
  // What sours her over a call, and how many spreads of volume souring
  // takes from every answer after: a repeat that grates, and a miss.
  sourRepeat: 0.5, sourMiss: 1, sourDrop: 0.3,
});

/**
 * How much of each kind of thing she still holds from one answer to the
 * next. The record's order, from the research Phil cited
 * (docs/handover/memory/therealm-design-frame.md): gist very high, emotion
 * high, her own words moderate-high, exact dialogue extremely low. What she
 * felt fades slowly; that she said a particular thing fades faster, which is
 * why people repeat themselves. Guesses within that order.
 */
const RETAIN = Object.freeze({ emotion: 0.95, ownWords: 0.8 });

/** Where a degree is spoken of at all, plainly, and strongly, in a label. */
const SAY = Object.freeze({ some: 0.3, plain: 0.5, strong: 0.75 });

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
 * reaches for it. `about` is the subjects each one answers to; `answers` is
 * the kind of answer it is, by suit (docs/card-rules.md, rule 8: the suit is
 * the kind of answer asked for), so that "who can get into the bag?" is
 * answered with Pell and not with the transfer.
 */
const KNOWS = Object.freeze([
  { id: 'cannot-transfer', about: ['transfer', 'draught', 'bag', 'working'], answers: ['what', 'how'] },
  { id: 'pell-shut-out', about: ['pell', 'bag', 'working'], answers: ['who', 'what'] },
  { id: 'leaves-in-the-morning', about: ['morning', 'pell', 'contract'], answers: ['when', 'why'] },
  { id: 'never-a-problem-before', about: ['before', 'bag', 'working'], answers: ['when'] },
  { id: 'at-it-since-last-night', about: ['tried', 'account', 'transfer'], answers: ['when', 'how'] },
]);

/** What identifies her, as against what her problem is. */
const IDENTIFIES = Object.freeze(['name', 'number', 'party', 'account']);

/**
 * What she believes and can be wrong about. `rightWhen` names a cause that
 * makes it true; `wrongWhen` one that makes it false. Whether she is right
 * is a fact about the call, not a degree; how sure she is, is a degree.
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

const clamp = (n) => Math.max(0, Math.min(1, n));

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
 * The value under a band on her sheet, from 0 to 1.
 *
 * The record gives each trait a written meaning at low, middle and high
 * "with a continuous value underneath: the number decides the band and the
 * strength within it". A sheet may carry the number in `values`; where it
 * gives only the band, the middle of that band is used.
 *
 * @param {object} sheet
 * @param {'repetition'|'empathy'|'pattern'|'nonPositive'|'depth'} field
 *   `depth` is how strongly she prefers digging over casting wide.
 * @returns {number}
 */
function valueOf(sheet, field) {
  if (sheet.values && typeof sheet.values[field] === 'number') return clamp(sheet.values[field]);
  return field === 'depth' ? DEPTH[sheet.reach] : VALUE[sheet[field]];
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
  for (const target of ['volume', 'signal', 'accuracy']) {
    for (const pull of PULLS) {
      if (pull.to !== target) continue;
      const source = z[pull.from];
      z[target] += (source < 0 ? pull.low : pull.high) * source;
    }
  }
  return z;
}

/** True for a move about her problem, as against one about who she is. */
function onPoint(move) {
  return Boolean(move.subject) && !IDENTIFIES.includes(move.subject);
}

/** The moves about her problem so far, oldest first. */
function pointSoFar(history) {
  return history.filter((h) => onPoint(h.move));
}

/**
 * How like something already asked or said this move is, from 0 to 1. Her
 * own words said back to her are wholly so. A question is as like an
 * earlier one as it shares its word, its suit and its angle.
 */
function likeness(move, history) {
  if (move.kind === 'paraphrase') return 1;
  if (move.kind !== 'question') return 0;
  return history.reduce((most, h) => {
    if (h.move.kind !== 'question' || h.move.subject !== move.subject) return most;
    const like = WEIGHT.sameWord
      + (h.move.suit === move.suit ? WEIGHT.sameSuit : 0)
      + (h.move.angle === move.angle ? WEIGHT.sameAngle : 0);
    return Math.max(most, like);
  }, 0);
}

/**
 * Where she stands at the start of a call, before anything has happened:
 * her sheet's own values, nothing said, nothing soured.
 *
 * Nothing in here is perfect recall. `said` is how strongly she remembers
 * having said each thing, from 1 when she has just said it, fading at the
 * rate for her own words; the feelings fade back toward her sheet at the
 * slower rate for emotion.
 *
 * @param {object} sheet
 * @returns {{tolerance: number, pressure: number, strain: number,
 *   sour: number, said: Object<string, number>}}
 */
function freshNow(sheet) {
  return Object.freeze({ tolerance: valueOf(sheet, 'repetition'), pressure: 1, strain: 0, sour: 0, said: Object.freeze({}) });
}

/** Where she stands now: what the call so far has written on her sheet. */
function nowOf(sheet) {
  return sheet.now || freshNow(sheet);
}

/**
 * What going back over something does to her. Her tolerance starts at the
 * value on her sheet and is worn down by every repeat so far in this call,
 * faster the less of it she had (settled.md section 8: it "can wear down
 * inside a single bad call"). `repeat` is how much this one grates;
 * `settles` is how much it reassures her, which is the high end of the same
 * trait, where she wants it.
 */
function repetition(sheet, move, history) {
  const like = likeness(move, history);
  // Grating is against her tolerance as the call has worn it; wanting it,
  // at the high end, is her own and does not wear.
  return { likeness: like, repeat: like * (1 - nowOf(sheet).tolerance), settles: like * valueOf(sheet, 'repetition') };
}

/** How much of her point is still unanswered, from 0 to 1. */
function pointOpen(history) {
  const asked = pointSoFar(history);
  const last = asked[asked.length - 1];
  return last ? 1 - clamp(last.shape.gives.length / WEIGHT.fullAnswer) : 0;
}

/** How far this move is from the point she was last on, from 0 to 1. */
function distance(move, history) {
  if (!move.subject) return 0;
  if (!onPoint(move)) return WEIGHT.whoSheIs;
  const asked = pointSoFar(history);
  const last = asked[asked.length - 1];
  if (!last || last.move.subject === move.subject) return 0;
  const related = KNOWS.some((k) => k.about.includes(move.subject) && k.about.includes(last.move.subject));
  return related ? WEIGHT.related : WEIGHT.unrelated;
}

/**
 * Depth or breadth, as two degrees on one trait. `brushedOff` grows with
 * how strongly she prefers digging, how much of her point is still open,
 * and how far the move leaves it. `stuck` grows with how strongly she
 * prefers casting wide and how long the agent has stayed on one word.
 */
function reach(sheet, move, history) {
  const depth = valueOf(sheet, 'depth');
  const asked = pointSoFar(history);
  let stayed = 0;
  for (let i = asked.length - 1; i >= 0 && asked[i].move.subject === move.subject; i--) stayed++;
  return {
    brushedOff: depth * pointOpen(history) * distance(move, history),
    stuck: onPoint(move) ? (1 - depth) * clamp(stayed / 2) : 0,
  };
}

/**
 * How much she hears the shape of the questioning. A straight run of one
 * card is heard in proportion to her sensitivity. Two cards alternating is
 * a subtler shape, heard only by the upper half of the trait.
 */
function patternHeard(sheet, move, history) {
  if (!move.suit || !move.angle) return { pattern: 0, shape: null };
  const sense = valueOf(sheet, 'pattern');
  const cards = [...history.map((h) => h.move), move].filter((m) => m.suit && m.angle).map((m) => `${m.suit}/${m.angle}`);
  let run = 1;
  for (let i = cards.length - 2; i >= 0 && cards[i] === cards[cards.length - 1]; i--) run++;
  const last = cards.slice(-4);
  const alternating = last.length === 4 && last[0] === last[2] && last[1] === last[3] && last[0] !== last[1];
  const asRun = sense * clamp((run - 1) / 2);
  const asShape = alternating ? clamp((sense - 0.5) * 2) : 0;
  return { pattern: Math.max(asRun, asShape), shape: asShape > asRun ? 'alternation' : 'run' };
}

/**
 * What a clumsy or stock move draws from her. Her empathy is how closely
 * she reads the agent: the more of it, the more a clumsy move is met with
 * `warmth`; the less, the more it is met `short`.
 */
function towardAgent(sheet, move, landing) {
  const empathy = valueOf(sheet, 'empathy');
  const landed = move.kind === 'blame' ? WEIGHT.misfire : (WEIGHT[landing] || 0);
  const clumsy = Math.max(landed, move.stock ? WEIGHT.stock : 0);
  return { warmth: empathy * clumsy, short: (1 - empathy) * clumsy, hearsStock: move.stock ? empathy : 0 };
}

/**
 * How far her baggage comes out in this answer, from 0 to 1: how open she
 * is running, plus the pull of its trigger, which is dulled as she closes
 * up and gone when she is shut tight.
 */
function baggageOut(sheet, move, counts) {
  const trigger = BAGGAGE[sheet.baggage].trigger;
  const hit = move.subject === trigger.subject ? 1 : (trigger.near.includes(move.subject) ? WEIGHT.near : 0);
  const suit = trigger.suits.includes(move.suit) ? 1 : WEIGHT.wrongSuit;
  const open = clamp(counts.openness / 2 + 0.1);
  // Having said it already this call eases the pressure behind it.
  return nowOf(sheet).pressure * clamp(open + WEIGHT.trigger * hit * suit * clamp((counts.openness + 3) / 3));
}

/** A belief she states when asked near it, or told she changed something. */
function beliefStated(sheet, move, counts) {
  const subject = move.kind === 'blame' ? 'changed' : move.subject;
  const belief = BELIEVES.find((b) => b.about.includes(subject));
  if (!belief) return null;
  const right = sheet.causes.includes(belief.rightWhen) && !sheet.causes.includes(belief.wrongWhen);
  return { id: belief.id, right, sure: clamp((counts.certainty + 2) / 3) };
}

/**
 * What a fix leaves in her. `strain` is what the misses so far have cost
 * her, less the more she tolerates; `shows` is how much of it reaches the
 * agent, which falls away faster still at the high end, where "you lose
 * your read". `asks` is how readily she questions a fix she did not follow.
 * `onAgent` and `onCompany` are where being blamed lands.
 */
function afterFix(sheet, move) {
  const tolerates = valueOf(sheet, 'nonPositive');
  const empathy = valueOf(sheet, 'empathy');
  const strain = clamp(nowOf(sheet).strain + (move.kind === 'wrong-fix' ? (1 - tolerates) / 2 : 0));
  return {
    strain,
    shows: clamp(strain * (1.6 - 1.5 * tolerates)),
    asks: move.kind === 'unclear-fix' ? 1 - tolerates : 0,
    onAgent: move.kind === 'blame' ? 1 - empathy : 0,
    onCompany: move.kind === 'blame' ? empathy : 0,
  };
}

/**
 * How much of an answer about who she is goes to her own problem instead,
 * from 0 (she answers) to 1 (she leaves the question entirely). It grows
 * with how much of her point is open, how strongly she prefers digging,
 * how little room this answer has, and how open she is running.
 */
function ownPoint(sheet, move, history, says, counts) {
  if (!move.subject || onPoint(move)) return 0;
  const tight = 1 - clamp((ROOM[says] - 1) / (KNOWS.length - 1));
  const pressed = pointOpen(history) * (0.6 * valueOf(sheet, 'depth') + 0.4 * tight);
  return clamp(pressed + 0.15 * clamp(counts.openness / 2));
}

/** The room this answer has for things she knows. */
function roomFor(says, counts, landing) {
  const lift = { 'tail low': -ROOM[says], 'low side': -1, usual: 0, 'high side': 1, 'tail high': 1 }[band(counts.signal)];
  return Math.max(0, Math.min(KNOWS.length, ROOM[says] + lift + (landing === 'critical' ? 1 : 0)));
}

/**
 * What she hands over. On her problem: what she knows, nearest the question
 * first. Asked who she is: her answer and her problem share the room, her
 * problem taking at least the share `own` gives it; past halfway her
 * problem comes first, and near the top she leaves the question out. After a
 * fix: only as much as she is moved to volunteer, starting from her own
 * night on the account.
 */
function handsOver(move, room, own, volunteers, said) {
  const subject = move.subject || 'account';
  const near = KNOWS.filter((k) => k.about.includes(subject));
  const ranked = [...near, ...KNOWS.filter((k) => !near.includes(k))].map((k) => k.id);
  // What she remembers saying least comes first, so something said long
  // enough ago can come round again. The one thing the question is aimed
  // straight at she answers either way.
  const fits = near.filter((k) => k.answers.includes(move.suit));
  const aimed = (fits.length ? fits : near).slice(0, 1).map((k) => k.id);
  const rest = ranked.filter((id) => !aimed.includes(id));
  const recall = (id) => said[id] || 0;
  const known = [...aimed, ...rest.map((id, i) => ({ id, i })).sort((a, b) => recall(a.id) - recall(b.id) || a.i - b.i).map((x) => x.id)];
  if (!move.subject) return known.slice(0, Math.round(volunteers * room));
  if (onPoint(move)) return known.slice(0, room);
  const asked = `her-${move.subject}`;
  const slots = Math.max(1, room);
  if (own >= SAY.strong) return known.slice(0, slots);
  // Her problem takes its share of the room, and whatever room is left
  // over once she has said who she is.
  const hers = known.slice(0, Math.max(Math.round(own * slots), slots - 1));
  return own >= SAY.plain ? [...hers, asked] : [asked, ...hers];
}

/** A degree in words, for a label: slight, plain, or strong. */
function howMuch(degree, word) {
  if (degree < SAY.some) return null;
  if (degree < SAY.plain) return `a little ${word}`;
  return degree < SAY.strong ? word : `badly ${word}`;
}

/**
 * The words a person would put on the degrees. Read-only: nothing in the
 * answer is decided from these.
 */
function labelsFor(sheet, move, d, takesShare) {
  const tolerance = valueOf(sheet, 'repetition');
  let repeat = null;
  if (d.likeness > 0) {
    if (d.repeat >= SAY.strong) repeat = tolerance < 0.35 ? 'reads it as not listening' : 'notices the repeat';
    else if (d.repeat >= 0.55) repeat = 'it wears thin';
    else repeat = d.settles >= 0.65 ? 'settled by it' : 'fine with it';
  }
  let toward = null;
  if (d.hearsStock >= 0.65) toward = 'hears the stock line';
  else if (d.warmth >= 0.6) toward = 'lets them off';
  else if (d.short >= 0.4) toward = valueOf(sheet, 'empathy') < 0.35 ? 'no warmth' : 'gets short';
  let fix = null;
  if (move.kind === 'wrong-fix') fix = d.strain >= SAY.strong ? 'asks for someone else' : (d.shows >= 0.2 ? 'shows it' : 'gives no sign');
  if (move.kind === 'unclear-fix') fix = d.asks >= 0.45 ? 'asks what it means' : 'thanks them and rings off';
  if (move.kind === 'blame') fix = d.onAgent >= d.onCompany ? 'turns on the agent' : 'puts it on the company';
  let takes = null;
  if (move.subject) {
    if (takesShare >= SAY.strong) takes = 'leaves the question';
    else if (takesShare >= SAY.plain) takes = 'half-answers and drifts';
    else takes = takesShare >= 0.15 ? 'answers and adds' : 'answers';
  }
  return {
    takes,
    repeat,
    reach: howMuch(d.brushedOff, 'brushed off') || howMuch(d.stuck, 'stuck'),
    pattern: d.pattern >= 0.45 ? `names the ${d.patternShape}` : (d.pattern >= SAY.some ? `starts to hear the ${d.patternShape}` : null),
    towardAgent: toward,
    baggage: d.baggage >= SAY.plain ? sheet.baggage : null,
    afterFix: fix,
  };
}

/**
 * The shape of her answer to one move.
 *
 * Pure: the sheet, move and history are not modified. Ten numbers are taken
 * from `rng`, two for each of her five counts, and no others: with the
 * counts pinned the whole answer is fixed.
 *
 * @param {object} args
 * @param {object} args.sheet one of SHEETS, or the same fields; `values`
 *   may give the number under any band (see valueOf)
 * @param {{kind: string, suit?: string, angle?: string, subject?: string,
 *   landing?: string, stock?: boolean}} args.move - `kind` is one of
 *   question, paraphrase, guess, fix, wrong-fix, unclear-fix, blame.
 * @param {Array<{move: object, shape: object}>} [args.history] earlier
 *   moves aimed at her on this call, oldest first
 * @param {() => number} [args.rng] injected; defaults to Math.random
 * @param {Object<string, number>} [args.shift] see drawCounts
 * @returns {object} `counts` and their `bands`; `says`; `asked` (false when
 *   the move was a fix said to her); `gives`; `hedged`, `flat`, `loose`,
 *   `misleading`, `exact`; `belief`; `degrees`, every reaction from 0 to 1;
 *   `labels`, the same in words; and `sheet`, her sheet as this answer
 *   leaves it, which the next answer starts from. `sheet.now` holds what
 *   the call has written on her: her tolerance as worn so far, the
 *   pressure behind her baggage, the strain from misses, how soured she
 *   is, and how well she remembers what she has already said. Each fades
 *   at the rate for its kind (RETAIN); none of it is perfect recall.
 */
function shapeAnswer({ sheet, move, history = [], rng = Math.random, shift = {} }) {
  const landing = move.landing || 'lands';
  const drawn = drawCounts(rng, shift);
  const again = repetition(sheet, move, history);
  const reached = reach(sheet, move, history);
  const toward = towardAgent(sheet, move, landing);

  // Each reaction takes words from her in proportion to its strength.
  // What has soured her so far in the call takes some from every answer.
  const now = nowOf(sheet);
  const drop = WEIGHT.repeatDrop * again.repeat * again.repeat
    + WEIGHT.reachDrop * (reached.brushedOff + reached.stuck)
    + WEIGHT.shortDrop * toward.short * clamp(2 * valueOf(sheet, 'empathy'))
    + WEIGHT.sourDrop * now.sour;
  const counts = { ...drawn, volume: drawn.volume - drop };

  const bands = {};
  for (const count of COUNTS) bands[count] = band(counts[count]);
  const says = SAYS[bands.volume];
  const own = ownPoint(sheet, move, history, says, counts);
  const volunteers = move.subject ? 0 : clamp(Math.max(counts.signal, counts.openness) / 2);
  const heard = patternHeard(sheet, move, history);

  const degrees = {
    ...again,
    ...reached,
    ownPoint: own,
    pattern: heard.pattern,
    patternShape: heard.shape,
    ...toward,
    baggage: baggageOut(sheet, move, counts),
    ...afterFix(sheet, move),
    volunteers,
  };
  const gives = handsOver(move, roomFor(says, counts, landing), own, volunteers, now.said);
  const labels = labelsFor(sheet, move, degrees, own);

  // What this answer writes back on her sheet, for the next one to start
  // from (settled.md section 8: one sheet, with her mood in this call
  // changing turn to turn).
  // changing turn to turn). None of it is held perfectly: each thing fades
  // at the rate for its kind before this answer adds to it.
  const base = valueOf(sheet, 'repetition');
  const fade = (value, rest) => rest + (value - rest) * RETAIN.emotion;
  const said = {};
  for (const [id, held] of Object.entries(now.said)) said[id] = held * RETAIN.ownWords;
  for (const g of gives) if (!g.startsWith('her-')) said[g] = 1;
  const wrote = Object.freeze({
    tolerance: Math.max(0, fade(now.tolerance, base) - WEIGHT.wear * (1 - base) * again.likeness),
    pressure: labels.baggage ? fade(now.pressure, 1) * (1 - WEIGHT.ease * degrees.baggage) : fade(now.pressure, 1),
    strain: fade(degrees.strain, 0),
    sour: fade(now.sour, 0) + WEIGHT.sourRepeat * again.repeat + (move.kind === 'wrong-fix' ? WEIGHT.sourMiss * (1 - valueOf(sheet, 'nonPositive')) : 0),
    said: Object.freeze(said),
  });

  return {
    counts,
    bands,
    says,
    asked: Boolean(move.subject),
    gives,
    hedged: counts.certainty < -1,
    flat: counts.certainty > 1,
    loose: counts.accuracy < -1,
    misleading: counts.accuracy < -TAIL,
    exact: counts.accuracy > 1,
    belief: beliefStated(sheet, move, counts),
    degrees,
    labels,
    sheet: Object.freeze({ ...sheet, now: wrote }),
  };
}

/**
 * Plays a list of moves at her and returns each with its shape. Each answer
 * starts from her sheet as the answer before it left it.
 *
 * @param {object} args
 * @param {object} args.sheet
 * @param {object[]} args.moves in order
 * @param {() => number} args.rng injected
 * @param {Object<string, number>} [args.shift]
 * @returns {Array<{move: object, shape: object}>}
 */
function shapeCall({ sheet, moves, rng, shift = {} }) {
  let current = sheet;
  return moves.reduce((history, move) => {
    const shape = shapeAnswer({ sheet: current, move, history, rng, shift });
    current = shape.sheet;
    return [...history, { move, shape }];
  }, []);
}

/**
 * One line of plain words for a shape, for reading a call as a person
 * would rather than as numbers.
 *
 * @param {object} shape from shapeAnswer
 * @returns {string}
 */
function describeShape(shape) {
  const { labels } = shape;
  const parts = [`says ${shape.says}`];
  if (labels.takes && labels.takes !== 'answers') parts.push(labels.takes);
  if (shape.asked) parts.push(shape.gives.length ? `gives ${shape.gives.join(', ')}` : 'gives nothing useful');
  else if (shape.gives.length) parts.push(`volunteers ${shape.gives.join(', ')}`);
  if (shape.hedged) parts.push('hedged');
  if (shape.flat) parts.push('flatly sure');
  if (shape.misleading) parts.push('misleading');
  else if (shape.loose) parts.push('loosely put');
  if (shape.exact) parts.push('exact');
  if (shape.belief) parts.push(`states ${shape.belief.id} (${shape.belief.sure >= SAY.plain ? 'sure' : 'unsure'}, ${shape.belief.right ? 'right' : 'wrong'})`);
  if (labels.baggage) parts.push(`baggage: ${labels.baggage}`);
  for (const key of ['repeat', 'pattern', 'reach', 'towardAgent', 'afterFix']) {
    if (labels[key] && labels[key] !== 'fine with it') parts.push(labels[key]);
  }
  return parts.join(' · ');
}

module.exports = {
  COUNTS, TAIL, PULLS, WEIGHT, RETAIN, SHEETS, KNOWS, BELIEVES, IDENTIFIES,
  band, valueOf, freshNow, drawCounts, shapeAnswer, shapeCall, describeShape,
};
