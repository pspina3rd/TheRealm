'use strict';
// Written before the results arrived. Checks each actor's three parts
// against the grid, then writes one numbered file per actor for the reader
// with nothing in it but question, aspect, reply and key word.
const fs = require('fs'); const dir = __dirname;
const cells = JSON.parse(fs.readFileSync(`${dir}/cells.json`, 'utf8'));
let ok = true;
for (const actor of [1, 2]) {
  const got = {};
  for (const part of [1, 2, 3]) {
    const f = `${dir}/actor-${actor}-part-${part}.txt`;
    if (!fs.existsSync(f)) { console.log(`actor ${actor} part ${part}: NO FILE`); ok = false; continue; }
    for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
      const p = l.split('|').map((x) => x.trim());
      if (p.length < 5 || !/^\d+$/.test(p[0])) continue;
      if (got[p[0]]) { console.log(`actor ${actor}: line ${p[0]} twice`); ok = false; }
      got[p[0]] = { q: p[1], card: p[2], reply: p.slice(3, p.length - 1).join(' | '), key: p[p.length - 1] };
    }
  }
  let missing = 0, altered = 0, cannot = 0, empty = 0, multi = 0;
  const out = [];
  for (const [n, , , q, card] of cells) {
    const g = got[n];
    if (!g) { missing += 1; continue; }
    if (g.q !== q || g.card !== card) altered += 1;
    if (/^CANNOT/.test(g.reply)) cannot += 1;
    if (!g.reply) empty += 1;
    if (/\s/.test(g.key) && !/^CANNOT/.test(g.reply)) multi += 1;
    out.push(`${n} | ${q} | ${card} | ${g.reply} | ${g.key}`);
  }
  if (missing || altered || empty) ok = false;
  console.log(`actor ${actor}: ${out.length}/${cells.length} · missing ${missing} · question or aspect altered ${altered} · empty ${empty} · marked CANNOT ${cannot} · key word not single ${multi}`);
  if (out.length === cells.length) {
    fs.writeFileSync(`${dir}/for-reader-${actor}-a.txt`, out.slice(0, 201).join('\n') + '\n');
    fs.writeFileSync(`${dir}/for-reader-${actor}-b.txt`, out.slice(201).join('\n') + '\n');
  }
}
console.log(ok ? 'READY FOR THE READER' : 'NOT READY');
