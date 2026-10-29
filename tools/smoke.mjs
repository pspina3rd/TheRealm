// Run against the development server. Requires Playwright installed in this
// project or PLAYWRIGHT_MODULE pointing to an installed Playwright module.
// This is a render/input fixture, not an author playthrough or balance test.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright'));
} catch {
  throw new Error(
    'Install Playwright locally or set PLAYWRIGHT_MODULE to its installed module path.',
  );
}
const BASE = process.env.BASE ?? 'http://localhost:5173/';
const OUT = process.env.OUT ?? join(tmpdir(), 'mana-m1-smoke');
mkdirSync(OUT, { recursive: true });
const errors = [];
const captures = [];
let correctionActions = 0;
const MAIN = `
import { App } from '/src/ui/app.ts';
import { Atlas } from '/src/ui/art/atlas.ts';
import { createStore } from '/src/game/storage.ts';
import '/src/style.css';
const atlas = new Atlas(); await atlas.load('/assets/');
window.m1QA = new App(atlas, createStore());
// Timing guards retain unit coverage; these captures exercise rendering/actions.
const dialog = window.m1QA.dialog;
const show = dialog.show.bind(dialog);
const interlude = dialog.showInterlude.bind(dialog);
dialog.show = options => show({ ...options, guardMs: 0 });
dialog.showInterlude = (title, body, done) => interlude(title, body, done, 0);
window.m1QA.start();
`;
const ENCOUNTERS = [
  { id: 'elder', map: 'mossvale', x: 5, y: 6 },
  { id: 'kid', map: 'mossvale', x: 14, y: 6 },
  { id: 'farmer', map: 'mossvale', x: 7, y: 8 },
  { id: 'stallKeeper', map: 'mossvale', x: 13, y: 11 },
  { id: 'forager', map: 'grove', x: 15, y: 5 },
  { id: 'guard', map: 'brightwater', x: 15, y: 16 },
];
async function dismissDialogs(page, max = 30) {
  for (let i = 0; i < max; i++) {
    if (!(await page.locator('#dialog').evaluate((e) => e.open))) return;
    await page.waitForTimeout(20);
    await page.keyboard.press('Enter');
  }
  throw new Error('Fixture did not dismiss its scene/result dialogs');
}
async function placeAt(page, save, spot) {
  const data = JSON.parse(save);
  Object.assign(data, { mapId: spot.map, x: spot.x, y: spot.y, facing: 'right' });
  data.flags = [
    ...new Set([...data.flags, 'scene:refusal', 'vision:1', 'map:grove', 'map:brightwater']),
  ];
  await page.evaluate((json) => localStorage.setItem('the-realm/save', json), JSON.stringify(data));
  await page.goto(BASE);
  await dismissDialogs(page);
}
async function screenshot(page, tag) {
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    `${tag}: horizontal overflow`,
  );
  await page.screenshot({ path: join(OUT, `${tag}.png`), fullPage: true });
  captures.push(`${tag}.png`);
}
async function run(viewport, touch, tag) {
  process.stdout.write(`Checking ${tag} ${viewport.width}x${viewport.height}\n`);
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    ...(process.env.CHROMIUM_NO_SANDBOX ? { args: ['--no-sandbox'] } : {}),
  });
  try {
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    // Expose the real App only in this intercepted test entry, never in production.
    await page.route('**/src/main.ts', (route) =>
      route.fulfill({ contentType: 'application/javascript', body: MAIN }),
    );
    page.on('pageerror', (error) => errors.push(`${tag}: ${error.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`${tag}: ${msg.text()}`);
    });
    await page.goto(BASE);
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE);
    await page.locator('.class-card').first().click();
    await dismissDialogs(page);
    const save = await page.evaluate(() => localStorage.getItem('the-realm/save'));
    for (const spot of ENCOUNTERS) {
      await placeAt(page, save, spot);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(150);
      await screenshot(page, `${tag}-${spot.id}-card`);
      await page.getByRole('button', { name: 'Take it on', exact: true }).click();
      await dismissDialogs(page);
      await page.waitForFunction(
        () => window.m1QA?.active && !window.m1QA.active.battle.demoPlaying,
      );
      if (touch) {
        for (const selector of [
          '#pause-button',
          '.leave-battle',
          '#rotate-button',
          ...(spot.id === 'elder' || spot.id === 'kid' ? ['.correct-drop'] : []),
        ]) {
          const rect = await page.locator(selector).boundingBox();
          assert(rect && rect.width >= 43 && rect.height >= 43, `${tag}: small target ${selector}`);
          if (selector === '.correct-drop') {
            const boardRect = await page.locator('#board-canvas').boundingBox();
            assert(
              rect.height <= 60 && rect.x >= boardRect.x + boardRect.width,
              `${tag}: correction overlaps the board`,
            );
            const rotate = await page.locator('#rotate-button').boundingBox();
            assert(rect.y + rect.height < rotate.y, `${tag}: correction overlaps Rotate`);
          }
        }
      }
      await screenshot(page, `${tag}-${spot.id}-preroll`);
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight');
        await page.keyboard.press('Space');
        await page.waitForTimeout(100);
      }
      if (
        (spot.id === 'elder' || spot.id === 'kid') &&
        (await page.locator('.correct-drop').isEnabled())
      ) {
        const placed = await page.evaluate(() => window.m1QA.active.battle.board.piecesPlaced);
        await page.locator('.correct-drop').click();
        assert.equal(await page.evaluate(() => window.m1QA.active.battle.correctionsRemaining), 0);
        assert.equal(
          await page.evaluate(() => window.m1QA.active.battle.board.piecesPlaced),
          placed - 1,
        );
        correctionActions++;
        await screenshot(page, `${tag}-${spot.id}-corrected`);
      }
      await screenshot(page, `${tag}-${spot.id}-play`);
      if (!(await page.locator('#dialog').evaluate((e) => e.open)))
        await page.locator('.leave-battle').click();
      await page.waitForTimeout(200);
      await screenshot(page, `${tag}-${spot.id}-result`);
    }
    await placeAt(page, save, { map: 'grove', x: 7, y: 3 });
    await page.keyboard.press('ArrowRight');
    await dismissDialogs(page);
    await screenshot(page, `${tag}-grove-spores`);
    await page.evaluate(async () => {
      const { DarkRule } = await import('/src/battle/rules.ts');
      const app = window.m1QA;
      app.startBattle(
        { kind: 'mentor', id: 'fixture:selene', mentorId: 'selene', x: 0, y: 0 },
        {
          kind: 'lesson',
          mentorId: 'selene',
          enemyId: 'gloomToad',
          spellId: 'shadow',
          difficulty: 1,
        },
      );
      app.active.battle.rule = new DarkRule(app.active.battle);
      app.active.battle.board.loadRows([
        '..nnnnnn..',
        '..nn..nn..',
        '.nnnnnnnn.',
        'nnn..nnnnn',
        'nnnnnnnn.n',
        'nnnn.nnnnn',
        'nnnnnn.nnn',
        'nn.nnnnnnn',
      ]);
    });
    await page.waitForTimeout(150);
    await screenshot(page, `${tag}-isolated-dark`);
  } finally {
    await browser.close();
  }
}
await run({ width: 390, height: 844 }, true, 'phone390');
await run({ width: 360, height: 640 }, true, 'phone360');
await run({ width: 1100, height: 900 }, false, 'desktop');
assert.deepEqual(errors, [], 'Browser console/page errors');
assert(correctionActions >= 3, 'Correction exercised on every viewport');
writeFileSync(
  join(OUT, 'report.json'),
  JSON.stringify(
    {
      viewports: [
        [390, 844],
        [360, 640],
        [1100, 900],
      ],
      captures,
      errors,
      horizontalOverflow: false,
      minimumPhoneTargets: 44,
      correctionActionsVerified: correctionActions,
    },
    null,
    2,
  ) + '\n',
);
process.stdout.write(`Screenshots: ${OUT}\nNo console errors or horizontal overflow.\n`);
