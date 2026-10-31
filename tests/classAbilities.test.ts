import { describe, expect, it } from 'vitest';
import {
  ABILITY_AWAKE_FLAG,
  OUTSIDE_LESSON_FLAG,
  abilityTradeFlag,
  awakenClassAbility,
  hasAwakenedClassAbility,
  migrateClassAbility,
  type AbilityClassId,
  type ClassAbilityProgress,
} from '../src/game/classAbilities';
import {
  classAbilitySight,
  createClassAbilityState,
  insidePickpocketWindow,
  onClassAbilityLock,
  onClassAbilityPush,
  type AbilityRowPush,
  type ClassAbilityLock,
  type ClassAbilityRules,
  type ClassAbilityScope,
  type ClassAbilityState,
  type PickpocketTelegraph,
} from '../src/battle/classAbilities';
import { createHero } from '../src/game/hero';
import { CLASSES } from '../src/data/classes';
import { derivedStats } from '../src/game/stats';

const RULES: ClassAbilityRules = {
  breeze: { safePlacements: 6, maxGlass: 2 },
  bulwark: { earthCrystals: 3, protectedNpcPushes: 2 },
  pickpocket: { minLines: 3, cooldownPieces: 10 },
  sight: { leadPieces: 2, extraDarkRows: 1 },
};

function progress(classId: string): ClassAbilityProgress {
  const hero = createHero(classId);
  return { classId, stats: hero.stats, flags: new Set(['unrelated:progress']) };
}

const lesson = { kind: 'mentorLesson', mapId: 'grove', mentorId: 'hazel', outcome: 'won' } as const;

function fresh(
  classId: AbilityClassId,
  change: Partial<ClassAbilityScope> = {},
): ClassAbilityState {
  return createClassAbilityState(
    { classId, awakened: true, mapId: 'grove', encounter: 'combat', board: 'standard', ...change },
    RULES,
  );
}

function lock(piece: number, change: Partial<ClassAbilityLock> = {}): ClassAbilityLock {
  return { piece, linesCleared: 0, holesMade: 0, earthCrystalsByLine: [], ...change };
}

function event(
  id: string,
  windowStartPiece: number,
  change: Partial<PickpocketTelegraph> = {},
): PickpocketTelegraph {
  return {
    id,
    windowStartPiece,
    pickable: true,
    signature: false,
    thresholdDefining: false,
    ...change,
  };
}

const push = {
  source: 'curse',
  rows: 2,
  blockable: true,
  signature: false,
  thresholdDefining: false,
};

