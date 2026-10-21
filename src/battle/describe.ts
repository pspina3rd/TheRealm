import { ITEMS } from '../data/items';
import type { ChallengeSpec } from '../data/types';

/** One-line rules summary for a challenge, shown before accepting it and in the battle log. */
export function describeSpec(spec: ChallengeSpec): string {
  switch (spec.kind) {
    case 'combat':
      return 'Battle: clear lines to strike. Cast magic with 1–9. The enemy acts every few pieces.';
    case 'offering': {
      const item = ITEMS[spec.itemId]?.name ?? spec.itemId;
      return `Offering: score ${spec.targetScore} points within ${spec.pieceLimit} pieces to present your ${item}. You keep it if you fail.`;
    }
    case 'barter': {
      const wants = Object.entries(spec.wants)
        .map(([color, count]) => `${count} ${color}`)
        .join(' and ');
      return `Barter: clear ${wants} crystals within ${spec.pieceLimit} pieces.`;
    }
    case 'haggle':
      return `Haggle: over ${spec.pieceLimit} pieces, clear lines to push the price down while the merchant pushes it up.`;
    case 'puzzle':
      return `Puzzle: clear ${spec.linesToClear} lines using only the ${spec.queue.length} pieces given.`;
  }
}
