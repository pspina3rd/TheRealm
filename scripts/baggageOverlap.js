'use strict';

/**
 * Counts what the per-customer baggage runs share across customers.
 *
 * Reads logs/baggage-24-nov/multi/<customer>-round<n>.md, written by one
 * run per customer per round, and for each round, category and baggage
 * condition compares the four customers' responses: which share a phrase of
 * four or more words with another customer, and how often the items that
 * recurred in earlier rounds come up (offering an order reference, opening
 * with their own name, saying they don't know, asking what the agent needs).
 * The measure was fixed before the runs were read.
 *
 * Usage: node scripts/baggageOverlap.js
 */

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'logs', 'baggage-24-nov', 'multi');
const CUSTOMERS = ['hob', 'wren', 'ilse', 'sella'];
const NAMES = { hob: /^(hello[,.]? )?(this is |it's )?hob\b/, wren: /^(hi|hello)?[,.!]? ?(this is |it's )?wren\b/, ilse: /^(good morning|hello)?[,.]? ?(this is |it's )?ilse\b/, sella: /^(hi|hello)?[,.]? ?(this is |it's )?sella\b/ };
const ITEMS = {
  reference: /\b(order|reference|ticket) (number|reference|details)\b|\bi have the order\b|\bi've got the order\b/,
  dontKnow: /\b(don't know|not sure|no idea)\b/,
  whatYouNeed: /\bwhat (else )?you need\b|\bask me what\b/,
};

/** One file's responses, keyed "Category|Condition". */
function parse(text) {
  const out = {};
  let cat = null;
  let cond = null;
  for (const line of text.split('\n')) {
    const h2 = line.match(/^## (Tracking|Access)/);
    if (h2) { cat = h2[1]; cond = null; continue; }
    const h3 = line.match(/^### (.+?)\s*$/);
    if (h3) { cond = h3[1]; continue; }
    const q = line.match(/"([^"]{3,})"\s*\[\d+/);
    if (q && cat && cond && !out[`${cat}|${cond}`]) out[`${cat}|${cond}`] = q[1];
  }
  return out;
}

const words = (s) => s.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean);
function grams(s, n = 4) {
  const w = words(s);
  const g = new Set();
  for (let i = 0; i + n <= w.length; i += 1) g.add(w.slice(i, i + n).join(' '));
  return g;
}

const runs = {};
for (const c of CUSTOMERS) {
  for (const r of [1, 2, 3]) {
    const f = path.join(DIR, `${c}-round${r}.md`);
    if (fs.existsSync(f)) runs[`${c}${r}`] = parse(fs.readFileSync(f, 'utf8'));
  }
}

const shared = {};
const items = {};
let total = 0;
let withShared = 0;
for (const r of [1, 2, 3]) {
  const keys = new Set(CUSTOMERS.flatMap((c) => Object.keys(runs[`${c}${r}`] || {})));
  for (const key of keys) {
    const resp = CUSTOMERS.map((c) => [c, (runs[`${c}${r}`] || {})[key]]).filter(([, t]) => t);
    for (const [c, t] of resp) {
      total += 1;
      const mine = grams(t);
      const hits = new Set();
      for (const [o, u] of resp) if (o !== c) for (const g of grams(u)) if (mine.has(g)) hits.add(g);
      if (hits.size) withShared += 1;
      for (const g of hits) shared[g] = (shared[g] || new Set()).add(`${c}`);
      const lower = t.toLowerCase();
      const cond = key.split('|')[1];
      for (const [name, re] of Object.entries({ ...ITEMS, ownName: NAMES[c] })) {
        if (re.test(lower)) {
          items[name] = items[name] || {};
          items[name][cond] = items[name][cond] || new Set();
          items[name][cond].add(`${c}${r}${key[0]}`);
        }
      }
    }
  }
}

console.log(`Responses read: ${total}. Sharing a 4-word phrase with another customer in the same round, category and condition: ${withShared}.`);
console.log('\nShared phrases (customers using them):');
for (const [g, who] of Object.entries(shared).sort((a, b) => b[1].size - a[1].size)) console.log(`  ${g} — ${[...who].join(', ')}`);
console.log('\nItems, per condition (customer, round, T/A):');
for (const [name, byCond] of Object.entries(items)) {
  console.log(`  ${name}`);
  for (const [cond, set] of Object.entries(byCond)) console.log(`    ${cond}: ${set.size} — ${[...set].sort().join(' ')}`);
}
