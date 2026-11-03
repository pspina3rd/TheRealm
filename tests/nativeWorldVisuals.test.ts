import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/data/maps';
import { SURFACE_CENTER } from '../src/data/surfaceLayout';
import { serialize } from '../src/game/save';
import { newRecord } from '../src/game/stakes';
import { campaignDispatch } from '../src/native/campaign';
import { nativeCamera, nativeWorldViewport, worldSnapshot } from '../src/native/world';
import { newGame, travel } from '../src/world/state';

function send(command: Record<string, unknown>) {
  const result = JSON.parse(campaignDispatch(JSON.stringify(command)));
  expect(result.ok, result.error).toBe(true);
  return result.state;
}

describe('native world visual parity', () => {
  it('shows authored inspection and attitude artwork in the actual opening', () => {
    const state = newGame();
    const view = worldSnapshot(state, { width: 416, height: 900 });
    const eyes = view.sprites.filter((sprite) => sprite.id.startsWith('inspect:'));
    expect(eyes.length).toBeGreaterThan(0);
    for (const eye of eyes) {
      expect(eye.source).toBe('native-visuals/icon-eye.png');
      expect([eye.width, eye.height, eye.alpha]).toEqual([24, 24, 0.85]);
    }
    expect(view.sprites.some((sprite) => sprite.id.startsWith('attitude:'))).toBe(true);
    expect(view.decorations.some((decoration) => decoration.id.startsWith('waymark:'))).toBe(true);
  });

  it('keeps task-gated paths locked until their actual authored requirement is earned', () => {
    const map = Object.values(MAPS).find((candidate) => candidate.passages?.length);
    expect(map).toBeDefined();
    const passage = map!.passages![0]!;
    const state = newGame();
    travel(state, { map: map!.id, x: passage.x, y: passage.y });
    const before = worldSnapshot(state);
    expect(
      before.sprites.find((sprite) => sprite.id === `gate-icon:${passage.mentorId}`)?.source,
    ).toBe('native-visuals/icon-lock.png');
    expect(
      before.decorations.find((decoration) => decoration.id === `gate-label:${passage.mentorId}`)
        ?.text,
    ).toMatch(/^Help /);
    state.flags.add(passage.requiresFlag);
    const after = worldSnapshot(state);
    expect(
      after.sprites.find((sprite) => sprite.id === `gate-icon:${passage.mentorId}`)?.source,
    ).toBe('native-visuals/icon-boot.png');
    expect(
      after.decorations.find((decoration) => decoration.id === `gate-label:${passage.mentorId}`)
        ?.text,
    ).toMatch(/ →$/);
  });

  it('uses shared saved outcome art rather than inventing new native prop drawings', () => {
    const state = newGame();
    travel(state, { map: 'mossvale', x: 11, y: 12 });
    state.flags.add('npc:elder');
    expect(
      worldSnapshot(state).sprites.find((sprite) => sprite.id === 'feedback:elder')?.source,
    ).toBe('native-visuals/world-elder-win.png');
    const marker = worldSnapshot(
      state,
      { width: 416, height: 900 },
      { x: 18, y: 24 },
    ).decorations.find((decoration) => decoration.id === 'walk-target');
    expect(marker?.stroke).toBe('#f5d77b');
    expect(marker?.width).toBe(26);
  });

  it('preserves the shared standing stone palette and earned nature light', () => {
    const state = newGame();
    travel(state, { map: 'overworld', ...SURFACE_CENTER });
    const before = worldSnapshot(state);
    expect(before.markers.find((marker) => marker.element === 'nature')).toMatchObject({
      color: '#72e6a2',
      lit: false,
    });
    state.encounters.forager = { ...newRecord(), wins: 1 };
    expect(worldSnapshot(state).markers.find((marker) => marker.element === 'nature')?.lit).toBe(
      true,
    );
  });

  it('keeps the actual non-square chest artwork and its authored foot baseline', () => {
    const state = newGame();
    travel(state, { map: 'caves1', x: 17, y: 11 });
    const view = worldSnapshot(state);
    const chest = view.sprites.find((sprite) => sprite.id === 'actor:c1-chest');
    expect(chest).toBeDefined();
    expect([chest!.width, chest!.height]).toEqual([28, 26]);
    expect(chest!.x + view.camX).toBe(17 * 32 + 2);
    expect(chest!.y + view.camY).toBe(11 * 32 + 8);
  });

  it('fits a tall phone viewport without changing a saved adventure', () => {
    const state = newGame();
    const save = serialize(state);
    send({ type: 'load', save });
    const viewport = send({ type: 'viewport', width: 416, height: 900 });
    expect(viewport.world).toMatchObject({ width: 416, height: 900 });
    expect(viewport.save).toBeNull();
    expect([viewport.world.heroX, viewport.world.heroY]).toEqual([state.x, state.y]);
    expect(nativeCamera(10, 832, 900)).toBe(-34);
    expect(nativeWorldViewport(Infinity, NaN)).toEqual({ width: 416, height: 640 });
    expect(send({ type: 'snapshot' }).world).toEqual(viewport.world);
    send({ type: 'viewport', width: 416, height: 640 });
  });
});
