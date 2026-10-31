// Production App/navigation/rendering, with staged saves and a reproducible earned line.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.OUT ?? '/tmp/main-casting-browser';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: process.env.CHROMIUM_NO_SANDBOX ? ['--no-sandbox'] : [],
});
const entry = `import '/src/style.css'; import {App} from '/src/ui/app.ts'; import {Atlas} from '/src/ui/art/atlas.ts'; import {createStore} from '/src/game/storage.ts'; const atlas=new Atlas(); await atlas.load('/assets/'); window.castingQA=new App(atlas,createStore()); window.castingQA.start();`;
try {
  const reports = [];
  for (const [width, height, touch] of [
    [360, 640, true],
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
    await page.route(/\/src\/main\.ts(?:\?.*)?$/, (route) =>
      route.fulfill({ contentType: 'application/javascript', body: entry }),
    );
    try {
      await page.goto(process.env.BASE ?? 'http://127.0.0.1:5186/');
      await page.evaluate(async () => {
        const { newGame } = await import('/src/world/state.ts'),
          { serialize, SAVE_KEY } = await import('/src/game/save.ts'),
          { newKnownSpell } = await import('/src/game/spells.ts'),
          { SCENES } = await import('/src/data/story.ts');
        const state = newGame();
        state.mapId = 'overworld';
        state.x = 8;
        state.y = 3;
        state.facing = 'right';
        state.respawn = { map: 'overworld', x: 8, y: 3 };
        for (const scene of SCENES) state.flags.add('scene:' + scene.id);
        state.hero.spells = {
          fire: { ...newKnownSpell(), level: 2 },
          quake: { ...newKnownSpell(), level: 1 },
          shadow: { ...newKnownSpell(), level: 2 },
        };
        // No rollout flag: normal App must select the current rules for existing saves.
        localStorage.setItem(SAVE_KEY, serialize(state));
        localStorage.setItem('the-realm/touch-buttons', '1');
      });
      await page.reload();
      await page.waitForFunction(() => window.castingQA?.started);
      await page.keyboard.press('ArrowRight');
      await page.locator('.auto-standard').first().waitFor();
      assert.match(await page.locator('[data-spell=fire]').innerText(), /Fire · Lv 2/);
      assert.match(await page.locator('[data-spell=quake]').innerText(), /Gravity · Lv 1/);
      assert.equal(await page.locator('#spell-list button[data-action=fire]').count(), 0);
      assert.equal(await page.locator('#spell-list button[data-action=quake]').count(), 0);
      await page.locator('[data-spell=fire]').click();
      await page.keyboard.press('1');
      assert.equal(await page.evaluate(() => window.castingQA.active.battle.autoCastCount), 0);
      await page.evaluate(() => {
        const b = window.castingQA.active.battle;
        b.combat.enemyHp = 10000;
        b.board.loadRows(['..rr......', '..........', 'rrrr.rrrrr', 'rrrr.rrrrr']);
        b.board.replaceActive('I', {
          x: 4,
          cells: [
            [0, 0],
            [0, 1],
            [0, 2],
            [0, 3],
          ],
        });
      });
      if (touch) await page.getByRole('button', { name: 'Hard drop', exact: true }).tap();
      else await page.keyboard.press('Space');
      await page.waitForFunction(
        () => window.castingQA.active.battle.autoFrame?.phase === 'target',
      );
      assert.equal(await page.locator('.auto-standard.casting-now').count(), 1);
      assert.match(await page.locator('.auto-cast-summary').innerText(), /Fire Lv 2/);
      await page.screenshot({ path: `${out}/${width}-target.png` });
      await page.waitForFunction(() => !window.castingQA.active.battle.autoCastingBusy);
      assert.equal(await page.evaluate(() => window.castingQA.active.battle.autoCastCount), 1);
      assert.equal(await page.evaluate(() => window.castingQA.active.battle.hero.mana.fire), 4);
      assert.match(await page.locator('.auto-cast-summary').innerText(), /Last: Fire Lv 2/);
      await page.screenshot({ path: `${out}/${width}-auto.png` });
      const card = await page.locator('[data-spell=fire]').boundingBox();
      assert(
        card.x >= 0 &&
          card.y >= 0 &&
          card.x + card.width <= width &&
          card.y + card.height <= height,
        'Automatic card must fit the viewport.',
      );
      await page.evaluate(() => {
        const app = window.castingQA,
          b = app.active.battle;
        app.state.flags.add('wyrmBeaten');
        app.state.flags.add('scene:chapterEnd');
        b.hero.spells.quake.level = 2;
        b.hero.weaving = {
          equipped: 'test',
          recipes: [
            {
              id: 'test',
              name: 'Emberfall',
              level: 2,
              stages: [
                { spell: 'fire', rank: 2 },
                { spell: 'quake', rank: 1 },
              ],
            },
          ],
        };
        b.hero.mana.fire = b.hero.mana.earth = 12;
        for (const id of [
          'fire',
          'blizzard',
          'quake',
          'gale',
          'thunder',
          'natureConvert',
          'shadow',
        ])
          b.hero.spells[id] = {
            level: 4,
            step: { power: 0, efficiency: 0, effect: 0 },
            kept: { power: 0, efficiency: 0, effect: 0 },
          };
        b.hero.arcane = { nature: 1 };
      });
      await page.locator('.equipped-weaving').waitFor();
      assert.equal(await page.locator('.auto-standard').count(), 7);
      const charge = await page
        .locator('[data-spell=fire] [role=progressbar]')
        .evaluate((meter) => ({
          held: meter.getAttribute('aria-valuenow'),
          cost: meter.getAttribute('aria-valuemax'),
          height: meter.getBoundingClientRect().height,
          fill: meter.querySelector('.spell-charge-fill').style.width,
          labelSize: parseFloat(
            getComputedStyle(meter.querySelector('.spell-charge-label')).fontSize,
          ),
        }));
      assert.equal(charge.held, '12');
      assert.equal(charge.cost, '12');
      assert.equal(charge.fill, '100%');
      assert(
        charge.height >= 14 && charge.labelSize >= 11,
        'Charge must remain legible on phones.',
      );
      if (touch) {
        const fits = await page
          .locator('#spell-list')
          .evaluate((rail) =>
            [...rail.querySelectorAll('.auto-standard')].every(
              (card) => card.getBoundingClientRect().bottom <= rail.getBoundingClientRect().bottom,
            ),
          );
        if (!fits) {
          assert(
            await page.locator('.auto-scroll-hint').isVisible(),
            'Overflowing spellbooks need a visible continuation cue.',
          );
          const accessible = await page.locator('#spell-list').evaluate((rail) => {
            rail.scrollTop = rail.scrollHeight;
            const last = rail.querySelector('.auto-standard:last-of-type').getBoundingClientRect();
            const bounds = rail.getBoundingClientRect();
            const visible = last.top >= bounds.top && last.bottom <= bounds.bottom;
            rail.scrollTop = 0;
            return visible;
          });
          assert(accessible, 'Every learned school must remain reachable in the bounded rail.');
        }
      }

      const manualBounds = await page.locator('.manual-spells').boundingBox();
      assert(
        manualBounds.y >= 0 && manualBounds.y + manualBounds.height <= height,
        'All manual actions stay in the viewport.',
      );
      await page.screenshot({ path: `${out}/${width}-full-book.png` });
      assert.match(await page.locator('.equipped-weaving').innerText(), /Fire Lv 2 → Gravity Lv 1/);
      await page.locator('.equipped-weaving').click();
      await page.locator('.weaving-target').waitFor();
      assert.equal(
        await page.locator('.weave-previews .magic-grid:visible').count(),
        touch ? 1 : 3,
      );
      const cast = await page
        .getByRole('button', { name: 'Cast custom spell', exact: true })
        .boundingBox();
      assert(cast.y >= 0 && cast.y + cast.height <= height, 'Custom cast stays in view.');
      if (touch) {
        await page.getByRole('tab', { name: 'After 1 · aim 2', exact: true }).click();
        assert.equal(
          await page.getByLabel('Effect 2 target row', { exact: true }).isVisible(),
          true,
        );
      }
      await page.screenshot({ path: `${out}/${width}-weaving.png` });
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await page.evaluate(() => {
        const b = window.castingQA.active.battle;
        b.hero.spells = {
          shadow: {
            level: 2,
            step: { power: 0, efficiency: 0, effect: 0 },
            kept: { power: 0, efficiency: 0, effect: 0 },
          },
        };
        b.hero.weaving = { recipes: [], equipped: null };
        b.hero.hp = 10;
        b.hero.mana.arcane = 0;
        b.board.loadRows(['..........', 'vvvv.vvvvv', 'vvvv.vvvvv']);
        // loadRows uses color letters; set exact violet cells for this staged clear.
        b.board.grid[18] = Array.from({ length: 10 }, (_, x) => (x === 4 ? null : 'violet'));
        b.board.grid[19] = Array.from({ length: 10 }, (_, x) => (x === 4 ? null : 'violet'));
        b.board.replaceActive('I', {
          x: 4,
          color: 'violet',
          cells: [
            [0, 0],
            [0, 1],
            [0, 2],
            [0, 3],
          ],
        });
      });
      if (touch) await page.getByRole('button', { name: 'Hard drop', exact: true }).tap();
      else await page.keyboard.press('Space');
      await page.waitForFunction(
        () =>
          window.castingQA.active.battle.autoFrame?.preview.character &&
          window.castingQA.active.battle.autoFrame.phase === 'effect',
      );
      await page.screenshot({ path: `${out}/${width}-arcane-auto.png` });
      await page.waitForFunction(() => !window.castingQA.active.battle.autoCastingBusy);
      assert.equal(
        await page.evaluate(() => window.castingQA.active.battle.autoCasts[0].id),
        'shadow',
      );
      assert.equal(await page.evaluate(() => window.castingQA.active.battle.hero.mana.arcane), 2);
      assert.deepEqual(errors, []);
      reports.push({
        width,
        height,
        touch,
        productionApp: true,
        oldSaveWithoutRolloutFlag: true,
        noManualStandardSelection: true,
        actualRanksVisible: true,
        readableManaChargeMeters: true,
        earnedLineCast: true,
        seventhPrimaryArcaneAutomatic: true,
        actualManaPaid: true,
        customSlotShowsRecipe: true,
        customActionsVisible: true,
        errors,
      });
    } catch (error) {
      process.stdout.write(
        JSON.stringify({
          errors,
          debug: await page.evaluate(() => ({
            app: !!window.castingQA,
            started: window.castingQA?.started,
            keys: Object.keys(localStorage),
            dialogs: document.querySelector('#dialog')?.textContent,
          })),
        }) + '\n',
      );
      await page.screenshot({ path: `${out}/${width}-failure.png` });
      throw error;
    } finally {
      await context.close();
    }
  }
  writeFileSync(`${out}/report.json`, JSON.stringify(reports, null, 2) + '\n');
  process.stdout.write('Main-game casting passed on desktop and touch.\n');
} finally {
  await browser.close();
}
