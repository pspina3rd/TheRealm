'use strict';

const REC = require('./record');
const SHEET = require('./sheet');
const BOARD = require('./board');
const REPLY = require('./reply');
const { ask, askRecord } = require('./call');
const SPEAK = require('./speak');
const { SUITS, ANGLES } = require('./suits');

/**
 * A call played in turns of one or two inquiries, with her choosing.
 *
 * Step one of the reply work (settled.md §2, The turn, and her side of it).
 * Nine turns, the opening free. On a turn at her the player offers one or two
 * inquiries, and she decides what to do with them: that decision replaces the
 * landing dice in `call.js`, because the customer decides. Her reply is the
 * filled template from `reply.js`, not a sentence.
 *
 * Kept beside `call.js` rather than in it, so the one-inquiry build stays
 * runnable for comparison. The record, the board and the sheet are the same
 * modules.
 *
 * **[C] Mine, and narrower than `call.js` on purpose:** no coworker and no
 * hold yet, and a remedy can be offered only once her own words point at
 * one, which closes the leak where the bag call listed its answer by name.
 */

const TURNS = 9;

/**
 * Play a call in turns.
 *
 * The agent's `choose(view, rng)` returns one of:
 * - `{kind: 'ask', inquiries: [{suit, angle, target}, {suit, angle, target}?]}`
 * - `{kind: 'identify'}` · `{kind: 'look'}` · `{kind: 'read', target}`
 * - `{kind: 'fix', fix}` · `{kind: 'transfer'}`
 * - `{kind: 'pause'}` — a person's turn; nothing is charged.
 *
 * @param {object} args
 * @param {object} args.agent
 * @param {() => number} args.rng - injected; nothing calls Math.random.
 * @param {object} args.scenario
 * @param {string} [args.baggage]
 * @param {number} [args.causeIndex]
 * @param {boolean} [args.life] - false leaves her remembrances out.
 * @returns {{ending: string|null, paused?: boolean, view?: object,
 *   cause: string, found: boolean, turns: number, lines: object[],
 *   picks: string[], sheet: object}}
 *   Each line is `{who, text}`; her lines also carry the `template`.
 */
