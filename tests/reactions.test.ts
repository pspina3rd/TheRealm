import { describe, expect, it } from 'vitest';
import { emptyCounts, colorOfElement, type Element } from '../src/core/elements';
import type { CellTally } from '../src/core/board';
import { ENEMIES } from '../src/data/enemies';
import { REACTION_DEFINITIONS, REACTION_RING, reactionAfter } from '../src/data/reactions';
import {
  advanceReactions,
  discoverReaction,
  emptyReactionState,
  reactionEffects,
  reactionLines,
  reactionPrimer,
  rowBeforeReaction,
  sanitizeReactionDiscovery,
  type ReactionContext,
  type ReactionLock,
  type ReactionState,
  type ReactionTrigger,
} from '../src/battle/reactions';

const tally = (element: Element, count = 4): CellTally => ({ [colorOfElement(element)]: count });
const event = (element?: Element, overrides: Partial<ReactionLock> = {}): ReactionLock => ({
  source: 'lock',
  mapId: 'grove',
  kind: 'combat',
  enabled: true,
  lines: element ? [{ row: 19, cells: tally(element) }] : [],
  ...overrides,
});
const prime = (element: Element): ReactionState =>
  advanceReactions(emptyReactionState(), event(element)).state;
const trigger = (element: Element): ReactionTrigger => {
  const result = advanceReactions(prime(element), event(reactionAfter(element).trigger)).reaction;
  if (!result) throw new Error('Fixture did not react.');
  return result;
};
const context = (overrides: Partial<ReactionContext> = {}): ReactionContext => ({
  enemy: ENEMIES.slime!,
  shieldUp: false,
  boardHeight: 20,
  clearedRows: [19],
  enemyGaugeMs: 1000,
  strike: { baseDamage: 20, multiplier: 1 },
  ...overrides,
});

