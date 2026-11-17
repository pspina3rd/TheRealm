'use strict';

/**
 * Prints the prompt each of her answers would give a generator, beside the
 * line she said in the hand-played run with the same moves, for Sheet Y
 * and Sheet X. Step one of three agreed with Phil on 17 November: read the
 * prompts before any generator is tried.
 *
 *   node scripts/answerPrompts.js            (seed 1)
 *   node scripts/answerPrompts.js --seed 4
 *
 * The prompt and the hand-played line come from different draws, so they
 * will not hold the same facts. The hand-played line is there to show the
 * voice the prompt has to make possible, not to be matched.
 */

const { seededRng } = require('../src/call/rng');
const { SHEETS, shapeCall } = require('../src/cards/answer');
const { promptFor } = require('../src/cards/prompt');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
}
const seed = Number(arg('seed', 1));
const ask = (suit, angle, subject, extra = {}) => ({ kind: 'question', suit, angle, subject, ...extra });

/**
 * Run 1 of docs/playthroughs-14-nov-replay.md (Sheet Y) and of
 * docs/playthroughs-15-nov-sheet-x.md (Sheet X): the moves aimed at her,
 * with the landings drawn there, and what she said to each.
 */
const RUN = [
  [ask('how', 'contract', 'draught', { said: 'How have you been trying to move the draught?' }),
    "I open the party bag, I can see the draught, and there's nothing on it or anywhere else that says transfer. I've been through every page of the account. I'm worried sick he'll go without it.",
    "I open the party bag, I can see the draught, and there's nothing on it or anywhere else that says transfer. I've been through every page of the account. Nobody has ever sat down and told me how any of this is meant to go."],
  [ask('who', 'expand', 'name', { landing: 'critical', said: 'Can I take your name?' }),
    "Sella Brandt. Oh, and there's a number on the bag, four-four-oh-nine, if that helps. I've read it enough times tonight.",
    "Sella Brandt. Oh, and there's a number on the bag, four-four-oh-nine, if that helps."],
  [ask('when', 'expand', 'transfer', { landing: 'flat', said: 'Have you transferred anything to Pell before?' }),
    "No, never. I've always handed things out by hand. There's never been a need. It's only come up because he's going in the morning.",
    "No, never. I've always handed things out by hand. There's never been a need, and nobody said there was a way."],
  [{ kind: 'paraphrase', suit: 'what', angle: 'validate', subject: 'transfer', said: "So you've never transferred anything before, and tonight you can't find where to do it." },
    "That's right. And Pell can't get into the party bag to take it himself.",
    "That's what I've just told you. And Pell can't get into the party bag to take it himself."],
  [ask('who', 'verify', 'bag', { landing: 'flat', said: 'Is anyone else in your party able to get into the bag?' }),
    "No. Nobody but me. And he's the one who needs it. If he goes out without it and something happens, that's on me.",
    "No. Nobody but me, as far as I can tell. I didn't know it could be different for different people. Nobody tells you a thing."],
  [{ kind: 'blame', said: "It looks like you changed the bag to Admin Only. I've put it back." },
    "I changed it? I didn't change anything. All I did was look for a way to transfer one draught, half the night. And you're telling me I'm the one who shut him out, the night before he leaves?",
    "Three days ago? I wasn't near the account three days ago. I only opened it last night. I don't think that was me, and I don't think you'd know either; I expect that's just what it says in front of you. It's not your fault. But somebody changed it, and nobody told me."],
];

for (const [id, column] of [['Y', 1], ['X', 2]]) {
  const sheet = SHEETS[id];
  const call = shapeCall({ sheet, moves: RUN.map((r) => r[0]), rng: seededRng(seed) });
  console.log(`\n=== Sheet ${id} (seed ${seed}) ===`);
  call.forEach(({ move, shape }, i) => {
    console.log(`\n--- answer ${i + 1} ---`);
    console.log(promptFor({ sheet, move, shape }).text.split('\n').map((l) => `  ${l}`).join('\n'));
    console.log(`  [hand-played, another draw] ${RUN[i][column]}`);
  });
}
