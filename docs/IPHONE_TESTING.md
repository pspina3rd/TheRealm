# Test Mana Crystals on an iPhone 15 Pro

The game runs in Safari and can be added to the Home Screen. App Store or
TestFlight distribution is not required. This change does not publish the game
or create an external hosting account.

## Quick test from a Mac on the same Wi-Fi

1. Connect the Mac and iPhone to the same Wi-Fi network. Guest networks may block
   connections between devices.
2. In the project folder on the Mac, run `npm install`, then `npm run dev:phone`.
   This starts Vite listening on the local network (`--host 0.0.0.0`). Allow its
   incoming connection if the Mac firewall asks.
3. Find the Mac's Wi-Fi address with `ipconfig getifaddr en0`. If that prints
   nothing, check System Settings → Wi-Fi → Details → TCP/IP. Use the port Vite
   prints; it is normally 5173 but can change if occupied.
4. On the iPhone, open Safari and visit `http://MAC_IP:5173/`, replacing `MAC_IP`
   with that address, for example `http://192.168.1.20:5173/`.
5. Use Safari's Share button → **Add to Home Screen** → **Add**. If iOS offers
   **Open as Web App**, leave it enabled. Launch the new icon to test the game.

The Mac must stay awake with Vite running, and both devices must remain on the
same network. `localhost` on the phone means the phone, not the Mac. A LAN HTTP
shortcut still needs the Mac online: service workers are intentionally disabled
for development and insecure LAN HTTP.

Keep a stable address and port while testing. An IP address change creates a
different origin and can make the previous local save appear missing. A reserved
Mac address in your router can help. Avoid clearing Safari website data.

## Production installation and offline play

`npm run build` creates the static `dist/` folder and generates `dist/sw.js` with
a content-versioned precache of all static output. Serve that folder from an
**HTTPS static origin**, with JavaScript, icons, manifest, and worker accessible
at the same base path. The manifest uses relative `id`, `start_url`, and `scope`;
the worker caches only its own same-origin scope. The default relative Vite base (`./`) works at either the root or a subfolder.
If you choose an absolute base instead, build with the matching path, such as
`--base=/realm/`, before generating the worker.

Visit the HTTPS address online first and allow the initial game/assets load to
finish. Add it to the Home Screen from Safari, then close and reopen it once
online before trying Airplane Mode. The first visit needs a connection and may
not yet be controlled by the newly installed worker. For technical verification,
Safari's Mac Web Inspector can inspect the iPhone's service worker and caches.

The offline feature is optional: a failed registration or cache install does not
stop online play. Browser storage can be evicted; installed does not guarantee
permanent offline storage. This work prepares the build only; HTTPS publishing
is a separate action. A local `npm run preview -- --host 0.0.0.0` serves the build
for network testing but is still HTTP, so it does not enable offline support on
the iPhone. HTTPS or localhost is required; the Mac's localhost exception does
not apply to the phone's LAN URL.

Updates use network-first requests with cached fallback. No worker calls
`skipWaiting`, takes over an open game, or forces a reload. Close every window
of the app and reopen online when you want a waiting update to activate.
Newer versions clean only this app scope's older caches; sibling or nested
installations keep theirs. The worker never reads or changes saves/localStorage.

## Phone checks

- Confirm the icon, app title, standalone launch, and portrait layout. Test the
  top safe area/Dynamic Island and the bottom Home indicator; controls should
  remain reachable without content hiding under them.
- Walk, interact with an NPC, start a lesson, and check tap/drag/drop gestures.
  Confirm the seven standard AUTO spells and manual custom Weaving remain usable.
- Background and resume Safari/the installed app, then check pause behavior and
  that no touch remains held.
- Save progress, close and reopen, and verify it returns on this phone at this
  URL. Saves are local to this device/browser context and may be separate between
  Safari and a Home Screen installation. Mac progress is not automatically synced.
- After the HTTPS installation is cached, enable Airplane Mode, reopen, and
  confirm the game and art load. Reconnect before testing an update.
- Safari on iPhone does not support the Vibration API. The menu marks vibration
  unavailable on unsupported devices; installation does not add that capability.

Automated tests cover registration guards, precache/version generation, offline
responses, network-first behavior, and scope-specific cleanup. They do not claim
an on-device iPhone 15 Pro test; complete the checks above on the physical phone.
