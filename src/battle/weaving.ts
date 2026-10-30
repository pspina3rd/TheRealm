import { required } from '../core/required';
/** Ordered preview and one atomic payment for an equipped custom spell. */
import { Board } from '../core/board';
import type { MagicState } from '../core/boardMagic';
import { createRng } from '../core/rng';
import { canAfford, spendMana } from '../game/hero';
import { weaveCost, weaveReason } from '../game/weaving';
import { ArcaneInterference } from './arcane';
import { MagicCasting, type CastPreview, type MagicTarget } from './magicCasting';
import type { ElementAmounts } from '../data/types';
export interface WeavePreview {
  id: string;
  name: string;
  cost: ElementAmounts;
  before: string;
  stages: { before: MagicState; preview: CastPreview }[];
  reason: string | null;
}
export function previewWeave(
  casting: MagicCasting,
  targets: readonly [MagicTarget, MagicTarget],
): WeavePreview {
  const book = casting.hero.weaving;
  const recipe = book?.recipes.find((r) => r.id === book.equipped);
  if (!recipe) throw new Error('Equip a custom spell in Arcane Weaving first.');
  let reason = weaveReason(casting.hero, casting.flags, recipe);
  const cost = weaveCost(casting.hero, recipe);
  if (!casting.board.magicEnabled) reason = 'Board magic is unavailable in this encounter.';
  else if (!reason && !canAfford(casting.hero, cost)) reason = 'Not enough mana for both effects.';
  const board = new Board(createRng(0), casting.board.width, casting.board.height);
  board.magicEnabled = true;
  board.adoptMagic(casting.board.magicState());
  board.active = structuredClone(casting.board.active);
  const hero = structuredClone(casting.hero);
  const interference = new ArcaneInterference(board);
  interference.restore(casting.interference.checkpoint());
  const stages: WeavePreview['stages'] = [];
  recipe.stages.forEach((stage, index) => {
    const known = hero.spells[stage.spell];
    if (!known) throw new Error('Learn both chosen spells first.');
    hero.spells[stage.spell] = { ...known, level: stage.rank };
    const next = new MagicCasting(
      board,
      hero,
      interference,
      casting.flags,
      casting.owner,
      casting.intervalMs,
    );
    const before = board.magicState();
    const preview = next.preview(stage.spell, required(targets[index]));
    if (preview.reason && preview.reason !== 'This cast would change nothing.' && !reason)
      reason = preview.reason;
    stages.push({ before, preview });
    board.adoptMagic(preview.resolution.state);
  });
  if (!reason && stages.every((s) => s.preview.reason === 'This cast would change nothing.'))
    reason = 'Neither effect would change the board.';
  return { id: recipe.id, name: recipe.name, cost, before: casting.snapshotKey(), stages, reason };
}
export function commitWeave(casting: MagicCasting, preview: WeavePreview): WeavePreview {
  if (preview.before !== casting.snapshotKey())
    throw new Error('The board or custom spell changed. Preview again.');
  const targets = preview.stages.map((s) => s.preview.target) as [MagicTarget, MagicTarget];
  const actual = previewWeave(casting, targets);
  if (actual.reason) throw new Error(actual.reason);
  spendMana(casting.hero, actual.cost);
  casting.board.adoptMagic(required(actual.stages[1]).preview.resolution.state);
  return actual;
}
