'use strict';

/**
 * Turning a turn into words, without a generator.
 *
 * The agent's one or two inquiries become one thing a person would say, and
 * her filled template becomes her line. Until a model speaks for her, the
 * templates have to be good enough to be read straight out as the
 * conversation (Phil, 8 October), so this adds nothing of its own: it picks
 * among the scenario's written lines and fills their blanks.
 */

/** Words that keep their capital when a sentence is joined onto another. */
const KEEP = ['I', "I'm", "I've", "I'd", "I'll", 'Pell', 'Pell.', "Pell's", 'Silver', 'Silver.', 'Silver,', 'TLC'];

function lowerFirst(s) {
  const first = s.split(/[\s—,]/)[0];
  if (KEEP.includes(first)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * What the agent says for a turn of one or two inquiries.
 *
 * Two questions are joined the way a person runs one into the next — "…?
 * And …?" — not read out as two separate sentences.
 *
 * @param {string[]} questions - one or two written questions.
 * @returns {string}
 */
function agentLine(questions) {
  const qs = questions.filter(Boolean);
  if (qs.length < 2) return qs[0] || '';
  let second = qs[1];
  // One "And" between them, not one on each.
  let first = qs[0].replace(/^And\s+/, '');
  first = first.charAt(0).toUpperCase() + first.slice(1);
  second = second.replace(/^And\s+/, '').replace(/^So,?\s+/, '');
  return `${first} And ${lowerFirst(second)}`;
}

function pickOne(v, rng) {
  if (Array.isArray(v)) return v[Math.floor(rng() * v.length)];
  return v;
}

/**
 * Her line for one turn.
 *
 * Reads the template from `reply.fill` and the scenario's `TALK`. For each
 * inquiry she took up it uses the answer written for that exact question;
 * something she did differently is said after it. Going her own way is a
 * statement she would rather make, her baggage, or — only when the call has
 * given her cause — plain frustration, never the same way twice. A feeling is
 * never tacked onto an answer: a caller who answers "the party's" does not
 * add that she is fed up.
 *
 * @param {object} args
 * @param {object} args.sc - the scenario, with `TALK`.
 * @param {object} args.template - from `reply.fill`.
 * @param {string[]} [args.said] - feeling sentences she has already used.
 * @param {() => number} args.rng
 * @returns {{text: string, feeling: string|null}} `feeling` is the feeling
 *   sentence used, if one was, so the caller can stop it repeating.
 */
function herLine({ sc, template, said = [], rng }) {
  const talk = sc.TALK;
  const parts = [];
  // A memory is said straight after the answer it hangs off.
  const life = sc.LIFE;
  const memory = (id, how) => life.say(life.LIFE.find((m) => m.id === id), how);
  template.gives.forEach((g, index) => {
    const key = `${g.asked.suit}/${g.asked.angle}`;
    const written = talk.ANSWERS[g.asked.subject] && talk.ANSWERS[g.asked.subject][key];
    let line = written ? pickOne(written, rng) : g.fact;
    if (!line) return;
    line = line.replace('{yes}', talk.YES[Math.floor(rng() * talk.YES.length)]);
    // Something she did differently comes out after the answer, unasked —
    // or in place of it, where it already says the answer.
    const instead = (talk.DEPARTURE_IS_ANSWER || []).includes(g.asked.subject);
    if (g.kind === 'departure' && g.fact && instead) parts.push(g.fact);
    else {
      parts.push(line);
      if (g.kind === 'departure' && g.fact) parts.push(g.fact);
    }
    if (template.aside && life && template.aside.after === index) {
      parts.push(memory(template.aside.id, template.aside.how));
    }
  });
  let feeling = null;
  const f = template.feeling;
  const sentence = f ? `${f.frame}.` : null;
  if (template.own) {
    const o = template.own;
    if (o.kind === 'life' && life) {
      parts.push(memory(o.life, o.how));
    } else if (o.kind === 'frustration' && sentence && !said.includes(sentence)) {
      parts.push(sentence);
      feeling = sentence;
    } else if (o.kind === 'non-sequitur' && o.fact) {
      const pivot = talk.PIVOTS[Math.floor(rng() * talk.PIVOTS.length)];
      parts.push(`${pivot} ${lowerFirst(o.fact)}`);
    } else if (o.fact) {
      parts.push(o.fact);
    } else {
      parts.push(talk.NOTHING);
    }
  }
  if (template.need) parts.push(template.need.fact);
  if (!parts.length) parts.push(talk.NOTHING);
  return { text: parts.join(' '), feeling };
}

module.exports = { agentLine, herLine, lowerFirst };
