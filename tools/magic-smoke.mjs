// Playable workshop verification; start npm run dev before running this script.
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
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${process.env.BASE ?? 'http://127.0.0.1:5186/'}workshop.html`);
    await page.getByRole('heading', { name: 'Magic Workshop', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Pause / Resume', exact: true }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false);
    await page.screenshot({ path: `${out}/${width}-workshop.png`, fullPage: true });
    await page.getByRole('combobox', { name: 'Spell', exact: true }).selectOption('quake');
    await page.getByRole('button', { name: 'Preview elemental spell' }).click();
    const dialog = page.locator('dialog[open]');
    await dialog.waitFor();
    await assert.doesNotReject(() =>
      dialog.getByRole('heading', { name: 'Avalanche', exact: true }).waitFor(),
    );
    assert.equal(await dialog.getByRole('button', { name: 'Cast', exact: true }).isEnabled(), true);
    await page.screenshot({ path: `${out}/${width}-preview.png`, fullPage: true });
    await dialog.getByRole('button', { name: 'Cast', exact: true }).click();
    await page.locator('dialog[open]').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Arcane upgrades', exact: true }).click();
    const editor = page.locator('dialog[open]');
    const nature = editor.locator('.arcane-editor-row').filter({ hasText: 'Arcane + nature' });
    await nature.getByRole('button', { name: 'Create pairing', exact: true }).click();
    await nature.getByRole('button', { name: 'Upgrade · 6 points', exact: true }).click();
    await editor.getByRole('button', { name: 'Done', exact: true }).click();
    await page
      .getByRole('combobox', { name: 'Arcane pairing', exact: true })
      .selectOption('nature');
    await page.getByRole('button', { name: 'Preview Arcane spell' }).click();
    await page.locator('dialog[open]').getByRole('button', { name: 'Cast', exact: true }).click();
    await page.locator('dialog[open]').waitFor({ state: 'detached' });
    assert.match(await page.locator('aside').innerText(), /Nature 2/);
    const sizes = await page
      .locator('button')
      .evaluateAll((nodes) =>
        nodes.filter((n) => n.getClientRects().length).map((n) => n.getBoundingClientRect().height),
      );
    assert(sizes.every((h) => h >= 43));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(
      await page
        .locator('.multi-touch .magic-edge')
        .first()
        .evaluate((e) => getComputedStyle(e).animationName),
      'none',
    );
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      overflow,
      errors,
      cast: true,
      arcaneUpgrade: true,
      neutralizeCharges: 2,
      reducedMotion: true,
    });
    await page.close();
  }
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2) + '\n');
  process.stdout.write(JSON.stringify(results) + '\n');
} finally {
  await browser.close();
}
