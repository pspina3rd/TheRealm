'use strict';

const { BAGGAGE, CALLER, HANDLE } = require('./bag');

/**
 * Her answer's shape, filled in as the prompt a generator speaks from.
 *
 * Phil's design (settled.md section 8, Her words): having chosen what she
 * responds to, she chooses her words like a Mad Lib, and the filled
 * template is treated as a prompt for the generated line, in this
 * character's perspective, like an improv prompt. A generator may not
 * invent a fact, so the prompt carries every fact she may use and nothing
 * else, and each line can be checked against the prompt it came from.
 *
 * Step one of three agreed with Phil on 17 November: build the prompt, and
 * read it, before any generator is tried. Nothing here writes her line.
 *
 * Where each part comes from: the facts are Phil's list of what she knows
 * (docs/notes-reply-engine.md, top); her name, party and the number on the
 * bag are in `bag.js`; her baggage lines were accepted by Phil on
 * 18 October; "transfer" is her own word for the action, from the same list.
 * How each part is phrased for a generator is mine.
 */

/** What she knows, as the prompt states it. */
const FACTS = Object.freeze({
  'cannot-transfer': "She can't transfer the draught from the party bag to Pell's bag.",
  'pell-shut-out': "Pell can't get into the party bag himself.",
  'leaves-in-the-morning': 'Pell leaves on a contract in the morning.',
  'never-a-problem-before': 'This has never been a problem before.',
  'at-it-since-last-night': 'She has been trying to work it out since last night, and is worn out and frustrated.',
  'her-name': `Her name is ${CALLER.name}.`,
  'her-number': `There is a number on the bag: ${HANDLE.key.split('').join('-')}.`,
  'her-party': `Her party is ${CALLER.party}.`,
  'her-account': `The account is the party's; she is its ${CALLER.job}.`,
});

/** What the agent asked about, by subject, in plain words. */
const ABOUT = Object.freeze({
  working: 'what is not working', bag: 'the party bag', draught: 'the draught', transfer: 'transferring the draught',
  pell: 'Pell', morning: 'when Pell leaves', before: 'whether this has happened before', tried: 'what she has tried',
  changed: 'whether anything has changed', name: 'her name', number: 'a number to find her by',
  party: 'which party she is with', account: 'her account', contract: "Pell's contract",
});

/** What each kind of fix sounds like to her. */
const FIXES = Object.freeze({
  fix: 'The agent has just fixed it and said so.',
  'wrong-fix': 'The agent has just offered a fix that does not fit what she has told them.',
  'unclear-fix': 'The agent has just fixed it, in their own words, which she does not follow.',
  blame: 'The agent has just fixed it, and said she changed the setting herself.',
});

/** How long the line is, as a person would hear it. */
const LENGTH = Object.freeze({
  'a few words': 'A few words.',
  'a sentence or two': 'One or two sentences.',
  'three or four sentences': 'Three or four sentences.',
  'runs on': 'She runs on: several sentences, one into the next.',
});

/** What the agent's move was, as she heard it. */
function heard(move) {
  if (move.said) return `The agent has just said: "${move.said}"`;
  if (FIXES[move.kind]) return FIXES[move.kind];
  if (move.kind === 'paraphrase') return `The agent has just said back to her what she told them about ${ABOUT[move.subject] || move.subject}${move.stock ? ', opening with a stock line of sympathy' : ''}.`;
  const how = move.angle === 'random' ? ', clumsily, as if fishing' : '';
  const land = { misfire: ' It came out badly.', flat: ' It came out flat.', critical: ' It was exactly the right question.' }[move.landing] || '';
  return `The agent has just asked about ${ABOUT[move.subject] || move.subject}${how}.${land}`;
}

