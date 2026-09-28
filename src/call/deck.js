'use strict';

const { FAMILIES, CRM_FIELDS, IDENTIFIERS, COWORKER_WORDS } = require('./scenario');
const { shuffle } = require('./rng');

/**
 * Building and dealing the hand.
 *
 * Cards are single words, never phrases. A key word is a family: the
 * word itself, its searchable neighbours, and flavoured versions of
 * itself. The pool is always larger than the hand, which is what makes
 * a discard worth anything.
 *
 * The turn's choice — source and mode — is made before the deal, so the
 * player commits to a direction and then finds out what they were given.
 * Expand carries the emotional flavours, Contract the supportive ones;
 * Random draws from both and fits worse.
 *
 * The deal is weighted rather than flat. What a coworker named, and what
 * she said a moment ago, come to hand more readily than something from
 * six turns back — which is what being in a conversation is like, and
 * without it a growing pool buries the one card that matters.
 */

const EXPAND_FLAVOURS = ['plain', 'routine', 'frustration', 'blame'];
const CONTRACT_FLAVOURS = ['plain', 'support'];

/**
 * @param {object} opts
 * @param {string[]} opts.pool        words in play
 * @param {boolean} opts.identified   has the account been contracted to
 * @param {'customer'|'crm'} opts.source
 * @param {'expand'|'contract'|'random'} opts.mode
 * @returns {Array<{word: string, flavour: string, source: string}>}
 */
function buildDeck({ pool, identified, source, mode }) {
  const cards = [];
  const flavoursFor = (word) => {
    const fam = FAMILIES[word];
    const allowed = mode === 'contract' ? CONTRACT_FLAVOURS
      : mode === 'expand' ? EXPAND_FLAVOURS
        : EXPAND_FLAVOURS.concat(CONTRACT_FLAVOURS);
    const have = fam ? fam.flavours : ['plain'];
    const out = have.filter((f) => allowed.includes(f));
    return out.length ? out : ['plain'];
  };

  if (source === 'customer') {
    for (const word of pool) {
      for (const flavour of flavoursFor(word)) cards.push({ word, flavour, source });
      if (mode !== 'contract') {
        const fam = FAMILIES[word];
        // Expand reaches the neighbours; contracting does not wander.
        for (const adj of (fam ? fam.adjacent : [])) {
          cards.push({ word: adj, flavour: 'plain', source });
        }
      }
    }
  } else {
    const fields = identified ? CRM_FIELDS : IDENTIFIERS;
    for (const word of fields) {
      cards.push({ word, flavour: 'plain', source });
      if (mode !== 'expand') cards.push({ word, flavour: 'support', source });
    }
  }
  return dedupe(cards);
}

function dedupe(cards) {
  const seen = new Set();
  const out = [];
  for (const c of cards) {
    const k = `${c.source}:${c.word}:${c.flavour}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

/**
 * Deal a hand. The rest of the deck stays available, so a discard
 * draws a replacement rather than handing back the same card.
 */
function deal(deck, size, rng, opts = {}) {
  const recent = opts.recent || [];
  const weightOf = (c) => {
    let w = 1;
    if (COWORKER_WORDS.includes(c.word)) w += 3;
    if (recent.includes(c.word)) w += 2;
    return w;
  };
  const pool = deck.slice();
  const hand = [];
  while (hand.length < size && pool.length) {
    let total = 0;
    for (const c of pool) total += weightOf(c);
    let roll = rng() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      roll -= weightOf(pool[idx]);
      if (roll <= 0) break;
    }
    if (idx >= pool.length) idx = pool.length - 1;
    hand.push(pool.splice(idx, 1)[0]);
  }
  return { hand, rest: shuffle(pool, rng) };
}

/** Throw one card, take the next off the deck. */
function swap(hand, card, rest) {
  const kept = hand.filter((c) => c !== card);
  if (!rest.length) return { hand: kept, rest };
  return { hand: kept.concat([rest[0]]), rest: rest.slice(1) };
}

module.exports = { buildDeck, deal, swap, EXPAND_FLAVOURS, CONTRACT_FLAVOURS };