describe('approved reaction ring and lock scheduler', () => {
  it('covers each of the seven elements and wraps nature to wind', () => {
    expect(new Set(REACTION_RING).size).toBe(7);
    expect(REACTION_DEFINITIONS.map((r) => [r.primer, r.trigger])).toEqual([
      ['wind', 'fire'],
      ['fire', 'earth'],
      ['earth', 'water'],
      ['water', 'lightning'],
      ['lightning', 'arcane'],
      ['arcane', 'nature'],
      ['nature', 'wind'],
    ]);
  });

  it.each(REACTION_DEFINITIONS)('$name follows its prior-lock primer', (definition) => {
    const original = prime(definition.primer);
    const { reaction, state } = advanceReactions(original, event(definition.trigger));
    expect(reaction).toMatchObject({ id: definition.id, first: true, crystals: 4 });
    expect(state.primer).toEqual({ element: definition.trigger, piecesLeft: 2 });
    expect(state.utilitiesUsed).toEqual([definition.id]);
    expect(original.utilitiesUsed).toEqual([]);
    expect(original.primer).toEqual({ element: definition.primer, piecesLeft: 2 });
  });

  it('accepts a successor on the second subsequent piece, but not the third', () => {
    const oneEmpty = advanceReactions(prime('wind'), event()).state;
    expect(oneEmpty.primer?.piecesLeft).toBe(1);
    expect(advanceReactions(oneEmpty, event('fire')).reaction?.id).toBe('conflagration');
    const twoEmpty = advanceReactions(oneEmpty, event()).state;
    expect(twoEmpty.primer).toBeNull();
    expect(advanceReactions(twoEmpty, event('fire')).reaction).toBeNull();
  });

  it('replaces a primer with a non-successor surge', () => {
    const step = advanceReactions(prime('wind'), event('water'));
    expect(step.reaction).toBeNull();
    expect(step.state.primer).toEqual({ element: 'water', piecesLeft: 2 });
  });

  it('never creates a primer and reaction on the same lock', () => {
    const step = advanceReactions(
      emptyReactionState(),
      event(undefined, {
        lines: [
          { row: 19, cells: tally('wind') },
          { row: 18, cells: tally('fire') },
        ],
      }),
    );
    expect(step.reaction).toBeNull();
    expect(step.state.primer?.element).toBe('wind');
  });

  it('scans bottom first against the frozen prior primer and fires at most once', () => {
    const step = advanceReactions(
      prime('wind'),
      event(undefined, {
        lines: [
          { row: 15, cells: tally('fire', 5) },
          { row: 19, cells: tally('water') },
          { row: 18, cells: tally('fire', 3) },
          { row: 17, cells: tally('earth') },
        ],
      }),
    );
    expect(step.reaction).toMatchObject({ row: 18, rows: [18, 15], crystals: 8 });
    expect(step.state.primer?.element).toBe('fire');
    expect(step.state.utilitiesUsed).toEqual(['conflagration']);
  });

  it('counts actual colour, including mixed dual halves, rather than a shape or boosted power', () => {
    const alignment = emptyCounts(20);
    const step = advanceReactions(
      prime('wind'),
      event(undefined, {
        alignment,
        lines: [{ row: 19, cells: { red: 3, cyan: 2, neutral: 5 } }],
      }),
    );
    expect(step.reaction?.crystals).toBe(3);
    expect(step.reaction?.element).toBe('fire');
    expect(
      advanceReactions(
        prime('wind'),
        event(undefined, {
          lines: [{ row: 19, cells: { red: 2, neutral: 8 } }],
        }),
      ).reaction,
    ).toBeNull();
  });

  it.each(['auto', 'manual', 'weaving', 'reaction'] as const)(
    '%s effects never age or recursively trigger',
    (source) => {
      const state = prime('wind');
      const step = advanceReactions(state, event('fire', { source }));
      expect(step).toEqual({ state, reaction: null });
      expect(step.state).toBe(state);
    },
  );

  it.each([{ mapId: 'mossvale' }, { kind: 'npc' as const }, { enabled: false }])(
    'is ineligible and clears a live window: %j',
    (restriction) => {
      const result = advanceReactions(prime('wind'), event('fire', restriction));
      expect(result.reaction).toBeNull();
      expect(result.state.primer).toBeNull();
    },
  );

  it('supports lesson locks, and remembers each utility through a chain around the ring', () => {
    let state = prime('wind');
    for (const definition of REACTION_DEFINITIONS)
      state = advanceReactions(state, event(definition.trigger, { kind: 'lesson' })).state;
    const repeat = advanceReactions(state, event('fire'));
    expect(repeat.reaction).toMatchObject({ id: 'conflagration', first: false });
    expect(repeat.state.utilitiesUsed).toHaveLength(7);
  });

  it('uses existing line-surges and rejects mismatched row metadata', () => {
    expect(reactionLines({ rows: [8, 19], lines: [tally('water'), tally('fire')] })).toEqual([
      { row: 8, cells: tally('water') },
      { row: 19, cells: tally('fire') },
    ]);
    expect(() => reactionLines({ rows: [], lines: [tally('fire')] })).toThrow('board row');
  });

  it('returns successor glyph by element even when the actual toss had another shape', () => {
    expect(reactionPrimer(prime('arcane'))).toEqual({
      element: 'arcane',
      successor: 'nature',
      shape: 'S',
      piecesLeft: 2,
    });
    expect(reactionPrimer(emptyReactionState())).toBeNull();
  });
});

