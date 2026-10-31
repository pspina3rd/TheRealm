# Encounter intent UI review

Independent source and browser review of the encounter-purpose changes, started at `00c9143`; subsequent checkpoint `b85e321` adds the separate design review only.

## Scope and evidence

Reviewed the actual App encounter path for Rowan, Pip, Wren, Ordor, Vale, Odile, Green Slime and Torva, using staged map positions rather than claiming a campaign playthrough. Browser coverage: 393×852, 360×640 and 1100×900 CSS pixels, Chromium with touch enabled on the phone sizes. The independent run uses `tools/encounter-intent-smoke.mjs`, with artifacts at `/tmp/intent-ui-independent`.

Direct visual inspection covered Rowan's cooperation details, Slime's combat details, Ordor's small-phone price-contest details, and Vale's small-phone board. The goal/blocks/pressure/options hierarchy is readable. The purpose label and Details action distinguish a shared task from a price contest or hostile combat. The existing board header remains a touch-sized entry point; Back to board is prominent.

Source inspection confirmed task-specific goals, non-hostile pressure explanations, concrete next-move responses, and explicit one-batch Ice wording. Opening Details pauses without spending the encounter pause quota; closing restores its previous state and returns focus to the board. NPC fixed layouts and queues were outside the modified purpose-description path.

Read `docs/IPHONE_TESTING.md`: same-Wi-Fi testing and Add to Home Screen instructions are clear, with the Mac/server dependency and production HTTPS/offline distinction disclosed. This review does not claim testing on physical iPhone hardware.

## Verification status

All 24 actor/viewport cases passed independently. Each case opened Details through the actual board button, read the goal/blocks/pressure/options body, and returned through Back to board or Escape. HP, pieces placed, encounter tries, pause quota and first-move state were preserved; focus returned to the board. Visible movement controls stayed within viewport bounds and there were no page errors.

An additional Rowan check at 393×852 verified native Enter and Space activation of the focused header, Escape recovery, a 1.2-second stay in Details without those state changes, and keyboard movement accepted after the authored opening demonstration completed. Evidence: `/tmp/intent-ui-keyboard/report.json`; temporary harness `/tmp/intent-keyboard-review.mjs`. The demo deliberately rejects movement while showing the example; that behavior is separate from Details recovery.

Fresh visual inspection of Torva at 360×640 also confirmed the practice strip and movement row remain visible. The historical lesson-controls overflow was not reproduced.

## Verdict and limits

Approved for this scoped encounter-intent UI change. No blocking correction requested. The board goal remains the primary cue and Details supplies the actor's role and pressure explanation without consuming an attempt. Mobile text is compact, but the inspected purpose details and touch controls are legible and accessible in the tested sizes.

This is an independent source/browser review, not observed player research, a full campaign playthrough, physical iPhone validation, or comprehensive Arcane-combination testing. One-batch Ice wording was source-reviewed here; its combat mechanics and production offline behavior are covered by other checks, not claimed by this UI run.
