import { describe, expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import { createRng } from '../src/core/rng';
import { createHero } from '../src/game/hero';
import { attachCampaignBattle, currentNativeBattle, dispatch } from '../src/nativeBattle';
import { nativePresentation } from '../src/native/presentation';
import { nativeVisualFixtures, visualFixturesJSON } from '../src/native/visualFixtures';

describe('native visual gallery fixture safety and coverage', () => {
  it('leaves the attached live battle, its empty spellbook and its progress unchanged', () => {
    const live = new Battle({ kind: 'combat', enemyId: 'slime' }, createHero(), createRng(91), {
      boardMagic: true,
      autoCast: true,
    });
    attachCampaignBattle(live, () => true);
    const before = dispatch(JSON.stringify({ type: 'snapshot' }));
    expect(JSON.parse(visualFixturesJSON())).toHaveLength(111);
    expect(currentNativeBattle()).toBe(live);
    expect(dispatch(JSON.stringify({ type: 'snapshot' }))).toBe(before);
    expect(live.hero.spells).toEqual({});
  });

  it('contains every learned base rank in all three actual renderer phases', () => {
    const cases = nativeVisualFixtures();
    expect(new Set(cases.map((item) => item.id)).size).toBe(cases.length);
    for (const group of ['fire', 'water', 'earth', 'wind', 'lightning', 'nature']) {
      const school = cases.filter((item) => item.group === group);
      expect(school).toHaveLength(12);
      for (const rank of [1, 2, 3, 4]) {
        const phases = school.filter((item) => item.state.effect?.rank === rank);
        expect(phases.map((item) => item.state.effect?.phase)).toEqual([
          'target',
          'effect',
          'result',
        ]);
        expect(phases.every((item) => item.state.spells[0]?.rank === rank)).toBe(true);
        expect(phases.every((item) => item.state.effect?.character === false)).toBe(true);
        expect(phases.every((item) => item.state.effect?.visual.length)).toBe(true);
      }
    }
    expect(cases.find((item) => item.id === 'zero-spells')?.state.spells).toEqual([]);
    for (const rank of [1, 2, 3, 4]) {
      const arcane = cases.find((item) => item.id === `arcane-r${rank}`)?.state.effect;
      expect(arcane).toMatchObject({ character: true, element: 'arcane', rank, rows: [] });
    }
    for (const element of ['fire', 'water', 'earth', 'wind', 'lightning', 'nature']) {
      const state = cases.find((item) => item.id === `arcane-technique-${element}`)?.state;
      expect(state?.effect).toBeNull();
      expect(state?.stage.feedback).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'opponentCast',
            element,
            rank: 2,
            technique: `arcane:${element}`,
          }),
        ]),
      );
    }
  });

  it('shows order-dependent real Weaving results and independently chosen stage strengths', () => {
    const cases = nativeVisualFixtures();
    const first = cases.find((item) => item.id === 'weave-fire-gravity-2-result')?.state.effect;
    const reverse = cases.find((item) => item.id === 'weave-gravity-fire-2-result')?.state.effect;
    expect(first?.after.grid).not.toEqual(reverse?.after.grid);
    expect(first).toMatchObject({ source: 'weave', index: 2, total: 2, element: 'earth' });
    expect(reverse).toMatchObject({ source: 'weave', index: 2, total: 2, element: 'fire' });
    expect(cases.find((item) => item.id === 'weave-mixed-ranks-1-effect')?.state.effect?.rank).toBe(
      2,
    );
    expect(cases.find((item) => item.id === 'weave-mixed-ranks-2-effect')?.state.effect?.rank).toBe(
      1,
    );
  });

  it('shows all six authored encounter skins with their actual zero-spell boards and goals', () => {
    const cases = nativeVisualFixtures().filter((item) => item.id.startsWith('encounter-'));
    expect(cases.map((item) => item.id)).toEqual([
      'encounter-well',
      'encounter-tower',
      'encounter-beds',
      'encounter-stall',
      'encounter-ring',
      'encounter-lamps',
    ]);
    expect(
      cases.every((item) => item.state.spells.length === 0 && item.state.effect === null),
    ).toBe(true);
    const well = cases.find((item) => item.id === 'encounter-well')!.state;
    expect(well.width).toBe(7);
    expect(well.tags.flat()).toContain('target');
    expect(well.verb?.params).toHaveProperty('lip');
    const tower = cases.find((item) => item.id === 'encounter-tower')!.state;
    expect(tower.verb?.params).toHaveProperty('spare');
    const beds = cases.find((item) => item.id === 'encounter-beds')!.state;
    expect(beds.tags.flat()).toContain('ridge');
    expect(beds.verb?.verb).toBe('plant');
    const ring = cases.find((item) => item.id === 'encounter-ring')!.state;
    expect(ring.tags.flat()).toContain('protected');
    const lamps = cases.find((item) => item.id === 'encounter-lamps')!.state;
    expect(lamps.objective.lamps).toHaveLength(4);
  });
  it('carries a real mentor lesson with borrowed magic and matching elemental art', () => {
    const item = nativeVisualFixtures().find((item) => item.id === 'mentor-lesson')!;
    expect(item.state.stage.ally).not.toBeNull();
    expect(item.state.stage.tint).toBe('fire');
    expect(item.state.stage.allyElement).toBe('fire');
    expect(item.state.stage.shieldElement).toBe('fire');
    expect(item.state.active?.recolored).toBe(true);
    expect(item.state.feedback.some((item) => item.kind === 'toss')).toBe(true);
  });
  it('does not invent an elemental tint for a lesson foe without authored tint', () => {
    const battle = new Battle(
      { kind: 'lesson', mentorId: 'torva', spellId: 'fire', enemyId: 'forgeImp', difficulty: 1 },
      createHero(),
      createRng(1),
      { boardMagic: true },
    );
    const stage = nativePresentation(battle).stage;
    expect(stage.tint).toBeNull();
    expect(stage.allyElement).toBe('fire');
  });
});
