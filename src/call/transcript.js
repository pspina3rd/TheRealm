'use strict';

/**
 * Rendering a call so it can be read.
 *
 * Test counts do not tell you whether a call works; reading the thing
 * it produced does. This exists so a run can be printed and judged.
 */
function render(result, opts = {}) {
  const { score } = require('./score');
  const lines = [];
  const head = `— ${opts.title || 'call'} — cause: ${result.cause} — ending: ${result.ending}`
    + ` — turns: ${result.turnsUsed} — mood: ${result.mood}`;
  lines.push(head);
  for (const e of result.log) {
    if (e.kind === 'opening') {
      lines.push(`  1. YOU      ${e.line}`);
      lines.push(`     CALLER   ${e.reply}`);
      continue;
    }
    const bits = [`  ${e.turn}. ${e.kind.toUpperCase()}`];
    if (e.source) bits.push(`${e.source}/${e.mode}`);
    if (e.played) bits.push(`played: ${e.played.join(' + ')}`);
    if (e.discarded) bits.push(`(discarded ${e.discarded})`);
    lines.push(bits.join('  '));
    if (e.result) lines.push(`     → ${e.result}`);
    // A fix said in the moment comes after what she just told you; a fix
    // played as a card comes before she answers whatever was paired with it.
    if (e.unverified) {
      if (e.reply) lines.push(`     CALLER   ${e.reply}`);
      if (e.fix) lines.push(`     YOU      ${e.fix}`);
      if (e.fixReply) lines.push(`     CALLER   ${e.fixReply}`);
    } else {
      if (e.fix) lines.push(`     YOU      ${e.fix}`);
      if (e.reply) lines.push(`     CALLER   ${e.reply}`);
      if (e.fixReply) lines.push(`     CALLER   ${e.fixReply}`);
    }
    if (e.line) lines.push(`     YOU      ${e.line}`);
  }
  if (result.ledger) {
    const s = score(result.ledger);
    for (const [who, axes] of Object.entries(s)) {
      const won = Object.entries(axes).filter(([, v]) => v > 0).map(([k]) => k);
      const lost = Object.entries(axes).filter(([, v]) => v < 0).map(([k]) => k);
      lines.push(`  ${who.padEnd(11)} won: ${won.join(', ') || '—'}`);
      lines.push(`  ${''.padEnd(11)} lost: ${lost.join(', ') || '—'}`);
    }
  }
  return lines.join('\n');
}

module.exports = { render };
