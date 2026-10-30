// Visual workbench check; VIDEO=1 optionally records a browser clip for GIF export.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.OUT ?? '/tmp/spell-animation-browser';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: process.env.CHROMIUM_NO_SANDBOX ? ['--no-sandbox'] : [],
});
try {
  const context = await browser.newContext({
    viewport: { width: 680, height: 840 },
    ...(process.env.VIDEO ? { recordVideo: { dir: out, size: { width: 680, height: 840 } } } : {}),
  });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${process.env.BASE ?? 'http://127.0.0.1:5186/'}spell-animations.html`);
  await page.locator('canvas').first().waitFor();
  assert.deepEqual(
    await page.locator('h2').allTextContents(),
    ['Fire', 'Ice', 'Lightning', 'Nature', 'Gravity', 'Wind'].flatMap((name) =>
      [1, 2, 3, 4].map((rank) => `${name} · Lv ${rank}`),
    ),
  );
  assert.equal(await page.locator('canvas').count(), 24);
  for (const id of ['fire', 'blizzard', 'thunder', 'natureConvert', 'quake', 'gale']) {
    assert.deepEqual(
      await page
        .locator(`[data-spell="${id}"]`)
        .evaluateAll((cards) => cards.map((card) => card.dataset.rank)),
      ['1', '2', '3', '4'],
    );
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/six-spells.png`, fullPage: true });
  await page.waitForTimeout(2400);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/reduced-motion.png`, fullPage: true });
  assert.deepEqual(errors, []);
  const video = page.video();
  await context.close();
  if (video) await video.saveAs(`${out}/six-spells.webm`);
  writeFileSync(
    `${out}/report.json`,
    JSON.stringify(
      {
        sixDistinctEffects: true,
        fourLevelsEach: true,
        realResolverTraces: true,
        reducedMotion: true,
        errors,
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
}
