// Exercise the actual guided casting flow at phone and desktop sizes.
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
const out = process.env.OUT ?? '/tmp/magic-browser';
mkdirSync(out, { recursive: true });
const results = [];
try {
  for (const [width, height] of [
    [360, 640],
    [390, 844],
    [1100, 900],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } }),
      errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${process.env.BASE ?? 'http://127.0.0.1:5186/'}workshop.html`);
    await page.getByRole('heading', { name: 'Spell practice', exact: true }).waitFor();
    const board = page.locator('.workshop-board');
    assert.equal(await page.locator('.cast-spell').isDisabled(), true);
    assert.equal(await page.locator('dialog[open]').count(), 0);
    const boardBox = await board.boundingBox(),
      castBox = await page.locator('.cast-bar').boundingBox();
    assert(
      boardBox && castBox && boardBox.y + boardBox.height <= castBox.y + 1,
      'Casting controls must not cover the board.',
    );
    const unchanged = await board.innerHTML();
    await page.waitForTimeout(1100);
    assert.equal(await board.innerHTML(), unchanged, 'Practice must wait for the player.');
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.screenshot({ path: `${out}/${width}-workshop.png`, fullPage: true });
    await board.getByRole('row', { name: 'Target row 3 from bottom', exact: true }).click();
    await page.getByRole('button', { name: 'See result', exact: true }).click();
    assert.match(await page.locator('.board-view-label').innerText(), /Preview/);
    await page.screenshot({ path: `${out}/${width}-preview.png`, fullPage: true });
    await page.getByRole('button', { name: 'Back to board', exact: true }).click();
    const rows = [[17, 18, 18, 19, 19, 19], [17, 18, 19], [14, 15], [19], [16, 18], [18]];
    for (let exercise = 0; exercise < rows.length; exercise++) {
      for (const y of rows[exercise]) {
        await board
          .getByRole('row', { name: `Target row ${20 - y} from bottom`, exact: true })
          .click();
        const cast = page.locator('.cast-spell');
        assert.equal(await cast.isEnabled(), true);
        await cast.click();
      }
      await page.getByRole('button', { name: 'Next exercise →', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Cast Arcane + Nature', exact: true }).click();
    await page.getByRole('button', { name: 'Let Slime place its block', exact: true }).click();
    assert.equal(await page.locator('.practice-goal .complete').innerText(), 'Complete!');
    const sizes = await page
      .locator('button')
      .evaluateAll((nodes) =>
        nodes.filter((n) => n.getClientRects().length).map((n) => n.getBoundingClientRect().height),
      );
    assert(sizes.every((h) => h >= 43));
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      overflow: false,
      errors,
      untimed: true,
      completedExercises: 7,
      castsOnMainBoard: true,
      noCastingDialogs: true,
    });
    await page.close();
  }
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2) + '\n');
  process.stdout.write(JSON.stringify(results) + '\n');
} finally {
  await browser.close();
}
