# Native five-followup integration record

All five followups were implemented after the original touch/tome fixes and are
ready for physical iPhone retesting. Source implementation, independent findings,
corrections and re-review appear in the [UI](NATIVE_QUEUED_UI_REVIEW.md),
[walking](NATIVE_WALK_REVIEW.md) and [settlement](NATIVE_SETTLEMENT_REVIEW.md) reviews.

## Verified candidate

Apple-validated GetPutTaco commit: `3871f540a53f8a2ff3cbc3f61ce5dc20ae8cdab6`.
The app and test source matches `7c2623596b15ea18853d5dfb81e818da08e94a80`;
subsequent changes only added CI runner configuration and review evidence.

- Complete local formatting, lint, typecheck and test checks passed: 1675 tests,
  25 optional skips. The production web build passed.
- [Repository CI](https://github.com/pspina3rd/TheRealm/actions/runs/41519074325)
  passed for the validated candidate.
- [Apple native validation](https://github.com/pspina3rd/TheRealm/actions/runs/41519074346)
  passed compilation, 23 engine/gesture checks and both iPhone 15 Pro UI tests.
- The campaign UI flow covers sprite selection, book preview/cancel, opening page
  controls, Rowan, entering/leaving his puzzle, held movement, menus, world map,
  save relaunch and background recovery. The second flow exercises board gestures
  and battle background recovery.
- The map test verifies actual multiline instruction height and a square image
  frame, in addition to finding its full accessibility label.

Root inspected the fresh [campaign menu](artifacts/NATIVE_VERIFIED_CAMPAIGN_MENU.png)
and [world map](artifacts/NATIVE_VERIFIED_WORLD_MAP.png): the complete instruction
now wraps visibly, the map is square, and actions remain available. The previous
passing test had missed visible ellipsis; that screenshot was rejected and the
header was corrected before delivery.

Walking footage is recorded in the [walking review](NATIVE_WALK_REVIEW.md). It
shows alternating authored poses and retained terrain in the bounded reviewed
segment. It does not establish physical-device frame rate or every route/hero.

## Runner failures and resolution

The original macos-15 arm64 job failed to acquire a hosted runner due to capacity.
The Intel fallback compiled successfully and passed one full native UI run after
measured startup delays justified bounded CI allowances. Two later Intel attempts
failed before tests began: the runner was killed during bootstrap, then its AX
initialization timed out. Neither produced test screenshots.

The supported macos-26 Apple Silicon image completed the corrected source's full
validation. CI retains bounded 240/300-second test allowances, a 20-minute UI step
and 35-minute job; individual action/assertion waits are unchanged. No app behavior
was altered to make the infrastructure failures pass.

## Delivery and limits

The updated Xcode source archive includes ios and public/assets and is checked
byte-for-byte against committed app source. No browser, npm or server is needed
for the player to build it in Xcode. Save identity and schema remain unchanged.
A legacy position inside a newly solid facade returns to its valid respawn under
the existing loader policy; independent tests verify preservation of the hero,
items, money and earned progress.

Physical iPhone feel remains the player's retest. Separately, the native renderer
still has simpler block/effect drawing than the web renderer; full visual parity
is not claimed by this delivery.

## Subsequent visual port

The simpler block/effect rendering noted above was addressed in a later change,
with shared exported art and actual resolver-driven four-rank spell traces.
See [NATIVE_VISUAL_PARITY_REVIEW.md](NATIVE_VISUAL_PARITY_REVIEW.md) for its separate
review, Apple evidence and updated Xcode package. This historical record describes
the original five-fix candidate, not the later visual candidate.
