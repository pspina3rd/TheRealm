import { describe, expect, it } from 'vitest';
import {
  castSynergy,
  createSynergy,
  gainSynergyFromLock,
  gainSynergyFromReaction,
  noteSynergyToss,
  synergyCastEligibility,
} from '../src/battle/synergy';
import type { SynergyCastContext, SynergyState } from '../src/battle/synergy';
import { JOINT_SPELLS, SYNERGY } from '../src/data/synergy';

function lesson(mentorId = 'hazel', difficulty = 2): SynergyState {
  const state = createSynergy({
    kind: 'lesson',
    enabled: true,
    mapId: 'grove',
    mentorId,
    difficulty,
  });
  if (!state) throw new Error('Expected an eligible lesson');
  return state;
}

const portrait: SynergyCastContext = { source: 'portrait-tap', shieldUp: false, canAct: true };
const ready = (mentorId = 'hazel', difficulty = 2): SynergyState => ({
  ...lesson(mentorId, difficulty),
  meter: 100,
});

describe('inactive M2a synergy eligibility', () => {
  it('offers only the three approved mentor joint spells', () => {
    expect(Object.keys(JOINT_SPELLS).sort()).toEqual(['dorn', 'hazel', 'maren']);
    for (const mentorId of Object.keys(JOINT_SPELLS)) {
      expect(lesson(mentorId)).toMatchObject({
        mentorId,
        meter: 0,
        used: false,
        latestTossId: null,
      });
    }
  });

  it('requires opt-in outside Mossvale, even for a supported lesson', () => {
    const encounter = {
      kind: 'lesson' as const,
      enabled: true,
      mapId: 'grove',
      mentorId: 'hazel',
      difficulty: 1,
    };
    expect(createSynergy({ ...encounter, enabled: false })).toBeNull();
    expect(createSynergy({ ...encounter, mapId: 'mossvale' })).toBeNull();
    for (const mentorId of ['torva', 'rook', 'kestrel', 'selene', 'unknown', 'toString']) {
      expect(createSynergy({ ...encounter, mentorId })).toBeNull();
    }
    for (const difficulty of [0, -1, 1.5, NaN, Infinity]) {
      expect(createSynergy({ ...encounter, difficulty })).toBeNull();
    }
  });

  it('has no Wyrm, threshold assist, allied boss, or ordinary combat path', () => {
    for (const kind of ['moon-wyrm', 'threshold-assist', 'allied-boss', 'other'] as const) {
      expect(createSynergy({ kind })).toBeNull();
    }
    expect(castSynergy(null, portrait)).toEqual({
      ok: false,
      reason: 'unavailable',
      state: null,
      intents: [],
    });
  });
});

describe('synergy gains', () => {
  it('counts each mentor-element surge line, without counting unrelated surges', () => {
    const original = Object.freeze(lesson());
    const next = gainSynergyFromLock(original, { surges: ['nature', 'water', 'nature'] });
    expect(next.meter).toBe(20);
    expect(original.meter).toBe(0);
    expect(gainSynergyFromLock(next, { surges: [] })).toBe(next);
  });

  it('counts toss cells across cleared rows once per lock and stacks with line gains', () => {
    const state = noteSynergyToss(lesson(), 'toss-1');
    expect(
      gainSynergyFromLock(state, {
        surges: ['nature', 'nature'],
        clearedToss: { tossId: 'toss-1', cells: 4 },
      }).meter,
    ).toBe(30);
    expect(
      gainSynergyFromLock(state, { surges: [], clearedToss: { tossId: 'toss-1', cells: 2 } }).meter,
    ).toBe(10);
  });

  it('never identifies a toss from matching colour or an older toss identity', () => {
    const initial = lesson();
    const old = noteSynergyToss(initial, 'old');
    const state = noteSynergyToss(old, 'latest');
    expect(initial.latestTossId).toBeNull();
    expect(old.latestTossId).toBe('old');
    expect(
      gainSynergyFromLock(state, { surges: ['nature'], clearedToss: { tossId: 'old', cells: 4 } })
        .meter,
    ).toBe(10);
    expect(
      gainSynergyFromLock(initial, { surges: [], clearedToss: { tossId: 'latest', cells: 4 } })
        .meter,
    ).toBe(0);
    for (const cells of [0, 1, 1.9, NaN, Infinity]) {
      expect(
        gainSynergyFromLock(state, { surges: [], clearedToss: { tossId: 'latest', cells } }).meter,
      ).toBe(0);
    }
  });

  it('awards 15 when the mentor is either side of an actual reaction', () => {
    const state = lesson();
    expect(gainSynergyFromReaction(state, { primer: 'arcane', trigger: 'nature' }).meter).toBe(15);
    expect(gainSynergyFromReaction(state, { primer: 'nature', trigger: 'wind' }).meter).toBe(15);
    expect(gainSynergyFromReaction(state, { primer: 'wind', trigger: 'fire' })).toBe(state);
  });

  it('caps combined gains at 100 and never decays between locks', () => {
    let state = noteSynergyToss(lesson(), 'latest');
    for (let i = 0; i < 3; i++) {
      state = gainSynergyFromLock(state, { surges: ['nature', 'nature'] });
      state = gainSynergyFromReaction(state, { primer: 'nature', trigger: 'wind' });
    }
    expect(state.meter).toBe(SYNERGY.maximum);
    expect(
      gainSynergyFromLock(state, { surges: [], clearedToss: { tossId: 'latest', cells: 4 } }).meter,
    ).toBe(100);
    for (let i = 0; i < 20; i++) state = gainSynergyFromLock(state, { surges: [] });
    expect(state.meter).toBe(100);
  });
});

