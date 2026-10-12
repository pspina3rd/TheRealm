'use strict';
// Written while the readers were still running. Joins every reply to its
// verdict and reports by aspect, by the suit the question was asked in, by
// whether the aspect matched the question's own, and by angle.
const fs = require('fs'); const dir = __dirname;
const cells = JSON.parse(fs.readFileSync(`${dir}/cells.json`, 'utf8'));
const byN = Object.fromEntries(cells.map(([n, s, cell, q, card]) => [n, { s, suit: cell.split('/')[0], angle: cell.split('/')[1], q, card }]));
const rows = []; let missing = 0;
for (const actor of [1, 2]) {
  const replies = {};
  for (const half of ['a', 'b']) for (const l of fs.readFileSync(`${dir}/for-reader-${actor}-${half}.txt`, 'utf8').split('\n')) { const p = l.split(' | '); if (p[0]) replies[p[0]] = { reply: p.slice(3, p.length - 1).join(' | '), key: p[p.length - 1] }; }
  const v = {};
  for (const half of ['a', 'b']) { const f = `${dir}/read-${actor}-${half}.txt`; if (!fs.existsSync(f)) { console.log(`NO FILE ${f}`); continue; } for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const p = l.split('|').map((x) => x.trim()); if (/^\d+$/.test(p[0]) && /^[ABCD]$/.test(p[1])) v[p[0]] = { verdict: p[1], key: p[2], why: p[3] || '' }; } }
  for (const [n] of cells) { if (!v[n]) { missing += 1; continue; } rows.push({ actor, n, ...byN[n], ...replies[n], verdict: v[n].verdict, keyOk: v[n].key === '1', why: v[n].why }); }
}
const tab = (name, keyOf) => {
  const t = {};
  for (const r of rows) { const k = keyOf(r); t[k] = t[k] || { A: 0, B: 0, C: 0, D: 0, n: 0, key: 0 }; t[k][r.verdict] += 1; t[k].n += 1; if (r.keyOk) t[k].key += 1; }
  console.log(`\n${name}`);
  for (const [k, x] of Object.entries(t)) console.log(`  ${String(k).padEnd(22)} n ${String(x.n).padStart(3)} · A ${String(Math.round(100 * x.A / x.n)).padStart(3)}% · B ${String(Math.round(100 * x.B / x.n)).padStart(3)}% · C ${String(Math.round(100 * x.C / x.n)).padStart(3)}% · D ${x.D} · key word fits ${Math.round(100 * x.key / x.n)}%`);
};
console.log(`judged ${rows.length} of ${cells.length * 2} · missing ${missing}`);
tab('all', () => 'all');
tab('by the card she answered from', (r) => r.card);
tab('by whether her card matched the question', (r) => (r.card === r.suit ? 'same as asked' : 'different'));
tab('by the kind of question asked', (r) => r.suit);
tab('by the manner of the question', (r) => r.angle);
tab('by actor', (r) => `actor ${r.actor}`);
// Cells both actors failed: the place to look for a card that truly cannot be played.
const both = {};
for (const r of rows) { both[r.n] = both[r.n] || []; both[r.n].push(r); }
const hard = Object.values(both).filter((p) => p.length === 2 && p.every((r) => r.verdict === 'C'));
console.log(`\ncells where BOTH actors' replies were judged C: ${hard.length} of ${cells.length}`);
for (const p of hard) console.log(`  ${p[0].n} "${p[0].q}" from ${p[0].card}\n     1: ${p[0].reply}  [${p[0].why}]\n     2: ${p[1].reply}  [${p[1].why}]`);
const oneGood = Object.values(both).filter((p) => p.some((r) => r.verdict === 'A')).length;
console.log(`\ncells where at least one actor's reply was judged A: ${oneGood} of ${cells.length}`);
fs.writeFileSync(`${dir}/joined.json`, JSON.stringify(rows, null, 1));
