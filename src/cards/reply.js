'use strict';

const SHEET = require('./sheet');
const WORDS = require('./words');

/**
 * Her side of a turn.
 *
 * The player offers one or two inquiries. She chooses whether she responds
 * to the first, the second, both, or goes her own way, and that choice comes
 * off her sheet — roughly like an actor given a role (settled.md §2, The
 * turn, and her side of it). Then she chooses her words like a Mad Lib, and
 * the filled template is what a generator would be given as its prompt
 * (settled.md §8, Her words).
 *
 * This module stops at the template. It decides what she gives and which
 * words she reaches for; it does not write her sentence. Every fact in a
 * template is a line the scenario already holds, because a generator may not
 * be handed anything she could not truthfully say.
 *
 * **[C] Every number in `LEAN` is a guess of mine**, kept in one place so it
 * can be measured and argued with.
 */

const PICKS = ['first', 'second', 'both', 'random'];

const LEAN = {
  // How willing she is to talk about a subject, by its ward. A subject she
  // has already talked about is no longer cold.
  ward: { 1: 1, 2: 0.9, 3: 0.5 },
  learned: 1,
  // A question whose suit suits the subject, against one that merely parses.
  fits: 1.2,
  beside: 0.55,
  // A question that does not parse at all. She may still repair the slip.
  nonsense: 0.6,
  // What she has been missing is what she most wants to be asked about.
  trigger: 1.5,
  // Asked again inside three turns, and something she has already answered.
  repeated: 0.5,
  answered: 0.6,
  // How readily she gives two answers for one turn, per point of patience.
  bothBase: 0.55,
  bothPerPatience: 0.12,
  // Going her own way never quite goes to zero, and grows as the call sours.
  ownFloor: 0.05,
  ownPerSour: 0.06,
};

function clamp(n) {
  return Math.max(0, Math.min(1, n));
}

/**
 * How drawn she is to one inquiry, from 0 to 1.
 *
 * It takes the subject's ward, whether the suit suits the subject, her
 * baggage trigger, and what has already been asked — the customer, her sheet
 * and the target together (settled.md §8, Wards).
 *
 * @param {object} sc - the scenario.
 * @param {object} sheet
 * @param {{suit: string, angle: string, subject: string}} inquiry
 * @param {{recent?: string[], answered?: string[]}} [state]
 * @returns {number}
 */
function pull(sc, sheet, inquiry, state = {}) {
  const { suit, subject } = inquiry;
  let p = sheet.learned.includes(subject)
    ? LEAN.learned
    : LEAN.ward[SHEET.ward(sheet, subject)] || LEAN.ward[2];
  if (sc.nonsense(suit, subject)) p *= LEAN.nonsense;
  else p *= sc.fits(suit, subject) ? LEAN.fits : LEAN.beside;
  if (SHEET.fires(sheet, { suit, subject }).fired) p *= LEAN.trigger;
  if ((state.recent || []).includes(subject)) p *= LEAN.repeated;
  if ((state.answered || []).includes(subject)) p *= LEAN.answered;
  return clamp(p);
}

/**
 * The odds of each thing she might do with what she was offered.
 *
 * With one inquiry she can take it or go her own way; `second` and `both`
 * are zero. With two, taking one means leaving the other, so the more she is
 * drawn to both the likelier she answers both — if she has the patience.
 *
 * @param {object} sc
 * @param {object} sheet
 * @param {Array<{suit: string, angle: string, subject: string}>} inquiries -
 *   one or two.
 * @param {{recent?: string[], answered?: string[], sour?: number}} [state] -
 *   `sour` counts what has gone badly for her on this call.
 * @returns {{first: number, second: number, both: number, random: number}}
 *   summing to 1.
 */
