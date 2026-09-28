'use strict';

const { playCall } = require('./engine');
const { newSheet } = require('./customer');
const { makeAgent } = require('./agents');
const { pick, chance } = require('./rng');

/**
 * A stretch of a customer's life, not a single call.
 *
 * The loop this project exists to validate is imperfect memory shaping
 * later encounters, and that needs two things a single call can't give:
 * a sheet that survives, and other agents. The player answers some of
 * her calls and not others, so when they next pick her up the record
 * carries notes they didn't write and a mood they didn't cause.
 */

const FLOOR = [
  { name: 'Bram', competence: 0.85 },
  { name: 'Odile', competence: 0.6 },
  { name: 'Wick', competence: 0.35 },
];

/**
 * @param {object} opts
 * @param {{name: string, tier: string}} opts.who
 * @param {number} opts.calls          how many times she rings
 * @param {object} opts.player         the agent under test
 * @param {() => number} opts.rng
 * @param {number} [opts.playerShare]  chance the player takes a given call
 */
function runCustomer({ who, calls, player, rng, playerShare = 0.5 }) {
  let sheet = newSheet(who);
  const history = [];
  for (let i = 0; i < calls; i++) {
    const mine = chance(playerShare, rng);
    const agent = mine ? player : makeAgent(pick(FLOOR, rng));
    const result = playCall({ sheet, agent, rng });
    sheet = result.sheet;
    history.push({ ...result, agent: agent.name, byPlayer: mine });
  }
  return { sheet, history };
}

/**
 * Whether she remembers who helped her.
 *
 * Gist survives, names do not: by the memory work, the person is the
 * least reliable part of a recalled call. So a good call by someone
 * else can arrive credited to the player, and a bad one can too.
 */
function recallAgent(entry, rng) {
  const accurate = chance(0.3, rng);
  if (accurate) return entry.agent;
  // A decoy is someone else by definition — the failure is naming the
  // wrong person confidently, not drawing a blank.
  const others = FLOOR.map((f) => f.name)
    .concat(['someone'])
    .filter((n) => n !== entry.agent);
  return pick(others, rng);
}

module.exports = { runCustomer, recallAgent, FLOOR };
