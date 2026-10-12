'use strict';
// Written before any result arrived. Checks each output file against its
// brief: every line present exactly once and unaltered up to the last bar,
// every entry a single word, every word named in her life.
const fs = require('fs');
const dir = __dirname;
const callWords = ['draught', 'bag', 'account', 'pell'];
let ok = true;
for (const f of fs.readdirSync(dir).filter((x) => /^brief-.*\.md$/.test(x)).sort()) {
  const id = f.replace(/^brief-|\.md$/g, '');
  const brief = fs.readFileSync(`${dir}/${f}`, 'utf8');
  const want = brief.slice(brief.lastIndexOf('```\n', brief.length - 5) < 0 ? 0 : brief.indexOf('```\n') + 4, brief.lastIndexOf('```')).split('\n').filter((l) => l.includes(' | ')).map((l) => l.trimEnd());
  const life = brief.slice(brief.indexOf('## Your life'), brief.indexOf('## What to do')).toLowerCase();
  const out = `${dir}/run-${id}.txt`;
  if (!fs.existsSync(out)) { console.log(`${id}: NO FILE YET`); ok = false; continue; }
  const got = fs.readFileSync(out, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('```'));
  const head = (l) => l.split('|').slice(0, 4).map((x) => x.trim()).join(' | ');
  const wantHeads = want.map(head); const gotHeads = got.map(head);
  const missing = wantHeads.filter((h) => !gotHeads.includes(h));
  const extra = gotHeads.filter((h) => !wantHeads.includes(h));
  const dup = gotHeads.filter((h, i) => gotHeads.indexOf(h) !== i);
  let filled = 0, multi = 0, off = new Set(), call = 0, words = 0;
  for (const l of got) {
    const tail = l.split('|').slice(4).join('|').trim();
    if (!tail) continue;
    filled += 1;
    for (const w of tail.split(',').map((x) => x.trim()).filter(Boolean)) {
      words += 1;
      if (/\s/.test(w)) multi += 1;
      const lw = w.toLowerCase();
      if (callWords.includes(lw)) call += 1;
      if (!life.includes(lw.replace(/(ing|s)$/, ''))) off.add(w);
    }
  }
  const bad = missing.length || extra.length || dup.length || multi || off.size;
  if (bad) ok = false;
  console.log(`${id}: lines ${got.length}/${want.length} · missing ${missing.length} · extra ${extra.length} · repeated ${dup.length} · filled ${filled} (${Math.round(100 * filled / Math.max(1, got.length))}%) · words ${words} · not single ${multi} · the call's own words ${call} · not on her sheet: ${[...off].join(', ') || 'none'}`);
}
console.log(ok ? 'ALL FILES PASS' : 'NOT ALL PASS');
