// Verify real movement, touch gestures and Play -> Aim -> Play, not just spell clicks.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: process.env.CHROMIUM_NO_SANDBOX ? ['--no-sandbox'] : [],
});
const out = process.env.OUT ?? '/tmp/magic-browser';
mkdirSync(out, { recursive: true });
const results = [];
const position = (page) =>
  page
    .locator('.active-piece')
    .evaluateAll((nodes) =>
      nodes.map((n) => [
        Array.from(n.parentElement.children).indexOf(n),
        Array.from(n.parentElement.parentElement.children).indexOf(n.parentElement),
      ]),
    );
const minRow = async (page) => Math.min(...(await position(page)).map(([, y]) => y));
const minColumn = async (page) => Math.min(...(await position(page)).map(([x]) => x));
const settled = (page) =>
  page
    .locator('.magic-square:not(.active-piece):not(.landing-ghost)')
    .evaluateAll((nodes) => nodes.filter((n) => n.getAttribute('aria-label') !== 'empty').length);
async function touch(cdp, type, x, y) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
  });
}
try {
  for (const [width, height, touchscreen] of [
    [360, 640, true],
    [390, 844, true],
    [1100, 900, false],
  ]) {
    const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: touchscreen,
        isMobile: touchscreen,
      }),
      page = await context.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${process.env.BASE ?? 'http://127.0.0.1:5186/'}workshop.html`);
    await page.getByRole('heading', { name: 'Magic workshop', exact: true }).waitFor();
    const board = page.locator('.board-surface'),
      badge = page.locator('.mode-badge');
    assert.equal(await badge.innerText(), 'Playing');
    assert.equal(await board.locator('.magic-row').count(), 20);
    assert((await page.locator('.active-piece').count()) > 0);
    assert((await page.locator('.landing-ghost').count()) > 0);
    const boardBox = await board.boundingBox(),
      stripBox = await page.locator('.spell-strip').boundingBox(),
      controlsBox = await page.locator('.control-dock').boundingBox();
    assert(
      boardBox &&
        stripBox &&
        controlsBox &&
        boardBox.y + boardBox.height <= stripBox.y + 1 &&
        stripBox.y + stripBox.height <= controlsBox.y + 1,
      'Full board and controls must not overlap.',
    );
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight,
      ),
      false,
    );
    let before = await minRow(page);
    await page.keyboard.press('ArrowDown');
    assert((await minRow(page)) > before, 'Down Arrow must soft drop in default live play.');
    let count = await settled(page);
    await page.keyboard.press('Space');
    assert((await settled(page)) > count, 'Space must drop the piece.');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await page.getByRole('button', { name: 'Pause game', exact: true }).click();
    const frozen = await position(page);
    await page.waitForTimeout(1100);
    assert.deepEqual(await position(page), frozen);
    await page.getByRole('button', { name: 'Resume game', exact: true }).click();
    let touchChecks = {};
    if (touchscreen) {
      const cdp = await context.newCDPSession(page);
      const reset = async () => {
        await page.getByRole('button', { name: 'Reset', exact: true }).tap();
      };
      const box = await board.boundingBox(),
        x = box.x + box.width * 0.45,
        y = box.y + box.height * 0.2;
      let old = await position(page);
      await page.touchscreen.tap(x, y);
      assert.notDeepEqual(await position(page), old, 'A Play-mode tap rotates.');
      await reset();
      const down = await page.getByRole('button', { name: 'Soft drop', exact: true }).boundingBox();
      before = await minRow(page);
      await touch(cdp, 'touchStart', down.x + down.width / 2, down.y + down.height / 2);
      await page.waitForTimeout(250);
      await touch(cdp, 'touchEnd', 0, 0);
      assert((await minRow(page)) >= before + 2, 'Held touch Down must repeat.');
      await reset();
      before = await minColumn(page);
      await touch(cdp, 'touchStart', x, y);
      await page.waitForTimeout(40);
      await touch(cdp, 'touchMove', x + box.width * 0.18, y);
      await touch(cdp, 'touchEnd', 0, 0);
      assert((await minColumn(page)) > before, 'A sideways swipe must move the piece.');
      await reset();
      before = await minRow(page);
      count = await settled(page);
      await touch(cdp, 'touchStart', x, y);
      await page.waitForTimeout(150);
      await touch(cdp, 'touchMove', x, y + 50);
      await page.waitForTimeout(350);
      await touch(cdp, 'touchEnd', 0, 0);
      assert((await minRow(page)) > before);
      assert.equal(
        await settled(page),
        count,
        'A held downward drag soft drops, without a hard drop.',
      );
      await reset();
      count = await settled(page);
      await touch(cdp, 'touchStart', x, y);
      await page.waitForTimeout(15);
      await touch(cdp, 'touchMove', x, y + 85);
      await touch(cdp, 'touchEnd', 0, 0);
      assert((await settled(page)) > count, 'A downward flick hard drops.');
      touchChecks = {
        tapRotate: true,
        heldDown: true,
        swipeMove: true,
        dragSoftDrop: true,
        flickHardDrop: true,
      };
    }
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await page.screenshot({ path: `${out}/${width}-workshop.png`, fullPage: true });
    const trigger = page.getByRole('button', { name: 'Lightning', exact: true });
    if (touchscreen) await trigger.tap();
    else await trigger.click();
    assert.equal(await badge.innerText(), 'Aiming');
    const aimed = await position(page),
      clock = await page.locator('.opponent').innerText();
    await page.waitForTimeout(1100);
    assert.deepEqual(await position(page), aimed);
    assert.equal(
      await page.locator('.opponent').innerText(),
      clock,
      'Aim freezes the opponent clock.',
    );
    const box = await board.boundingBox(),
      tx = box.x + box.width * 0.45,
      ty = box.y + box.height * (17.5 / 20);
    if (touchscreen) await page.touchscreen.tap(tx, ty);
    else await page.mouse.click(tx, ty);
    assert.deepEqual(
      await position(page),
      aimed,
      'An Aim-mode touch chooses a row without rotating.',
    );
    assert.equal(await page.locator('.magic-row.selected').count(), 2);
    assert.equal(await page.getByRole('button', { name: 'Cast', exact: true }).isEnabled(), true);
    await page.screenshot({ path: `${out}/${width}-preview.png`, fullPage: true });
    const obstructions = await page.locator('.obstruction').count();
    if (touchscreen) await page.getByRole('button', { name: 'Cast', exact: true }).tap();
    else await page.keyboard.press('Enter');
    assert.equal(await badge.innerText(), 'Playing');
    assert((await page.locator('.obstruction').count()) < obstructions);
    const mana = await page.evaluate(
      () => JSON.parse(localStorage.getItem('magic-workshop:the-realm/save')).hero.mana.lightning,
    );
    assert.equal(mana, 86, 'Touch confirmation pays for exactly one rank-four Lightning cast.');
    before = await minRow(page);
    await page.keyboard.press('ArrowDown');
    assert((await minRow(page)) > before, 'Down still works immediately after casting.');
    await page.getByRole('button', { name: 'Fire', exact: true }).click();
    const cancelState = await board
      .locator('.magic-square')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label')));
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await badge.innerText(), 'Playing');
    assert.deepEqual(
      await board
        .locator('.magic-square')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label'))),
      cancelState,
    );
    await page.getByRole('button', { name: 'Arcane', exact: true }).click();
    await page.keyboard.press('9');
    assert.equal(await badge.innerText(), 'Playing', 'Invalid spell slots are ignored.');
    const sizes = await page
      .locator('button')
      .evaluateAll((nodes) =>
        nodes.filter((n) => n.getClientRects().length).map((n) => n.getBoundingClientRect()),
      );
    assert(
      sizes.every((b) => b.width >= 43 && b.height >= 43),
      'Every visible touch button needs a 44px target.',
    );
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      hasTouch: touchscreen,
      fullBoard: true,
      defaultLive: true,
      downArrow: true,
      spaceDrop: true,
      aimPauses: true,
      aimDoesNotRotate: true,
      castOnce: true,
      resumesPlay: true,
      cancelNoMutation: true,
      noOverlap: true,
      ...touchChecks,
      errors,
    });
    await context.close();
  }
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2) + '\n');
  process.stdout.write(JSON.stringify(results) + '\n');
} finally {
  await browser.close();
}
