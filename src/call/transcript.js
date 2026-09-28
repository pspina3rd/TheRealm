'use strict';

/**
 * Rendering a call so it can be read.
 *
 * Test counts do not tell you whether a call works; reading the thing
 * it produced does. This exists so a run can be printed and judged.
 */
function render(result, opts = {}) {
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
    if (e.reply) lines.push(`     CALLER   ${e.reply}`);
    if (e.line) lines.push(`     YOU      ${e.line}`);
  }
  return lines.join('\n');
}

module.exports = { render };
