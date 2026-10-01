'use strict';

const { chance, pick } = require('./rng');
const { FAMILIES, COWORKER_WORDS } = require('./scenario');

/**
 * Agents, as policies rather than characters.
 *
 * One function serves the player-stand-in and the rest of the floor;
 * `competence` is the only difference. That matters because the
 * customer has to be able to reach somebody other than the player
 * between calls — otherwise she lives in a world with one employee and
 * the memory rules mean nothing.
 *
 * Competence buys reliability, never permission (§9). A poor agent may
 * attempt anything a good one can: they simply waste turns doing it,
 * play cards that cost the customer something, and brief badly.
 */
function makeAgent({ name, competence }) {
  const skill = Math.max(0, Math.min(1, competence));
  return {
    name,
    competence: skill,
    // Whether they know any apothecary fills a draught — knowledge that
    // substitutes for a lookup.
    knowsApothecaries: skill > 0.6,

    chooseTurn(view, rng) {
      // No fix turn: a find is a card in hand and gets played like one.
      if (view.fixGiven && !view.offerAttempted) return { kind: 'offer' };
      if (!view.identified) {
        // Two plays, not one: ask her for something searchable, then search
        // on it. A weak agent starts asking about the flask instead.
        if (chance(1 - skill, rng)) return inquiry(view, rng, skill);
        if (!view.handles.length) return { kind: 'inquiry', source: 'customer', mode: 'contract' };
        return { kind: 'inquiry', source: 'crm', mode: 'contract' };
      }
      if (view.facts >= 2 && view.holds === 0 && chance(0.2 + skill * 0.7, rng)) {
        return { kind: 'hold' };
      }
      // No transfer card exists just because the agent is stuck. It exists
      // when something out of scope has appeared — and in this scenario a
      // flask that won't refill is Subscriptions' own business, so the only
      // door out is the one she reaches for.

      return inquiry(view, rng, skill);
    },

    // Acting on what she just said, rather than banking it for a later turn.
    fixNow(view, rng) {
      // With a turn in hand a better agent sometimes checks first; with none,
      // anyone says the thing rather than ringing off in silence.
      if (view.turnsLeft <= 1) return true;
      return chance(0.75 - skill * 0.35, rng);
    },

    chooseDiscard(hand, view, rng) {
      // Spotting that a card is dead takes some skill; everyone gets it
      // sometimes, nobody gets it always.
      if (!chance(0.25 + skill * 0.7, rng)) return null;
      const dead = hand.filter((c) => view.said.includes(c.word));
      if (!dead.length) return null;
      return dead[0];
    },

    choosePlays(hand, view, rng) {
      // A find in hand is worth playing, and worth pairing with a question
      // rather than spending the turn on by itself.
      // With no handle yet, the useful card is the one that asks for one.
      if (!view.identified && !view.handles.length) {
        const asks = hand.filter((c) => c.asks === 'identifier');
        const issued = asks.filter((c) => c.word === 'account number' || c.word === 'subscription number');
        if (issued.length && chance(0.3 + skill * 0.6, rng)) return [pick(issued, rng)];
        if (asks.length) return [pick(asks, rng)];
      }
      const held = hand.filter((c) => c.source === 'find');
      if (held.length) {
        const other = hand.filter((c) => c.source !== 'find'
          && !view.said.includes(c.word) && c.flavour !== 'blame');
        if (other.length && chance(0.4 + skill * 0.55, rng)) {
          return [held[0], pick(other, rng)];
        }
        return [held[0]];
      }
      const stale = (c) => view.said.includes(c.word)
        || (c.source === 'crm' && view.fieldsRead.includes(c.word));
      const costly = (c) => c.flavour === 'blame' || c.flavour === 'frustration';
      const fresh = hand.filter((c) => !stale(c));
      const good = fresh.filter((c) => !costly(c));
      const order = good.length ? good : fresh.length ? fresh : hand;

      // A weak agent will reach for a card that costs her something, or
      // ask what she has already answered.
      const sloppy = chance(0.55 * (1 - skill), rng);
      const source = sloppy && hand.length ? hand : order;
      if (!source.length) return [];

      // On the record, the fields that bear on a flask are the ones an
      // agent should reach for. Reading who else may use her account,
      // with nothing suggesting anyone does, is prying — and a poor
      // agent does it because it is there.
      const bearing = ['subscription', 'refills', 'address', 'name',
        'account number', 'subscription number', 'phone'];
      const onRecord = source.filter((c) => c.source === 'crm');
      if (onRecord.length && chance(0.3 + skill * 0.65, rng)) {
        const useful = onRecord.filter((c) => bearing.includes(c.word));
        if (useful.length) {
          const a = pick(useful, rng);
          const b = useful.filter((c) => c.word !== a.word);
          if (b.length && chance(0.3 + skill * 0.5, rng)) return [a, pick(b, rng)];
          return [a];
        }
      }

      // What a coworker named is worth more than what came off the top
      // of her own words.
      const expert = source.filter((c) => COWORKER_WORDS.includes(c.word));
      const first = expert.length && chance(0.3 + skill * 0.6, rng)
        ? pick(expert, rng)
        : pick(source, rng);

      const rest = source.filter((c) => c !== first && c.word !== first.word);
      if (!rest.length) return [first];
      // Pairing well is the efficiency skill. The pairing that works is
      // a word and something next to it — ask about the thing and its
      // neighbour in the same breath.
      if (!chance(0.35 + skill * 0.6, rng)) return [first];

      // The pairing that does work is a word and something next to it —
      // asking about the thing and its neighbour in one breath. Worth
      // returning to a word she has already touched if the neighbour is
      // new, which is how "and in the night — from the cup?" happens.
      const adjacent = (a, b) => {
        const fa = FAMILIES[a.word]; const fb = FAMILIES[b.word];
        return (fa && fa.adjacent.includes(b.word)) || (fb && fb.adjacent.includes(a.word));
      };
      const neighbours = hand.filter((c) => c !== first && c.word !== first.word
        && adjacent(first, c));
      if (neighbours.length && chance(0.2 + skill * 0.75, rng)) {
        return [first, pick(neighbours, rng)];
      }
      return [first, pick(rest, rng)];
    },
  };
}

function inquiry(view, rng, skill) {
  // A tell is available when there is something established to hand back.
  const source = view.identified && chance(0.35 - skill * 0.15, rng) ? 'crm' : 'customer';
  const roll = rng();
  const mode = roll < 0.15 ? 'random' : roll < 0.75 ? 'expand' : 'contract';
  const canTell = (view.said.length + (view.fieldsRead || []).length) > 0;
  const direction = canTell && chance(0.15 + skill * 0.2, rng) ? 'state' : 'ask';
  return { kind: 'inquiry', source, mode, direction };
}

module.exports = { makeAgent };
