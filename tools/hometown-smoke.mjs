// Actual hero selection and opening on desktop and phone viewports; no full-campaign claim.
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
const out = process.env.OUT ?? '/tmp/hometown-browser';
mkdirSync(out, { recursive: true });
const report = [];
try {
  for (const mobile of [false, true]) {
    for (const hero of [
      { id: 'ranger', label: 'Ranger · Fern', home: 'mossvale', name: 'Mossvale' },
      { id: 'knight', label: 'Knight · Lance', home: 'redrockVillage', name: 'Redrock Village' },
      { id: 'mage', label: 'Mage · Ares', home: 'glasswaterVillage', name: 'Glasswater Village' },
      { id: 'rogue', label: 'Rogue · Vex', home: 'thornwoodVillage', name: 'Thornwood Village' },
    ]) {
      const context = await browser.newContext({
        viewport: mobile ? { width: 393, height: 852 } : { width: 1280, height: 800 },
        hasTouch: mobile,
        isMobile: mobile,
        deviceScaleFactor: mobile ? 3 : 1,
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route(/\/src\/main\.ts(?:\?.*)?$/, (route) =>
        route.fulfill({
          contentType: 'application/javascript',
          body: "import '/src/style.css';import {App} from '/src/ui/app.ts';import {Atlas} from '/src/ui/art/atlas.ts';import {createStore} from '/src/game/storage.ts';const atlas=new Atlas();await atlas.load('/assets/');window.hometownQA=new App(atlas,createStore());window.hometownQA.start();",
        }),
      );
      await page.goto(process.env.BASE ?? 'http://127.0.0.1:5191/');
      const card = page.locator('.class-card').filter({ hasText: hero.label });
      assert((await card.innerText()).includes('Home: ' + hero.name));
      await card.click();
      let intro = '';
      for (let i = 0; i < 15 && (await page.locator('#dialog.interlude[open]').count()); i++) {
        intro += '\n' + (await page.locator('#dialog-body').innerText());
        await page.waitForTimeout(650);
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
      }
      assert(intro.includes('Dawn in ' + hero.name + '.'));
      if (hero.id !== 'ranger') assert(!intro.includes('Mossvale'));
      assert.equal(await page.locator('#dialog[open]').count(), 0);
      const state = await page.evaluate(() => ({
        map: window.hometownQA.state.mapId,
        spells: window.hometownQA.state.hero.spells,
        flags: [...window.hometownQA.state.flags],
      }));
      assert.equal(state.map, hero.home);
      assert.deepEqual(state.spells, {});
      assert(!state.flags.includes('got:wellStone'));
      assert((await page.locator('#hud-place').innerText()).includes(hero.name));
      // Focus the village center for a comparable view of the same neighbors and regional terrain.
      await page.evaluate(() => {
        window.hometownQA.state.x = 17;
        window.hometownQA.state.y = 11;
      });
      await page.waitForTimeout(1200);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      await page.screenshot({
        path: out + '/' + hero.id + (mobile ? '-phone' : '-desktop') + '.png',
      });
      assert.deepEqual(errors, []);
      report.push({ hero: hero.id, mobile, home: state.map, opening: true, zeroSpells: true });
      process.stdout.write(JSON.stringify(report.at(-1)) + '\n');
      await context.close();
    }
  }
  writeFileSync(out + '/report.json', JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
