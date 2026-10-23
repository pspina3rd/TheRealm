import { describe, expect, it } from 'vitest';
import type { CombatChallenge } from '../src/battle/combat';
import { MAX_WARD } from '../src/battle/combat';
import { emptyCounts } from '../src/core/elements';
import { SPELLS } from '../src/data/spells';
import type { EnemyMove } from '../src/data/types';
import { alignmentOf } from '../src/game/alignment';
import { canAfford, createHero } from '../src/game/hero';
import {
  castEffect,
  castPower,
  castSpellFor,
  castSummary,
  heroSpell,
  newKnownSpell,
  spellElements,
} from '../src/game/spells';
import { statRanks } from '../src/game/stats';
import {
  charge,
  forceQueue,
  knownSpells,
  makeBattle,
  rowWithGaps,
  setUpVerticalIClear,
} from './helpers';

/** A fight against a slime (nature: weak to fire, resists earth), knowing `spells`. */
function fight(...spells: string[]) {
  const battle = makeBattle({ kind: 'combat', enemyId: 'slime' });
  const combat = battle.combat!;
  battle.hero.spells = knownSpells(...spells);
  battle.hero.stats = statRanks();
  charge(battle.hero);
  combat.enemyHp = 999;
  return { battle, combat, hero: battle.hero };
}

function nextMove(combat: CombatChallenge, move: EnemyMove): void {
  (combat as unknown as { enemy: { moves: EnemyMove[] } }).enemy = {
    ...combat.enemy,
    moves: [move],
  };
  combat.nextMove = move;
}

const kinds = (battle: ReturnType<typeof fight>['battle']) =>
  battle.events.map((e) => e.event.kind);

describe('support spells', () => {
  it('Kindle burns the enemy after each of the next pieces, scaled by weakness', () => {
    const { battle, combat } = fight('kindle');
    combat.gauge = -1e9; // the enemy never moves
    combat.castSpell('kindle');
    const hp = combat.enemyHp;
    battle.input('hardDrop');
    expect(combat.enemyHp).toBe(hp - 6); // 4 × 1.5 (slimes are weak to fire)
    expect(combat.burn.pieces).toBe(4);
    for (let i = 0; i < 6; i++) battle.input('hardDrop');
    expect(combat.burn.pieces).toBe(0);
  });

  it('Mist makes the enemy’s next move fizzle', () => {
    const { battle, combat, hero } = fight('mist');
    nextMove(combat, { kind: 'attack', name: 'Bonk', power: 5 });
    combat.castSpell('mist');
    const hp = hero.hp;
    battle.update(combat.actMs);
    expect(hero.hp).toBe(hp);
    expect(combat.mist).toBe(0);
    expect(kinds(battle)).toContain('fizzle');
    expect(kinds(battle)).not.toContain('enemyMove');
  });

  it('Static adds a lightning strike to each of the next line clears', () => {
    const { battle, combat } = fight('static');
    combat.gauge = -1e9; // the enemy never moves
    combat.castSpell('static');
    setUpVerticalIClear(battle.board, 1);
    battle.input('hardDrop');
    expect(combat.charge.clears).toBe(2);
    const last = battle.events.filter((e) => e.event.kind === 'enemyHit').at(-1)?.event;
    expect(last).toEqual({ kind: 'enemyHit', amount: 6, element: 'lightning', affinity: null });
  });

  it('Regen heals after each of the next pieces', () => {
    const { battle, combat, hero } = fight('regen');
    combat.gauge = -1e9; // the enemy never moves
    hero.hp = 10;
    combat.castSpell('regen');
    battle.input('hardDrop');
    expect(hero.hp).toBe(14);
    expect(combat.regen.pieces).toBe(4);
  });

  it('Stoneskin raises a ward, capped', () => {
    const { combat } = fight('stoneskin');
    combat.gauge = -1e9; // the enemy never moves
    combat.castSpell('stoneskin');
    expect(combat.ward).toBe(15);
    combat.castSpell('stoneskin');
    expect(combat.ward).toBe(MAX_WARD);
  });

  it('Mana Tap fills every other pool, and needs room in one', () => {
    const { battle, combat, hero } = fight('manaTap');
    combat.gauge = -1e9; // the enemy never moves
    hero.mana = { ...emptyCounts(), arcane: 10 };
    combat.castSpell('manaTap');
    expect(hero.mana).toEqual({ ...emptyCounts(1), arcane: 6 });
    expect(kinds(battle)).toContain('mana');
    hero.mana = { ...emptyCounts(hero.manaCap), arcane: 10 };
    expect(combat.cannotCastReason('manaTap')).toBe('Mana is already full.');
    hero.mana.fire = 0;
    expect(combat.cannotCastReason('manaTap')).toBeNull();
  });

  it('Regen needs missing HP', () => {
    const { combat, hero } = fight('regen');
    expect(combat.cannotCastReason('regen')).toBe('HP is already full.');
    hero.hp--;
    expect(combat.cannotCastReason('regen')).toBeNull();
  });

  it('Gust swaps the falling piece for the next one', () => {
    const { battle, combat } = fight('gust');
    combat.gauge = -1e9; // the enemy never moves
    forceQueue(battle, ['T', 'O', 'I']);
    combat.castSpell('gust');
    expect(battle.board.active?.name).toBe('O');
  });

  it('Gust can’t be cast, spending nothing, when the next piece has no room', () => {
    const { battle, combat, hero } = fight('gust');
    combat.gauge = -1e9; // the enemy never moves
    forceQueue(battle, ['T', 'I']);
    battle.board.grid[1] = rowWithGaps(10, [3, 4, 5]); // room for the T only
    const wind = hero.mana.wind;
    expect(battle.board.canSwapWithNext()).toBe(false);
    expect(combat.cannotCastReason('gust')).toBe('No room to swap.');
    expect(() => combat.castSpell('gust')).toThrow('No room to swap.');
    expect(hero.mana.wind).toBe(wind);
    expect(battle.board.active?.name).toBe('T');
    expect(combat.gauge).toBe(-1e9);
  });

  it('effects stop once the enemy is down', () => {
    const { battle, combat, hero } = fight('kindle', 'regen');
    combat.gauge = -1e9; // the enemy never moves
    hero.hp = 10;
    combat.castSpell('kindle');
    combat.castSpell('regen');
    combat.enemyHp = 1;
    setUpVerticalIClear(battle.board, 1);
    battle.input('hardDrop');
    expect(combat.status()).toBe('won');
    expect(combat.burn.pieces).toBe(5);
  });
});

