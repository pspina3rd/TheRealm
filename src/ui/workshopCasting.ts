/** Player-facing spell intent and consequences, derived from the actual cast preview. */
import type { CastPreview } from '../battle/magicCasting';
import type { MagicState } from '../core/boardMagic';
export function spellIntent(id: string): string {
  if (id.startsWith('arcane:')) return 'Change Slime’s next moves';
  return (
    (
      {
        thunder: 'Break stone obstructions',
        natureConvert: 'Turn stone into blank blocks',
        quake: 'Drop unsupported blocks',
        blizzard: 'Fill gaps with blank blocks',
        fire: 'Burn ordinary blocks',
        gale: 'Push blocks sideways',
      } as Record<string, string>
    )[id] ?? 'Choose a target'
  );
}
const amount = (n: number, singular: string, plural = `${singular}s`): string =>
  `${n} ${n === 1 ? singular : plural}`;
export function castConsequence(before: MagicState, preview: CastPreview): string {
  if (preview.reason) return preview.reason;
  const { element, rank, resolution, target } = preview;
  if (preview.id.startsWith('arcane:')) {
    return {
      fire: `Red counts as the required color for ${amount(rank, 'move')}.`,
      water: 'Delay Slime’s next obstruction.',
      nature: rank === 1 ? 'Next send: a blank block.' : `Next ${rank} sends: blank blocks.`,
      earth: `Unanchor Slime’s blocks for ${amount(rank, 'move')}.`,
      wind: `Shift next ${amount(rank, 'send')} ${target.direction < 0 ? 'left' : 'right'}.`,
      lightning: 'Weaken Slime’s stone in the marked rows.',
    }[element];
  }
  const survivors = new Map(Object.values(resolution.state.obstructions).map((o) => [o.id, o]));
  const gone = resolution.removed.filter((c) => c.cell === 'stone' && c.cause === 'spell').length;
  let weakened = 0;
  for (const old of Object.values(before.obstructions)) {
    const next = survivors.get(old.id);
    if (next && next.strength < old.strength) weakened++;
  }
  const parts: string[] = [];
  if (element === 'lightning' || element === 'nature') {
    if (gone)
      parts.push(
        element === 'nature'
          ? `Make ${amount(gone, 'blank block')}`
          : `Break ${amount(gone, 'stone')}`,
      );
    if (weakened) parts.push(`weaken ${amount(weakened, 'stone')}`);
  } else if (element === 'fire') {
    const burned = resolution.removed.filter(
      (c) => c.cause === 'spell' && c.cell !== 'stone',
    ).length;
    if (burned) parts.push(`Burn ${amount(burned, 'block')}`);
  } else if (element === 'earth') parts.push('Drop unsupported blocks');
  else if (element === 'wind')
    parts.push(`Move blocks one space ${target.direction < 0 ? 'left' : 'right'}`);
  else if (!resolution.completed.length) parts.push('Fill gaps with blank blocks');
  if (resolution.completed.length)
    parts.push(`clear ${amount(resolution.completed.length, 'row')}`);
  return `${parts.join('; ') || 'Change the marked target'}.`;
}

export function castOutcome(before: MagicState, preview: CastPreview): string {
  return castConsequence(before, preview)
    .replace(/^Make /, 'Created ')
    .replace(/^Break /, 'Broke ')
    .replace(/^Burn /, 'Burned ')
    .replace(/^Drop /, 'Dropped ')
    .replace(/^Move /, 'Moved ')
    .replace(/^Fill /, 'Filled ')
    .replace(/weaken /g, 'weakened ')
    .replace(/clear /g, 'cleared ');
}
