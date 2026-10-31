// Actual App mentor-entry fixtures: no production debug hooks or granted lesson victories.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const out = process.env.OUT ?? '/tmp/lesson-onboarding';
fs.mkdirSync(out, { recursive: true });
const entry =
  "import '/src/style.css';import{App}from'/src/ui/app.ts';import{Atlas}from'/src/ui/art/atlas.ts';import{createStore}from'/src/game/storage.ts';const atlas=new Atlas();await atlas.load('/assets/');window.reviewApp=new App(atlas,createStore());window.reviewApp.start();";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: process.env.CHROMIUM_NO_SANDBOX ? ['--no-sandbox'] : [],
  });
  const records = [];
  try {
    for (const [w, h] of [
      [360, 640],
      [390, 844],
      [1100, 900],
    ])
      for (const [id, school, prior] of [
        ['torva', 'Fire', false],
        ['maren', 'Ice', false],
        ['maren', 'Ice', true],
        ['hazel', 'Nature', false],
        ['dorn', 'Gravity', false],
        ['rook', 'Lightning', false],
        ['kestrel', 'Wind', false],
        ['torva', 'Fire', 'upgrade'],
      ]) {
        const c = await browser.newContext({
          viewport: { width: w, height: h },
          isMobile: w < 500,
          hasTouch: w < 500,
        });
        const p = await c.newPage(),
          errors = [];
        p.on('pageerror', (e) => errors.push(e.message));
        await p.route(/\/src\/main\.ts(?:\?.*)?$/, (r) =>
          r.fulfill({ contentType: 'application/javascript', body: entry }),
        );
        await p.goto(process.env.BASE ?? 'http://127.0.0.1:5186/');
        const key = await p.evaluate(
          async ({ id, prior }) => {
            const { newGame } = await import('/src/world/state.ts'),
              { serialize, SAVE_KEY } = await import('/src/game/save.ts'),
              { MENTORS } = await import('/src/data/mentors.ts'),
              { MAPS } = await import('/src/data/maps.ts'),
              { tileAt } = await import('/src/world/map.ts'),
              { mentorPlace } = await import('/src/world/mentors.ts'),
              { newKnownSpell } = await import('/src/game/spells.ts'),
              { gainXp, spendSkillPoints } = await import('/src/game/hero.ts');
            const s = newGame();
            s.flags.add('scene:opening');
            s.flags.add('scene:refusal');
            if (prior) s.hero.spells = { fire: newKnownSpell(), cure: newKnownSpell() };
            if (prior === 'upgrade') {
              for (let i = 0; i < 3; i++) gainXp(s.hero, s.hero.nextXp);
              if (
                !spendSkillPoints(s.hero, {
                  stats: {},
                  spells: { fire: { power: 1, efficiency: 1, effect: 1 } },
                })
              )
                throw Error('Could not prepare real paid upgrade');
            }
            const pos = mentorPlace(MENTORS[id], s);
            s.mapId = pos.map;
            const map = MAPS[s.mapId];
            const choice = [
              [pos.x - 1, pos.y, 'ArrowRight'],
              [pos.x + 1, pos.y, 'ArrowLeft'],
              [pos.x, pos.y - 1, 'ArrowDown'],
              [pos.x, pos.y + 1, 'ArrowUp'],
            ].find(
              ([x, y]) =>
                tileAt(map, x, y).walkable && !map.entities.some((e) => e.x === x && e.y === y),
            );
            s.x = choice[0];
            s.y = choice[1];
            s.respawn = { map: s.mapId, x: s.x, y: s.y };
            localStorage.setItem(SAVE_KEY, serialize(s));
            localStorage.setItem('the-realm/touch-buttons', '1');
            return choice[2];
          },
          { id, prior },
        );
        await p.reload();
        await p.waitForFunction(() => window.reviewApp?.started);
        await p.keyboard.press(key);
        await p.locator('.lesson').first().waitFor();
        await p
          .locator('.lesson')
          .filter({ hasText: `${school} · Lv ${prior === 'upgrade' ? 2 : 1}` })
          .click();
        const accept = p.getByRole('button', { name: 'Take it on', exact: true });
        if (await accept.count()) await accept.click();
        else await p.getByRole('button', { name: 'Accept', exact: true }).click();
        await p.locator('.practice-spell').waitFor();
        assert.equal(await p.locator('#spell-list [data-action]').count(), 1);
        assert.equal(await p.locator('.practice-spell').isDisabled(), true);
        assert.equal(
          await p.locator('.practice-spell').evaluate((n) => getComputedStyle(n).opacity),
          '1',
        );
        const card = await p.locator('.practice-spell').boundingBox();
        assert(card.y >= 0 && card.y + card.height <= h, JSON.stringify({ w, h, card }));
        if (prior) {
          await p.getByRole('button', { name: 'Other spells', exact: true }).click();
          assert.equal(await p.evaluate(() => window.reviewApp.active.battle.paused), true);
          await p.getByRole('button', { name: 'Back to practice', exact: true }).click();
          assert.equal(await p.evaluate(() => window.reviewApp.active.battle.paused), false);
        }
        await p.evaluate(() => {
          const b = window.reviewApp.active.battle;
          for (const pool of Object.keys(b.hero.mana)) b.hero.mana[pool] = b.hero.manaCap;
        });
        await p.waitForFunction(() => !document.querySelector('.practice-spell').disabled);
        await p.locator('.practice-spell').click();
        await p.locator('.magic-target-dialog').waitFor();
        await p.getByRole('button', { name: 'Cancel', exact: true }).click();
        assert.equal(await p.evaluate(() => window.reviewApp.active.battle.paused), false);
        await p.screenshot({
          path: `${out}/practice-${w}-${school}-${prior || 'first'}.png`,
          fullPage: true,
        });
        const controls = await p.locator('.controls button:visible').evaluateAll((ns) =>
          ns.map((n) => ({
            name: n.getAttribute('aria-label'),
            ...n.getBoundingClientRect().toJSON(),
          })),
        );
        const clipped = controls.filter((r) => r.y < 0 || r.bottom > h);
        assert.deepEqual(clipped, [], 'Touch movement controls must fit');
        records.push({ w, h, school, prior, card, controls, clipped, errors });
        assert.deepEqual(errors, []);
        await c.close();
      }
    fs.writeFileSync(`${out}/report.json`, JSON.stringify(records, null, 2));
    process.stdout.write('Lesson onboarding passed on phones and desktop.\n');
  } finally {
    await browser.close();
  }
})();
