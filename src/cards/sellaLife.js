'use strict';

/**
 * Sella's remembrances, as her sheet holds them for the bag call.
 *
 * These are memories, not lines (settled.md §8, Remembrances and lenses).
 * Each is held in parts, and a template — a Mad Lib — assembles what she says
 * from those parts according to how the call stands for her at that moment.
 * The same memory therefore comes out short when she is guarded and fuller
 * when she has warmed to the agent.
 *
 * `hangsOff` lists the words that can pull the memory out. She brings one in
 * only when one of those words has just been said, by her or to her — the
 * same rule that governs what the player can play (settled.md §2: a word
 * appears only once it has been introduced). An entry with nothing to hang
 * off on this call stays on her sheet and is never said here.
 *
 * The memories are the ones settled with Phil on 8–9 October. **[C] The
 * split into parts, the choice of what each hangs off, and the wording of
 * any part not quoted from the record are mine.** The Maud, Les and Atrem
 * wording follows the record's.
 */

/**
 * The templates. `{slot}` is filled from the memory's parts; an empty slot
 * closes up. Three fullnesses, chosen by her state:
 *
 * - `guarded` — the least she would let out.
 * - `ordinary` — the thing, said plainly.
 * - `open` — with what came of it.
 *
 * The shapes are the ones that held up across the play-throughs
 * (`docs/templates-from-playthroughs.md`): a name and one thing that
 * happened; how things have been since; a standing habit carried by one
 * small word.
 */
const TEMPLATES = {
  // A name, one thing that happened, stop.
  'name-did': {
    guarded: '{who} {did}.',
    ordinary: '{who} {did}{detail}.',
    open: '{who} {did}{detail}. {then}',
  },
  // A standing habit, carried by "still".
  still: {
    guarded: 'I still {habit}.',
    ordinary: 'I still {habit}{detail}.',
    open: '{before} I still {habit}.',
  },
  // What someone does, in the present.
  habit: {
    guarded: '{who} {habit}.',
    ordinary: '{who} {habit}{detail}.',
    open: '{who} {habit}{detail}. {then}',
  },
  // Said one way only. For a reading Phil settled word for word.
  fixed: { guarded: '{line}', ordinary: '{line}', open: '{line}' },
};

