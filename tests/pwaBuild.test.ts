import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';

let dist: string;
beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'realm-pwa-'));
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'index.html'), '<main>Mana Crystals</main>');
  writeFileSync(join(dist, 'assets', 'game.js'), 'game-v1');
  writeFileSync(join(dist, 'assets', 'atlas image.png'), 'fixture-image');
});
afterEach(() => rmSync(dist, { recursive: true, force: true }));

function build() {
  const result = spawnSync(process.execPath, [resolve('tools/build-pwa.mjs'), dist], {
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(result.stderr);
  return readFileSync(join(dist, 'sw.js'), 'utf8');
}

type RequestLike = { url: string; method?: string; mode?: string };
type WorkerEvent = {
  request?: RequestLike;
  waitUntil: (promise: Promise<unknown>) => void;
  respondWith?: (promise: Promise<Response>) => void;
};

function worker(source: string, scope = 'https://game.example/realm/') {
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  const stores = new Map<string, Map<string, Response>>();
  const keyOf = (request: string | RequestLike) =>
    typeof request === 'string' ? request : request.url;
  const caches = {
    keys: vi.fn(async () => [...stores.keys()]),
    delete: vi.fn(async (name: string) => stores.delete(name)),
    open: vi.fn(async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        addAll: async (requests: Request[]) => {
          for (const request of requests)
            store.set(request.url, new Response(`precache:${request.url}`));
        },
        put: async (request: RequestLike, response: Response) => {
          store.set(keyOf(request), response.clone());
        },
        match: async (request: string | RequestLike) => store.get(keyOf(request))?.clone(),
      };
    }),
  };
  const fetch = vi
    .fn<(request: RequestLike) => Promise<Response>>()
    .mockRejectedValue(new Error('Offline'));
  runInNewContext(source, {
    URL,
    Request,
    Response,
    caches,
    fetch,
    self: {
      registration: { scope },
      addEventListener: (name: string, callback: (event: WorkerEvent) => void) =>
        listeners.set(name, callback),
    },
  });
  async function dispatch(name: string, request?: RequestLike) {
    const waits: Promise<unknown>[] = [];
    let response: Promise<Response> | undefined;
    listeners.get(name)!({
      request,
      waitUntil: (promise) => {
        waits.push(promise);
      },
      respondWith: (promise) => {
        response = promise;
      },
    });
    const result = response ? await response : undefined;
    await Promise.all(waits);
    return result;
  }
  return { stores, caches, fetch, dispatch };
}

