import { describe, expect, it } from 'vitest';
import { HARD_DROP_POINTS_PER_ROW, gravityInterval } from '../src/core/scoring';
import { emptyCounts } from '../src/core/elements';
import { MANA_BOOST_MULTIPLIER, MANA_PER_LINES } from '../src/battle/battle';
import { addItem, createHero } from '../src/game/hero';
import { forceQueue, makeBattle, setUpVerticalIClear } from './helpers';

const haggle = { kind: 'barter', wants: { gold: 999 }, pieceLimit: 50 } as const;

describe('Battle', () => {
  it('spawns a piece and starts ongoing', () => {
    const battle = makeBattle(haggle);
    expect(battle.board.active).not.toBeNull();
    expect(battle.status).toBe('ongoing');
    expect(battle.combat).toBeNull();
  });

  it('moves and rotates the active piece', () => {
    const battle = makeBattle(haggle);
    forceQueue(battle, ['T']);
    const x = battle.board.active!.x;
    battle.input('left');
    expect(battle.board.active!.x).toBe(x - 1);
    battle.input('right');
    battle.input('right');
    expect(battle.board.active!.x).toBe(x + 1);
    const before = JSON.stringify(battle.board.active!.cells);
    battle.input('rotate');
    expect(JSON.stringify(battle.board.active!.cells)).not.toBe(before);
  });

  it('scores soft drops, hard drops and line clears', () => {
    const battle = makeBattle(haggle);
    battle.input('softDrop');
    expect(battle.score).toBe(1);
    setUpVerticalIClear(battle.board, 1);
    const distance = battle.board.ghostY() - battle.board.active!.y;
    battle.input('hardDrop');
    expect(battle.score).toBe(1 + distance * HARD_DROP_POINTS_PER_ROW + 200);
    expect(battle.lines).toBe(1);
  });

  it('soft drop onto the floor locks the piece', () => {
    const battle = makeBattle(haggle);
    while (battle.board.piecesPlaced === 0) battle.input('softDrop');
    expect(battle.board.piecesPlaced).toBe(1);
  });

  it('applies gravity over time', () => {
    const battle = makeBattle(haggle);
    const y = battle.board.active!.y;
    battle.update(battle.gravityMs * 2);
    expect(battle.board.active!.y).toBe(y + 2);
  });

  it('slows gravity 4% per Agility rank', () => {
    const battle = makeBattle(haggle);
    battle.hero.stats.agility = 0;
    expect(battle.gravityMs).toBe(gravityInterval(1));
    battle.hero.stats.agility = 5;
    expect(battle.gravityMs).toBeCloseTo(gravityInterval(1) * 1.2);
    battle.hastePieces = 2;
    expect(battle.gravityMs).toBeCloseTo((gravityInterval(1) * 1.2) / 2);
  });

  it('shows more upcoming pieces with Insight', () => {
    const battle = makeBattle(haggle);
    const seen = (insight: number) => {
      battle.hero.stats.insight = insight;
      return battle.upcoming;
    };
    expect(seen(0)).toHaveLength(1);
    expect(seen(3)).toHaveLength(2);
    expect(seen(6)).toHaveLength(3);
    expect(seen(9)).toHaveLength(3);
    expect(seen(6)).toEqual(battle.board.preview(3));
  });

  it('ignores input and time while paused', () => {
    const battle = makeBattle(haggle);
    const y = battle.board.active!.y;
    battle.paused = true;
    battle.update(10000);
    battle.input('hardDrop');
    expect(battle.board.active!.y).toBe(y);
    expect(battle.board.piecesPlaced).toBe(0);
  });

  it('ignores input once the battle is over', () => {
    const battle = makeBattle({ kind: 'barter', wants: { gold: 999 }, pieceLimit: 1 });
    battle.input('hardDrop');
    expect(battle.status).toBe('lost');
    battle.input('hardDrop');
    expect(battle.board.piecesPlaced).toBe(1);
  });

  it('keeps a bounded, numbered event stream', () => {
    const battle = makeBattle(haggle);
    for (let i = 0; i < 120; i++) battle.emit({ kind: 'chill' });
    expect(battle.events).toHaveLength(100);
    expect(battle.events.at(-1)?.seq).toBe(119);
    expect(battle.eventsSince(118).map((e) => e.seq)).toEqual([118, 119]);
    expect(battle.eventsSince(500)).toEqual([]);
  });

  it('reports cleared lines, their rows and the mana gained', () => {
    const battle = makeBattle(haggle);
    battle.hero.mana = emptyCounts(0);
    setUpVerticalIClear(battle.board, 2, 'green');
    battle.input('hardDrop');
    const kinds = battle.events.map((e) => e.event);
    expect(kinds).toContainEqual({
      kind: 'lines',
      rows: [18, 19],
      lines: [
        { green: 9, cyan: 1 },
        { green: 9, cyan: 1 },
      ],
    });
    expect(kinds.find((e) => e.kind === 'mana')).toBeDefined();
  });
});

describe('mana belongs to the battle', () => {
  const fight = { kind: 'combat', enemyId: 'brute' } as const;

  it('starts every battle with empty pools, whatever the hero carried in', () => {
    const hero = createHero();
    hero.mana = emptyCounts(hero.manaCap);
    makeBattle(fight, hero);
    expect(hero.mana).toEqual(emptyCounts());
  });

  it('fills only from crystals cleared on the board', () => {
    const battle = makeBattle(fight);
    setUpVerticalIClear(battle.board, 1, 'red');
    battle.input('hardDrop');
    // A lone line gives half its crystals as mana (rounded down).
    expect(battle.hero.mana.fire).toBe(Math.floor(9 * MANA_PER_LINES[1]!));
    setUpVerticalIClear(battle.board, 2, 'red');
    battle.input('hardDrop');
    expect(battle.hero.mana.fire).toBe(Math.min(battle.hero.manaCap, 4 + 18));
  });

  it('doubles cleared crystals for the pieces an Ether lasts, and adds nothing itself', () => {
    const battle = makeBattle(fight);
    addItem(battle.hero, 'ether');
    battle.combat!.useItem('ether');
    expect(battle.hero.mana).toEqual(emptyCounts());
    expect(battle.manaBoostPieces).toBe(3);
    setUpVerticalIClear(battle.board, 1, 'red');
    battle.input('hardDrop');
    expect(battle.hero.mana.fire).toBe(Math.min(battle.hero.manaCap, 4 * MANA_BOOST_MULTIPLIER));
    expect(battle.manaBoostPieces).toBe(2);
  });
});
