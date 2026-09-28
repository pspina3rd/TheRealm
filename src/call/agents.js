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
      if (view.revealed && !view.fixGiven) return { kind: 'fix' };
      if (view.fixGiven && !view.offerAttempted) return { kind: 'offer' };
      if (!view.identified) {
        // A weak agent sometimes starts asking questions of a customer
        // whose account they have not found.
        if (chance(1 - skill, rng)) return inquiry(view, rng, skill);
        return { kind: 'inquiry', source: 'crm', mode: 'contract' };
      }
      if (view.facts >= 2 && view.holds === 0 && chance(0.2 + skill * 0.7, rng)) {
        return { kind: 'hold' };
      }
      if (view.turnsLeft <= 2 && !view.revealed && chance(0.3 * (1 - skill), rng)) {
        return { kind: 'transfer' };
      }
      return inquiry(view, rng, skill);
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
  const source = view.identified && chance(0.35 - skill * 0.15, rng) ? 'crm' : 'customer';
  const roll = rng();
  const mode = roll < 0.15 ? 'random' : roll < 0.75 ? 'expand' : 'contract';
  return { kind: 'inquiry', source, mode };
}

module.exports = { makeAgent };