describe('manual portrait casting intents', () => {
  it('blocks shielded, charging, inactive, and nonportrait casts without spending readiness', () => {
    const state = Object.freeze(ready());
    for (const source of ['auto', 'spell-slot', 'weaving'] as const) {
      expect(castSynergy(state, { ...portrait, source })).toMatchObject({
        ok: false,
        reason: 'manual-only',
        state,
        intents: [],
      });
    }
    expect(castSynergy(state, { ...portrait, shieldUp: true })).toMatchObject({
      ok: false,
      reason: 'shield',
      state,
      intents: [],
    });
    expect(castSynergy(state, { ...portrait, canAct: false })).toMatchObject({
      ok: false,
      reason: 'inactive',
      state,
      intents: [],
    });
    expect(synergyCastEligibility({ ...state, meter: 99 }, portrait)).toBe('charging');
    expect(synergyCastEligibility(state, portrait)).toBeNull();
    expect(state).toEqual(ready());
  });

  it.each([
    ['hazel', 'nature', 'spores'],
    ['maren', 'water', 'tide'],
    ['dorn', 'earth', 'rockfall'],
  ])(
    'emits %s damage, a gauge cost, and only its capped rule cleanup',
    (mentorId, element, rule) => {
      const state = Object.freeze(ready(mentorId, 3));
      const result = castSynergy(state, portrait);
      expect(result).toEqual({
        ok: true,
        state: { ...state, meter: 0, used: true },
        intents: [
          { kind: 'damage', element, amount: 36 },
          { kind: 'gauge-cost', share: 0.25 },
          {
            kind: 'region-cleanse',
            rule,
            maximumHazards: 4,
            delayPieces: 3,
            resetCounters: false,
            affectSignatures: false,
          },
        ],
      });
      expect(state.used).toBe(false);
      expect(state.meter).toBe(100);
    },
  );

  it('scales damage with difficulty and never emits mana or a custom spell intent', () => {
    for (const difficulty of [1, 2, 4]) {
      const result = castSynergy(ready('dorn', difficulty), portrait);
      expect(result.intents[0]).toEqual({
        kind: 'damage',
        element: 'earth',
        amount: 18 + 6 * difficulty,
      });
      expect(result.intents.map((intent) => intent.kind)).toEqual([
        'damage',
        'gauge-cost',
        'region-cleanse',
      ]);
    }
  });

  it('casts once per fight and cannot refill or recast after use', () => {
    const result = castSynergy(ready(), portrait);
    if (!result.ok) throw new Error('Expected a valid cast');
    const used = result.state;
    expect(gainSynergyFromLock(used, { surges: ['nature', 'nature'] })).toBe(used);
    expect(gainSynergyFromReaction(used, { primer: 'arcane', trigger: 'nature' })).toBe(used);
    expect(noteSynergyToss(used, 'another')).toBe(used);
    expect(castSynergy(used, portrait)).toMatchObject({
      ok: false,
      reason: 'used',
      state: used,
      intents: [],
    });
    expect(lesson()).toMatchObject({ meter: 0, used: false });
  });
});