function odds(sc, sheet, inquiries, state = {}) {
  const sour = state.sour || 0;
  const a = pull(sc, sheet, inquiries[0], state);
  // Going her own way has to introduce something (Phil, 8 October). With
  // nothing new to say she answers what she was asked.
  const can = state.canOwn !== false;
  const own = can ? LEAN.ownFloor + LEAN.ownPerSour * sour : 0;
  let raw;
  if (inquiries.length < 2) {
    raw = { first: a, second: 0, both: 0, random: can ? (1 - a) + own : 0 };
  } else {
    const b = pull(sc, sheet, inquiries[1], state);
    const open = clamp(LEAN.bothBase + LEAN.bothPerPatience * (sheet.patience - 3 - sour));
    raw = {
      first: a * (1 - b * open),
      second: b * (1 - a * open),
      both: a * b * open,
      random: can ? (1 - a) * (1 - b) + own : 0,
    };
  }
  const total = raw.first + raw.second + raw.both + raw.random;
  if (total <= 0) return { first: 1, second: 0, both: 0, random: 0 };
  return {
    first: raw.first / total,
    second: raw.second / total,
    both: raw.both / total,
    random: raw.random / total,
  };
}

/**
 * What she does with the turn.
 *
 * @param {object} args
 * @param {object} args.sc
 * @param {object} args.sheet
 * @param {object[]} args.inquiries
 * @param {object} [args.state]
 * @param {() => number} args.rng
 * @returns {'first'|'second'|'both'|'random'}
 */
function choose({ sc, sheet, inquiries, state, rng }) {
  const o = odds(sc, sheet, inquiries, state);
  let roll = rng();
  for (const k of PICKS) {
    roll -= o[k];
    if (roll <= 0) return k;
  }
  return 'random';
}

/**
 * What she gives on one inquiry she has decided to respond to.
 *
 * - `clue` — the question did not parse; she takes it as a slip and hands
 *   over one true thing (settled.md, 5 October).
 * - `cause` — she describes what she actually did or wanted, which is the
 *   explanation. Only on a subject the cause runs through.
 * - `departure` — something true and unusual that is not the explanation.
 * - `answer` — the fact she has on that subject, to a question that suits it.
 * - `beside` — the same fact to a question that does not quite suit it: she
 *   answers, but not the way it was asked.
 */
function give({ sc, inquiry, cause, herrings, answered, given, pointed = [], rng }) {
  const { suit, subject } = inquiry;
  const asked = { suit: inquiry.suit, angle: inquiry.angle, subject };
  if (sc.nonsense(suit, subject)) {
    const pool = (sc.FRAGMENTS[subject] || [])
      .concat(sc.FRAGMENT_FALLBACK || [])
      .filter((f) => !given.includes(f.say()));
    if (!pool.length) return { asked, kind: 'spent', fact: null, opens: [] };
    const f = pool[Math.floor(rng() * pool.length)];
    return { asked, kind: 'clue', fact: f.say(), opens: f.opens.slice() };
  }
  const set = cause.reach.find((r) => r.includes(subject));
  if (set && set.every((w) => w === subject || answered.includes(w))) {
    return {
      asked,
      kind: 'cause',
      fact: cause.departures[Math.floor(rng() * cause.departures.length)],
      opens: [],
      suggests: cause.suggests.slice(),
    };
  }
  // Something she has already brought up herself is not said a second time.
  if (herrings.includes(subject) && !pointed.includes(subject)) {
    const h = sc.HERRINGS[subject];
    return { asked, kind: 'departure', fact: h.text, opens: [], suggests: h.suggests.slice() };
  }
  const fact =
    sc.BASELINE[subject] || (sc.BELIEFS[subject] && sc.BELIEFS[subject].any) || null;
  return {
    asked,
    kind: sc.fits(suit, subject) ? 'answer' : 'beside',
    fact,
    opens: ((sc.TALK && sc.TALK.OPENS && sc.TALK.OPENS[subject]) || sc.GIVES[subject] || []).slice(),
  };
}

