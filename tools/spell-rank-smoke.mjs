// Exercise all 24 learned spell/rank combinations through the playable workshop.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.OUT ?? '/tmp/spell-rank-browser';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: process.env.CHROMIUM_NO_SANDBOX ? ['--no-sandbox'] : [],
});
try {
  const results = await Promise.all(
    [1, 2, 3, 4].map(async (rank) => {
      const touch = rank % 2 === 1;
      const context = await browser.newContext({
        viewport: touch ? { width: 390, height: 844 } : { width: 1100, height: 900 },
        hasTouch: touch,
        isMobile: touch,
      });
      const page = await context.newPage(),
        errors = [],
        rows = [];
      page.on('pageerror', (e) => errors.push(e.message));
      try {
        await page.goto(`${process.env.BASE ?? 'http://127.0.0.1:5186/'}workshop.html`);
        await page.locator('.mode-badge').waitFor();
        assert.equal(await page.locator('.auto-rank').count(), 0);
        for (const id of ['fire', 'blizzard', 'quake', 'gale', 'thunder', 'natureConvert']) {
          await page.getByRole('button', { name: 'Exercises', exact: true }).click();
          await page.getByLabel('Test spells', { exact: true }).selectOption(id);
          await page
            .getByRole('button', { name: `Supplied spells · Lv ${rank}`, exact: true })
            .click();
          assert.equal(await page.locator('.auto-spell').count(), 1);
          assert.equal(await page.locator('.auto-rank').innerText(), `Lv${rank}`);
          assert.equal(await page.locator('#workshop').getAttribute('data-test-spell'), id);
          assert.equal(
            await page.locator('#workshop').getAttribute('data-test-level'),
            String(rank),
          );
          if (touch) await page.getByRole('button', { name: 'Hard drop', exact: true }).tap();
          else await page.keyboard.press('Space');
          await page.waitForFunction(
            () => document.querySelector('#workshop')?.getAttribute('data-auto-phase') === 'target',
          );
          assert.equal(await page.locator('.auto-spell.casting-now').count(), 1);
          await page.waitForFunction(
            () => document.querySelector('#workshop')?.getAttribute('data-auto-phase') === 'idle',
          );
          assert.match(
            await page.locator('.casting-guide').innerText(),
            new RegExp(`Last auto:.*Lv${rank}`),
          );
          const result = await page.locator('.goal-panel strong').innerText();
          assert.match(result, /[12] auto casts/);
          await page.screenshot({ path: `${out}/${id}-${rank}.png` });
          // Reset keeps the selected level and isolated spell, rather than restoring Lv4.
          await page.getByRole('button', { name: 'Reset', exact: true }).click();
          assert.equal(await page.locator('.auto-rank').innerText(), `Lv${rank}`);
          assert.equal(await page.locator('.auto-spell').count(), 1);
          rows.push({
            id,
            rank,
            touch,
            earnedLineCasting: true,
            resetPreservesSetup: true,
            result,
          });
        }
        assert.deepEqual(errors, []);
        return rows;
      } finally {
        await context.close();
      }
    }),
  );
  writeFileSync(`${out}/report.json`, JSON.stringify(results.flat(), null, 2) + '\n');
  process.stdout.write('All 24 live spell/rank combinations passed.\n');
} finally {
  await browser.close();
}
