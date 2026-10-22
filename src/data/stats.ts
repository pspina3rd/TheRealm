/** The hero's eight stats, each a rank bought with skill points. */
export const STAT_IDS = [
  'vitality',
  'strength',
  'guard',
  'focus',
  'agility',
  'insight',
  'charm',
  'luck',
] as const;

export type StatId = (typeof STAT_IDS)[number];

/** A rank for every stat. */
export type StatRanks = Record<StatId, number>;

export interface StatDef {
  readonly id: StatId;
  readonly name: string;
  /** What a rank does, as a short tooltip. */
  readonly description: string;
  /** Highest rank. It also caps percentage effects (e.g. Agility 10 = 40% slower). */
  readonly maxRank: number;
}

/** Stat definitions; the rules for each live in `src/game/stats.ts`. */
export const STATS: Readonly<Record<StatId, StatDef>> = {
  vitality: { id: 'vitality', name: 'Vitality', description: '+6 max HP', maxRank: 10 },
  strength: {
    id: 'strength',
    name: 'Strength',
    description: '+1 damage on every line strike',
    maxRank: 10,
  },
  guard: { id: 'guard', name: 'Guard', description: '−1 damage from every hit', maxRank: 10 },
  focus: { id: 'focus', name: 'Focus', description: '+1 capacity in every mana pool', maxRank: 10 },
  agility: { id: 'agility', name: 'Agility', description: 'Pieces fall 4% slower', maxRank: 10 },
  insight: {
    id: 'insight',
    name: 'Insight',
    description: 'Rank 3: see 2 next pieces · 6: see 3 · 9: see the enemy’s next move',
    maxRank: 9,
  },
  charm: { id: 'charm', name: 'Charm', description: '3% better prices', maxRank: 10 },
  luck: {
    id: 'luck',
    name: 'Luck',
    description: '+2% item drops · 3% chance for a 3+ line strike to deal double',
    maxRank: 10,
  },
};
