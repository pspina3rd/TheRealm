'use strict';
// Which remaining questions can only be asked once SHE has said the thing
// they ask about? For each question with NEEDS, where can each needed word
// come from: her, the record, or both.
const T = require('../src/cards/bagTalk');
const BAG = require('../src/cards/bag');
const from = (w) => {
  const her = []; const rec = [];
  for (const s of Object.keys(T.SAYS)) for (const c of Object.keys(T.SAYS[s])) if (T.SAYS[s][c].includes(w)) her.push(`${s} ${c}`);
  for (const k of ['volunteer', 'departure', 'baggage']) for (const id of Object.keys(T.SAYS_OTHER[k])) if (T.SAYS_OTHER[k][id].includes(w)) her.push(`${k} ${id}`);
  if (T.SAYS_OTHER.need.includes(w)) her.push('need');
  if (T.SAYS_OTHER.opening.includes(w)) her.push('opening');
  if (T.SAYS_OTHER.handle.includes(w)) her.push('handle');
  for (const id of Object.keys(T.SAYS_OTHER.record)) if (T.SAYS_OTHER.record[id].includes(w)) rec.push(id);
  return { her, rec };
};
for (const s of Object.keys(T.NEEDS)) for (const c of Object.keys(T.NEEDS[s])) {
  const words = T.NEEDS[s][c];
  const src = words.map((w) => { const f = from(w); return `${w}: ${f.her.length ? 'her' : ''}${f.her.length && f.rec.length ? '+' : ''}${f.rec.length ? 'record' : ''}${!f.her.length && !f.rec.length ? 'NOWHERE' : ''}`; });
  const onlyHer = words.some((w) => { const f = from(w); return f.her.length && !f.rec.length; });
  console.log(`${onlyHer ? 'HER ONLY' : '        '} | ${s} ${c} | "${BAG.QUESTIONS[s][c]}" | ${src.join(', ')}`);
}