/**
 * The inquiry a line can be said in place of answering — or null.
 *
 * Only the last thing asked counts (Phil, 10 October): with two questions,
 * a line set off by the first reads as skipping what was just said ("What
 * did you try first? And where is the draught now?" — "Les would've known
 * what to do.").
 *
 * `table` is `{subject: {'suit/angle': [words that must already be in
 * play]}}`, the same shape as the scenario's `NEEDS`. It is per question and
 * not per subject because the tie is in the wording of the question: "What
 * have you tried?" can be met with "Les would've known what to do", and
 * "Talk me through what you did" cannot.
 *
 * @param {Object<string, Object<string, string[]>>} table
 * @param {Array<{suit: string, angle: string, subject: string}>} inquiries
 * @param {string[]} have - what has been introduced on this call.
 * @returns {{suit: string, angle: string, subject: string}|null} a copy of
 *   the last inquiry, if the line is tied to it.
 */
function follows(table, inquiries, have) {
  const q = inquiries[inquiries.length - 1];
  if (!q) return null;
  const needs = (table[q.subject] || {})[`${q.suit}/${q.angle}`];
  if (!needs || !needs.every((w) => have.includes(w))) return null;
  return { suit: q.suit, angle: q.angle, subject: q.subject };
}

/**
 * What she could say if she went her own way this turn.
 *
 * Her baggage, once; a memory; or, in a scenario with no life written for
 * her, a live departure or a statement written for her to make unasked. Her
 * baggage and her memories are offered only straight after a question the
 * scenario says they can follow. Where the scenario tags what its lines
 * introduce, an option counts only if it would put something new in play —
 * the random option is supposed to add something to the mix, so a line that
 * adds nothing is not an option. Plain frustration is left out until a
 * generator can tie it to what was asked.
 *
 * @returns {Array<{kind: string, about: string|null, fact: string|null,
 *   says: string[], suggests: string[], mind: boolean, life?: string,
 *   follows?: object|null}>} `follows` is the inquiry the line was said in
 *   place of answering, where the scenario ties its lines to questions.
 */
function ownOptions({ sc, sheet, inquiries, herrings, answered, state }) {
  const asked = inquiries.map((q) => q.subject);
  const tags = sc.TALK && sc.TALK.SAYS_OTHER;
  const have = state.introduced || [];
  const fresh = (says) => !tags || says.some((w) => !have.includes(w));
  const free = (w) => !asked.includes(w) && !answered.includes(w) && !(state.pointed || []).includes(w);
  const t = sheet.baggage.trigger || { subject: null, near: [] };
  const onMind = (w) => w === t.subject || (t.near || []).includes(w);
  const out = [];
  // Neither is one of her choices (settled.md §2), and whether she takes it
  // is her wards' to decide, in `odds`. What is decided here is only what she
  // has to say when she does.
  // **[C] Mine:** where the scenario lists the questions a line can be said
  // in place of answering (`inPlaceOf`), it is offered only straight after
  // one of them. Her line has to come from what she was just asked: tied by
  // subject alone it was heard as not listening ("Talk me through what you
  // did." — "Nobody has ever sat down and told me how any of this is meant
  // to go.").
  const tied = sheet.baggage.inPlaceOf;
  const after = tied ? follows(tied, inquiries, have) : null;
  // **[C] Mine:** with a life on her sheet, never as her first reply.
  const first = sc.LIFE && (state.turnAtHer || 0) < 1;
  if (!state.saidBaggage && !first && (!tied || after)) {
    // Her baggage is itself the new thing she brings in.
    const says = (tags ? tags.baggage[sheet.baggage.id] || [] : []).concat(tied ? [`baggage:${sheet.baggage.id}`] : []);
    if (fresh(says)) out.push({ kind: 'bad experience', about: null, fact: sheet.baggage.line, says, suggests: [], mind: true, follows: after });
  }
  if (sc.LIFE) {
    // A memory with no `inPlaceOf` only ever comes beside an answer
    // (`lifeAside`). Unasked statements about the problem are not offered:
    // they were the problem again, said sideways.
    const used = state.usedLife || [];
    if (!first) {
      for (const m of sc.LIFE.LIFE) {
        const q = m.inPlaceOf && !used.includes(m.id) ? follows(m.inPlaceOf, inquiries, have) : null;
        if (q) out.push({ kind: 'life', about: null, fact: null, life: m.id, says: [`life:${m.id}`], suggests: [], mind: true, follows: q });
      }
    }
    return out;
  }
  for (const w of herrings.filter(free)) {
    const says = tags ? tags.departure[w] || [] : [w];
    if (fresh(says)) out.push({ kind: 'non-sequitur', about: w, fact: sc.HERRINGS[w].text, says, suggests: sc.HERRINGS[w].suggests.slice(), mind: onMind(w) });
  }

  const written = sc.TALK ? Object.keys(sc.TALK.VOLUNTEER) : Object.keys(sc.BASELINE);
  for (const w of written.filter((x) => free(x) && !herrings.includes(x))) {
    const says = tags ? tags.volunteer[w] || [] : [w];
    const fact = sc.TALK ? sc.TALK.VOLUNTEER[w] : sc.BASELINE[w];
    if (fresh(says)) out.push({ kind: 'non-sequitur', about: w, fact, says, suggests: [], mind: onMind(w) });
  }
  return out;
}

