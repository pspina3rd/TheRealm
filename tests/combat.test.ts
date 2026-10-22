import { describe, expect, it, vi } from 'vitest';
import type { CombatChallenge } from '../src/battle/combat';
import { LINE_DAMAGE, MAX_WARD, rollSpoils } from '../src/battle/combat';
import { TAILWIND_SLOWDOWN } from '../src/battle/battle';
import { WEAK_CRYSTAL_BONUS } from '../src/battle/elemental';
import { emptyCounts } from '../src/core/elements';
import { gravityInterval } from '../src/core/scoring';
import { createRng } from '../src/core/rng';
import { ENEMIES } from '../src/data/enemies';
import type { EnemyMove } from '../src/data/types';
import { addItem, createHero, learnSpell, spendSkillPoints, totalAttack } from '../src/game/hero';
import { CRIT_MULTIPLIER, dropBonus, statRanks } from '../src/game/stats';
import { enhancements, type Enhancements } from '../src/game/spells';
import { charge, knownSpells, makeBattle, setUpVerticalIClear } from './helpers';

/**
 * A fight against `enemyId`. The hero knows Fire and Cure (fire 1, nature 1
 * alignment) and has no stat ranks, so the maths below doesn't depend on
 * the default class.
 *
 * Element chart for the enemies used here (the vertical I piece adds one
 * wind crystal to every cleared line):
 * - nature (slime, shroom): weak fire, arcane; resists nature, earth, water
 * - earth (goblin, brute): weak water, nature; resists earth, lightning, wind
 * - arcane (moon imp): weak fire, wind; resists arcane, nature, lightning
 */
function fight(enemyId = 'slime') {
  const battle = makeBattle({ kind: 'combat', enemyId });
  const combat = battle.combat;
  if (!combat) throw new Error('expected combat');
  battle.hero.spells = knownSpells('fire', 'cure');
  battle.hero.stats = statRanks();
  charge(battle.hero);
  return { battle, combat, hero: battle.hero };
}

