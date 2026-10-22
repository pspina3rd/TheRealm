import { describe, expect, it } from 'vitest';
import type { CombatChallenge } from '../src/battle/combat';
import { LINE_DAMAGE, MAX_WARD, describeAffinities, rollSpoils } from '../src/battle/combat';
import { TAILWIND_SLOWDOWN } from '../src/battle/battle';
import { WEAK_CRYSTAL_BONUS } from '../src/battle/elemental';
import { emptyCounts } from '../src/core/elements';
import { gravityInterval } from '../src/core/scoring';
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
    expect(fight('brute').battle.level).toBe(ENEMIES.brute!.level);
  });

  it('strikes the enemy for line damage plus attack', () => {
    const { battle, combat, hero } = fight('brute');
    setUpVerticalIClear(battle.board, 2);
    battle.input('hardDrop');
    expect(combat.enemyHp).toBe(ENEMIES.brute!.hp - (LINE_DAMAGE[2]! + totalAttack(hero)));
  });

  it('adds strike damage for crystals the enemy is weak to', () => {
    const { battle, combat, hero } = fight('brute'); // weak to water (blue)
    setUpVerticalIClear(battle.board, 1, 'blue');
    battle.input('hardDrop');
    const expected = LINE_DAMAGE[1]! + totalAttack(hero) + 9 * WEAK_CRYSTAL_BONUS;
    expect(combat.enemyHp).toBe(ENEMIES.brute!.hp - expected);
  });

  it('reduces strike damage for crystals the enemy resists', () => {
    const { battle, combat, hero } = fight('brute'); // resists fire (red)
    setUpVerticalIClear(battle.board, 1, 'red');
    battle.input('hardDrop');
    const strike = LINE_DAMAGE[1]! + totalAttack(hero) - 9;
    const burn = Math.round(9 * 0.5);
    expect(combat.enemyHp).toBe(ENEMIES.brute!.hp - strike - burn);
  });

  it('wins when the enemy reaches 0 HP', () => {
    const { battle, combat } = fight();
    combat.enemyHp = 1;
    setUpVerticalIClear(battle.board, 1);
    battle.input('hardDrop');
    expect(battle.status).toBe('won');
  });

  it('enemy attacks after its countdown, reduced by defence', () => {
    const { battle, combat, hero } = fight('shroom');
    nextMove(combat, { kind: 'attack', name: 'Bite', power: 2 });
    battle.input('hardDrop');
    expect(hero.hp).toBe(hero.maxHp - (2 + ENEMIES.shroom!.atk - hero.def));
    expect(combat.countdown).toBe(ENEMIES.shroom!.actEvery);
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
    const { battle, combat } = fight('shadeImp');
    combat.enemyHp = combat.enemy.hp - 3;
    nextMove(combat, { kind: 'heal', name: 'Glimmer', amount: 10 });
    battle.input('hardDrop');
    expect(combat.enemyHp).toBe(combat.enemy.hp);
  });

  it('drain magic burns mana from the fullest pool', () => {
    const { battle, combat, hero } = fight('moonImp');
    hero.mana = { ...emptyCounts(0), water: 2, fire: 7 };
    nextMove(combat, { kind: 'drain', name: 'Leech', mana: 3 });
    battle.input('hardDrop');
    expect(hero.mana.fire).toBe(4);
    expect(hero.mana.water).toBe(2);
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
    it('spend elemental mana and scale with level', () => {
      const { combat, hero } = fight('goblin'); // neutral to fire
      combat.castSpell('fire');
      expect(combat.enemyHp).toBe(ENEMIES.goblin!.hp - (14 + hero.level * 2));
      expect(hero.mana.fire).toBe(hero.manaCap - 6);
      expect(hero.mana.water).toBe(hero.manaCap);
    });

    it('hit harder against weaknesses and softer against resistances', () => {
      const weak = fight('slime'); // weak to fire
      weak.combat.enemyHp = 999;
      weak.combat.castSpell('fire');
      expect(999 - weak.combat.enemyHp).toBe(Math.round(16 * 1.5));
      const resist = fight('brute'); // resists fire
      resist.combat.castSpell('fire');
      expect(ENEMIES.brute!.hp - resist.combat.enemyHp).toBe(Math.round(16 * 0.5));
    });

    it('Cure spends nature mana and heals', () => {
      const { combat, hero } = fight();
      hero.hp = 5;
      combat.castSpell('cure');
      expect(hero.hp).toBe(25);
      expect(hero.mana.nature).toBe(hero.manaCap - 6);
    });

    it('Quake removes bottom rows', () => {
      const { battle, combat, hero } = fight();
      hero.spells.push('quake');
      battle.board.addGarbage(3);
      combat.castSpell('quake');
      expect(battle.board.grid.flat().filter((c) => c === 'stone')).toHaveLength(9);
    });

    it('Blizzard damages and delays the enemy', () => {
      const { combat, hero } = fight('brute');
      hero.spells.push('blizzard');
      const before = combat.countdown;
      combat.castSpell('blizzard');
      // +3 from the freeze, -1 for the action spent casting.
      expect(combat.countdown).toBe(before + 3 - 1);
      expect(combat.enemyHp).toBeLessThan(ENEMIES.brute!.hp);
    });

    it('Gale damages and slows your pieces', () => {
      const { battle, combat, hero } = fight('shroom'); // weak to wind
      hero.spells.push('gale');
      battle.hastePieces = 3;
      combat.castSpell('gale');
      expect(ENEMIES.shroom!.hp - combat.enemyHp).toBe(Math.round(12 * 1.5));
      expect(battle.slowPieces).toBe(5);
      expect(battle.hastePieces).toBe(0);
    });

    it('Shadow Drain heals half the damage dealt', () => {
      const { combat, hero } = fight('goblin');
      hero.spells.push('shadow');
      hero.hp = 1;
      combat.castSpell('shadow');
      const dealt = ENEMIES.goblin!.hp - combat.enemyHp;
      expect(hero.hp).toBe(1 + Math.floor(dealt / 2));
    });

    it('Meteor needs three elements', () => {
      const { combat, hero } = fight('goblin');
      hero.spells.push('meteor');
      hero.mana.earth = 5;
      expect(combat.cannotCastReason('meteor')).toBe('Not enough mana!');
      hero.mana.earth = 6;
      combat.castSpell('meteor');
      expect([hero.mana.fire, hero.mana.earth, hero.mana.arcane]).toEqual([
        hero.manaCap - 6,
        0,
        hero.manaCap - 6,
      ]);
    });

    it('cost 2 less of the attuned element', () => {
      const { combat, hero } = fight('goblin');
      hero.attunement = 'fire';
      combat.castSpell('fire');
      expect(hero.mana.fire).toBe(hero.manaCap - 4);
    });

    it('casting counts as an action and can trigger the enemy', () => {
      const { combat, hero } = fight('goblin');
      nextMove(combat, { kind: 'attack', name: 'Bonk', power: 1 });
      combat.castSpell('fire');
      expect(hero.hp).toBeLessThan(hero.maxHp);
    });

    it('explains why a spell cannot be cast', () => {
      const { combat, hero } = fight();
      expect(combat.cannotCastReason('meteor')).toBe("You don't know that spell.");
      expect(combat.cannotCastReason('cure')).toBe('HP is already full.');
      hero.mana.fire = 5;
      expect(combat.cannotCastReason('fire')).toBe('Not enough mana!');
      expect(() => combat.castSpell('fire')).toThrow('Not enough mana!');
      expect(() => combat.castSpell('nope')).toThrow("You don't know that spell.");
    });
  });

  describe('line effects (each cleared line triggers its strongest element)', () => {
    it('fire burns for extra damage', () => {
      const { battle, combat, hero } = fight('goblin'); // neutral to fire
      setUpVerticalIClear(battle.board, 1, 'red');
      battle.input('hardDrop');
      expect(ENEMIES.goblin!.hp - combat.enemyHp).toBe(LINE_DAMAGE[1]! + totalAttack(hero) + 9);
    });

    it('lightning chains, multiplied by lines cleared together', () => {
      const { battle, combat, hero } = fight('moonWyrm'); // weak to lightning
      setUpVerticalIClear(battle.board, 2, 'gold');
      battle.input('hardDrop');
      const strike = LINE_DAMAGE[2]! + totalAttack(hero) + 18 * WEAK_CRYSTAL_BONUS;
      const chains = 2 * Math.round(9 * 2 * 1.5);
      expect(ENEMIES.moonWyrm!.hp - combat.enemyHp).toBe(strike + chains);
    });

    it('water chills the enemy so it acts a piece later', () => {
      const { battle, combat } = fight('brute');
      const before = combat.countdown;
      setUpVerticalIClear(battle.board, 1, 'blue');
      battle.input('hardDrop');
      expect(combat.countdown).toBe(before); // +1 chill, -1 for the piece
    });

    it('chill cannot stall the enemy forever', () => {
      const { battle, combat } = fight('brute');
      combat.countdown = ENEMIES.brute!.actEvery + 2;
      setUpVerticalIClear(battle.board, 1, 'blue');
      battle.input('hardDrop');
      expect(combat.countdown).toBe(ENEMIES.brute!.actEvery + 1);
    });

    it('nature regrows HP', () => {
      const { battle, hero } = fight('goblin');
      hero.hp = 10;
      setUpVerticalIClear(battle.board, 1, 'green');
      battle.input('hardDrop');
      expect(hero.hp).toBe(19);
    });

    it('earth raises a ward that absorbs hits', () => {
      const { battle, combat, hero } = fight('goblin');
      setUpVerticalIClear(battle.board, 1, 'orange');
      nextMove(combat, { kind: 'attack', name: 'Stab', power: 3 });
      battle.input('hardDrop');
      const hit = 3 + ENEMIES.goblin!.atk - hero.def;
      expect(combat.ward).toBe(Math.max(0, 9 - hit));
      expect(hero.hp).toBe(hero.maxHp - Math.max(0, hit - 9));
    });

    it('wards are capped', () => {
      const { battle, combat } = fight('goblin');
      combat.ward = MAX_WARD - 2;
      setUpVerticalIClear(battle.board, 1, 'orange');
      battle.input('hardDrop');
      expect(combat.ward).toBe(MAX_WARD);
    });

    it('arcane surges mana into every element', () => {
      const { battle, hero } = fight('goblin');
      hero.mana = emptyCounts(0);
      setUpVerticalIClear(battle.board, 1, 'violet');
      battle.input('hardDrop');
      expect(hero.mana.arcane).toBe(Math.min(hero.manaCap, 9 + 3));
      expect(hero.mana.wind).toBe(1 + 3); // the I piece is wind
      expect(hero.mana.fire).toBe(3);
    });

    it('wind slows your pieces and cancels haste', () => {
      const { battle } = fight('goblin');
      battle.hastePieces = 4;
      setUpVerticalIClear(battle.board, 1, 'cyan');
      battle.input('hardDrop');
      expect(battle.slowPieces).toBe(5);
      expect(battle.hastePieces).toBe(0);
      expect(battle.gravityMs).toBe(gravityInterval(battle.level) * TAILWIND_SLOWDOWN);
    });

    it('mixed lines without 3 of an element trigger nothing extra', () => {
      const { battle, combat, hero } = fight('goblin');
      setUpVerticalIClear(battle.board, 1);
      battle.input('hardDrop');
      expect(ENEMIES.goblin!.hp - combat.enemyHp).toBe(LINE_DAMAGE[1]! + totalAttack(hero));
    });

    it('attunement makes its element 50% stronger', () => {
      const { battle, hero } = fight('goblin');
      hero.attunement = 'nature';
      hero.hp = 1;
      setUpVerticalIClear(battle.board, 1, 'green');
      battle.input('hardDrop');
      expect(hero.hp).toBe(1 + Math.floor(9 * 1.5));
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

  it('describes weaknesses and resistances', () => {
    expect(describeAffinities(ENEMIES.brute!)).toBe(
      'Weak to water and nature. Resists earth and fire.',
    );
    expect(describeAffinities({ ...ENEMIES.slime!, weak: [], resist: [] })).toBe('');
  });

  it('rolls spoils with drop chances', () => {
    const wyrm = ENEMIES.moonWyrm!;
    expect(rollSpoils(wyrm, createRng(1)).drops).toEqual(['phoenixFeather']);
    const spoils = rollSpoils(ENEMIES.moonImp!, createRng(1));
    expect(spoils).toEqual({ xp: ENEMIES.moonImp!.xp, gil: ENEMIES.moonImp!.gil, drops: [] });
  });
});
