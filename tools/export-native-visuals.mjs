// Reuse the actual web drawing functions; never maintain a second crystal design.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const directory = 'public/assets/native-visuals';
const sources = [
  'src/ui/crystals.ts',
  'src/ui/boardView.ts',
  'src/ui/iconDraw.ts',
  'src/ui/art/icons.ts',
  'src/ui/worldDecoration.ts',
  'src/data/encounters.ts',
];
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
server.middlewares.use('/__native_visuals', (_request, response) => {
  response.setHeader('Content-Type', 'text/html');
  response.end('<!doctype html><title>Shared native art export</title>');
});
await server.listen();
const address = server.httpServer.address();
let executablePath = process.env.NATIVE_VISUAL_BROWSER;
if (!executablePath) {
  try {
    await access('/usr/bin/chromium');
    executablePath = '/usr/bin/chromium';
  } catch {
    /* use Playwright browser */
  }
}
let browser;
try {
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${address.port}/__native_visuals`);
  const assets = await page.evaluate(async () => {
    const faces = await import('/src/ui/crystals.ts');
    const board = await import('/src/ui/boardView.ts');
    const icons = await import('/src/ui/art/icons.ts');
    const { drawIcon } = await import('/src/ui/iconDraw.ts');
    const { drawEncounterProp } = await import('/src/ui/worldDecoration.ts');
    const { ENCOUNTER_DEFS } = await import('/src/data/encounters.ts');
    const output = [];
    function png(name, size, draw) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      draw(ctx);
      output.push({ name, width: size, height: size, png: canvas.toDataURL().split(',')[1] });
    }
    for (const color of Object.keys(faces.CRYSTAL_HEX)) {
      png(`crystal-${color}`, 30, (ctx) => faces.drawCrystal(ctx, color, 0, 0, 30));
      if (color !== 'stone' && color !== 'neutral')
        png(`crystal-${color}-rune`, 30, (ctx) => board.drawCrystal(ctx, color, 0, 0, 30));
    }
    for (const strength of [1, 2, 3])
      png(`stone-${strength}`, 30, (ctx) => faces.drawObstructionStone(ctx, 0, 0, 30, strength));
    for (const id of Object.keys(icons.ICONS))
      png(`icon-${id}`, icons.ICON_SIZE, (ctx) => drawIcon(ctx, id, 0, 0, { scale: 1 }));
    for (const element of Object.keys(icons.ELEMENT_ICONS))
      png(`icon-star-${element}`, icons.ICON_SIZE, (ctx) =>
        drawIcon(ctx, 'star', 0, 0, { scale: 1, palette: icons.elementPalette(element) }),
      );
    for (const def of Object.values(ENCOUNTER_DEFS))
      for (const outcome of ['win', 'fail']) {
        const animated =
          (def.skin === 'tower' && outcome === 'win') ||
          (def.skin === 'lamps' && outcome === 'fail');
        const frames = animated ? 12 : 1;
        const periodMs = def.skin === 'tower' ? (600 * Math.PI) / 2 : 90 * 2 * Math.PI;
        const canvas = document.createElement('canvas');
        canvas.width = 48 * frames;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        for (let frame = 0; frame < frames; frame++) {
          ctx.save();
          ctx.translate(frame * 48, 0);
          drawEncounterProp(
            ctx,
            {
              ...def.world[outcome],
              id: def.id,
              skin: def.skin,
              x: def.world.x,
              y: def.world.y,
              won: outcome === 'win',
            },
            8,
            12,
            (frame * periodMs) / frames,
          );
          ctx.restore();
        }
        output.push({
          name: `world-${def.id}-${outcome}`,
          width: canvas.width,
          height: 48,
          png: canvas.toDataURL().split(',')[1],
        });
      }
    return output;
  });
  await mkdir(directory, { recursive: true });
  const manifest = { sourceHashes: {}, assets: {} };
  for (const path of sources)
    manifest.sourceHashes[path] = createHash('sha256')
      .update(await readFile(path))
      .digest('hex');
  for (const asset of assets) {
    const bytes = Buffer.from(asset.png, 'base64');
    await writeFile(`${directory}/${asset.name}.png`, bytes);
    manifest.assets[asset.name] = {
      width: asset.width,
      height: asset.height,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  }
  await writeFile(`${directory}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  process.stdout.write(`Exported ${assets.length} shared web visuals for the native app.\n`);
} finally {
  await browser?.close();
  await server.close();
}
