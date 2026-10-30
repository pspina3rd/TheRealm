// Exercise the default automatic mode using real keyboard/touch inputs.
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
const out = process.env.OUT ?? '/tmp/auto-magic-browser';
mkdirSync(out, { recursive: true });
const reports = [];
try {
  for (const [width, height, touch] of [
    [360, 640, true],
    [390, 844, true],
    [844, 390, true],
    [1100, 900, false],
  ]) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
    });
    const page = await ctx.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${process.env.BASE ?? 'http://127.0.0.1:5186/'}workshop.html`);
    await page.locator('.mode-badge').waitFor();
    assert.equal(await page.locator('.auto-spell').count(), 0);
    await page.getByRole('button', { name: 'Exercises', exact: true }).click();
    await page.getByRole('button', { name: 'Supplied spells · Lv 1', exact: true }).click();
    assert.equal(await page.locator('.auto-spell').count(), 7);
    assert.equal(
      await page.locator('.spell-strip button').count(),
      0,
      'Standard readiness cards must not require selection.',
    );
    assert.equal(await page.locator('.auto-rank').filter({ hasText: 'Lv1' }).count(), 7);
    await page.getByRole('button', { name: 'Exercises', exact: true }).click();
    await page.getByRole('button', { name: 'Supplied spells · Lv 4', exact: true }).click();
    assert.equal(await page.locator('.auto-rank').filter({ hasText: 'Lv4' }).count(), 7);
    const controls = await page.locator('.piece-controls').boundingBox();
    await page.locator('.auto-spell').first().click();
    await page.keyboard.press('1');
    assert.equal(await page.locator('.mode-badge').innerText(), 'Playing');
    await page.screenshot({ path: `${out}/${width}-ready.png` });
    // The supplied square fits the two-line opening without any spell interaction.
    if (touch) await page.getByRole('button', { name: 'Hard drop', exact: true }).tap();
    else await page.keyboard.press('Space');
    await page.waitForFunction(
      () => document.querySelector('#workshop')?.getAttribute('data-auto-phase') === 'target',
    );
    assert.equal(await page.locator('.auto-spell.casting-now').count(), 1);
    const beforeEffect = await page
      .locator('.magic-square')
      .evaluateAll((ns) => ns.map((n) => n.getAttribute('aria-label')));
    const beforeMana = await page.locator('.spell-price').allTextContents();
    const clock = await page.locator('.opponent p').first().innerText();
    await page.screenshot({ path: `${out}/${width}-target.png` });
    await page.waitForFunction(
      () => document.querySelector('#workshop')?.getAttribute('data-auto-phase') === 'effect',
    );
    assert.deepEqual(
      await page
        .locator('.magic-square')
        .evaluateAll((ns) => ns.map((n) => n.getAttribute('aria-label'))),
      beforeEffect,
    );
    assert.deepEqual(
      await page.locator('.spell-price').allTextContents(),
      beforeMana,
      'Casting animation cannot spend mana early.',
    );
    assert.equal(
      await page.locator('.opponent p').first().innerText(),
      clock,
      'Opponent clock is frozen while a cast is shown.',
    );
    await page.screenshot({ path: `${out}/${width}-effect.png` });
    await page.waitForFunction(() =>
      document.querySelector('.goal-panel strong')?.textContent.includes('2 auto casts'),
    );
    await page.waitForFunction(
      () => document.querySelector('#workshop')?.getAttribute('data-auto-phase') === 'idle',
    );
    assert.match(await page.locator('.casting-guide').innerText(), /Last auto:.*Lv4/);
    assert.equal(await page.locator('.mode-badge').innerText(), 'Playing');
    assert.equal(
      await page.locator('.effect-status').innerText(),
      '',
      'Standard spells must not trigger an Arcane effect.',
    );
    assert.deepEqual(await page.locator('.piece-controls').boundingBox(), controls);
    await page.screenshot({ path: `${out}/${width}-cast.png` });
    const prices = await page.locator('.spell-price').allTextContents();
    if (touch) await page.getByRole('button', { name: 'Hard drop', exact: true }).tap();
    else await page.keyboard.press('Space');
    assert.deepEqual(
      await page.locator('.spell-price').allTextContents(),
      prices,
      'An ordinary placement must not consume leftover mana.',
    );
    await page.getByRole('button', { name: 'Arcane', exact: true }).click();
    await page.getByRole('button', { name: 'Arcane + Nature', exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector('.mode-badge')?.textContent === 'Aiming',
    );
    assert.equal(await page.locator('.opponent.character-target').count(), 1);
    assert.deepEqual(await page.locator('.piece-controls').boundingBox(), controls);
    await page.screenshot({ path: `${out}/${width}-arcane.png` });
    await page.getByRole('button', { name: 'Cast Arcane Nature', exact: true }).click();
    assert.match(await page.locator('.effect-status').innerText(), /1 blank sends/);
    assert.equal(await page.locator('.mode-badge').innerText(), 'Playing');
    const boxes = await page
      .locator('.board-surface,.spell-area,.action-area,.control-dock')
      .evaluateAll((ns) =>
        ns.map((n) => {
          const r = n.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        }),
      );
    for (const r of boxes)
      assert(r.x >= -1 && r.y >= -1 && r.x + r.w <= width + 1 && r.y + r.h <= height + 1);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        assert(
          a.x + a.w <= b.x + 1 ||
            b.x + b.w <= a.x + 1 ||
            a.y + a.h <= b.y + 1 ||
            b.y + b.h <= a.y + 1,
        );
      }
    assert.deepEqual(errors, []);
    reports.push({
      width,
      height,
      touch,
      readOnlyStandardCards: true,
      learnedRanksVisible: true,
      twoLinesTwoCasts: true,
      targetThenEffectThenResult: true,
      oneHighlightedCaster: true,
      noEarlyManaSpend: true,
      opponentClockFrozen: true,
      noCastOnOrdinaryPlacement: true,
      manualArcane: true,
      stableControls: true,
      noOverlap: true,
      errors,
    });
    await ctx.close();
  }
  writeFileSync(`${out}/report.json`, JSON.stringify(reports, null, 2) + '\n');
  process.stdout.write(JSON.stringify(reports) + '\n');
} finally {
  await browser.close();
}
