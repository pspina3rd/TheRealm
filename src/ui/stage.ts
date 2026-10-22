import type { Battle } from '../battle/battle';
import type { CombatChallenge } from '../battle/combat';
import type { Objective } from '../battle/types';
import type { Atlas } from './art/atlas';
import { CREATURES, battleFrame, mapFrame, type CreatureId } from './art/creatures';
import { ELEMENT_COLOR_OF, type Feedback, type Target } from './art/feedback';
import { ELEMENT_ICONS, ICON_SIZE, type IconId } from './art/icons';
import { effectDuration, effectFrame, type EffectId } from './art/vfx';
import { drawCount } from './boardView';
import { drawIcon } from './iconDraw';

const FLOAT_MS = 1000;
const POP_MS = 800;
const BANNER_MS = 1300;
const SHAKE_MS = 320;
const DEFEAT_MS = 700;
const EFFECT_SIZE = 128;

/** Where things are drawn on the 480×240 stage. */
const LAYOUT = {
  enemy: { x: 300, baseline: 226 },
  hero: { x: 78, baseline: 236 },
  bar: { x: 220, y: 14, w: 200, h: 10 },
} as const;

interface Floating {
  readonly target: Target;
  readonly text: string;
  readonly color: string;
  readonly icon: IconId | undefined;
  readonly offset: number;
  elapsed: number;
}

interface Timed<T> {
  readonly value: T;
  elapsed: number;
}

/**
 * The battle stage: your opponent large and animated, the hero seen from
 * behind, and everything that happens between them drawn as pictures:
 * HP bar, weakness and resistance icons, the enemy's turn pips, floating
 * numbers, spell effects and move banners. Non-combat challenges draw
 * their goal (crystals wanted, price gauge, score or lines) instead.
 */
export class Stage {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly atlas: Atlas;
  private opponent: CreatureId | null = null;
  private hero: CreatureId | null = null;
  private floats: Floating[] = [];
  private effects: Timed<{ id: EffectId; target: Target }>[] = [];
  private pops: Timed<{ icon: IconId; target: Target }>[] = [];
  private banner: Timed<string> | null = null;
  private shakes: Partial<Record<Target, number>> = {};
  private defeat: number | null = null;

  constructor(canvas: HTMLCanvasElement, atlas: Atlas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not supported');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.atlas = atlas;
  }

  show(opponent: CreatureId | null, hero: CreatureId): void {
    this.opponent = opponent;
    this.hero = hero;
    this.floats = [];
    this.effects = [];
    this.pops = [];
    this.banner = null;
    this.shakes = {};
    this.defeat = null;
  }

  play(feedback: Feedback): void {
    switch (feedback.kind) {
      case 'float': {
        const stacked = this.floats.filter(
          (f) => f.target === feedback.target && f.elapsed < 250,
        ).length;
        this.floats.push({ ...feedback, icon: feedback.icon, offset: stacked * 22, elapsed: 0 });
        break;
      }
      case 'vfx':
        this.effects.push({ value: { id: feedback.effect, target: feedback.target }, elapsed: 0 });
        break;
      case 'icon':
        if (feedback.target !== 'board')
          this.pops.push({ value: { icon: feedback.icon, target: feedback.target }, elapsed: 0 });
        break;
      case 'banner':
        this.banner = { value: feedback.text, elapsed: 0 };
        break;
      case 'shake':
        this.shakes[feedback.target] = SHAKE_MS;
        break;
      case 'defeat':
        this.defeat = 0;
        break;
      default:
        break;
    }
  }

  render(battle: Battle, dtMs: number, timeMs: number): void {
    const { ctx } = this;
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    for (const key of Object.keys(this.shakes) as Target[]) {
      this.shakes[key] = Math.max(0, (this.shakes[key] ?? 0) - dtMs);
    }

    this.drawHero(timeMs);
    this.drawOpponent(dtMs, timeMs);
    const combat = battle.combat;
    if (combat) this.drawEnemyStatus(combat, timeMs);
    else this.drawObjective(battle.objective);
    this.drawEffects(dtMs);
    this.drawPops(dtMs);
    this.drawFloats(dtMs);
    this.drawBanner(dtMs);
  }

  private shakeOffset(target: Target, timeMs: number): number {
    const left = this.shakes[target] ?? 0;
    return left > 0 ? Math.sin(timeMs / 16) * 6 * (left / SHAKE_MS) : 0;
  }

  private anchor(target: Target): { x: number; y: number } {
    return target === 'hero'
      ? { x: LAYOUT.hero.x, y: LAYOUT.hero.baseline - 70 }
      : { x: LAYOUT.enemy.x, y: 120 };
  }