/**
 * Going her own way: what she says when she answers neither.
 *
 * What her baggage keeps her mind on comes first; otherwise any of her
 * options. With no option she says nothing of her own (`kind: 'nothing'`),
 * which `odds` avoids by not letting her choose it.
 */
function ownWay({ sc, sheet, inquiries, herrings, answered, state, rng }) {
  const options = ownOptions({ sc, sheet, inquiries, herrings, answered, state });
  if (!options.length) return { kind: 'nothing', fact: null, about: null, opens: [], says: [] };
  const mind = options.filter((o) => o.mind);
  const from = mind.length ? mind : options;
  const o = from[Math.floor(rng() * from.length)];
  return {
    kind: o.kind,
    about: o.about,
    fact: o.fact,
    says: o.says.slice(),
    suggests: o.suggests,
    opens: o.about ? [o.about] : [],
    life: o.life || null,
    follows: o.follows || null,
    how: o.life ? sc.LIFE.fullness(state, sheet) : null,
  };
}

/**
 * Her memories that hang off any of these words and have not been said yet
 * on this call.
 *
 * This is the whole of what decides which memory can come up: the word has
 * to have just been said. It is the rule for what the player can play,
 * applied to her (settled.md §2).
 *
 * @param {object} sc
 * @param {string[]} words - what has just been said, by her or to her.
 * @param {{usedLife?: string[]}} state
 * @returns {object[]} entries of the scenario's `LIFE`
 */
function hanging(sc, words, state) {
  if (!sc.LIFE) return [];
  const used = state.usedLife || [];
  return sc.LIFE.LIFE.filter((m) => !used.includes(m.id) && m.hangsOff.some((w) => words.includes(w)));
}

/** How often an oblique trigger surfaces her Need. A guess, mine. */
const NEED_OBLIQUE = 0.1;

/** How often an answer carries a memory with it. Guesses, mine. */
const ASIDE = { ordinary: 0.45, worn: 0.65 };

/**
 * The memory she adds to an answer, if she adds one.
 *
 * Only with an answer, never on her first reply, at most one, and only a
 * memory hanging off something in the answer it follows. She does it more
 * when she is worn down, which is what the play-throughs showed callers
 * doing.
 *
 * @returns {{id: string, how: string, after: number}|null} `after` is which
 *   of her answers it follows.
 */
