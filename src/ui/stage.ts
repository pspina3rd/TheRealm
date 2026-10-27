import type { Battle } from '../battle/battle';
import type { CombatChallenge } from '../battle/combat';
import type { Objective } from '../battle/types';
import type { Atlas } from './art/atlas';
import { CREATURES, battleFrame, mapFrame, type CreatureId } from './art/creatures';
import { ELEMENT_COLOR_OF, type Feedback, type Target } from './art/feedback';
import type { Element } from '../core/elements';
import type { Region } from './art/images';
import {
  ELEMENT_ICONS,
  ICON_SIZE,
  MOVE_ICONS,
  SPELL_KIND_ICONS,
  type IconId,
  type IconSpec,
} from './art/icons';
import { effectDuration, effectFrame, type EffectId } from './art/vfx';
import { drawCount } from './boardView';
import { drawIcon, drawIconSpec } from './iconDraw';
import { seesEnemyMove } from '../game/stats';
import { layOutBanner } from './art/bannerLayout';
import { PHONE_QUERY, reducedMotion } from './touch';

const FLOAT_MS = 1000;
const POP_MS = 800;
const BANNER_MS = 1300;
const SHAKE_MS = 320;
const DEFEAT_MS = 700;
const EFFECT_SIZE = 128;
const HOP_MS = 400;
const RUSH_MS = 450;

/** Extras for a lesson: the foe's colour wash, and the mentor fighting beside the hero. */
export interface StageOptions {
  readonly tint?: Element;
  readonly ally?: CreatureId | null;
  readonly allyElement?: Element;
  /** What the opponent says as the battle starts, shown as a banner. */
  readonly line?: string;
}

/** Where things are drawn on the stage. */
interface Layout {
  readonly height: number;
  readonly enemy: { readonly x: number; readonly baseline: number; readonly maxH: number };
  readonly hero: { readonly x: number; readonly baseline: number; readonly maxH: number };
  readonly ally: { readonly x: number; readonly baseline: number };
  readonly bar: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  /** Where effects and icons centre on each side. */
  readonly anchor: { readonly enemy: number; readonly hero: number };
  /** Baseline of a fresh floating number over the enemy: below its status, so they never overlap. */
  readonly enemyFloat: number;
  /** Running statuses: the first one's corner per side, and the step to the next. */
  readonly status: {
    readonly hero: { readonly x: number; readonly y: number };
    readonly step: { readonly x: number; readonly y: number };
  };
  readonly ward: { readonly x: number; readonly y: number };
  readonly bannerTop: number;
  readonly effectSize: number;
}

/** The desktop stage, 480×240: the hero bottom left, the enemy large on the right. */
const WIDE: Layout = {
  height: 240,
  enemy: { x: 300, baseline: 226, maxH: Infinity },
  hero: { x: 78, baseline: 236, maxH: 220 },
  ally: { x: 160, baseline: 232 },
  bar: { x: 220, y: 14, w: 200, h: 10 },
  anchor: { enemy: 120, hero: 166 },
  enemyFloat: 200,
  status: { hero: { x: 18, y: 106 }, step: { x: 0, y: 30 } },
  ward: { x: 108, y: 136 },
  bannerTop: 84,
  effectSize: EFFECT_SIZE,
};

/**
 * The phone strip, 480×150: the hero small at the left, the enemy's bars
 * and statuses in the middle, the enemy at the right.
 */