  private drawHero(timeMs: number): void {
    if (!this.hero) return;
    const region = mapFrame(this.hero, 'up', false, timeMs);
    const scale = 2;
    const x = LAYOUT.hero.x - (region.w * scale) / 2 + this.shakeOffset('hero', timeMs);
    this.atlas.draw(
      this.ctx,
      region,
      Math.round(x),
      LAYOUT.hero.baseline - region.h * scale,
      region.w * scale,
      region.h * scale,
    );
  }

  private drawOpponent(dtMs: number, timeMs: number): void {
    if (!this.opponent) return;
    const region = battleFrame(this.opponent, timeMs);
    const scale = CREATURES[this.opponent].battleScale;
    const w = region.w * scale;
    const h = region.h * scale;
    const { ctx } = this;
    ctx.save();
    if (this.defeat !== null) {
      this.defeat += dtMs;
      const t = Math.min(1, this.defeat / DEFEAT_MS);
      ctx.globalAlpha = 1 - t;
      ctx.filter = `brightness(${1 + t * 2})`;
    }
    const x = LAYOUT.enemy.x - w / 2 + this.shakeOffset('enemy', timeMs);
    this.atlas.draw(ctx, region, Math.round(x), Math.round(LAYOUT.enemy.baseline - h), w, h);
    ctx.restore();
  }

