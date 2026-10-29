import { IMAGES, type ImageId, type Region } from './images';

/** Loads every image in `IMAGES` and draws regions of them. */
export class Atlas {
  private readonly images = new Map<ImageId, HTMLImageElement>();

  /** Loads all images. Missing files are reported and then drawn as nothing. */
  async load(baseUrl: string): Promise<void> {
    await Promise.all(
      (Object.keys(IMAGES) as ImageId[]).map(async (id) => {
        const image = new Image();
        image.src = `${baseUrl}${IMAGES[id].src}`;
        try {
          await image.decode();
          this.images.set(id, image);
        } catch {
          console.error(`Image "${id}" failed to load from ${image.src}`);
        }
      }),
    );
  }

  /** Draws `region` at (dx, dy), scaled to (dw, dh) if given. */
  draw(
    ctx: CanvasRenderingContext2D,
    region: Region,
    dx: number,
    dy: number,
    dw = region.w,
    dh = region.h,
  ): void {
    const image = this.images.get(region.image);
    if (!image) return;
    ctx.drawImage(image, region.x, region.y, region.w, region.h, dx, dy, dw, dh);
  }
}
