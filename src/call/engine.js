'use strict';

const { CAUSES, COWORKER_WORDS } = require('./scenario');
const { buildDeck, deal, swap } = require('./deck');
const customer = require('./customer');
const { pick, chance } = require('./rng');

const TURNS = 9;
const HAND = 5;

/**
 * One call, nine turns.
 *
 * The engine holds the cause. Nothing the agent is handed contains it,
 * and the only way it becomes known is a word card reaching its
 * evidence. Turn one is the opening and is forced, which leaves eight.
 *
 * A turn is one of: an inquiry (deal five, play up to two, or discard
 * and play one), a hold, the fix for a cause that has surfaced, or
 * arranging today's draught. Every one of them costs the same single
 * turn, which is what makes the hold expensive.
 */
function playCall({ sheet, agent, rng, coworkerAvailable = null }) {
  const cause = pick(CAUSES, rng);
  const call = customer.openCall(sheet);
  const available = coworkerAvailable === null ? chance(0.75, rng) : coworkerAvailable;

  const state = {
    identified: false,
    record: null,
    revealed: null,           // cause id, once a word has reached it
    holds: 0,
    partnerKnown: false,
    fieldsRead: [],
    facts: 0,                 // verified + confirmed, feeds the brief
    turnsLeft: TURNS - 1,
    rng,
    log: [],
    ending: null,
    refillUsed: false,
    taught: null,
  };

  state.log.push({ turn: 1, kind: 'opening', line: call.sheet.name
    ? 'TLC Support. How may I help you?' : 'TLC Support.',
  reply: require('./scenario').SYMPTOM.opening });

  let turn = 2;
  while (state.turnsLeft > 0 && !state.ending) {
    const view = viewFor(call, state);
    const choice = agent.chooseTurn(view, rng);
    const entry = { turn, kind: choice.kind };

    if (choice.kind === 'inquiry') {
      const deck = buildDeck({
        pool: call.pool.concat(state.identified ? [] : []),
        identified: state.identified,
        source: choice.source,
        mode: choice.mode,
      });
      const dealt = deal(deck, HAND, rng, { recent: call.recent || [] });
      let hand = dealt.hand;
      let rest = dealt.rest;
      const swapCard = agent.chooseDiscard(hand, view, rng);
      if (swapCard) {
        const after = swap(hand, swapCard, rest);
        hand = after.hand; rest = after.rest;
        entry.discarded = label(swapCard);
      }
      const plays = agent.choosePlays(hand, view, rng);
      entry.source = choice.source;
      entry.mode = choice.mode;
      entry.played = plays.map(label);

      if (!plays.length) {
        entry.result = 'nothing playable';
      } else if (choice.source === 'crm') {
        applyCrm(state, call, plays, entry);
      } else {
        const res = customer.ask(call, cause, plays);
        call.mood = clampMood(call.mood + res.mood);
        entry.reply = res.line;
        entry.mood = call.mood;
        if (res.reached) {
          state.revealed = res.reached;
          entry.result = 'cause surfaced';
        } else if (res.wasted) {
          entry.result = 'wasted';
        } else {
          entry.result = 'spent';
          state.facts += 1;
        }
        for (const s of res.seeds) if (!call.pool.includes(s)) call.pool.push(s);
        if (res.seeds.length) entry.seeded = res.seeds.slice();
      }
    } else if (choice.kind === 'hold') {
      if (!customer.acceptsHold(call, state.holds, rng)) {
        entry.result = 'refused';
        entry.reply = "I'd rather you didn't, I've things to get on with.";
        call.mood = clampMood(call.mood - 1);
      } else {
        state.holds += 1;
        call.mood = clampMood(call.mood - (state.holds > 1 ? 1 : 0));
        if (!available) {
          entry.result = 'nobody who knows flasks is free';
        } else {
          const strength = briefStrength(state);
          const words = require('./rng').shuffle(COWORKER_WORDS, rng).slice(0, strength);
          for (const w of words) if (!call.pool.includes(w)) call.pool.push(w);
          entry.result = `brief ${briefName(strength)} — ${words.join(' · ')}`;
          entry.seeded = words;
        }
      }
    } else if (choice.kind === 'fix') {
      const c = CAUSES.find((x) => x.id === state.revealed);
      entry.result = 'fix given';
      entry.line = c ? c.fix.line : '';
      state.taught = state.revealed;
      state.fixGiven = true;
    } else if (choice.kind === 'offer') {
      state.offerAttempted = true;
      if (!state.identified) {
        entry.result = 'cannot — no account';
      } else if (!state.partnerKnown && !agent.knowsApothecaries) {
        entry.result = 'cannot — nowhere to send her';
      } else {
        const allowance = allowanceFor(call.sheet.tier);
        if (call.sheet.refillsUsed >= allowance) {
          entry.result = 'no complimentary refill left — half off instead';
        } else {
          entry.result = 'complimentary refill arranged';
          state.refillUsed = true;
        }
      }
    } else if (choice.kind === 'transfer') {
      state.ending = 'transfer';
      entry.result = 'transferred';
    }

    state.log.push(entry);
    state.turnsLeft -= 1;
    turn += 1;

    if (call.mood <= 0) {
      state.ending = 'abandoned';
      state.log.push({ turn, kind: 'customer', result: 'asks for someone else' });
    }
    if (state.fixGiven && (state.refillUsed || state.offerAttempted)) state.ending = 'resolved';
    if (state.fixGiven && state.turnsLeft === 0) state.ending = 'resolved';
  }

  if (!state.ending) state.ending = state.fixGiven ? 'resolved' : 'case';

  const outcome = {
    ending: state.ending,
    taught: state.taught,
    refillUsed: state.refillUsed,
    gist: gistOf(state, cause),
  };
  const nextSheet = customer.writeBack(call, outcome);

  return {
    cause: cause.id,
    ending: state.ending,
    turnsUsed: TURNS - state.turnsLeft,
    mood: call.mood,
    log: state.log,
    sheet: nextSheet,
    coworkerAvailable: available,
  };
}