  /** HP bar, weakness/resistance icons and turn pips above the enemy. */
  private drawEnemyStatus(combat: CombatChallenge, timeMs: number): void {
    const { ctx } = this;
    const { x, y, w, h } = LAYOUT.bar;
    const ratio = Math.max(0, combat.enemyHp) / combat.enemy.hp;
    ctx.fillStyle = '#090b15';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = ratio > 0.5 ? '#6ff08f' : ratio > 0.25 ? '#f5d77b' : '#ff5c7a';
    ctx.fillRect(x, y, Math.round(w * ratio), h);

    // Weaknesses (green ▲ then elements) and resistances (red ▼ then elements).
    let ix = x;
    const iconY = y + h + 8;
    for (const [list, mark] of [
      [combat.enemy.weak, 'weak'],
      [combat.enemy.resist, 'resist'],
    ] as const) {
      if (list.length === 0) continue;
      ctx.fillStyle = '#10132acc';
      ctx.fillRect(ix - 3, iconY - 3, 26 * (list.length + 1) + 4, 30);
      drawIcon(ctx, mark, ix, iconY, { scale: 2 });
      ix += 26;
      for (const element of list) {
        drawIcon(ctx, ELEMENT_ICONS[element], ix, iconY, { scale: 2 });
        ix += 26;
      }
      ix += 12;
    }

    // Turn pips: one per action until the enemy acts; the last one pulses.
    const pips = combat.countdown;
    for (let i = 0; i < pips; i++) {
      const px = x + w - 10 - i * 14;
      const urgent = pips === 1;
      const pulse = urgent ? 0.5 + 0.5 * Math.sin(timeMs / 90) : 1;
      ctx.fillStyle = urgent ? `rgba(255, 92, 122, ${pulse})` : '#f5d77b';
      ctx.beginPath();
      ctx.arc(px, iconY + 12, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (combat.ward > 0) {
      drawIcon(ctx, 'ward', LAYOUT.hero.x + 30, LAYOUT.hero.baseline - 100, { scale: 2 });
      drawCount(ctx, combat.ward, LAYOUT.hero.x + 58, LAYOUT.hero.baseline - 80);
    }
  }

  /** The goal of a non-combat challenge, drawn as meters and icons. */
  private drawObjective(objective: Objective): void {
    const { ctx } = this;
    const { x, y, w } = LAYOUT.bar;
    const meter = (row: number, ratio: number, color: string, label: string): void => {
      const top = y + row * 30;
      ctx.fillStyle = '#090b15';
      ctx.fillRect(x + 30, top + 4, w - 30, 14);
      ctx.fillStyle = color;
      ctx.fillRect(x + 30, top + 4, Math.round((w - 30) * Math.min(1, ratio)), 14);
      ctx.font = 'bold 13px system-ui';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText(label, x + w - 4, top + 16);
    };

    objective.crystals?.forEach((goal, row) => {
      drawIcon(ctx, ELEMENT_ICONS[goal.element], x, y + row * 30, { scale: 2 });
      meter(
        row,
        goal.have / goal.want,
        ELEMENT_COLOR_OF[goal.element],
        `${goal.have}/${goal.want}`,
      );
    });
    if (objective.score) {
      meter(
        0,
        objective.score.have / objective.score.want,
        '#f5d77b',
        `${objective.score.have}/${objective.score.want}`,
      );
    }
    if (objective.lines) {
      for (let i = 0; i < objective.lines.want; i++) {
        ctx.fillStyle = i < objective.lines.have ? '#61d9e8' : '#2a2f4d';
        ctx.fillRect(x + 30 + i * 36, y + 4, 30, 12);
      }
    }
    if (objective.price) {
      // A gauge from the best price (left, green) to the worst (right, red).
      const { value, min, max } = objective.price;
      const gradient = ctx.createLinearGradient(x, 0, x + w, 0);
      gradient.addColorStop(0, '#6ff08f');
      gradient.addColorStop(0.5, '#f5d77b');
      gradient.addColorStop(1, '#ff5c7a');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y + 4, w, 12);
      const marker = x + ((value - min) / (max - min)) * w;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(marker) - 2, y - 2, 4, 24);
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(value * 100)}%`, marker, y + 36);
    }
    // Pieces left, as small pips along the bottom of the goal area.
    if (objective.piecesLeft !== null && Number.isFinite(objective.piecesLeft)) {
      const rows = objective.crystals?.length ?? 1;
      const top = y + rows * 30 + (objective.price ? 30 : 6);
      for (let i = 0; i < objective.piecesLeft; i++) {
        ctx.fillStyle = '#aeb6d7';
        ctx.fillRect(x + (i % 20) * 10, top + Math.floor(i / 20) * 10, 7, 7);
      }
    }
  }

  private drawEffects(dtMs: number): void {
    this.effects = this.effects.filter((effect) => {
      effect.elapsed += dtMs;
      const frame = effectFrame(effect.value.id, effect.elapsed);
      if (frame) {
        const { x, y } = this.anchor(effect.value.target);
        this.atlas.draw(
          this.ctx,
          frame,
          x - EFFECT_SIZE / 2,
          y - EFFECT_SIZE / 2,
          EFFECT_SIZE,
          EFFECT_SIZE,
        );
      }
      return effect.elapsed < effectDuration(effect.value.id);
    });
  }

  private drawPops(dtMs: number): void {
    this.pops = this.pops.filter((pop) => {
      pop.elapsed += dtMs;
      const t = pop.elapsed / POP_MS;
      if (t >= 1) return false;
      const { x, y } = this.anchor(pop.value.target);
      const size = ICON_SIZE * 3;
      drawIcon(this.ctx, pop.value.icon, x - size / 2, y - size / 2 - t * 40, {
        scale: 3,
        alpha: 1 - t * t,
      });
      return true;
    });
  }

  private drawFloats(dtMs: number): void {
    const { ctx } = this;
    this.floats = this.floats.filter((float) => {
      float.elapsed += dtMs;
      const t = float.elapsed / FLOAT_MS;
      if (t >= 1) return false;
      const { x, y } = this.anchor(float.target);
      // Pop in big, then drift up and fade.
      const size = t < 0.12 ? 34 - t * 60 : 26;
      const py = y - 30 - float.offset - t * 36;
      ctx.globalAlpha = t < 0.75 ? 1 : (1 - t) / 0.25;
      ctx.font = `900 ${Math.round(size)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#10132a';
      ctx.strokeText(float.text, x, py);
      ctx.fillStyle = float.color;
      ctx.fillText(float.text, x, py);
      if (float.icon) {
        const width = ctx.measureText(float.text).width;
        drawIcon(ctx, float.icon, x + width / 2 + 4, py - 20, { scale: 2 });
      }
      ctx.globalAlpha = 1;
      return true;
    });
  }

  private drawBanner(dtMs: number): void {
    if (!this.banner) return;
    this.banner.elapsed += dtMs;
    const t = this.banner.elapsed / BANNER_MS;
    if (t >= 1) {
      this.banner = null;
      return;
    }
    const { ctx } = this;
    const { width } = ctx.canvas;
    ctx.globalAlpha = t < 0.1 ? t / 0.1 : t > 0.8 ? (1 - t) / 0.2 : 1;
    const top = 84;
    ctx.fillStyle = '#10132ae6';
    ctx.fillRect(width / 2 - 110, top, 220, 30);
    ctx.strokeStyle = '#f5d77b';
    ctx.strokeRect(width / 2 - 110 + 0.5, top + 0.5, 219, 29);
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.banner.value, width / 2, top + 21);
    ctx.globalAlpha = 1;
  }
}
