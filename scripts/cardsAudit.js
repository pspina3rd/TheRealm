'use strict';

/**
 * Card-system audit: plays the card call over many seeds and prints four
 * measurements, each with its own verdict (PASS or the pathology name).
 *
 *   FLAT     does choosing suit and angle matter, or is it decoration?
 *   LOTTERY  is the cause found by asking, or by luck?
 *   TAX      which suit/angle pairs are dead weight?
 *   SOLVED   does one line of play win every time?
 *
 * Usage: node scripts/cardsAudit.js [--runs N]   (default 2000)
 *
 * Seed = run index; the competent and random passes share the seed per
 * index so the FLAT comparison is paired. Measurements 2-4 and the
 * distribution use the competent pass.
 */

const { playCall } = require('../src/cards/call');
const { makeCardAgent } = require('../src/cards/cardAgents');
const { moves } = require('../src/cards/suits');
const CASE = require('../src/cards/case');
const { seededRng } = require('../src/call/rng');

const THRESHOLDS = { flatGap: 10, lottery: 0.15, taxPlays: 20, solved: 0.4, causeLo: 0.15, causeHi: 0.35 };

function parseRuns(argv) {
  const i = argv.indexOf('--runs');
  if (i === -1) return 2000;
  const n = parseInt(argv[i + 1], 10);
  return Number.isFinite(n) && n > 0 ? n : 2000;
}

const pct = (n, d) => (d ? (100 * n) / d : 0);
const f1 = (x) => x.toFixed(1);
const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);

function runPass(agent, runs) {
  const out = [];
  for (let i = 0; i < runs; i++) out.push(playCall({ agent, rng: seededRng(i) }));
  return out;
}

function foundSummary(results) {
  const found = results.filter((r) => r.found);
  const turns = found.filter((r) => typeof r.foundTurn === 'number');
  const mean = turns.length ? turns.reduce((s, r) => s + r.foundTurn, 0) / turns.length : NaN;
  return { n: results.length, found: found.length, rate: pct(found.length, results.length), meanTurn: mean };
}

function signature(r) {
  return r.lines
    .filter((l) => l.who === 'YOU')
    .map((l) => l.text.split(/\s+/).slice(0, 3).join(' '))
    .join('|');
}

