import { describe, expect, it } from 'vitest';
import { Board, EVEN_WEIGHTS } from '../src/core/board';
import {
  ELEMENTS,
  ELEMENT_OF_COLOR,
  dominantElement,
  elementsOf,
  emptyCounts,
  pieceOfElement,
} from '../src/core/elements';
import { CRYSTAL_COLORS, PIECES, PIECE_NAMES } from '../src/core/pieces';
import { createRng } from '../src/core/rng';
import {
  ATTUNED_SURGE_BONUS,
  SURGE_DESCRIPTIONS,
  SURGE_THRESHOLD,
  crystalAffinity,
  elementMultiplier,
  lineSurge,
} from '../src/battle/elemental';
import { ENEMIES } from '../src/data/enemies';
import { MAPS } from '../src/data/maps';
import { createHero } from '../src/game/hero';
import { BASE_PIECE_WEIGHT, MIN_PIECE_WEIGHT, pieceWeights } from '../src/game/pieceOdds';
import type { MapDef } from '../src/world/map';
import { makeBattle, setUpVerticalIClear } from './helpers';

describe('elements', () => {
  it('gives every colour, and so every piece, its own element', () => {
    const elements = CRYSTAL_COLORS.map((c) => ELEMENT_OF_COLOR[c]);
    expect([...elements].sort()).toEqual([...ELEMENTS].sort());
    for (const element of ELEMENTS) {
      expect(ELEMENT_OF_COLOR[PIECES[pieceOfElement(element)].color]).toBe(element);
    }
    expect(Object.keys(SURGE_DESCRIPTIONS).sort()).toEqual([...ELEMENTS].sort());
  });

  it('counts cleared crystals by element, ignoring stone', () => {
    expect(elementsOf({ red: 3, cyan: 1, stone: 6 })).toEqual({
      ...emptyCounts(),
      fire: 3,
      wind: 1,
    });
  });

  it('finds the strongest element, breaking ties by list order', () => {
    expect(dominantElement({ ...emptyCounts(), water: 4, fire: 4, wind: 2 })).toEqual({
      element: 'fire',
      count: 4,
    });
    expect(dominantElement(emptyCounts())).toBeNull();
  });
});

describe('line surges', () => {
  it('triggers the strongest element with at least the threshold', () => {
    expect(lineSurge({ green: 6, red: 4 }, null)).toEqual({ element: 'nature', power: 6 });
    expect(lineSurge({ green: SURGE_THRESHOLD - 1, stone: 8 }, null)).toBeNull();
    expect(lineSurge({ stone: 10 }, null)).toBeNull();
  });

  it('is stronger for the attuned element only', () => {
    expect(lineSurge({ gold: 6, stone: 4 }, 'lightning')?.power).toBe(6 * ATTUNED_SURGE_BONUS);
    expect(lineSurge({ gold: 6, stone: 4 }, 'fire')?.power).toBe(6);
  });

  it('scales by weakness and resistance', () => {
    const brute = ENEMIES.brute!;
    expect(elementMultiplier(brute, 'water')).toBe(1.5);
    expect(elementMultiplier(brute, 'fire')).toBe(0.5);
    expect(elementMultiplier(brute, 'wind')).toBe(1);
    expect(crystalAffinity(brute, { ...emptyCounts(), water: 3, fire: 2, wind: 5 })).toBe(6 - 2);
  });
});

describe('mana from crystals', () => {
  it('fills each element from cleared crystals in any kind of battle', () => {
    const battle = makeBattle({ kind: 'haggle', pieceLimit: 5, rivalIntervalMs: 99999 });
    battle.hero.mana = emptyCounts(0);
    setUpVerticalIClear(battle.board, 1, 'red');
    battle.input('hardDrop');
    expect(battle.hero.mana).toEqual({ ...emptyCounts(), fire: 9, wind: 1 });
  });

  it('never fills a pool past its capacity', () => {
    const battle = makeBattle({ kind: 'haggle', pieceLimit: 5, rivalIntervalMs: 99999 });
    battle.hero.mana = emptyCounts(0);
    setUpVerticalIClear(battle.board, 2, 'red');
    battle.input('hardDrop');
    expect(battle.hero.mana.fire).toBe(battle.hero.manaCap);
  });
});

describe('piece odds', () => {
  const plain: MapDef = {
    id: 'p',
    name: 'p',
    theme: 'outdoor',
    tiles: ['.'],
    warps: [],
    entities: [],
  };

  it('is even with no tilts', () => {
    expect(new Set(Object.values(pieceWeights(plain, createHero())))).toEqual(
      new Set([BASE_PIECE_WEIGHT]),
    );
  });

  it('adds area, charm and attunement tilts, never below the minimum', () => {
    const hero = createHero();
    hero.accessoryId = 'stormCharm';
    hero.attunement = 'arcane';
    const weights = pieceWeights(MAPS.caves2!, hero); // earth +1, arcane +2, lightning -1
    expect(weights[pieceOfElement('earth')]).toBe(BASE_PIECE_WEIGHT + 1);
    expect(weights[pieceOfElement('arcane')]).toBe(BASE_PIECE_WEIGHT + 3);
    expect(weights[pieceOfElement('lightning')]).toBe(BASE_PIECE_WEIGHT); // -1 area, +1 charm
    const harsh = { ...plain, pieceBias: { fire: -5 } };
    expect(pieceWeights(harsh, createHero())[pieceOfElement('fire')]).toBe(MIN_PIECE_WEIGHT);
  });

  it('fills each bag with the weighted copies', () => {
    const board = new Board(createRng(4), 10, 20, { ...EVEN_WEIGHTS, I: 3 });
    const bag = board.preview(9);
    expect(bag.filter((p) => p === 'I')).toHaveLength(3);
    expect(new Set(bag).size).toBe(PIECE_NAMES.length);
  });

  it('falls back to a standard bag if every weight is zero', () => {
    const zero = Object.fromEntries(PIECE_NAMES.map((n) => [n, 0])) as typeof EVEN_WEIGHTS;
    const board = new Board(createRng(4), 10, 20, zero);
    expect(new Set(board.preview(7)).size).toBe(7);
  });

  it('is applied to battles', () => {
    const battle = makeBattle({ kind: 'haggle', pieceLimit: 5, rivalIntervalMs: 1 });
    expect(battle.board.preview(7)).toHaveLength(7);
  });
});
