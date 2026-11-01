# Mana Crystals — native iPhone playtest

The phone app is named **Crystals Test**, so it is easy to distinguish from the
Safari Home Screen shortcut. This first milestone is a native Slime battle to
test the feel of the controls.
SpriteKit draws the board and UIKit receives touches. The existing battle rules
run locally in Apple's JavaScriptCore. There is no browser, HTML view, web
server, npm installation, CocoaPods or downloaded Swift dependency to run it.

**Controls:** drag sideways to move, tap to rotate, flick down to drop. A slower
downward drag soft-drops. Movement buttons do not occupy the screen. The two
header controls are Pause and playtest settings. Returning from the background
leaves the battle paused until you resume.

## Step 1 — only this for now

Install **[Xcode from the Mac App Store](https://apps.apple.com/app/xcode/id497799835)**.
Open Xcode once, accept its license and let its initial components finish.
The simulator component offered by Xcode is useful for the automated tests.

When Xcode is open, tell Lars. The next step is opening this project together;
there is no Apple Developer membership purchase needed for that first step.

<details>
<summary>Later steps — kept here for when we reach them</summary>

1. Download the updated GetPutTaco source or update the testing worktree.
2. Open `ManaCrystalsPlaytest.xcodeproj` in this folder.
3. Plug the iPhone into the Mac, unlock it and accept Trust if asked.
4. Choose the app target, **Signing & Capabilities**, your Personal Team, and
   automatic signing. Select your iPhone beside the Run button. Xcode may ask
   you to add your Apple Account and enable Developer Mode on the phone.
5. Press Run. The bundled rules run on the phone; the Mac is not a game server.
6. After the native controls feel right, prepare signed archive/distribution
   and TestFlight. TestFlight requires an Apple Developer Program membership and
   App Store Connect setup. We will handle those separately, one screen at a time.

A free Personal Team is suitable for direct device testing but its development
installation expires and must be refreshed through Xcode. TestFlight is a later
signed distribution step; it has not been configured or published by this work.

</details>

## What this milestone includes

- A real Slime battle with the production board, enemy, mana and auto-cast rules.
- Zero spells by default. Settings offer each of the six initial schools and
  all four learned ranks for testing; every battle still begins with zero mana.
- Native gesture axis locking, two-finger cancellation, old-piece input rejection,
  background cancellation/pause, native crystal rendering and spell overlays.
- Portrait safe-area layout for the iPhone 15 Pro and an original app icon.
- Tests for native input, Apple JavaScriptCore compatibility, and simulator UI.

This is a separate playtest app. It does not import or overwrite Safari's
campaign save. World exploration, story progression, Arcane techniques and
custom Weaving are later porting milestones after input is approved. The
prototype's rank selector is a test fixture, not a new campaign upgrade system.

## Developer checks

The JavaScript resource is committed so the player only needs Xcode. After
changing shared engine code, regenerate it with `npm ci` and
`npm run build:native`, then commit the resource with the source change.
The native-only data clone preserves the engine's preview state in JavaScriptCore,
which does not provide the browser's `structuredClone` global.

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
uploads the Xcode result bundle with its screenshot. Simulator checks do not
replace testing how this feels on the physical phone.