describe('class ability awakening and persistence transitions', () => {
  it.each(['won', 'lost'] as const)('awakens after an outside lesson that was %s', (outcome) => {
    const original = progress('ranger');
    const result = awakenClassAbility(original, { ...lesson, outcome });
    expect(result.status).toBe('awakened');
    expect(result.stats.agility).toBe(1);
    expect(result.flags).toEqual(
      new Set([
        'unrelated:progress',
        ABILITY_AWAKE_FLAG,
        OUTSIDE_LESSON_FLAG,
        abilityTradeFlag('ranger'),
      ]),
    );
    expect(original.stats.agility).toBe(2);
    expect(original.flags).toEqual(new Set(['unrelated:progress']));
  });

  it.each([
    ['ranger', 'agility'],
    ['knight', 'vitality'],
    ['mage', 'focus'],
    ['rogue', 'strength'],
  ] as const)('trades exactly one %s rank and never pays twice', (classId, stat) => {
    const original = progress(classId);
    const result = awakenClassAbility(original, lesson);
    expect(result.trade).toEqual({ classId, stat, before: 2, after: 1 });
    expect(hasAwakenedClassAbility({ classId, flags: result.flags })).toBe(true);
    const next = awakenClassAbility({ ...original, ...result }, lesson);
    expect(next.status).toBe('unchanged');
    expect(next.stats).toEqual(result.stats);
    expect(next.trade).toBeNull();
  });

  it('does not change Mossvale starts or awaken on a Mossvale lesson', () => {
    const original = progress('knight');
    const result = awakenClassAbility(original, { ...lesson, mapId: 'mossvale' });
    expect(result.status).toBe('unchanged');
    expect(result.stats).toEqual(original.stats);
    expect(result.flags.has(ABILITY_AWAKE_FLAG)).toBe(false);
    expect(createHero('knight').stats.vitality).toBe(2);
  });

  it('exposes the derived-stat trade without changing or healing a Hero', () => {
    const knight = createHero('knight');
    const result = awakenClassAbility(
      { classId: knight.classId, stats: knight.stats, flags: new Set() },
      lesson,
    );
    expect(derivedStats(CLASSES.knight!, knight.level, result.stats).maxHp).toBe(48);
    expect(knight.maxHp).toBe(54);
    expect(knight.hp).toBe(54);
    const mage = awakenClassAbility(progress('mage'), lesson);
    expect(derivedStats(CLASSES.mage!, 1, mage.stats).manaCap).toBe(15);
    expect(mage.stats.insight).toBe(2);
  });

  it('migration gives an old post-lesson hero the same trade, once', () => {
    const original = progress('rogue');
    const result = migrateClassAbility(original, { pastOutsideMossvaleLesson: true });
    expect(result.stats.strength).toBe(1);
    const replay = migrateClassAbility(
      { ...original, ...result },
      { pastOutsideMossvaleLesson: true },
    );
    expect(replay.stats.strength).toBe(1);
    expect(replay.trade).toBeNull();
    expect(replay.flags.has('unrelated:progress')).toBe(true);
  });

  it('does not guess old awakening from a known class or an unchanged pre-lesson save', () => {
    const result = migrateClassAbility(progress('mage'), { pastOutsideMossvaleLesson: false });
    expect(result.status).toBe('unchanged');
    expect(result.stats.focus).toBe(2);
    expect(hasAwakenedClassAbility({ classId: 'mage', flags: result.flags })).toBe(false);
  });

  it('repairs an awake-only receipt by applying its unpaid trade', () => {
    const original = progress('ranger');
    const flags = new Set([...original.flags, ABILITY_AWAKE_FLAG]);
    expect(hasAwakenedClassAbility({ classId: 'ranger', flags })).toBe(false);
    const result = migrateClassAbility(
      { ...original, flags },
      { pastOutsideMossvaleLesson: false },
    );
    expect(result.status).toBe('repaired');
    expect(result.stats.agility).toBe(1);
  });

  it('repairs a paid receipt without charging again if its awake marker was lost', () => {
    const original = progress('knight');
    const stats = { ...original.stats, vitality: 1 };
    const result = migrateClassAbility(
      { ...original, stats, flags: new Set([abilityTradeFlag('knight')]) },
      { pastOutsideMossvaleLesson: false },
    );
    expect(result.status).toBe('repaired');
    expect(result.stats.vitality).toBe(1);
    expect(result.trade).toBeNull();
    expect(result.flags.has(ABILITY_AWAKE_FLAG)).toBe(true);
  });

  it('does not refund a skill point or silently select a default unknown class', () => {
    const hero = createHero('ranger');
    hero.skillPoints = 7;
    awakenClassAbility({ classId: hero.classId, stats: hero.stats, flags: new Set() }, lesson);
    expect(hero.skillPoints).toBe(7);
    const result = awakenClassAbility({ ...progress('ranger'), classId: 'future-class' }, lesson);
    expect(result.status).toBe('invalid');
    expect(result.stats.agility).toBe(2);
  });

  it.each([0, -1, 0.5, Number.NaN])(
    'rejects an unpayable/malformed rank %s atomically',
    (agility) => {
      const original = progress('ranger');
      const result = awakenClassAbility(
        { ...original, stats: { ...original.stats, agility } },
        lesson,
      );
      expect(result.status).toBe('invalid');
      expect(result.flags.has(ABILITY_AWAKE_FLAG)).toBe(false);
      expect(result.trade).toBeNull();
    },
  );
});

