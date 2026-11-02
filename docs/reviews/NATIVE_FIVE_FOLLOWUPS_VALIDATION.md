# Native five-followup integration record

All five requested followups were implemented after the original touch/tome fixes.
Source implementation, independent findings, corrections and re-review are recorded
in [UI review](NATIVE_QUEUED_UI_REVIEW.md), [walking review](NATIVE_WALK_REVIEW.md)
and [settlement review](NATIVE_SETTLEMENT_REVIEW.md).

Candidate on GetPutTaco: `df747069897fe82418f455e51dc438b5f70db1d4`.
Local source tree: `7cb729a73519d022cbdff54f55408a5fec3585c7`.

- Complete local formatting, lint, typecheck and test checks passed: 1675 tests,
  25 optional skips. The production web build passed.
- [Repository CI](https://github.com/pspina3rd/TheRealm/actions/runs/41482443821)
  passed for the exact candidate.
- [Apple native validation](https://github.com/pspina3rd/TheRealm/actions/runs/41482443905)
  failed before acquiring a runner: GitHub annotations identify hosted arm64
  capacity constraints. The workflow now pins the supported `macos-15-intel`
  runner; native compilation and fresh simulator evidence await the retry.
- The updated source archive has been assembled from committed source and checked
  byte-for-byte against the candidate. Delivery awaits native validation.

Save identity and schema remain unchanged. A legacy position inside a newly
solid facade returns to its valid respawn under the existing loader policy;
independent tests verify that hero, items, money and earned progress survive.
Physical iPhone feel and acceptance still require the player's retest.

## Intel simulator retry

The Intel runner compiled the native app and passed all Apple engine/gesture
checks in run 41485173236. Its UI step reached the parchment menu and world map
without assertion failures, but the 12-minute step limit interrupted relaunch.
Diagnostics show about 103 seconds of cold launch/automation before the first
assertion; the campaign exceeded the prior 120-second case allowance while
continuing to progress. An independent reviewer approved bounded allowances of
240/300 seconds per test, 20 minutes for the UI step and 35 for the job, with all
individual assertion waits unchanged. Relaunch completion remains unverified.
If the termination request stalls again, investigate it rather than extending
the limits further.

## Visual correction checkpoint

Run 41489327715 passed 23 native engine/gesture checks and both UI tests. Visual
review still rejected the map header: its instruction label was ellipsized.
The native menu author replaced ambiguous Auto Layout fitting with explicit
wrapped-width measurement; independent source re-review accepted the correction.
The UI test now checks rendered instruction height and the map's square frame.
Corrected source is `7c2623596b15ea18853d5dfb81e818da08e94a80`.

Run 41493333486 attempt 1 compiled the corrected app and passed the engine/gesture
checks, but its XCTest runner was killed before starting test execution. The
result bundle reports: “Early unexpected exit, operation never finished
bootstrapping … Test crashed with signal kill before starting test execution.”
No test screenshots were produced. Attempt 2 is retrying the same source, without
changing app behavior, assertions or time limits.

## Runner fallback after bootstrap failures

The unchanged retry of run 41493333486 also failed before any tests or screenshots:
“The test runner failed to initialize for UI testing … Timed out waiting for AX
loaded notification.” Both attempts compiled the corrected native app and passed
the Apple engine/gesture checks. Validation now uses the officially supported
`macos-26` Apple Silicon image, with the same assertions and bounded allowances.
The hosted macos-15 arm64 pool previously failed to acquire a runner; Intel then
proved unreliable for XCTest initialization. Fresh layout evidence remains open.