describe('support and combo data', () => {
  // Hidden spells are tested in hidden.test.ts.
  const supports = Object.values(SPELLS).filter((s) => s.role === 'support' && !s.hidden);
  const combos = Object.values(SPELLS).filter((s) => s.role === 'combo' && !s.hidden);

  it('has one single-level support per element, needing its primary', () => {
    expect(new Set(supports.map((s) => s.category)).size).toBe(7);
    for (const spell of supports) {
      expect(spell.levels).toHaveLength(1);
      const primary = Object.values(SPELLS).find(
        (s) => s.role === 'primary' && s.category === spell.category,
      );
      expect(spell.requires).toEqual([primary?.id]);
    }
  });

  it('gives every element a combo needing another element’s primary, costing both', () => {
    const twoElement = combos.filter((s) => spellElements(s).length === 2);
    expect(new Set(twoElement.map((s) => s.category)).size).toBe(7);
    for (const spell of twoElement) {
      const [own, other] = spellElements(spell);
      expect(own).toBe(spell.category);
      const required = SPELLS[spell.requires?.[0] ?? ''];
      expect(required?.role).toBe('primary');
      expect(required?.category).toBe(other);
      expect(Object.keys(spell.levels[0].cost).sort()).toEqual([own, other].sort());
    }
  });

  it('counts a combo toward both alignments and costs both elements', () => {
    expect(alignmentOf(knownSpells('magma'))).toMatchObject({ earth: 1, fire: 1, water: 0 });
    const hero = createHero();
    hero.spells = knownSpells('magma');
    hero.mana = { ...emptyCounts(), earth: 4 };
    const cost = heroSpell(hero, 'magma')!.cost;
    expect(cost).toEqual({ earth: 4, fire: 4 });
    expect(canAfford(hero, cost)).toBe(false);
    hero.mana.fire = 4;
    expect(canAfford(hero, cost)).toBe(true);
  });

  it('keeps Meteor teachable by the fire mentor once Quake and Shadow Drain are known', () => {
    expect(SPELLS.meteor?.requires).toEqual(['quake', 'shadow']);
  });

  it('summarises, scores and leaves supports unenhanced', () => {
    const summaries = supports.map((spell) => {
      const cast = castSpellFor(spell, {
        ...newKnownSpell(),
        step: { power: 1, efficiency: 0, effect: 1 },
      });
      expect(cast.effect).toEqual(spell.levels[0].effect);
      return [castSummary(cast), castPower(cast.effect), castEffect(cast)];
    });
    expect(summaries).toEqual([
      ['Kindle · Lv 1 · 4 damage × 5 pieces', 4, 5],
      ['Mist · Lv 1 · next 1 enemy move fizzles', 0, 1],
      ['Static · Lv 1 · +6 damage × 3 clears', 6, 3],
      ['Regen · Lv 1 · heal 4 × 5 pieces', 4, 5],
      ['Stoneskin · Lv 1 · ward 15', 15, 0],
      ['Mana Tap · Lv 1 · +1 mana to the other pools', 1, 0],
      ['Gust · Lv 1 · swap for the next piece', 0, 0],
    ]);
  });
});
