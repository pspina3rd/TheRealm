'use strict';
// For the kinds where all three runs exist: how far do the three actors agree?
const fs = require('fs'); const dir = __dirname;
const pair = process.argv[2] || 'where-how';
const runs = [1, 2, 3].map((n) => `${dir}/run-${n}-${pair}.txt`).filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.includes('|')));
const cell = {}; // subject|kind -> word -> set of runs  (manner and state folded)
const fine = {}; // full line -> word -> runs
runs.forEach((lines, r) => lines.forEach((l) => {
  const p = l.split('|').map((x) => x.trim()); if (p.length < 5 || !p[4]) return;
  for (const w of p[4].split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)) {
    const k = `${p[0]} | ${p[1]}`; (cell[k] = cell[k] || {}); (cell[k][w] = cell[k][w] || new Set()).add(r);
    const f = p.slice(0, 4).join(' | '); (fine[f] = fine[f] || {}); (fine[f][w] = fine[f][w] || new Set()).add(r);
  }
}));
let a3 = 0, a2 = 0, a1 = 0;
console.log(`${pair}: ${runs.length} runs\nsubject | kind | all three | two | one`);
for (const k of Object.keys(cell).sort()) {
  const by = (n) => Object.entries(cell[k]).filter(([, s]) => s.size === n).map(([w]) => w);
  a3 += by(3).length; a2 += by(2).length; a1 += by(1).length;
  console.log(`${k} | ${by(3).join(', ') || '—'} | ${by(2).join(', ') || '—'} | ${by(1).join(', ') || '—'}`);
}
console.log(`\nassociations made by all three: ${a3} · by two: ${a2} · by one only: ${a1}`);
let exact = 0, tot = 0; for (const f of Object.keys(fine)) for (const s of Object.values(fine[f])) { tot += 1; if (s.size >= 2) exact += 1; }
console.log(`at the level of one exact line (manner and state too): ${exact} of ${tot} made by more than one actor`);
const m = {}; runs.forEach((lines) => lines.forEach((l) => { const p = l.split('|').map((x) => x.trim()); if (p[4]) { m[p[2]] = (m[p[2]] || 0) + 1; m[p[3]] = (m[p[3]] || 0) + 1; } }));
console.log('filled lines by manner and state:', JSON.stringify(m));