/** Forces the enemy to use `move` on its next action (and every one after). */
function nextMove(combat: CombatChallenge, move: EnemyMove): void {
  (combat as unknown as { enemy: { moves: EnemyMove[] } }).enemy = {
    ...combat.enemy,
    moves: [move],
  };
  combat.nextMove = move;
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
    const { battle, combat, hero } = fight('shroom'); // neutral to the wind crystals
    combat.enemyHp = 999;
    setUpVerticalIClear(battle.board, 2);
    battle.input('hardDrop');
    expect(combat.enemyHp).toBe(999 - (LINE_DAMAGE[2]! + totalAttack(hero)));
  });

  it('adds strike damage for crystals the enemy is weak to', () => {
    const { battle, combat, hero } = fight('shroom'); // weak to arcane (violet)
    combat.enemyHp = 999;
    setUpVerticalIClear(battle.board, 1, 'violet');
    battle.input('hardDrop');
    const expected = LINE_DAMAGE[1]! + totalAttack(hero) + 9 * WEAK_CRYSTAL_BONUS;
    expect(combat.enemyHp).toBe(999 - expected);
  });

  it('reduces strike damage for crystals the enemy resists', () => {
    const { battle, combat, hero } = fight('shroom'); // resists water (blue)
    combat.enemyHp = 999;
    setUpVerticalIClear(battle.board, 1, 'blue');
    battle.input('hardDrop');
    expect(combat.enemyHp).toBe(999 - (LINE_DAMAGE[1]! + totalAttack(hero) - 9));
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

  it('Strength adds to every strike and Guard takes from every hit', () => {
    const { battle, combat, hero } = fight('shroom');
    spendSkillPoints(Object.assign(hero, { skillPoints: 4 }), {
      stats: { strength: 2, guard: 2 },
      spells: {},
    });
    combat.enemyHp = 999;
    nextMove(combat, { kind: 'attack', name: 'Bite', power: 6 });
    setUpVerticalIClear(battle.board, 1);
    battle.input('hardDrop');
    const base = createHero(hero.classId);
    expect(999 - combat.enemyHp).toBe(LINE_DAMAGE[1]! + base.atk + 2);
    expect(hero.maxHp - hero.hp).toBe(6 + ENEMIES.shroom!.atk - (base.def + 2));
  });

  it('picks its next move a turn ahead and then uses it', () => {
    const { battle, combat } = fight('goblin');
    const planned = combat.nextMove;
    expect(ENEMIES.goblin!.moves).toContain(planned);
    combat.countdown = 1;
    battle.input('hardDrop');
    expect(battle.events.map((e) => e.event)).toContainEqual({ kind: 'enemyMove', move: planned });
    expect(ENEMIES.goblin!.moves).toContain(combat.nextMove);
  });

  describe('critical strikes (Luck)', () => {
    /** A Luck 10 hero (30% crit) clearing `lines` with the next roll fixed at `roll`. */
    const clear = (lines: number, roll: number) => {
      const { battle, combat, hero } = fight('shroom');
      hero.stats.luck = 10;
      combat.enemyHp = 999;
      const next = vi.spyOn(battle.rng, 'next').mockReturnValue(roll);
      setUpVerticalIClear(battle.board, lines);
      battle.input('hardDrop');
      const events = battle.events.map((e) => e.event);
      return { dealt: 999 - combat.enemyHp, events, rolls: next.mock.calls.length, hero };
    };

    it('double the strike of a 3+ line clear', () => {
      const { dealt, events, hero } = clear(3, 0.29);
      expect(dealt).toBe((LINE_DAMAGE[3]! + totalAttack(hero)) * CRIT_MULTIPLIER);
      const crit = events.findIndex((e) => e.kind === 'crit');
      expect(crit).toBeGreaterThanOrEqual(0);
      expect(events[crit + 1]).toMatchObject({ kind: 'enemyHit', amount: dealt });
    });

    it('miss when the roll is above the chance', () => {
      const { dealt, events, hero } = clear(3, 0.3);
      expect(dealt).toBe(LINE_DAMAGE[3]! + totalAttack(hero));
      expect(events.some((e) => e.kind === 'crit')).toBe(false);
    });

    it('never happen on smaller clears, which roll nothing', () => {
      const { events, rolls } = clear(2, 0);
      expect(events.some((e) => e.kind === 'crit')).toBe(false);
      expect(rolls).toBe(0);
    });
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
      const resist = fight('brute'); // resists wind
      learnSpell(resist.hero, 'gale');
      resist.combat.castSpell('gale');
      expect(ENEMIES.brute!.hp - resist.combat.enemyHp).toBe(Math.round(12 * 0.5));
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
      learnSpell(hero, 'quake');
      battle.board.addGarbage(3);
      combat.castSpell('quake');
      expect(battle.board.grid.flat().filter((c) => c === 'stone')).toHaveLength(9);
    });

    it('Blizzard damages and delays the enemy', () => {
      const { combat, hero } = fight('brute');
      learnSpell(hero, 'blizzard');
      const before = combat.countdown;
      combat.castSpell('blizzard');
      // +3 from the freeze, -1 for the action spent casting.
      expect(combat.countdown).toBe(before + 3 - 1);
      expect(combat.enemyHp).toBeLessThan(ENEMIES.brute!.hp);
    });

    it('Gale damages and slows your pieces', () => {
      const { battle, combat, hero } = fight('moonImp'); // weak to wind
      learnSpell(hero, 'gale');
      battle.hastePieces = 3;
      combat.castSpell('gale');
      expect(ENEMIES.moonImp!.hp - combat.enemyHp).toBe(Math.round(12 * 1.5));
      expect(battle.slowPieces).toBe(5);
      expect(battle.hastePieces).toBe(0);
    });

    it('Shadow Drain heals half the damage dealt', () => {
      const { combat, hero } = fight('goblin');
      learnSpell(hero, 'shadow');
      hero.hp = 1;
      combat.castSpell('shadow');
      const dealt = ENEMIES.goblin!.hp - combat.enemyHp;
      expect(hero.hp).toBe(1 + Math.floor(dealt / 2));
    });

    it('Meteor needs three elements', () => {
      const { combat, hero } = fight('goblin');
      learnSpell(hero, 'meteor');
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

    describe('at higher levels and with enhancements', () => {
      const at = (level: number, kept: Partial<Enhancements>) => ({
        level,
        step: enhancements(),
        kept: enhancements(kept),
      });

      it('cast the level’s spell with Power and Efficiency applied', () => {
        const { combat, hero } = fight('goblin'); // neutral to fire
        hero.spells.fire = at(3, { power: 2, efficiency: 1 });
        combat.castSpell('fire');
        expect(ENEMIES.goblin!.hp - combat.enemyHp).toBe(Math.round(36 * 1.4) + hero.level * 2);
        expect(hero.mana.fire).toBe(hero.manaCap - 9);
      });

      it('fire their element’s line effect with Effect', () => {
        const { battle, combat, hero } = fight('goblin');
        hero.spells.fire = at(1, { effect: 1 });
        combat.enemyHp = 999;
        combat.castSpell('fire');
        expect(999 - combat.enemyHp).toBe(14 + hero.level * 2 + 3);
        expect(battle.events.map((e) => e.event)).toContainEqual({
          kind: 'surge',
          element: 'fire',
          power: 3,
          row: battle.board.height - 1,
        });
      });

      it('skip the line effect once the enemy is down', () => {
        const { battle, combat, hero } = fight('goblin');
        hero.spells.fire = at(1, { effect: 1 });
        combat.enemyHp = 1;
        combat.castSpell('fire');
        expect(battle.events.filter((e) => e.event.kind === 'surge')).toHaveLength(0);
      });

      it('regrow with Cure’s Effect', () => {
        const { combat, hero } = fight();
        hero.spells.cure = at(2, { effect: 2 });
        hero.hp = 1;
        combat.castSpell('cure');
        expect(hero.hp).toBe(1 + 32 + 6);
      });

      it('heal a larger share of drained damage', () => {
        const { combat, hero } = fight('goblin');
        hero.spells.shadow = at(1, { effect: 2 });
        hero.hp = 1;
        combat.castSpell('shadow');
        const dealt = ENEMIES.goblin!.hp - combat.enemyHp;
        expect(hero.hp).toBe(1 + Math.floor(dealt * 0.7));
      });

      it('Quake deals its small damage without the level bonus, raised by Power', () => {
        const { combat, hero } = fight('moonImp'); // neutral to earth
        hero.level = 9;
        learnSpell(hero, 'quake');
        combat.enemyHp = 999;
        combat.castSpell('quake');
        expect(999 - combat.enemyHp).toBe(6);
        hero.spells.quake = at(4, { power: 2 });
        hero.mana.earth = hero.manaCap;
        combat.enemyHp = 999;
        combat.castSpell('quake');
        expect(999 - combat.enemyHp).toBe(Math.round(26 * 1.4));
      });

      it('clear more rows and freeze longer', () => {
        const { battle, combat, hero } = fight('brute');
        combat.enemyHp = 999;
        hero.spells.quake = at(1, { effect: 1 });
        battle.board.addGarbage(4);
        combat.castSpell('quake');
        expect(battle.board.grid.flat().filter((c) => c === 'stone')).toHaveLength(9);
        hero.spells.blizzard = at(2, { effect: 1 });
        const before = combat.countdown;
        combat.castSpell('blizzard');
        expect(combat.countdown).toBe(before + 3 + 1 - 1);
      });
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
      const { battle, combat, hero } = fight('goblin'); // neutral to fire, resists wind
      setUpVerticalIClear(battle.board, 1, 'red');
      battle.input('hardDrop');
      const strike = LINE_DAMAGE[1]! + totalAttack(hero) - 1; // −1 for the wind crystal
      const burn = Math.floor(9 * 1.1); // fire alignment 1
      expect(ENEMIES.goblin!.hp - combat.enemyHp).toBe(strike + burn);
    });

    it('lightning chains, multiplied by lines cleared together', () => {
      const { battle, combat, hero } = fight('shroom'); // neutral to lightning
      combat.enemyHp = 999;
      setUpVerticalIClear(battle.board, 2, 'gold');
      battle.input('hardDrop');
      const chains = 2 * (9 * 2); // two lines, each 9 crystals × 2 lines together
      expect(999 - combat.enemyHp).toBe(LINE_DAMAGE[2]! + totalAttack(hero) + chains);
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
      const { battle, combat, hero } = fight('shroom');
      combat.enemyHp = 999;
      setUpVerticalIClear(battle.board, 1);
      battle.input('hardDrop');
      expect(999 - combat.enemyHp).toBe(LINE_DAMAGE[1]! + totalAttack(hero));
    });

    it("surges grow with the hero's alignment in their element", () => {
      const { battle, hero } = fight('goblin');
      hero.spells = knownSpells('cure'); // nature 1: ×1.1
      hero.hp = 1;
      setUpVerticalIClear(battle.board, 1, 'green');
      battle.input('hardDrop');
      expect(hero.hp).toBe(1 + Math.floor(9 * 1.1));
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

  it('adds Luck to every drop chance', () => {
    const roll = createRng(7).next();
    const enemy = { ...ENEMIES.slime!, drops: [{ itemId: 'slimeGel', chance: roll - 0.01 }] };
    expect(rollSpoils(enemy, createRng(7)).drops).toEqual([]);
    expect(rollSpoils(enemy, createRng(7), dropBonus(1)).drops).toEqual(['slimeGel']);
  });

  it('rolls spoils with drop chances', () => {
    const wyrm = ENEMIES.moonWyrm!;
    expect(rollSpoils(wyrm, createRng(1)).drops).toEqual(['phoenixFeather']);
    const spoils = rollSpoils(ENEMIES.moonImp!, createRng(1));
    expect(spoils).toEqual({ xp: ENEMIES.moonImp!.xp, gil: ENEMIES.moonImp!.gil, drops: [] });
  });
});

describe('combat events', () => {
  const events = (battle: ReturnType<typeof makeBattle>) => battle.events.map((e) => e.event);

  it('reports strikes with their element affinity and surges with their row', () => {
    const battle = makeBattle({ kind: 'combat', enemyId: 'brute' });
    setUpVerticalIClear(battle.board, 1, 'blue');
    battle.input('hardDrop');
    expect(events(battle)).toContainEqual(
      expect.objectContaining({ kind: 'enemyHit', element: null, affinity: 'weak' }),
    );
    expect(events(battle)).toContainEqual({ kind: 'surge', element: 'water', power: 9, row: 19 });
    expect(events(battle)).toContainEqual({ kind: 'chill' });
  });

  it('announces enemy moves before their effects', () => {
    const battle = makeBattle({ kind: 'combat', enemyId: 'goblin' });
    const combat = battle.combat!;
    nextMove(combat, { kind: 'curse', name: 'Rock Toss', rows: 1 });
    battle.input('hardDrop');
    const list = events(battle);
    const move = list.findIndex((e) => e.kind === 'enemyMove');
    expect(move).toBeGreaterThanOrEqual(0);
    expect(list[move + 1]).toEqual({ kind: 'curse', rows: 1 });
  });

  it('reports the ward absorbing a hit', () => {
    const battle = makeBattle({ kind: 'combat', enemyId: 'goblin' });
    const combat = battle.combat!;
    combat.ward = 50;
    nextMove(combat, { kind: 'attack', name: 'Stab', power: 3 });
    battle.input('hardDrop');
    expect(events(battle).some((e) => e.kind === 'heroHit')).toBe(false);
    expect(events(battle)).toContainEqual({ kind: 'ward', total: combat.ward });
  });

  it('reports spells, items, revival and defeat', () => {
    const battle = makeBattle({ kind: 'combat', enemyId: 'slime' });
    const combat = battle.combat!;
    charge(battle.hero);
    battle.hero.hp = 1;
    combat.useItem('herb');
    expect(events(battle)).toContainEqual({ kind: 'item', itemId: 'herb' });
    expect(events(battle)).toContainEqual({ kind: 'heroHeal', amount: 20 });
    addItem(battle.hero, 'phoenixFeather');
    battle.hero.hp = 1;
    nextMove(combat, { kind: 'attack', name: 'Bonk', power: 99 });
    battle.input('hardDrop');
    expect(events(battle)).toContainEqual({ kind: 'revive' });
    learnSpell(battle.hero, 'fire');
    combat.castSpell('fire');
    expect(events(battle)).toContainEqual({ kind: 'spell', spellId: 'fire' });
    expect(events(battle).at(-1)).toEqual({ kind: 'enemyDefeated' });
  });
});
