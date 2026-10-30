import { describe, expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import { autoSpellOrder, autoTarget } from '../src/battle/autoCasting';
import { createRng } from '../src/core/rng';
import { createHero } from '../src/game/hero';
import { castSpellFor, newKnownSpell } from '../src/game/spells';
import { SPELLS } from '../src/data/spells';
function fixture(spells: Record<string, number> = { fire: 1 }, pacing = 0) {
  const hero = createHero();
  hero.spells = Object.fromEntries(
    Object.entries(spells).map(([id, level]) => [id, { ...newKnownSpell(), level }]),
  );
  const battle = new Battle({ kind: 'combat', enemyId: 'slime' }, hero, createRng(42), {
    boardMagic: true,
    autoCast: true,
    autoCastPacingMs: pacing,
  });
  hero.hp = hero.maxHp = 10000;
  hero.manaCap = 100;
  for (const e of Object.keys(hero.mana)) hero.mana[e as keyof typeof hero.mana] = 100;
  battle.combat!.enemyHp = 10000;
  battle.combat!.gauge = -100000;
  return { battle, hero };
}
function prepare(battle: Battle, lines: number, target = '..rr......') {
  battle.board.loadRows(
    Array.from({ length: 18 }, (_, i) => (i === 2 || i === 7 || i === 12 ? target : '..........'))
      .concat(Array.from({ length: lines }, () => 'rrrr.rrrrr'))
      .slice(-20),
  );
  battle.board.replaceActive('I', {
    x: 4,
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
  });
}
function price(id: string, level = 1) {
  return castSpellFor(SPELLS[id]!, { ...newKnownSpell(), level }).cost;
}

describe('line-driven standard autocasting', () => {
  it('does not cast for movement, time, or a lock that clears no line', () => {
    const { battle, hero } = fixture();
    battle.board.loadRows(['..rr......']);
    const mana = hero.mana.fire;
    battle.input('left');
    battle.update(100);
    battle.input('hardDrop');
    expect(battle.autoCasts).toEqual([]);
    expect(hero.mana.fire).toBe(mana);
  });
  it('casts once for one cleared line and three times for a triple', () => {
    for (const lines of [1, 3]) {
      const { battle } = fixture();
      prepare(battle, lines);
      battle.input('hardDrop');
      expect(battle.autoCasts).toHaveLength(lines);
      expect(battle.autoCasts.every((c) => c.id === 'fire')).toBe(true);
    }
  });
  it('uses affinity order, skips an unaffordable spell, and rechecks after each cast', () => {
    const { battle, hero } = fixture({ fire: 1, thunder: 2 });
    hero.mana.lightning = price('thunder', 2).lightning!;
    prepare(battle, 3);
    battle.interference.place('slime', [{ x: 8, y: 8, strength: 3 }]);
    expect(battle.autoOrder[0]).toBe('thunder');
    battle.input('hardDrop');
    expect(battle.autoCasts.map((c) => c.id)).toEqual(['thunder', 'fire', 'fire']);
    expect(hero.mana.lightning).toBe(0);
  });
  it('uses learned rank and its actual enhanced mana cost without downgrading', () => {
    const { battle, hero } = fixture({ natureConvert: 4 });
    prepare(battle, 1);
    battle.interference.place('slime', [{ x: 8, y: 8, strength: 3 }]);
    hero.spells.natureConvert!.step.efficiency = 1;
    const cost = castSpellFor(SPELLS.natureConvert!, hero.spells.natureConvert!).cost.nature!;
    hero.mana.nature = cost * 2 + 1;
    battle.input('hardDrop');
    expect(battle.autoCasts[0]?.rank).toBe(4);
    expect(hero.mana.nature).toBe(cost + 1);
    // Another earned line permits another cast using the retained mana.
    prepare(battle, 1);
    battle.interference.place('slime', [{ x: 8, y: 8, strength: 3 }]);
    battle.input('hardDrop');
    expect(hero.mana.nature).toBe(1);
    expect(battle.autoCastCount).toBe(2);
  });
  it('keeps mana when no useful target exists', () => {
    const { battle, hero } = fixture({ natureConvert: 1 });
    prepare(battle, 1);
    battle.input('hardDrop');
    expect(battle.autoCasts).toEqual([]);
    expect(hero.mana.nature).toBe(100);
  });
  it('does not gain recursive cast opportunities from automatic spell clears', () => {
    const { battle } = fixture({ blizzard: 1 });
    prepare(battle, 1);
    battle.board.grid[8] = [
      'blue',
      'blue',
      'blue',
      'blue',
      null,
      'blue',
      'blue',
      'blue',
      'blue',
      'blue',
    ];
    battle.input('hardDrop');
    expect(battle.lines).toBeGreaterThanOrEqual(2);
    expect(battle.autoCasts).toHaveLength(1);
  });
  it('never automatically casts an Arcane combination or spends its Arcane mana', () => {
    const { battle, hero } = fixture({ natureConvert: 2, shadow: 2 });
    hero.arcane = { nature: 1 };
    prepare(battle, 1);
    battle.input('hardDrop');
    expect(battle.interference.effect('slime').nature).toBe(0);
    expect(hero.mana.arcane).toBe(100);
    expect(battle.autoCasts.some((c) => c.id.startsWith('arcane:'))).toBe(false);
  });
  it('stops if the earned clear already wins the battle', () => {
    const { battle } = fixture();
    prepare(battle, 1);
    battle.combat!.enemyHp = 1;
    battle.input('hardDrop');
    expect(battle.status).toBe('won');
    expect(battle.autoCasts).toEqual([]);
  });
  it('rejects manual standard casts in automatic mode without spending mana', () => {
    const { battle, hero } = fixture();
    prepare(battle, 1);
    expect(() => battle.combat!.castSpell('fire', { bottomRow: 19, direction: 1 })).toThrow(
      'automatically',
    );
    expect(hero.mana.fire).toBe(100);
  });
  it('selects targets deterministically without mutating the board or mana', () => {
    const { battle, hero } = fixture();
    prepare(battle, 1);
    const before = JSON.stringify([battle.board.magicState(), hero.mana]);
    const first = autoTarget(battle.magicCasting, 'fire');
    expect(first).not.toBeNull();
    expect(autoTarget(battle.magicCasting, 'fire')).toEqual(first);
    expect(JSON.stringify([battle.board.magicState(), hero.mana])).toBe(before);
  });
  it('uses title affinity for ties, with stable ordering afterwards', () => {
    const { hero } = fixture({ fire: 1, thunder: 1, natureConvert: 1 });
    hero.titleElement = 'nature';
    expect(autoSpellOrder(hero)).toEqual(['natureConvert', 'fire', 'thunder']);
  });
});

describe('paced automatic cast presentation', () => {
  it('shows the target and effect before paying or changing cells, then holds the result', () => {
    const { battle, hero } = fixture({ fire: 1 }, 500);
    prepare(battle, 1);
    battle.input('hardDrop');
    expect(battle.autoFrame?.phase).toBe('target');
    const before = JSON.stringify(battle.board.magicState()),
      mana = hero.mana.fire,
      gauge = battle.combat!.gauge,
      x = battle.board.active!.x;
    battle.input('left');
    battle.update(499);
    expect(battle.board.active!.x).toBe(x);
    expect(battle.combat!.gauge).toBe(gauge);
    expect(hero.mana.fire).toBe(mana);
    expect(JSON.stringify(battle.board.magicState())).toBe(before);
    battle.update(1);
    expect(battle.autoFrame?.phase).toBe('effect');
    battle.update(899);
    expect(hero.mana.fire).toBe(mana);
    battle.update(1);
    expect(battle.autoFrame?.phase).toBe('result');
    expect(battle.autoCastCount).toBe(1);
    expect(hero.mana.fire).toBeLessThan(mana);
    expect(JSON.stringify(battle.board.magicState())).not.toBe(before);
    battle.update(500);
    expect(battle.autoCastingBusy).toBe(false);
    battle.input('left');
    expect(battle.board.active!.x).toBe(x - 1);
  });
  it('finishes each result before selecting the next cast and supports pausing', () => {
    const { battle, hero } = fixture({ fire: 1 }, 500);
    prepare(battle, 3);
    battle.input('hardDrop');
    battle.paused = true;
    battle.update(10000);
    expect(battle.autoFrame?.phase).toBe('target');
    expect(battle.autoCastCount).toBe(0);
    battle.paused = false;
    battle.update(500);
    battle.update(900);
    expect(battle.autoFrame?.phase).toBe('result');
    expect(battle.autoCastCount).toBe(1);
    const mana = hero.mana.fire;
    battle.update(499);
    expect(battle.autoCastCount).toBe(1);
    battle.update(1);
    expect(battle.autoFrame?.phase).toBe('target');
    expect(battle.autoFrame?.index).toBe(2);
    expect(hero.mana.fire).toBe(mana);
  });
});
