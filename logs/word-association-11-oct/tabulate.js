'use strict';
// What recurs across the three runs of Sella's word association.
const fs = require('fs');
const dir = __dirname;
const runs = [1, 2, 3].map((n) => fs.readFileSync(`${dir}/run-${n}.txt`, 'utf8').split('\n').filter((l) => l.trim()));
const brief = fs.readFileSync(`${dir}/brief.md`, 'utf8');
const life = brief.slice(brief.indexOf('## Your life'), brief.indexOf('## What to do')).toLowerCase();
const tally = {}; const bad = []; const multi = []; const offSheet = new Set();
runs.forEach((lines, r) => {
  for (const line of lines) {
    const parts = line.split('|').map((x) => x.trim());
    if (parts.length !== 4) { bad.push(`run ${r + 1}: ${line}`); continue; }
    const [subject, kind, state, words] = parts;
    for (const raw of words.split(',').map((w) => w.trim()).filter(Boolean)) {
      if (/\s/.test(raw)) multi.push(`run ${r + 1}: ${subject} ${kind} ${state}: "${raw}"`);
      const w = raw.toLowerCase();
      if (!life.includes(w.replace(/s$/, ''))) offSheet.add(raw);
      const key = `${subject} | ${kind}`;
      tally[key] = tally[key] || {};
      tally[key][w] = tally[key][w] || { runs: new Set(), ordinary: 0, worn: 0 };
      tally[key][w].runs.add(r);
      tally[key][w][state] += 1;
    }
  }
});
console.log(`lines: ${runs.map((l) => l.length).join(', ')} · malformed ${bad.length} · not single words ${multi.length} · words not on her sheet: ${[...offSheet].join(', ') || 'none'}`);
bad.concat(multi).forEach((x) => console.log('  ' + x));
console.log('\nsubject | kind | in all three runs | in two | in one only');
for (const key of Object.keys(tally)) {
  const by = (n) => Object.entries(tally[key]).filter(([, v]) => v.runs.size === n).map(([w, v]) => `${w}${v.ordinary && !v.worn ? ' (ordinary only)' : !v.ordinary && v.worn ? ' (worn only)' : ''}`).join(', ');
  console.log(`${key} | ${by(3) || '—'} | ${by(2) || '—'} | ${by(1) || '—'}`);
}
