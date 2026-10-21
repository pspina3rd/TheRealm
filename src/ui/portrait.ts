import type { Atlas } from './art/atlas';
import { CREATURES, battleFrame, type CreatureId } from './art/creatures';
import { effectDuration, effectFrame, type EffectId } from './art/vfx';

/** Pixel size effects are scaled up to over the portrait. */
const EFFECT_SIZE = 128;
const SHAKE_MS = 300;
const SHAKE_PX = 6;

interface PlayingEffect {
  readonly id: EffectId;
  elapsed: number;
}

/**
 * The battle portrait: the opponent drawn large and animated, shaking when
 * hit, with spell effects played over it.
 */
export class Portrait {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly atlas: Atlas;
  private creature: CreatureId | null = null;
  private effects: PlayingEffect[] = [];
  private shake = 0;

  constructor(canvas: HTMLCanvasElement, atlas: Atlas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not supported');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.atlas = atlas;
  }

  show(creature: CreatureId | null): void {
    this.creature = creature;
    this.effects = [];
    this.shake = 0;
  }

  play(effect: EffectId): void {
    this.effects.push({ id: effect, elapsed: 0 });
  }

  /** Shakes the portrait, e.g. when the opponent takes damage. */
  hit(): void {
    this.shake = SHAKE_MS;
    this.play('hit');
  }

  render(dtMs: number, timeMs: number): void {
    const { ctx } = this;
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    this.shake = Math.max(0, this.shake - dtMs);
    const offset = this.shake > 0 ? Math.sin(timeMs / 20) * SHAKE_PX * (this.shake / SHAKE_MS) : 0;

    if (this.creature) {
      const region = battleFrame(this.creature, timeMs);
      const scale = CREATURES[this.creature].battleScale;
      const w = region.w * scale;
      const h = region.h * scale;
      this.atlas.draw(
        ctx,
        region,
        Math.round((width - w) / 2 + offset),
        Math.round(height - h - 4),
        w,
        h,
      );
    }

    this.effects = this.effects.filter((effect) => {
      effect.elapsed += dtMs;
      const frame = effectFrame(effect.id, effect.elapsed);
      if (frame) {
        const x = (width - EFFECT_SIZE) / 2;
        const y = (height - EFFECT_SIZE) / 2 + 10;
        this.atlas.draw(ctx, frame, x, y, EFFECT_SIZE, EFFECT_SIZE);
      }
      return effect.elapsed < effectDuration(effect.id);
    });
  }
}
