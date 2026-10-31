// Build first. Exercises the actual production app/worker under a subfolder.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const root = resolve(process.env.DIST ?? 'dist'),
  out = process.env.OUT ?? '/tmp/phone-install-browser';
await mkdir(out, { recursive: true });
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!pathname.startsWith('/realm/')) {
      res.writeHead(404).end();
      return;
    }
    const relative = decodeURIComponent(pathname.slice('/realm/'.length)) || 'index.html';
    const path = resolve(root, relative);
    if (!path.startsWith(root + '/')) {
      res.writeHead(403).end();
      return;
    }
    const data = await readFile(path);
    res
      .writeHead(200, {
        'Content-Type': mime[extname(path)] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
      })
      .end(data);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const url = `http://localhost:${server.address().port}/realm/`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: process.env.CHROMIUM_NO_SANDBOX ? ['--no-sandbox'] : [],
});
try {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.locator('.class-card').first().waitFor();
  const manifest = await (await page.request.get(url + 'manifest.webmanifest')).json();
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(await page.locator('link[rel="apple-touch-icon"]').count(), 1);
  await page.locator('.class-card').first().click();
  const before = await page.evaluate(() => {
    localStorage.setItem('__offline-save-probe', 'keep');
    return JSON.parse(localStorage.getItem('the-realm/save')).hero;
  });
  const worker = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return {
      scope: registration.scope,
      active: !!registration.active,
      caches: await caches.keys(),
    };
  });
  assert.equal(worker.scope, url);
  assert.equal(worker.active, true);
  assert(
    worker.caches.some((name) => name.startsWith('mana-crystals:' + encodeURIComponent(url) + ':')),
  );
  await page.screenshot({ path: out + '/iphone-online.png' });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.view === 'world');
  const after = await page.evaluate(() => ({
    hero: JSON.parse(localStorage.getItem('the-realm/save')).hero,
    probe: localStorage.getItem('__offline-save-probe'),
    controller: !!navigator.serviceWorker.controller,
  }));
  assert.equal(after.hero.classId, before.classId);
  assert.deepEqual(after.hero.spells, before.spells);
  assert.equal(after.probe, 'keep');
  assert.equal(after.controller, true);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: out + '/iphone-offline.png' });
  await context.setOffline(false);
  await writeFile(
    out + '/report.json',
    JSON.stringify(
      {
        viewport: { width: 393, height: 852, scale: 3 },
        subfolder: true,
        manifestRelative: true,
        workerScope: worker.scope,
        precacheReady: true,
        offlineAppAndArtLoaded: true,
        localSavePreserved: true,
        noForcedReload: true,
        errors,
        physicalIPhoneTest: false,
      },
      null,
      2,
    ) + '\n',
  );
  await context.close();
  process.stdout.write('Production iPhone-sized install/offline/subfolder checks passed.\n');
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