describe('bounded effect intents', () => {
  it('Conflagration always bursts but removes only the two highest eligible stones once', () => {
    const fire = trigger('wind');
    const ctx = context({
      cells: [
        { x: 1, y: 8, stone: true },
        { x: 5, y: 3, stone: true },
        { x: 1, y: 3, stone: true },
        { x: 0, y: 0, stone: true, signature: true },
      ],
    });
    expect(reactionEffects(fire, ctx)).toEqual([
      { kind: 'damage', element: 'fire', amount: 24, affinity: 'spell' },
      {
        kind: 'removeStones',
        cells: [
          [1, 3],
          [5, 3],
        ],
        rewards: { mana: false, strike: false, autoBudget: false, reactions: false },
      },
    ]);
    expect(reactionEffects({ ...fire, first: false }, ctx)).toHaveLength(1);
  });

  it('Eruption clears a single bottom row with no rewards and never deletes protected content', () => {
    const eruption = trigger('fire');
    const effects = reactionEffects(eruption, context());
    expect(effects).toContainEqual({
      kind: 'clearBottomRow',
      row: 19,
      rewards: { mana: false, strike: false, autoBudget: false, reactions: false },
    });
    for (const protection of ['signature', 'thresholdDefining', 'protected'] as const)
      expect(
        reactionEffects(eruption, context({ cells: [{ x: 3, y: 19, [protection]: true }] })).some(
          (effect) => effect.kind === 'clearBottomRow',
        ),
      ).toBe(false);
    expect(reactionEffects({ ...eruption, first: false }, context())).toHaveLength(1);
  });

  it('Quagmire respects the −3s gauge floor and never delays a protected next event', () => {
    const quagmire = trigger('earth');
    expect(reactionEffects(quagmire, context())).toEqual([
      { kind: 'delayEnemy', ms: 2000, floorMs: -3000 },
    ]);
    expect(reactionEffects(quagmire, context({ enemyGaugeMs: -2500 }))).toEqual([
      { kind: 'delayEnemy', ms: 500, floorMs: -3000 },
    ]);
    expect(reactionEffects(quagmire, context({ enemyGaugeMs: -4000 }))[0]).toMatchObject({ ms: 0 });
    expect(reactionEffects(quagmire, context({ nextMove: { signature: true } }))).toEqual([]);
    expect(reactionEffects(quagmire, context({ nextMove: { thresholdDefining: true } }))).toEqual(
      [],
    );
    expect(reactionEffects({ ...quagmire, first: false }, context())[0]).toMatchObject({
      kind: 'damage',
      element: 'water',
    });
  });

  it('Conduction adds only the extra strike fraction and caps total multiplier at3', () => {
    const conduction = trigger('water');
    const ctx = context({
      enemy: ENEMIES.slime!,
      strike: { baseDamage: 20, multiplier: 2.5 },
    });
    expect(reactionEffects(conduction, ctx)[0]).toMatchObject({ amount: 10 });
    expect(
      reactionEffects(
        { ...conduction, first: false },
        context({
          enemy: ENEMIES.slime!,
          strike: { baseDamage: 20, multiplier: 1 },
        }),
      )[0],
    ).toMatchObject({ amount: 5 });
    expect(
      reactionEffects(conduction, { ...ctx, strike: { baseDamage: 20, multiplier: 4 } })[0],
    ).toMatchObject({ amount: 0 });
  });

  it('Overload is the only mana intent: exactly +2 to each of its two pools once', () => {
    const overload = trigger('lightning');
    expect(reactionEffects(overload, context())).toEqual([
      { kind: 'mana', gained: { lightning: 2, arcane: 2 }, source: 'earnedTriggerClear' },
    ]);
    expect(reactionEffects({ ...overload, first: false }, context())[0]).toMatchObject({
      kind: 'damage',
      element: 'arcane',
    });
    for (const definition of REACTION_DEFINITIONS.filter((reaction) => reaction.id !== 'overload'))
      expect(
        reactionEffects(trigger(definition.primer), context()).some(
          (effect) => effect.kind === 'mana',
        ),
      ).toBe(false);
  });

  it('Witchbloom heals and removes at most3 adjacent hazard tags without removing cells/resetting counters', () => {
    const witchbloom = trigger('arcane');
    const ctx = context({
      clearedRows: [19],
      cells: [
        { x: 1, y: 19, hazard: true },
        { x: 2, y: 19, hazard: true },
        { x: 3, y: 19, hazard: true },
        { x: 4, y: 19, hazard: true },
        { x: 0, y: 19, hazard: true, signature: true },
        { x: 5, y: 17, hazard: true },
      ],
    });
    expect(reactionEffects(witchbloom, ctx)).toEqual([
      { kind: 'heal', amount: 10 },
      {
        kind: 'removeHazards',
        cells: [
          [1, 19],
          [2, 19],
          [3, 19],
        ],
        resetsCounter: false,
      },
    ]);
    expect(reactionEffects({ ...witchbloom, first: false }, ctx)).toEqual([
      { kind: 'heal', amount: 3 },
    ]);
  });

  it('maps remaining post-clear tags back to source rows before applying the ±1 radius', () => {
    expect(rowBeforeReaction(19, [18])).toBe(19);
    expect(rowBeforeReaction(18, [18])).toBe(17);
    expect(rowBeforeReaction(16, [17, 19])).toBe(14);
    expect(rowBeforeReaction(0, [19])).toBeNull();
    const witchbloom = { ...trigger('arcane'), rows: [10], row: 10 };
    const effects = reactionEffects(
      witchbloom,
      context({
        clearedRows: [10, 19],
        cells: [
          { x: 1, y: 11, hazard: true }, // source9, within1 of trigger10
          { x: 2, y: 13, hazard: true }, // source12, too far
        ],
      }),
    );
    expect(effects.find((effect) => effect.kind === 'removeHazards')).toMatchObject({
      cells: [[1, 11]],
    });
  });

  it('Seedstorm removes only the oldest eligible hex and grants2-piece noncleansing tailwind', () => {
    const seedstorm = trigger('nature');
    const effects = reactionEffects(
      seedstorm,
      context({
        hexes: [
          { id: 'boss', kind: 'seal', appliedAt: 1, signature: true },
          { id: 'new', kind: 'haste', appliedAt: 6 },
          { id: 'old', kind: 'fog', appliedAt: 3 },
          { id: 'threshold', kind: 'quicken', appliedAt: 0, thresholdDefining: true },
        ],
      }),
    );
    expect(effects).toEqual([
      { kind: 'cleanseHex', id: 'old' },
      { kind: 'tailwind', pieces: 2, cleansesOtherHexes: false },
    ]);
    expect(reactionEffects({ ...seedstorm, first: false }, context())[0]).toMatchObject({
      kind: 'damage',
      element: 'wind',
    });
  });

  it('shield blocks every reaction damage intent but retains utility and spent-utility state', () => {
    for (const definition of REACTION_DEFINITIONS) {
      for (const first of [true, false]) {
        const effects = reactionEffects(
          { ...trigger(definition.primer), first },
          context({ shieldUp: true }),
        );
        for (const effect of effects) if (effect.kind === 'damage') expect(effect.amount).toBe(0);
      }
    }
    expect(reactionEffects(trigger('lightning'), context({ shieldUp: true }))[0]).toMatchObject({
      kind: 'mana',
    });
    expect(advanceReactions(prime('fire'), event('earth')).state.utilitiesUsed).toEqual([
      'eruption',
    ]);
  });

  it('uses existing boss spell weakness share, without granting a weakness override', () => {
    const normal = { ...ENEMIES.slime!, element: 'arcane' as const };
    const boss = { ...normal, boss: true };
    expect(reactionEffects(trigger('wind'), context({ enemy: normal }))[0]).toMatchObject({
      amount: 24,
    });
    expect(reactionEffects(trigger('wind'), context({ enemy: boss }))[0]).toMatchObject({
      amount: 16,
    });
    expect(
      reactionEffects(trigger('wind'), context({ enemy: { ...normal, element: 'fire' } }))[0],
    ).toMatchObject({ amount: 8 });
  });
});

describe('persistent reaction discoveries remain separate from fight state', () => {
  it('sanitizes unknowns and duplicates to stable approved IDs', () => {
    expect(sanitizeReactionDiscovery(['seedstorm', 'fake', 'overload', 'seedstorm', 3])).toEqual({
      reactionsSeen: ['overload', 'seedstorm'],
    });
    expect(sanitizeReactionDiscovery({ primer: 'fire' })).toEqual({ reactionsSeen: [] });
  });

  it('discovery is immutable/idempotent and a fresh fight restores utility availability', () => {
    const seen = sanitizeReactionDiscovery(['overload']);
    const next = discoverReaction(seen, 'witchbloom');
    expect(seen.reactionsSeen).toEqual(['overload']);
    expect(discoverReaction(next, 'witchbloom')).toEqual(next);
    expect(trigger('lightning').first).toBe(true);
    expect(emptyReactionState().utilitiesUsed).toEqual([]);
  });
});