const STRIP: Layout = {
  height: 150,
  enemy: { x: 400, baseline: 146, maxH: 128 },
  hero: { x: 34, baseline: 146, maxH: 80 },
  ally: { x: 76, baseline: 146 },
  bar: { x: 136, y: 10, w: 186, h: 10 },
  anchor: { enemy: 84, hero: 100 },
  enemyFloat: 120,
  status: { hero: { x: 6, y: 6 }, step: { x: 54, y: 0 } },
  ward: { x: 54, y: 60 },
  bannerTop: 112,
  effectSize: 100,
};

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
 * HP bar, weakness and resistance icons, the enemy's action gauge, floating
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
  private options: StageOptions = {};
  /** Time since the ally last tossed a piece (they hop), or null. */
  private hop: number | null = null;
  private tintCanvas: HTMLCanvasElement | null = null;
  /** Time left of the gauge's flash after a mistake fed it. */
  private rushFlash = 0;
  private layout: Layout = WIDE;

  constructor(canvas: HTMLCanvasElement, atlas: Atlas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not supported');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.atlas = atlas;
    // Phones get a short strip so the board can take the screen.
    const phone = window.matchMedia(PHONE_QUERY);
    const fit = (): void => this.setLayout(phone.matches ? STRIP : WIDE);
    phone.addEventListener('change', fit);
    fit();
  }

  private setLayout(layout: Layout): void {
    this.layout = layout;
    const canvas = this.ctx.canvas;
    if (canvas.height === layout.height) return;
    canvas.height = layout.height; // resizing resets the context
    this.ctx.imageSmoothingEnabled = false;
  }

  show(opponent: CreatureId | null, hero: CreatureId, options: StageOptions = {}): void {
    this.opponent = opponent;
    this.hero = hero;
    this.options = options;
    this.hop = null;
    this.floats = [];
    this.effects = [];
    this.pops = [];
    this.banner = options.line ? { value: options.line, elapsed: 0 } : null;
    this.shakes = {};
    this.defeat = null;
    this.rushFlash = 0;
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
      case 'toss':
        this.hop = 0;
        break;
      case 'rush':
        this.rushFlash = RUSH_MS;
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

    this.drawAlly(dtMs, timeMs);
    this.drawHero(timeMs);
    this.drawOpponent(dtMs, timeMs, battle.combat?.enraged ?? false);
    const combat = battle.combat;
    this.rushFlash = Math.max(0, this.rushFlash - dtMs);
    if (combat) this.drawEnemyStatus(combat, seesEnemyMove(battle.hero.stats.insight), timeMs);
    else this.drawObjective(battle.objective);
    this.drawEffects(dtMs);
    this.drawPops(dtMs);
    this.drawFloats(dtMs);
    this.drawBanner(dtMs);
  }

  private shakeOffset(target: Target, timeMs: number): number {
    if (reducedMotion()) return 0;
    const left = this.shakes[target] ?? 0;
    return left > 0 ? Math.sin(timeMs / 16) * 6 * (left / SHAKE_MS) : 0;
  }

  private anchor(target: Target): { x: number; y: number } {
    const { anchor, hero, enemy } = this.layout;
    return target === 'hero' ? { x: hero.x, y: anchor.hero } : { x: enemy.x, y: anchor.enemy };
  }

  private drawHero(timeMs: number): void {
    if (!this.hero) return;
    const region = mapFrame(this.hero, 'up', false, timeMs);
    const { hero } = this.layout;
    const scale = Math.min(2, hero.maxH / region.h);
    const x = hero.x - (region.w * scale) / 2 + this.shakeOffset('hero', timeMs);
    this.atlas.draw(
      this.ctx,
      region,
      Math.round(x),
      Math.round(hero.baseline - region.h * scale),
      region.w * scale,
      region.h * scale,
    );
  }

  /** The mentor beside the hero, seen from behind; they hop and flash their element on a toss. */
  private drawAlly(dtMs: number, timeMs: number): void {
    const ally = this.options.ally;
    if (!ally) return;
    const region = mapFrame(ally, 'up', false, timeMs);
    const scale = 2;
    let lift = 0;
    if (this.hop !== null) {
      this.hop += dtMs;
      const t = this.hop / HOP_MS;
      if (t >= 1) this.hop = null;
      else lift = Math.sin(t * Math.PI) * 14;
    }
    const x = this.layout.ally.x - (region.w * scale) / 2;
    const top = this.layout.ally.baseline - region.h * scale - lift;
    const element = this.options.allyElement;
    if (element) {
      const { ctx } = this;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = ELEMENT_COLOR_OF[element];
      ctx.beginPath();
      ctx.ellipse(this.layout.ally.x, this.layout.ally.baseline - 4, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (this.hop !== null) {
        drawIcon(ctx, ELEMENT_ICONS[element], this.layout.ally.x - 12, top - 28, { scale: 2 });
      }
    }
    this.atlas.draw(
      this.ctx,
      region,
      Math.round(x),
      Math.round(top),
      region.w * scale,
      region.h * scale,
    );
  }

  /** Draws the opponent; an enraged boss glows a pulsing red. */
  private drawOpponent(dtMs: number, timeMs: number, enraged: boolean): void {
    if (!this.opponent) return;
    const region = battleFrame(this.opponent, timeMs);
    const scale = Math.min(CREATURES[this.opponent].battleScale, this.layout.enemy.maxH / region.h);
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
    if (enraged && this.defeat === null) {
      const glow = Math.round(6 + 4 * Math.sin(timeMs / 120));
      ctx.filter = `drop-shadow(0 0 ${glow}px #ff3b3b) saturate(1.4)`;
    }
    const x = this.layout.enemy.x - w / 2 + this.shakeOffset('enemy', timeMs);
    const y = Math.round(this.layout.enemy.baseline - h);
    const tint = this.options.tint;
    if (tint) this.drawTinted(region, Math.round(x), y, w, h, ELEMENT_COLOR_OF[tint]);
    else this.atlas.draw(ctx, region, Math.round(x), y, w, h);
    ctx.restore();
  }

  /**
   * Draws a sprite recoloured to `color`'s hue, keeping its shading, through
   * an offscreen canvas: the colour blends over it, then the sprite's own
   * outline masks the result.
   */
  private drawTinted(region: Region, x: number, y: number, w: number, h: number, color: string) {
    const canvas = (this.tintCanvas ??= document.createElement('canvas'));
    canvas.width = w;
    canvas.height = h;
    const off = canvas.getContext('2d');
    if (!off) return;
    off.imageSmoothingEnabled = false;
    this.atlas.draw(off, region, 0, 0, w, h);
    off.globalCompositeOperation = 'color';
    off.fillStyle = color;
    off.fillRect(0, 0, w, h);
    off.globalCompositeOperation = 'destination-in';
    this.atlas.draw(off, region, 0, 0, w, h);
    this.ctx.drawImage(canvas, x, y);
  }

  /**
   * HP bar and level, weakness/resistance icons and the action gauge above
   * the enemy, and the icon of its next move when the hero's Insight
   * reveals it.
   */
  private drawEnemyStatus(combat: CombatChallenge, showMove: boolean, timeMs: number): void {
    const { ctx } = this;
    const { x, y, w, h } = this.layout.bar;
    const ratio = Math.max(0, combat.enemyHp) / combat.enemy.hp;
    ctx.fillStyle = '#090b15';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = ratio > 0.5 ? '#6ff08f' : ratio > 0.25 ? '#f5d77b' : '#ff5c7a';
    ctx.fillRect(x, y, Math.round(w * ratio), h);
    // The level it fights at (monsters grow with the hero), left of the bar.
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'right';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#10132a';
    ctx.strokeText(`Lv${combat.enemy.level}`, x - 6, y + h);
    ctx.fillStyle = '#f5d77b';
    ctx.fillText(`Lv${combat.enemy.level}`, x - 6, y + h);

    // Weaknesses (green ▲ then elements) and resistances (red ▼ then elements).
    let ix = x;
    const iconY = y + h + 8;
    for (const [list, mark] of [
      [combat.weaknesses(), 'weak'],
      [combat.resistances(), 'resist'],
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

    // The action gauge on its own row: it fills in real time and the enemy
    // moves when it is full. Chill shows as ice below empty; a mistake that
    // fed it flashes it; near full it pulses red. Insight shows the coming
    // move just before it.
    const gaugeY = iconY + 36;
    const gw = w - 34;
    const gx = x + 34;
    const fill = Math.max(0, Math.min(1, combat.gauge / combat.actMs));
    const ice = Math.max(0, Math.min(1, -combat.gauge / combat.actMs));
    ctx.fillStyle = '#090b15';
    ctx.fillRect(gx - 2, gaugeY - 2, gw + 4, 14);
    const urgent = fill > 0.8;
    const pulse = urgent ? 0.6 + 0.4 * Math.sin(timeMs / 70) : 1;
    ctx.fillStyle =
      this.rushFlash > 0 ? '#ffffff' : urgent ? `rgba(255, 92, 122, ${pulse})` : '#f5a83b';
    ctx.fillRect(gx, gaugeY, Math.round(gw * fill), 10);
    if (ice > 0) {
      ctx.fillStyle = '#7fd4ff';
      ctx.fillRect(gx, gaugeY, Math.round(gw * ice), 10);
    }
    drawIcon(ctx, 'hourglass', x + 4, gaugeY - 7, { scale: 1 });
    const pipY = gaugeY + 5;
    if (showMove) {
      const mx = x - 34;
      ctx.fillStyle = '#10132acc';
      ctx.fillRect(mx - 3, pipY - 15, 30, 30);
      drawIconSpec(ctx, MOVE_ICONS[combat.nextMove.kind], mx, pipY - 12, 2);
    }
    if (combat.ward > 0) {
      const { ward } = this.layout;
      drawIcon(ctx, 'ward', ward.x, ward.y, { scale: 2 });
      drawCount(ctx, combat.ward, ward.x + 28, ward.y + 20);
    }
    // Support spells still running: on the enemy (Kindle, Mist, Fault Line) and the hero (Regen, Static).
    const statuses: [IconSpec, number, 'enemy' | 'hero'][] = [
      [SPELL_KIND_ICONS.burn, combat.burn.pieces, 'enemy'],
      [SPELL_KIND_ICONS.expose, combat.exposed, 'enemy'],
      [SPELL_KIND_ICONS.mist, combat.mist, 'enemy'],
      [SPELL_KIND_ICONS.regen, combat.regen.pieces, 'hero'],
      [SPELL_KIND_ICONS.charge, combat.charge.clears, 'hero'],
    ];
    const placed = { enemy: 0, hero: 0 };
    const { status } = this.layout;
    for (const [icon, count, side] of statuses) {
      if (count <= 0) continue;
      const first = side === 'enemy' ? { x, y: pipY + 18 } : status.hero;
      const sx = first.x + placed[side] * status.step.x;
      const sy = first.y + placed[side] * status.step.y;
      placed[side]++;
      ctx.fillStyle = '#10132acc';
      ctx.fillRect(sx - 3, sy - 3, 50, 30);
      drawIconSpec(ctx, icon, sx, sy, 2);
      drawCount(ctx, count, sx + 28, sy + 20);
    }
  }

  /** The goal of a non-combat challenge, drawn as meters and icons. */
  private drawObjective(objective: Objective): void {
    const { ctx } = this;
    const { x, y, w } = this.layout.bar;
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
        const size = this.layout.effectSize;
        this.atlas.draw(this.ctx, frame, x - size / 2, y - size / 2, size, size);
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
      // Pop in big, then drift up and fade (or just fade, for less motion).
      const still = reducedMotion();
      const size = t < 0.12 && !still ? 34 - t * 60 : 26;
      const base = float.target === 'enemy' ? this.layout.enemyFloat : y - 30;
      const py = base - float.offset - (still ? 0 : t * 36);
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
    // Longer lines stay up long enough to read.
    const t = this.banner.elapsed / Math.max(BANNER_MS, this.banner.value.length * 45);
    if (t >= 1) {
      this.banner = null;
      return;
    }
    const { ctx } = this;
    const { width } = ctx.canvas;
    ctx.globalAlpha = t < 0.1 ? t / 0.1 : t > 0.8 ? (1 - t) / 0.2 : 1;
    // Stage directions (`*…*`) are drawn as italic narration, a shade dimmer.
    // Long lines wrap onto more rows, in a smaller font if the stage is short.
    const layout = layOutBanner(
      this.banner.value,
      (text, font) => {
        ctx.font = font;
        return ctx.measureText(text).width;
      },
      width,
      ctx.canvas.height,
    );
    const { rows, step, height } = layout;
    const top = Math.max(2, Math.min(this.layout.bannerTop, ctx.canvas.height - height - 2));
    const textWidth = Math.max(0, ...rows.map((row) => row.w));
    const box = Math.min(width - 8, Math.max(220, textWidth + 24));
    ctx.fillStyle = '#10132ae6';
    ctx.fillRect(width / 2 - box / 2, top, box, height);
    ctx.strokeStyle = '#f5d77b';
    ctx.strokeRect(width / 2 - box / 2 + 0.5, top + 0.5, box - 1, height - 1);
    ctx.textAlign = 'left';
    rows.forEach((row, r) => {
      let x = width / 2 - row.w / 2;
      for (const word of row.words) {
        ctx.font = word.font;
        ctx.fillStyle = word.kind === 'stage' ? '#c9c3e6' : '#ffffff';
        ctx.fillText(word.text, x, top + 5 + step * (r + 0.8));
        x += word.w;
      }
    });
    ctx.globalAlpha = 1;
  }
}
