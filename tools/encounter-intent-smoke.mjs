// Real App entry with staged inspection positions; this is UI QA, not a walked campaign.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.OUT ?? '/tmp/encounter-intent-browser';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: process.env.CHROMIUM_NO_SANDBOX ? ['--no-sandbox'] : [],
});
const entry =
  "import '/src/style.css';import {App} from '/src/ui/app.ts';import {Atlas} from '/src/ui/art/atlas.ts';import {createStore} from '/src/game/storage.ts';const atlas=new Atlas();await atlas.load('/assets/');window.intentQA=new App(atlas,createStore());window.intentQA.start();";
const records = [];
try {
  for (const [width, height] of [
    [393, 852],
    [360, 640],
    [1100, 900],
  ]) {
    for (const actor of [
      'elder',
      'kid',
      'forager',
      'stallKeeper',
      'guard',
      'archiveDrain',
      'slime',
      'torva',
    ]) {
      const touch = width < 500;
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: touch,
        isMobile: touch,
        deviceScaleFactor: touch ? 3 : 1,
      });
      const page = await context.newPage(),
        errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route(/\/src\/main\.ts(?:\?.*)?$/, (route) =>
        route.fulfill({ contentType: 'application/javascript', body: entry }),
      );
      try {
        await page.goto(process.env.BASE ?? 'http://127.0.0.1:5186/');
        const key = await page.evaluate(async (actor) => {
          const { newGame } = await import('/src/world/state.ts'),
            { serialize, SAVE_KEY } = await import('/src/game/save.ts'),
            { MAPS } = await import('/src/data/maps.ts'),
            { tileAt } = await import('/src/world/map.ts'),
            { MENTORS } = await import('/src/data/mentors.ts'),
            { mentorPlace } = await import('/src/world/mentors.ts'),
            { SCENES } = await import('/src/data/story.ts');
          const state = newGame();
          for (const scene of SCENES) state.flags.add('scene:' + scene.id);
          let map, position;
          if (MENTORS[actor]) {
            position = mentorPlace(MENTORS[actor], state);
            map = MAPS[position.map];
          } else
            for (const area of Object.values(MAPS)) {
              const entity = area.entities.find(
                (entity) =>
                  (entity.kind === 'npc' && entity.npcId === actor) ||
                  (entity.kind === 'monster' && entity.enemyId === actor),
              );
              if (entity) {
                position = entity;
                map = area;
                if (entity.requiresFlag) state.flags.add(entity.requiresFlag);
                if (entity.untilFlag) state.flags.delete(entity.untilFlag);
                break;
              }
            }
          if (!map || !position) throw new Error('Missing actor ' + actor);
          // Inspection fixture only: campaign-map loading requires its descent milestone.
          if (map.id === 'sunkenArchive') state.flags.add('campaign:descent');
          state.mapId = map.id;
          const spot = [
            [position.x - 1, position.y, 'ArrowRight'],
            [position.x + 1, position.y, 'ArrowLeft'],
            [position.x, position.y - 1, 'ArrowDown'],
            [position.x, position.y + 1, 'ArrowUp'],
          ].find(
            ([x, y]) =>
              tileAt(map, x, y).walkable && !map.entities.some((e) => e.x === x && e.y === y),
          );
          if (!spot) throw new Error('No inspection position ' + actor);
          state.x = spot[0];
          state.y = spot[1];
          state.respawn = { map: map.id, x: state.x, y: state.y };
          localStorage.setItem(SAVE_KEY, serialize(state));
          localStorage.setItem('the-realm/touch-buttons', '1');
          return spot[2];
        }, actor);
        await page.reload();
        await page.waitForFunction(() => window.intentQA?.started);
        await page.keyboard.press(key);
        if (actor === 'torva')
          await page.locator('.lesson').filter({ hasText: 'Fire · Lv 1' }).click();
        if (actor !== 'slime') {
          await page.locator('.encounter-purpose').waitFor();
          const text = await page.locator('.encounter-purpose').innerText();
          assert(!/undefined|\{target\}/.test(text));
          const take = page.getByRole('button', { name: 'Take it on', exact: true });
          if (await take.count()) await take.click();
          else await page.getByRole('button', { name: 'Accept', exact: true }).click();
        }
        const header = page.locator('button.board-objective');
        await header.waitFor({ state: 'visible' });
        const before = await page.evaluate(() => {
          const app = window.intentQA,
            b = app.active.battle;
          return {
            pieces: b.board.piecesPlaced,
            pauses: b.pausesLeft,
            started: b.started,
            tries: JSON.stringify(app.state.encounters),
            hp: b.hero.hp,
          };
        });
        await header.click();
        await page.getByRole('button', { name: 'Back to board', exact: true }).waitFor();
        const title = await page.locator('#dialog-title').innerText(),
          body = await page.locator('#dialog-body').innerText();
        assert.match(body, /Your goal:/);
        assert.match(body, /The blocks:/);
        if (actor === 'forager') {
          assert.match(body, /rot/i);
          assert(!/Plant green/.test(body));
        }
        if (actor === 'elder') assert.match(body, /Rowan is helping/);
        assert.equal(await page.evaluate(() => window.intentQA.active.battle.paused), true);
        await page.screenshot({ path: `${out}/${width}-${actor}-details.png` });
        if (actor === 'kid') await page.keyboard.press('Escape');
        else await page.getByRole('button', { name: 'Back to board', exact: true }).click();
        const after = await page.evaluate(() => {
          const app = window.intentQA,
            b = app.active.battle;
          return {
            pieces: b.board.piecesPlaced,
            pauses: b.pausesLeft,
            started: b.started,
            tries: JSON.stringify(app.state.encounters),
            hp: b.hero.hp,
            paused: b.paused,
          };
        });
        assert.equal(after.paused, false);
        for (const field of ['pieces', 'pauses', 'started', 'tries', 'hp'])
          assert.equal(after[field], before[field], `Details must not change ${field}`);
        assert.equal(
          await page.locator('#board-canvas').evaluate((node) => document.activeElement === node),
          true,
        );
        const clipped = await page.locator('.controls button:visible').evaluateAll((nodes) =>
          nodes
            .filter((node) => {
              const r = node.getBoundingClientRect();
              return r.top < 0 || r.bottom > innerHeight;
            })
            .map((node) => node.getAttribute('aria-label')),
        );
        assert.deepEqual(clipped, [], 'Movement controls remain accessible.');
        await page.screenshot({ path: `${out}/${width}-${actor}-board.png` });
        assert.deepEqual(errors, []);
        records.push({
          width,
          height,
          touch,
          actor,
          title,
          body,
          detailsPreserveState: true,
          focusReturnsToBoard: true,
          clipped,
          errors,
        });
      } catch (error) {
        await page.screenshot({ path: `${out}/${width}-${actor}-failure.png` });
        throw error;
      } finally {
        await context.close();
      }
    }
  }
  writeFileSync(`${out}/report.json`, JSON.stringify(records, null, 2) + '\n');
  process.stdout.write(
    'Purposeful encounter UI passed on iPhone-sized, small-phone and desktop layouts.\n',
  );
} finally {
  await browser.close();
}
