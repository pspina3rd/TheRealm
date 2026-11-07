// Saves frames of the story scene preview (cinematic.html) as PNGs for review.
// Usage: node tools/cinematic-screenshots.mjs <out-dir> <shot>:<ms> [<shot>:<ms> ...]
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';

const [out, ...frames] = process.argv.slice(2);
if (!out || frames.length === 0) {
  console.error('Usage: node tools/cinematic-screenshots.mjs <out-dir> <shot>:<ms> ...');
  process.exit(1);
}
await mkdir(out, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 992, height: 900 } });
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  for (const frame of frames) {
    const [shot, ms] = frame.split(':');
    await page.goto(`http://127.0.0.1:${port}/cinematic.html?shot=${shot}&t=${ms}`);
    await page.waitForFunction(() => document.querySelector('.cinematic-words p'));
    await page.waitForTimeout(300);
    const name = `shot-${shot.padStart(2, '0')}-${ms}ms.png`;
    await page.locator('#cinematic-preview').screenshot({ path: `${out}/${name}` });
    process.stdout.write(`${name}\n`);
  }
} finally {
  await browser.close();
  await server.close();
}
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