describe('ability scope and fresh battle state', () => {
  it.each([
    { mapId: 'mossvale' },
    { board: 'LOCK' as const },
    { board: 'BUILD' as const },
    { awakened: false },
  ])('does nothing in excluded scope %o', (scope) => {
    for (const classId of ['ranger', 'knight', 'mage', 'rogue'] as const) {
      const state = fresh(classId, scope);
      expect(state.active).toBe(false);
      expect(
        onClassAbilityLock(
          state,
          lock(1, {
            holesMade: 4,
            linesCleared: 4,
            earthCrystalsByLine: [3],
            telegraphs: [event('rise', 1)],
          }),
        ).intents,
      ).toEqual([]);
      expect(onClassAbilityPush(state, push).rows).toBe(2);
      expect(classAbilitySight(state, true)).toEqual({
        leadPieces: 1,
        exactContainSpread: false,
        extraDarkRows: 0,
      });
    }
  });

  it('copies tuning and starts every battle with no earned utility', () => {
    const rules = {
      breeze: { safePlacements: 6, maxGlass: 2 },
      bulwark: { earthCrystals: 3, protectedNpcPushes: 2 },
      pickpocket: { minLines: 3, cooldownPieces: 10 },
      sight: { leadPieces: 2, extraDarkRows: 1 },
    };
    const first = createClassAbilityState(
      { classId: 'knight', awakened: true, mapId: 'grove', encounter: 'npc', board: 'standard' },
      rules,
    );
    rules.bulwark.protectedNpcPushes = 99;
    expect(first.rules.bulwark.protectedNpcPushes).toBe(2);
    expect(first.bulwarkCharged).toBe(false);
    expect(first.npcBlocks).toBe(0);
    expect(fresh('rogue').pickpocketReadyAt).toBe(0);
  });

  it('rejects tuning that raises utility caps or removes event protections', () => {
    expect(() =>
      createClassAbilityState(
        {
          classId: 'ranger',
          awakened: true,
          mapId: 'grove',
          encounter: 'combat',
          board: 'standard',
        },
        {
          ...RULES,
          breeze: { safePlacements: 6, maxGlass: 3 },
        },
      ),
    ).toThrow(/bounds/);
    expect(() =>
      createClassAbilityState(
        { classId: 'knight', awakened: true, mapId: 'grove', encounter: 'npc', board: 'standard' },
        {
          ...RULES,
          bulwark: { earthCrystals: 3, protectedNpcPushes: 0 },
        },
      ),
    ).toThrow(/bounds/);
  });
});

describe('Breeze', () => {
  function charge(): ClassAbilityState {
    let state = fresh('ranger');
    for (let piece = 1; piece <= 6; piece++) state = onClassAbilityLock(state, lock(piece)).state;
    return state;
  }

  it('needs six consecutive safe placements, holds one charge and fills only two new holes', () => {
    let state = fresh('ranger');
    for (let piece = 1; piece <= 5; piece++) state = onClassAbilityLock(state, lock(piece)).state;
    expect(state.breezeCharged).toBe(false);
    state = onClassAbilityLock(state, lock(6)).state;
    state = onClassAbilityLock(state, lock(7)).state;
    expect(state.safePlacements).toBe(6);
    const result = onClassAbilityLock(state, lock(8, { holesMade: 5 }));
    expect(result.intents).toEqual([{ kind: 'fillNewHolesWithGlass', piece: 8, count: 2 }]);
    expect(result.state.breezeCharged).toBe(false);
    expect(result.state.safePlacements).toBe(0);
    expect(state.breezeCharged).toBe(true);
  });

  it('does not fill existing holes or spend a charge on a safe placement', () => {
    const state = charge();
    const safe = onClassAbilityLock(state, lock(7));
    expect(safe.intents).toEqual([]);
    expect(safe.state.breezeCharged).toBe(true);
    expect(onClassAbilityLock(safe.state, lock(8, { holesMade: 1 })).intents).toEqual([
      { kind: 'fillNewHolesWithGlass', piece: 8, count: 1 },
    ]);
  });

  it('a hole before charging resets the streak, and duplicate locks cannot charge it', () => {
    let state = fresh('ranger');
    state = onClassAbilityLock(state, lock(1)).state;
    expect(onClassAbilityLock(state, lock(1)).state.safePlacements).toBe(1);
    state = onClassAbilityLock(state, lock(2, { holesMade: 1 })).state;
    expect(state.safePlacements).toBe(0);
    expect(state.breezeCharged).toBe(false);
  });
});

