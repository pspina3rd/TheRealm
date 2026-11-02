// Real App, prepared seen-opening saves, four hometowns, touch/keyboard map navigation.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const b = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: process.env.CHROMIUM_NO_SANDBOX ? ['--no-sandbox'] : [],
});
const reports = [];
const out = process.env.OUT ?? '/tmp/surface-app-smoke';
mkdirSync(out, { recursive: true });
try {
  for (const mobile of [false, true])
    for (const cls of ['ranger', 'knight', 'mage', 'rogue']) {
      const context = await b.newContext({
        viewport: mobile ? { width: 393, height: 852 } : { width: 1280, height: 960 },
        hasTouch: mobile,
        isMobile: mobile,
        deviceScaleFactor: mobile ? 3 : 1,
      });
      const page = await context.newPage();
      const activate = async (locator) => (mobile ? locator.tap() : locator.click());
      const errors = [];
      page.on('pageerror', (e) => {
        errors.push(e.message);
        console.log('PAGE ERROR', e.message);
      });
      page.setDefaultTimeout(20000);
      await page.route(/\/src\/main\.ts(?:\?.*)?$/, (r) =>
        r.fulfill({
          contentType: 'application/javascript',
          body: "import '/src/style.css';import {App} from '/src/ui/app.ts';import {Atlas} from '/src/ui/art/atlas.ts';import {createStore} from '/src/game/storage.ts';const atlas=new Atlas();await atlas.load('/assets/');window.surfaceQA=new App(atlas,createStore());window.surfaceQA.start();",
        }),
      );
      await page.goto(process.env.BASE ?? 'http://127.0.0.1:5191/');
      // Prepare only the already-seen opening. The real App loads and renders the new game save.
      const home = await page.evaluate(async (cls) => {
        const { newGame } = await import('/src/world/state.ts');
        const { serialize, SAVE_KEY } = await import('/src/game/save.ts');
        const { hometownOf } = await import('/src/data/hometowns.ts');
        const state = newGame(cls);
        state.flags.add('scene:opening');
        localStorage.setItem(SAVE_KEY, serialize(state));
        return hometownOf(state.flags);
      }, cls);
      await page.reload();
      await page.waitForFunction(() => window.surfaceQA?.started);
      assert.equal(await page.evaluate(() => window.surfaceQA.state.mapId), home.map);
      // Start on the safe road outside the selected home using the real saved world position.
      await page.evaluate(async () => {
        const { hometownOf } = await import('/src/data/hometowns.ts');
        const { travel } = await import('/src/world/state.ts');
        travel(window.surfaceQA.state, hometownOf(window.surfaceQA.state.flags).returnTo);
        window.surfaceQA.renderHud();
      });
      await page.waitForTimeout(350);
      await activate(page.locator('#menu-button'));
      await activate(page.getByRole('button', { name: 'World map', exact: true }));
      await page.locator('canvas.world-overview').waitFor();
      await activate(page.getByRole('button', { name: home.name + ' · home', exact: true }));
      assert.equal(
        await page
          .getByRole('button', { name: home.name + ' · home', exact: true })
          .getAttribute('aria-pressed'),
        'true',
      );
      await activate(page.getByRole('button', { name: 'Windward Cliffs · closed', exact: true }));
      assert((await page.locator('#dialog-body [role=status]').innerText()).includes('Forgefyre'));
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      await page.screenshot({
        path: out + '/' + cls + (mobile ? '-phone' : '-desktop') + '-map.png',
      });
      await activate(page.getByRole('button', { name: 'Back', exact: true }));
      await activate(page.getByRole('button', { name: 'Close', exact: true }));
      const before = await page.evaluate(() => ({
        x: window.surfaceQA.state.x,
        y: window.surfaceQA.state.y,
        spells: window.surfaceQA.state.hero.spells,
        items: window.surfaceQA.state.hero.items,
      }));
      if (mobile) {
        const point = await page.evaluate(() => {
          const q = window.surfaceQA,
            c = document.querySelector('#world-canvas'),
            r = c.getBoundingClientRect();
          return {
            x: r.left + (((q.state.x + 0.5) * 32 - q.world.camX) / c.width) * r.width,
            y: r.top + (((q.state.y + 1.5) * 32 - q.world.camY) / c.height) * r.height,
          };
        });
        await page.touchscreen.tap(point.x, point.y);
      } else await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(250);
      const after = await page.evaluate(() => ({
        x: window.surfaceQA.state.x,
        y: window.surfaceQA.state.y,
        spells: window.surfaceQA.state.hero.spells,
        items: window.surfaceQA.state.hero.items,
      }));
      assert(before.x !== after.x || before.y !== after.y);
      assert.deepEqual(after.spells, {});
      assert.deepEqual(after.items, before.items);
      const perf = await page.evaluate(async () => {
        const times = [];
        for (let i = 0; i < 35; i++) {
          const t = performance.now();
          window.surfaceQA.world.render(window.surfaceQA.state, 16, performance.now());
          times.push(performance.now() - t);
        }
        times.sort((a, b) => a - b);
        return { renderMedianMs: times[17], renderP95Ms: times[33] };
      });
      await page.screenshot({
        path: out + '/' + cls + (mobile ? '-phone' : '-desktop') + '-road.png',
      });
      await activate(page.locator('#menu-button'));
      await page.reload();
      await page.waitForFunction(() => window.surfaceQA?.started);
      const restored = await page.evaluate(() => ({
        map: window.surfaceQA.state.mapId,
        x: window.surfaceQA.state.x,
        y: window.surfaceQA.state.y,
      }));
      assert.deepEqual(restored, { map: 'overworld', x: after.x, y: after.y });
      assert.deepEqual(errors, []);
      reports.push({ cls, mobile, home: home.name, ...perf });
      console.log(reports.at(-1));
      await context.close();
    }
  writeFileSync(out + '/report.json', JSON.stringify(reports, null, 2));
} finally {
  await b.close();
}
