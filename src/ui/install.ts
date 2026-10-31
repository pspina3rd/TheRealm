/** Optional offline support. Failure must never prevent the game from starting. */
export async function registerInstallSupport(
  production: boolean,
  baseURL: string,
): Promise<ServiceWorkerRegistration | null> {
  if (!production || typeof window === 'undefined' || typeof navigator === 'undefined') return null;
  try {
    const { location } = window;
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    if (
      !window.isSecureContext ||
      !(location.protocol === 'https:' || (location.protocol === 'http:' && loopback)) ||
      !('serviceWorker' in navigator)
    )
      return null;
    const base = new URL(baseURL, location.href);
    if (base.origin !== location.origin || base.search || base.hash) return null;
    if (!base.pathname.endsWith('/')) base.pathname += '/';
    return await navigator.serviceWorker.register(new URL('sw.js', base).href, {
      scope: base.pathname,
    });
  } catch {
    return null;
  }
}
