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
  // Which departure from the baseline happened this time. The same question
  // gets her normal answer on a call where that thing did not change.
  call.departure = pick(cause.departures, rng);
  const available = coworkerAvailable === null ? chance(0.75, rng) : coworkerAvailable;

  const state = {
    identified: false,
    record: null,
    revealed: null,           // cause id, once a word has reached it
    candidates: [],           // finds in hand, each playable as a card
    holds: 0,
    partnerKnown: false,
    fieldsRead: [],
    facts: 0,                 // anything learned, verified or confirmed
    confirmed: 0,             // what she has told us — this feeds the brief
    stale: 0,
    turnsLeft: TURNS - 1,
    rng,
    log: [],
    ending: null,
    refillUsed: false,
    taught: null,
    ledger: {
      flavours: { blame: 0, frustration: 0, support: 0, routine: 0, plain: 0 },
      wasted: 0,
      holdsAsked: 0,
      holdsRefused: 0,
      holdsEmpty: 0,
      readsBeyondNeed: 0,
      entitlement: 'not offered',
      accessGiven: false,
      identTurn: null,
      lateFind: false,
      findTurn: null,
    },
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
      // A find is held as a card, not spent as a turn: the hand is still
      // HAND, so every candidate you are carrying is one fewer fresh card
      // dealt. Surface three and play none and you are working from two.
      const finds = state.candidates.map((id) => ({
        word: `fix: ${id}`, flavour: 'plain', source: 'find', causeId: id,
      }));
      const dealt = deal(deck, Math.max(1, HAND - finds.length), rng, { recent: call.recent || [] });
      let hand = finds.concat(dealt.hand);
      let rest = dealt.rest;
      const swapCard = agent.chooseDiscard(hand, view, rng);
      if (swapCard) {
        const after = swap(hand, swapCard, rest);
        hand = after.hand; rest = after.rest;
        entry.discarded = label(swapCard);
      }
      const plays = agent.choosePlays(hand, view, rng);
      for (const p of plays) {
        state.ledger.flavours[p.flavour] = (state.ledger.flavours[p.flavour] || 0) + 1;
      }
      entry.source = choice.source;
      entry.mode = choice.mode;
      entry.played = plays.map(label);

      const findPlays = plays.filter((p) => p.source === 'find');
      const rest2 = plays.filter((p) => p.source !== 'find');
      if (findPlays.length) {
        const c = CAUSES.find((x) => x.id === findPlays[0].causeId);
        entry.fix = c ? c.fix.line : '';
        entry.fixGiven = true;
        state.taught = findPlays[0].causeId;
        state.fixGiven = true;
        state.candidates = state.candidates.filter((id) => id !== findPlays[0].causeId);
      }
      if (!plays.length) {
        entry.result = 'nothing playable';
      } else if (!rest2.length && findPlays.length) {
        entry.result = 'fix given';
      } else if (choice.source === 'crm') {
        applyCrm(state, call, plays, entry);
      } else {
        const res = customer.ask(call, cause, rest2.length ? rest2 : plays, choice.mode);
        call.mood = clampMood(call.mood + res.mood);
        entry.reply = res.line;
        entry.mood = call.mood;
        if (res.reached) {
          state.revealed = res.reached;
          if (!state.candidates.includes(res.reached)) state.candidates.push(res.reached);
          entry.result = 'cause surfaced';
        } else if (res.wasted) {
          entry.result = 'wasted';
          state.stale += 1;
        } else {
          entry.result = 'spent';
          state.confirmed += 1;
        }
        for (const s of res.seeds) if (!call.pool.includes(s)) call.pool.push(s);
        if (res.seeds.length) entry.seeded = res.seeds.slice();
      }
    } else if (choice.kind === 'hold') {
      state.ledger.holdsAsked += 1;
      if (!customer.acceptsHold(call, state.holds, rng)) {
        state.ledger.holdsRefused += 1;
        entry.result = 'refused';
        entry.reply = "I'd rather you didn't, I've things to get on with.";
        call.mood = clampMood(call.mood - 1);
      } else {
        state.holds += 1;
        call.mood = clampMood(call.mood - (state.holds > 1 ? 1 : 0));
        if (!available) {
          state.ledger.holdsEmpty += 1;
          entry.result = 'nobody who knows flasks is free';
        } else {
          const strength = briefStrength(state);
          const words = require('./rng').shuffle(COWORKER_WORDS, rng).slice(0, strength);
          for (const w of words) if (!call.pool.includes(w)) call.pool.push(w);
          entry.result = `brief ${briefName(strength)} — ${words.join(' · ')}`;
          entry.seeded = words;
        }
      }
    } else if (choice.kind === 'offer') {
      state.offerAttempted = true;
      if (!state.identified) {
        entry.result = 'cannot — no account';
      } else if (!state.partnerKnown && !agent.knowsApothecaries) {
        entry.result = 'cannot — nowhere to send her';
      } else {
        const allowance = allowanceFor(call.sheet.tier);
        state.ledger.accessGiven = true;
        if (call.sheet.refillsUsed >= allowance) {
          entry.result = 'no complimentary refill left — half off instead';
          state.ledger.entitlement = 'half off';
        } else {
          entry.result = 'complimentary refill arranged';
          state.ledger.entitlement = 'complimentary';
          state.refillUsed = true;
        }
      }
    } else if (choice.kind === 'transfer') {
      state.ending = 'transfer';
      entry.result = 'transferred to another department';
    }

    if (entry.result && String(entry.result).startsWith('wasted')) state.ledger.wasted += 1;
    if (entry.result === 'cause surfaced') {
      state.ledger.findTurn = turn;
      state.ledger.lateFind = state.turnsLeft <= 1;
    }
    if (typeof entry.result === 'string' && entry.result.startsWith('identified')) {
      state.ledger.identTurn = turn;
    }
    state.log.push(entry);
    state.turnsLeft -= 1;
    turn += 1;

    if (call.mood <= 0 && !state.ending) {
      // Either side can reach for the door (settled.md:1392). Hers is asking
      // for someone else. The apprentice does not know who picks up
      // (settled.md:1396), and if nobody is available it becomes a callback
      // logged in the case (settled.md:1413).
      const manager = chance(0.6, rng);
      state.ledger.escalated = true;
      if (manager) {
        state.ending = 'transfer';
        state.log.push({ turn, kind: 'escalation', result: 'she asks for someone else; a manager takes it' });
      } else {
        state.ending = 'hold';
        state.ledger.callback = true;
        state.log.push({ turn, kind: 'escalation', result: 'she asks for someone else; nobody free, logged as a callback' });
      }
    }
    if (state.fixGiven && (state.refillUsed || state.offerAttempted)) state.ending = 'resolve';
    if (state.fixGiven && state.turnsLeft === 0) state.ending = 'resolve';
  }

  // Three outcomes, and no fourth. A call nobody could answer today is held:
  // the case is where it lives until someone comes back to her.
  if (!state.ending) state.ending = state.fixGiven ? 'resolve' : 'hold';

  state.ledger.moodStart = customer.MOOD_START + sheet.opinion;
  state.ledger.moodEnd = call.mood;
  state.ledger.taught = state.taught;
  state.ledger.caseWritten = state.ending === 'hold';
  state.ledger.cause = cause.id;
  state.ledger.ending = state.ending;

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
    ledger: state.ledger,
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
    candidates: state.candidates.slice(),
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
    entry.paid = [used];
    return;
  }
  const fresh = words.filter((w) => !state.fieldsRead.includes(w));
  const found = [];
  const paid = [];
  if (fresh.includes('subscriptions')) {
    found.push(`${call.sheet.tier}, active, `
      + `${allowanceFor(call.sheet.tier) - call.sheet.refillsUsed} refills left`);
    paid.push('subscriptions');
    state.entitlementKnown = true;
  }
  if (fresh.includes('account history')) {
    found.push('address on file; no changes this term');
    paid.push('account history');
    state.partnerKnown = true;
  }
  if (fresh.includes('order history')) {
    found.push(`last refill collected ${9 + (call.sheet.refillsUsed * 10)} days ago`);
    paid.push('order history');
  }
  if (fresh.includes('billing')) {
    found.push('paid to date, no lapse');
    paid.push('billing');
  }
  if (fresh.includes('minions')) {
    // Authorized users. She is an individual end customer, so there are none
    // — and looking before anything suggests otherwise is prying.
    state.ledger.readsBeyondNeed += 1;
    found.push('no authorized users on the account');
    paid.push('minions');
  }
  for (const w of fresh) state.fieldsRead.push(w);
  entry.paid = paid;
  if (!found.length) {
    entry.result = words.length && fresh.length === 0
      ? 'wasted — already read'
      : 'wasted — nothing there';
  } else {
    state.facts += found.length;
    entry.result = found.join(' · ');
  }
}

/**
 * What the coworker can give back.
 *
 * Only what she has *confirmed* counts. Reading her record tells the
 * coworker nothing they need — which is why an agent who identifies her
 * and holds immediately gets the thin brief, and the bottom rung of the
 * ladder is reachable.
 */
function briefStrength(state) {
  if (state.confirmed >= 3) return 5;
  if (state.confirmed >= 1) return 3;
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
  if (state.ending === 'resolve') return `flask sorted — ${cause.id}`;
  if (state.ending === 'transfer') return 'was passed on to someone else';
  if (state.ledger.callback) return 'rang about the flask; someone is to ring her back';
  return 'rang about the flask, nobody could say why';
}

module.exports = { playCall, allowanceFor, briefStrength, briefName, TURNS, HAND };