describe('Bulwark', () => {
  function charged(state = fresh('knight'), piece = 1): ClassAbilityState {
    return onClassAbilityLock(state, lock(piece, { linesCleared: 1, earthCrystalsByLine: [3] }))
      .state;
  }

  it('requires three orange crystals within one cleared line, not across several lines', () => {
    const state = fresh('knight');
    expect(
      onClassAbilityLock(state, lock(1, { linesCleared: 2, earthCrystalsByLine: [2, 2] })).state
        .bulwarkCharged,
    ).toBe(false);
    expect(charged(state).bulwarkCharged).toBe(true);
    expect(
      onClassAbilityLock(state, lock(1, { earthCrystalsByLine: [3] })).state.bulwarkCharged,
    ).toBe(false);
  });

  it('blocks only one row of a two-row push and spends its earned charge', () => {
    const state = charged();
    const result = onClassAbilityPush(state, push);
    expect(result.rows).toBe(1);
    expect(result.intents).toEqual([{ kind: 'blockPushedRow', source: 'curse', count: 1 }]);
    expect(result.state.bulwarkCharged).toBe(false);
    expect(onClassAbilityPush(result.state, push).rows).toBe(2);
  });

  it('preserves the first two NPC pushes, including multirow calls, then caps at one block', () => {
    let state = charged(fresh('knight', { encounter: 'npc' }));
    for (let call = 0; call < 2; call++) {
      const result = onClassAbilityPush(state, push);
      expect(result.rows).toBe(2);
      expect(result.state.bulwarkCharged).toBe(true);
      state = result.state;
    }
    const third = onClassAbilityPush(state, push);
    expect(third.rows).toBe(1);
    state = charged(third.state, 2);
    expect(onClassAbilityPush(state, push).rows).toBe(2);
    expect(state.npcBlocks).toBe(1);
  });

  it.each([{ signature: true }, { thresholdDefining: true }, { blockable: false }])(
    'never blocks protected pushes %o or spends the charge',
    (protection) => {
      const state = charged();
      const result = onClassAbilityPush(state, { ...push, ...protection });
      expect(result.rows).toBe(2);
      expect(result.intents).toEqual([]);
      expect(result.state.bulwarkCharged).toBe(true);
    },
  );

  it('zero-row calls cannot consume protected NPC pushes or a charge', () => {
    const result = onClassAbilityPush(charged(fresh('knight', { encounter: 'npc' })), {
      ...push,
      rows: 0,
    });
    expect(result.state.npcPushes).toBe(0);
    expect(result.state.bulwarkCharged).toBe(true);
  });

  it('does not intercept legacy pushes without explicit protection metadata', () => {
    const legacyPush = { source: 'curse', rows: 2, blockable: true } as AbilityRowPush;
    expect(onClassAbilityPush(charged(), legacyPush).rows).toBe(2);
  });
});

