import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.OUT ?? '/tmp/progression-weaving-browser';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: process.env.CHROMIUM_NO_SANDBOX ? ['--no-sandbox'] : [],
});
try {
  const reports = [];
  for (const [width, height, touch] of [
    [390, 844, true],
    [1100, 900, false],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
    });
    const page = await context.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const settings = async () => {
      await page.getByRole('button', { name: 'Exercises', exact: true }).click();
    };
    const setup = async (name) => {
      await settings();
      await page.getByRole('button', { name, exact: true }).click();
    };
    const train = async (name) => {
      for (let i = 0; i < 3; i++) await setup('Earn a level (test XP)');
      for (const attribute of ['power', 'efficiency', 'effect'])
        await setup(`Enhance ${name} ${attribute}`);
      await setup(`Train ${name} next level`);
    };
    try {
      await page.goto(`${process.env.BASE ?? 'http://127.0.0.1:5186/'}workshop.html`);
      await page.locator('.mode-badge').waitFor();
      assert.equal(await page.locator('.auto-spell').count(), 0);
      if (touch) await page.getByRole('button', { name: 'Hard drop', exact: true }).tap();
      else await page.keyboard.press('Space');
      assert.match(await page.locator('.goal-panel strong').innerText(), /2 lines.*0 auto casts/);
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      await settings();
      assert.equal(
        await page.getByRole('button', { name: 'Learn Arcane', exact: true }).isEnabled(),
        false,
      );
      await page.getByRole('button', { name: 'Learn Fire', exact: true }).click();
      assert.equal(await page.locator('.auto-spell').count(), 1);
      assert.match(await page.locator('.spell-price').innerText(), /0/);
      await setup('Learn Gravity');
      await train('Fire');
      assert.equal(await page.locator('.auto-rank').filter({ hasText: 'Lv2' }).count(), 1);
      assert.equal(await page.locator('.auto-rank').filter({ hasText: 'Lv1' }).count(), 1);
      await page.screenshot({ path: `${out}/${width}-mixed-ranks.png` });
      await setup('Arcane Weaving');
      assert.match(await page.locator('.weaving-editor').innerText(), /Moon Wyrm/);
      assert.equal(
        await page.getByRole('button', { name: 'Save and equip', exact: true }).isEnabled(),
        false,
      );
      await page.getByRole('button', { name: 'Done', exact: true }).click();
      await train('Gravity');
      await setup('Moon Wyrm aftermath (test unlock)');
      // Weaving is independently available with trained bases, without granting Arcane ownership.
      await setup('Arcane mastery');
      assert.equal(
        await page
          .getByRole('button', { name: 'Learn technique', exact: true })
          .filter({ hasNotText: 'dummy' })
          .first()
          .isEnabled(),
        false,
      );
      await page.getByRole('button', { name: 'Done', exact: true }).click();
      for (let i = 0; i < 3; i++) await setup('Earn a level (test XP)');
      await setup('Arcane Weaving');
      await page.getByLabel('Custom spell name', { exact: true }).fill('Emberfall');
      await page.getByLabel('Effect 1', { exact: true }).selectOption('fire');
      await page.getByLabel('Effect 2', { exact: true }).selectOption('quake');
      await page.getByRole('button', { name: 'Save and equip', exact: true }).click();
      await page.getByRole('button', { name: 'Upgrade weaving · 6 points', exact: true }).click();
      await page.getByLabel('Effect 1 strength', { exact: true }).selectOption('2');
      await page.getByRole('button', { name: 'Save and equip', exact: true }).click();
      assert.match(await page.locator('.weave-cost').innerText(), /fire.*earth/);
      await page.screenshot({ path: `${out}/${width}-editor.png` });
      await page.getByRole('button', { name: 'Done', exact: true }).click();
      await page.reload();
      await page.locator('.mode-badge').waitFor();
      assert.equal(await page.locator('.auto-rank').filter({ hasText: 'Lv2' }).count(), 2);
      await page.getByRole('button', { name: 'Arcane', exact: true }).click();
      await page.getByRole('button', { name: 'Equipped weaving', exact: true }).click();
      assert.equal(
        await page.getByRole('button', { name: 'Cast custom spell', exact: true }).isEnabled(),
        false,
      );
      assert.match(await page.locator('.weaving-target [role=status]').innerText(), /both effects/);
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await setup('Supply mana (debug)');
      await page.getByRole('button', { name: 'Arcane', exact: true }).click();
      await page.getByRole('button', { name: 'Equipped weaving', exact: true }).click();
      assert.equal(await page.locator('.weave-previews .magic-grid').count(), 3);
      await page.screenshot({ path: `${out}/${width}-ordered-preview.png` });
      await page.getByRole('button', { name: 'Cast custom spell', exact: true }).click();
      await page.waitForFunction(
        () => document.querySelector('#workshop')?.getAttribute('data-cast-source') === 'weave',
      );
      await page.screenshot({ path: `${out}/${width}-casting.png` });
      await page.waitForFunction(
        () => document.querySelector('#workshop')?.getAttribute('data-auto-phase') === 'idle',
      );
      assert.equal(await page.locator('.mode-badge').innerText(), 'Playing');
      assert.deepEqual(errors, []);
      reports.push({
        width,
        height,
        touch,
        zeroSpellStart: true,
        arbitraryFirstSchool: true,
        mixedRanks: true,
        realPointSpending: true,
        unlockGated: true,
        independentArcane: true,
        customStrengthAndOrder: true,
        threeStagePreview: true,
        insufficientManaRejected: true,
        sequentialCasting: true,
        reloadPreservesProgress: true,
        errors,
      });
    } finally {
      await context.close();
    }
  }
  writeFileSync(`${out}/report.json`, JSON.stringify(reports, null, 2) + '\n');
  process.stdout.write(
    'Zero-spell progression and independent Weaving passed on touch and desktop.\n',
  );
} finally {
  await browser.close();
}
