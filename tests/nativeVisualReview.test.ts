import { describe, expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import { BOARD_SPELLS } from '../src/battle/magicCasting';
import { spanFor, type MagicState, type MagicVisualBlock } from '../src/core/boardMagic';
import { createRng } from '../src/core/rng';
import { SPELLS } from '../src/data/spells';
import { ELEMENTS } from '../src/core/elements';
import { ENCOUNTER_DEFS } from '../src/data/encounters';
import { createHero } from '../src/game/hero';
import { castSpellFor, newKnownSpell } from '../src/game/spells';
import { saveWeave, type WeaveRecipe } from '../src/game/weaving';
import { attachCampaignBattle, dispatch } from '../src/nativeBattle';

const flags = new Set(['wyrmBeaten', 'scene:chapterEnd']);
const schools = Object.keys(BOARD_SPELLS);
interface EffectWire {
  element: string;
  source?: string;
  character: boolean;
  index: number;
  total: number;
  rows: number[];
  before: Pick<MagicState, 'grid' | 'obstructions'>;
  effectState: Pick<MagicState, 'grid' | 'obstructions'>;
  after: Pick<MagicState, 'grid' | 'obstructions'>;
  visual: MagicVisualBlock[];
}
function wire() {
  const reply = JSON.parse(dispatch(JSON.stringify({ type: 'snapshot' }))) as {
    ok: boolean;
    error?: string;
    state: {
      effect: EffectWire | null;
      spells: { id: string; rank: number; cost: number }[];
      active: { recolored?: boolean } | null;
      battleID: string;
      feedback: {
        id: number;
        kind: string;
        target?: string;
        text?: string;
        element?: string;
        rank?: number;
        technique?: string;
        elapsedMs: number;
        durationMs: number;
      }[];
    };
  };
  expect(reply.ok, reply.error).toBe(true);
  return reply.state;
}
function fixture(levels: Record<string, number> = {}) {
  const hero = createHero();
  hero.spells = Object.fromEntries(
    Object.entries(levels).map(([id, level]) => [id, { ...newKnownSpell(), level }]),
  );
  const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(842), {
    boardMagic: true,
    autoCast: true,
    autoCastPacingMs: 500,
    storyFlags: flags,
  });
  hero.hp = hero.maxHp = 10000;
  hero.manaCap = 100;
  for (const key of Object.keys(hero.mana)) hero.mana[key as keyof typeof hero.mana] = 100;
  battle.combat!.enemyHp = 10000;
  battle.combat!.gauge = -100000;
  battle.board.loadRows(Array.from({ length: 20 }, () => '..........'));
  battle.board.active = null;
  battle.board.grid[10]![1] = 'blue'; // Unaffected material must not vanish during an effect.
  battle.board.grid[17]![2] = 'red';
  attachCampaignBattle(battle, () => true);
  return { battle, hero };
}
function stone(battle: Battle, strength = 3) {
  battle.board.grid[17]![8] = 'stone';
  battle.board.obstructions['8,17'] = {
    id: 'review-stone',
    owner: 'slime',
    anchored: true,
    strength,
    step: 1,
    sequence: [
      { color: 'red', sides: ['left'] },
      { color: 'green', sides: ['top', 'right', 'bottom', 'left'] },
    ],
    contacts: [],
  };
}
function expose(battle: Battle, id: string, bottomRow = 17) {
  const preview = battle.magicCasting.preview(id, { bottomRow, direction: 1 });
  expect(preview.reason).toBeNull();
  const before = battle.board.magicState();
  battle.autoFrame = {
    preview,
    before,
    phase: 'effect',
    remainingMs: 400,
    durationMs: 900,
    index: 1,
    total: 1,
  };
  return { preview, before, effect: wire().effect! };
}
function lightState(state: MagicState) {
  return { grid: state.grid, obstructions: state.obstructions };
}
function actualLightState(state: Pick<MagicState, 'grid' | 'obstructions'>) {
  return { grid: state.grid, obstructions: state.obstructions };
}

