/**
 * Sprite registry. Game data refers to art by key (e.g. `monster.slime`,
 * `tile.grass`). At start-up the registry reads `public/assets/manifest.json`
 * and loads any images it lists; keys without an image fall back to the
 * code-drawn placeholders in `placeholders.ts`. Dropping in real art is just
 * adding files and manifest entries — no code changes.
 *
 * Manifest format:
 * {
 *   "monster.slime": { "src": "monsters/slime.png", "frameWidth": 64, "frameHeight": 64, "frames": 4, "fps": 6 },
 *   "tile.grass":    { "src": "tiles/grass.png" }
 * }
 */

export interface SpriteEntry {
  /** Path relative to `assets/`. */
  readonly src: string;
  /** Horizontal sprite-sheet frame size. Defaults to the whole image. */
  readonly frameWidth?: number;
  readonly frameHeight?: number;
  readonly frames?: number;
  /** Animation speed in frames per second. Defaults to 6. */
  readonly fps?: number;
  /** Source x/y offset into the sheet, for atlases. */
  readonly x?: number;
  readonly y?: number;
}

export type SpriteManifest = Record<string, SpriteEntry>;

interface LoadedSprite {
  readonly entry: SpriteEntry;
  readonly image: HTMLImageElement;
}

export class SpriteRegistry {
  private readonly sprites = new Map<string, LoadedSprite>();

  /** Loads the manifest and its images. Missing files are skipped quietly. */
  async load(baseUrl = 'assets/'): Promise<void> {
    let manifest: SpriteManifest;
    try {
      const response = await fetch(`${baseUrl}manifest.json`);
      if (!response.ok) return;
      manifest = (await response.json()) as SpriteManifest;
    } catch {
      return;
    }
    await Promise.all(
      Object.entries(manifest).map(async ([key, entry]) => {
        const image = new Image();
        image.src = `${baseUrl}${entry.src}`;
        try {
          await image.decode();
          this.sprites.set(key, { entry, image });
        } catch {
          console.warn(`Sprite "${key}" failed to load from ${image.src}`);
        }
      }),
    );
  }

  has(key: string): boolean {
    return this.sprites.has(key);
  }

  /**
   * Draws a sprite scaled into the box (x, y, w, h), animated by `timeMs`.
   * Returns false if no image is registered for `key`.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number,
    y: number,
    w: number,
    h: number,
    timeMs = 0,
  ): boolean {
    const sprite = this.sprites.get(key);
    if (!sprite) return false;
    const { entry, image } = sprite;
    const fw = entry.frameWidth ?? image.naturalWidth;
    const fh = entry.frameHeight ?? image.naturalHeight;
    const frames = entry.frames ?? 1;
    const frame = Math.floor((timeMs / 1000) * (entry.fps ?? 6)) % frames;
    ctx.drawImage(image, (entry.x ?? 0) + frame * fw, entry.y ?? 0, fw, fh, x, y, w, h);
    return true;
  }
}