const LIFE = [
  {
    id: 'maud',
    from: 'enemy',
    hangsOff: ['party', 'leader'],
    shape: 'name-did',
    // Her word for Maud depends on how far she has let the agent in.
    who: { role: 'My old partner', name: 'My old partner Maud' },
    did: 'runs her own party now',
    detail: ', out of the same hall, no less',
    then: 'Took Les with her when she went.',
  },
  {
    id: 'les',
    from: 'enemy',
    hangsOff: ['tried'],
    shape: 'fixed',
    line: "Les would've known what to do.",
  },
  {
    id: 'atrem',
    from: 'tragedy',
    hangsOff: ['paid'],
    shape: 'still',
    habit: "pay my brother's guild dues every year",
    // Once she has said who he is, she does not say it again.
    habitOpen: 'pay his guild dues every year',
    detail: ', which I know is stupid',
    before: 'My brother went down into the Dungeon with his party, four years ago. They only found his pack.',
  },
  {
    id: 'clerk',
    from: 'annoys',
    hangsOff: ['permission'],
    shape: 'habit',
    who: { role: 'The clerk at the guild hall' },
    habit: 'wants a form for everything',
    detail: ", and then a second form to say the first one's filled in",
    then: '',
  },
  {
    id: 'biscuit',
    from: 'companion',
    hangsOff: ['stores'],
    shape: 'habit',
    who: { role: "What doesn't fit" },
    habit: 'goes on Biscuit',
    detail: ', our mule',
    then: '',
  },
  {
    id: 'pell-joined',
    from: 'companion',
    // Not on this call: the scenario already has her say that Pell came in
    // with them in the spring, and the two together read as a loop.
    hangsOff: [],
    shape: 'name-did',
    who: { role: 'He', name: 'Pell' },
    did: 'came to us in the spring',
    detail: ", off a merchant's escort crew",
    then: '',
  },
  {
    id: 'garrick-map',
    from: 'adventure',
    hangsOff: ['ryles'],
    shape: 'name-did',
    who: { role: 'Garrick' },
    did: 'had a map the wrong way up once',
    detail: ', on the hill roads',
    then: 'We lost two days.',
  },
  {
    id: 'tobin',
    from: 'companion',
    hangsOff: ['ryles', 'members'],
    shape: 'habit',
    who: { role: 'Tobin' },
    habit: 'starts a thought and Garrick finishes it for him',
    detail: '',
    then: 'Usually wrong.',
  },
  {
    id: 'careful',
    from: 'annoys',
    hangsOff: ['morning'],
    shape: 'habit',
    who: { role: 'People' },
    habit: "keep telling me I'll want to be careful out there",
    detail: '',
    then: '',
  },
  {
    id: 'whittle',
    from: 'fun',
    // Nothing on this call for it to hang off without making up that she
    // whittles with the party's spare blade.
    hangsOff: [],
    shape: 'habit',
    who: { role: "I'm" },
    habit: 'teaching myself to whittle',
    detail: '',
    then: "So far it's all come out as spoons.",
  },
  // On her sheet, with nothing on this call to hang off.
  { id: 'watchtower', from: 'enemy', hangsOff: [], shape: 'fixed', line: "We cleared out an old abandoned watchtower last year. Apparently it wasn't, turns out someone lived there." },
  { id: 'notes', from: 'enemy', hangsOff: [], shape: 'fixed', line: 'I keep getting these notes. They claim their minions are watching us.' },
  { id: 'wrestling', from: 'fun', hangsOff: [], shape: 'name-did', who: { role: 'I' }, did: 'back Gregor Roman at the wrestling every time', detail: ', and he loses every time', then: '' },
  { id: 'cloak', from: 'adventure', hangsOff: [], shape: 'name-did', who: { role: 'A man in the guild shop' }, did: 'had his cloak come back from POOF heavier', detail: ', and shedding water', then: '' },
  { id: 'boots', from: 'adventure', hangsOff: [], shape: 'name-did', who: { role: 'We' }, did: 'shared a fire with the man they say cleared the lower levels on his own', detail: '', then: 'He spent the evening asking where to get his boots resoled.' },
];

/**
 * How much of a memory she lets out, from how the call stands.
 *
 * **[C] Guesses, mine.** A call that has soured, or a caller short of
 * patience, gets the least. One that has gone well for several turns gets
 * what came of it. Everything between gets the thing said plainly.
 *
 * @param {{sour?: number, good?: number}} state
 * @param {{patience: number}} sheet
 * @returns {'guarded'|'ordinary'|'open'}
 */
function fullness(state, sheet) {
  const sour = state.sour || 0;
  if (sour >= 1 || sheet.patience <= 2) return 'guarded';
  if ((state.good || 0) >= 3 && sheet.patience >= 4) return 'open';
  return 'ordinary';
}

/**
 * Say a memory, through its template, at a given fullness.
 *
 * Her word for a person is a card: the role to a stranger, the name once she
 * has opened up. Empty slots close up, and a sentence left with nothing in
 * it is dropped.
 *
 * @param {object} entry - one of `LIFE`.
 * @param {'guarded'|'ordinary'|'open'} how
 * @returns {string}
 */
function say(entry, how) {
  const tpl = TEMPLATES[entry.shape][how];
  const who = entry.who ? (how === 'open' && entry.who.name ? entry.who.name : entry.who.role) : '';
  const slots = {
    who,
    did: entry.did || '',
    habit: (how === 'open' && entry.habitOpen) || entry.habit || '',
    detail: entry.detail || '',
    then: entry.then || '',
    before: entry.before || '',
    line: entry.line || '',
  };
  const out = tpl.replace(/\{(\w+)\}/g, (_, k) => slots[k] || '');
  // "I'm" carries its own verb, so it does not take a space before the habit
  // the way a name does; and empty slots can leave stray spaces.
  return out.replace(/\s+/g, ' ').replace(/ \./g, '.').trim();
}

module.exports = { LIFE, TEMPLATES, fullness, say };
