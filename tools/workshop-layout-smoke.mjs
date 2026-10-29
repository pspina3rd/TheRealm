// Additional tablet, wide desktop and landscape touch layout checks.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: process.env.CHROMIUM_NO_SANDBOX ? ['--no-sandbox'] : [],
});
const out = process.env.OUT ?? '/tmp/workshop-layout';
mkdirSync(out, { recursive: true });
const results = [];
try {
  for (const [width, height, hasTouch] of [
    [640, 360, true],
    [844, 390, true],
    [768, 1024, true],
    [1440, 900, false],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch,
      isMobile: hasTouch,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${process.env.BASE ?? 'http://127.0.0.1:5186/'}workshop.html`);
    await page.getByRole('heading', { name: 'Magic workshop', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Exercises', exact: true }).click();
    await page.getByRole('button', { name: 'Manual spell lab', exact: true }).click();
    const controls = await page.locator('.piece-controls').boundingBox();
    const board = await page.locator('.board-surface').boundingBox();
    assert(
      board.height / board.width === 2 && board.height >= 280,
      'Full board must remain legible in short landscape.',
    );
    await page.getByRole('button', { name: 'Wind', exact: true }).click();
    await page.mouse.click(board.x + board.width * 0.45, board.y + board.height * 0.875);
    assert.deepEqual(await page.locator('.piece-controls').boundingBox(), controls);
    for (const state of ['wind', 'arcane']) {
      if (state === 'arcane') {
        await page.getByRole('button', { name: 'Arcane', exact: true }).click();
        await page.getByRole('button', { name: 'Arcane + Nature', exact: true }).click();
      }
      const regions = await page
        .locator('.board-surface, .spell-area, .action-area, .control-dock')
        .evaluateAll((ns) =>
          ns.map((n) => {
            const r = n.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          }),
        );
      for (const r of regions)
        assert(
          r.x >= -1 && r.y >= -1 && r.x + r.width <= width + 1 && r.y + r.height <= height + 1,
          'All functional regions must stay within the viewport.',
        );
      for (let i = 0; i < regions.length; i++)
        for (let j = i + 1; j < regions.length; j++) {
          const a = regions[i],
            b = regions[j];
          assert(
            a.x + a.width <= b.x + 1 ||
              b.x + b.width <= a.x + 1 ||
              a.y + a.height <= b.y + 1 ||
              b.y + b.height <= a.y + 1,
            'Board, spells, action area and movement dock cannot overlap.',
          );
        }
      const buttons = await page.locator('button').evaluateAll((ns) =>
        ns
          .filter((n) => n.getClientRects().length)
          .map((n) => {
            const r = n.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          }),
      );
      assert(
        buttons.every(
          (r) =>
            r.width >= 43 &&
            r.height >= 43 &&
            r.x >= -1 &&
            r.y >= -1 &&
            r.x + r.width <= width + 1 &&
            r.y + r.height <= height + 1,
        ),
      );
      await page.screenshot({ path: `${out}/${width}-${state}.png`, fullPage: true });
    }
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      hasTouch,
      fullBoard: true,
      noOverlap: true,
      stableControls: true,
      windAndArcaneFit: true,
      touchTargets: true,
      errors,
    });
    await context.close();
  }
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2) + '\n');
  process.stdout.write(JSON.stringify(results) + '\n');
} finally {
  await browser.close();
}