describe('independent native visual boundary review', () => {
  it('keeps the actual zero-spell opening empty', () => {
    fixture();
    expect(wire().spells).toEqual([]);
    expect(wire().effect).toBeNull();
  });

  it.each(schools.flatMap((id) => [1, 2, 3, 4].map((rank) => ({ id, rank }))))(
    '$id rank $rank preserves actual cells and both resolution stages for the renderer',
    ({ id, rank }) => {
      const { battle } = fixture({ [id]: rank });
      if (id === 'thunder' || id === 'natureConvert') stone(battle);
      if (id === 'blizzard')
        battle.board.grid[17] = [
          'red',
          'red',
          'red',
          'red',
          null,
          'red',
          'red',
          'red',
          'red',
          'red',
        ];
      const { preview, before, effect } = expose(battle, id);
      const middle = preview.resolution.effectState ?? preview.resolution.state;
      expect(effect.character).toBe(false);
      expect(effect.element).toBe(BOARD_SPELLS[id]);
      expect(actualLightState(effect.before)).toEqual(lightState(before));
      expect(actualLightState(effect.effectState)).toEqual(lightState(middle));
      expect(actualLightState(effect.after)).toEqual(lightState(preview.resolution.state));
      expect(effect.visual).toEqual(preview.resolution.visual);
      expect(effect.visual.some((actor) => actor.from?.[0] === 1 && actor.from[1] === 10)).toBe(
        true,
      );
      const [top, bottom] = spanFor(
        { element: BOARD_SPELLS[id]!, rank, bottomRow: 17, direction: 1 },
        battle.board.height,
      );
      expect(effect.rows).toEqual(Array.from({ length: bottom - top + 1 }, (_, i) => top + i));
      if (id === 'quake' && rank === 4) expect(effect.rows).toHaveLength(battle.board.height);
      if (id === 'thunder' || id === 'natureConvert') {
        expect(effect.before.obstructions['8,17']?.step).toBe(1);
        expect(effect.before.obstructions['8,17']?.sequence[1]?.sides).toHaveLength(4);
        expect(effect.rows).toHaveLength(rank % 2 === 0 ? 2 : 1);
      }
      if (id === 'blizzard')
        expect(
          effect.visual.some((actor) => actor.from === null && actor.effectCell === 'neutral'),
        ).toBe(true);
    },
  );

  it.each([
    ['gale', 'fire', 'thunder'],
    ['thunder', 'gale', 'fire'],
    ['fire', 'thunder', 'gale'],
  ])('preserves independently learned and enhanced levels in order %j', (...order) => {
    const levels = { gale: 1, fire: 3, thunder: 2 };
    const { hero } = fixture(
      Object.fromEntries(order.map((id) => [id, levels[id as keyof typeof levels]])),
    );
    hero.spells.fire!.step.efficiency = 1;
    const spells = wire().spells;
    expect(spells).toHaveLength(3);
    for (const id of order) {
      const known = hero.spells[id]!;
      const element = BOARD_SPELLS[id]!;
      expect(spells.find((spell) => spell.id === id)).toMatchObject({
        rank: known.level,
        cost: castSpellFor(SPELLS[id]!, known).cost[element] ?? 0,
      });
    }
  });

  it.each([1, 2, 3, 4])(
    'keeps primary Arcane rank %i on the character, with no row target',
    (rank) => {
      const { battle } = fixture({ shadow: rank });
      const { effect, before } = expose(battle, 'shadow');
      expect(effect.character).toBe(true);
      expect(effect.element).toBe('arcane');
      expect(effect.rows).toEqual([]);
      expect(effect.visual).toEqual([]);
      expect(actualLightState(effect.after)).toEqual(lightState(before));
    },
  );

  it.each([
    ['wind', 'gale'],
    ['lightning', 'thunder'],
    ['nature', 'natureConvert'],
    ['earth', 'quake'],
  ])('shows the committed Arcane %s technique on its actual opponent', (element, base) => {
    const { battle, hero } = fixture({ [base]: 3, shadow: 3 });
    hero.arcane = { [element]: 3 };
    if (element === 'lightning') stone(battle);
    battle.paused = false;
    const technique = `arcane:${element}`;
    battle.castArcane(technique, { bottomRow: 17, direction: 1 });
    const snapshot = wire();
    expect(snapshot.effect).toBeNull();
    expect(snapshot.feedback).toContainEqual(
      expect.objectContaining({
        kind: 'opponentCast',
        target: 'enemy',
        element,
        rank: 3,
        technique,
      }),
    );
    if (element === 'lightning') expect(battle.board.obstructions['8,17']?.strength).toBe(1);
    else {
      const effects = battle.interference.effects.slime!;
      expect(
        element === 'wind' ? effects.wind : element === 'nature' ? effects.nature : effects.gravity,
      ).toBe(3);
    }
  });

  it('uses the authored encounter reaction line instead of dropping beat feedback', () => {
    const battle = new Battle(
      { kind: 'encounter', id: 'elder', strain: 0, demo: false, assisted: false },
      createHero(),
      createRng(73),
    );
    attachCampaignBattle(battle, () => true);
    battle.emit({ kind: 'beat', beat: 'hazard' });
    expect(wire().feedback).toContainEqual(
      expect.objectContaining({
        text: ENCOUNTER_DEFS.elder!.lines.hazard,
        durationMs: 1300,
      }),
    );
  });

  it('ages a reaction once, freezes it while paused, and does not replay expired events', () => {
    const { battle } = fixture();
    battle.emit({ kind: 'heroHit', amount: 4 });
    const first = wire();
    const reaction = first.feedback.find(
      (item) => item.kind === 'float' && item.target === 'hero',
    )!;
    expect(reaction).toMatchObject({ text: '4', elapsedMs: 0 });
    dispatch(JSON.stringify({ type: 'begin' }));
    const stepped = JSON.parse(dispatch(JSON.stringify({ type: 'step', ms: 100 })))
      .state as ReturnType<typeof wire>;
    expect(stepped.feedback.find((item) => item.id === reaction.id)?.elapsedMs).toBe(100);
    dispatch(JSON.stringify({ type: 'pause', paused: true, system: true }));
    const paused = JSON.parse(dispatch(JSON.stringify({ type: 'step', ms: 100 })))
      .state as ReturnType<typeof wire>;
    expect(paused.feedback.find((item) => item.id === reaction.id)?.elapsedMs).toBe(100);
    dispatch(JSON.stringify({ type: 'pause', paused: false, system: true }));
    for (let frame = 0; frame < 16; frame++) dispatch(JSON.stringify({ type: 'step', ms: 100 }));
    expect(wire().feedback.some((item) => item.id === reaction.id)).toBe(false);
    expect(wire().feedback.some((item) => item.id === reaction.id)).toBe(false);
    expect(wire().battleID).toBe(first.battleID);
  });

  it('retains the actual mentor-toss identity on the falling piece', () => {
    const { battle } = fixture();
    battle.board.spawn();
    battle.board.active = { ...battle.board.active!, recolored: true };
    expect(wire().active?.recolored).toBe(true);
  });

  it('preserves the authored order and two different stages of equipped Weaving', () => {
    const { battle, hero } = fixture({ fire: 4, quake: 4 });
    battle.board.loadRows([
      '..........',
      '..b.......',
      '..........',
      '..........',
      '..r.......',
      '..........',
    ]);
    const recipe: WeaveRecipe = {
      id: 'review',
      name: 'Review Emberfall',
      level: 1,
      stages: [
        { spell: 'fire', rank: 1 },
        { spell: 'quake', rank: 1 },
      ],
    };
    expect(saveWeave(hero, flags, recipe)).toBe(true);
    const targets = [
      { bottomRow: 18, direction: 1 },
      { bottomRow: 15, direction: 1 },
    ] as const;
    const preview = battle.previewWeaving(targets);
    expect(preview.reason).toBeNull();
    battle.paused = false;
    battle.castWeaving(preview);
    const first = wire().effect!;
    expect(first).toMatchObject({ source: 'weave', index: 1, total: 2, element: 'fire' });
    battle.update(500);
    battle.update(900);
    battle.update(500);
    const second = wire().effect!;
    expect(second).toMatchObject({ source: 'weave', index: 2, total: 2, element: 'earth' });
    expect(actualLightState(second.before)).toEqual(lightState(preview.stages[1]!.before));
    expect(actualLightState(second.after)).toEqual(
      lightState(preview.stages[1]!.preview.resolution.state),
    );
    expect(first.visual).not.toEqual(second.visual);
  });
  it('updates stage weaknesses and resistances while Fault Line exposes the opponent', () => {
    const { battle } = fixture();
    battle.combat!.exposed = 3;
    const reply = JSON.parse(dispatch(JSON.stringify({ type: 'snapshot' })));
    expect(reply.state.stage.weakness).toEqual(ELEMENTS);
    expect(reply.state.stage.resistance).toEqual([]);
  });
});
