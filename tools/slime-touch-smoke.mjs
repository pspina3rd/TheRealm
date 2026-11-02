// Actual App at phone size; staged combat positions/earned-line board, not a walked campaign.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.OUT ?? '/tmp/slime-touch-browser';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: process.env.CHROMIUM_NO_SANDBOX ? ['--no-sandbox'] : [],
});
const reports = [];
try {
  for (const school of ['zero', 'fire1']) {
    const context = await browser.newContext({
      viewport: { width: 393, height: 852 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 3,
    });
    const page = await context.newPage(),
      errors = [];
    page.setDefaultTimeout(15000);
    process.stdout.write(`${school}: starting\n`);
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route(/\/src\/main\.ts(?:\?.*)?$/, (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: "import '/src/style.css';import {App} from '/src/ui/app.ts';import {Atlas} from '/src/ui/art/atlas.ts';import {createStore} from '/src/game/storage.ts';const atlas=new Atlas();await atlas.load('/assets/');window.touchQA=new App(atlas,createStore());window.touchQA.start();",
      }),
    );
    try {
      await page.goto(process.env.BASE ?? 'http://127.0.0.1:5186/');
      await page.evaluate(async (school) => {
        const { legacySurfacePoint, expandedLocation } = await import('/src/data/surfaceLayout.ts');
        const { newGame } = await import('/src/world/state.ts'),
          { serialize, SAVE_KEY } = await import('/src/game/save.ts'),
          { newKnownSpell } = await import('/src/game/spells.ts'),
          { SCENES } = await import('/src/data/story.ts');
        const state = newGame();
        Object.assign(state, {
          mapId: 'overworld',
          ...legacySurfacePoint(8, 3),
          respawn: expandedLocation({ map: 'overworld', x: 8, y: 3 }),
        });
        for (const scene of SCENES) state.flags.add(scene.flag);
        if (school === 'fire1') state.hero.spells.fire = newKnownSpell();
        localStorage.setItem(SAVE_KEY, serialize(state));
        localStorage.setItem('the-realm/touch-buttons', '1');
      }, school);
      await page.reload();
      await page.waitForFunction(() => window.touchQA?.started);
      await page.keyboard.press('ArrowRight');
      await page.locator('#board-canvas').waitFor({ state: 'visible' });
      await page.evaluate(() => {
        const b = window.touchQA.active.battle;
        b.combat.enemyHp = 1000;
        b.board.replaceActive('T');
        document
          .getElementById('board-canvas')
          .addEventListener('pointerdown', (e) => (window.touchPointer = e.pointerId));
      });
      await page.waitForTimeout(60);
      const box = await page.locator('#board-canvas').boundingBox();
      const point = { x: box.x + box.width / 2, y: box.y + box.height / 3 };
      const cells = () =>
        page.evaluate(() => JSON.stringify(window.touchQA.active.battle.board.active.cells));
      const tapWorks = async () => {
        const before = await cells();
        await page.touchscreen.tap(point.x, point.y);
        await page.waitForTimeout(30);
        assert.notEqual(await cells(), before, 'Fresh board tap rotates.');
      };
      await tapWorks();
      // A supported landing gives the real planner a valid Goo target.
      const declared = await page.evaluate(() => {
        const b = window.touchQA.active.battle;
        b.board.loadRows(['rr........']);
        b.combat.replanForBoard();
        b.combat.gauge = b.combat.actMs - 1;
        return b.combat.nextMove.kind;
      });
      assert.equal(declared, 'obstruct');
      await page.waitForFunction(() =>
        window.touchQA.active.battle.events.some(({ event }) => event.kind === 'enemyMove'),
      );
      assert(
        await page.evaluate(
          () => Object.keys(window.touchQA.active.battle.board.obstructions).length > 0,
        ),
        'The actual Slime Goo must arrive before testing interrupted touch.',
      );
      const cdp = await context.newCDPSession(page);
      const start = () =>
        cdp.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ ...point, id: 1 }],
        });
      const end = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await start();
      await page.evaluate(() =>
        document.getElementById('board-canvas').releasePointerCapture(window.touchPointer),
      );
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: point.x, y: box.y - 12, id: 1 }],
      });
      await end();
      await tapWorks();
      await start();
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await end();
      await tapWorks();
      const beforeMulti = await cells();
      await start();
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
          { ...point, id: 1 },
          { x: point.x + 25, y: point.y, id: 2 },
        ],
      });
      await end();
      assert.equal(await cells(), beforeMulti, 'Two fingers never rotate or drop.');
      await tapWorks();
      process.stdout.write(`${school}: interruptions recovered\n`);
      if (school === 'fire1') {
        await page.evaluate(() => {
          const b = window.touchQA.active.battle;
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
        await page.waitForTimeout(60);
        await page.getByRole('button', { name: 'Hard drop', exact: true }).tap();
        await page.waitForFunction(() => window.touchQA.active.battle.autoCastingBusy);
        const placed = await page.evaluate(() => window.touchQA.active.battle.board.piecesPlaced);
        await start();
        await page.waitForFunction(() => !window.touchQA.active.battle.autoCastingBusy);
        await end();
        assert.equal(
          await page.evaluate(() => window.touchQA.active.battle.board.piecesPlaced),
          placed,
          'Touch begun during a spell cannot drop the following piece.',
        );
        await page.evaluate(() => window.touchQA.active.battle.board.replaceActive('T'));
        await page.waitForTimeout(60);
        await tapWorks();
        assert.equal(await page.evaluate(() => window.touchQA.active.battle.autoCastCount), 2);
        assert(
          await page.evaluate(() =>
            window.touchQA.active.battle.autoCasts.every((cast) => cast.rank === 1),
          ),
          'Only rank-one spells were learned in this case.',
        );
      }
      const xBefore = await page.evaluate(() => window.touchQA.active.battle.board.active.x);
      await page.getByRole('button', { name: 'Move left', exact: true }).tap();
      assert.equal(
        await page.evaluate(() => window.touchQA.active.battle.board.active.x),
        xBefore - 1,
        'Thumb button acts once.',
      );
      await page.locator('#pause-button').tap();
      assert.equal(await page.evaluate(() => window.touchQA.active.battle.paused), true);
      await page.locator('#pause-button').tap();
      assert.equal(await page.evaluate(() => window.touchQA.active.battle.paused), false);
      await tapWorks();
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `${out}/${school}-recovered.png` });
      reports.push({
        school,
        viewport: '393x852',
        enemyMoveObserved: true,
        enemyObstructionObserved: true,
        captureRecovery: true,
        blurRecovery: true,
        multitouchPreserved: true,
        spellRecovery: school === 'fire1',
        thumbButton: true,
        pause: true,
        errors,
      });
    } finally {
      await context.close();
    }
  }
  writeFileSync(`${out}/report.json`, JSON.stringify(reports, null, 2));
  process.stdout.write('Slime touch interruption and spell recovery checks passed.\n');
} finally {
  await browser.close();
}
