import { describe, expect, it } from 'vitest';
import { Battle } from '../src/battle/battle';
import type { BuildChallenge } from '../src/battle/verbs/build';
import type { DigChallenge } from '../src/battle/verbs/dig';
import { createRng } from '../src/core/rng';
import { createHero } from '../src/game/hero';
import { ENCOUNTERS } from '../src/data/balance';

const trial = (id: string, demo = false) =>
  new Battle(
    { kind: 'encounter', id, strain: 0, demo, assisted: false },
    createHero(),
    createRng(11),
    { dualChance: 1 },
  );
describe('one introductory correction', () => {
  it('restores board, tags, dual piece and future queue once, without keeping earned points or mana', () => {
    const battle = trial('elder');
    battle.board.loadRows(['mm..mmm', 'mmP.mmm'], { P: { cell: 'stone', tag: 'target' } });
    battle.board.replaceActive('O', { second: 'blue' });
    const grid = structuredClone(battle.board.grid);
    const tags = structuredClone(battle.board.tags);
    const next = battle.upcomingPieces;
    const mana = { ...battle.hero.mana };
    battle.input('hardDrop');
    expect(battle.canCorrect).toBe(true);
    expect(battle.correctLastDrop()).toBe(true);
    expect(battle.board.grid).toEqual(grid);
    expect(battle.board.tags).toEqual(tags);
    expect(battle.board.active).toMatchObject({ name: 'O', second: 'blue', y: 0 });
    expect(battle.upcomingPieces).toEqual(next);
    expect(battle.board.piecesPlaced).toBe(0);
    expect(battle.score).toBe(0);
    expect(battle.lines).toBe(0);
    expect(battle.hero.mana).toEqual(mana);
    expect(battle.correctLastDrop()).toBe(false);
  });
  it('restores a rising row and the warning countdown', () => {
    const battle = trial('elder');
    const dig = battle.challenge as DigChallenge;
    battle.board.loadRows(['mm..mmm', 'mmP.mmm'], { P: { cell: 'stone', tag: 'target' } });
    battle.board.replaceActive('O');
    dig.untilRise = 1;
    const tags = structuredClone(battle.board.tags);
    battle.input('hardDrop');
    expect(dig.untilRise).toBe(ENCOUNTERS.elder.risingEvery);
    expect(battle.correctLastDrop()).toBe(true);
    expect(dig.untilRise).toBe(1);
    expect(battle.board.tags).toEqual(tags);
  });
  it('recovers from a fatal wobble without consuming the next authored piece', () => {
    const battle = trial('kid');
    const build = battle.challenge as BuildChallenge;
    build.wobbles = ENCOUNTERS.kid.wobbleLimit;
    const piece = battle.board.active!.name;
    const next = battle.upcomingPieces;
    for (let i = 0; i < 10; i++) battle.input('right');
    battle.input('hardDrop');
    expect(battle.status).toBe('lost');
    expect(battle.canCorrect).toBe(true);
    expect(battle.correctionSuggested).toBe(true);
    expect(battle.correctLastDrop()).toBe(true);
    expect(battle.status).toBe('ongoing');
    expect(build.wobbles).toBe(ENCOUNTERS.kid.wobbleLimit);
    expect(battle.board.active?.name).toBe(piece);
    expect(battle.upcomingPieces).toEqual(next);
  });
  it('can return the last authored piece after queue exhaustion, but cannot extend the queue twice', () => {
    const battle = trial('kid');
    battle.board.setFixedQueue([]);
    const name = battle.board.active!.name;
    battle.input('hardDrop');
    expect(battle.board.active).toBeNull();
    expect(battle.board.checkpointLock()).toBeNull();
    expect(battle.status).toBe('lost');
    expect(battle.correctLastDrop()).toBe(true);
    expect(battle.board.active?.name).toBe(name);
    expect(battle.board.piecesRemaining).toBe(1);
    battle.input('hardDrop');
    expect(battle.status).toBe('lost');
    expect(battle.correctLastDrop()).toBe(false);
  });

  it('does not rewind the demonstration, a victory, a give-up, or other encounters', () => {
    const demo = trial('kid', true);
    while (demo.demoPlaying) demo.update(50);
    expect(demo.correctLastDrop()).toBe(false);
    const won = trial('elder');
    won.board.loadRows(['mP...mm'], { P: { cell: 'stone', tag: 'target' } });
    won.board.replaceActive('T');
    won.input('right');
    won.input('hardDrop');
    expect(won.status).toBe('won');
    expect(won.correctLastDrop()).toBe(false);
    const givenUp = trial('kid');
    givenUp.input('hardDrop');
    givenUp.giveUp();
    expect(givenUp.correctLastDrop()).toBe(false);
    const other = trial('farmer');
    other.input('hardDrop');
    expect(other.correctLastDrop()).toBe(false);
  });
});
