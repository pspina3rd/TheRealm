import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerInstallSupport } from '../src/ui/install';

function browser(url = 'https://game.example/realm/', secure = true) {
  const registration = { scope: new URL('./', url).href };
  const register = vi.fn().mockResolvedValue(registration);
  vi.stubGlobal('window', { location: new URL(url), isSecureContext: secure });
  vi.stubGlobal('navigator', { serviceWorker: { register } });
  return { registration, register };
}

afterEach(() => vi.unstubAllGlobals());

describe('optional install registration', () => {
  it('registers a production worker in the configured same-origin subfolder', async () => {
    const { register, registration } = browser();
    expect(await registerInstallSupport(true, '/realm/')).toBe(registration);
    expect(register).toHaveBeenCalledWith('https://game.example/realm/sw.js', { scope: '/realm/' });
  });

  it('accepts relative Vite bases and normalizes their trailing slash', async () => {
    const { register } = browser('https://game.example/realm/index.html');
    await registerInstallSupport(true, './');
    expect(register).toHaveBeenLastCalledWith('https://game.example/realm/sw.js', {
      scope: '/realm/',
    });
    await registerInstallSupport(true, '/realm');
    expect(register).toHaveBeenLastCalledWith('https://game.example/realm/sw.js', {
      scope: '/realm/',
    });
  });

  it('never registers during development, on LAN HTTP, or in an insecure context', async () => {
    const dev = browser();
    expect(await registerInstallSupport(false, '/')).toBeNull();
    expect(dev.register).not.toHaveBeenCalled();
    for (const [url, secure] of [
      ['http://192.168.1.20:5173/', true],
      ['http://game.example/', true],
      ['https://game.example/', false],
    ] as const) {
      const { register } = browser(url, secure);
      expect(await registerInstallSupport(true, '/')).toBeNull();
      expect(register).not.toHaveBeenCalled();
    }
  });

  it.each(['localhost', '127.0.0.1', '[::1]'])(
    'permits secure localhost testing at %s',
    async (hostname) => {
      const { register } = browser(`http://${hostname}:4173/`, true);
      await registerInstallSupport(true, '/');
      expect(register).toHaveBeenCalledOnce();
    },
  );

  it('ignores cross-origin and invalid base URLs', async () => {
    const { register } = browser();
    for (const base of ['https://other.example/', 'http://[', '/realm/?x=1', '/realm/#x']) {
      expect(await registerInstallSupport(true, base)).toBeNull();
    }
    expect(register).not.toHaveBeenCalled();
  });

  it('treats missing support, server rendering, and offline failures as optional', async () => {
    const { register } = browser();
    register.mockRejectedValueOnce(new Error('Offline'));
    expect(await registerInstallSupport(true, '/')).toBeNull();
    vi.stubGlobal('navigator', {});
    expect(await registerInstallSupport(true, '/')).toBeNull();
    vi.stubGlobal('window', undefined);
    expect(await registerInstallSupport(true, '/')).toBeNull();
  });
});
