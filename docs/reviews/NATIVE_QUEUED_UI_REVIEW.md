# Native follow-up UI source review

Reviewed independently from the implementations on 2026-11-02.

## Scope and disposition

- Naming: `788775e` removes redundant Village/Town suffixes from the displayed
  Mossvale and Brightwater names. Stable map IDs, hometown selection and save
  identity remain unchanged. No source finding.
- Walking: `2793cb3` replaces a restarted 25fps cycle per tile with a continuous
  8fps gait while the retained hero node has a movement action. All four hero
  sheets are 192×192 with 48px frames. Direction rows and standing frame zero
  agree with the shared `mapFrame` contract. Repeated snapshots do not interrupt
  an in-flight move; stopped/blocked movement and Reduce Motion restore the
  standing texture. Map changes clear gait state. No blocking source finding.
- Menus: `b4737bf`, then `4c952cf`, theme generic campaign panels as full-screen
  parchment entries with the existing book palette, Georgia text and native
  scrolling. Title/body/action labels scale and wrap; action rows have a minimum
  height rather than a fixed text height. Headers remeasure for width or content
  category changes. Disabled actions keep disabled/button accessibility traits.
  Existing accessibility identifiers and action routing remain intact.

## Review and correction loop

The reviewer requested protection against repeated unchanged menu updates resetting
scroll and VoiceOver focus, and checked small-width/large-text layout and stable
UI-test identifiers. The implementer supplied `4c952cf` to compare panel actions
and overview data before rebuilding a header. Re-review found that this guard
preserves repeated reads, while changed data still refreshes the menu. Submission
protection resets after shared-engine errors. Initial `loadViewIfNeeded` nesting
terminates once the view is loaded.

No remaining blocking source finding in the reviewed scope. This review does not
cover building collision geometry or settlement artwork, which have a separate
review. Existing baked map-image labels remain small when scaled to a phone;
this is an existing limitation, not evidence of native accessibility validation.

## Required integration evidence

Source approval is conditional on Apple compilation and iPhone simulator tests,
including the new parchment-menu screenshot and walking recording. Linux source
review cannot establish UIKit layout or physical-device touch acceptance. Root
records those integration results separately; physical iPhone retesting remains
necessary after delivery.
