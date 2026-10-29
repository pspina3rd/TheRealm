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
    const disjoint = (a, b) =>
      a &&
      b &&
      (a.x + a.width <= b.x + 1 ||
        b.x + b.width <= a.x + 1 ||
        a.y + a.height <= b.y + 1 ||
        b.y + b.height <= a.y + 1);
    assert(
      disjoint(boardBox, stripBox) &&
        disjoint(boardBox, controlsBox) &&
        disjoint(stripBox, controlsBox),
      'Board, spells and movement controls must not overlap.',
    );
    const spellButtons = page.locator('.spell-strip button');
    assert.equal(await spellButtons.count(), 6);
    assert.equal(await page.locator('.spell-price').filter({ hasText: 'held' }).count(), 6);
    for (const node of await spellButtons.all()) assert(await node.isVisible());
    const stableControls = await page.locator('.piece-controls').boundingBox();
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
    await page.waitForFunction(
      () => document.querySelector('.mode-badge')?.textContent === 'Aiming',
      undefined,
      { timeout: 2000 },
    );
    assert.equal(await badge.innerText(), 'Aiming');
    assert.deepEqual(
      await page.locator('.piece-controls').boundingBox(),
      stableControls,
      'Movement buttons must retain their positions during aiming.',
    );
    assert.equal(
      await page.getByRole('button', { name: 'Soft drop', exact: true }).isDisabled(),
      true,
    );
    assert.equal(
      await page.getByRole('button', { name: 'Cast Lightning', exact: true }).isDisabled(),
      true,
    );
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
    assert.equal(
      await page.getByRole('button', { name: 'Cast Lightning', exact: true }).isEnabled(),
      true,
    );
    assert.match(await page.locator('.casting-guide').innerText(), /Preview/);
    const uncastState = await board
      .locator('.magic-square')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label')));
    await page.getByRole('button', { name: 'Show original board', exact: true }).click();
    assert.match(await page.locator('.casting-guide').innerText(), /Before/);
    await page.getByRole('button', { name: 'Show spell result', exact: true }).click();
    assert.deepEqual(
      await board
        .locator('.magic-square')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label'))),
      uncastState,
      'Preview comparison cannot mutate the actual board.',
    );
    await page.screenshot({ path: `${out}/${width}-preview.png`, fullPage: true });
    const obstructions = await page.locator('.obstruction').count();
    if (touchscreen) await page.getByRole('button', { name: 'Cast Lightning', exact: true }).tap();
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
    // Exercise the most crowded target options and a character-targeted spell.
    const exercise = async (title) => {
      await page.getByRole('button', { name: 'Exercises', exact: true }).click();
      await page.getByRole('button', { name: title, exact: true }).click();
    };
    await exercise('Push the block into place');
    await page.getByRole('button', { name: 'Wind', exact: true }).click();
    const windBox = await board.boundingBox();
    await page.mouse.click(windBox.x + windBox.width * 0.45, windBox.y + windBox.height * 0.925);
    await page.getByRole('button', { name: 'Wind left', exact: true }).click();
    assert.match(await page.locator('.casting-guide').innerText(), /left/);
    await page.getByRole('button', { name: 'Wind right', exact: true }).click();
    assert.match(await page.locator('.casting-guide').innerText(), /right/);
    await page.screenshot({ path: `${out}/${width}-wind.png`, fullPage: true });
    const tools = await page.locator('.aim-controls').boundingBox(),
      action = await page.locator('.action-area').boundingBox();
    assert(
      tools.x >= action.x && tools.x + tools.width <= action.x + action.width + 1,
      'Wind options must fit within the casting area.',
    );
    await page.getByRole('button', { name: 'Cast Wind', exact: true }).click();
    assert.equal(await page.locator('.goal-panel strong').innerText(), 'Exercise complete');
    await exercise('Turn obstacles into usable blocks');
    await page.getByRole('button', { name: 'Nature', exact: true }).click();
    const natureBox = await board.boundingBox();
    await page.mouse.click(
      natureBox.x + natureBox.width * 0.75,
      natureBox.y + natureBox.height * 0.975,
    );
    await page.getByRole('button', { name: 'Cast Nature', exact: true }).click();
    assert.equal(await page.locator('.magic-square[aria-label="neutral"]').count(), 1);
    await page.screenshot({ path: `${out}/${width}-nature.png`, fullPage: true });
    await exercise('Change what Slime sends');
    await page.getByRole('button', { name: 'Arcane + Nature', exact: true }).click();
    assert.equal(await page.locator('.opponent.character-target').count(), 1);
    assert.equal(await page.locator('.board-target').count(), 0);
    await page.screenshot({ path: `${out}/${width}-arcane.png`, fullPage: true });
    await page.getByRole('button', { name: 'Cast Arcane Nature', exact: true }).click();
    assert.match(await page.locator('.effect-status').innerText(), /1 blank sends/);
    if (width === 390) {
      await page.waitForFunction(
        () => document.querySelectorAll('.magic-square[aria-label="neutral"]').length > 0,
        undefined,
        { timeout: 12000 },
      );
    }

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
      stableMovementControls: true,
      manaVisible: true,
      compareDoesNotMutate: true,
      windOptionsFit: true,
      natureMakesBlank: true,
      arcaneTargetsOpponent: true,
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
