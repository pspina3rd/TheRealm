import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { campaignDispatch } from '../src/native/campaign';
import { dispatch, currentNativeBattle } from '../src/nativeBattle';
import { newGame } from '../src/world/state';
import { serialize, deserialize } from '../src/game/save';
import { MENTORS } from '../src/data/mentors';
import { MAPS } from '../src/data/maps';
import { tileAt, type Direction } from '../src/world/map';
import { HOMETOWNS } from '../src/data/hometowns';
import { SURFACE_CENTER } from '../src/data/surfaceLayout';
import { travel } from '../src/world/state';

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
    it(`${home.name} keeps real place names while following a mentor route out of the sanctuary`, () => {
      const source = newGame(home.classId);
      source.flags.add('scene:opening');
      source.flags.add('scene:refusal');
      travel(source, { map: 'overworld', ...SURFACE_CENTER });
      send({ type: 'load', save: serialize(source) });
      const before = deserialize(send({ type: 'checkpoint' }).save)!;
      let state = choose(send({ type: 'menu' }), 'World map');
      state = choose(state, 'Thornwood Grove · Nature — Hazel');
      expect(state.panel.text).toContain('south gate');
      expect(state.panel.text).toContain('Mossvale');
      if (home.map !== 'mossvale') expect(state.panel.text).not.toContain(home.name);
      expect(
        state.overview.sites.some((site: { name: string }) => site.name === '◆ Thornwood Grove'),
      ).toBe(true);
      expect(deserialize(send({ type: 'checkpoint' }).save)?.flags).toEqual(before.flags);
      state = choose(state, 'Walk this part of the route');
      expect(state.walking).toBe(true);
      for (let steps = 0; state.walking && steps < 200; steps++) state = send({ type: 'walkStep' });
      const loaded = deserialize(send({ type: 'checkpoint' }).save)!;
      expect(loaded.mapId).toBe('mossvale');
      expect(loaded.hero).toEqual(source.hero);
      expect(loaded.flags.has('ridgeCleared')).toBe(false);
      expect(loaded.flags.has('peakGate')).toBe(false);
      expect(loaded.x).toBe(20);
      expect(loaded.y).toBe(1);
    });
  for (const home of HOMETOWNS)
    it(`opens ${home.name} with the shared story and zero spells`, () => {
      let state = send({ type: 'start', classId: home.classId });
      expect(state.mapId).toBe(home.map);
      expect(state.panel).not.toBeNull();
      for (let guard = 0; state.panel && guard < 30; guard++)
        state = send({
          type: 'action',
          id:
            state.panel.actions.find(
              (a: { label: string }) =>
                a.label === 'Next page' || a.label === 'Return to the world',
            )?.id ?? state.panel.actions[0].id,
        });
      expect(state.panel).toBeNull();
      const saved = send({ type: 'checkpoint' }).save;
      expect(deserialize(saved)?.hero.spells).toEqual({});
      expect(deserialize(saved)?.flags.has('boardMagicEnabled')).toBe(true);
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
  it('uses an item from a paused native battle without leaving the controls stuck', () => {
    const fixtureState = fixture(),
      map = MAPS.grove!;
    const foe = map.entities.find((entity) => entity.kind === 'monster')!;
    const approach = (
      [
        [0, 1, 'up'],
        [0, -1, 'down'],
        [1, 0, 'left'],
        [-1, 0, 'right'],
      ] as const
    ).find(([dx, dy]) => tileAt(map, foe.x + dx, foe.y + dy).walkable)!;
    fixtureState.mapId = 'grove';
    fixtureState.x = foe.x + approach[0];
    fixtureState.y = foe.y + approach[1];
    fixtureState.hero.items.herb = 1;
    fixtureState.hero.hp = 1;
    send({ type: 'load', save: serialize(fixtureState) });
    let state = send({ type: 'move', direction: approach[2] as Direction });
    expect(state.mode).toBe('battle');
    state = send({ type: 'battleMenu' });
    const item = state.panel.actions.find((a: { label: string }) => a.label === 'Use Herb');
    expect(item).toBeDefined();
    state = send({ type: 'action', id: item.id });
    expect(state.panel).toBeNull();
    expect(currentNativeBattle()?.hero.hp).toBeGreaterThan(1);
    const battle = JSON.parse(dispatch(JSON.stringify({ type: 'snapshot' }))).state;
    expect(battle.ready).toBe(false);
  });
  it('lets the player keep or give a mentor item instead of consuming it on contact', () => {
    const source = fixture(),
      stop = MENTORS.hazel!.route[0];
    source.mapId = stop.map;
    source.hero.items.sporeCap = 1;
    const map = MAPS[stop.map]!;
    const approach = (
      [
        [0, 1, 'up'],
        [0, -1, 'down'],
        [1, 0, 'left'],
        [-1, 0, 'right'],
      ] as const
    ).find(([dx, dy]) => tileAt(map, stop.x + dx, stop.y + dy).walkable)!;
    source.x = stop.x + approach[0];
    source.y = stop.y + approach[1];
    send({ type: 'load', save: serialize(source) });
    let state = send({ type: 'move', direction: approach[2] });
    expect(JSON.parse(state.save).hero.items.sporeCap).toBe(1);
    state = choose(state, 'Keep');
    expect(JSON.parse(state.save).hero.items.sporeCap).toBe(1);
    send({ type: 'load', save: serialize(source) });
    state = send({ type: 'move', direction: approach[2] });
    state = choose(state, 'Give');
    expect(JSON.parse(state.save).hero.items.sporeCap).toBeUndefined();
  });
  it('marks only the selected alternative hometown on the native overview', () => {
    send({ type: 'start', classId: 'mage' });
    for (let i = 0; i < 30; i++) {
      const next = send({ type: 'snapshot' });
      if (!next.panel) break;
      send({
        type: 'action',
        id:
          next.panel.actions.find(
            (a: { label: string }) => a.label === 'Next page' || a.label === 'Return to the world',
          )?.id ?? next.panel.actions[0].id,
      });
    }
    const state = choose(send({ type: 'menu' }), 'World map');
    const names = state.overview.sites.map((site: { name: string }) => site.name);
    expect(names).toContain('Merehaven');
    expect(names).toContain('Mossvale');
    expect(names).not.toContain('Cairnwick');
    expect(names).not.toContain('Bramblecross');
  });
  it('skips the opening safely and never grants a spell or the Focus Stone', () => {
    const opened = send({ type: 'start', classId: 'ranger' });
    expect(opened.panel.tome.action).toBe('stones');
    const next = choose(opened, 'Skip scene'),
      save = JSON.parse(next.save);
    expect(next.panel).toBeNull();
    expect(save.hero.spells).toEqual({});
    expect(save.flags).toContain('scene:opening');
    expect(save.flags).not.toContain('got:wellStone');
  });
  it('finishes an earned skipped gift scene once without skipping its gameplay requirements', () => {
    const source = fixture();
    source.flags.add('npc:elder');
    source.flags.add('opening:houseVisited');
    const opened = send({ type: 'load', save: serialize(source) });
    expect(opened.panel.tome.id).toBe('refusal:0');
    const next = choose(opened, 'Skip scene'),
      saved = JSON.parse(next.save);
    expect(saved.hero.items.wellStone).toBe(1);
    send({ type: 'load', save: next.save });
    expect(JSON.parse(send({ type: 'checkpoint' }).save).hero.items.wellStone).toBe(1);
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
