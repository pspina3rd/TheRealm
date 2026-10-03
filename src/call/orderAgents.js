'use strict';

const { chance, pick } = require('./rng');
const O = require('./order');

/**
 * A policy for ordering calls.
 *
 * The shape of the job is different from a fault call: there is nothing to
 * find, so the work is settling the fields that have to be settled, in an
 * order that does not waste plays — and deciding whether to spend any of the
 * nine on telling her things that block nothing.
 */
function makeOrderAgent({ name, competence }) {
  const skill = Math.max(0, Math.min(1, competence));
  return {
    name,
    competence: skill,

    chooseTurn(view, rng) {
      // Place it the moment it can be placed; a better agent checks first
      // whether anything is left worth saying.
      if (!view.missing.length) {
        const untold = O.WARNINGS.filter((w) => !view.warningsGiven.includes(w.id));
        if (untold.length && view.turnsLeft > 1 && chance(0.2 + skill * 0.7, rng)) {
          return { kind: 'warn', id: untold[0].id };
        }
        return { kind: 'place' };
      }
      // The option can't be asked for until she has been given the choices.
      if (view.missing.includes('option') && !view.optionsPresented
        && chance(0.3 + skill * 0.6, rng)) {
        return { kind: 'present' };
      }
      const needsRecord = view.missing.some((m) => ['price', 'deposit'].includes(m));
      const source = needsRecord && chance(0.3 + skill * 0.5, rng) ? 'crm' : 'customer';
      const roll = rng();
      const mode = roll < 0.12 ? 'random' : roll < 0.7 ? 'expand' : 'contract';
      return { kind: 'inquiry', source, mode };
    },

    chooseDiscard(hand, view, rng) {
      if (!chance(0.25 + skill * 0.7, rng)) return null;
      const dead = hand.filter((c) => view.said.includes(c.word));
      return dead.length ? dead[0] : null;
    },

    choosePlays(hand, view, rng) {
      const useful = hand.filter((c) => {
        if (view.said.includes(c.word)) return false;
        if (c.word === 'bag' && !view.hasBag) return skill < 0.5;
        return true;
      });
      const wanted = useful.filter((c) => O.REQUIRED
        .some((f) => !view.filled.includes(f.id) && f.reach.includes(c.word)));
      const pool = wanted.length && chance(0.3 + skill * 0.65, rng) ? wanted
        : useful.length ? useful : hand;
      if (!pool.length) return [];
      const first = pick(pool, rng);
      const rest = pool.filter((c) => c !== first && c.word !== first.word);
      if (!rest.length || !chance(0.35 + skill * 0.55, rng)) return [first];
      return [first, pick(rest, rng)];
    },
  };
}

module.exports = { makeOrderAgent };