function lifeAside({ sc, sheet, gives, need, state, rng }) {
  if (!sc.LIFE || !gives.length || (state.turnAtHer || 0) < 1) return null;
  // Not on top of the thing that matters: when she is giving the explanation
  // or a departure, or her Need has just surfaced, a memory would bury it.
  if (need || gives.some((g) => g.kind === 'cause' || g.kind === 'departure')) return null;
  // Which memories hang off which answer, so the memory can be said straight
  // after the thing that called it up.
  const options = [];
  gives.forEach((g, after) => {
    if (g.kind === 'spent' || g.kind === 'clue') return;
    // The subject of the answer, and not every word that passes through it:
    // "The party's. My old partner runs her own party now." is joined only
    // by the word.
    for (const m of hanging(sc, [g.asked.subject], state)) {
      if (!options.some((o) => o.m.id === m.id)) options.push({ m, after });
    }
  });
  if (!options.length) return null;
  const worn = (state.sour || 0) >= 1 || sheet.patience <= 2;
  if (rng() >= (worn ? ASIDE.worn : ASIDE.ordinary)) return null;
  const pick = options[Math.floor(rng() * options.length)];
  return { id: pick.m.id, how: sc.LIFE.fullness(state, sheet), after: pick.after };
}

/**
 * Fill her template for one turn.
 *
 * Returns everything a generator would need and nothing it may not use: what
 * she was asked, which of it she took up, the fact she gives for each, where
 * she went instead if she went her own way, and the feeling word and sentence
 * shape she reaches for. `feeling.spoken` says whether the feeling is in the
 * line at all — her word is how she expresses it, never a measure of it.
 *
 * Nothing passed in is mutated.
 *
 * @param {object} args
 * @param {object} args.sc - the scenario.
 * @param {object} args.sheet
 * @param {'first'|'second'|'both'|'random'} args.pick
 * @param {object[]} args.inquiries - one or two `{suit, angle, subject}`.
 * @param {object} args.cause - the scenario's hidden cause for this call.
 * @param {string[]} args.herrings - innocent departures live on this call.
 * @param {object} args.state - `{answered, recent, given, sour, mood,
 *   saidBaggage, pointed, usedWords, heardFromYou}`.
 * @param {() => number} args.rng
 * @returns {object} the template; see `render` for how it reads.
 */
function fill({ sc, sheet, pick, inquiries, cause, herrings, state, rng }) {
  const answered = state.answered || [];
  const given = state.given || [];
  // A pick that names an inquiry she was not offered takes up nothing, and
  // the same subject asked twice in one turn is one thing to answer.
  const taken = (
    pick === 'both' ? inquiries.slice(0, 2)
      : pick === 'first' ? [inquiries[0]]
        : pick === 'second' ? [inquiries[1]]
          : []
  ).filter((q, i, arr) => q && arr.findIndex((x) => x && x.subject === q.subject) === i);
  const left = inquiries.filter((q) => !taken.includes(q));
  const gives = [];
  for (const q of taken) {
    gives.push(
      give({
        sc,
        inquiry: q,
        cause,
        herrings,
        answered: answered.concat(gives.map((g) => g.asked.subject)),
        given: given.concat(gives.filter((g) => g.kind === 'clue').map((g) => g.fact)),
        pointed: state.pointed || [],
        rng,
      }),
    );
  }
  const own =
    pick === 'random' ? ownWay({ sc, sheet, inquiries, herrings, answered, state, rng }) : null;

  // Her Need surfaces only if her own trigger fires, on anything asked this
  // turn whether or not she took it up (settled.md §8).
  // With a scenario that has written talk, it has to be something she took
  // up, and an oblique trigger fires only some of the time: read thirty calls
  // at once and a Need that surfaces in nearly every one is a tag, not a
  // thing earned (settled.md §4: the rate is small).
  const pool = sc.TALK ? taken : inquiries;
  const fired = pool
    .map((q) => SHEET.fires(sheet, { suit: q.suit, subject: q.subject }))
    .find((f) => f.fired && (!sc.TALK || !f.oblique || rng() < NEED_OBLIQUE));
  const need = fired && !state.needSeen ? { fact: sc.NEED.line, oblique: fired.oblique } : null;

  const aside = own ? null : lifeAside({ sc, sheet, gives, need, state, rng });

  const voice = sc.VOICE || {};
  const mine = voice.baggage && voice.baggage[sheet.baggage.id];
  const base = WORDS.feelingBase(state.mood || 0, mine && mine.lean);
  const word = WORDS.pickWord({
    base,
    voice,
    baggageId: sheet.baggage.id,
    used: state.usedWords || [],
    rng,
  });
  const ats = Object.keys(voice.at || { product: 'this' });
  const atKey = ats[Math.floor(rng() * ats.length)];
  const at = (voice.at && voice.at[atKey]) || 'this';
  const strong = base === 'mad' || base === 'sad' || base === 'glad';
  const spoken = !!word && ((own && own.kind === 'frustration') || rng() < (strong ? 0.6 : 0.2));
  // A word of the player's that she has taken up, exactly as it was said.
  const heard = state.heardFromYou || [];
  const echo = heard.length && rng() < 0.4 ? heard[Math.floor(rng() * heard.length)] : null;

  return {
    pick,
    took: taken.map((q) => ({ suit: q.suit, angle: q.angle, subject: q.subject })),
    left: left.map((q) => ({ suit: q.suit, angle: q.angle, subject: q.subject })),
    gives,
    own,
    aside,
    need,
    feeling: word
      ? { base, word: word.word, layer: word.layer, frame: WORDS.frameWith(word.frame, at), at: atKey, spoken }
      : null,
    echo,
  };
}

