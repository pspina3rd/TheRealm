import { describe, expect, it } from 'vitest';
import type { CombatChallenge } from '../src/battle/combat';
import { LINE_DAMAGE, WEAKNESS_BONUS, rollSpoils } from '../src/battle/combat';
import { createRng } from '../src/core/rng';
import { ENEMIES } from '../src/data/enemies';
import type { EnemyMove } from '../src/data/types';
import { addItem, totalAttack } from '../src/game/hero';
import { makeBattle, setUpVerticalIClear } from './helpers';

function fight(enemyId = 'slime') {
  const battle = makeBattle({ kind: 'combat', enemyId });
  const combat = battle.combat;
  if (!combat) throw new Error('expected combat');
  return { battle, combat, hero: battle.hero };
}

/** Forces the enemy to use `move` on its next action. */
function nextMove(combat: CombatChallenge, move: EnemyMove): void {
  (combat as unknown as { enemy: { moves: EnemyMove[] } }).enemy = {
    ...combat.enemy,
    moves: [move],
  };
  combat.countdown = 1;
}

describe('CombatChallenge', () => {
  it('rejects unknown enemies', () => {
    expect(() => makeBattle({ kind: 'combat', enemyId: 'nope' })).toThrow('Unknown enemy');
  });

  it('uses the enemy level for gravity', () => {
    expect(fight('golem').battle.level).toBe(ENEMIES.golem!.level);
  });

  it('strikes the enemy for line damage plus attack', () => {
    const { battle, combat, hero } = fight('golem');
    setUpVerticalIClear(battle.board, 2);
    battle.input('hardDrop');
    expect(combat.enemyHp).toBe(ENEMIES.golem!.hp - (LINE_DAMAGE[2]! + totalAttack(hero)));
  });

  it('adds weakness damage for matching crystals', () => {
    const { battle, combat, hero } = fight('golem'); // weak to blue
    setUpVerticalIClear(battle.board, 1, 'blue');
    battle.input('hardDrop');
    const expected = LINE_DAMAGE[1]! + totalAttack(hero) + 9 * WEAKNESS_BONUS;
    expect(combat.enemyHp).toBe(ENEMIES.golem!.hp - expected);
  });

  it('restores 1 MP per line cleared', () => {
    const { battle, hero } = fight('golem');
    hero.mp = 0;
    setUpVerticalIClear(battle.board, 3);
    battle.input('hardDrop');
    expect(hero.mp).toBe(3);
  });

  it('wins when the enemy reaches 0 HP', () => {
    const { battle, combat } = fight();
    combat.enemyHp = 1;
    setUpVerticalIClear(battle.board, 1);
    battle.input('hardDrop');
    expect(battle.status).toBe('won');
  });

  it('enemy attacks after its countdown, reduced by defence', () => {
    const { battle, combat, hero } = fight('wolf');
    nextMove(combat, { kind: 'attack', name: 'Bite', power: 2 });
    battle.input('hardDrop');
    expect(hero.hp).toBe(hero.maxHp - (2 + ENEMIES.wolf!.atk - hero.def));
    expect(combat.countdown).toBe(ENEMIES.wolf!.actEvery);
  });

  it('enemy attacks always deal at least 1 damage', () => {
    const { battle, combat, hero } = fight();
    hero.def = 999;
    nextMove(combat, { kind: 'attack', name: 'Tap', power: 0 });
    battle.input('hardDrop');
    expect(hero.hp).toBe(hero.maxHp - 1);
  });

  it('curse magic raises stone rows', () => {
    const { battle, combat } = fight();
    nextMove(combat, { kind: 'curse', name: 'Hex', rows: 2 });
    battle.input('hardDrop');
    const stones = battle.board.grid.flat().filter((c) => c === 'stone').length;
    expect(stones).toBe(18);
  });

  it('haste magic doubles gravity speed for some pieces', () => {
    const { battle, combat } = fight();
    const normal = battle.gravityMs;
    nextMove(combat, { kind: 'haste', name: 'Howl', pieces: 2 });
    battle.input('hardDrop');
    expect(battle.hastePieces).toBe(2);
    expect(battle.gravityMs).toBe(normal / 2);
    battle.input('hardDrop');
    battle.input('hardDrop');
    expect(battle.hastePieces).toBe(0);
  });

  it('heal magic restores enemy HP up to its maximum', () => {
    const { battle, combat } = fight('wisp');
    combat.enemyHp = combat.enemy.hp - 3;
    nextMove(combat, { kind: 'heal', name: 'Glimmer', amount: 10 });
    battle.input('hardDrop');
    expect(combat.enemyHp).toBe(combat.enemy.hp);
  });

  it('drain magic burns hero MP', () => {
    const { battle, combat, hero } = fight('bat');
    hero.mp = 2;
    nextMove(combat, { kind: 'drain', name: 'Leech', mp: 3 });
    battle.input('hardDrop');
    expect(hero.mp).toBe(0);
  });

  it('overflowing the board hurts the hero and resets it', () => {
    const { battle, hero } = fight();
    for (let y = 2; y < battle.board.height; y++) {
      battle.board.grid[y] = Array(battle.board.width).fill('stone');
      battle.board.grid[y]![0] = null;
    }
    battle.input('hardDrop');
    battle.input('hardDrop');
    expect(hero.hp).toBeLessThan(hero.maxHp);
    expect(battle.board.toppedOut).toBe(false);
    expect(battle.status).toBe('ongoing');
  });

  it('loses when hero HP reaches 0', () => {
    const { battle, combat, hero } = fight();
    hero.hp = 1;
    nextMove(combat, { kind: 'attack', name: 'Bonk', power: 50 });
    battle.input('hardDrop');
    expect(battle.status).toBe('lost');
  });

  it('a Phoenix Feather revives the hero once', () => {
    const { battle, combat, hero } = fight();
    addItem(hero, 'phoenixFeather');
    hero.hp = 1;
    nextMove(combat, { kind: 'attack', name: 'Bonk', power: 50 });
    battle.input('hardDrop');
    expect(hero.hp).toBe(Math.ceil(hero.maxHp / 2));
    expect(hero.items.phoenixFeather).toBeUndefined();
    expect(battle.status).toBe('ongoing');
  });

  describe('spells', () => {
    it('damage spells scale with level and cost MP', () => {
      const { combat, hero } = fight('golem');
      combat.castSpell('fire');
      expect(combat.enemyHp).toBe(ENEMIES.golem!.hp - (12 + hero.level * 2));
      expect(hero.mp).toBe(hero.maxMp - 3);
    });

    it('Cure heals the hero', () => {
      const { combat, hero } = fight();
      hero.hp = 5;
      combat.castSpell('cure');
      expect(hero.hp).toBe(23);
    });

    it('Quake removes bottom rows', () => {
      const { battle, combat, hero } = fight();
      hero.spells.push('quake');
      battle.board.addGarbage(3);
      combat.castSpell('quake');
      expect(battle.board.grid.flat().filter((c) => c === 'stone')).toHaveLength(9);
    });

    it('Blizzard damages and delays the enemy', () => {
      const { combat, hero } = fight('golem');
      hero.spells.push('blizzard');
      const before = combat.countdown;
      combat.castSpell('blizzard');
      // +3 from the freeze, -1 for the action spent casting.
      expect(combat.countdown).toBe(before + 3 - 1);
      expect(combat.enemyHp).toBeLessThan(ENEMIES.golem!.hp);
    });

    it('casting counts as an action and can trigger the enemy', () => {
      const { combat, hero } = fight();
      nextMove(combat, { kind: 'attack', name: 'Bonk', power: 1 });
      combat.castSpell('fire');
      expect(hero.hp).toBeLessThan(hero.maxHp);
    });

    it('explains why a spell cannot be cast', () => {
      const { combat, hero } = fight();
      expect(combat.cannotCastReason('meteor')).toBe("You don't know that spell.");
      expect(combat.cannotCastReason('cure')).toBe('HP is already full.');
      hero.mp = 0;
      expect(combat.cannotCastReason('fire')).toBe('Not enough MP!');
      expect(() => combat.castSpell('fire')).toThrow('Not enough MP!');
    });
  });

  it('uses items mid-fight as an action', () => {
    const { combat, hero } = fight();
    hero.hp = 10;
    const before = combat.countdown;
    combat.useItem('herb');
    expect(hero.hp).toBe(30);
    expect(combat.countdown).toBe(before - 1);
  });

  it('describes progress toward defeating the enemy', () => {
    const { combat } = fight();
    combat.enemyHp = combat.enemy.hp / 2;
    expect(combat.objective().progress).toBeCloseTo(0.5);
    expect(combat.objective().label).toContain('Green Slime');
  });

  it('rolls spoils with drop chances', () => {
    const wyrm = ENEMIES.moonWyrm!;
    expect(rollSpoils(wyrm, createRng(1)).drops).toEqual(['phoenixFeather']);
    const spoils = rollSpoils(ENEMIES.bat!, createRng(1));
    expect(spoils).toEqual({ xp: ENEMIES.bat!.xp, gil: ENEMIES.bat!.gil, drops: [] });
  });
});