/** How she says it, from her counts and what the move set off. */
function manner(shape) {
  const out = [];
  if (shape.hedged) out.push('She hedges: she is not sure of herself.');
  if (shape.flat) out.push('She says it flatly, sure of it.');
  if (shape.misleading) out.push('She puts it loosely enough to mislead.');
  else if (shape.loose) out.push('She puts it loosely.');
  if (shape.exact) out.push('She is exact about it.');
  const l = shape.labels;
  const takes = {
    'answers and adds': 'She answers, then goes straight on to her problem.',
    'half-answers and drifts': 'She half answers, and drifts back to her problem.',
    'leaves the question': 'She does not answer the question; she carries on with her problem.',
  }[l.takes];
  if (takes) out.push(takes);
  const repeat = {
    'reads it as not listening': 'She hears it as the agent not listening, and it shows.',
    'it wears thin': 'It is wearing thin with her.',
    'it grates on her': 'It grates on her: she has nearly been asked this already.',
    'notices the repeat': 'She notices she is being asked again, and says so.',
    'settled by it': 'Hearing it again reassures her.',
  }[l.repeat];
  if (repeat) out.push(repeat);
  if (l.reach) out.push(`She feels ${l.reach.replace('brushed off', 'brushed off, as if her point was dropped').replace('stuck', 'stuck on one thing')}.`);
  if (l.pattern) out.push(`She ${l.pattern.replace('names', 'names').replace('starts to hear', 'starts to notice')} in the questions.`);
  const toward = {
    'lets them off': 'She sees they are struggling and lets them off.',
    'hears the stock line': 'She hears the stock line for what it is and says she does not need it.',
    'gets short': 'She gets short with them.',
    'no warmth': 'She gives them no warmth.',
  }[l.towardAgent];
  if (toward) out.push(toward);
  const fix = {
    'shows it': 'It has not helped, and she shows it.',
    'gives no sign': 'It has not helped. She gives no sign either way.',
    'asks for someone else': 'She has had enough and asks for someone else.',
    'asks what it means': 'She asks what that means.',
    'thanks them and rings off': 'She thanks them and makes to ring off without saying she did not follow.',
    'turns on the agent': 'She takes it as blame, and turns on the agent.',
    'puts it on the company': 'She takes it as the company having changed something and not said; she does not blame the agent.',
  }[l.afterFix];
  if (fix) out.push(fix);
  return out;
}

/**
 * The prompt for one of her answers.
 *
 * Pure: nothing passed in is modified.
 *
 * @param {object} args
 * @param {object} args.sheet her sheet (one of answer.SHEETS)
 * @param {object} args.move the agent's move she is answering; `said`, if
 *   given, is what the agent actually said, and is quoted in the prompt
 * @param {object} args.shape what answer.shapeAnswer returned for it
 * @returns {{facts: string[], length: string, heard: string,
 *   manner: string[], baggage: string|null, belief: string|null,
 *   words: string[], text: string}} the parts, and the whole as text
 */
function promptFor({ sheet, move, shape }) {
  const facts = shape.gives.map((g) => FACTS[g]).filter(Boolean);
  const baggage = shape.labels.baggage ? BAGGAGE[sheet.baggage].line : null;
  const belief = shape.belief
    ? `She ${shape.belief.sure >= 0.5 ? 'is sure' : 'thinks, without being sure,'} that nothing has changed on her side.`
    : null;
  // Her own word for the action goes in only where the action is in play.
  const inPlay = move.subject === 'transfer' || shape.gives.includes('cannot-transfer') || Boolean(FIXES[move.kind]);
  const words = inPlay ? ['She calls what she is trying to do "transferring" it; she does not know the word the company uses.'] : [];
  const parts = {
    heard: heard(move),
    facts,
    length: LENGTH[shape.says],
    manner: manner(shape),
    baggage,
    belief,
    words,
  };
  const lines = [
    `${CALLER.name}, ${CALLER.job} of ${CALLER.party}, is on the phone to TLC support.`,
    parts.heard,
    facts.length
      ? `What she says, and only this: ${facts.join(' ')}`
      : (shape.asked ? 'She has nothing in this answer that moves things on: she answers vaguely, or not really at all.' : 'She adds nothing new.'),
    belief,
    baggage ? `This comes out of her: "${baggage}"` : null,
    `Length: ${parts.length}`,
    ...parts.manner,
    ...words,
    'She says nothing that is not given here, and speaks as a person would on the phone, in plain English.',
  ].filter(Boolean);
  return Object.freeze({ ...parts, text: lines.join('\n') });
}

module.exports = { FACTS, promptFor };
