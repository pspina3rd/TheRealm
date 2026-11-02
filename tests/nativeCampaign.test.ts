import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { campaignDispatch } from '../src/native/campaign';
import { dispatch, currentNativeBattle } from '../src/nativeBattle';
import { newGame } from '../src/world/state';
import { serialize, deserialize } from '../src/game/save';
import { HOMETOWNS } from '../src/data/hometowns';

function send(r: Record<string, unknown>) {
  const response = JSON.parse(campaignDispatch(JSON.stringify(r)));
  if (!response.ok) throw new Error(response.error);
  return response.state;
}
function choose(state: ReturnType<typeof send>, label: string) {
  const choice = state.panel?.actions.find((a: { label: string }) => a.label === label);
  expect(choice, label).toBeDefined();
  return send({ type: 'action', id: choice.id });
}
function fixture(x = 18, y = 20) {
  const state = newGame();
  state.flags.add('scene:opening');
  state.x = x;
  state.y = y;
  return state;
}

describe('native campaign boundary', () => {
  for (const home of HOMETOWNS)
    it(`opens ${home.name} with the shared story and zero spells`, () => {
      let state = send({ type: 'start', classId: home.classId });
      expect(state.mapId).toBe(home.map);
      expect(state.panel).not.toBeNull();
      for (let guard = 0; state.panel && guard < 30; guard++)
        state = send({ type: 'action', id: state.panel.actions[0].id });
      expect(state.panel).toBeNull();
      const saved = send({ type: 'checkpoint' }).save;
      expect(deserialize(saved)?.hero.spells).toEqual({});
      expect(state.world.sprites.length).toBeGreaterThan(100);
      for (const sprite of state.world.sprites)
        expect(existsSync(`public/assets/${sprite.source}`)).toBe(true);
    });
  it('uses collision-aware tap paths and opens the authored house interaction', () => {
    send({ type: 'load', save: serialize(fixture(5, 7)) });
    let state = send({ type: 'walkTo', x: 5, y: 6 });
    for (let guard = 0; state.walking && guard < 100; guard++) state = send({ type: 'walkStep' });
    expect(state.panel?.text.length).toBeGreaterThan(0);
    expect(deserialize(state.save)?.flags.has('opening:houseVisited')).toBe(true);
  });
  it('rejects old dialog actions and cannot start a new hero with a stale choice', () => {
    const first = send({ type: 'start', classId: 'ranger' });
    const old = first.panel.actions[0].id;
    send({ type: 'start', classId: 'mage' });
    expect(JSON.parse(campaignDispatch(JSON.stringify({ type: 'action', id: old }))).ok).toBe(
      false,
    );
  });
  it('hands the actual well puzzle to native controls, commits the first move, and settles a loss', () => {
    send({ type: 'load', save: serialize(fixture(12, 13)) });
    let state = send({ type: 'move', direction: 'up' });
    expect(state.panel.title).toContain('Rowan');
    state = choose(state, 'Begin');
    expect(state.mode).toBe('battle');
    const battle = JSON.parse(dispatch(JSON.stringify({ type: 'snapshot' }))).state;
    expect(battle.width).toBe(7);
    expect(battle.tags.flat().some(Boolean)).toBe(true);
    expect(deserialize(send({ type: 'checkpoint' }).save)?.pendingAttempt).toBeNull();
    dispatch(JSON.stringify({ type: 'begin' }));
    for (let i = 0; i < 100 && currentNativeBattle()?.demoPlaying; i++)
      dispatch(JSON.stringify({ type: 'step', ms: 100 }));
    const ready = JSON.parse(dispatch(JSON.stringify({ type: 'snapshot' }))).state;
    dispatch(JSON.stringify({ type: 'input', action: 'left', pieceID: ready.pieceID }));
    expect(JSON.parse(send({ type: 'checkpoint' }).save).pendingAttempt?.kind).toBe('encounter');
    currentNativeBattle()!.giveUp();
    state = send({ type: 'finishBattle' });
    expect(state.mode).toBe('world');
    expect(deserialize(state.save)?.pendingAttempt).toBeNull();
    expect(deserialize(state.save)?.flags.has('got:wellStone')).toBe(false);
  });
  it('saves before returning to title and reloads the same position', () => {
    send({ type: 'load', save: serialize(fixture(18, 22)) });
    let state = send({ type: 'menu' });
    state = choose(state, 'Save and return to title');
    expect(state.mode).toBe('title');
    expect(state.save).toBeTruthy();
    state = send({ type: 'load', save: state.save });
    expect(state.world.heroY).toBe(22);
  });
  it('runs the committed offline bundle without DOM or browser globals', () => {
    const context = vm.createContext({});
    vm.runInContext(
      readFileSync('ios/ManaCrystalsPlaytest/Engine/battle-engine.js', 'utf8'),
      context,
    );
    const result = JSON.parse(
      vm.runInContext(
        `ManaCrystalsNative.campaignDispatch('{"type":"start","classId":"ranger"}')`,
        context,
      ),
    );
    expect(result.ok).toBe(true);
    expect(result.state.mapId).toBe('mossvale');
  });
});
