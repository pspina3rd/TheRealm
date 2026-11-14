// Focused browser regression for the author-review web sequence. Requires a running dev server.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.argv[2] ?? '/workspace/artifacts/fern-opening';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
});
const origin = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5173';
const errors = [];
const results = [];
async function pageFor(options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await context.addInitScript(() => {
    if (!localStorage.getItem('the-realm/save'))
      localStorage.setItem('the-realm/save', 'ordinary-campaign-sentinel');
  });
  return { context, page };
}
const saved = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('fern-opening/the-realm/save')));
try {
  const { context, page } = await pageFor({ viewport: { width: 1280, height: 960 } });
  await page.goto(`${origin}/?opening=fern`);
  await page.locator('.cinematic-book').waitFor();
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'Skip opening', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('#dialog').open);
  const skipped = await saved(page);
  assert.equal(skipped.mapId, 'overworld');
  assert.equal(skipped.x, 76);
  assert.equal(skipped.y, 73);
  assert.deepEqual(skipped.hero.spells, {});
  assert(skipped.flags.includes('fern:runeStone'));
  assert.equal(
    await page.evaluate(() => localStorage.getItem('the-realm/save')),
    'ordinary-campaign-sentinel',
  );
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(250);
  await page.reload();
  await page.waitForTimeout(500);
  const reloaded = await saved(page);
  assert.equal(reloaded.y, 72);
  assert.equal(await page.locator('#dialog').evaluate((e) => e.open), false);
  await page.screenshot({ path: `${out}/dawn-road-desktop.png` });
  results.push(
    'Skip hands control to a spell-less Fern; ordinary save preserved; movement and reload keep the road position.',
  );
  await context.close();

  const full = await pageFor({ viewport: { width: 1280, height: 960 } });
  await full.page.goto(`${origin}/?opening=fern`);
  await full.page.locator('.cinematic-book').waitFor();
  const seen = [];
  while (await full.page.locator('.cinematic-book').isVisible()) {
    const id = await full.page.locator('.cinematic-book').getAttribute('data-shot');
    assert(!seen.includes(id), `Repeated page ${id}`);
    seen.push(id);
    await full.page.waitForTimeout(270);
    await full.page.getByRole('button', { name: /Next page|Walk onward/ }).click();
  }
  assert.equal(seen.length, 30);
  assert.equal(seen.at(-1), 'beyond-the-patrol');
  const read = await saved(full.page);
  assert.deepEqual(read, skipped);
  results.push('Reading all 30 pages and Skip produce identical saved outcomes.');
  await full.context.close();

  const phone = await pageFor({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  await phone.page.goto(`${origin}/cinematic.html?shot=29&t=2000`);
  await phone.page.locator('.cinematic-book').waitFor();
  assert(
    await phone.page
      .locator('.cinematic-dialogue')
      .innerText()
      .then((t) => t.includes('All seven held steady')),
  );
  assert.equal(
    await phone.page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  const bounds = await phone.page
    .getByRole('button', { name: 'Next page', exact: true })
    .boundingBox();
  assert(bounds.height >= 44);
  await phone.page.screenshot({ path: `${out}/dawn-book-phone.png`, fullPage: true });
  await phone.page.waitForTimeout(300);
  await phone.page.getByRole('button', { name: 'Previous', exact: true }).tap();
  assert.equal(
    await phone.page.locator('.cinematic-book').getAttribute('data-shot'),
    'rowans-watch',
  );
  await phone.page.waitForTimeout(300);
  await phone.page.getByRole('button', { name: 'Replay', exact: true }).tap();
  await phone.page.waitForTimeout(300);
  await phone.page.getByRole('button', { name: 'Skip opening', exact: true }).tap();
  await phone.page.waitForURL('**/?opening=fern&at=dawn');
  await phone.page.waitForFunction(() => {
    const value = localStorage.getItem('fern-opening/the-realm/save');
    return (
      value &&
      JSON.parse(value).flags.includes('opening:fernDawn') &&
      !document.querySelector('#dialog').open
    );
  });
  assert.deepEqual(await saved(phone.page), skipped);
  await phone.page.screenshot({ path: `${out}/dawn-road-phone.png` });
  results.push(
    '393 × 852 touch viewport: no horizontal overflow, 44px controls, Previous/Replay/tap Skip and preview-to-road handoff work.',
  );
  await phone.context.close();

  const held = await pageFor({ viewport: { width: 900, height: 900 } });
  await held.page.goto(`${origin}/cinematic.html`);
  await held.page.locator('.cinematic-book').waitFor();
  await held.page.waitForTimeout(300);
  await held.page.getByRole('button', { name: 'Next page', exact: true }).focus();
  await held.page.keyboard.down('Enter');
  await held.page.waitForTimeout(300);
  const afterFirstPress = await held.page.locator('.cinematic-book').getAttribute('data-shot');
  assert.equal(afterFirstPress, 'the-stones');
  for (let i = 0; i < 3; i++) {
    await held.page.keyboard.down('Enter');
    await held.page.waitForTimeout(300);
    assert.equal(
      await held.page.locator('.cinematic-book').getAttribute('data-shot'),
      afterFirstPress,
    );
  }
  await held.page.keyboard.up('Enter');
  await held.page.keyboard.press('Enter');
  assert.equal(await held.page.locator('.cinematic-book').getAttribute('data-shot'), 'turns-to-go');
  await held.context.close();
  results.push(
    'Holding Enter cannot repeatedly advance pages; releasing and pressing again works.',
  );

  const reduced = await pageFor({ viewport: { width: 900, height: 900 }, reducedMotion: 'reduce' });
  await reduced.page.goto(`${origin}/cinematic.html?shot=14`);
  await reduced.page.locator('.cinematic-book').waitFor();
  assert(await reduced.page.getByRole('button', { name: 'Replay', exact: true }).isDisabled());
  const label = await reduced.page.locator('canvas').getAttribute('aria-label');
  assert(label.includes('chair'));
  await reduced.page.screenshot({ path: `${out}/report-desktop.png`, fullPage: true });
  await reduced.context.close();
  results.push(
    'Reduced-motion presentation uses a still scene; visual descriptions remain available to screen readers.',
  );
  assert.deepEqual(errors, []);
  await writeFile(`${out}/browser-report.json`, JSON.stringify({ results, errors }, null, 2));
  process.stdout.write(JSON.stringify({ results, errors }, null, 2) + '\n');
} finally {
  await browser.close();
}
