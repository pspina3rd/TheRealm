/** Current casting rules shared by learning and spellbook surfaces. */
import { STANDARD_SPELLS } from '../battle/magicCasting';
import { WEAVE_NAMES } from '../game/weaving';
import type { CastSpell } from '../game/spells';
export function standardName(id: string): string | null {
  return id === 'shadow' ? 'Arcane' : (WEAVE_NAMES[id as keyof typeof WEAVE_NAMES] ?? null);
}
export function standardSpellText(id: string, cast: CastSpell): string | null {
  const element = STANDARD_SPELLS[id];
  if (!element) return null;
  const rank = cast.level,
    rows = `${rank} row${rank === 1 ? '' : 's'}`;
  if (element === 'arcane')
    return cast.effect.kind === 'drain'
      ? `Opponent: ${cast.effect.power} base damage; recover ${Math.round(cast.effect.share * 100)}% of damage dealt.`
      : 'Strike the opponent.';
  if (element === 'fire') return `Burn ordinary blocks in ${rows}.`;
  if (element === 'water')
    return `Fill gaps in ${rows} with blank blocks; completed rows clear. Blank blocks earn no mana.`;
  if (element === 'wind') return `Shift movable blocks in ${rows} one space left or right.`;
  if (element === 'earth')
    return rank === 4
      ? 'Cascade unsupported blocks across the whole board.'
      : `Drop unsupported blocks in ${[1, 2, 4][rank - 1]} row${rank === 1 ? '' : 's'}.`;
  const span = rank % 2 === 0 ? 2 : 1,
    hits = rank >= 3 ? 2 : 1;
  return element === 'lightning'
    ? `Strike enemy obstructions in ${span} row${span === 1 ? '' : 's'} ${hits} time${hits === 1 ? '' : 's'}; breaking them opens space.`
    : `Convert enemy obstructions in ${span} row${span === 1 ? '' : 's'} ${hits} time${hits === 1 ? '' : 's'}; finished conversions leave blank blocks with no mana.`;
}
