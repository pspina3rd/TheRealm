'use strict';

const { linkKind, node } = require('./record');

/**
 * The board: what is aimable right now.
 *
 * The deck the player owns and the hand dealt from what has been said are one
 * deck, with the targets as the board (settled.md:888). So nothing is dealt
 * from the deck — the player always holds all six suits — and what the call
 * supplies is the set of things those suits can be aimed at.
 *
 * Targets arrive from landed moves rather than from a clock. A call going
 * badly therefore starves: a misfire makes her a worse source, answers get
 * shorter and details drop out (settled.md:1021), which here is simply a
 * board that stopped growing.
 *
 * A find occupies a slot until it is written down. Writing it down is how a
 * fact stops taking space on this call's board and becomes something the
 * player owns — which is a play not spent on the person in front of them.
 */

/** How many targets can sit in front of the player at once. A guess, to be measured. */
const SLOTS = 7;

/**
 * @param {string[]} words - the words in her opening, which are free.
 * @returns {{targets: object[], written: string[], dropped: string[]}}
 */
function newBoard(words) {
  return {
    targets: words.map((w) => ({ id: w, cls: 'customer', find: false, edges: [] })),
    written: [],
    dropped: [],
  };
}

/** Whether the board already holds that target. */
function has(board, id) {
  return board.targets.some((t) => t.id === id);
}

/**
 * Put targets in play, dropping the oldest when the slots are full.
 *
 * Returns a new board; the input is never mutated. A target already in play
 * is not duplicated, because the same word surfacing twice is not two things
 * to aim at.
 *
 * @param {object} board
 * @param {Array<{id: string, cls: string, find?: boolean}>} incoming
 * @returns {object} a new board
 */
function place(board, incoming) {
  let targets = board.targets.slice();
  const dropped = board.dropped.slice();
  for (const t of incoming) {
    if (has({ targets }, t.id)) continue;
    targets.push({ id: t.id, cls: t.cls, find: !!t.find, edges: t.edges || [] });
  }
  while (targets.length > SLOTS) {
    // The oldest non-find goes first: a find is something earned, and losing
    // it silently would make writing it down pointless.
    const i = targets.findIndex((t) => !t.find);
    const gone = targets.splice(i === -1 ? 0 : i, 1)[0];
    dropped.push(gone.id);
  }
  return { ...board, targets, dropped };
}

/**
 * What a landed move puts in play.
 *
 * Yield is structural rather than counted: a hit gives what the target
 * contains (settled.md:863), so this takes whatever the resolver found and
 * places it. A miss calls `nothing` instead, and the difference between them
 * is the whole reason a bad call gets harder.
 */
function landed(board, incoming) {
  return place(board, incoming);
}

/** A miss adds nothing. Returns a new board so callers cannot rely on identity. */
function nothing(board) {
  return { ...board, targets: board.targets.slice() };
}

/**
 * Write a find down: it leaves the board and becomes owned.
 *
 * @returns {object} a new board, or the same shape unchanged if there is no
 * such find in play.
 */
function writeDown(board, id) {
  const t = board.targets.find((x) => x.id === id && x.find);
  if (!t) return nothing(board);
  return {
    ...board,
    targets: board.targets.filter((x) => x.id !== id),
    written: board.written.concat(id),
  };
}

/** How many slots are left before something gets dropped. */
function room(board) {
  return SLOTS - board.targets.length;
}

/**
 * What a critical shows: the target plus **some** of its edges.
 *
 * A critical removes noise rather than adding material (settled.md:930), so
 * it never puts a new target in play — it labels paths that were already
 * there. Never all of them, and never the correct one on its own: showing
 * every option ends the hunt on one lucky roll, and showing only the right
 * one does the same more cheaply.
 *
 * @param {object} record
 * @param {string} nodeId
 * @param {() => number} rng
 * @param {string|null} correct - the edge that leads to the cause, if any.
 * @returns {Array<{to: string, link: string}>} a strict, non-empty subset
 */
function criticalEdges(record, nodeId, rng, correct = null) {
  const n = node(record, nodeId);
  if (!n || !n.edges.length) return [];
  const all = n.edges.map((e) => ({ to: e.to, link: linkKind(record, nodeId, e.to) }));
  if (all.length === 1) return [];
  const max = all.length - 1;
  const want = 1 + Math.floor(rng() * max);
  const pool = all.slice();
  const out = [];
  while (out.length < want && pool.length) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  // The correct edge never travels alone.
  if (correct && out.length === 1 && out[0].to === correct) {
    const other = pool.find((e) => e.to !== correct);
    if (other) out.push(other);
    else return [];
  }
  return out;
}

module.exports = {
  SLOTS,
  newBoard,
  has,
  place,
  landed,
  nothing,
  writeDown,
  room,
  criticalEdges,
};