function playTurns({ agent, rng, scenario, baggage, causeIndex, life }) {
  // `life: false` plays the same caller without her remembrances, so the
  // two can be read side by side.
  const sc = life === false ? { ...scenario, LIFE: undefined } : scenario;
  const rec = sc.record || REC.RECORD;
  const kinds = sc.BAGGAGE || SHEET.BAGGAGE;
  const keys = Object.keys(kinds);
  const bagKey = baggage || keys[Math.floor(rng() * keys.length)];
  let sheet = SHEET.newSheet({
    who: sc.CALLER.name,
    baggage: kinds[bagKey] || bagKey,
    rng,
    subjects: sc.SUBJECTS,
  });
  const cause =
    typeof causeIndex === 'number'
      ? sc.CAUSES[causeIndex]
      : sc.CAUSES[Math.floor(rng() * sc.CAUSES.length)];
  // One or two true-but-innocent things she also did, never on a subject the
  // explanation runs through.
  const taken = new Set(cause.reach.flat());
  const pool = Object.keys(sc.HERRINGS || {}).filter((k) => !taken.has(k));
  const herrings = [];
  const want = 1 + Math.floor(rng() * 2);
  while (herrings.length < want && pool.length) {
    herrings.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }

  // Only what her opening actually names is in front of the player.
  let board = BOARD.newBoard((sc.TALK && sc.TALK.OPENING_WORDS) || sc.OPENING.words);
  const feelingsSaid = [];
  // A scenario with written talk can only be asked the questions it has
  // written; an assembled question is not something a person would say.
  const names = (sc.TALK && sc.TALK.NAMES) || [];
  // Said by her, or shown by the record: either introduces a name.
  const heardName = (n) =>
    lines.some((l) => (l.who === 'HER' || (l.who === 'NOTE' && l.text.startsWith('[record]'))) && l.text.includes(n));
  // Every word in play. A subject among them is something to ask about; a
  // detail among them is something a question may build on.
  const tags = sc.TALK && sc.TALK.SAYS ? sc.TALK : null;
  const introduced = new Set();
  /**
   * Whether a question exists and can be said yet. It has to be written, and
   * a name cannot be used before she has given it.
   */
  const askable = (q) => {
    if (!sc.TALK) return true;
    const text = sc.QUESTIONS && sc.QUESTIONS[q.target] && sc.QUESTIONS[q.target][`${q.suit}/${q.angle}`];
    if (!text) return false;
    const needs = (tags && tags.NEEDS[q.target] && tags.NEEDS[q.target][`${q.suit}/${q.angle}`]) || [];
    if (!needs.every((w) => introduced.has(w))) return false;
    return names.every((n) => !text.includes(n) || heardName(n));
  };
  let lastHadFind = false;
  // The remedies her most recent find pointed at, which is what an offer on
  // the last turn is made from.
  let lastSuggests = [];
  /** A remedy's line, in words the agent can use yet. */
  const remedy = (id) => {
    const mine = (sc.REMEDIES && sc.REMEDIES[id]) || sc.CAUSES.find((c) => c.fix.id === id).fix;
    const line = mine.line;
    const own = sc.TALK && sc.TALK.REFUSALS && sc.TALK.REFUSALS[id];
    if (id === 'the-word' && tags && tags.theWord) {
      return { line: tags.theWord((w) => introduced.has(w), heardName('Pell')), refusal: own || mine.reply };
    }
    return { line, refusal: own || mine.reply || "That's not it. I'd have noticed that." };
  };
  let left = TURNS;
  let handle = null;
  let ending = null;
  let found = false;
  const lines = [];
  const picks = [];
  const answered = [];
  const given = [];
  const pointed = [];
  const usedWords = [];
  const heardFromYou = [];
  const usedLife = [];
  const candidates = [];
  const refused = [];
  const askedTurns = [];
  let sour = 0;
  let good = 0;
  let saidBaggage = false;
  let needSeen = false;

  const say = (who, text, extra) => lines.push({ who, text, ...(extra || {}) });
  const place = (incoming) => {
    const before = board.dropped.length;
    board = BOARD.landed(board, incoming.filter((t) => t && t.id));
    for (const gone of board.dropped.slice(before)) {
      const n = REC.node(rec, gone);
      say('NOTE', `[off the board] ${n ? n.spoken : sc.label(gone)}`);
    }
  };

  /** Put words in play. A subject among them goes in front of the player. */
  const introduce = (words) => {
    const all = [];
    for (const w of words || []) {
      all.push(w);
      for (const also of (tags && tags.ALSO[w]) || []) all.push(also);
    }
    const fresh = all.filter((w) => !introduced.has(w));
    fresh.forEach((w) => introduced.add(w));
    place(fresh.filter((w) => sc.SUBJECTS.includes(w)).map((w) => ({ id: w, cls: 'customer' })));
  };

  say('HER', sc.OPENING.line);
  if (tags) introduced.add('working');

  while (left > 0 && !ending) {
    const view = {
      left,
      board,
      handle,
      // Only the remedies her own words have pointed at, never the full list
      // and never which is right.
      candidates: candidates.slice(),
      remedyLines: Object.fromEntries(candidates.map((id) => [id, remedy(id).line])),
      refused: refused.slice(),
      answered: answered.slice(),
      fit: sc.SUIT_FIT,
      label: sc.label,
      suits: SUITS.slice(),
      angles: ANGLES.slice(),
      // The questions that exist for each thing in front of the player.
      canAsk: Object.fromEntries(
        board.targets
          .filter((t) => t.cls === 'customer')
          .map((t) => [
            t.id,
            sc.TALK
              ? Object.keys((sc.QUESTIONS || {})[t.id] || {}).filter((k) =>
                askable({ target: t.id, suit: k.split('/')[0], angle: k.split('/')[1] }))
              : null,
          ]),
      ),
    };
    const move = agent.choose(view, rng);
    if (!move) break;
    if (move.kind === 'pause') {
      return { paused: true, view, ending: null, cause: cause.id, found, turns: TURNS - left, lines, picks, sheet };
    }
    left -= 1;
    lastHadFind = false;

    if (move.kind === 'identify') {
      const h = sc.HANDLE;
      handle = h.key;
      say('YOU', 'Have you got a number on anything in front of you?');
      say('HER', h.say);
      if (tags) introduce(tags.SAYS_OTHER.handle);
      continue;
    }
    if (move.kind === 'look' || move.kind === 'read') {
      if (!handle) {
        say('NOTE', '[record] nothing to search on — she has given you nothing yet');
        continue;
      }
      const res = askRecord({
        rec,
        handle,
        target: move.kind === 'read' ? move.target : null,
        angle: move.kind === 'look' ? 'expand' : 'verify',
        cause,
        rng,
      });
      say('YOU', res.question);
      say('NOTE', res.note);
      if (res.open) place(res.open.map((id) => ({ id, cls: 'record' })));
      // A row read puts its words on the screen, which introduces them.
      if (tags && move.kind === 'read') introduce(tags.SAYS_OTHER.record[move.target]);
      continue;
    }
    if (move.kind === 'transfer') {
      say('YOU', "This one's Dispatch. Putting you through.");
      ending = 'transferred';
      continue;
    }
    if (move.kind === 'fix') {
      if (!candidates.includes(move.fix)) {
        say('NOTE', '[remedy] nothing she has said points at that');
        continue;
      }
      const r = remedy(move.fix);
      say('YOU', r.line);
      if (found && move.fix === cause.fix.id) {
        say('HER', cause.fix.reply);
        ending = 'resolved';
      } else {
        refused.push(move.fix);
        sour += 2;
        // She can take up a word the agent used (settled.md §8).
        if (!heardFromYou.includes(move.fix)) heardFromYou.push(move.fix);
        say('HER', r.refusal);
      }
      continue;
    }

    // A turn at her: one or two inquiries, and she chooses.
    const inquiries = (move.inquiries || [])
      .slice(0, 2)
      .filter((q) => q && BOARD.has(board, q.target) && (sc.BASELINE[q.target] || sc.BELIEFS[q.target]) && askable(q))
      .map((q) => ({ suit: q.suit, angle: q.angle, subject: q.target }));
    // Two inquiries about the same thing are one inquiry said twice; she is
    // offered the first.
    if (inquiries.length === 2 && inquiries[0].subject === inquiries[1].subject) inquiries.pop();
    if (!inquiries.length) {
      say('NOTE', '[miss] nothing there to ask her about');
      continue;
    }
    say('YOU', SPEAK.agentLine(inquiries.map((q) => ask(sc, q.suit, q.angle, q.subject))));
    const recent = askedTurns.slice(-3).flat();
    const state = {
      answered: answered.slice(),
      recent,
      given: given.slice(),
      sour,
      mood: sheet.patience - 3 + good * 0.5 - sour,
      saidBaggage,
      needSeen,
      pointed: pointed.slice(),
      usedWords: usedWords.slice(),
      heardFromYou: heardFromYou.slice(),
      introduced: [...introduced],
      usedLife: usedLife.slice(),
      turnAtHer: picks.length,
      good,
    };
    state.canOwn = REPLY.ownOptions({ sc, sheet, inquiries, herrings, answered, state }).length > 0;
    const odds = REPLY.odds(sc, sheet, inquiries, state);
    const pick = REPLY.choose({ sc, sheet, inquiries, state, rng });
    const t = REPLY.fill({ sc, sheet, pick, inquiries, cause, herrings, state, rng });
    picks.push(pick);
    // Her line is spoken where the scenario has written talk; the template
    // and the odds ride along for the log and are never shown in play.
    const spoken = sc.TALK ? SPEAK.herLine({ sc, template: t, said: feelingsSaid, rng }) : null;
    if (spoken && spoken.feeling) feelingsSaid.push(spoken.feeling);
    say('HER', spoken ? spoken.text : REPLY.render(t, sc.label).join('\n'), { template: t, odds, mood: state.mood, sour });
    askedTurns.push(inquiries.map((q) => q.subject));
    if (tags) {
      const said = [];
      for (const g of t.gives) {
        const cell = `${g.asked.suit}/${g.asked.angle}`;
        said.push(...((tags.SAYS[g.asked.subject] || {})[cell] || []));
        if (g.kind === 'departure') said.push(...(tags.SAYS_OTHER.departure[g.asked.subject] || []));
      }
      if (t.own) said.push(...(t.own.says || []));
      if (t.aside) said.push(`life:${t.aside.id}`);
      if (t.need) said.push(...tags.SAYS_OTHER.need);
      introduce(said);
    }

    for (const g of t.gives) {
      if (g.kind === 'spent') {
        sour += 1;
        continue;
      }
      if (g.kind === 'clue') given.push(g.fact);
      else {
        answered.push(g.asked.subject);
        sheet = SHEET.remember(sheet, g.asked.subject);
      }
      if (!tags) place(g.opens.map((w) => ({ id: w, cls: 'customer' })));
      for (const f of g.suggests || []) if (!candidates.includes(f)) candidates.push(f);
      if (g.kind === 'cause') found = true;
      if (g.kind === 'cause' || g.kind === 'departure') {
        // One note for both kinds. A scenario's own find note describes its
        // cause, so using it here would mark the explanation.
        say('NOTE', '[find] that is not her usual — it points at a remedy', { quiet: true });
      }
    }
    if (t.gives.some((g) => g.kind !== 'spent')) good += 1;
    // **[C] Guesses, mine:** being asked the same thing again sours her a
    // little, and a wrong remedy sours her more (above). Going her own way
    // does not: that was her choice.
    if (recent.some((s) => inquiries.some((q) => q.subject === s))) sour += 0.5;
    const finds = t.gives.filter((g) => g.kind === 'cause' || g.kind === 'departure');
    lastHadFind = finds.length > 0;
    if (lastHadFind) lastSuggests = finds[finds.length - 1].suggests || [];
    // A departure is said once: asked about again, she just answers.
    for (const g of finds) if (g.kind === 'departure') pointed.push(g.asked.subject);
    if (t.own) {
      if (t.own.kind === 'bad experience') saidBaggage = true;
      if (t.own.about) {
        pointed.push(t.own.about);
        sheet = SHEET.remember(sheet, t.own.about);
      }
      if (!tags) place(t.own.opens.map((w) => ({ id: w, cls: 'customer' })));
      for (const f of t.own.suggests || []) if (!candidates.includes(f)) candidates.push(f);
    }
    if (t.aside) usedLife.push(t.aside.id);
    if (t.own && t.own.life) usedLife.push(t.own.life);
    if (t.need) needSeen = true;
    if (t.feeling && t.feeling.spoken && !usedWords.includes(t.feeling.word)) usedWords.push(t.feeling.word);
  }

  // **[P]** A departure heard on the last turn auto-plays its remedy: there
  // is no turn left to spend on it, and an agent who has just been told what
  // she did says so. It can be wrong, because a cause is not always THE
  // cause, and a wrong one here leaves the call held.
  if (!ending && lastHadFind) {
    const open = lastSuggests.filter((f) => !refused.includes(f));
    // Which of them is not the agent's to know, so it is not always the
    // right one.
    const offer = open[Math.floor(rng() * open.length)];
    if (offer) {
      const r = remedy(offer);
      say('YOU', r.line);
      if (found && offer === cause.fix.id) {
        say('HER', cause.fix.reply);
        ending = 'resolved';
      } else {
        say('HER', r.refusal);
      }
    }
  }

  if (!ending) {
    ending = 'held';
    say('YOU', "We've got that documented, and are forwarding the case for follow-up later today.");
    say('HER', "Right. I'll wait to hear, then.");
  }
  return { ending, cause: cause.id, found, turns: TURNS - left, lines, picks, sheet };
}

module.exports = { playTurns, TURNS };
