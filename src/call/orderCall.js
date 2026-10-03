'use strict';

const O = require('./order');
const { buildDeck, deal, swap } = require('./deck');
const customer = require('./customer');

const TURNS = 9;
const HAND = 5;

/**
 * One ordering call, nine plays.
 *
 * Nothing is hidden and nothing has gone wrong, so there is nothing to find.
 * What there is instead is a set of required fields, each of which comes from
 * exactly one side — she knows what size she wants, the record knows what
 * POOF costs — and the order cannot be placed until all of them are settled.
 *
 * The warnings are the other half of the job and block nothing. An order
 * placed without them is a good order to a customer who doesn't know what
 * she has bought, and that is what brings her back.
 */
function playOrderCall({ sheet, agent, rng, hasBag = false, stockToday = true }) {
  const call = customer.openCall(sheet);
  call.pool = O.SYMPTOM.words.slice();

  const state = {
    filled: {},
    warningsGiven: [],
    optionsPresented: false,
    placed: false,
    turnsLeft: TURNS,
    log: [],
    ending: null,
    hasBag,
    stockToday,
    ledger: {
      flavours: { blame: 0, frustration: 0, support: 0, routine: 0, plain: 0 },
      wasted: 0, holdsAsked: 0, holdsRefused: 0, asides: 0,
      optionsPresented: false, bagOffered: false, warnings: [],
      moodStart: call.mood, moodEnd: call.mood,
    },
  };

  state.log.push({
    turn: 0, kind: 'opening',
    line: 'TLC Support. How may I help you?', reply: O.SYMPTOM.opening,
  });

  let turn = 1;
  while (state.turnsLeft > 0 && !state.ending) {
    const view = viewFor(call, state);
    const choice = agent.chooseTurn(view, rng)
      || { kind: 'inquiry', source: 'customer', mode: 'expand' };
    const entry = { turn, kind: choice.kind };

    if (choice.kind === 'inquiry') {
      const deck = buildDeck({
        pool: call.pool,
        identified: true,
        handles: [],
        source: choice.source,
        mode: choice.mode,
        families: O.FAMILIES,
      });
      const dealt = deal(deck, HAND, rng, { recent: call.recent || [], expert: [] });
      let hand = dealt.hand;
      let rest = dealt.rest;
      const thrown = agent.chooseDiscard(hand, view, rng);
      if (thrown) {
        const after = swap(hand, thrown, rest);
        hand = after.hand; rest = after.rest;
        entry.discarded = label(thrown);
      }
      const plays = agent.choosePlays(hand, view, rng) || [];
      entry.source = choice.source;
      entry.mode = choice.mode;
      entry.played = plays.map(label);
      for (const p of plays) {
        state.ledger.flavours[p.flavour] = (state.ledger.flavours[p.flavour] || 0) + 1;
      }
      if (!plays.length) entry.result = 'nothing playable';
      else if (choice.source === 'crm') askRecord(state, call, plays, entry);
      else askHer(state, call, plays, entry);
    } else if (choice.kind === 'present') {
      state.optionsPresented = true;
      state.ledger.optionsPresented = true;
      if (!call.pool.includes('option')) call.pool.push('option');
      entry.result = `the five ways it can be made up: ${O.OPTIONS.map((o) => o.id).join(' · ')}`;
      entry.reply = O.ANSWERS.option.line;
    } else if (choice.kind === 'warn') {
      const w = O.WARNINGS.find((x) => x.id === choice.id);
      if (!w || state.warningsGiven.includes(w.id)) {
        entry.result = 'nothing to tell her that she has not been told';
        state.ledger.wasted += 1;
      } else {
        state.warningsGiven.push(w.id);
        state.ledger.warnings.push(w.id);
        entry.line = w.line;
        entry.reply = w.reply;
        entry.result = `told her: ${w.id}`;
      }
    } else if (choice.kind === 'place') {
      const missing = O.REQUIRED.filter((f) => !state.filled[f.id]).map((f) => f.id);
      if (missing.length) {
        entry.result = `can't place it — still missing ${missing.join(', ')}`;
        state.ledger.wasted += 1;
      } else if (!state.stockToday && state.filled.urgency) {
        entry.result = 'nothing to send today — needs a callback when stock is in';
        state.ending = 'hold';
      } else {
        state.placed = true;
        entry.result = 'order placed';
        entry.line = 'That\'s away with the afternoon round. Anything else?';
        entry.reply = 'No, that\'s grand. Thank you.';
        state.ending = 'resolve';
      }
    } else if (choice.kind === 'hold') {
      state.ledger.holdsAsked += 1;
      if (!customer.acceptsHold(call, state.ledger.holdsAsked - 1, rng)) {
        state.ledger.holdsRefused += 1;
        entry.result = 'refused';
        call.mood = clamp(call.mood - 1);
      } else {
        entry.result = 'checked with the floor — the afternoon round is the last today';
        state.filled.price = state.filled.price || false;
      }
    } else if (choice.kind === 'aside') {
      // Asking over your shoulder rather than putting her on hold.
      state.ledger.asides += 1;
      entry.result = 'asked over your shoulder — the afternoon round is the last today';
      call.mood = clamp(call.mood - 1);
    } else if (choice.kind === 'transfer') {
      state.ending = 'transfer';
      entry.result = 'transferred';
    }

    if (entry.result && String(entry.result).startsWith('wasted')) state.ledger.wasted += 1;
    state.log.push(entry);
    state.turnsLeft -= 1;
    turn += 1;
    if (call.mood <= 0 && !state.ending) {
      state.ending = 'transfer';
      state.log.push({ turn, kind: 'escalation', result: 'she asks for someone else' });
    }
  }

  if (!state.ending) state.ending = 'hold';
  state.ledger.moodEnd = call.mood;
  state.ledger.filled = Object.keys(state.filled).filter((k) => state.filled[k]);
  state.ledger.ending = state.ending;

  const outcome = {
    ending: state.ending,
    taught: state.warningsGiven.length ? state.warningsGiven.join('+') : null,
    refillUsed: false,
    gist: state.placed ? 'ordered a POOF potion' : 'rang to order and it was not placed',
  };

  return {
    ending: state.ending,
    placed: state.placed,
    turnsUsed: TURNS - state.turnsLeft,
    mood: call.mood,
    log: state.log,
    ledger: state.ledger,
    warnings: state.warningsGiven.slice(),
    sheet: customer.writeBack(call, outcome),
  };
}

