import { describe, expect, it } from 'vitest';
import { HOMETOWNS } from '../src/data/hometowns';
import { SURFACE_CENTER, SURFACE_STONES } from '../src/data/surfaceLayout';
import { worldSnapshot } from '../src/native/world';
import { newGame, travel } from '../src/world/state';

describe('retained native world rendering', () => {
  for (const home of HOMETOWNS)
    it(`${home.name} provides unique stable sprite identities`, () => {
      const game = newGame(home.classId);
      const first = worldSnapshot(game);
      const repeat = worldSnapshot(game);
      expect(first.sprites.length).toBeGreaterThan(100);
      expect(new Set(first.sprites.map((sprite) => sprite.id)).size).toBe(first.sprites.length);
      expect(repeat).toEqual(first);
      expect(first.sprites.filter((sprite) => sprite.id === 'hero')).toHaveLength(1);
      expect(first.background).toMatch(/^#[0-9a-f]{6}$/i);
    });

  it('keeps static node positions fixed in world space when the camera moves', () => {
    const game = newGame();
    const first = worldSnapshot(game);
    game.x--;
    const second = worldSnapshot(game);
    expect(second.camX).toBe(first.camX - 32);
    const old = new Map(first.sprites.map((sprite) => [sprite.id, sprite]));
    const staticShared = second.sprites.filter(
      (sprite) =>
        old.has(sprite.id) && (sprite.id.startsWith('ground:') || sprite.id.startsWith('prop:')),
    );
    expect(staticShared.length).toBeGreaterThan(100);
    for (const sprite of staticShared) {
      const previous = old.get(sprite.id)!;
      expect(sprite.x + second.camX).toBe(previous.x + first.camX);
      expect(sprite.y + second.camY).toBe(previous.y + first.camY);
      expect([sprite.source, sprite.sx, sprite.sy, sprite.sw, sprite.sh]).toEqual([
        previous.source,
        previous.sx,
        previous.sy,
        previous.sw,
        previous.sh,
      ]);
    }
    // Retain art outside the current camera so an animated step never exposes a blank edge.
    expect(second.sprites.some((sprite) => sprite.x < -32)).toBe(true);
    expect(second.sprites.some((sprite) => sprite.x >= second.width + 32)).toBe(true);
  });

  it('retains the seven standing stones in the native world payload', () => {
    const game = newGame();
    travel(game, { map: 'overworld', ...SURFACE_CENTER });
    const world = worldSnapshot(game);
    expect(world.markers).toHaveLength(7);
    expect(new Set(world.markers.map((marker) => marker.element)).size).toBe(7);
    for (const marker of world.markers) {
      const stone = SURFACE_STONES.find((point) => point.element === marker.element)!;
      expect(marker.x + world.camX).toBe(stone.x * 32 + 16);
      expect(marker.y + world.camY).toBe(stone.y * 32 + 16);
    }
  });
});