describe('offline build generation', () => {
  it('ships a relative standalone manifest and real PNG install icons at required sizes', () => {
    const manifest = JSON.parse(readFileSync(resolve('public/manifest.webmanifest'), 'utf8')) as {
      id: string;
      start_url: string;
      scope: string;
      display: string;
      icons: { src: string; sizes: string; type: string }[];
    };
    expect(manifest).toMatchObject({
      id: './',
      start_url: './',
      scope: './',
      display: 'standalone',
    });
    for (const [filename, size] of [
      ['icon192.png', 192],
      ['icon512.png', 512],
      ['apple-touch-icon.png', 180],
    ] as const) {
      const bytes = readFileSync(resolve('public/icons', filename));
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([size, size]);
      expect(bytes.length).toBeGreaterThan(1000);
      if (size !== 180)
        expect(manifest.icons).toContainEqual({
          src: `icons/${filename}`,
          sizes: `${size}x${size}`,
          type: 'image/png',
          purpose: 'any',
        });
    }
  });

  it('precaches all static output with encoded paths and a reproducible content version', () => {
    const first = build();
    expect(first).toContain('assets/atlas%20image.png');
    expect(first).toContain('assets/game.js');
    expect(first).toContain('index.html');
    expect(build()).toBe(first);
    writeFileSync(join(dist, 'assets', 'game.js'), 'game-v2');
    expect(build().match(/const VERSION = "([^"]+)"/)?.[1]).not.toBe(
      first.match(/const VERSION = "([^"]+)"/)?.[1],
    );
    expect(first).not.toContain('skipWaiting');
    expect(first).not.toContain('clients.claim');
    expect(first).not.toContain('localStorage');
  });

  it('refuses to create an offline worker without an application shell', () => {
    rmSync(join(dist, 'index.html'));
    const result = spawnSync(process.execPath, [resolve('tools/build-pwa.mjs'), dist]);
    expect(result.status).not.toBe(0);
  });

  it('cleans only older caches for this exact scope, retaining nested and sibling apps', async () => {
    const app = worker(build());
    await app.dispatch('install');
    const current = [...app.stores.keys()][0]!;
    const prefix = current.slice(0, current.lastIndexOf(':') + 1);
    app.stores.set(`${prefix}old`, new Map());
    const sibling = 'mana-crystals:' + encodeURIComponent('https://game.example/other/') + ':old';
    const nested =
      'mana-crystals:' + encodeURIComponent('https://game.example/realm/demo/') + ':old';
    app.stores.set(sibling, new Map());
    app.stores.set(nested, new Map());
    app.stores.set('another-game', new Map());
    await app.dispatch('activate');
    expect([...app.stores.keys()].sort()).toEqual(
      [current, sibling, nested, 'another-game'].sort(),
    );
    expect(app.caches.delete).toHaveBeenCalledExactlyOnceWith(`${prefix}old`);
  });

  it('loads precached assets and the navigation shell offline under a subfolder', async () => {
    const app = worker(build());
    await app.dispatch('install');
    const asset = await app.dispatch('fetch', {
      url: 'https://game.example/realm/assets/game.js',
      method: 'GET',
      mode: 'cors',
    });
    expect(await asset!.text()).toBe('precache:https://game.example/realm/assets/game.js');
    const shell = await app.dispatch('fetch', {
      url: 'https://game.example/realm/',
      method: 'GET',
      mode: 'navigate',
    });
    expect(await shell!.text()).toBe('precache:https://game.example/realm/index.html');
    const missing = await app.dispatch('fetch', {
      url: 'https://game.example/realm/assets/missing.js',
      method: 'GET',
      mode: 'cors',
    });
    expect(missing!.type).toBe('error');
  });

  it('uses fresh network responses first and caches only successful responses', async () => {
    const app = worker(build());
    await app.dispatch('install');
    const request = {
      url: 'https://game.example/realm/assets/game.js',
      method: 'GET',
      mode: 'cors',
    };
    app.fetch.mockResolvedValueOnce(new Response('updated'));
    expect(await (await app.dispatch('fetch', request))!.text()).toBe('updated');
    app.fetch.mockResolvedValueOnce(new Response('missing', { status: 404 }));
    expect((await app.dispatch('fetch', request))!.status).toBe(404);
    expect(await (await app.dispatch('fetch', request))!.text()).toBe('updated');
  });

  it('keeps an online response available even when optional cache storage fails', async () => {
    const app = worker(build());
    const request = { url: 'https://game.example/realm/assets/game.js', method: 'GET' };
    app.caches.open.mockRejectedValueOnce(new Error('Storage full'));
    app.fetch.mockResolvedValueOnce(new Response('online game'));
    expect(await (await app.dispatch('fetch', request))!.text()).toBe('online game');
  });

  it('does not intercept writes, other origins, or URLs outside its scope', async () => {
    const app = worker(build());
    for (const request of [
      { url: 'https://game.example/realm/save', method: 'POST' },
      { url: 'https://other.example/realm/a.js', method: 'GET' },
      { url: 'https://game.example/other/a.js', method: 'GET' },
      { url: 'https://game.example/realm-other/a.js', method: 'GET' },
    ])
      expect(await app.dispatch('fetch', request)).toBeUndefined();
    expect(app.fetch).not.toHaveBeenCalled();
  });
});
