// Playwright smoke for the M1 encounters: every encounter's Stakes card, pre-roll board
// and play at 390×844 (touch) and 1100×900, plus Selene's dark test board and a grove
// fight with spores. Screenshots go to the m1 scratch folder; console errors are listed.
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');

const BASE = process.env.BASE ?? 'http://localhost:4191/';
const OUT = process.env.OUT;
const errors = [];

const ENCOUNTERS = [
  { id: 'elder', map: 'mossvale', x: 5, y: 6 },
  { id: 'kid', map: 'mossvale', x: 14, y: 6 },
  { id: 'farmer', map: 'mossvale', x: 7, y: 8 },
  { id: 'stallKeeper', map: 'mossvale', x: 13, y: 11, haggle: true },
  { id: 'forager', map: 'grove', x: 15, y: 5 },
  { id: 'guard', map: 'brightwater', x: 15, y: 16 },
];

async function dismissDialogs(page, max = 30) {
  for (let i = 0; i < max; i++) {
    const open = await page.evaluate(() => document.getElementById('dialog')?.open ?? false);
    if (!open) return;
    await page.waitForTimeout(450);
    await page.keyboard.press('Enter');
  }
}

async function newSave(page) {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE);
  await page.waitForSelector('.class-card');
  await page.click('.class-card');
  await dismissDialogs(page);
  return page.evaluate(() => localStorage.getItem('the-realm/save'));
}

async function placeAt(page, save, spot) {
  const data = JSON.parse(save);
  Object.assign(data, { mapId: spot.map, x: spot.x, y: spot.y, facing: 'right' });
  // The Refusal and the visions have been seen, so the map is clear.
  data.flags = [
    ...new Set([...data.flags, 'scene:refusal', 'vision:vision1', 'map:grove', 'map:brightwater']),
  ];
  await page.evaluate((json) => localStorage.setItem('the-realm/save', json), JSON.stringify(data));
  await page.goto(BASE);
  await page.waitForTimeout(600);
  await dismissDialogs(page);
}

async function run(viewport, touch, tag) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`${tag}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`${tag}: ${err.message}`));
  const save = await newSave(page);
  for (const spot of ENCOUNTERS) {
    await placeAt(page, save, spot);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${tag}-${spot.id}-1-card.png` });
    const take = spot.haggle ? 'Haggle' : 'Take it on';
    await page.getByRole('button', { name: take }).click();
    await page.waitForTimeout(2200); // the demo plays
    await page.screenshot({ path: `${OUT}/${tag}-${spot.id}-2-preroll.png` });
    const board = page.locator('#board-canvas');
    if (touch) await board.tap();
    else await board.click();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight');
      await page.keyboard.press('Space');
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${tag}-${spot.id}-3-play.png` });
    const dialogOpen = await page.evaluate(() => document.getElementById('dialog')?.open ?? false);
    if (!dialogOpen) await page.locator('#giveup-button').click({ force: true, timeout: 3000 });
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${OUT}/${tag}-${spot.id}-4-result.png` });
  }
  // The dark prototype on Selene's test board.
  await page.goto(`${BASE}?board=selene-dark`);
  await page.waitForTimeout(800);
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
  }
  await page.screenshot({ path: `${OUT}/${tag}-selene-dark.png` });
  // A grove fight with spores.
  await placeAt(page, save, { map: 'grove', x: 7, y: 3 });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press(i % 3 ? 'ArrowLeft' : 'ArrowRight');
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: `${OUT}/${tag}-grove-spores.png` });
  await browser.close();
}

await run({ width: 390, height: 844 }, true, 'phone');
await run({ width: 1100, height: 900 }, false, 'desktop');
process.stdout.write(errors.length ? `ERRORS:\n${errors.join('\n')}\n` : 'no console errors\n');