function main() {
  const runs = parseRuns(process.argv.slice(2));
  const started = Date.now();
  const competent = runPass(makeCardAgent({}), runs);
  const random = runPass(makeCardAgent({ randomMove: true }), runs);
  const line = (s = '') => console.log(s);
  const rule = (t) => { line(); line(`== ${t} ${'='.repeat(Math.max(0, 66 - t.length))}`); };

  line(`cardsAudit: ${runs} calls per pass, seeds 0..${runs - 1}`);

  // ---- DISTRIBUTION -------------------------------------------------------
  rule('DISTRIBUTION (competent agent)');
  const endings = {};
  for (const r of competent) endings[r.ending] = (endings[r.ending] || 0) + 1;
  line('endings:');
  for (const e of ['resolved', 'held', 'transferred']) {
    const c = endings[e] || 0;
    line(`  ${pad(e, 12)}${rpad(c, 6)}  ${rpad(f1(pct(c, runs)), 5)}%`);
  }
  for (const e of Object.keys(endings)) {
    if (!['resolved', 'held', 'transferred'].includes(e)) line(`  ${pad(e, 12)}${rpad(endings[e], 6)}  ${rpad(f1(pct(endings[e], runs)), 5)}%`);
  }
  line('hidden cause:');
  for (const c of CASE.CAUSES) {
    const rs = competent.filter((r) => r.cause === c.id);
    const share = pct(rs.length, runs);
    const flag = share < THRESHOLDS.causeLo * 100 ? '  <-- UNDER 15%' : share > THRESHOLDS.causeHi * 100 ? '  <-- OVER 35%' : '';
    const fr = pct(rs.filter((r) => r.found).length, rs.length);
    line(`  ${pad(c.id, 18)}${rpad(rs.length, 6)}  ${rpad(f1(share), 5)}%   found-rate ${rpad(f1(fr), 5)}%${flag}`);
  }
  const meanPlays = competent.reduce((s, r) => s + r.plays, 0) / runs;
  line(`mean plays used: ${meanPlays.toFixed(2)} of 9`);
  const seen = competent.filter((r) => r.stats.needSeen);
  const obl = seen.filter((r) => r.stats.needOblique).length;
  line(`need seen: ${seen.length} of ${runs} (${f1(pct(seen.length, runs))}%)`);
  line(`  oblique ${rpad(obl, 5)}  ${f1(pct(obl, seen.length))}% of seen  (${f1(pct(obl, runs))}% of all)`);
  line(`  direct  ${rpad(seen.length - obl, 5)}  ${f1(pct(seen.length - obl, seen.length))}% of seen  (${f1(pct(seen.length - obl, runs))}% of all)`);

  // ---- 1. FLAT ------------------------------------------------------------
  rule('1. FLAT  (competent vs random suit/angle, same seeds)');
  const a = foundSummary(competent);
  const b = foundSummary(random);
  const gap = a.rate - b.rate;
  line(`  ${pad('agent', 12)}${rpad('found', 7)}${rpad('rate %', 9)}${rpad('mean foundTurn', 17)}`);
  line(`  ${pad('competent', 12)}${rpad(a.found, 7)}${rpad(f1(a.rate), 9)}${rpad(Number.isNaN(a.meanTurn) ? 'n/a' : a.meanTurn.toFixed(2), 17)}`);
  line(`  ${pad('random', 12)}${rpad(b.found, 7)}${rpad(f1(b.rate), 9)}${rpad(Number.isNaN(b.meanTurn) ? 'n/a' : b.meanTurn.toFixed(2), 17)}`);
  line(`  gap: ${gap.toFixed(1)} percentage points`);
  line(gap < THRESHOLDS.flatGap
    ? `  VERDICT: FLAT  (gap ${gap.toFixed(1)} < ${THRESHOLDS.flatGap} points: suit and angle are decoration)`
    : `  VERDICT: PASS  (gap ${gap.toFixed(1)} >= ${THRESHOLDS.flatGap} points)`);

  // ---- 2. LOTTERY ---------------------------------------------------------
  rule('2. LOTTERY  (the cause arriving without a play that earned it)');
  // The first definition — "found without a [find] note" — could not fail:
  // the engine writes that note in the same breath as it sets `found`. This
  // asks instead whether anything was *explored*: a cause that turns up on
  // the very first thing asked of her was not hunted down, it was walked
  // into. The lead share beside it says how much of the hunting the record
  // did rather than the player.
  const foundCalls = competent.filter((r) => r.found);
  // The verdict is the plan's: arrived with no play behind it, which means
  // the cause turned up on the very first play of the call.
  const noPlay = foundCalls.filter((r) => r.foundTurn === 1).length;
  const share = foundCalls.length ? noPlay / foundCalls.length : 0;
  // Diagnostics rather than verdicts: these say how much of the hunting the
  // record did and how cheap the guess at the end was.
  const firstTry = foundCalls.filter((r) => r.stats.customerPlaysBeforeFind === 1).length;
  const led = foundCalls.filter((r) => r.stats.ledLead).length;
  line(`  found calls: ${foundCalls.length}   found on play 1, nothing behind it: ${noPlay}   share: ${f1(share * 100)}%`);
  line(`  diagnostic — found on the first thing asked of her: ${firstTry} (${f1(pct(firstTry, foundCalls.length))}%)`);
  line(`  diagnostic — the record had narrowed it first: ${led} (${f1(pct(led, foundCalls.length))}%)`);
  line(share > THRESHOLDS.lottery
    ? `  VERDICT: LOTTERY  (${f1(share * 100)}% > 15% arrived with no play behind it)`
    : `  VERDICT: PASS  (${f1(share * 100)}% <= 15%)`);

  // ---- 3. TAX -------------------------------------------------------------
  rule('3. TAX  (suit/angle pairs, all competent runs)');
  const pairs = {};
  for (const r of competent) {
    for (const [k, v] of Object.entries(r.stats.pairs)) {
      pairs[k] = pairs[k] || { plays: 0, paid: 0 };
      pairs[k].plays += v.plays;
      pairs[k].paid += v.paid;
    }
  }
  const rows = Object.entries(pairs).sort((x, y) => y[1].plays - x[1].plays || x[0].localeCompare(y[0]));
  line(`  ${pad('pair', 18)}${rpad('plays', 8)}${rpad('paid', 8)}${rpad('paid %', 9)}`);
  for (const [k, v] of rows) line(`  ${pad(k, 18)}${rpad(v.plays, 8)}${rpad(v.paid, 8)}${rpad(f1(pct(v.paid, v.plays)), 9)}`);
  // Pairs are keyed by class now, so legality has to be counted the same
  // way: `what/validate` is legal at her and illegal at the record.
  const allKeys = moves().map((m) => `${m.targetClass} ${m.suit}/${m.angle}`);
  const herKeys = allKeys.filter((k) => k.startsWith('customer '));
  const never = herKeys.filter((k) => !pairs[k]);
  const zero = rows.filter(([, v]) => v.paid === 0).map(([k]) => k);
  line(`  legal pairs at her: ${herKeys.length}   played: ${rows.filter(([k]) => k.startsWith('customer ')).length}   never played: ${never.length}`);
  line(`  never played at her: ${never.length ? never.map((k) => k.replace('customer ', '')).join(', ') : '(none)'}`);
  line(`  played, paid zero: ${zero.length ? zero.map((k) => `${k} (${pairs[k].plays})`).join(', ') : '(none)'}`);
  // A pair that pays nothing is dead weight; so is a pair no policy ever
  // reaches for. The plan's definition is "any pair with zero payouts",
  // and a pair never played has zero payouts.
  // Judged on the customer class, which is where the decision lives. A
  // record read always pays and a coworker is a different kind of move, so
  // pooling the three classes hid both of those facts; the other classes are
  // printed above for reading rather than for the verdict.
  const paidNothing = rows
    .filter(([k, v]) => k.startsWith('customer ') && v.plays >= THRESHOLDS.taxPlays && v.paid === 0)
    .map(([k]) => k);
  const taxed = paidNothing.concat(never);
  line(taxed.length
    ? `  VERDICT: TAX  (${taxed.length} pairs pay nothing: ${taxed.join(', ')})`
    : '  VERDICT: PASS  (every legal pair is played and pays)');

  // ---- 4. SOLVED ----------------------------------------------------------
  rule('4. SOLVED  (the best line per seed, grouped by customer)');
  // The plan's definition, rather than "what the policy happened to play":
  // for each seed, ten runs of the policy, and the one that found the cause
  // in the fewest plays is that seed's best line. Grouped by her baggage,
  // because the question is whether the best line varies with the customer.
  const TRIES = 10;
  const sigs = new Map();
  const byBaggage = new Map();
  let seedsWithALine = 0;
  for (let seed = 0; seed < runs; seed += 1) {
    let best = null;
    for (let t = 0; t < TRIES; t += 1) {
      const r = playCall({ agent: makeCardAgent({}), rng: seededRng(seed * 1000 + t) });
      if (!r.found) continue;
      if (!best || r.foundTurn < best.foundTurn) best = r;
    }
    if (!best) continue;
    seedsWithALine += 1;
    const sig = signature(best);
    sigs.set(sig, (sigs.get(sig) || 0) + 1);
    const bag = best.sheet.baggage.id;
    if (!byBaggage.has(bag)) byBaggage.set(bag, new Map());
    const m = byBaggage.get(bag);
    m.set(sig, (m.get(sig) || 0) + 1);
  }
  const top = [...sigs.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5);
  line(`  seeds with a best line: ${seedsWithALine} of ${runs}   distinct best lines: ${sigs.size}`);
  top.forEach(([s, c], i) => {
    line(`  #${i + 1}  ${rpad(c, 5)}  ${rpad(f1(pct(c, seedsWithALine)), 5)}%`);
    line(`      ${s || '(no YOU lines)'}`);
  });
  for (const [bag, m] of byBaggage) {
    const t = [...m.entries()].sort((x, y) => y[1] - x[1])[0];
    const n = [...m.values()].reduce((a, b) => a + b, 0);
    line(`  ${pad(bag, 12)} best line tops out at ${f1(pct(t[1], n))}% of its ${n} seeds`);
  }
  const topShare = seedsWithALine ? top[0][1] / seedsWithALine : 0;
  line(topShare > THRESHOLDS.solved
    ? `  VERDICT: SOLVED  (top signature covers ${f1(topShare * 100)}% > 40% of calls)`
    : `  VERDICT: PASS  (top signature covers ${f1(topShare * 100)}% <= 40%)`);

  line();
  line(`elapsed ${((Date.now() - started) / 1000).toFixed(2)}s`);
}

main();
