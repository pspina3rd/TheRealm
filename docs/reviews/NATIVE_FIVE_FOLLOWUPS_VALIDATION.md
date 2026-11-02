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
