import { describe, expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import { ENCOUNTER_DEFS } from '../src/data/encounters';
import { MENTORS } from '../src/data/mentors';
import { NPCS } from '../src/data/npcs';
import type { EnemyMove } from '../src/data/types';
import { createRng } from '../src/core/rng';
import { createHero } from '../src/game/hero';
import { encounterIntent, enemyMovePurpose } from '../src/game/encounterIntent';

function fixture(enemyId = 'shadeImp') {
  const hero = createHero();
  hero.hp = hero.maxHp = 10000;
  const battle = new Battle({ kind: 'combat', enemyId }, hero, createRng(19), { boardMagic: true });
  return { battle, combat: battle.combat!, hero };
}
function act(combat: NonNullable<Battle['combat']>, move: EnemyMove) {
  combat.nextMove = move;
  combat.update(combat.actMs);
}

describe('authored purpose for every kind of encounter', () => {
  it('covers every placed NPC task without rewriting its board, queue or rewards', () => {
    const before = structuredClone(NPCS);
    let checked = 0;
    for (const npc of Object.values(NPCS)) {
      if (!npc.challenge) continue;
      const purpose = encounterIntent(npc.challenge, npc.id);
      for (const value of Object.values(purpose)) {
        expect(value, npc.id).toBeTruthy();
        expect(value, npc.id).not.toMatch(/undefined|\{target\}/);
      }
      if (npc.challenge.kind !== 'combat') expect(purpose.role, npc.id).not.toBe('battle');
      checked++;
    }
    expect(checked).toBeGreaterThan(25);
    expect(NPCS).toEqual(before);
  });
  it('separates environmental pressure, cooperation and commercial competition', () => {
    const task = (id: string) =>
      encounterIntent({ kind: 'encounter', id, strain: 0, assisted: false, demo: false });
    expect(task('elder').role).toBe('cooperate');
    expect(task('elder').pressure).toContain('Rowan is helping');
    expect(task('kid').pressure).toContain('not placing hostile');
    expect(task('forager').goal).toContain('rot');
    expect(task('forager').goal).not.toContain('Plant');
    expect(task('stallKeeper').role).toBe('contest');
    expect(task('stallKeeper').pressure).toContain('asking price');
  });
  it('derives strained lamp count and color requirement from the actual rules', () => {
    const def = ENCOUNTER_DEFS.guard!;
    if (def.spec.verb !== 'charge') throw new Error('Expected CHARGE');
    const purpose = encounterIntent({
      kind: 'encounter',
      id: 'guard',
      strain: 1,
      assisted: false,
      demo: false,
    });
    expect(purpose.goal).toContain(
      String(def.spec.params.lamps.length + def.spec.params.strainLamps),
    );
    expect(purpose.goal).toContain(`at least ${def.spec.params.purity}`);
    expect(purpose.counterplay).not.toContain('four');
    expect(def.objective).not.toContain('four');
  });
  it.each(['archiveDrain', 'rootTram', 'ketterRescue', 'fennickRite'])(
    'keeps %s a task rather than an enemy routine',
    (id) => {
      const npc = NPCS[id]!;
      expect(encounterIntent(npc.challenge!, id).role).toBe('cooperate');
      const battle = new Battle(npc.challenge!, createHero(), createRng(8));
      expect(battle.combat).toBeNull();
      expect(battle.board.obstructions).toEqual({});
    },
  );
  it('keeps Vesper’s imposed puzzle distinct from a friendly repair', () => {
    const npc = NPCS.vesperRoad!;
    expect(encounterIntent(npc.challenge!, npc.id).role).toBe('trial');
    expect(encounterIntent(NPCS.sage!.challenge!, 'sage').goal).toContain('roof lattice');
    expect(encounterIntent(NPCS.courier!.challenge!, 'courier').goal).toContain('letters');
  });
  it('identifies the mentor as a teacher and the trial foe as pressure', () => {
    const mentor = MENTORS.dorn!;
    const purpose = encounterIntent({
      kind: 'lesson',
      mentorId: mentor.id,
      spellId: 'quake',
      enemyId: mentor.trialFoe,
      difficulty: 1,
    });
    expect(purpose.role).toBe('practice');
    expect(purpose.goal).toContain('Gravity');
    expect(purpose.blocks).toContain('not a random enemy attack');
  });
});

describe('every enemy material batch has consistent owned counterplay', () => {
  it('applies Nature and Gravity to curse rubble and consumes each whole row batch once', () => {
    const { battle, combat, hero } = fixture();
    battle.interference.cast(combat.enemy.id, 'nature', 1, 19, 1, combat.actMs);
    battle.interference.cast(combat.enemy.id, 'earth', 2, 19, 1, combat.actMs);
    const mana = { ...hero.mana };
    act(combat, { kind: 'curse', name: 'Rubble', rows: 1 });
    expect(battle.board.grid[19]!.filter((cell) => cell === 'neutral')).toHaveLength(1);
    expect(Object.values(battle.board.obstructions)).toHaveLength(8);
    expect(
      Object.values(battle.board.obstructions).every(
        (o) => o.owner === combat.enemy.id && o.strength === 1 && !o.anchored,
      ),
    ).toBe(true);
    expect(battle.interference.placements[combat.enemy.id]).toBe(1);
    expect(battle.interference.effect(combat.enemy.id).nature).toBe(0);
    expect(battle.interference.effect(combat.enemy.id).gravity).toBe(1);
    expect(hero.mana).toEqual(mana);
    expect(battle.lines).toBe(0);
    act(combat, { kind: 'curse', name: 'Rubble', rows: 1 });
    expect(battle.interference.placements[combat.enemy.id]).toBe(2);
    expect(battle.interference.effect(combat.enemy.id).gravity).toBe(0);
    expect(Object.values(battle.board.obstructions).every((o) => o.anchored)).toBe(true);
  });
  it('counts a multi-row curse as one arrival, not one buff turn per cell', () => {
    const { battle, combat } = fixture();
    battle.interference.cast(combat.enemy.id, 'earth', 3, 19, 1, combat.actMs);
    act(combat, { kind: 'curse', name: 'Rubble', rows: 2 });
    expect(battle.interference.placements[combat.enemy.id]).toBe(1);
    expect(battle.interference.effect(combat.enemy.id).gravity).toBe(2);
    expect(Object.values(battle.board.obstructions).every((o) => o.strength === 1)).toBe(true);
  });
  it('applies owner Nature to petrification instead of creating uncounterable raw stone', () => {
    const { battle, combat } = fixture();
    battle.board.loadRows(['r.........']);
    battle.interference.cast(combat.enemy.id, 'nature', 1, 19, 1, combat.actMs);
    act(combat, { kind: 'petrify', name: 'Gloom', cells: 1, targets: [[0, 19]] });
    expect(battle.board.grid[19]![0]).toBe('neutral');
    expect(battle.board.obstructions['0,19']).toBeUndefined();
    expect(battle.interference.placements[combat.enemy.id]).toBe(1);
    expect(battle.interference.effect(combat.enemy.id).nature).toBe(0);
  });
  it('does not introduce ownership into environmental, merchant or task material', () => {
    const { battle } = fixture();
    for (const source of ['send', 'rising', 'tide', 'tug'] as const) battle.pushRows({ source }, 1);
    expect(battle.board.obstructions).toEqual({});
    expect(battle.interference.placements).toEqual({});
  });
  it('supports Lightning and Nature against actual petrified enemy blocks', () => {
    const { battle, combat, hero } = fixture();
    hero.spells.thunder = {
      level: 1,
      step: { power: 0, efficiency: 0, effect: 0 },
      kept: { power: 0, efficiency: 0, effect: 0 },
    };
    hero.mana.lightning = 20;
    battle.board.loadRows(['r.........']);
    act(combat, { kind: 'petrify', name: 'Gloom', cells: 1, targets: [[0, 19]] });
    expect(battle.board.obstructions['0,19']?.owner).toBe(combat.enemy.id);
    const preview = battle.magicCasting.preview('thunder', { bottomRow: 19, direction: 1 });
    expect(preview.reason).toBeNull();
    battle.magicCasting.commit(preview);
    expect(battle.board.grid[19]![0]).toBeNull();
  });
  it('lets Wind slide anchored enemy blocks while Gravity still respects the anchor', () => {
    const { battle, hero } = fixture();
    hero.spells.gale = hero.spells.quake = {
      level: 1,
      step: { power: 0, efficiency: 0, effect: 0 },
      kept: { power: 0, efficiency: 0, effect: 0 },
    };
    hero.mana.wind = hero.mana.earth = 20;
    battle.placeObstructions('foe', [{ x: 0, y: 15, strength: 3 }]);
    const wind = battle.magicCasting.preview('gale', { bottomRow: 15, direction: 1 });
    battle.magicCasting.commit(wind);
    expect(battle.board.obstructions['1,15']?.anchored).toBe(true);
    expect(battle.board.obstructions['1,15']?.strength).toBe(3);
    expect(battle.board.obstructions['0,15']).toBeUndefined();
    const gravity = battle.magicCasting.preview('quake', { bottomRow: 15, direction: 1 });
    expect(gravity.resolution.state.obstructions['1,15']?.anchored).toBe(true);
  });
});

describe('declared and delayed enemy material remains predictable', () => {
  it('freezes an empty Petrify target rather than selecting new crystals at execution', () => {
    const { battle, combat } = fixture('moonWyrm');
    battle.board.loadRows([]);
    const internal = combat as unknown as { freezeMaterialTarget: (move: EnemyMove) => EnemyMove };
    const declared = internal.freezeMaterialTarget({ kind: 'petrify', name: 'Starfall', cells: 6 });
    expect(declared.kind === 'petrify' && declared.targets).toEqual([]);
    battle.board.grid[19]![0] = 'red';
    act(combat, declared);
    expect(battle.board.grid[19]![0]).toBe('red');
    expect(battle.events.some((e) => e.event.kind === 'fizzle')).toBe(true);
  });
  it('does not reserve Ice or spend owner durations on an already empty frozen Petrify', () => {
    const { battle, combat } = fixture();
    battle.interference.cast(combat.enemy.id, 'water', 2, 19, 1, combat.actMs);
    battle.interference.cast(combat.enemy.id, 'earth', 2, 19, 1, combat.actMs);
    act(combat, { kind: 'petrify', name: 'No remaining target', cells: 1, targets: [] });
    expect(combat.delayedArrivals).toHaveLength(0);
    expect(battle.interference.placements[combat.enemy.id] ?? 0).toBe(0);
    expect(battle.interference.effect(combat.enemy.id).gravity).toBe(2);
    expect(battle.interference.effect(combat.enemy.id).delayMs).toBe(combat.actMs * 2);
    expect(
      battle.events.some(({ event }) => event.kind === 'fizzle' && event.reason === 'empty'),
    ).toBe(true);
  });

  it('Ice reserves one batch while later material uses the normal clock, with accurate warnings', () => {
    const { battle, combat } = fixture();
    battle.interference.cast(combat.enemy.id, 'water', 4, 19, 1, combat.actMs);
    act(combat, { kind: 'curse', name: 'First rubble', rows: 1 });
    expect(combat.delayedArrivals).toHaveLength(1);
    expect(battle.board.grid.flat().some((cell) => cell !== null)).toBe(false);
    battle.board.grid[18]![0] = 'red';
    act(combat, { kind: 'petrify', name: 'Later gloom', cells: 1, targets: [[0, 18]] });
    expect(battle.board.obstructions['0,18']?.owner).toBe(combat.enemy.id);
    expect(battle.interference.placements[combat.enemy.id]).toBe(1);
    expect(combat.delayedArrivals).toHaveLength(1);
    expect(
      battle
        .telegraphs()
        .some(
          (mark) =>
            mark.kind === 'rows' &&
            mark.owner === combat.enemy.id &&
            mark.leadMs === combat.actMs * 3,
        ),
    ).toBe(true);
    combat.nextMove = { kind: 'attack', name: 'Wait', power: 0 };
    combat.update(combat.actMs * 3);
    expect(combat.delayedArrivals).toHaveLength(0);
    expect(battle.interference.placements[combat.enemy.id]).toBe(2);
  });
  it('fizzles a countered frozen obstruction instead of silently moving it elsewhere', () => {
    const { battle, combat } = fixture('slime');
    combat.replanForBoard();
    const plan = combat.nextMove;
    if (plan.kind !== 'obstruct') throw new Error('Expected a useful slime target');
    const at = plan.cells[0]!;
    battle.board.grid[at.y]![at.x] = 'red';
    const count = Object.keys(battle.board.obstructions).length;
    act(combat, plan);
    expect(Object.keys(battle.board.obstructions)).toHaveLength(count);
    expect(battle.board.grid[at.y]![at.x]).toBe('red');
    expect(battle.events.some((e) => e.event.kind === 'fizzle')).toBe(true);
  });
  it('describes each authored move using the actual operation, never a generic block claim', () => {
    expect(enemyMovePurpose({ kind: 'attack', name: 'Hit', power: 1 }).counterplay).toContain(
      'does not place blocks',
    );
    expect(enemyMovePurpose({ kind: 'seal', name: 'Stake', pieces: 3 }).counterplay).toContain(
      'not a removable stone',
    );
  });
});