describe('Pickpocket and Arcane Sight timing', () => {
  it.each([
    [4, false],
    [5, true],
    [6, true],
    [7, false],
  ] as const)('window on spawn 5 accepts lock %s: %s', (piece, eligible) => {
    expect(insidePickpocketWindow(event('rise', 5), piece)).toBe(eligible);
    const result = onClassAbilityLock(
      fresh('rogue'),
      lock(piece, { linesCleared: 3, telegraphs: [event('rise', 5)] }),
    );
    expect(result.intents.length > 0).toBe(eligible);
  });

  it('requires a 3+ clear, then cancels only the earliest eligible event', () => {
    const telegraphs = [event('later', 6), event('first', 5), event('same-time', 5)];
    expect(
      onClassAbilityLock(fresh('rogue'), lock(6, { linesCleared: 2, telegraphs })).intents,
    ).toEqual([]);
    expect(
      onClassAbilityLock(fresh('rogue'), lock(6, { linesCleared: 3, telegraphs })).intents,
    ).toEqual([{ kind: 'cancelTelegraphedEvent', eventId: 'first' }]);
  });

  it('waits ten pieces, allows the exact cooldown boundary, and never cancels an event twice', () => {
    let state = onClassAbilityLock(
      fresh('rogue'),
      lock(5, { linesCleared: 3, telegraphs: [event('first', 5)] }),
    ).state;
    expect(state.pickpocketReadyAt).toBe(15);
    const blocked = onClassAbilityLock(
      state,
      lock(14, { linesCleared: 4, telegraphs: [event('too-early', 14)] }),
    );
    expect(blocked.intents).toEqual([]);
    state = blocked.state;
    const ready = onClassAbilityLock(
      state,
      lock(15, { linesCleared: 3, telegraphs: [event('ready', 14)] }),
    );
    expect(ready.intents).toEqual([{ kind: 'cancelTelegraphedEvent', eventId: 'ready' }]);
    expect(
      onClassAbilityLock(
        ready.state,
        lock(25, { linesCleared: 4, telegraphs: [event('ready', 25)] }),
      ).intents,
    ).toEqual([]);
  });

  it('allows only one cancellation in an NPC encounter, even after cooldown', () => {
    const first = onClassAbilityLock(
      fresh('rogue', { encounter: 'npc' }),
      lock(1, { linesCleared: 3, telegraphs: [event('first', 1)] }),
    );
    expect(first.state.npcCancels).toBe(1);
    expect(
      onClassAbilityLock(
        first.state,
        lock(11, { linesCleared: 4, telegraphs: [event('second', 11)] }),
      ).intents,
    ).toEqual([]);
  });

  it.each([{ signature: true }, { thresholdDefining: true }, { pickable: false }])(
    'cannot steal protected events %o',
    (protection) => {
      const result = onClassAbilityLock(
        fresh('rogue'),
        lock(5, { linesCleared: 4, telegraphs: [event('boss', 5, protection)] }),
      );
      expect(result.intents).toEqual([]);
      expect(result.state.pickpocketReadyAt).toBe(0);
    },
  );

  it('Sight changes visibility only, while retaining the normal event window', () => {
    const mage = fresh('mage');
    expect(classAbilitySight(mage, true)).toEqual({
      leadPieces: 2,
      exactContainSpread: true,
      extraDarkRows: 1,
    });
    expect(classAbilitySight(mage, false).leadPieces).toBe(1);
    expect(classAbilitySight(mage, true, 3).leadPieces).toBe(3);
    expect(insidePickpocketWindow(event('early-view', 5), 4)).toBe(false);
    expect(
      onClassAbilityLock(mage, lock(5, { linesCleared: 4, telegraphs: [event('early-view', 5)] }))
        .intents,
    ).toEqual([]);
  });

  it('does not infer pickable safety from missing legacy metadata', () => {
    const legacyEvent = {
      id: 'legacy',
      windowStartPiece: 5,
      pickable: true,
    } as PickpocketTelegraph;
    expect(
      onClassAbilityLock(
        fresh('rogue'),
        lock(5, {
          linesCleared: 4,
          telegraphs: [legacyEvent],
        }),
      ).intents,
    ).toEqual([]);
  });
});