/**
 * The template as a person would read it — the Mad Lib, filled in.
 *
 * This is what step one prints in place of her sentence, and what a
 * generator would later be given as its prompt.
 *
 * @param {object} t - a template from `fill`.
 * @param {(subject: string) => string} label
 * @returns {string[]} lines
 */
function render(t, label) {
  const q = (x) => `${x.suit} · ${x.angle} · ${label(x.subject)}`;
  const out = [];
  const head = {
    first: t.left.length ? 'takes the first, leaves the second' : 'takes it up',
    second: 'takes the second, leaves the first',
    both: 'takes both',
    random: 'goes her own way',
  }[t.pick];
  out.push(`[${head}]`);
  for (const g of t.gives) {
    out.push(`asked:   ${q(g.asked)}`);
    const how = {
      answer: 'gives',
      beside: 'gives, beside the question',
      clue: 'hears a slip, gives',
      // The same words for both: which of her departures is the explanation
      // is the player's to judge, and two labels would tell them.
      cause: 'gives, and it is not her usual',
      departure: 'gives, and it is not her usual',
      spent: 'has nothing left to give on that',
    }[g.kind];
    out.push(g.fact ? `${how}:   "${g.fact}"` : how);
  }
  for (const l of t.left) out.push(`left:    ${q(l)}`);
  if (t.own) {
    out.push(`instead: ${t.own.kind}${t.own.about ? ` — about ${label(t.own.about)}` : ''}`);
    if (t.own.fact) out.push(`says:    "${t.own.fact}"`);
  }
  if (t.aside) out.push(`adds:    a memory (${t.aside.id}), said ${t.aside.how}`);
  if (t.own && t.own.life) out.push(`memory:  ${t.own.life}, said ${t.own.how}`);
  if (t.need) out.push(`and, unasked: "${t.need.fact}"`);
  if (t.feeling) {
    out.push(
      `feeling: ${t.feeling.base} → "${t.feeling.word}" (${t.feeling.layer}) · shape: "${t.feeling.frame}"` +
        (t.feeling.spoken ? '' : ' · not said aloud this turn'),
    );
  }
  if (t.echo) out.push(`echoes you: "${t.echo}"`);
  return out;
}

module.exports = { PICKS, LEAN, ASIDE, pull, odds, choose, give, follows, ownOptions, hanging, fill, render };
