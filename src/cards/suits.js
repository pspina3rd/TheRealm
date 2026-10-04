'use strict';

/**
 * The card suits, the angles a card can be played from, and which
 * combinations are legal.
 *
 * Six suits are the questions (who, what, why, when, where, how). An
 * angle is the stance taken toward the answer. A target class is whom
 * or what the card is played against. This module only decides whether
 * a move may be made; it knows nothing about what the move returns.
 */

const SUITS = ['who', 'what', 'why', 'when', 'where', 'how'];

const ANGLES = ['verify', 'validate', 'expand', 'contract'];

/**
 * A wild angle. Deliberately NOT a member of ANGLES: it is resolved to
 * a real angle (and suit) by `resolveRandom` before any move is checked,
 * so `legal` never has to reason about it.
 */
const RANDOM = 'random';

const CLASSES = ['customer', 'record', 'coworker'];

/**
 * Whether a move is allowed, and if not, why.
 *
 * Only two things make a move illegal: naming something that does not
 * exist, and `validate` against the record. The CRM cannot confirm a
 * thing; it only returns what is filed, so it responds rather than
 * confirms. `verify` against the customer is legal on purpose: verify
 * means checking against a source, and reading her own words back to
 * her is exactly that. Keeping the rules this short means the audit
 * scripts can trust `null` to mean "play it".
 *
 * @param {string} suit
 * @param {string} angle
 * @param {string} targetClass
 * @returns {string|null} null when legal, else a short lower-case reason
 */
function legal(suit, angle, targetClass) {
  if (!SUITS.includes(suit)) return `unknown suit: ${suit}`;
  if (!ANGLES.includes(angle)) return `unknown angle: ${angle}`;
  if (!CLASSES.includes(targetClass)) return `unknown target class: ${targetClass}`;
  if (angle === 'validate' && targetClass === 'record') {
    return 'the record responds rather than confirms';
  }
  return null;
}

/**
 * Resolve a random card to a concrete suit and angle, uniformly.
 *
 * The rng is injected so a shift replays from one seed. It draws from
 * ANGLES, never RANDOM, so the result is always a playable angle.
 *
 * @param {() => number} rng returns [0,1)
 * @returns {{suit: string, angle: string}}
 */
function resolveRandom(rng) {
  const suit = SUITS[Math.floor(rng() * SUITS.length)];
  const angle = ANGLES[Math.floor(rng() * ANGLES.length)];
  return { suit, angle };
}

/**
 * Every legal move, for the audit scripts to enumerate against.
 *
 * Built by filtering through `legal` rather than by a separate list, so
 * the enumeration cannot drift from the rules.
 *
 * @returns {Array<{suit: string, angle: string, targetClass: string}>}
 */
function moves() {
  const out = [];
  for (const suit of SUITS) {
    for (const angle of ANGLES) {
      for (const targetClass of CLASSES) {
        if (legal(suit, angle, targetClass) === null) {
          out.push({ suit, angle, targetClass });
        }
      }
    }
  }
  return out;
}

module.exports = { SUITS, ANGLES, RANDOM, CLASSES, legal, resolveRandom, moves };
