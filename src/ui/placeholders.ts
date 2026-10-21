/**
 * Code-drawn stand-in art, used for any sprite key without a real image.
 * Kept deliberately simple so it is obvious what still needs art.
 */
import type { CrystalColor } from '../core/pieces';
import type { TileDef } from '../world/tiles';

export const CRYSTAL_HEX: Readonly<Record<CrystalColor | 'stone', string>> = {
  cyan: '#61d9e8',
  gold: '#f6d365',
  violet: '#bd91ff',
  green: '#72e6a2',
  red: '#ff7c9b',
  blue: '#7296ff',
  orange: '#ffad69',
  stone: '#6b6577',
};

/** Body colours for monster placeholders, keyed by sprite key. */
const MONSTER_COLORS: Readonly<Record<string, string>> = {
  'monster.slime': '#72e6a2',
  'monster.wolf': '#9aa1b5',
  'monster.goblin': '#8fbf5a',
  'monster.bat': '#7a5a9e',
  'monster.wisp': '#cfe3ff',
  'monster.golem': '#8d8577',
  'monster.moonWyrm': '#9db8ff',
};

/** Robe colours for NPC placeholders, keyed by sprite key. */
const NPC_COLORS: Readonly<Record<string, string>> = {
  'npc.elder': '#c9c3a8',
  'npc.farmer': '#7fb069',
  'npc.kid': '#ffad69',
  'npc.merchant': '#e6b54a',
  'npc.smith': '#c0573e',
  'npc.innkeeper': '#d98fb0',
  'npc.sage': '#6f6fd8',
  'npc.guard': '#7b8db0',
  'npc.collector': '#b07bd0',
  'npc.hermit': '#8a7a5a',
  hero: '#e66c83',
};

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: TileDef,
  x: number,
  y: number,
  size: number,
  timeMs: number,
): void {
  ctx.fillStyle = tile.color;
  ctx.fillRect(x, y, size, size);
  const s = size / 32;
  switch (tile.name) {
    case 'tree':
      ctx.fillStyle = '#4f9a4a';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#5b3a1e';
      ctx.fillRect(x + 13 * s, y + 20 * s, 6 * s, 10 * s);
      ctx.fillStyle = '#23562a';
      circle(ctx, x + 16 * s, y + 14 * s, 11 * s);
      break;
    case 'mountain':
      ctx.fillStyle = '#4b4850';
      triangle(ctx, x + 2 * s, y + 30 * s, x + 16 * s, y + 3 * s, x + 30 * s, y + 30 * s);
      ctx.fillStyle = '#e9e9f0';
      triangle(ctx, x + 12 * s, y + 11 * s, x + 16 * s, y + 3 * s, x + 20 * s, y + 11 * s);
      break;
    case 'water':
    case 'pool': {
      ctx.strokeStyle = '#ffffff40';
      ctx.lineWidth = 2 * s;
      const shift = Math.sin(timeMs / 500 + x + y) * 3 * s;
      line(ctx, x + 6 * s + shift, y + 12 * s, x + 14 * s + shift, y + 12 * s);
      line(ctx, x + 16 * s - shift, y + 22 * s, x + 26 * s - shift, y + 22 * s);
      break;
    }
    case 'flowers':
      ctx.fillStyle = '#ffd3e0';
      circle(ctx, x + 8 * s, y + 10 * s, 2 * s);
      circle(ctx, x + 22 * s, y + 20 * s, 2 * s);
      ctx.fillStyle = '#fff3a0';
      circle(ctx, x + 18 * s, y + 8 * s, 2 * s);
      break;
    case 'village':
    case 'town':
      ctx.fillStyle = '#4f9a4a';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = '#9a5b3c';
      ctx.fillRect(x + 6 * s, y + 14 * s, 20 * s, 14 * s);
      ctx.fillStyle = tile.name === 'town' ? '#3d6fb5' : '#b5423d';
      triangle(ctx, x + 3 * s, y + 15 * s, x + 16 * s, y + 4 * s, x + 29 * s, y + 15 * s);
      break;
    case 'cave':
    case 'ruins':
      ctx.fillStyle = '#6d6a72';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = tile.color;
      ctx.beginPath();
      ctx.arc(x + 16 * s, y + 22 * s, 11 * s, Math.PI, 0);
      ctx.fillRect(x + 5 * s, y + 22 * s, 22 * s, 10 * s);
      ctx.fill();
      break;
    case 'crystal':
      ctx.fillStyle = '#3e3852';
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = tile.color;
      triangle(ctx, x + 8 * s, y + 30 * s, x + 14 * s, y + 4 * s, x + 20 * s, y + 30 * s);
      triangle(ctx, x + 16 * s, y + 30 * s, x + 22 * s, y + 12 * s, x + 28 * s, y + 30 * s);
      break;
    case 'stairs up':
    case 'stairs down':
      ctx.fillStyle = '#00000055';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 4 * s, y + (4 + i * 7) * s, 24 * s, 3 * s);
      break;
    case 'house':
      ctx.fillStyle = '#00000025';
      ctx.fillRect(x, y + 28 * s, size, 4 * s);
      break;
    case 'door':
      ctx.fillStyle = '#e0b04a';
      circle(ctx, x + 23 * s, y + 17 * s, 2 * s);
      break;
    default:
      break;
  }
}

/** Draws a monster as a blob with eyes. */
export function drawMonster(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number,
  y: number,
  size: number,
  timeMs: number,
): void {
  const s = size / 32;
  const bob = Math.sin(timeMs / 250) * 1.5 * s;
  ctx.fillStyle = '#00000040';
  ctx.fillRect(x + 6 * s, y + 27 * s, 20 * s, 3 * s);
  ctx.fillStyle = MONSTER_COLORS[key] ?? '#ff7c9b';
  ctx.beginPath();
  ctx.ellipse(x + 16 * s, y + 18 * s + bob, 12 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  circle(ctx, x + 12 * s, y + 16 * s + bob, 2 * s);
  circle(ctx, x + 20 * s, y + 16 * s + bob, 2 * s);
}

/** Draws a person (hero or NPC) as a robed figure. Chests are drawn as boxes. */
export function drawPerson(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number,
  y: number,
  size: number,
): void {
  const s = size / 32;
  if (key === 'object.chest') {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x + 5 * s, y + 10 * s, 22 * s, 16 * s);
    ctx.fillStyle = '#7fb6ff';
    ctx.fillRect(x + 14 * s, y + 14 * s, 4 * s, 6 * s);
    return;
  }
  ctx.fillStyle = '#00000040';
  ctx.fillRect(x + 8 * s, y + 28 * s, 16 * s, 3 * s);
  ctx.fillStyle = NPC_COLORS[key] ?? '#cccccc';
  triangle(ctx, x + 7 * s, y + 29 * s, x + 16 * s, y + 10 * s, x + 25 * s, y + 29 * s);
  ctx.fillStyle = '#f1c7a1';
  circle(ctx, x + 16 * s, y + 9 * s, 5 * s);
}

/** Draws one board crystal with a highlight. */
export function drawCrystal(
  ctx: CanvasRenderingContext2D,
  color: CrystalColor | 'stone',
  x: number,
  y: number,
  size: number,
  alpha = 1,
): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = CRYSTAL_HEX[color];
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  ctx.fillStyle = '#ffffff35';
  ctx.fillRect(x + 3, y + 3, size - 6, 4);
  ctx.globalAlpha = 1;
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function triangle(
  ctx: CanvasRenderingContext2D,
  ...[x1, y1, x2, y2, x3, y3]: [number, number, number, number, number, number]
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
