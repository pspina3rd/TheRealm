import { describe, expect, it } from 'vitest';
import { HARD_DROP_POINTS_PER_ROW, gravityInterval } from '../src/core/scoring';
import { forceQueue, makeBattle, setUpVerticalIClear } from './helpers';

const haggle = { kind: 'haggle', pieceLimit: 50, rivalIntervalMs: 100000 } as const;

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
    battle.update(gravityInterval(1) * 2);
    expect(battle.board.active!.y).toBe(y + 2);
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
    const battle = makeBattle({ kind: 'haggle', pieceLimit: 1, rivalIntervalMs: 1000 });
    battle.input('hardDrop');
    expect(battle.status).toBe('won');
    battle.input('hardDrop');
    expect(battle.board.piecesPlaced).toBe(1);
  });

  it('keeps a bounded, newest-first event log', () => {
    const battle = makeBattle(haggle);
    for (let i = 0; i < 60; i++) battle.log(`event ${i}`);
    expect(battle.events).toHaveLength(50);
    expect(battle.events[0]?.text).toBe('event 59');
    expect(battle.events[0]?.tone).toBe('info');
  });
});
