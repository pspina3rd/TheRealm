# Mana Crystals — native iPhone campaign playtest

**Crystals Test now opens the campaign.** It uses UIKit for exploration and
conversations, the existing native SpriteKit battle board and gestures, and the
shared campaign rules running offline in Apple's JavaScriptCore. The map art is
bundled from the same licensed atlas assets as the web game. Blocks, element
glyphs, obstruction textures and encounter decorations are exported directly
from the web renderers. Native spell animation follows the shared resolver's
actual affected cells, with distinct visuals at each of the four ranks.
No browser, web
server, npm installation, CocoaPods or downloaded Swift dependency is needed.

## Update the app already installed on your phone

1. Download the latest **GetPutTaco** source, or update your clean testing
   checkout. Keep the whole repository together: the Xcode project also bundles
   `public/assets`.
2. Open `ios/ManaCrystalsPlaytest.xcodeproj` in Xcode.
3. Keep your existing Personal Team and signing settings. Connect and select
   your iPhone, then press **Run**. This updates **Crystals Test** in place.

Choose a hero by their sprite. Their in-world book opens first; Begin adventure
starts the campaign, while Return to heroes leaves an existing save untouched.
Story narration uses the same book, with illustrated action or animated portraits
and spoken dialogue. Next page, Previous page and Skip scene control the reading. All four begin with zero spells in their
respective hometowns. Native campaign saves are separate from Safari saves and
from the earlier Slime controls fixture. The app saves after movement, choices
and battle inputs, and when entering the background. Interrupted committed
puzzle/lesson attempts follow the campaign's existing retry rules.

## Touch controls

- Exploration: tap a reachable tile or character to walk there. Drag and hold
  to walk in a direction; lift to stop. Movement stops at conversations, travel,
  menus and backgrounding. There are no movement buttons covering the map.
- Battles: drag sideways to move, tap or hold-and-release to rotate, deliberately flick down to drop. A slower
  downward drag soft-drops. These are the previously tested native controls.
- Campaign menu: world map, inventory, growth, and later Arcane/custom Weaving.
- Battle actions: corrections where offered, items, lesson casting, advanced
  techniques and custom Weaving. Standard combat spells retain automatic casts.
- After an encounter, tap the checkmark to apply its outcome and return.
  A failed introductory placement can be corrected before settling the result.

This is a development build for direct Xcode installation. TestFlight signing
and distribution are not configured. A free Personal Team installation expires
and must periodically be refreshed through Xcode.

## Developer checks

The JavaScript resource is committed so the player only needs Xcode. After
changing shared engine code, regenerate it with `npm ci` and
`npm run build:native`, then commit the resource with the source change.
The native-only data clone preserves the engine's preview state in JavaScriptCore,
which does not provide the browser's `structuredClone` global.

After changing the shared block, icon or world-decoration renderers, run
`npm run build:native-visuals` and commit `public/assets/native-visuals`.
This developer export uses Playwright Chromium; install it with
`npx playwright install chromium` if needed, or set `NATIVE_VISUAL_BROWSER` to
an installed Chromium executable. `npm run check:native-visuals` verifies
renderer source hashes and exported files without starting a browser.

On a Mac:

```bash
swift test --package-path ios
xcodebuild test -project ios/ManaCrystalsPlaytest.xcodeproj \
  -scheme ManaCrystalsPlaytest \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  CODE_SIGNING_ALLOWED=NO
```

GitHub's **Native iOS playtest** workflow creates an iPhone 15 Pro simulator,
runs the native tests and exercises board gestures and background/resume. It
uploads the Xcode result bundle, recording and screenshot gallery. Simulator checks do not
replace testing how this feels on the physical phone.

The earlier standalone Slime fixture remains available to automated gesture
tests with the `--battle-playtest` launch argument. The default app launches
the campaign. Campaign tests exercise JavaScriptCore without browser APIs,
all four hometowns, native movement, the world map, relaunch and suspension.

DEBUG builds also accept `--visual-gallery --visual-school fire` (or water,
earth, wind, lightning, nature, special). This read-only test gallery uses the
real native renderers and isolated resolver fixtures; it never loads or replaces
the player's live battle. The six school groups cover all four ranks at target,
effect and result phases. The special group includes zero spells, obstruction
requirements, Arcane opponent techniques, ordered custom Weaving, authored
puzzles and a real mentor lesson. These launch arguments are for development;
normal app launch remains the campaign.