function viewFor(call, state) {
  return {
    pool: call.pool.slice(),
    identified: state.identified,
    revealed: state.revealed,
    fixGiven: Boolean(state.fixGiven),
    offerAttempted: Boolean(state.offerAttempted),
    holds: state.holds,
    turnsLeft: state.turnsLeft,
    facts: state.facts,
    partnerKnown: state.partnerKnown,
    tier: state.identified ? call.sheet.tier : null,
    refillsUsed: state.identified ? call.sheet.refillsUsed : null,
    said: Array.from(call.said),
    fieldsRead: state.fieldsRead.slice(),
  };
}

function applyCrm(state, call, plays, entry) {
  const words = plays.map((p) => p.word);
  if (!state.identified) {
    const issued = ['account number', 'subscription number'];
    const given = ['name', 'phone'];
    const used = words.find((w) => issued.includes(w) || given.includes(w));
    if (!used) {
      entry.result = 'wasted — nothing to search on';
      return;
    }
    // What the co-op issued contracts to one parent. What the customer
    // gave us contracts to whoever happens to match: a phone is only
    // reliable if exactly one person ever uses it, and a name is not a
    // key at all.
    if (given.includes(used) && chance(0.35, state.rng)) {
      entry.result = `more than one record matches that ${used}`;
      return;
    }
    state.identified = true;
    state.facts += 1;
    entry.result = `identified — ${call.sheet.name}`;
    entry.reply = call.sheet.name;
    return;
  }
  const fresh = words.filter((w) => !state.fieldsRead.includes(w));
  const found = [];
  if (fresh.includes('subscription')) found.push(`subscription active, ${call.sheet.tier}`);
  if (fresh.includes('refills')) {
    found.push(`${allowanceFor(call.sheet.tier) - call.sheet.refillsUsed} refills left`);
  }
  if (fresh.includes('address')) { found.push('address on file'); state.partnerKnown = true; }
  for (const w of fresh) state.fieldsRead.push(w);
  if (!found.length) {
    entry.result = words.length && fresh.length === 0
      ? 'wasted — already read'
      : 'wasted — nothing there';
  } else {
    state.facts += found.length;
    entry.result = found.join(' · ');
  }
}

function briefStrength(state) {
  if (state.facts >= 3) return 5;
  if (state.facts >= 2) return 3;
  return 1;
}

function briefName(n) {
  return n === 5 ? 'organized' : n === 3 ? 'generalized' : 'oversimplified';
}

function allowanceFor(tier) {
  return tier === 'Gold' ? 5 : tier === 'Silver' ? 3 : 1;
}

function clampMood(n) {
  return Math.max(0, Math.min(8, n));
}

function label(card) {
  return card.flavour === 'plain' ? card.word : `${card.word} (${card.flavour})`;
}

function gistOf(state, cause) {
  if (state.ending === 'resolved') return `flask sorted — ${cause.id}`;
  if (state.ending === 'case') return 'rang about the flask, nobody could say why';
  if (state.ending === 'transfer') return 'was passed on';
  return 'rang about the flask and gave up on them';
}

module.exports = { playCall, allowanceFor, briefStrength, briefName, TURNS, HAND };