/** Asking her. A field marked `record` cannot be filled this way. */
function askHer(state, call, plays, entry) {
  const words = plays.map((p) => p.word);
  const lines = [];
  let filledAny = false;

  // Asking what she has already answered returns nothing and costs her
  // patience — the same rule as the fault engine.
  const stale = words.filter((w) => call.said.has(w));
  if (stale.length) {
    call.mood = clamp(call.mood - 1);
    if (stale.length === words.length) {
      entry.reply = "I've told you that already.";
      entry.result = 'wasted — she has answered this';
      state.ledger.wasted += 1;
      return;
    }
  }

  for (const w of words) {
    // Offering a Bag option to someone with no Bag: a play spent on nothing.
    if (w === 'bag') {
      state.ledger.bagOffered = true;
      lines.push(O.ANSWERS.bag.line);
      continue;
    }
    const field = O.REQUIRED.find((f) => f.from === 'customer' && f.reach.includes(w));
    if (field && !state.filled[field.id]) {
      if (field.id === 'option' && !state.optionsPresented) {
        lines.push(O.ANSWERS.option.line);
        continue;
      }
      state.filled[field.id] = field.fills;
      filledAny = true;
    }
    const answer = O.ANSWERS[w];
    if (answer) {
      lines.push(answer.line);
      // What follows necessarily from the answer is never gated: ask what she
      // wants and the size of it is live whether or not she is enjoying this.
      for (const o of (answer.opens || [])) {
        if (call.pool.includes(o)) continue;
        call.pool.push(o);
        entry.seeded = (entry.seeded || []).concat([o]);
      }
      const room = call.mood >= 6 ? 2 : call.mood >= 3 ? 1 : 0;
      let added = 0;
      for (const g of (answer.gives || [])) {
        if (added >= room) break;
        if (call.pool.includes(g)) continue;
        call.pool.push(g);
        added += 1;
        entry.seeded = (entry.seeded || []).concat([g]);
      }
    }
    // A record field cannot be answered by her, whether it is named by the
    // field's own id or by one of its reach words.
    if (O.REQUIRED.some((f) => f.from === 'record'
      && (f.id === w || f.reach.includes(w)))) {
      lines.push("I wouldn't know — that's your end, surely.");
    }
    call.said.add(w);
  }

  entry.reply = lines.join(' ') || "I'm not sure what you're asking me.";
  entry.result = filledAny ? 'settled' : 'nothing settled';
  if (!filledAny) state.ledger.wasted += 1;
}

/** Reading the record. Fields marked `customer` cannot be filled this way. */
function askRecord(state, call, plays, entry) {
  const words = plays.map((p) => p.word);
  const found = [];
  for (const w of words) {
    const fields = O.REQUIRED.filter((f) => f.from === 'record' && f.reach.includes(w));
    for (const f of fields) {
      if (state.filled[f.id]) continue;
      state.filled[f.id] = f.fills;
      found.push(f.fills);
    }
  }
  if (!found.length) {
    entry.result = 'nothing on the record you needed';
    state.ledger.wasted += 1;
  } else {
    entry.result = found.join(' · ');
  }
}

function viewFor(call, state) {
  return {
    pool: call.pool.slice(),
    said: Array.from(call.said),
    filled: Object.keys(state.filled).filter((k) => state.filled[k]),
    missing: O.REQUIRED.filter((f) => !state.filled[f.id]).map((f) => f.id),
    optionsPresented: state.optionsPresented,
    warningsGiven: state.warningsGiven.slice(),
    turnsLeft: state.turnsLeft,
    hasBag: state.hasBag,
    identified: true,
    handles: [],
    fieldsRead: [],
    leads: [],
    candidates: [],
  };
}

function clamp(n) { return Math.max(0, Math.min(8, n)); }
function label(c) { return c.flavour === 'plain' ? c.word : `${c.word} (${c.flavour})`; }

module.exports = { playOrderCall, TURNS, HAND };
